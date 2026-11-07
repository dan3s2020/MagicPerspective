import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,existsSync,rmSync} from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {QuestionGoalNavigator} from "../transcend/torus-aether/worlds/question-goal-navigation.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const port=s.address().port;s.close(e=>e?reject(e):resolve(port));});
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const dataset=process.env.MP_V24_TEST_PARQUET||process.argv.find((x,i,a)=>a[i-1]==="--fixture");
if(!dataset)test.skip("real Parquet fixture path is required by --fixture");
else test("real V24 native Parquet worker + original 2D unaffected + UI + checkpoint + frozen holdout",
 {timeout:115000},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v24-http-"));
 const out=path.join(dir,"saved-native-graph"),port=await freePort();
 const child=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","cognitivemap,hypertext",
  "--data",dataset,"--out",out,"--port",String(port),
  "--start","--gpu","off","--mem","2","--every","100000"
 ],{cwd:root,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const stream of [child.stdout,child.stderr])stream.on("data",b=>
  logs=(logs+b.toString()).slice(-15000));
 const host="http://127.0.0.1:"+port;
 const get=async path=>{
  const r=await fetch(host+path,{signal:AbortSignal.timeout(4000)});
  if(!r.ok)throw Error("HTTP "+r.status);return r.json();
 };
 const post=async (uri,body=null)=>{
  const r=await fetch(host+uri,{method:"POST",headers:body?{"content-type":"application/json"}:{},
    body:body?JSON.stringify(body):null,signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error("HTTP "+r.status);return r.json();
 };
 try{
  let graph,complete=false;
  for(let i=0;i<350;i++){
   if(child.exitCode!==null)throw Error("Native V24 server exited early: "+logs);
   try{
    graph=await get("/graph?w=0");
    if(graph?.questionGoal?.rows>=64){complete=true;break;}
   }catch{}
   await pause(180);
  }
  assert.ok(complete,"Missing native end-to-end Q/A training: "+logs);
  assert.equal(graph.questionGoal.rows,64);
  assert.ok(graph.questionGoal.observedActions>100);
  assert.ok(graph.questionGoal.observedChars>300);
  assert.ok(graph.questionGoal.geometryChars>0);
  assert.equal(graph.questionGoal.originalMazeMethod??graph.questionGoal.last?.originalMazeMethod,
    "Discoverer.shape");
  assert.ok(graph.cognitive?.observedSentences>0);
  assert.ok(graph.hypermaze?.documents>=64);
  const html=await (await fetch(host+"/transcend/torus-aether/ui/index.html?live=1")).text();
  assert.ok(html.includes('id="questionGoalCanvas"'));
  assert.ok(html.includes('src="app.js"'));
  assert.ok(html.includes('src="text-hypermaze-live.js"'));
  assert.ok(html.includes('src="question-goal-live.js"'));
  const ui=await (await fetch(host+"/transcend/torus-aether/ui/question-goal-live.js")).text();
  assert.match(ui,/questionGoalHeldTest|questionGoalCanvas|Discoverer/);
  const question="Which route leads toward the quiet bridge, unseen gate and north path?";
  const payload={w:0,question,maxNodes:1200,temperature:0};
  const response=await post("/question-goal-plan",payload);
  assert.ok(!response.error,"Native V24 route failed: "+JSON.stringify(response));
  assert.equal(response.originalOperator,"Discoverer.shape");
  assert.equal(response.ready,true,"Native preaction route must exist: "+JSON.stringify(response));
  assert.equal(response.referenceAnswerProvided,false);
  assert.equal(response.predictedBeforeFirstMovement,true);
  assert.ok(response.initialFullRoute.length>0);
  assert.equal(response.movement.reached,true);
  assert.equal(response.dimensions,38);
  const repeat=await post("/question-goal-plan",payload);
  assert.equal(response.predictedText,repeat.predictedText);
  // Explicit no oracle: ONLY the question is accepted by the plan endpoint.
  const unexpected=await post("/question-goal-plan",{w:0,question:"unknown unseen question",answer:"SECRET_HIDDEN_ANSWER",maxNodes:1200});
  assert.equal(unexpected.referenceAnswerProvided,false);
  const frozen=await post("/question-goal-heldout?w=0&count=4&maxNodes=1200");
  assert.equal(frozen.frozen,true,JSON.stringify(frozen));
  assert.equal(frozen.referenceAnswerOnlyInHTTPParent,true);
  assert.equal(frozen.total,4);
  assert.equal(frozen.sufficientForUniversal100PctProof,false);
  assert.ok(frozen.exact<=4);
  // Unique hidden answers cannot be in native train set; all 16 withheld.
  assert.equal(frozen.exact,0,"CI intentionally uses entirely novel held-out answers");
  const checkpoint=path.join(out,"brains","brain-0-stable+many.v8");
  for(let i=0;i<100&&!existsSync(checkpoint);i++)await pause(100);
  assert.ok(existsSync(checkpoint),"Native V24 checkpoint not saved: "+logs);
  const saved=Brain.load(checkpoint);
  assert.ok(saved.questionGoalNavigator);
  assert.ok(saved.cognitiveMap);
  const navigator=QuestionGoalNavigator.restore(saved.questionGoalNavigator);
  const map=LearnedCognitiveMap.restore(saved.cognitiveMap);
  assert.equal(navigator.rows,64);
  assert.ok(![...navigator.terminals].some(([k])=>k.includes("WITHHELD_UNOBSERVED_ANSWER")));
  const direct=navigator.plan(question,{map,geometry:saved.trace.geo,maxNodes:1200});
  assert.equal(direct.originalOperator,"Discoverer.shape");
  assert.equal(direct.predictedText,response.predictedText);
  console.log("V24_NATIVE_E2E",JSON.stringify({
   totalObservedRows:navigator.rows,actions:navigator.observedActions,
   originalDiscoverer:response.originalOperator,
   plannedBeforeFirstAction:response.predictedBeforeFirstMovement,
   realGraphEdges:map.externalEdges.size,
   geometry5DActive:response.dimensions===38,heldoutExact:frozen.exact,heldoutN:frozen.total,
   noLabelLeak:frozen.referenceAnswerOnlyInHTTPParent
  }));
 }finally{
  try{child.kill("SIGTERM");}catch{}
  await pause(300);
  if(child.exitCode===null)try{child.kill("SIGKILL");}catch{}
  rmSync(dir,{recursive:true,force:true});
 }
});
