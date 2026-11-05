import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const engine=path.join(root,"transcend/torus-aether/devour/devour.mjs");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function freePort(){
  return new Promise((resolve,reject)=>{
    const s=net.createServer();s.once("error",reject);
    s.listen(0,"127.0.0.1",()=>{const n=s.address().port;s.close(()=>resolve(n));});
  });
}
async function waitFor(fn,ms=20000){
  const until=Date.now()+ms;
  while(Date.now()<until){try{const x=await fn();if(x)return x;}catch{}await sleep(125);}
  throw Error("Timed out waiting for live V17 worker/server state");
}
async function start(port,text,out){
  const args=[engine,"--workers","1","--arms","stable+many","--mem",".3","--every","5000",
    "--eval","400","--text",text,"--worlds","text","--port",String(port),"--out",out,"--resume"];
  const child=spawn(process.execPath,args,{cwd:root,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout.on("data",b=>log+=String(b).slice(-5000));
  child.stderr.on("data",b=>log+=String(b).slice(-5000));
  try{await waitFor(async()=>{
    if(child.exitCode!==null)throw Error("child exit");
    const r=await fetch("http://127.0.0.1:"+port+"/graphs");return r.ok?await r.json():null;
  });}catch(e){child.kill();throw Error(e.message+"\n"+log.slice(-4000));}
  return child;
}
async function stop(child){
  if(!child||child.exitCode!==null)return;
  child.kill("SIGINT");
  await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(5000)]);
  if(child.exitCode===null)child.kill();
}
test("live V17: POST controls reach worker, generation and heldout evaluation are real, resume retains settings", {timeout:90000},async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v17-live-http-"));
  const corpus=path.join(temp,"real-test-corpus.txt"),out=path.join(temp,"isolated-runtime");
  // A deterministic fixture is used ONLY for regression testing, never as a substitute for production training.
  fs.writeFileSync(corpus,Array.from({length:24},(_,i)=>"Sequence "+i+": an organism observes and predicts its own environment. It learns from evidence, not from named labels.").join("\n\n"));
  const port=await freePort(),base="http://127.0.0.1:"+port;
  let child;
  try{
    child=await start(port,corpus,out);
    const controlRes=await fetch(base+"/controls?w=0&ltemp=0.5&pnoise=0.2&gnoise=5&glr=0.05&repel=0.5&cthr=0.7&ttemp=1&wtemp=1.2",{method:"POST"});
    assert.equal(controlRes.status,200,await controlRes.text());
    const active=await waitFor(async()=>{
      const r=await fetch(base+"/graphs"),x=await r.json(),g=x.graphs[0];
      return g.controlsApplied&&g.controls?.pnoise===.2?g:null;
    });
    assert.equal(active.controls.ltemp,.5);
    const bad=await fetch(base+"/controls?w=0&gnoise=2.5",{method:"POST"});
    assert.equal(bad.status,400,"bad step must not silently update real learner");
    const written=await fetch(base+"/write?w=0",{method:"POST"});assert.equal(written.status,200);
    const generation=await written.json();
    assert.equal(generation.result.text.length,240);assert.equal(generation.result.temperature,1.2);
    const evalRes=await fetch(base+"/evaluate?w=0",{method:"POST"});assert.equal(evalRes.status,200);
    const measured=await waitFor(async()=>{
      const r=await fetch(base+"/graph?w=0");if(!r.ok)return null;
      const x=await r.json();
      return x.test&&x.test.temperature===1?x.test:null;
    });
    assert.ok(Number.isFinite(measured.live));
    assert.ok(Number.isFinite(measured.sampled));
    assert.ok(Number.isFinite(measured.disagreement));
    assert.ok(measured.n>0);
    assert.ok(fs.existsSync(path.join(out,"live-controls.json")));
    await stop(child);child=null;
    child=await start(port,corpus,out);
    const restored=await waitFor(async()=>{
      const r=await fetch(base+"/graphs"),x=await r.json(),g=x.graphs[0];
      return g.controlsApplied?g:null;
    });
    assert.equal(restored.controls.pnoise,.2);
    assert.equal(restored.controls.ttemp,1);
  }finally{await stop(child);fs.rmSync(temp,{recursive:true,force:true});}
});
