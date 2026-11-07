import test from "node:test";
import assert from "node:assert/strict";
import {NativeMathGoalField} from "../research/goal-path-field/native-math-graph.mjs";

const pairs=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];
function learner(){
 const f=new NativeMathGoalField({maxNodes:600,maxSteps:28});
 for(const [a,b]of pairs)assert.equal(f.observePair(a,b).learned,true);
 return f;
}
test("externally reported physical wall changes learned context and original Discoverer replans without fake success",()=>{
 const f=learner(),doc="2 * 3 = 6. An independently retained tail.",goal=[
  {index:0,value:4},{index:2,value:5}];
 const p=f.formSolution(doc,goal,{seed:71});
 assert.equal(p.found,true);
 const first=p.path[0],predicted=f.documentForHop(p,first);
 assert.notEqual(predicted,doc);
 // The independent world explicitly rejects this chosen action. The learned
 // planner may NOT turn its own prediction into an observed success.
 const r=f.recordActionOutcome({beforeDocument:doc,afterDocument:doc,
   expectedDocument:predicted,accepted:false,action:first.action});
 assert.equal(r.accurate,false);
 assert.equal(r.blockedThisContext,true);
 assert.equal(f.failedExecutions,1);
 assert.equal(f.observedExecutions,1);
 assert.equal(f.observedPairs,p.learnedObservedPairs);
 const repeated=f.formSolution(doc,goal,{seed:71});
 assert.equal(repeated.found,true,
   "A rejected local route should not destroy all other independent axes");
 assert.notEqual(repeated.path[0].action,first.action,
   "Must not repeat an already observed wall in the same state");
 assert.equal(repeated.method,"Discoverer.shape");
 // The same original Brain checkpoint restores the genuine resistance.
 const saved=f.export(),restored=NativeMathGoalField.restore(saved);
 assert.deepEqual(restored.report(),f.report());
 const q=restored.formSolution(doc,goal,{seed:71});
 assert.deepEqual(q.path,repeated.path);
 assert.equal(q.path[0].action,repeated.path[0].action);
 console.log("V24_REAL_PHYSICAL_WALL_AND_REPLAN",JSON.stringify({
  rejectedAction:first.action,newFirst:q.path[0].action,
  originalMethod:q.method,reportedPhysicalOutcomes:restored.observedExecutions,
  preservedRejectedContexts:restored.blockedContexts.size,
  falsifiedFirstPrediction:true
 }));
});
test("external accepted correct effect is learned, but out-of-template disturbance is recorded as failure",()=>{
 const f=learner(),doc="2 * 3 = 6. The tail stays.",goal=[
  {index:0,value:3},{index:2,value:3}];
 const p=f.formSolution(doc,goal);
 assert.equal(p.found,true);
 const hop=p.path[0],predicted=f.documentForHop(p,hop),before=f.observedPairs;
 const ok=f.recordActionOutcome({beforeDocument:doc,afterDocument:predicted,
   expectedDocument:predicted,accepted:true,action:hop.action});
 assert.equal(ok.accurate,true);
 assert.equal(f.observedPairs,before+1);
 const disrupted=f.recordActionOutcome({beforeDocument:doc,
   afterDocument:"THE WORLD CHANGED ITS GRAMMAR",expectedDocument:predicted,
   accepted:true,action:hop.action});
 assert.equal(disrupted.accurate,false);
 assert.equal(disrupted.unexpectedWorldTemplate,true);
 assert.equal(disrupted.blockedThisContext,true);
 assert.equal(f.observedPairs,before+1);
 assert.equal(f.failedExecutions,1);
});
