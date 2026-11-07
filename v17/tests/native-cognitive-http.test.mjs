import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,existsSync,rmSync} from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const freePort=()=>new Promise((ok,fail)=>{const s=createServer();s.once("error",fail);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?fail(e):ok(p));});});

test("ACTUAL native worker: cognitive original Discoverer reads V19 action rules, draws real path in original UI, keeps checkpoint",{
 timeout:90000
},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v21-native-cognitive-"));
 const corpus=path.join(dir,"original.txt"),out=path.join(dir,"saved");
 const docs=Array.from({length:74},(_,i)=>
 "She is happy. She is tired. He is tired. He is calm. North goes east. "+i+".");
 writeFileSync(corpus,docs.join("\n\n")+"\n","utf8");
 const port=await freePort(),cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const proc=spawn(process.execPath,[
 "transcend/torus-aether/devour/devour.mjs","--workers","1","--arms","stable+many",
 "--worlds","cognitivemap,hypertext,maze,transform","--gpu","off","--text",corpus,
 "--out",out,"--port",String(port),"--mem","2","--start"
 ],{cwd,detached:true,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let logs="";for(const s of [proc.stdout,proc.stderr])s.on("data",b=>logs=(logs+b.toString()).slice(-16000));
 const base="http://127.0.0.1:"+port;
 const read=async(endpoint)=>{
  const r=await fetch(base+endpoint,{signal:AbortSignal.timeout(5000)});assert.equal(r.status,200);
  return r;
 };
 const post=async(endpoint,data)=>{
  const r=await fetch(base+endpoint,{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify(data),signal:AbortSignal.timeout(18000)});
  assert.equal(r.status,200);return r.json();
 };
 try{
  let snap;const started=Date.now();
  while(Date.now()-started<65000){
   if(proc.exitCode!==null&&proc.exitCode!==0)throw Error("Native worker exited: "+logs);
   try{
    snap=await(await read("/graph?w=0")).json();
    if(snap.cognitive?.documents>=60 && snap.cognitive?.inducedActionRules>=1)break;
   }catch{}
   await sleep(175);
  }
  assert.ok(snap?.cognitive?.documents>=60,"Original cognitive observations not trained: "+logs);
  assert.ok(snap.cognitive.inducedActionRules>=1,"No actual V19 learned text transformations: "+logs);
  assert.ok(snap.maze?.played>0 && snap.transform?.played>0,"Lost original V17 worlds");
  const html=await(await read("/transcend/torus-aether/ui/index.html?live=1")).text();
  const js=await(await read("/transcend/torus-aether/ui/native-cognitive-live.js")).text();
  for(const id of ["cognitiveInitial","cognitiveGoal","cognitiveEvaluate","nativeCognitiveCanvas",
    "nativeCognitivePlan","nativeCognitiveScrub"])assert.ok(html.includes('id="'+id+'"'),"Lost original/new control "+id);
  assert.match(js,/cognitive-native-eval/);
  const input={w:0,initial:"He is calm.",goal:{slots:{"0":"She","2":"calm"}},
    maxNodes:384,maxDepth:8};
  const native=await post("/cognitive-native-eval",input);
  assert.equal(native.error,undefined,JSON.stringify(native)+"\n"+logs);
  assert.equal(native.originalDiscovererDirectlyUsed,true);
  assert.equal(native.noHiddenAnswerOracle,true);
  assert.equal(native.frozen,true);
  assert.equal(native.found,true,"Cannot find novel state using original Desc shape: "+JSON.stringify(native));
  assert.ok(native.plannedPath.length>=1);
  assert.ok(native.plannedPath.some(e=>e.provenance==="learned-rule-hypothesis"));
  assert.ok(native.graph.nodes.length>0&&native.graph.edges.length>0);
  assert.ok(native.math.maxBellmanResidual<1e-10);
  const legacy=await post("/cognitive-eval",input);
  assert.equal(legacy.error,undefined,JSON.stringify(legacy));
  assert.equal(legacy.found,true);
  const save=path.join(out,"brains","brain-0-stable+many.v8");
  for(let i=0;i<60&&!existsSync(save);i++)await sleep(200);
  assert.ok(existsSync(save),"Original checkpoint missing");
  const brain=Brain.load(save);
  const m=LearnedCognitiveMap.restore(brain.cognitiveMap);
  const r=m.formSolutionNative(input.initial,input.goal,{disc:brain.disc,maxNodes:384,maxDepth:8});
  assert.equal(r.found,true,"Restored native V19 Brain unable to plan after restart");
  console.log("NATIVE_COGNITIVE_HTTP",JSON.stringify({documents:snap.cognitive.documents,
    trainedRules:snap.cognitive.inducedActionRules,states:native.generatedStates,
    completePredictedSteps:native.plannedPath.length,
    inferredSteps:native.math.inferredHypothesisSteps,
    residual:native.math.maxBellmanResidual,checkpointRestored:true,
    originalMaze:true,originalTransform:true,originalUI:true,
    caveat:"Small observed-sentence controlled world; no arbitrary long semantic text proof"}));
 }finally{
  try{process.kill(-proc.pid,"SIGTERM");}catch{try{proc.kill("SIGTERM");}catch{}}
  await sleep(350);
  rmSync(dir,{recursive:true,force:true});
 }
});
