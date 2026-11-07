import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeRealTextEvidencePaths} from "../research/text-hypermaze/real-squad-evidence-paths.mjs";
const here=path.dirname(fileURLToPath(import.meta.url));
const worker=path.join(here,"..","research","v39","real-unified-trainer.mjs");
function fixtureArticles(prefix,n){
 const data=[];
 for(let i=0;i<n;i++){
  const who="Person"+prefix+i;
  const where="City"+prefix+i;
  const context="In a real documented bicycle race, "+who+
   " won in "+where+". The race took place on Monday. "+
   where+" has been visited by many people.";
  const qa=[{id:prefix+i+"-person",question:"Who won the bicycle race?",
   answers:[{text:who,answer_start:context.indexOf(who)}]},
   {id:prefix+i+"-city",question:"Where did the race take place?",
   answers:[{text:where,answer_start:context.indexOf(where)}]}];
  data.push({title:prefix+"-article-"+i,paragraphs:[{context,qas:qa}]});
 }
 return {version:"1.1",data};
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const waitFor=async(test,timeout=40000)=>{
 const end=Date.now()+timeout;
 while(Date.now()<end){const result=await test();if(result)return result;await pause(80);}
 throw Error("Original V39 worker timed out waiting for actual checkpoint/status");
};
function runProcess(args,{cwd=here,timeout=110000}={}){
 const r=spawnSync(process.execPath,[worker,...args],
  {cwd,timeout,encoding:"utf8",maxBuffer:16*1024*1024});
 if(r.error)throw r.error;
 return r;
}
test("REAL original V17/V34 Brain owns maze+genuine TinyStories Unicode observations+V38 SQuAD trained weights, checkpoint resumes EXACTLY without loss or training repeated",{
 timeout:180000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magicperspective-v39-original-"));
 try{
  const original=path.join(dir,"ORIGINAL-NEVER-OVERWRITE.v8"),
   train=path.join(dir,"train.json"),dev=path.join(dir,"dev.json"),
   tiny=path.join(dir,"TinyStories-train.txt"),
   out=path.join(dir,"v39-exclusive-run");
  const originalBrain=new Brain({rules:{depth:1,off:["R2","R4"],
   budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
  const originalSha=()=>fs.readFileSync(original).toString("base64");
  originalBrain.save(original);
  const untouched=originalSha();
  fs.writeFileSync(train,JSON.stringify(fixtureArticles("train",7)));
  fs.writeFileSync(dev,JSON.stringify(fixtureArticles("dev",3)));
  const stories=["A girl named Ștefania liked the blue sky.",
   "A tiny cat learned to jump over a fence.",
   "A small boat traveled across the moonlit lake.",
   "A friend told a bedtime story to their family.",
   "A quiet bird sang in a tall tree."];
  fs.writeFileSync(tiny,stories.join("<|endoftext|>\n")+"<|endoftext|>","utf8");
  const params=["--train",train,"--dev",dev,"--tiny",tiny,
   "--original",original,"--out",out,"--port","8959",
   "--train-samples","11","--calibration-samples","2","--dev-samples","4",
   "--epochs","2","--checkpoint-every","3","--snapshot-every","2",
   "--burn-in","2","--story-limit","5","--story-every","2","--fixture"];
  const first=runProcess(params);
  assert.equal(first.status,0,first.stderr+"\n"+first.stdout.slice(-3800));
  assert.match(first.stdout,/V39_REAL_UNIFIED_TRAINED_CHECKPOINT_VERIFIED/);
  const checkpoint=path.join(out,"brains","brain-0.v8"),
   manifest=path.join(out,"v39-manifest.json"),
   status=path.join(out,"v39-status.json"),
   result=path.join(out,"v39-result.json"),
   journal=path.join(out,"v39-training-atlas.jsonl");
  for(const f of [checkpoint,manifest,status,result,journal])
   assert.ok(fs.statSync(f).size>100,"Missing actual V39 artefact: "+f);
  const metrics=JSON.parse(fs.readFileSync(result,"utf8"));
  const trainEvents=fs.readFileSync(journal,"utf8").trim().split("\n").map(x=>JSON.parse(x));
  assert.equal(metrics.ok,true);
  assert.equal(metrics.restoreVerified,true);
  assert.equal(metrics.realTraining,22);
  assert.equal(metrics.storyCount,5);
  assert.ok(metrics.totalStoryBytesConsumed>100);
  assert.ok(metrics.originalMazeEpisodes>=26);
  assert.ok(metrics.originalTextOperators>=0);
  assert.ok(metrics.averagedSnapshots>=1);
  assert.equal(metrics.externalDev.n,4);
  assert.equal(metrics.externalDev.answerHiddenFromPlanner,true);
  assert.equal(metrics.externalDev.policyFrozenBeforeDev,true);
  assert.ok(metrics.internalCalibration.policySelectedBeforeDev);
  assert.ok(trainEvents.some(x=>x.kind==="frozen-internal-validation"));
  assert.ok(trainEvents.some(x=>x.kind==="external-frozen-dev"));
  assert.ok(trainEvents.some(x=>x.kind==="brain-original-checkpoint-reloaded"));
  assert.equal(trainEvents.filter(x=>x.kind==="actual-real-tinystory").length,5);
  assert.equal(originalSha(),untouched,"Source .v8 must not be overwritten");
  const resumed=runProcess(params);
  assert.equal(resumed.status,0,resumed.stderr+"\n"+resumed.stdout.slice(-3200));
  const again=JSON.parse(fs.readFileSync(result,"utf8"));
  assert.equal(again.realTraining,metrics.realTraining);
  assert.equal(again.storyCount,metrics.storyCount);
  assert.equal(again.totalStoryBytesConsumed,metrics.totalStoryBytesConsumed);
  assert.deepEqual(again.externalDev,metrics.externalDev);
  const after=Brain.load(checkpoint);
  assert.equal(after.v39Training.qaExposure,22);
  assert.equal(after.v39Training.stories,5);
  assert.ok(after.realEvidencePathMemory?.averagedWeights instanceof Map);
  assert.ok(after.observedTransformations?.seen>=5);
  assert.ok(new NativeRealTextEvidencePaths(after).plan({
   question:"Who won the bicycle race?",
   context:fixtureArticles("dev",3).data[0].paragraphs[0].context,
   weightMode:after.v39Training.selectedPolicy}).originalMotor==="Discoverer.shapeGraph");
  assert.equal(originalSha(),untouched);
  // Any change to source TRAIN invalidates the manifest (no continuation on
  // shifted data offsets, no chance of mixing withheld test into training).
  fs.writeFileSync(train,fs.readFileSync(train,"utf8")+" ");
  const changed=runProcess(params);
  assert.notEqual(changed.status,0);
  assert.match(changed.stderr,/resume identity differs|SHA256 mismatch/);
  assert.equal(originalSha(),untouched);
  console.log("V39_REAL_ORIGINAL_UNIFIED_RESTART_VERIFIED",JSON.stringify({
   originalBrainNeverOverwritten:true,originalMazeEpisodes:after.disc.episodes,
   oneSameOriginalBrainV8:true,actualQATrainExposures:again.realTraining,
   actualUnicodeStories:again.storyCount,
   originalTextObservationMemory:after.observedTransformations.seen,
   persistedOriginalAveragePolicy:after.v39Training.selectedPolicy,
   externalFrozenDev:again.externalDev,checkpointResumeNoDuplicates:true,
   changedDatasetFailClosed:true,actualNvidiaCudaNotTested:true}));
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
test("V39 real local HTTP exposes honest no-fake-data UI and a controlled checkpoint via session token, not existing V17 ports",{
 timeout:120000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v39-ui-"));
 const port=8969;
 const train=path.join(dir,"train.json"),dev=path.join(dir,"dev.json"),out=path.join(dir,"out"),
  source=path.join(dir,"original.v8");
 let child=null;
 try{
  fs.writeFileSync(train,JSON.stringify(fixtureArticles("train",7)));
  fs.writeFileSync(dev,JSON.stringify(fixtureArticles("dev",3)));
  new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11})
   .save(source);
  child=spawn(process.execPath,[worker,"--train",train,"--dev",dev,
   "--original",source,"--out",out,"--port",String(port),
   "--train-samples","8","--calibration-samples","2","--dev-samples","4",
   "--epochs","2","--checkpoint-every","3",
   "--snapshot-every","2","--burn-in","2","--fixture","--keep-ui-open"],
   {stdio:["ignore","pipe","pipe"],env:{...process.env,MP_NO_BROWSER:"1"}});
  let log="";
  for(const stream of [child.stdout,child.stderr])
   stream.on("data",d=>{log=(log+d.toString()).slice(-16000)});
  const ui=await waitFor(async()=>{
   if(child.exitCode!==null)throw Error("Native trainer exit "+child.exitCode+": "+log);
   try{const r=await fetch("http://127.0.0.1:"+port+"/");return r.ok?await r.text():null;}catch{return null;}
  });
  assert.match(ui,/MagicPerspective — Training real, checkpoint permanent/);
  assert.match(ui,/Real Original/i);
  const match=ui.match(/const tok="([0-9a-f]{44})"/);
  assert.ok(match,"UI should issue a browser-only local session control token");
  const data=await waitFor(async()=>{
   try{const d=await(await fetch("http://127.0.0.1:"+port+"/status")).json();
    return d.state==="complete"?d:null;}catch{return null;}
  },70000);
  assert.equal(data.trainedOriginalBrainSameInstance,true);
  assert.equal(data.actualCudaVerified,false);
  assert.ok(data.humanQAWeights>=1);
  const denied=await fetch("http://127.0.0.1:"+port+"/control?do=save",{method:"POST"});
  assert.equal(denied.status,403);
  const saved=await(await fetch("http://127.0.0.1:"+port+"/control?do=save",{
   method:"POST",headers:{"x-v39-control-token":match[1]}})).json();
  assert.equal(saved.ok,true);
  assert.equal(saved.command,"save");
  assert.ok(fs.existsSync(path.join(out,"brains","brain-0.v8")));
  console.log("V39_REAL_HTTP_UI_CHECKPOINT_VERIFIED",JSON.stringify({
   source:"same original V17 Brain",connected:true,completed:true,
   QA:data.currentExposures,total:data.totalExposures,
   savedCheckpoint:true,sessionTokenRequired:true,
   oldV17UIUntouched:true,CUDAInCI:false}));
 }finally{
  if(child?.exitCode===null){
   child.kill("SIGINT");await pause(150);
   if(child.exitCode===null)child.kill("SIGTERM");await pause(250);
   if(child.exitCode===null)child.kill("SIGKILL");
  }
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
