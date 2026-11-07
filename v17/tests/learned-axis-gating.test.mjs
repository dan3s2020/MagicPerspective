import test from "node:test";
import assert from "node:assert/strict";
import {ACTIONS,rng,shuffle,uniquePermutations,LearnedAxisNavigator,k,permute} from "../research/learned-axes/axis-navigator.mjs";
import {mkWorld} from "../research/learned-axes/hidden-world.mjs";
import {ConstructedTransitionGraph} from "../transcend/torus-aether/worlds/constructed-paths.mjs";

// A clean controlled test: six causally stable axes are hidden among many noisy
// channels, WITHOUT telling the learner where they are or what actions mean.
// Training states and held-out starting states are disjoint complete permutations.
function setup(D,seed,noise=.18){
 const world=mkWorld({D,seed,noise}),r=rng(seed+4001);
 const all=shuffle(uniquePermutations(),r),train=all.slice(0,460),heldout=all.slice(460);
 const events=[];
 for(const action of ACTIONS)for(let i=0;i<230;i++){
  const core=train[Math.floor(r()*train.length)],before=world.create(core,r);
  events.push({before,action,after:world.transition(before,action,r)});
 }
 const learner=new LearnedAxisNavigator({D}).learn(events);
 return {world,r,train,heldout,events,learner};
}
const heldoutCheck=s=>{
 const {learner,world,heldout,r}=s;let correct=0,total=0;
 for(const core of heldout)for(const action of ACTIONS){
  const before=world.create(core,r),actual=world.transition(before,action,()=>.995);
  correct+=+(k(learner.move(learner.read(before),action))===k(learner.read(actual)));total++;
 }
 return {correct,total,accuracy:correct/total};
};
test("discover SIX unknown functional axes in 64D,256D and 2048D; predict unseen states",()=>{
 for(const D of [64,256,2048]){
  const s=setup(D,47,.18),results=heldoutCheck(s);
  assert.deepEqual(s.learner.axes,s.world.slots,"true axes not supplied to learner");
  assert.equal(s.learner.axes.length,6);
  assert.equal(results.correct,results.total);
  console.log("LATENT_AXIS_RECOVERY",JSON.stringify({D,learnedAxes:s.learner.axes,trainEvents:s.events.length,
    testTransitions:results.total,heldoutAccuracy:results.accuracy}));
 }
});
test("full solution-shape predicted BEFORE acting from learned transformations on unseen symbolic goals",()=>{
 const s=setup(64,67,.2),{learner,heldout,r}=s;
 let paths=0,correct=0,maxDepth=0;
 for(let i=0;i<200;i++){
  const start=heldout[Math.floor(r()*heldout.length)],goal=heldout[Math.floor(r()*heldout.length)];
  const route=learner.route(start,goal);assert.ok(route);
  let current=start;
  for(const step of route){
   assert.equal(k(step.from),k(current));
   current=learner.move(current,step.action);
   assert.equal(k(step.predicted),k(current));
  }
  paths++;correct+=+(k(current)===k(goal));maxDepth=Math.max(maxDepth,route.length);
 }
 assert.equal(correct,paths);
 console.log("SOLUTION_SHAPE_PREDICTED_BEFORE_MOVING",JSON.stringify({unseenGoals:paths,exactDeterministicSolutions:correct,maxDepth}));
});
test("real stochastic experience: replanning after surprises outperforms fixed plan and random actions",()=>{
 const s=setup(64,101,.19),{learner,world,heldout}=s,r=rng(717);
 const results={open:0,replan:0,chance:0,random:0},N=160,horizon=12;
 for(let t=0;t<N;t++){
  const start=heldout[Math.floor(r()*heldout.length)],goal=heldout[Math.floor(r()*heldout.length)];
  const predicted=learner.route(start,goal),distances=learner.distances(goal);
  assert.ok(predicted);
  for(const policy of ["open","replan","chance","random"]){
   const stream=rng(t*787+911);let board=world.create(start,stream),success=false;
   for(let i=0;i<horizon;i++){
    const current=learner.read(board);
    if(k(current)===k(goal)){success=true;break;}
    const action=policy==="open"?predicted[i]?.action??null:
     policy==="random"?ACTIONS[Math.floor(stream()*ACTIONS.length)]:
     learner.decide(current,goal,{chanceAware:policy==="chance",distanceMap:distances});
    if(!action)break;
    board=world.transition(board,action,stream);
   }
   success ||= k(learner.read(board))===k(goal);
   results[policy]+=(success?1:0);
  }
 }
 assert.ok(results.replan>results.open+10);
 assert.ok(results.replan>results.random+60);
 assert.ok(results.chance>results.random+60);
 console.log("LEARNED_STOCHASTIC_NAVIGATION",JSON.stringify({trials:N,horizon,results,
  rates:Object.fromEntries(Object.entries(results).map(([name,hits])=>[name,hits/N]))}));
});
test("ablate learned axes or action mapping: predictive generalization disappears",()=>{
 const s=setup(64,87,.18),{learner,world,heldout,r}=s;
 const fake=Array.from({length:world.D},(_,i)=>i).filter(i=>!world.slots.includes(i)).slice(0,6);
 const shuffled=new Map(ACTIONS.map((a,i)=>[a,learner.transforms.get(ACTIONS[(i+1)%ACTIONS.length])]));
 let correct=0,randomAxes=0,wrongAction=0,total=0;
 for(const core of heldout.slice(0,150))for(const action of ACTIONS){
  const before=world.create(core,r),after=world.transition(before,action,()=>.995),s=learner.read(before);
  correct+=+(k(learner.move(s,action))===k(learner.read(after)));
  wrongAction+=+(k(permute(s,shuffled.get(action)))===k(learner.read(after)));
  randomAxes+=+(k(permute(fake.map(i=>before[i]),learner.transforms.get(action)))===k(fake.map(i=>after[i])));
  total++;
 }
 assert.equal(correct,total);assert.ok(wrongAction/total<.2);assert.ok(randomAxes/total<.03);
 console.log("CAUSAL_ABLATION_CONTROLS",JSON.stringify({testTransitions:total,
   learned:correct/total,permutedAction:wrongAction/total,randomAxes:randomAxes/total}));
});
test("held-out chance axes: learn action-conditioned stochastic residuals, not output temperature",()=>{
 const s=setup(64,119,.2),{learner,world,heldout}=s,r=rng(901),pooled=new Map();
 for(const action of ACTIONS)for(const z of learner.noise.get(action))
  pooled.set(k(z.order),(pooled.get(k(z.order))||0)+z.count);
 const totalCount=[...pooled.values()].reduce((a,b)=>a+b,0);
 let conditional=0,blind=0,uniform=0,N=6000;
 for(let i=0;i<N;i++){
  const core=heldout[Math.floor(r()*heldout.length)],action=ACTIONS[Math.floor(r()*ACTIONS.length)];
  const before=world.create(core,r),actual=world.transition(before,action,r),expected=learner.move(learner.read(before),action);
  const residual=k(learner.read(actual).map(v=>expected.indexOf(v)));
  const p=learner.noise.get(action).find(z=>k(z.order)===residual)?.p||1e-7;
  conditional-=Math.log(p);blind-=Math.log((pooled.get(residual)||1e-7)/totalCount);uniform-=Math.log(1/3);
 }
 assert.ok(conditional<blind-.005*N);assert.ok(blind<uniform-.04*N);
 console.log("STOCHASTIC_AXIS_DISCOVERY",JSON.stringify({testEvents:N,
   conditionalNLL:conditional/N,pooledNLL:blind/N,uniformNLL:uniform/N,
   informationGainNatsPerEvent:(blind-conditional)/N}));
});
test("replication across five independent hidden axis layouts, no copied indices",()=>{
 const results=[];
 for(const seed of [17,31,73,127,211]){
  const s=setup(64,seed,.2),evalResult=heldoutCheck(s);
  assert.deepEqual(s.learner.axes,s.world.slots);
  assert.equal(evalResult.accuracy,1);
  results.push({seed,axes:s.learner.axes,unseen:evalResult.total,accuracy:evalResult.accuracy});
 }
 console.log("INDEPENDENT_AXES_REPLICATION",JSON.stringify(results));
});
test("existing original V17 memorized-state graph cannot copy new-state routes without reusable rules",()=>{
 const s=setup(64,42,.18),{learner,world,events,heldout,r}=s;
 const native=new ConstructedTransitionGraph({maxStates:100000});
 for(const {before,action,after} of events)
  native.observe(k(world.coreOf(before)),action,k(world.coreOf(after)));
 let remembered=0,learned=0,N=0;
 for(const core of heldout)for(const action of ACTIONS){
  const state=world.create(core,r),observed=world.transition(state,action,()=>.995);
  remembered+=+(native.predict(k(core),action)===k(world.coreOf(observed)));
  learned+=+(k(learner.move(learner.read(state),action))===k(learner.read(observed)));
  N++;
 }
 assert.equal(learned,N);
 assert.equal(remembered,0,"No held-out initial states were present in native exact-state observations");
 console.log("REUSABLE_TRANSFORM_VS_EXACT_MEMORY",JSON.stringify({N,originalGraphExactStateAccuracy:remembered/N,
   learnedTransformationAccuracy:learned/N,observationCount:native.observations}));
});
test("the six permutations of 432 form a genuine 2D hexagonal plane in 3D coordinates",()=>{
 const pts=uniquePermutations([2,3,4]),center=[3,3,3];
 assert.equal(pts.length,6);
 assert.ok(pts.every(x=>x.reduce((a,b)=>a+b,0)===9));
 const diff=p=>p.map((v,i)=>v-center[i]),a=diff(pts[0]),b=diff(pts[1]);
 const cross=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 assert.ok(Math.hypot(...cross)>0);
 assert.ok(pts.every(x=>Math.abs(diff(x).reduce((s,v,i)=>s+v*cross[i],0))<1e-10));
 assert.ok(pts.every(x=>pts.some(y=>k(y)===k(x.map(v=>6-v)))));
 console.log("PERMUTATION_HEXAGON",JSON.stringify({points:pts,center,affineDimension:2,
   exampleOpposites:[[4,3,2],[2,3,4]]}));
});

