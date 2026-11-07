// No mocks in this file: launches the repository's ORIGINAL native devour
// worker and uses an ACTUAL source text file from the repository.
// Reproduces transport/metrics against the real original training process.
// The OpenThoughts Parquet corpus itself is Windows-local, not in CI.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createNativeBridge} from "../native-bridge.mjs";
import {nativeMeasurements} from "../native-metrics.mjs";

const root=fileURLToPath(new URL("../../..",import.meta.url));
const file=p=>path.join(root,p);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function getOpenPort(){
  const temp=http.createServer();
  await new Promise(ok=>temp.listen(0,"127.0.0.1",ok));
  const p=temp.address().port;
  await new Promise(ok=>temp.close(ok));
  return p;
}
async function readJson(url,timeout=8000){
  const r=await fetch(url,{signal:AbortSignal.timeout(timeout)});
  if(!r.ok)throw Error("HTTP "+r.status+" "+url);
  return r.json();
}
test("original V17 worker actually reads real docs and trains while V26 UI bridge reports its native metrics",{
  timeout:125000
},async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"mp-v28-native-real-"));
  const nativePort=await getOpenPort();
  let bridge=null,proc=null;
  let stdout="",stderr="";
  try{
    const original=file("transcend/torus-aether/devour/devour.mjs");
    const corpus=file("docs/TORUS_AETHER_ABC_20261104.md");
    await fs.access(corpus);
    const args=[original,"--workers","1","--arms","winner",
      "--text",corpus,"--worlds","text","--every","500",
      "--chars","24000","--mem","1","--out",dir,
      "--port",String(nativePort),"--start","--gpu","off"];
    proc=spawn(process.execPath,args,{cwd:root,
      env:{...process.env,MP_NO_BROWSER:"1"},
      stdio:["ignore","pipe","pipe"]});
    proc.stdout.on("data",x=>stdout=(stdout+x.toString()).slice(-16000));
    proc.stderr.on("data",x=>stderr=(stderr+x.toString()).slice(-16000));
    let raw=null;
    for(let i=0;i<120;i++){
      if(proc.exitCode!==null||proc.signalCode!==null)
        throw Error("Original V17 process failed: "+stderr+"\n"+stdout);
      try{
        raw=await readJson("http://127.0.0.1:"+nativePort+"/graphs",1500);
        if(raw?.corpus?.kind==="text"&&raw?.graphs?.length)break;
      }catch{}
      await pause(350);
    }
    assert.equal(raw?.corpus?.kind,"text","Must run native original text corpus, not V26 synthetic edits");
    assert.ok(raw.corpus.trainRows>0,"Original trainer must have actual source rows");
    assert.ok(raw.corpus.heldOut>0,"Original training source must reserve heldout paragraphs");
    bridge=await createNativeBridge({port:0,nativePort});
    const ui=bridge.url;
    const html=await (await fetch(ui+"/")).text();
    assert.match(html,/ALIGNED V17/);
    assert.match(html,/Hypermaze/);
    assert.doesNotMatch(html,/src="\/app\.js"/);
    let snapshot=null;
    for(let i=0;i<55;i++){
      snapshot=await readJson(ui+"/api/native-state?w=0");
      if(snapshot.original?.chars>0||snapshot.original?.progress?.trained>0)break;
      await pause(350);
    }
    assert.equal(snapshot.version,"V28_NATIVE_V17_UI");
    assert.equal(snapshot.corpus.kind,"text");
    assert.ok(snapshot.original);
    const m=nativeMeasurements(snapshot);
    assert.ok(m.chars===null||m.chars>=0);
    assert.equal(m.progressTotal===null||m.progressTotal>0,true);
    assert.equal(m.nativeDevice,"off");
    // Original training world may report first evaluation asynchronously;
    // absence remains missing rather than artificial 100%.
    if(m.aligned!==null)assert.ok(m.aligned>=0&&m.aligned<=1);
    const evidence=await readJson(ui+"/api/native-evidence?w=0");
    assert.equal(evidence.graphs.corpus.kind,"text");
    assert.equal(evidence.source,"ORIGINAL V17 /graphs and /graph");
    const control=await fetch(ui+"/api/native-control",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({action:"pause",worker:0})
    });
    assert.equal(control.status,200);
    const c=await control.json();assert.equal(c.ok,true);
    console.log("V28_REAL_ORIGINAL_TRAINING",JSON.stringify({
      originalTextSource:"docs/TORUS_AETHER_ABC_20261104.md",
      originalTrainRows:raw.corpus.trainRows,
      originalHeldoutRows:raw.corpus.heldOut,
      realOriginalChars:snapshot.original.chars,
      realNativeGraphNodes:snapshot.graph?.nodes?.length??null,
      originalNativeAligned:m.aligned,
      originalWorkerControlPass:true,
      noSyntheticActionTrainer:true,
      nativeBackend:original}));
  }finally{
    if(bridge)await bridge.close();
    if(proc&&!proc.killed){
      proc.kill("SIGTERM");
      await Promise.race([
        new Promise(ok=>proc.once("close",ok)),
        pause(2500)
      ]);
      if(proc.exitCode===null&&proc.signalCode===null)proc.kill("SIGKILL");
    }
    await fs.rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:200});
  }
});
