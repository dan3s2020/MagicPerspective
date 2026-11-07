// Hard source-level integration acceptance: the ACTUAL original V17 worker,
// its original Brain, original 2D maze-shape teacherless learned attractor,
// and ACTUAL observed TXT corpus all train the same persistent Brain.
// This does NOT establish exact long heldout semantic accuracy or CUDA speed.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import {spawn,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND}
 from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,SEEDS,seedOf}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const freePort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
test("REAL original devour worker shares native Brain and corpus-learned text hypermaze, global path before first action",{
 timeout:95000
},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-original-native-integration-"));
 const out=path.join(tmp,"runtime"),file=path.join(tmp,"observed-real-text.txt");
 const save=path.join(out,"brains","brain-0-winner.v8");
 fs.mkdirSync(path.dirname(save),{recursive:true});
 // Pretrain original Discoverer through physical, actual original maze worlds,
 // not an injected synthetic distance field or new statistical motor.
 const original=new Brain({rules:{depth:1,off:["R2","R4"],
  budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 original.enableEndogenousNoise();
 for(let i=0;i<42;i++){
  const maze=makeMaze(seedOf(SEEDS.train,300+i*31),[7,9,11][i%3]);
  playExercise(maze,original.disc);
  if(i>=24&&original.disc.attract(KIND.target)>.2&&
    original.disc.conduct(KIND.floor)>=.5&&original.disc.self()>=0)break;
 }
 assert.ok(original.disc.attract(KIND.target)>.2);
 assert.ok(original.disc.conduct(KIND.floor)>=.5);
 original.save(save);
 const before=fs.statSync(save).size;
 fs.writeFileSync(file,[
  "She is happy.",
  "She is tired.",
  "He is tired.",
  "He is calm.",
  "Știința este calmă.",
  "Știința este rapidă.",
  "Experiența este rapidă.",
  "Experiența este stabilă."
 ].join("\n")+"\n","utf8");
 const port=await freePort(),url="http://127.0.0.1:"+port;
 const command=[
  path.join(root,"transcend","torus-aether","devour","devour.mjs"),
  "--workers","1","--arms","winner","--worlds","text",
  "--gpu","off","--text",file,"--out",out,
  "--port",String(port),"--mem","1","--every","50000",
  "--resume","--start","--native-hypermaze","--endogenous-noise"
 ];
 const child=spawn(process.execPath,command,{cwd:root,
  detached:process.platform!=="win32",stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const stream of [child.stdout,child.stderr])
  stream.on("data",b=>{logs=(logs+String(b)).slice(-9000);});
 try{
  let observed=null;
  for(let i=0;i<210;i++){
   if(child.exitCode!==null)
    throw Error("Actual original V17 worker exited unexpectedly: "+logs);
   try{
    const res=await fetch(url+"/graphs");
    const data=await res.json();
    const a=data.graphs?.[0];
    if(a?.nativeHypermaze?.actualCorpusRows>=1 &&
       a?.observedTransformations?.learnedOperators>=2){
     observed=a;break;
    }
   }catch{}
   await sleep(180);
  }
  if(!observed)throw Error("Real original V17 corpus did not train native hypermaze in same Brain: "+logs);
  assert.ok(observed.nativeHypermaze.originalNativeBrain);
  assert.ok(observed.nativeHypermaze.originalNoiseAgency);
  assert.equal(observed.nativeHypermaze.externalSemanticAccuracyProven,false);
  const qp=new URLSearchParams({w:"0",start:"He is calm.",
   required:"She,calm",execute:"1",topology:"1"});
  const response=await fetch(url+"/native-hypermaze?"+qp,{method:"POST"});
  const result=await response.json();
  assert.equal(response.status,200);
  assert.equal(result.plannedBeforeFirstAction,true,JSON.stringify(result).slice(0,900));
  assert.equal(result.referenceAnswerProvided,false);
  assert.equal(result.found,true,JSON.stringify(result).slice(0,1000));
  assert.equal(result.predicted,"She is calm.");
  assert.equal(result.body?.solvedInternalGoal,true);
  assert.equal(result.body?.frames[0]?.stage,"before-first-action");
  assert.equal(result.body?.frames[0]?.worldActionsExecuted,0);
  assert.equal(result.body?.externalSemanticGoalValidated,false);
  assert.equal(result.exactUnseenLargeAnswerProven,false);
  assert.ok(result.topology?.nodes?.length>=3,"Actual native learned text-world nodes are missing");
  assert.ok(result.topology.edges.length>=1,"Actual original observed transformation edges are missing");
  assert.ok(result.topology.nodes.some(n=>n.position5D?.length===5),
   "No learned native five-torus positions were exposed for browser rendering");
  assert.ok(result.topology.initialShapeIds.length>=2);
  assert.ok(result.topology.nodes.some(n=>n.text==="She is calm."&&n.goal),
   "The real textual goal state must be an actual topology node");
  const atlasSummary=await(await fetch(url+"/native-hypermaze-atlas?"+
    new URLSearchParams({w:"0",mode:"summary"}))).json();
  assert.ok(atlasSummary.result?.journalEvents>3,
   "No actual append-only atlas entries saved after corpus ingestion");
  assert.ok(atlasSummary.result.worldsByDomain.text>=1);
  assert.ok(atlasSummary.result.searchesFound>=1);
  assert.ok(fs.existsSync(save+".hypermaze-atlas.jsonl"),
   "Original worker must preserve its atlas next to Brain.v8");
  const atlasSearch=await(await fetch(url+"/native-hypermaze-atlas?"+
    new URLSearchParams({w:"0",mode:"events",kind:"search",limit:"10"}))).json();
  const atlasRecorded=atlasSearch.result.events.find(x=>x.seq===result.atlasSequence);
  assert.ok(atlasRecorded?.found);
  assert.ok(atlasRecorded.fullExploredTopology.nodes.length>=3);
  assert.ok(atlasRecorded.fullExploredTopology.edges.length>=1);
  const atlasOperators=await(await fetch(url+"/native-hypermaze-atlas?"+
    new URLSearchParams({w:"0",mode:"operators",limit:"50"}))).json();
  assert.ok(atlasOperators.result.totalOperators>=2);
  assert.ok(atlasOperators.result.operators.some(x=>x.pathsUsedSuccessful>0));
  const unknown=await(await fetch(url+"/native-hypermaze?"+
    new URLSearchParams({w:"0",start:"He is calm.",required:"unicorn",
     topology:"1",execute:"0"}),{method:"POST"})).json();
  assert.equal(unknown.found,false);
  assert.ok(unknown.diagnostic.causes.includes("missing-observed-goal-concepts"));
  const failures=await(await fetch(url+"/native-hypermaze-atlas?"+
    new URLSearchParams({w:"0",mode:"events",kind:"search",
     onlyFailed:"1",limit:"30"}))).json();
  assert.ok(failures.result.events.some(x=>x.seq===unknown.atlasSequence));
  // The REAL original V17 native worker must retain Romanian diacritics
  // in the observed world, and infer a completely unseen Unicode goal.
  const unicodeGoal=new URLSearchParams({w:"0",
   start:"Experiența este stabilă.",required:"Știința,stabilă",execute:"1"});
  const unicode=await(await fetch(url+"/native-hypermaze?"+unicodeGoal,
   {method:"POST"})).json();
  assert.equal(unicode.found,true,JSON.stringify(unicode).slice(0,1300));
  assert.equal(unicode.predicted,"Știința este stabilă.");
  assert.equal(unicode.plannedBeforeFirstAction,true);
  assert.equal(unicode.referenceAnswerProvided,false);
  assert.equal(unicode.body?.executedFinal,"Știința este stabilă.");
  const savedSnapshot=Brain.load(save);
  assert.equal(savedSnapshot.observedTransformations.containsSentence("Știința este calmă."),true,
   "The original native text-world learner lost real Romanian diacritics");
  assert.equal(savedSnapshot.observedTransformations.containsSentence("Știința este stabilă."),false,
   "Frozen Unicode target was leaked to actual Brain training");
  assert.ok(savedSnapshot.disc.attract(KIND.target)>.2);
  assert.ok(savedSnapshot.noiseAgent);
  assert.ok(savedSnapshot.observedTransformations.seen>=4);
  assert.ok(savedSnapshot.hypermazeLearnedAxes?.size>0);
  assert.ok(fs.statSync(save).size>=before);
  // The old UI is untouched. New route is exposed only as opt-in.
  const old=await(await fetch(url+"/transcend/torus-aether/ui/index.html")).text();
  assert.ok(old.includes("<html")||old.includes("<!doctype"));
  assert.ok(!old.includes('id="nativeHypermazeStart"'));
  const html=await(await fetch(url+"/transcend/torus-aether/ui/native-hypermaze.html")).text();
  const js=await(await fetch(url+"/transcend/torus-aether/ui/native-hypermaze.js")).text();
  assert.ok(html.includes('id="world"')&&html.includes('id="predicted"'));
  assert.ok(js.includes("/native-hypermaze?")&&js.includes("dataVersion"));
  const browsers=["google-chrome","chromium","chromium-browser"];
  const browser=browsers.find(x=>spawnSync("which",[x],{encoding:"utf8"}).status===0);
  if(browser){
   // REAL browser makes the original V17 HTTP request, renders actual graph
   // and DOM before/after state from a task-supplied start and goal.
   const deep=new URLSearchParams({plan:"1",source:"He is calm.",required:"She,calm"});
   const ran=spawnSync(browser,[
    "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--dump-dom","--virtual-time-budget=4800",
    url+"/transcend/torus-aether/ui/native-hypermaze.html?"+deep
   ],{encoding:"utf8",timeout:25000,maxBuffer:12*1024*1024});
   console.log("NATIVE_CHROMIUM_DIAGNOSTIC",JSON.stringify({
    browser,status:ran.status,signal:ran.signal,
    stdoutBytes:ran.stdout?.length||0,stdoutStart:ran.stdout?.slice(0,350)||null,
    stderrLast:ran.stderr?.slice(-650)||null,error:ran.error?.message||null
   }));
   assert.equal(ran.status,0,"Native hypermaze Chrome UI not running: "+ran.stderr?.slice(-1200));
   assert.match(ran.stdout,/data-native-connected="true"/,
    "Browser's actual V17 worker poll must be connected, not static mock");
   assert.match(ran.stdout,/data-native-before-action="true"/,
    "Original Brain must plan globally in browser before first text action");
   const browserNodes=+(ran.stdout.match(/data-native-node-count="(\d+)"/)?.[1]||0);
   assert.ok(browserNodes>=3,
    "Actual native graphical hypermaze was not populated from the original Brain");
   assert.ok(ran.stdout.includes("She is calm."),
    "Real browser answer-shape readout did not show original native prediction");
   console.log("REAL_NATIVE_HYPERMAZE_CHROMIUM",JSON.stringify({
    browser,connected:true,browserNodes,goal:"She is calm.",
    noMockData:true,originalUIUntouched:true}));
   const atlasUrl=url+"/transcend/torus-aether/ui/native-hypermaze-atlas.html?"+
     new URLSearchParams({w:"0",searchSequence:String(result.atlasSequence)});
   const atlasDom=spawnSync(browser,[
    "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--dump-dom","--virtual-time-budget=4500",atlasUrl
   ],{encoding:"utf8",timeout:25000,maxBuffer:12*1024*1024});
   assert.equal(atlasDom.status,0,atlasDom.stderr?.slice(-700));
   assert.match(atlasDom.stdout,/data-atlas-event-count="[1-9][0-9]*"/);
   assert.match(atlasDom.stdout,/data-atlas-selected-kind="success"/);
   const atlasNodes=+(atlasDom.stdout.match(/data-atlas-graph-nodes="(\d+)"/)?.[1]||0);
   assert.ok(atlasNodes>=3,
    "Chrome must draw the ACTUAL explored hypermaze, not an empty mock");
   console.log("REAL_NATIVE_ATLAS_CHROMIUM",JSON.stringify({
    browser,journalEventCount:atlasSummary.result.journalEvents,
    realExploredGraphNodes:atlasNodes,
    successAndMissingPathEventsFound:true,noMock:true}));
  }else console.log("NATIVE_BROWSER_NOT_INSTALLED: real worker/API/static page tested");
  console.log("REAL_ORIGINAL_WORKER_SHARED_HYPERMAZE",JSON.stringify({
   originalBrainSaved:true,checkpointBytes:fs.statSync(save).size,
   realTextCorpusRecords:observed.nativeHypermaze.actualCorpusRows,
   learnedOriginalOperators:savedSnapshot.observedTransformations.operators.size,
   reusedOriginalMazeAttractor:savedSnapshot.disc.attract(KIND.target),
   original5DTransitionAxes:savedSnapshot.hypermazeLearnedAxes?.size,
   preactionGlobalShape:result.initialShape,
   actionsActuallyExecuted:result.body.actions,
   originalNoisePolicy:!!savedSnapshot.noiseAgent,
   rawUnicodeTrainingPreserved:true,
   predictedUnseenRomanianState:unicode.predicted,
   exactLongUnseenText100PercentProven:false,
   CUDAHardwareBenchmarkNotYetRun:true,
   noNewUIControls:true
  }));
 }finally{
  try{
   if(process.platform==="win32")child.kill("SIGTERM");
   else process.kill(-child.pid,"SIGTERM");
  }catch{try{child.kill("SIGTERM");}catch{}}
  await sleep(250);
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
