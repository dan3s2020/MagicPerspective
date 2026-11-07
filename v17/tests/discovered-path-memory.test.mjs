import test from "node:test";
import assert from "node:assert/strict";
import {LearnedPathMemory} from "../research/path-memory/learned-path-memory.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const RNG=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const ACTIONS=["E+","E-","N+","N-"];
const format=a=>"Position "+a.join(" and ")+" steps.";
// Test-only hidden world: the learner NEVER imports or receives these equations.
function hidden({alpha=2,beta=5,noise=3}={}){
 const execute=(state,action,random=()=>.5)=>{
  const o=state.slice(),[x,y]=state;
  if(action==="E+"){o[0]++;o[2]+=1+alpha*y;}
  else if(action==="E-"){o[0]--;o[2]-=1+alpha*y;}
  else if(action==="N+"){o[1]++;o[2]+=4+beta*x;}
  else if(action==="N-"){o[1]--;o[2]-=4+beta*x;}
  else throw Error("Unknown action");
  for(let j=3;j<state.length;j++)o[j]=Math.floor(random()*13);
  return o;
 };
 const initial=(r,D)=>Array.from({length:D},(_,i)=>i===0||i===1?Math.floor(r()*24+8):
   i===2?Math.floor(r()*30+100):Math.floor(r()*13));
 return {execute,initial};
}
function train(seed=17,{D=12,alpha=2,beta=5,n=200}={}){
 const env=hidden({alpha,beta}),learner=new LearnedPathMemory({minPerAction:20}),r=RNG(seed);
 for(let t=0;t<n;t++)for(const action of ACTIONS){
  const s=env.initial(r,D),end=env.execute(s,action,r);
  learner.observe(format(s),action,format(end));
 }
 const model=learner.fit();
 return {model,learner,env};
}
test("discover which of 128 coordinates are real action axes and dependent history from 800 factual transitions",()=>{
 const {model,learner,env}=train(17,{D:128});
 assert.deepEqual(model.inputAxes,[0,1]);
 assert.equal(model.dependent,2);
 assert.equal(model.rejectedAxes.length,125);
 assert.equal(model.derivedPathMemoryDimensions,1);
 assert.ok(model.nonCommutingPairs.length>=1);
 assert.ok(model.explainedVariance>.99999);
 for(let k=0;k<300;k++){
  const r=RNG(999+k),start=env.initial(r,128),a=ACTIONS[k%4];
  const predicted=learner.move(start,a),observed=env.execute(start,a,r);
  assert.deepEqual(predicted.slice(0,3),observed.slice(0,3));
 }
 console.log("LEARNED_PATH_MEMORY_AXIS_RECOVERY",JSON.stringify({
  visibleDimensions:128,relevantControls:model.inputAxes,
  discoveredDependentAxis:model.dependent,discardedAxes:model.rejectedAxes.length,
  inferredMemoryDimensions:model.derivedPathMemoryDimensions,
  observedTrainingTransitions:model.samples,explained:model.explainedVariance
 }));
});
test("same endpoint after noncommuting action paths has a distinct learned extra state (NO supplied signed area formula)",()=>{
 const {learner,env}=train(37,{D:12}),start=[50,50,200,...Array(9).fill(0)];
 const a=["E+","N+","E-","N-"],b=["N+","E+","N-","E-"];
 const predictionA=learner.run(start,a),predictionB=learner.run(start,b);
 const actualA=learner.execute(start,a,(s,act)=>env.execute(s,act,RNG(123)));
 const actualB=learner.execute(start,b,(s,act)=>env.execute(s,act,RNG(237)));
 assert.equal(actualA.success,true);assert.equal(actualB.success,true);
 assert.deepEqual(predictionA.final.slice(0,2),predictionB.final.slice(0,2));
 assert.notEqual(predictionA.final[2],predictionB.final[2]);
 assert.equal(predictionA.final[2],actualA.final[2]);
 assert.equal(predictionB.final[2],actualB.final[2]);
 assert.notEqual(predictionA.discoveredMemoryResidual,predictionB.discoveredMemoryResidual);
 console.log("OBSERVED_ORDER_MEMORY_FROM_ACTIONS",JSON.stringify({
  start:start.slice(0,3),firstPath:a,secondPath:b,
  sameVisibleEndpoint:predictionA.final.slice(0,2),
  hiddenFinalA:actualA.final[2],hiddenFinalB:actualB.final[2],
  autoDetectedMemoryAxes:learner.model.derivedPathMemoryDimensions,
  memoryResidualA:predictionA.discoveredMemoryResidual,
  memoryResidualB:predictionB.discoveredMemoryResidual
 }));
});
test("actual predictions for 200 held-out random paths beat endpoint-only and action-shuffled controls",()=>{
 const {learner,env}=train(71,{D:12}),N=200,r=RNG(191);
 let exact=0,endpoint=0,shuffled=0;
 const traces=[];
 for(let i=0;i<N;i++){
  const start=env.initial(r,12),actions=Array.from({length:6+Math.floor(r()*17)},()=>ACTIONS[Math.floor(r()*4)]);
  const out=learner.run(start,actions);
  const actual=learner.execute(start,actions,(s,a)=>env.execute(s,a,r)).final;
  const alternate=learner.run(start,actions.slice().sort());
  exact+=+(Math.abs(out.final[2]-actual[2])<1e-6);
  endpoint+=+(Math.abs(out.baseline[2]-actual[2])<1e-6);
  shuffled+=+(Math.abs(alternate.final[2]-actual[2])<1e-6);
  if(traces.length<3)traces.push({plannedBeforeAction:out.final.slice(0,3),
    actual:actual.slice(0,3),memoryOffset:out.discoveredMemoryResidual,path:actions});
 }
 assert.equal(exact,N);
 assert.ok(endpoint<N*.25,JSON.stringify({endpoint,N}));
 assert.ok(shuffled<N*.25,JSON.stringify({shuffled,N}));
 console.log("HELDOUT_PATH_ORDER_ABLATION",JSON.stringify({N,exact,endpointOnly:endpoint,shuffled,
  allPredictionsBeforeExecution:true,traces}));
});
test("learned goal-conditioned path predicted BEFORE first move works with no dependent answer supplied",()=>{
 const {learner,env}=train(13,{D:24});
 const r=RNG(143);
 let solved=0;
 for(let i=0;i<120;i++){
  const start=env.initial(r,24),goal=[start[0]+(i%6)-2,start[1]+(i%5)-1];
  const plan=learner.plan(start,goal,{maxSteps:16});
  assert.equal(plan.found,true);
  assert.equal(plan.referenceDependentAnswerGiven,false);
  assert.equal(plan.plannedBeforeExecution,true);
  const observed=learner.execute(start,plan.actions,(s,a)=>env.execute(s,a,r));
  assert.equal(observed.success,true);
  assert.deepEqual(observed.final.slice(0,2),goal);
  assert.equal(observed.final[2],plan.final[2]);
  solved++;
 }
 console.log("GOAL_CONDITIONED_REAL_EXECUTION",JSON.stringify({unseenGoals:solved,
  exactFinalOutputs:solved,dependentOutputNotProvided:true}));
});
test("commuting operators return to the minimal predictive dimension without a path-memory offset",()=>{
 const {learner,env,model}=train(45,{D:32,alpha:3,beta:3});
 assert.equal(model.derivedPathMemoryDimensions,0,
  "extra coordinate must NOT be allocated when the learned transformations commute");
 const start=[40,51,900,...Array(29).fill(0)];
 for(const path of [["E+","N+","E-","N-"],["N+","E+","N-","E-"]]){
  const prediction=learner.run(start,path);
  const actual=learner.execute(start,path,(s,a)=>env.execute(s,a)).final;
  assert.equal(prediction.discoveredMemoryResidual,0);
  assert.equal(prediction.final[2],actual[2]);
 }
 console.log("COMMUTATIVE_GATING_REDUCTION",JSON.stringify({learnedMemoryDimensions:model.derivedPathMemoryDimensions,
  inferredFromObservedEffects:true}));
});
test("repeated across five independent hidden fields; no formula or field parameter is passed to learner",()=>{
 const out=[];
 for(const seed of [11,29,47,91,173]){
  const alpha=1+(seed%4),beta=7+(seed%3);
  const {learner,model,env}=train(seed,{D:40,alpha,beta,n:160});
  const r=RNG(seed*100+17);
  let exact=0;
  for(let i=0;i<60;i++){
   const start=env.initial(r,40);
   const path=Array.from({length:9},()=>ACTIONS[Math.floor(r()*4)]);
   const planned=learner.run(start,path).final,real=learner.execute(start,path,(s,a)=>env.execute(s,a,r)).final;
   exact+=+(Math.abs(planned[2]-real[2])<1e-6);
  }
  assert.equal(exact,60);
  assert.equal(model.derivedPathMemoryDimensions,1);
  out.push({seed,heldoutPaths:60,correct:exact,learnedNoncommutingPairs:model.nonCommutingPairs.length});
 }
 console.log("INDEPENDENT_PATH_LAW_REPLICATION",JSON.stringify(out));
});
test("restored native-class checkpoint preserves learned operator coefficients and path state without retraining",()=>{
 const {learner}=train(31,{D:32});
 const start=[20,40,50,...Array(29).fill(0)],path=["E+","N+","E-","N-"];
 const snap=learner.export(),restored=LearnedPathMemory.restore(snap);
 assert.deepEqual(restored.run(start,path),learner.run(start,path));
 assert.deepEqual(restored.model,learner.model);
 assert.equal(snap.samples,800);
 console.log("OBSERVED_LEARNED_PATH_CHECKPOINT",JSON.stringify({samples:snap.samples,
  derivedMemoryDimensions:snap.model.derivedPathMemoryDimensions,readOnlyRestore:true}));
});
test("original MagicPerspective Brain and frozen original text generator are not modified by this opt-in learner",()=>{
 const a=new Brain({rules:"winner",seed:17});
 const before=a.language.seen,beforeNative=a.observedTransformations.operators.size;
 const {learner}=train(73,{D:12});
 assert.equal(learner.model.derivedPathMemoryDimensions,1);
 assert.equal(a.language.seen,before);
 assert.equal(a.observedTransformations.operators.size,beforeNative);
 assert.equal(a.trace.geo.D,5);
 console.log("UNMODIFIED_NATIVE_V17",JSON.stringify({brainObservations:before,nativeOperators:beforeNative,
  geometryDimensions:a.trace.geo.D,independentResearch:true}));
});

test("early checkpoint retains all observations even when the action model has not fitted yet",()=>{
 const learner=new LearnedPathMemory({minPerAction:20});
 learner.observe([10,20,30,5],"E+",[11,20,71,3]);
 learner.observe([12,21,40,2],"N+",[12,22,104,1]);
 const snapshot=learner.export();
 assert.equal(snapshot.samples,2);
 assert.equal(snapshot.model,null);
 const restored=LearnedPathMemory.restore(snapshot);
 assert.equal(restored.model,null);
 assert.equal(restored.examples.length,2);
 assert.deepEqual(restored.examples,learner.examples);
 console.log("EARLY_CHECKPOINT_COMPLETE_LEDGER",JSON.stringify({events:2,trained:false,lossless:true}));
});
