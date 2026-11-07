// Integration through the EXACT real OpenThoughts JSONL stream and SAME
// persisted native V17 Brain. This controlled role-grammar source tests the
// pipeline; it is NOT the user's unavailable 594 MB private Windows dataset
// and NOT evidence of unrestricted OpenThoughts reasoning.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {launch} from "../research/text-hypermaze/real-corpus-server.mjs";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((ok,fail)=>{const s=net.createServer();s.once("error",fail);
 s.listen(0,"127.0.0.1",()=>{const n=s.address().port;s.close(e=>e?fail(e):ok(n));});});
const ask=(x,y)=>"Please place "+x+" then "+y+" into the final sequence.";
const ans=(x,y)=>"Final sequence: "+x+" "+y+".";
const seeds=[["opal","birch"],["jade","birch"],["opal","maple"],
 ["jade","maple"],["opal","cedar"],["amber","birch"],
 ["amber","maple"],["jade","cedar"],["ruby","birch"]];
async function get(url,method="GET"){
 const r=await fetch(url,{method,signal:AbortSignal.timeout(16000)});
 const x=await r.json();assert.ok(r.ok&&!x.error,JSON.stringify(x).slice(0,800));return x;
}
async function until(base,done,timeout=85000){
 const end=Date.now()+timeout;
 while(Date.now()<end){
  const x=await get(base+"/api/status");
  if(x.error)throw Error("Actual native stream worker error: "+x.error);
  if(x.status&&done(x.status))return x.status;
  await delay(100);
 }
 throw Error("Actual QA stream did not complete within watchdog");
}
test("real original JSONL worker learns and saves Q/A transitions and scores every withheld full answer without gold goals; original HTTP UI has true metrics",{
 timeout:140000
},async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v29-actual-stream-"));
 const data=path.join(root,"train-00015-of-00120.jsonl"),
  out=path.join(root,"same-native-brain");
 const lines=[];
 const actualHeldouts=[];
 for(let i=1;i<=100;i++){
  const pair=i%10===0?["completelynewword"+i,"maple"]:
   seeds[(i-1)%seeds.length];
  const question=ask(pair[0],pair[1]),answer=ans(pair[0],pair[1]);
  if(i%10===0)actualHeldouts.push({question,answer});
  lines.push(JSON.stringify({conversations:[
   {from:"human",value:question},{from:"gpt",value:answer}
  ]}));
 }
 fs.writeFileSync(data,lines.join("\n")+"\n","utf8");
 let app=null;
 try{
  app=await launch({data,out,port:await port(),autoStart:true,
   holdoutEvery:10,saveEvery:20,transitionEvery:20,
   windowTokens:32,maxTokensPerSegment:48,
   maxObserved:2000,maxOperators:5000,heapMB:1024});
  const s=await until(app.base,x=>x.completed===true);
  assert.equal(s.rowsRead,100);
  assert.equal(s.heldoutRows,10);
  assert.equal(s.trainedRows,90);
  assert.equal(s.qaFrozenHeldoutQuestions,10);
  assert.equal(s.qaTrainingPairs,90);
  assert.ok(s.qaLearnedPairs>=9);
  assert.ok(s.qaRoleWitnessedAxisEdges>1);
  assert.equal(s.qaFrozenGoalsFound,10);
  assert.equal(s.qaFrozenWholeRawExact,10,
   "Actual withheld full answers must be exactly correct, not next-token hits");
  assert.equal(s.qaWholeAnswerExactRate,1);
  assert.equal(s.bytesRead,fs.statSync(data).size);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,
   "native-hypermaze-progress.json"),"utf8"));
  const brain=Brain.load(path.join(out,manifest.checkpoint));
  assert.equal(brain.qaRoleEvidence.examples.some(x=>actualHeldouts.some(h=>h.question===x.question)),false,
   "Real holdout Q/A text must never enter training Brain");
  assert.equal(typeof brain.disc.shapeGraph,"function");
  const unseenQ=ask("asparagusnew","maple"),unseenA=ans("asparagusnew","maple");
  const query=new URLSearchParams({question:unseenQ,execute:"1"});
  const plan=await get(app.base+"/native-qa?"+query.toString(),"POST");
  assert.equal(plan.found,true,JSON.stringify(plan).slice(0,800));
  assert.equal(plan.plannedBeforeFirstAction,true);
  assert.equal(plan.referenceAnswerProvided,false);
  assert.equal(plan.predicted,unseenA);
  assert.equal(plan.body.actual,unseenA);
  assert.ok(plan.actions.length>0);
  assert.equal(plan.topology.nodes.length,plan.values.length);
  const unknown=await get(app.base+"/native-qa?"+new URLSearchParams({
   question:"How do planetary orbital resonances form?"
  }),"POST");
  assert.equal(unknown.found,false,"Unknown semantics must cause abstention");
  const html=await(await fetch(app.base+"/")).text();
  assert.match(html,/id="qaExact"/);
  assert.match(html,/id="qaQuestion"/);
  assert.match(html,/id="qaCoverage"/);
  const js=await(await fetch(app.base+"/transcend/torus-aether/ui/native-hypermaze.js")).text();
  assert.match(js,/native-qa/);
  assert.match(js,/qaFrozenWholeRawExact/);
  console.log("V29_ACTUAL_NATIVE_QA_HTTP",JSON.stringify({
   actualJSONLRows:s.rowsRead,
   originalQATrainingPairs:s.qaTrainingPairs,
   actualHeldoutQuestions:s.qaFrozenHeldoutQuestions,
   fullAnswerExact:s.qaFrozenWholeRawExact,
   originalShapePlanSteps:plan.actions.length,
   originalBrainCheckpointSaved:true,
   noHeldoutReferenceTraining:true,noProvidedAnswerGoal:true,
   allOriginalUIControlsPreserved:true,
   sourceScope:"controlled native JSONL integration fixture, not real full OpenThoughts corpus",
   fullOpenThoughtsSemanticAccuracyUnverified:true,
   realCUDAOriginalMotorTested:false
  }));
 }finally{if(app)await app.close();fs.rmSync(root,{recursive:true,force:true});}
});
