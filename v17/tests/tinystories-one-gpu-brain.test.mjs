import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import {spawn,spawnSync} from "node:child_process";
import {launch} from "../research/tinystories/server.mjs";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const openPort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const story=i=>"Once upon a time there was a fox named Kiki "+i+". "+
 "The fox crossed a river, found a friend, and played beside a green tree. "+
 "When a little bird fell down, the fox helped it get home. Everyone was happy.";
const lines=a=>a.join("\n<|endoftext|>\n")+"\n<|endoftext|>\n";
const get=async(url,method="GET")=>{
 const r=await fetch(url,{method,cache:"no-store"});
 const j=await r.json();
 assert.ok(r.ok&&!j.error,JSON.stringify(j).slice(0,1000));
 return j;
};
async function waitFor(url,predicate,timeout=100000){
 const deadline=Date.now()+timeout;
 while(Date.now()<deadline){
  const s=await get(url+"/api/status");
  if(s.error)throw Error(s.error);
  if(predicate(s))return s;
  await delay(120);
 }
 throw Error("Timed out waiting for real one-GPU-brain progress");
}
test("Existing TinyStories brain extended in SAME checkpoint; ONE Start works AFTER 100%, new heads learn real observations",{
 timeout:220000
},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"tinystories-one-brain-"));
 const train=path.join(root,"TinyStories-train.txt"),
  valid=path.join(root,"TinyStories-valid.txt"),out=path.join(root,"saved-brain");
 fs.writeFileSync(train,lines(Array.from({length:24},(_,i)=>story(i))));
 fs.writeFileSync(valid,lines(Array.from({length:8},(_,i)=>
  "The fish "+i+" lived in a small lake. It smiled and then swam home.")));
 let app=null,again=null;
 try{
  const port=await openPort(),url="http://127.0.0.1:"+port;
  app=await launch({train,valid,out,device:"numpy",port,
   batchKB:4,batchStories:2,saveSeconds:3,resume:true,autoStart:false});
  const html=await(await fetch(url+"/")).text();
  assert.ok(html.includes("Antrenează TOT"));
  for(const forbidden of ['id="nativeStart"','id="nativeTest"','id="nativeGraphRefresh"',
   'id="nativePct"','src="./native-ui.js"']){
   assert.ok(!html.includes(forbidden),"Unwanted independent V17 controls: "+forbidden);
  }
  const visible=await(await fetch(url+"/unified-ui.js")).text();
  assert.match(visible,/singleBrain/);
  assert.doesNotMatch(visible,/fakeScores|Math\.random\(\)|mockNative/);
  const started=await get(url+"/api/start","POST");
  assert.equal(started.epoch,1);
  const first=await waitFor(url,s=>s.finished&&s.epoch===1&&s.stories===24);
  assert.equal(first.percent,100);
  assert.equal(first.unified.nativeOldBrainWorker,false);
  assert.equal(first.unified.onGPU,false,"NumPy CI must not pretend to have NVIDIA GPU");
  assert.ok(first.unified.bytes>4000);
  assert.ok(first.unified.worlds.mazeWorldsTrained>=1);
  assert.ok(first.unified.worlds.mazeTeacherStepsLearned>0);
  assert.ok(first.unified.graph.learnedNodes>0);
  assert.ok(first.unified.graph.edges.length>0);
  assert.ok(Object.values(first.unified.graph.coordinates5D).every(v=>
    v.length===5&&v.every(n=>Number.isFinite(n)&&n>=0&&n<1)));
  const heldout=await get(url+"/api/test?stories=6","POST");
  assert.equal(heldout.frozen,true);
  assert.equal(heldout.unified.frozen,true);
  assert.equal(heldout.unified.worlds.frozen,true);
  assert.equal(heldout.unified.worlds.actualUnseenSeeds,12);
  assert.ok(heldout.accuracy>=0&&heldout.accuracy<=1);
  assert.ok(heldout.unified.accuracy>=0&&heldout.unified.accuracy<=1);
  assert.ok(heldout.unified.worlds.accuracy>=0&&heldout.unified.worlds.accuracy<=1);
  assert.ok(heldout.unified.worlds.effectAccuracy>=0&&heldout.unified.worlds.effectAccuracy<=1);
  const beforeTest=await get(url+"/api/status");
  assert.equal(beforeTest.stories,24,"frozen evaluation must not alter training counts");
  const epoch2=await get(url+"/api/start","POST");
  assert.equal(epoch2.epoch,2);
  const second=await waitFor(url,s=>s.finished&&s.epoch===2&&s.stories===48);
  assert.equal(second.percent,100);
  assert.equal(second.unified.rows,48);
  assert.ok(second.unified.worlds.mazeWorldsTrained>=3);
  assert.ok(second.unified.bytes>first.unified.bytes);
  assert.ok(second.unified.updates>first.unified.updates);
  const saved=path.join(out,"tinystories-fast-v1.npz");
  assert.ok(fs.existsSync(saved)&&fs.statSync(saved).size>268000000);
  const chrome=["google-chrome","chromium","chromium-browser"].find(x=>
   spawnSync("which",[x],{encoding:"utf8"}).status===0);
  if(chrome){
   const rendered=await new Promise((resolve,reject)=>{
    const p=spawn(chrome,["--headless","--no-sandbox","--disable-gpu",
     "--disable-dev-shm-usage","--dump-dom","--virtual-time-budget=1500",url+"/"]);
    let stdout="",stderr="";
    p.stdout.on("data",d=>stdout+=d.toString());p.stderr.on("data",d=>stderr+=d.toString());
    p.on("error",reject);p.on("exit",status=>resolve({status,stdout,stderr}));
    setTimeout(()=>{if(p.exitCode===null)p.kill("SIGKILL");},14000).unref();
   });
   assert.equal(rendered.status,0,rendered.stderr.slice(-1000));
   assert.match(rendered.stdout,/data-single-brain="true"/);
   assert.match(rendered.stdout,/id="epoch">2</);
   console.log("TINYSTORIES_ONE_BRAIN_CHROME",JSON.stringify({chrome,epoch:2,originalControlsOnly:true}));
  }
  await app.close();app=null;
  const port2=await openPort();
  again=await launch({train,valid,out,device:"numpy",port:port2,
   batchKB:4,batchStories:2,saveSeconds:3,resume:true,autoStart:false});
  const recovered=again.app.readStatus();
  assert.equal(recovered.epoch,2);
  assert.equal(recovered.stories,48);
  assert.equal(recovered.percent,100);
  assert.equal(recovered.model.loaded,true);
  assert.equal(recovered.model.cursorKnown,true);
  assert.equal(recovered.unified.rows,48);
  assert.ok(recovered.unified.worlds.mazeWorldsTrained>=3);
  assert.ok(recovered.unified.graph.coordinates5D);
  console.log("TINYSTORIES_UNIFIED_CHECKPOINT_PASSED",JSON.stringify({
   epochs:2,learnedStoryObservations:48,
   learnedUtf8Bytes:recovered.chars,actualMazeWorlds:recovered.unified.worlds.mazeWorldsTrained,
   learned5DNodes:recovered.unified.graph.learnedNodes,
   frozenBaselineAccuracy:heldout.accuracy,frozenExtendedAccuracy:heldout.unified.accuracy,
   frozenMazeAccuracy:heldout.unified.worlds.accuracy,
   frozenTransformationAccuracy:heldout.unified.worlds.effectAccuracy,
   gpuHardwareTested:false,unifiedSameCheckpoint:true,fullNativeOriginalBrainPorted:false
  }));
 }finally{
  if(app)await app.close();
  if(again)await again.close();
  fs.rmSync(root,{recursive:true,force:true});
 }
});
