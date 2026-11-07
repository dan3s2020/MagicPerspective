// V30: use the existing learned StateDependentTextAxes and EXACT native
// Discoverer.shapeGraph to navigate a path whose first and last x,y are equal
// but whose latent dependent textual z changes because action order matters.
// Research-only, tiny finite numerical grammar, not unconstrained semantic QA.
// True evaluator applies hidden laws only AFTER the original path is frozen.
import test from "node:test";
import assert from "node:assert/strict";
import {StateDependentTextAxes} from "../research/text-hypermaze/state-dependent-axes.mjs";
import {predictFromPath,learnedHolonomy} from "../research/text-hypermaze/path-holonomy.mjs";
import {tokenizeObservation,renderObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {Discoverer,KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";

const show=(x,y,z)=>x+" @ "+y+" ~ "+z;
const nums=t=>tokenizeObservation(t).filter(w=>/^\d+$/u.test(w)).map(Number);
const key=t=>nums(t).join("|");
const accepted=(t,x0,y0,z0)=>{
 const [x,y,z]=nums(renderObservation(t));
 return x>=x0-1&&x<=x0+1&&y>=y0-1&&y<=y0+1&&z>=z0-25&&z<=z0+25;
};
function trainGenuineExistingTextMotor(){
 const field=new StateDependentTextAxes({maxValue:300,maxExpanded:8000});
 // 18 real paired textual before/after observations.
 // The evaluator law is NOT imported by the learner. The learner fits slopes
 // from changed numeric tokens and observed finite differences.
 const observations=[];
 for(const x of [2,3,4])for(const y of [3,4,5]){
  const base=show(x,y,x*y);
  observations.push([base,show(x+1,y,(x+1)*y)]);
  observations.push([base,show(x,y+1,x*y+2*x)]);
 }
 for(const [before,after] of observations){
  assert.equal(field.observePair(before,after).learned,true);
 }
 const unseen=show(5,6,30),law=learnedHolonomy(field,unseen);
 assert.equal(law.ready,true,JSON.stringify(law));
 assert.ok(Math.abs(law.commutator-1)<1e-10,JSON.stringify(law));
 return {field,observations,law};
}
function constructGraphFromLearnedActions(field,start,{depthCap=7}={}){
 const model=field.discover(start);
 assert.equal(model.ready,true);
 const origin=nums(start);
 const nodes=[tokenizeObservation(start)],distance=[0],edges=[[]];
 const index=new Map([[key(start),0]]);
 for(let i=0;i<nodes.length;i++){
  if(distance[i]>=depthCap)continue;
  for(const op of model.operators){
   const next=field.apply(nodes[i],op,model);
   if(!next||!accepted(next,...origin))continue;
   const id=key(renderObservation(next));
   let j=index.get(id);
   if(j===undefined){
    j=nodes.length;index.set(id,j);nodes.push(next);edges.push([]);distance.push(distance[i]+1);
   }
   edges[i].push({to:j,action:{primary:op.primary,step:op.step}});
  }
 }
 return {nodes,edges,index,model};
}
function originalRealMazeDisc(){
 const disc=new Discoverer(11);
 for(let i=0;i<140;i++){
  const world=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);
  playExercise(world,disc);
  if(i>=25&&disc.attract(KIND.target)>.2&&disc.conduct(KIND.floor)>=.5&&disc.self()>=0)break;
 }
 assert.ok(disc.attract(KIND.target)>.2&&disc.conduct(KIND.floor)>=.5);
 return disc;
}
// The independent evaluator is defined only in THIS TEST. Nothing below is
// accessed by StateDependentTextAxes, Discoverer, or constructGraphFromLearnedActions.
function executeHiddenWorld(start,actions){
 let [x,y,z]=nums(start);
 for(const action of actions){
  if(action.primary===0){z+=action.step*y;x+=action.step;}
  else if(action.primary===1){z+=2*action.step*x;y+=action.step;}
  else throw Error("Hidden world has only x,y actions");
 }
 return [x,y,z];
}
test("Native original shape finds nontrivial closed loops in unseen TEXT states by using learned action-order dependent transitions",()=>{
 const {field,law,observations}=trainGenuineExistingTextMotor(),disc=originalRealMazeDisc();
 const results=[],starts=[[5,6],[6,7],[7,8],[8,9]];
 for(const [x,y] of starts){
  const start=show(x,y,x*y),[x0,y0,z0]=nums(start);
  assert.equal(observations.some(([a,b])=>a===start||b===start),false,
   "Unseen origin must NOT occur in training");
  const graph=constructGraphFromLearnedActions(field,start);
  const target=graph.index.get([x,y,z0+1].join("|"));
  assert.ok(target!==undefined,"Closed-loop target should exist through learned transitions");
  const kinds=Array(graph.nodes.length).fill(KIND.floor);
  kinds[0]=KIND.self;kinds[target]=KIND.target;
  const native=disc.shapeGraph(kinds,graph.edges,0,{details:true});
  assert.ok(native?.targetReached,"Original native shape failed to reach history-dependent goal");
  const actions=native.path.map(e=>e.action),actual=executeHiddenWorld(start,actions);
  const inferred=predictFromPath(field,start,actions);
  assert.deepEqual(actual,[x,y,z0+1],"Independent hidden action physics rejected the native preaction plan");
  assert.equal(inferred.ready,true);
  assert.ok(Math.abs(inferred.finalOutput-(z0+1))<1e-8);
  assert.ok(Math.abs(inferred.endpointOnlyOutput-z0)<1e-8,
    "Visible (x,y) endpoint cannot explain hidden +1 z without action order");
  assert.equal(native.path.length,4,"A closed commutator loop requires four unit moves");
  assert.equal(field.observations,observations.length,
    "Unseen native planning must remain frozen, no heldout leakage");
  // A memory-free (x,y) graph aliases at least two causally distinct states.
  const alias=graph.nodes.filter(t=>nums(renderObservation(t)).slice(0,2).join("|")===x+"|"+y);
  assert.ok(new Set(alias.map(t=>nums(renderObservation(t))[2])).size>=2);
  results.push({unseenStart:start,statesBuiltFromLearnedOperators:graph.nodes.length,
   nativePath:actions,firstPredictionBeforeAction:true,hiddenActual:actual,
   learnedArea:inferred.signedArea,endpointOnlyPredictedZ:inferred.endpointOnlyOutput,
   historyAwarePredictedZ:inferred.finalOutput,observedTrainingPairs:field.observations});
 }
 assert.equal(results.length,4);
 console.log("V30_NATIVE_ORIGINAL_SHAPE_LEARNED_TEXT_HOLONOMY",JSON.stringify({
  nativeOriginalDiscoverer:true,originalMazeTrainingEpisodes:disc.episodes,
  learnedActionPairs:observations.length,learnedNoncommutativeCoefficient:law.commutator,
  heldoutOriginalFullPathGoals:results.length,physicallyVerified:results.length,
  results,
  limitations:"Original goal z+1 explicitly specified, symbolic fixed numeric text grammar; no general language reasoning, no autonomous goal inference."
 }));
});
