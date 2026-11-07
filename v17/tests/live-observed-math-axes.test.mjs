import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {LiveObservedMathAxes} from "../research/text-hypermaze/live-observed-axes.mjs";

const mathEvidence=[
 "2 * 3 = 6\n3 * 3 = 9",
 "2 * 4 = 8\n3 * 4 = 12",
 "3 * 3 = 9\n4 * 3 = 12",
 "3 * 4 = 12\n4 * 4 = 16",
 "2 * 3 = 6\n2 * 4 = 8",
 "3 * 3 = 9\n3 * 4 = 12",
 "4 * 3 = 12\n4 * 4 = 16",
 "2 * 5 = 10\n3 * 5 = 15",
 "3 * 5 = 15\n4 * 5 = 20"
];
test("zero real transitions cannot hallucinate a hyperdimensional mathematics answer",()=>{
 const x=new LiveObservedMathAxes();
 x.consume("Q: What is 7 * 8?\nA: The answer is 56.");
 assert.equal(x.report().candidatePairs,0);
 const p=x.plan("5 * 6 = 30",[{index:0,value:6}]);
 assert.equal(p.found,false);
 assert.equal(p.referenceAnswerProvided,false);
 assert.equal(p.independentSemanticVerifier,false);
});
test("actual observed equation lines yield reusable coupled axes and a nonlinear path for UNSEEN 5*6",()=>{
 const x=new LiveObservedMathAxes();
 for(const p of mathEvidence)x.consume(p);
 const before=x.report();
 assert.ok(before.coupledPairs>=7);
 assert.ok(before.stateDependentPairs>=7);
 assert.ok(before.axes.transformationRank>=2);
 const answer=x.plan("5 * 6 = 30",[{index:0,value:6},{index:2,value:7}]);
 assert.equal(answer.found,true,JSON.stringify(answer));
 assert.equal(answer.plan.predicted,"6 * 7 = 42");
 assert.deepEqual(answer.plan.states[0],"5 * 6 = 30");
 assert.equal(answer.referenceAnswerProvided,false);
 assert.equal(answer.frozen,true);
 assert.equal(answer.actualWorldExecution,false);
 assert.equal(x.report().candidatePairs,before.candidatePairs,
  "Frozen goal-conditioned search must not learn from a secret answer");
 console.log("REAL_OBSERVED_MATH_AXES",JSON.stringify({
  observedPairs:before.coupledPairs,
  nonlinearPairs:before.stateDependentPairs,
  inferredRank:before.axes.transformationRank,
  nonlinearField:answer.field,path:answer.plan.states,
  predicted:answer.plan.predicted,correctness:"independent numeric equality check applies only to this task"
 }));
 assert.equal(6*7,42);
});
test("on-disk observed math axes sidecar survives repeated process load/save, original Brain untouched",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-math-axes-"));
 const file=path.join(tmp,"brain-0-stable+many.v8.observed-math-axes.v8");
 try{
  const x=new LiveObservedMathAxes({saveFile:file});
  for(const evidence of mathEvidence)x.consume(evidence);
  const before=x.report(),size=x.save();
  assert.ok(size>500);
  const loaded=LiveObservedMathAxes.restore(file);
  assert.deepEqual(loaded.report(),before);
  const result=loaded.plan("5 * 6 = 30",[{index:0,value:6},{index:2,value:7}]);
  assert.equal(result.found,true);
  assert.equal(result.plan.predicted,"6 * 7 = 42");
  const again=loaded.save();assert.ok(again>500);
  assert.deepEqual(LiveObservedMathAxes.restore(file).report(),before);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test("not every pair of adjacent corpus paragraphs is interpreted as a causal transform",()=>{
 const x=new LiveObservedMathAxes();
 x.consume("An organism sees a maze.\nAnother symbol appears.\n2048 is an interesting game.");
 x.consume("2 * 3 = 6 and an explanation with no observed second equation.");
 assert.equal(x.report().candidatePairs,0);
 assert.equal(x.report().coupledPairs,0);
});
