import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,existsSync,rmSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {TextHypermaze} from "../transcend/torus-aether/worlds/text-hypermaze.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

test("unique words, exact Bellman field, strictly uphill shortest solution",()=>{
 const m=new TextHypermaze({maxNodes:50,maxEdges:200});
 for(let i=0;i<45;i++)m.observeWorld("start north east goal. start south goal.",{id:i});
 assert.equal(m.nodes.length,6,"one node per unique word/symbol, not occurrence");
 assert.equal(m.documents,45);
 assert.ok(m.onlineTested>100,"online prediction measured before each document");
 assert.equal(m.last.id,40,"replay is sampled from real training");
 const p=m.plan("start","goal");
 assert.equal(p.found,true);assert.equal(p.distance,2);
 assert.equal(p.math.optimal,true);assert.equal(p.math.strictUphill,true);
 assert.ok(p.math.maxResidual<1e-11);
 assert.equal(m.plan("start","unseen").found,false);
 assert.deepEqual(TextHypermaze.restore(m.export()).snapshot(),m.snapshot());
});

test("pre-ingest mistakes and capped growth are measured, not silently hidden",()=>{
 const m=new TextHypermaze({maxNodes:8,maxEdges:10});
 m.observeWorld("sun rises tomorrow. sun rises tomorrow.",{id:0});
 const r=m.observeWorld("sun rises yesterday. sun rises tomorrow.",{id:1});
 assert.ok(r.coverage>0);assert.ok(r.onlineAccuracy<1);
 assert.equal(r.plannedBeforeMovement,true);
 m.observeWorld("alpha bravo charlie delta echo foxtrot golf hotel india.",{id:2});
 assert.ok(m.nodes.length<=8);
 assert.ok(m.edges.size<=10);
 assert.ok(m.skippedNewTokens>0);
});

const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const port=s.address().port;s.close(e=>e?reject(e):resolve(port));});
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));

test("real native V17 process exposes live observed text and frozen HTTP paths",
 {timeout:60000},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v20-"));
 const input=path.join(dir,"corpus.txt"),out=path.join(dir,"runtime"),port=await freePort();
 const docs=Array.from({length:65},(_,i)=>
  "She is happy. She is tired. He is tired. He is calm. North goes east. "+i+".");
 writeFileSync(input,docs.join("\n\n")+"\n","utf8");
 const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const proc=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1",
  "--arms","stable+many","--worlds","cognitivemap","--gpu","off",
  "--text",input,"--out",out,"--port",String(port),"--start",
  "--mem","2","--every","50000"],{
   cwd,detached:true,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]
 });
 let log="";for(const stream of [proc.stdout,proc.stderr])stream.on("data",b=>
  log=(log+b.toString()).slice(-14000));
 const host="http://127.0.0.1:"+port;
 const read=async url=>{
  const r=await fetch(host+url,{signal:AbortSignal.timeout(3000)});
  if(!r.ok)throw Error("HTTP "+r.status);return r;
 };
 try{
  let g=null,html="",ready=false;const began=Date.now();
  while(Date.now()-began<38000){
   if(proc.exitCode!==null&&proc.exitCode!==0)throw Error("Worker exited: "+log);
   try{
    g=await(await read("/graph?w=0")).json();
    if(g.hypermaze?.documents>=30){ready=true;break;}
   }catch{}
   await pause(150);
  }
  assert.ok(ready,"No real V20 graph trained: "+log);
  assert.ok(g.hypermaze.nodes>=5);
  assert.ok(g.hypermaze.edges>=5);
  assert.ok(g.hypermaze.onlinePredictions>0);
  assert.ok(g.hypermaze.last.frames.length>0);
  assert.ok(g.hypermaze.sample.nodes.length>0);
  html=await(await read("/transcend/torus-aether/ui/index.html?live=1")).text();
  assert.ok(html.includes('id="textMazeCanvas"'));
  assert.ok(html.includes('src="app.js"'),"Native V17 interface must remain");
  assert.ok(html.includes('src="text-hypermaze-live.js"'));
  const ui=await read("/transcend/torus-aether/ui/text-hypermaze-live.js");
  assert.match(await ui.text(),/originalShapeNext|initialShape/);
  const call=async(start,goal)=>{
   const r=await fetch(host+"/hypermaze-plan",{method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({w:0,start,goal,maxSteps:120})});
   return r.json();
  };
  // Also prove that the pre-existing V19 cognitive planner still replies
  // while V20 observations are attached to the same original worker.
  const oldRoute=await fetch(host+"/cognitive-eval",{method:"POST",
   headers:{"content-type":"application/json"},
   signal:AbortSignal.timeout(8000),
   body:JSON.stringify({w:0,initial:"He is calm.",goal:{slots:{0:"She",2:"calm"}}})});
  assert.equal(oldRoute.status,200);
  const previous=await oldRoute.json();
  assert.ok(previous.found,"Original V19 regression: "+JSON.stringify(previous)+"; logs "+log);
  const plan=await call("She","calm");
  assert.ok(!plan.error,JSON.stringify(plan));
  assert.equal(plan.found,true);assert.equal(plan.frozen,true);
  assert.equal(plan.math.optimal,true);
  assert.equal(plan.math.strictUphill,true);
  assert.ok(plan.math.maxResidual<1e-11);
  assert.equal((await call("She","NEVER-OBSERVED")).found,false);
  const ck=path.join(out,"brains","brain-0-stable+many.v8");
  for(let i=0;i<40&&!existsSync(ck);i++)await pause(100);
  assert.ok(existsSync(ck),"Worker did not save native checkpoint");
  const b=Brain.load(ck);
  assert.ok(b.hypermaze?.nodes.length>0);
  assert.equal(TextHypermaze.restore(b.hypermaze).plan("She","calm").found,true);
 }finally{
  try{process.kill(-proc.pid,"SIGTERM");}catch{try{proc.kill("SIGTERM");}catch{}}
  await pause(250);rmSync(dir,{recursive:true,force:true});
 }
});