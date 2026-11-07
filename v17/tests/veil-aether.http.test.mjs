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

const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test("NATIVE V17 V20 V21 multiworld: live frames + frozen route + original UI + checkpoint",
 {timeout:85000},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v21-native-"));
 const input=path.join(dir,"corpus.txt"),out=path.join(dir,"checkpoint");
 const port=await freePort(),cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const docs=Array.from({length:65},(_,i)=>
  "She is happy. He is sad. She is happy. He is calm. "+
  "North goes east. "+i+".");
 writeFileSync(input,docs.join("\n\n")+"\n","utf8");
 const proc=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","hypertext,maze,transform",
  "--gpu","off","--text",input,"--out",out,"--port",String(port),
  "--mem","2","--start"
 ],{cwd,detached:true,env:{...process.env,MP_NO_BROWSER:"1"},
  stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const s of [proc.stdout,proc.stderr])s.on("data",b=>logs=(logs+b.toString()).slice(-14000));
 const host="http://127.0.0.1:"+port;
 const read=async url=>{
  const r=await fetch(host+url,{signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error("HTTP "+r.status);return r;
 };
 try{
  let g=null;
  const begin=Date.now();
  while(Date.now()-begin<60000){
   if(proc.exitCode!==null&&proc.exitCode!==0)throw Error("Native worker failed: "+logs);
   try{
    g=await(await read("/graph?w=0")).json();
    if(g.hypermaze?.veil?.documents>=50)break;
   }catch{}
   await sleep(180);
  }
  assert.ok(g?.hypermaze?.veil?.documents>=50,"No genuine real-corpus V21 training: "+logs);
  assert.ok(g.hypermaze.veil.onlinePredictions>0);
  assert.ok(g.hypermaze.veil.states>0 && g.hypermaze.veil.edges>0);
  assert.ok(g.hypermaze.veil.last?.frames?.length>0);
  assert.ok(g.hypermaze.veil.last?.actual?.length>0);
  assert.ok(g.hypermaze.veil.sample.nodes.length>0);
  assert.ok(g.maze?.played>0,"Original maze world not trained together: "+logs);
  assert.ok(g.transform?.played>0,"Original transformation world not trained together: "+logs);
  assert.ok(g.hypermaze.veil.causalField,"Native V17 action graph absent from real V21 snapshot");
  assert.ok(g.hypermaze.veil.causalField.counts.maze>0,
    "Original maze effect transitions not wired into the shared action graph: "+logs);
  assert.ok(g.hypermaze.veil.causalField.counts.transform>0,
    "Original transformation outcomes not wired into the shared action graph: "+logs);
  const html=await(await read("/transcend/torus-aether/ui/index.html?live=1")).text();
  assert.match(html,/id="veilCanvas"/);
  assert.match(html,/id="veilScrub"/);
  assert.match(html,/id="veilActionCanvas"/);
  assert.match(html,/src="veil-aether-live.js"/);
  assert.match(html,/src="text-hypermaze-live.js"/);
  assert.match(html,/src="app.js"/);
  const js=await(await read("/transcend/torus-aether/ui/veil-aether-live.js")).text();
  assert.match(js,/remainingShape/);
  assert.match(js,/veil-plan/);
  const route=async (start,goal)=>{
   const r=await fetch(host+"/veil-plan",{method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({w:0,start,goal,maxSteps:30}),
    signal:AbortSignal.timeout(12000)});
   return r.json();
  };
  const p=await route("She is","is happy");
  assert.equal(p.found,true,JSON.stringify(p)+"\n"+logs);
  assert.equal(p.frozen,true);
  assert.equal(p.math.strictUphill,true);
  assert.equal(p.math.shortestObservedRoute,true);
  assert.ok(p.math.maxResidual<1e-11);
  assert.equal((await route("She is","not present")).found,false);
  const original=await fetch(host+"/hypermaze-plan",{method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({w:0,start:"She",goal:"happy"})});
  const old=await original.json();
  assert.equal(old.found,true,"Original V20 endpoint regression");
  const save=path.join(out,"brains","brain-0-stable+many.v8");
  for(let i=0;i<40&&!existsSync(save);i++)await sleep(200);
  assert.ok(existsSync(save),"Native checkpoint not written: "+logs);
  const brain=Brain.load(save);
  const restored=TextHypermaze.restore(brain.hypermaze);
  assert.ok(restored.veil.docs>0);
  assert.equal(restored.veil.plan(["She","is"],["is","happy"]).found,true);
  console.log("V21_NATIVE_HTTP_ACCEPTANCE",JSON.stringify({
   documents:g.hypermaze.veil.documents,
   states:g.hypermaze.veil.states,edges:g.hypermaze.veil.edges,
   maze:g.maze?.played,transform:g.transform?.played,
   checkpointPersisted:true,frozenPlan:true,originalUI:true}));
 }finally{
  try{process.kill(-proc.pid,"SIGTERM");}
  catch{try{proc.kill("SIGTERM");}catch{}}
  await sleep(350);
  rmSync(dir,{recursive:true,force:true});
 }
});
