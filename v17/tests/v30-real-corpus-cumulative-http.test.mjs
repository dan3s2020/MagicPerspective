import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {launch} from "../research/text-hypermaze/real-corpus-server.mjs";

const delay=n=>new Promise(resolve=>setTimeout(resolve,n));
const freePort=()=>new Promise((resolve,reject)=>{
 const server=net.createServer();server.once("error",reject);
 server.listen(0,"127.0.0.1",()=>{
  const port=server.address().port;
  server.close(e=>e?reject(e):resolve(port));
 });
});
async function call(url,method="GET"){
 const r=await fetch(url,{method,signal:AbortSignal.timeout(30000)});
 const result=await r.json();
 assert.ok(r.ok&&!result.error,JSON.stringify(result).slice(0,1000));
 return result;
}
async function finished(base){
 for(let i=0;i<300;i++){
  const data=await call(base+"/api/status");
  if(data.error)throw Error(data.error);
  if(data.status?.completed)return data.status;
  await delay(120);
 }
 throw Error("Original real-corpus HTTP worker did not complete source training");
}
const q=(a,b)=>"Please place "+a+" then "+b+" into the final sequence.";
const a=(a,b)=>"Final sequence: "+a+" "+b+".";
test("V30 actual one-Brain real JSONL HTTP: accumulated topology routes + original UI and saved checkpoint, no fake physical world edges",{
 timeout:110000
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v30-cumulative-http-"));
 const file=path.join(dir,"train-00015-of-00120.jsonl"),out=path.join(dir,"checkpoint");
 const pairs=[["opal","birch"],["jade","birch"],["opal","maple"],
  ["jade","maple"],["opal","cedar"],["amber","birch"]];
 const records=Array.from({length:36},(_,i)=>{
  const [x,y]=pairs[i%pairs.length];
  return JSON.stringify({messages:[
   {role:"user",content:q(x,y)},
   {role:"assistant",content:a(x,y)}
  ]});
 });
 fs.writeFileSync(file,records.join("\n")+"\n","utf8");
 let app=null;
 try{
  app=await launch({data:file,out,port:await freePort(),autoStart:true,
   holdoutEvery:9,saveEvery:9,transitionEvery:8,
   windowTokens:24,maxTokensPerSegment:48,
   maxObserved:1200,maxOperators:2400,heapMB:1024});
  const m=await finished(app.base);
  assert.equal(m.rowsRead,36);
  assert.equal(m.bytesRead,fs.statSync(file).size);
  assert.ok(m.crossMazeMemory);
  assert.equal(m.crossMazeMemory.originalBrain,true);
  assert.equal(m.crossMazeMemory.physicallyVerifiedEdges,0,
   "Real textual source and user/GPT answers are not physical action steps");
  assert.ok(m.learnedOperators>0,"Original real reader must learn actual textual operator effects");
  assert.equal(m.crossMazeMemory.roleEpisodes,0);
  const query=new URLSearchParams({start:q("opal","birch"),
   required:"maple",inferred:"1",depth:"5",budget:"500",topology:"1"});
  const plan=await call(app.base+"/native-cumulative?"+query,"POST");
  assert.equal(plan.originalPlanner,"Discoverer.shapeGraph");
  assert.equal(plan.referenceAnswerProvided,false);
  assert.equal(plan.plannedBeforeFirstAction,true);
  assert.equal(plan.originalBrain,true);
  assert.equal(plan.noProvidedReferenceAnswer,true);
  if(plan.found){
   assert.equal(plan.pathContainsInferredEdges,true,
    "A real-corpus text proposal must never be described as physically verified");
   assert.ok(plan.topology.nodes.length>0);
   assert.ok(plan.topology.edges.some(x=>x.status==="inferred-unverified"));
  }else{
   assert.ok(plan.reason.length>0,
    "The missing real language pathway must be measured as missing");
  }
  const verified=await call(app.base+"/native-cumulative?"+new URLSearchParams({
   start:q("opal","birch"),required:"maple",inferred:"0",
   topology:"1",depth:"5",budget:"250"
  }),"POST");
  assert.equal(verified.found,false);
  assert.equal(verified.reason,"START_STATE_NOT_YET_WITNESSED",
   "Training source-only text cannot invent physically accepted world edges");
  const questionOnly=await call(app.base+"/native-cumulative-question?"+
   new URLSearchParams({question:"Compute 8 times 7.",
    depth:"18",budget:"500",topology:"1"}),"POST");
  assert.equal(questionOnly.found,false,
   "No physically witnessed multiplication world and no QA grammar: must abstain");
  assert.equal(questionOnly.originalPlanner,"Discoverer.shapeGraph");
  assert.equal(questionOnly.referenceAnswerProvided,false);
  assert.equal(questionOnly.plannedBeforeFirstAction,true);
  assert.equal(questionOnly.fullGoldAnswerNotPassed,true);
  const math=await call(app.base+"/native-cumulative-numeric?"+new URLSearchParams({
   start:"5 * 6 = 30.",inputs:"0:8,2:7",depth:"10",budget:"300",
   topology:"1"
  }),"POST");
  assert.equal(math.found,false);
  assert.equal(math.reason,"NO_IDENTIFIED_STATE_DEPENDENT_AXES",
   "Unseen numerical data must NOT borrow a hardcoded multiplication solution");
  assert.equal(math.goalDependentAnswerSupplied,false);
  // All previous original V17 plans, including abstentions, must exist
  // in the SAME persistent worker/Brain. The browser receives actual
  // evidence, not any hand-written graph fixtures.
  const atlas=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"attempts",offset:"0",limit:"2"}));
  assert.equal(atlas.sameNativeBrain,true);
  assert.equal(atlas.originalPlanner,"Discoverer.shapeGraph");
  assert.equal(atlas.memory.attemptsTotal,4);
  assert.equal(atlas.memory.successesTotal,Number(plan.found));
  assert.equal(atlas.memory.failuresTotal,4-Number(plan.found));
  assert.equal(atlas.total,4);
  assert.equal(atlas.rows.length,2);
  assert.equal(atlas.nextOffset,2);
  const later=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"attempts",offset:"2",limit:"2"}));
  assert.equal(later.rows.length,2);
  assert.equal(later.nextOffset,null);
  assert.equal(new Set([...atlas.rows,...later.rows].map(x=>x.id)).size,4);
  const missing=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"attempts",filter:"failed",limit:"10"}));
  assert.equal(missing.rows.length,atlas.memory.failuresTotal);
  assert.ok(missing.rows.every(x=>!x.found));
  assert.ok(missing.rows.some(x=>
   x.diagnostics.some(d=>d.code==="INFERRED_AXES_DISABLED_BY_DESIGN")));
  const diagnostics=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"diagnostics",limit:"50"}));
  assert.ok(diagnostics.rows.some(x=>x.kind==="design-gate"));
  const selected=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"attempts",offset:"0",limit:"1",
    attemptId:String(missing.rows[0].id)}));
  assert.equal(selected.selectedAttempt.id,missing.rows[0].id);
  assert.equal(selected.selectedAttempt.found,false);
  const fullEdges=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"edges",limit:"50"}));
  assert.equal(fullEdges.memory.physicallyTraversableNow,0);
  assert.ok(fullEdges.rows.every(x=>!x.traversableNow));
  const atlasNodes=await call(app.base+"/native-atlas?"+
   new URLSearchParams({view:"nodes",limit:"50"}));
  assert.equal(atlasNodes.memory.physicalNodes,0);
  const onWorker=await call(app.base+"/api/status");
  assert.equal(onWorker.status.atlasTotals.attemptsTotal,4);
  assert.equal(onWorker.status.atlasTotals.failuresTotal,4-Number(plan.found));
  // Explicit native checkpoint SAVE after planning, before reading from
  // disk. A checkpoint written at corpus completion alone could not prove
  // that later route failures are persisted.
  await call(app.base+"/control?do=save","POST");

  const html=await(await fetch(app.base+"/")).text();
  assert.match(html,/id="cumulativeMaze"/);
  for(const item of ["allPathsAtlas","atlasView","atlasFilter",
    "atlasRows","atlasComparison","atlasMissing","atlasSelected",
    "atlasExport","atlasPrev","atlasNext","atlasLoad"])
   assert.match(html,new RegExp('id="'+item+'"'),
    "Original live UI is missing real atlas control "+item);
  assert.match(html,/id="cumVerified"/);
  assert.match(html,/id="cumMode"/);
  assert.match(html,/value="question"/);
  assert.match(html,/id="qaExact"/);
  assert.match(html,/id="realBar"/);
  assert.match(html,/id="start"/);
  assert.match(html,/id="pause"/);
  assert.match(html,/id="save"/);
  const js=await(await fetch(app.base+
   "/transcend/torus-aether/ui/native-hypermaze.js")).text();
  assert.match(js,/native-cumulative-numeric/);
  assert.match(js,/native-cumulative-question/);
  assert.match(js,/crossMazeMemory/);
  assert.match(js,/ctx\.setLineDash/);
  assert.match(js,/native-atlas/);
  assert.match(js,/atlasShowAttempt/);
  assert.match(js,/atlasDrawHistoricTrace/);
  assert.match(js,/atlasExport/);
  assert.match(js,/atlasMissing/);
  const progress=JSON.parse(fs.readFileSync(path.join(out,
   "native-hypermaze-progress.json"),"utf8"));
  const brain=Brain.load(path.join(out,progress.checkpoint));
  assert.ok(brain.hypermazeCumulativeExperience);
  assert.equal(brain.hypermazeCumulativeExperience.edges.size,0);
  assert.equal(brain.hypermazeCumulativeExperience.atlas.attemptsTotal,4);
  assert.equal(brain.hypermazeCumulativeExperience.atlas.failuresTotal,
   4-Number(plan.found));
  assert.equal(brain.hypermazeCumulativeExperience.atlas.events.length,4);
  assert.ok(brain.observedTransformations.operators.size>0);
  console.log("V30_NATIVE_REAL_CORPUS_HTTP",JSON.stringify({
   actualSourceRows:m.rowsRead,originalLearnedOperators:m.learnedOperators,
   physicallyConfirmedWorldEffects:m.crossMazeMemory.physicallyVerifiedEdges,
   crossEpisodeInferredRoute:plan.found,
   fullGoldAnswerNeverPassed:true,
   trueOriginalDiscovererUsed:plan.originalPlanner,
   numericWithoutWitnessesCorrectlyAbstains:true,
   liveUIOriginalControlsPresent:true,
   originalBrainCheckpointSaved:true,
   originalBrainAtlasAttempts:atlas.memory.attemptsTotal,
   originalBrainAtlasFailed:atlas.memory.failuresTotal,
   allRetainedAttemptPagesVerified:true,
   exactFailedReasonDiagnosticsVerified:true,
   actualBrowserAtlasControlsPresent:true,
   sourceType:"controlled on-disk human/GPT JSONL, not the private full OpenThoughts dataset",
   generalSemanticUnderstandingProven:false
  }));
 }finally{
  if(app)await app.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