test("observed live trace exposes true predicted solution-shape, stochastic branches and repairs",()=>{
 const s=setup(64,107,.2),{learner,world,heldout}=s;
 let withSurprise=null;
 for(let seed=1;seed<=40;seed++){
  const random=rng(seed*491+11);
  const start=world.create(heldout[seed%heldout.length],random);
  const goal=world.create(heldout[(seed*17+73)%heldout.length],random);
  const prediction=learner.observeExecution((current,action)=>world.transition(current,action,random),
   start,goal,{limit:14,chanceAware:false});
  if(prediction.surprises>0 && prediction.history.length>0){withSurprise=prediction;break;}
 }
 assert.ok(withSurprise,"at least one actual random event must differ from predicted deterministic shape");
 assert.ok(withSurprise.initialShape.length>0);
 assert.ok(withSurprise.solved,"frozen learner must replan toward unseen target");
 assert.ok(withSurprise.history.some(x=>x.surprise));
 assert.ok(withSurprise.history.every(x=>x.probabilityOfObserved>0 && x.possibleWorlds.length>=2));
 console.log("ACTUAL_PREDICTED_VS_OBSERVED_TRACE",JSON.stringify({
  relevantAxes:withSurprise.axes,target:withSurprise.target,initialState:withSurprise.start,
  beforeActionShape:withSurprise.initialShape,solved:withSurprise.solved,
  executedSteps:withSurprise.steps,unexpectedTransformations:withSurprise.surprises,
  firstSteps:withSurprise.history.slice(0,6)
 }));
});

test("boundary of the finding: learned permutations cannot invent new symbols or solve arithmetic by rearrangement",()=>{
 const s=setup(64,83,.18),model=s.learner;
 const start=[0,1,2,3,4,5],invalidGoal=[0,1,2,3,4,6],duplicated=[0,1,2,3,4,4];
 assert.equal(model.route(start,invalidGoal),null);
 assert.equal(model.route(start,duplicated),null);
 for(const action of ACTIONS){
  const next=model.move(start,action);
  assert.deepEqual([...next].sort((a,b)=>a-b),start);
 }
 console.log("PERMUTATION_LIMITATION",JSON.stringify({
  conservedMultiset:true,createsNewSymbols:false,
  cannotSolveUnobservedArithmetic:true,
  interpretation:"Structure discovery works in a reversible symbolic transformation world, not yet general language or algebra"
 }));
});
