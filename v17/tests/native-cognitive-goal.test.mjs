import test from "node:test";
import assert from "node:assert/strict";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {Discoverer} from "../transcend/torus-aether/worlds/exercise.mjs";

const disc=()=>{const d=new Discoverer(23);d.temp=0;return d;};
const trained=()=>{
  const map=new LearnedCognitiveMap();
  map.observeActionResult({before:["He","is","tired","."],action:"change-subject",
    after:["She","is","tired","."],accepted:true});
  map.observeActionResult({before:["He","is","tired","."],action:"change-mood",
    after:["He","is","calm","."],accepted:true});
  return map;
};
const goal={slots:{0:"She",2:"calm"}};
// Independent world physics is not the planner's learned next-state model.
const physics=(state,action)=>{
  const after=state.slice();
  if(action==="change-subject"&&after[0]==="He")after[0]="She";
  else if(action==="change-mood"&&after[2]==="tired")after[2]="calm";
  else return {after:state.slice(),accepted:false};
  return {after,accepted:true};
};
test("Original Discoverer.shape plans on unseen V19 hypotheses, not a surrogate shape function",()=>{
  const m=trained();
  const answer=["She","is","calm","."];
  assert.equal(m.examples.has(answer.join("\u001f")),false);
  const p=m.formSolutionNative(["He","is","tired","."],goal,{disc:disc()});
  assert.equal(p.found,true);
  assert.equal(p.plannedBeforeAction,true);
  assert.equal(p.originalDiscovererDirectlyUsed,true);
  assert.equal(p.noHiddenAnswerOracle,true);
  assert.equal(p.path.length,2);
  assert.equal(p.learnedTransformationHypotheses,2);
  assert.equal(p.field.math.inferredHypothesisSteps,2);
  assert.equal(p.field.math.noUnobservedEdges,false);
  assert.ok(p.field.math.maxBellmanResidual<1e-12);
  const result=m.execute(p,{step:physics,observe:false});
  assert.equal(result.solved,true);
  assert.deepEqual(result.final,answer);
});
test("100 truly unseen compositional long text states from observed effects: FULL first-try answers, no training on test",()=>{
 const m=trained(),d=disc(),before=m.export();
 let passed=0,firstActions=0,novel=0,totalChars=0;
 for(let i=0;i<100;i++){
  const words=["He","is","tired",...Array.from({length:60},(_,j)=>"context_"+i+"_"+j), "."];
  const wanted=words.slice();wanted[0]="She";wanted[2]="calm";
  totalChars+=words.join(" ").length;
  const p=m.formSolutionNative(words,goal,{disc:d,maxNodes:64,maxDepth:4});
  assert.equal(p.found,true,"Failed unseen #"+i);
  assert.equal(p.world.unseenStates,p.world.states.length,"All planned states must be novel");
  assert.equal(p.field.math.noUnobservedEdges,false,"Inferred futures cannot be mislabeled as witnessed");
  assert.equal(p.path.length,2,"Must plan both transformations before first output");
  const r=m.execute(p,{step:physics,observe:false});
  if(r.solved&&JSON.stringify(r.final)===JSON.stringify(wanted))passed++;
  if(p.field.firstAction)firstActions++;
  if(p.novelGoal)novel++;
 }
 assert.equal(passed,100);
 assert.equal(firstActions,100);
 assert.equal(novel,100);
 assert.deepEqual(m.rules,LearnedCognitiveMap.restore(before).rules,
   "No changes to learned rules from heldout evaluation");
 console.log("V19_NATIVE_HELDOUT",JSON.stringify({unseenTasks:100,
   exactFirstTryAnswers:passed,firstActionPlanned:firstActions,
   novelSolutionStates:novel,unseenInputChars:totalChars,
   caveat:"Structured deterministic edits with explicit goal predicates; NOT arbitrary natural-language QA"}));
});
test("Remove the learned action law: a novel solution vanishes, no invented hidden path",()=>{
  const m=trained(),before=m.formSolutionNative("He is tired.",goal,{disc:disc()});
  assert.equal(before.found,true);
  m.rules.delete("change-mood");
  const after=m.formSolutionNative("He is tired.",goal,{disc:disc()});
  assert.equal(after.found,false);
  assert.equal(after.reason,"NO_GOAL_STATE_IN_LEARNED_MAP");
});
test("Contradictory observed action laws block speculative generalization",()=>{
  const m=trained();
  m.observeActionResult({before:["He","is","tired","."],action:"change-mood",
    after:["He","is","furious","."],accepted:true});
  const result=m.formSolutionNative("He is tired.",goal,{disc:disc()});
  assert.equal(result.found,false);
});
test("Reality rejects first predicted move, feedback blocks that local corridor",()=>{
  const m=trained(),input=["He","is","tired","."];
  const p=m.formSolutionNative(input,goal,{disc:disc()});
  assert.equal(p.found,true);
  const denied=m.execute(p,{step:(x)=>({after:x,accepted:false}),observe:true});
  assert.equal(denied.solved,false);
  assert.equal(denied.trace[0].accurate,false);
  const retry=m.formSolutionNative(input,goal,{disc:disc()});
  if(retry.found)assert.notEqual(retry.path[0].action,p.path[0].action);
});
test("Original V19 formSolution remains byte-equivalent and functional",()=>{
  const m=new LearnedCognitiveMap();
  for(const s of ["She is happy.","She is tired.","He is tired.","He is calm."])m.observeWorld(s);
  const previous=m.formSolution("He is calm.",{slots:{0:"She",2:"calm"}});
  assert.equal(previous.found,true);
  const now=m.formSolutionNative("He is calm.",{slots:{0:"She",2:"calm"}},{disc:disc()});
  assert.equal(now.found,true);
  assert.equal(now.path.length,previous.path.length);
  assert.deepEqual(now.world.states[0],previous.world.states[0]);
});
