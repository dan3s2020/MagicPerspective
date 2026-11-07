// V34 same-worker integration, not a fake endpoint or generated text learner.
// Real saved native Brain, original source observations and actual HTTP worker.
// Explicitly typed numeric goal is a CONTROLLED structured exercise.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function freePort(){
 const server=net.createServer();
 await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const p=server.address().port;
 await new Promise(ok=>server.close(ok));return p;
}
async function json(url,init={}){
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),9000);
 try{return await (await fetch(url,{...init,signal:ctrl.signal})).json();}
 finally{clearTimeout(timer);}
}
async function poll(fn,ms=50000){
 const start=Date.now();let last="";
 while(Date.now()-start<ms){
  try{const result=await fn();if(result)return result;}
  catch(err){last=err.message;}
  await sleep(150);
 }
 throw Error("Real native worker not ready: "+last);
}
function initialBrain(){
 const brain=new Brain({seed:11,rules:{depth:1,off:["R2","R4"],
  budEvery:100,empty:true,maxWires:32,fold:false}});
 for(let i=0;i<145;i++){
  const world=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(world,brain.disc);
  if(i>=25&&brain.disc.attract(KIND.target)>.2&&
   brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
 }
 assert.ok(brain.disc.attract(KIND.target)>.2);
 return brain;
}
const state=(x,y,z)=>x+" @ "+y+" ~ "+z;
test("V34 SAME native original saved Brain: corpus-derived status/character evidence, numeric actions, first complete plan, and saved checkpoint",{
 timeout:145000
},async()=>{
 const p=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"v34-live-original-"));
 const corpus=path.join(root,"docs","TORUS_AETHER_ABC_20261104.md");
 const checkpoint=path.join(dir,"brains","brain-0-winner.v8");
 fs.mkdirSync(path.dirname(checkpoint),{recursive:true});
 const initial=initialBrain();
 const training=initial.observedTransformations.observeText(fs.readFileSync(corpus,"utf8").slice(0,16000));
 assert.ok(training.observedUnits>0);
 initial.save(checkpoint);
 const originalBytes=fs.statSync(checkpoint).size;
 const child=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1",
  "--arms","winner","--mem","1.2","--text",corpus,
  "--out",dir,"--port",String(p),"--worlds","text",
  "--every","1000000","--checkpoint-every","1000",
  "--xd-atlas-every","350","--gpu","off","--resume"
 ],{cwd:root,stdio:["ignore","pipe","pipe"],detached:true});
 let logs="";
 for(const str of [child.stdout,child.stderr])
  str.on("data",v=>logs=(logs+v.toString()).slice(-15000));
 const base="http://127.0.0.1:"+p;
 const post=(request)=>json(base+"/v34/research?w=0",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify(request)});
 try{
  const status=await poll(async()=>{
   const r=await json(base+"/v34/status?w=0");
   return r.originalLiveWorker&&r.originalBrainIdentityVerified?r:null;
  });
  assert.ok(status.originalField.targetAttraction>.2,
   "Native maze physics must survive original save/load");
  assert.ok(status.sourceTraining.nativeTextStatesActive>0,
   "Original Brain must actually keep corpus observations");
  assert.equal(status.physicalXDAtlas.learnedWorlds,0);
  assert.equal(status.scientificGates.unrestrictedSemanticQA70PercentProven,false);
  const character=await post({type:"character-status"});
  assert.equal(character.operation,"real-original-V17-corpus-to-Unicode-transformations");
  assert.equal(character.sourceIsNotIndependentPhysics,true);
  assert.equal(character.originalBrainCheckpointAlreadyStoresUnderlyingTextEvidence,true);
  const empty=await post({type:"numeric-plan",start:state(12,16,192),
   dependentDelta:1,includeAtlas:true});
  assert.equal(empty.found,false,"No numeric evidence = no invented path");
  const denied=await post({type:"numeric-observe",
   before:state(2,3,6),after:state(3,3,9),actualActionWitness:false});
  assert.match(denied.error,/actualActionWitness=true/);
  let count=0;
  for(const x of [2,3,4])for(const y of [3,4,5]){
   for(const [before,after] of [
    [state(x,y,x*y),state(x+1,y,(x+1)*y)],
    [state(x,y,x*y),state(x,y+1,x*y+2*x)]
   ]){
    const observed=await post({type:"numeric-observe",
     before,after,actualActionWitness:true});
    assert.equal(observed.evidence.learned,true);
    count++;
   }
  }
  assert.equal(count,18);
  const seen=await json(base+"/v34/status?w=0");
  assert.equal(seen.causalNumeric.externallyProvidedPairs,18);
  const plan=await post({type:"numeric-plan",start:state(12,16,192),
   dependentDelta:1,includeAtlas:true});
  assert.equal(plan.found,true,JSON.stringify(plan).slice(0,500));
  assert.equal(plan.predicted,state(12,16,193));
  assert.equal(plan.plannedBeforeFirstAction,true);
  assert.equal(plan.originalNativeBrain,true);
  assert.equal(plan.referenceAnswerProvided,false);
  assert.equal(plan.originalSemanticQANotProven,true);
  assert.ok(plan.atlas.nodes.length>20);
  assert.ok(plan.atlas.edges.length>plan.path.length);
  const noChar=await post({type:"character-plan",start:"mat",
   charSlots:{"1":"u"},maxNodes:400,maxDepth:6,
   allowCorpusHypotheses:false});
  assert.equal(noChar.found,false);
  assert.equal(noChar.unverifiedHypothesesAllowed,false);
  const risky=await post({type:"character-plan",start:"mat",
   charSlots:{"1":"u"},maxNodes:400,maxDepth:6,
   allowCorpusHypotheses:true});
  assert.equal(risky.originalLiveWorker,true);
  assert.equal(risky.externalPhysicalCorrectnessProven,false);
  assert.ok(Array.isArray(risky.knownWorldGraph.states));
  const requested=await json(base+"/control?do=save&w=0",{method:"POST"});
  assert.equal(requested.ok,true);
  const recovered=await poll(()=>{
   const b=Brain.load(checkpoint);
   return b.persistentCausalAtlasEvidence?.observations?.length===18?b:null;
  },25000);
  assert.equal(recovered.persistentCausalAtlasEvidence.witnessed,18);
  assert.ok(fs.statSync(checkpoint).size>=originalBytes);
  console.log("V34_ACTUAL_NATIVE_LIVE_HTTP",JSON.stringify({
   nativeOriginalBrain:true,originalCheckpointResumed:true,
   observedRealCorpusSentences:status.sourceTraining.nativeTextStatesActive,
   actualMazeAttraction:status.originalField.targetAttraction,
   externalNumericWitnesses:18,predictedStructuredAnswer:plan.predicted,
   firstShotSteps:plan.path.length,fullObservedAtlasStates:plan.atlas.nodes.length,
   observedGraphEdges:plan.atlas.edges.length,
   nativeCheckpointEvidencePersisted:recovered.persistentCausalAtlasEvidence.witnessed,
   characterSourceNotPrivileged:true,structuralSourceOnly:true,
   realOpenDomainLanguage70Percent:false
  }));
 }catch(err){throw Error(err.message+"\nORIGINAL TRAINER LOG:\n"+logs);}
 finally{
  try{process.kill(-child.pid,"SIGTERM");}catch{child.kill("SIGTERM");}
  await Promise.race([new Promise(done=>child.once("exit",done)),sleep(2500)]);
  fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 }
});
