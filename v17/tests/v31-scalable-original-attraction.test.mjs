// V31: test actual original learned action model + exact original goal field
// against a sparse propagation implementation at >100k states.
// Both the exact reference and the sparse algorithm use ONLY learned
// Discoverer conductance / attraction and observed transition laws.
// The hidden world evaluator is never consulted while planning.
import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {LearnedAxisNavigator,ACTIONS,k,rng,shuffle,uniquePermutations} from "../research/learned-axes/axis-navigator.mjs";
import {mkWorld} from "../research/learned-axes/hidden-world.mjs";
import {originalAttractionSparse} from "../research/text-hypermaze/scalable-original-attraction.mjs";

function nativeBrain(seed=11){
 const brain=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed});
 for(let i=0;i<145;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(w,brain.disc);
  if(i>=25&&brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
 }
 assert.ok(brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5);
 return brain;
}
function trainedModel(seed=47,D=256){
 const world=mkWorld({D,seed,noise:.19}),r=rng(seed*31+2591),all=shuffle(uniquePermutations(),r);
 const train=all.slice(0,460),heldout=all.slice(460),events=[];
 for(const action of ACTIONS)for(let i=0;i<230;i++){
  const s=train[Math.floor(r()*train.length)],before=world.create(s,r);
  events.push({before,action,after:world.transition(before,action,r)});
 }
 const model=new LearnedAxisNavigator({D}).learn(events);
 assert.equal(model.axes.length,6);
 assert.deepEqual(model.axes,world.slots);
 const states=uniquePermutations(),indices=new Map(states.map((s,i)=>[k(s),i]));
 const transitions=states.map(s=>ACTIONS.map(action=>({
  action,to:indices.get(k(model.move(s,action)))
 })));
 assert.ok(transitions.every(xs=>xs.every(x=>x.to!==undefined)));
 return {world,r,model,states,indices,transitions,heldout,events};
}
function kindsFor(N,start,goal) {
 const kinds=Array(N).fill(KIND.floor);
 kinds[start]=KIND.self;kinds[goal]=KIND.target;
 return kinds;
}
const shared={};
function model(){return shared.model??=trainedModel();}
function brain(){return shared.brain??=nativeBrain();}
function actions(path){return path?.map(x=>x.action)??null;}
test("Sparse attraction is IDENTICAL in full pre-action path to native original shapeGraph across 240 seeded unseen start/goal permutations",()=>{
 const T=model(),disc=brain().disc,r=rng(11342),N=T.states.length;
 let compared=0,allShortest=0,maxPotentialError=0,exactPath=0,fastMs=0,originalMs=0;
 const examples=[];
 for(let q=0;q<240;q++){
  const s=T.heldout[Math.floor(r()*T.heldout.length)],
    g=T.heldout[Math.floor(r()*T.heldout.length)];
  if(k(s)===k(g)){q--;continue;}
  const start=T.indices.get(k(s)),goal=T.indices.get(k(g)),kinds=kindsFor(N,start,goal);
  let startT=performance.now();
  const original=disc.shapeGraph(kinds,T.transitions,start,{details:true});
  originalMs+=performance.now()-startT;startT=performance.now();
  const sparse=originalAttractionSparse(disc,kinds,T.transitions,start);
  fastMs+=performance.now()-startT;
  assert.ok(original?.targetReached&&sparse?.targetReached);
  assert.deepEqual(actions(sparse.path),actions(original.path));
  for(let i=0;i<N;i++)maxPotentialError=Math.max(maxPotentialError,
    Math.abs(sparse.values[i]-original.values[i]));
  let p=start;
  for(const step of sparse.path){
   assert.equal(step.from,p);
   const actual=T.indices.get(k(T.model.move(T.states[p],step.action)));
   assert.equal(actual,step.to);
   p=actual;
  }
  assert.equal(p,goal);
  const optimal=T.model.route(s,g)?.length;
  allShortest+=+(optimal===sparse.path.length);
  exactPath++;compared++;
  if(q<4)examples.push({start:s,goal:g,actions:actions(sparse.path),length:sparse.path.length});
 }
 assert.equal(compared,240);
 assert.equal(allShortest,240);
 assert.ok(maxPotentialError<1e-9,"Sparse propagation must match original native potential");
 console.log("V31_NATIVE_ORIGINAL_SPARSE_PARITY",JSON.stringify({
  cases:compared,exactActionPathParity:exactPath,
  optimalAgainstLearnedModel:allShortest,
  maximumPotentialAbsoluteError:maxPotentialError,
  originalMilliseconds:originalMs,sparseMilliseconds:fastMs,
  originalMazeTrainingEpisodes:disc.episodes,
  originalGoalAttraction:disc.attract(KIND.target),
  originalFloorConductance:disc.conduct(KIND.floor),
  examples
 }));
});
test("Rejected invalid/poisoned edges and missing original goals are not silently ignored by sparse motor",()=>{
 const disc=brain().disc;
 assert.throws(()=>originalAttractionSparse(disc,[0,2],[[],[{to:2}]],0),/Invalid learned graph edge/);
 assert.throws(()=>originalAttractionSparse(disc,[0,2],[[],[{}]],0),/Invalid learned graph edge/);
 assert.throws(()=>originalAttractionSparse(disc,[0,2],[[1],[]],0,{maxEdges:0}),/budget/);
 assert.equal(originalAttractionSparse(disc,[3,0],[[],[]],0),null);
});
test("FULL 104,400-state directed hypermaze from observed transition motors, complete original attraction field, independent physical validation",{
 timeout:220000
},()=>{
 const started=performance.now(),T=model(),disc=brain().disc,coreCount=T.states.length,depth=145,
  N=coreCount*depth;
 assert.equal(N,104400);
 const edges=new Array(N),kinds=Array(N).fill(KIND.floor);
 for(let layer=0;layer<depth;layer++)for(let c=0;c<coreCount;c++){
  const id=layer*coreCount+c;
  edges[id]=T.transitions[c].map(x=>({to:layer*coreCount+x.to,action:x.action}));
  if(layer+1<depth)edges[id].push({to:(layer+1)*coreCount+c,action:"advance"});
 }
 const seed=rng(73737),checks=[];
 for(let i=0;i<4;i++){
  const a=T.heldout[Math.floor(seed()*T.heldout.length)],
    b=T.heldout[Math.floor(seed()*T.heldout.length)];
  if(k(a)===k(b)){i--;continue;}
  const start=T.indices.get(k(a)),goal=(depth-1)*coreCount+T.indices.get(k(b));
  kinds[start]=KIND.self;kinds[goal]=KIND.target;
  const t0=performance.now(),shape=originalAttractionSparse(disc,kinds,edges,start,{details:false,maxActions:depth+40}),
   ms=performance.now()-t0;
  assert.ok(shape&&shape.length>=depth-1);
  let p=start,context=0,observed=T.world.create(a,rng(1000+i));
  for(const action of shape){
   const edge=edges[p].find(e=>e.action===action);
   assert.ok(edge,"Every step must originate from actually learned action motor");
   if(action==="advance")context++;
   else observed=T.world.transition(observed,action,()=>.999999);
   p=edge.to;
   assert.equal(p%coreCount,T.indices.get(k(T.model.read(observed))),
    "Real execution diverged from original predicted action path");
  }
  assert.equal(p,goal);
  assert.equal(context,depth-1);
  const expected=depth-1+T.model.route(a,b).length;
  assert.equal(shape.length,expected,"Must navigate shortest path across 100k+ observed topology states");
  checks.push({test:i,actions:shape.length,contextSteps:context,
   independentEvaluatorReachedGoal:p===goal,searchMilliseconds:ms});
  kinds[start]=KIND.floor;kinds[goal]=KIND.floor;
 }
 const used=process.memoryUsage();
 console.log("V31_ORIGINAL_ATTRACTION_SCALES_104400_STATES",JSON.stringify({
  states:N,forwardObservedEdges:edges.reduce((a,b)=>a+b.length,0),
  learnedPhysicalActions:ACTIONS.length,independentUnseenWorlds:checks.length,
  exactFirstPlanBeforeActions:checks.length,physicalSuccess:checks.length,
  shortest:checks.length,checks,heapMB:used.heapUsed/1048576,
  elapsedMilliseconds:performance.now()-started,
  limitations:"The additional 144 context advances are supplied in a controlled temporal-layer environment. Their graph is structurally generated from observed operator motors; NOT real free-form long-text semantic understanding."
 }));
});
