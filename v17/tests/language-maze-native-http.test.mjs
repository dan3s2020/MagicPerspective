// Original V17 engine + real TXT observations + actual HTTP world graph.
// No mocked learner, false answers, fake paths, demo API or UI-only routes.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const socket=net.createServer();socket.once("error",reject);
 socket.listen(0,"127.0.0.1",()=>{const p=socket.address().port;socket.close(()=>resolve(p));});
});
test("actual original live V17 worker: four corpus sentences become learned language maze, full predicitive GOLD route and independent body path with all steps", {timeout:90000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v17-language-maze-"));
 const source=path.join(home,"sentences.txt"),out=path.join(home,"checkpoints");
 fs.writeFileSync(source,[
  "She is happy.","She is tired.","He is tired.","He is calm."
 ].join("\n\n")+"\n","utf8");
 assert.equal(fs.readFileSync(source,"utf8").includes("She is calm."),false);
 const p=await port(),host="http://127.0.0.1:"+p;
 const processV17=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","text",
  "--gpu","off","--text",source,"--out",out,"--port",String(p),
  "--start","--mem","1","--every","50000"
 ],{cwd:v17,detached:true,stdio:["ignore","pipe","pipe"]});
 let logs="";for(const ch of [processV17.stdout,processV17.stderr])
   ch.on("data",x=>logs=(logs+String(x)).slice(-8500));
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   try{if((await fetch(host+"/graphs")).ok){ready=true;break;}}catch{}
   await sleep(100);
  }
  assert.ok(ready,"Original server failed: "+logs);
  const index=await(await fetch(host+"/transcend/torus-aether/ui/index.html?live=1")).text();
  for(const id of ["g","languageMazeCv","tabTrain","tabLanguageMaze","languageMazePane",
   "languageMazePlay","languageMazePrev","languageMazeNext","languageMazeScrub",
   "languageMazePerspective","languageMazeRotation","languageMazeGoal"])
   assert.ok(index.includes('id="'+id+'"'),"Existing/new UI control missing: "+id);
  const mod=await fetch(host+"/transcend/torus-aether/ui/language-maze-view.js");
  assert.equal(mod.status,200,"Original HTTP server does not serve actual projected maze viewer");
  assert.match(await mod.text(),/class LanguageMazeViewer/);
  let status=null;
  for(let i=0;i<170;i++){
   status=(await(await fetch(host+"/graphs")).json()).graphs[0];
   if(status.observedTransformations?.observed>=4&&
      status.observedTransformations?.learnedOperators>=6)break;
   await sleep(100);
  }
  assert.ok(status?.observedTransformations?.observed>=4,
    "Real original Brain did not learn 4 sentences: "+JSON.stringify(status)+"; "+logs);
  const get=async(start,required,local=true)=>{
    const request=host+"/language-maze?w=0&start="+encodeURIComponent(start)+
      "&required="+encodeURIComponent(required)+"&local="+(local?"on":"off");
    const r=await fetch(request,{method:"POST",cache:"no-store"});
    assert.equal(r.status,200,"Instrumented original Brain HTTP did not reply");
    return r.json();
  };
  const first=await get("He is calm.","She,calm",true);
  assert.ok(!first.error,JSON.stringify(first));
  assert.equal(first.found,true,JSON.stringify(first));
  assert.equal(first.predicted,"She is calm.");
  assert.equal(first.unseen,true);
  assert.deepEqual(first.initialShape,["He is calm.","She is calm."]);
  assert.equal(first.plannedBeforeAnswer,true);
  assert.equal(first.referenceProvided,false);
  assert.ok(first.search.nodes.length>=2);
  assert.ok(first.search.edges.some(e=>e.from==="He is calm."&&e.to==="She is calm."));
  assert.equal(first.body.frames[0].stage,"before-first-action");
  assert.ok(first.body.frames.slice(1).length>0);
  assert.equal(first.body.semanticValidation,false);
  assert.equal(first.body.effectSource,"learned-text-action-model");
  for(const frame of first.body.frames.slice(1)){
   assert.ok(frame.chosen,"Missing actual learned operation in body frame");
   assert.ok(Array.isArray(frame.alternatives)&&frame.alternatives.length>0);
   assert.equal(frame.realSemanticWorldFeedback,false);
  }
  const second=await get("She is happy.","She,calm",true);
  assert.equal(second.found,true,JSON.stringify(second));
  assert.equal(second.unseen,true);
  assert.ok(second.steps.length>=2);
  assert.ok(second.search.edges.length>=second.steps.length);
  assert.equal(second.body.initialShape[0],"She is happy.");
  const absent=await get("He is calm.","Nonexistent,hypermagical",true);
  assert.equal(absent.found,false,"Cannot invent an absent target/path");
  assert.ok(absent.search.nodes.length>0,"Even failed search must show its real explored nodes");
  const checkpoint=path.join(out,"brains","brain-0-stable+many.v8");
  let saved=false;
  for(let i=0;i<120;i++){if(fs.existsSync(checkpoint)){saved=true;break;}await sleep(80);}
  assert.ok(saved,"Native .v8 checkpoint was not saved");
  const restored=Brain.load(checkpoint);
  assert.equal(restored.observedTransformations.containsSentence("She is calm."),false);
  const copy=restored.planObservedTransformation({required:["She","calm"],start:"He is calm."},
    {trace:true,embodied:true});
  assert.equal(copy.predicted,"She is calm.");
  assert.equal(copy.body.frames[0].stage,"before-first-action");
  console.log("V17_REAL_LANGUAGE_MAZE_GLOBAL_AND_BODY "+JSON.stringify({
   trainObserved:status.observedTransformations.observed,
   operators:status.observedTransformations.learnedOperators,
   frozenPrediction:first.predicted,
   realSearchNodes:first.search.nodes.length,realEdges:first.search.edges.length,
   bodyActions:first.body.executed,
   bodyAlternatives:first.body.frames.slice(1).map(f=>f.alternatives.length),
   difference:first.body.alternateMoves,corrections:first.body.corrections,
   originalBrainSavedAndRestored:true,noReferenceAnswer:true
  }));
 }finally{
  try{process.kill(-processV17.pid,"SIGTERM");}catch{try{processV17.kill("SIGTERM");}catch{}}
  await sleep(220);fs.rmSync(home,{recursive:true,force:true});
 }
});
