// V31 original potential in log-domain: native 2D parity, explicit historical
// numeric precision regression, then one-million learned-state/hyperpath test.
// NO learned semantics or teacher path is encoded in the planner.
import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {LearnedAxisNavigator,ACTIONS,k,rng,shuffle,uniquePermutations} from "../research/learned-axes/axis-navigator.mjs";
import {mkWorld} from "../research/learned-axes/hidden-world.mjs";
import {originalAttractionSparse} from "../research/text-hypermaze/scalable-original-attraction.mjs";
import {originalAttractionLogDomain} from "../research/text-hypermaze/scalable-log-attraction.mjs";

const cache={};
function learn(){
 if(cache.world)return cache;
 const D=256,world=mkWorld({D,seed:47,noise:.19}),
  r=rng(47*31+2591),all=shuffle(uniquePermutations(),r),
  train=all.slice(0,460),heldout=all.slice(460),events=[];
 for(const action of ACTIONS)for(let t=0;t<230;t++){
  const base=train[Math.floor(r()*train.length)],before=world.create(base,r);
  events.push({action,before,after:world.transition(before,action,r)});
 }
 const model=new LearnedAxisNavigator({D}).learn(events);
 assert.deepEqual(model.axes,world.slots);
 const states=uniquePermutations(),ids=new Map(states.map((s,i)=>[k(s),i]));
 const next=states.map(s=>ACTIONS.map(action=>({
  to:ids.get(k(model.move(s,action))),action
 })));
 const reverse=states.map(()=>[]);
 for(let i=0;i<next.length;i++)for(const e of next[i])
  reverse[e.to].push({to:i,action:e.action});
 Object.assign(cache,{world,model,states,ids,next,reverse,heldout});
 return cache;
}
function original(){
 if(cache.brain)return cache.brain;
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<145;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);playExercise(w,b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5);
 cache.brain=b;return b;
}
test("Log-domain original attraction gives same complete FIRST paths on 100 unseen learned transformation-world goals",()=>{
 const data=learn(),disc=original().disc,r=rng(999),N=data.states.length;
 let paths=0,potentialError=0;
 for(let q=0;q<100;q++){
  const a=data.heldout[Math.floor(r()*data.heldout.length)],
    b=data.heldout[Math.floor(r()*data.heldout.length)];
  if(k(a)===k(b)){q--;continue;}
  const s=data.ids.get(k(a)),t=data.ids.get(k(b));
  const types=Array(N).fill(KIND.floor);types[s]=KIND.self;types[t]=KIND.target;
  const native=disc.shapeGraph(types,data.next,s,{details:true});
  const log=originalAttractionLogDomain(disc,{
   size:N,start:s,kindAt:i=>types[i],
   outgoing:i=>data.next[i],incoming:i=>data.reverse[i]
  });
  assert.ok(native?.targetReached&&log?.targetReached);
  assert.deepEqual(log.path.map(e=>e.action),native.path.map(e=>e.action));
  for(let j=0;j<N;j++){
   const logv=log.valuesLog[j],floatv=Number.isFinite(logv)?Math.exp(logv):0;
   potentialError=Math.max(potentialError,Math.abs(floatv-native.values[j]));
  }
  paths++;
 }
 assert.equal(paths,100);assert.ok(potentialError<1e-10);
 console.log("V31_NATIVE_LOG_POTENTIAL_PARITY",JSON.stringify({
  heldoutPaths:paths,exactOriginalPathActions:paths,
  maxOriginalValueError:potentialError,
  nativeAttraction:disc.attract(KIND.target),
  nativeFloorConductance:disc.conduct(KIND.floor)
 }));
});
test("REPRODUCE real original 1e-12 regression: native field loses a known 1500-hop route, log-domain preserves same graph and learns no extra rules",()=>{
 const disc=original().disc,N=1501;
 const kinds=Array(N).fill(KIND.floor);
 kinds[0]=KIND.self;kinds[N-1]=KIND.target;
 const forward=Array.from({length:N},(_,i)=>i<N-1?[{action:"advance",to:i+1}]:[]);
 const backward=Array.from({length:N},(_,i)=>i>0?[{to:i-1,action:"advance"}]:[]);
 const legacy=disc.shapeGraph(kinds,forward,0,{details:true});
 const normal=originalAttractionSparse(disc,kinds,forward,0);
 assert.equal(legacy?.targetReached===true,true);
 console.log("V31_LEGACY_LONG_CHAIN_RESULT",JSON.stringify({
  size:N,legacyTargetReached:!!legacy?.targetReached,
  sparseNativeTargetReached:!!normal?.targetReached,
  legacyPlanSteps:legacy?.path?.length??0
 }));
 const solution=originalAttractionLogDomain(disc,{
  size:N,start:0,kindAt:i=>kinds[i],
  outgoing:i=>forward[i],incoming:i=>backward[i]
 });
 assert.ok(solution?.targetReached);
 assert.equal(solution.path.length,N-1);
 assert.ok(solution.logValueAtStart<Math.log(1e-12),
  "Target attraction at start must genuinely be below original epsilon");
 assert.deepEqual(solution.path.slice(0,3).map(e=>e.action),["advance","advance","advance"]);
 console.log("V31_LONG_PATH_LOG_NUMERIC_REGRESSION",JSON.stringify({
  observedGraphStates:N,
  physicallyTraversableActions:N-1,
  exactOriginalGoalEquation:true,originalNumericCutoff:1e-12,
  oldMethodReachesGoal:!!legacy?.targetReached,
  logMethodReachesGoal:solution.targetReached,
  firstPotentialLog:solution.logValueAtStart,
  approximateInitialPotential:Math.exp(solution.logValueAtStart)
 }));
});
test("1,008,000 full navigable learned transformation states and 1,399+ action first plan, bounded RAM, real effects replayed",{
 timeout:300000
},()=>{
 const t0=performance.now(),T=learn(),disc=original().disc,
  C=T.states.length,L=1400,N=C*L;
 assert.equal(N,1008000);
 const rng0=rng(55031),a=T.heldout[Math.floor(rng0()*T.heldout.length)],
  b=T.heldout[Math.floor(rng0()*T.heldout.length)],
  coreStart=T.ids.get(k(a)),coreGoal=T.ids.get(k(b)),
  start=coreStart,goal=(L-1)*C+coreGoal;
 const kindAt=i=>i===start?KIND.self:i===goal?KIND.target:KIND.floor;
 const outgoing=i=>{
  const layer=Math.floor(i/C),index=i%C,
   list=T.next[index].map(e=>({to:layer*C+e.to,action:e.action}));
  if(layer<L-1)list.push({to:i+C,action:"advance"});
  return list;
 };
 const incoming=i=>{
  const layer=Math.floor(i/C),index=i%C,
   list=T.reverse[index].map(e=>({to:layer*C+e.to,action:e.action}));
  if(layer>0)list.push({to:i-C,action:"advance"});
  return list;
 };
 // These functions expand the COMPLETE observed motor topology by formula,
 // not just a local neighborhood or a teacher-chosen winning path.
 const planned=originalAttractionLogDomain(disc,{
  size:N,start,kindAt,outgoing,incoming,maxActions:L+30
 });
 assert.ok(planned?.targetReached);
 let state=T.world.create(a,rng(7777)),layer=0,position=start;
 let physical=0,contextMoves=0;
 for(const step of planned.path){
  assert.equal(step.from,position);
  const motor=outgoing(position).find(e=>e.action===step.action&&e.to===step.to);
  assert.ok(motor,"Unobserved forward edge must never execute");
  if(step.action==="advance"){layer++;contextMoves++;}
  else{state=T.world.transition(state,step.action,()=>.999999);physical++;}
  position=step.to;
  assert.equal(position%C,T.ids.get(k(T.model.read(state))),
   "Real frozen execution diverged from original learned transformation");
 }
 assert.equal(position,goal);assert.equal(layer,L-1);
 const optimal=T.model.route(a,b).length+L-1;
 assert.equal(planned.path.length,optimal);
 const memory=process.memoryUsage();
 console.log("V31_MILLION_STATE_ORIGINAL_LOG_ATTRACTION",JSON.stringify({
  completeReachableStates:N,
  generatedLearnedActionTransitions:N*ACTIONS.length,
  generatedDirectedTemporalTransitions:C*(L-1),
  totalDirectedEdges:N*ACTIONS.length+C*(L-1),
  firstFullPlanBeforeAction:true,heldoutStart:a,heldoutGoal:b,
  plannedActions:planned.path.length,independentActualMotorActions:physical,
  temporalAdvances:contextMoves,physicalFinalGoalMatched:true,
  originalLearnedGoalAttraction:disc.attract(KIND.target),
  originalLearnedConductance:disc.conduct(KIND.floor),
  logPotentialAtStart:planned.logValueAtStart,
  heapMegabytes:memory.heapUsed/1048576,
  wallMilliseconds:performance.now()-t0,
  limitations:"The temporal advance is a supplied structural action. Synthetic symbolic permutation physics and a known specified goal, NOT open-domain text semantics. The full topology is indexed/lazy, not materialized in memory."
 }));
});
