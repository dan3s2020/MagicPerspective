import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import v8 from "node:v8";
import {LivePredictiveStateGate,describePair,partitionOf}
 from "../research/text-hypermaze/live-predictive-state-gate.mjs";
import {LiveObservedMathAxes} from "../research/text-hypermaze/live-observed-axes.mjs";

const product=(x,y)=>[x+" * "+y+" = "+(x*y),(x+1)+" * "+y+" = "+((x+1)*y)];
const addition=(x,y)=>[x+" + "+y+" = "+(x+y),(x+1)+" + "+y+" = "+((x+1)+y)];
function collect(make,split,ymin,ymax,target){
 const list=[];
 for(let y=ymin;y<=ymax;y++)for(let x=2;x<=19;x++){
  const [before,after]=make(x,y),d=describePair(before,after);
  assert.ok(d,"Expected genuine structured paired expression");
  if(partitionOf(before,d.key)===split)list.push({before,after,y,x});
 }
 if(list.length<target)throw Error("Insufficient independently partitioned fixtures: "+split+" "+list.length);
 return list.slice(0,target);
}
function curriculum(make){
 // Training only sees early contexts (3..14); test is 35..85 and 100% unseen.
 return {
  train:collect(make,"train",3,14,35),
  validation:collect(make,"validation",16,34,16),
  test:collect(make,"test",35,85,35)
 };
}
function feed(gate,rows){return rows.map(r=>gate.observePair(r.before,r.after,"same-observed-row"));}
test("the learner refuses to claim anything from unsupported natural-language text",()=>{
 const monitor=new LivePredictiveStateGate();
 assert.equal(monitor.observePair("the maze moves","the maze rotates").usable,false);
 assert.equal(monitor.observePair("2 * 3 = 6","2 * 3 = 7").usable,false);
 assert.equal(monitor.report().testScored,0);
 assert.equal(monitor.report().selectedContextAxes,0);
});
test("action partition never depends on the correct next-state NUMBER, and duplicates never leak across datasets",()=>{
 const a=describePair(...product(3,5)),b=describePair("3 * 5 = 15","4 * 5 = 999");
 assert.equal(a.key,b.key);
 assert.equal(partitionOf(a.inputState,a.key),partitionOf(b.inputState,b.key));
 const examples=curriculum(product);
 const kinds=new Set(examples.train.map(x=>x.before));
 assert.ok(examples.validation.every(x=>!kinds.has(x.before)));
 const testInputs=new Set(examples.test.map(x=>x.before));
 assert.ok(examples.validation.every(x=>!testInputs.has(x.before)));
});
test("only real earlier observations produce context axes: frozen 35 novel high-context multiplication changes on heldout inputs",()=>{
 const data=curriculum(product),monitor=new LivePredictiveStateGate();
 const training=feed(monitor,data.train);
 assert.ok(training.every(x=>x.split==="train"));
 assert.equal(monitor.report().testScored,0);
 feed(monitor,data.validation);
 const before=monitor.report();
 assert.ok(before.validationScored>=10,JSON.stringify(before));
 assert.equal(before.selectedContextAxes,1,JSON.stringify(before));
 const test=feed(monitor,data.test);
 assert.ok(test.every(x=>x.split==="test"));
 assert.equal(monitor.report().training,data.train.length,"heldout rows never train");
 const report=monitor.report();
 assert.equal(report.testScored,35);
 assert.equal(report.groups.length,1);
 assert.ok(report.prequentialTestBaselineMAE>20,JSON.stringify(report));
 assert.ok(report.prequentialTestContextMAE<1e-8,JSON.stringify(report));
 assert.ok(report.prequentialTestSelectedMAE<1e-8,JSON.stringify(report));
 assert.ok(report.last.scorable);
 assert.equal(report.last.trainBefore,data.train.length);
 assert.equal(report.last.predictedContextual,report.last.delta);
 console.log("LIVE_PREQUENTIAL_CONTEXT_AXIS_MULTIPLICATION",JSON.stringify({
  training:report.training,validation:report.validationScored,
  test:report.testScored,selectedAxes:report.selectedContextAxes,
  baselineMAE:report.prequentialTestBaselineMAE,
  contextualMAE:report.prequentialTestContextMAE,
  selectedMAE:report.prequentialTestSelectedMAE,
  example:report.last}));
});
test("learner DOES NOT add a context dimension when fixed movement is sufficient for observed addition",()=>{
 const data=curriculum(addition),monitor=new LivePredictiveStateGate();
 feed(monitor,data.train);feed(monitor,data.validation);feed(monitor,data.test);
 const report=monitor.report();
 assert.equal(report.testScored,35);
 assert.equal(report.selectedContextAxes,0);
 assert.equal(report.prequentialTestBaselineMAE,0);
 assert.equal(report.prequentialTestContextMAE,0);
 assert.equal(report.prequentialTestSelectedMAE,0);
 console.log("LIVE_NO_UNNECESSARY_CONTEXT_DIMENSION",JSON.stringify({
  train:report.training,test:report.testScored,selected:report.selectedContextAxes,
  testMAE:report.prequentialTestSelectedMAE}));
});
test("LIVE observed-math reader receives real text pairs in exact chronological order, reports gate on ORIGINAL graph schema",()=>{
 const data=curriculum(product),learner=new LiveObservedMathAxes();
 for(const row of [...data.train,...data.validation,...data.test]){
  learner.consume(row.before+"\n"+row.after);
 }
 const report=learner.report();
 assert.equal(report.rows,86);
 assert.equal(report.candidatePairs,86);
 assert.ok(report.coupledPairs>0);
 assert.ok(report.stateDependentPairs>0);
 assert.equal(report.predictiveState.training,35);
 assert.equal(report.predictiveState.testScored,35);
 assert.equal(report.predictiveState.selectedContextAxes,1);
 assert.ok(report.predictiveState.prequentialTestSelectedMAE<1e-8);
});
test("new live sidecar persists prediction state; old v1 checkpoints still restore without losing original math evidence",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-real-state-"));
 const file=path.join(tmp,"original-brain.v8.observed-math-axes.v8");
 try{
  const x=new LiveObservedMathAxes({saveFile:file}),sets=curriculum(product);
  for(const row of [...sets.train,...sets.validation,...sets.test])x.consume(row.before+"\n"+row.after);
  const wanted=x.report(),size=x.save();
  assert.ok(size>1000);
  const y=LiveObservedMathAxes.restore(file);
  assert.deepEqual(y.report(),wanted);
  // Simulate an ORIGINAL V17 sidecar from the preceding branch.
  const original=v8.deserialize(fs.readFileSync(file));original.v=1;delete original.predictiveState;
  fs.writeFileSync(file,v8.serialize(original));
  const migrated=LiveObservedMathAxes.restore(file);
  assert.equal(migrated.report().coupledPairs,wanted.coupledPairs);
  assert.equal(migrated.report().stateDependentPairs,wanted.stateDependentPairs);
  assert.equal(migrated.report().predictiveState.training,0);
  assert.equal(migrated.report().predictiveState.testScored,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});

test("the REAL learned mathematical path exposes a second independent pre-action prediction from its validated contextual axis",()=>{
 const data=curriculum(product),x=new LiveObservedMathAxes();
 // The native conditional field cannot identify WHICH numeric coordinate
 // is dependent if all observations modify only input X and output Z.
 // Give actual independently observed training pairs along input Y as well.
 // These are witnessed transitions, never the unseen test starting state.
 for(let y=3;y<=10;y++){
  const before="2 * "+y+" = "+(2*y);
  const after="2 * "+(y+1)+" = "+(2*(y+1));
  x.consume(before+"\n"+after);
 }
 for(const row of [...data.train,...data.validation,...data.test])
  x.consume(row.before+"\n"+row.after);
 const before=x.report(),originalStart="15 * 91 = 1365";
 const outcome=x.plan(originalStart,[{index:0,value:16}]);
 assert.ok(outcome.found,JSON.stringify(outcome));
 assert.equal(outcome.field,"state-dependent");
 assert.equal(outcome.referenceAnswerProvided,false);
 assert.equal(outcome.preActionEffect.available,true,JSON.stringify(outcome.preActionEffect));
 assert.equal(outcome.preActionEffect.selectedAxis,"context-axis");
 assert.equal(outcome.preActionEffect.predictedDependent,1456);
 assert.equal(outcome.preActionEffect.referenceAnswerProvided,false);
 assert.equal(outcome.plan.states[0],originalStart);
 assert.equal(outcome.plan.states[1],"16 * 91 = 1456");
 const after=x.report();
 assert.equal(after.predictiveState.testScored,before.predictiveState.testScored,
  "A real frozen path MUST NEVER update the held-out scoring record");
 assert.equal(after.predictiveState.training,before.predictiveState.training);
 console.log("LIVE_FIRST_ACTION_PERSPECTIVE_ALIGNMENT",JSON.stringify({
  nativeInitial:outcome.plan.states[0],nativeFirst:outcome.plan.states[1],
  independentPredictedNumericEffect:outcome.preActionEffect.predictedChange,
  independentNumericNext:outcome.preActionEffect.predictedDependent,
  selectedContext:outcome.preActionEffect.selectedAxis,
  answerProvidedInGoal:false,frozen:true}));
});
