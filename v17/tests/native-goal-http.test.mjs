import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,existsSync,rmSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {TextHypermaze} from "../transcend/torus-aether/worlds/text-hypermaze.mjs";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const freePort=()=>new Promise((ok,fail)=>{const s=createServer();s.once("error",fail);
 s.listen(0,"127.0.0.1",()=>{const n=s.address().port;s.close(e=>e?fail(e):ok(n));});});

test("REAL native V17 worker + HTTP + original UI + resumed Brain checkpoint uses Discoverer.shape",
{timeout:85000},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v21-native-goal-"));
 const input=path.join(dir,"corpus.txt"),out=path.join(dir,"state");
 const port=await freePort(),cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const docs=Array.from({length:65},(_,i)=>
   "She is happy. He is sad. She is happy. He is calm. North goes east. "+i+".");
 writeFileSync(input,docs.join("\n\n")+"\n");
 const proc=spawn(process.execPath,[
   "transcend/torus-aether/devour/devour.mjs","--workers","1",
   "--arms","stable+many","--worlds","hypertext,maze,transform",
   "--gpu","off","--text",input,"--out",out,"--port",String(port),"--mem","2","--start"
 ],{cwd,detached:true,env:{...process.env,MP_NO_BROWSER:"1"},
   stdio:["ignore","pipe","pipe"]});
 let logs="";for(const s of [proc.stdout,proc.stderr])
   s.on("data",b=>logs=(logs+b.toString()).slice(-12000));
 const host="http://127.0.0.1:"+port;
 const post=async(endpoint,body)=>{
   const r=await fetch(host+endpoint,{method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
   assert.equal(r.status,200);return r.json();
 };
 try{
   let g=null;const start=Date.now();
   while(Date.now()-start<60000){
     if(proc.exitCode!==null&&proc.exitCode!==0)throw Error("Native server exited: "+logs);
     try{
       const r=await fetch(host+"/graph?w=0",{signal:AbortSignal.timeout(4000)});
       if(r.ok){g=await r.json();if(g.hypermaze?.veil?.documents>=50)break;}
     }catch{}
     await sleep(180);
   }
   assert.ok(g?.hypermaze?.veil?.documents>=50,"Real training did not start: "+logs);
   assert.ok(g.maze?.played>0,"Original maze physics must still run");
   assert.ok(g.transform?.played>0,"Original transform physics must still run");
   const ui=await(await fetch(host+"/transcend/torus-aether/ui/index.html?live=1")).text();
   const js=await(await fetch(host+"/transcend/torus-aether/ui/native-goal-live.js")).text();
   assert.match(ui,/id="nativeGoalCanvas"/);
   assert.match(ui,/id="nativeGoalPlan"/);
   assert.match(ui,/id="veilPlan"/);
   assert.match(ui,/id="veilCanvas"/);
   assert.match(js,/veil-native-plan/);
   assert.match(js,/original V17 Brain/);
   const request={w:0,start:"She is",goal:"is happy",maxSteps:30};
   const before=await(await fetch(host+"/graph?w=0")).json();
   const native=await post("/veil-native-plan",request);
   assert.equal(native.error,undefined,JSON.stringify(native)+"\n"+logs);
   assert.equal(native.found,true);
   assert.equal(native.originalMethod,"Brain.disc.shape()");
   assert.equal(native.originalDiscovererDirectlyUsed,true);
   assert.equal(native.frozen,true);
   assert.equal(native.hiddenAnswerUsed,false);
   assert.equal(native.math.strictlyUphill,true);
   assert.equal(native.math.noUnobservedEdges,true);
   assert.ok(native.math.maxBellmanResidual<1e-12);
   const old=await post("/veil-plan",request);
   assert.equal(old.found,true);
   assert.deepEqual(native.path,old.path,"Original contextual baseline still matches");
   assert.equal((await post("/veil-native-plan",{...request,goal:"UNSEEN GOAL"})).found,false);
   const after=await(await fetch(host+"/graph?w=0")).json();
   assert.ok(after.hypermaze.veil.documents>=before.hypermaze.veil.documents,
     "Frozen native route did not rewind or reset the real training cursor");
   const save=path.join(out,"brains","brain-0-stable+many.v8");
   for(let i=0;i<50&&!existsSync(save);i++)await sleep(180);
   assert.ok(existsSync(save),"Native Brain checkpoint not saved: "+logs);
   const restored=Brain.load(save);
   const m=TextHypermaze.restore(restored.hypermaze);
   const r=m.veil.planNative(restored.disc,"She is","is happy");
   assert.equal(r.found,true);
   assert.deepEqual(r.path,native.path);
   console.log("NATIVE_GOAL_HTTP",JSON.stringify({
     observedDocs:before.hypermaze.veil.documents,
     nativeSteps:native.links.length,residual:native.math.maxBellmanResidual,
     caller:native.originalMethod,oldUILive:true,checkpointRestored:true,
     mazeWorld:true,transformWorld:true}));
 }finally{
   try{process.kill(-proc.pid,"SIGTERM");}
   catch{try{proc.kill("SIGTERM");}catch{}}
   await sleep(300);rmSync(dir,{recursive:true,force:true});
 }
});
