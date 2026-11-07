// V31 persistent ORIGINAL Brain witnessed-action integration at scale.
// No inserted answer, no reference goal-path, no independent language model.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativePersistentCausalAtlas} from "../research/text-hypermaze/native-persistent-causal-atlas.mjs";
import {predictFromPath,learnedHolonomy} from "../research/text-hypermaze/path-holonomy.mjs";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";

const show=(x,y,z)=>x+" @ "+y+" ~ "+z;
const numbers=s=>tokenizeObservation(s).filter(t=>/^\d+$/.test(t)).map(Number);
function nativeBrain(seed=11){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed});
 for(let i=0;i<145;i++){
  const w=makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]);playExercise(w,b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5);
 return b;
}
function prepare(brain){
 const atlas=new NativePersistentCausalAtlas(brain,{
  maxStates:3000,maxDepth:8,maxEvidence:20000,maxValue:1000000000
 });
 for(const x of [2,3,4])for(const y of [3,4,5]){
  const initial=show(x,y,x*y);
  assert.equal(atlas.observePair(initial,show(x+1,y,(x+1)*y)).learned,true);
  assert.equal(atlas.observePair(initial,show(x,y+1,x*y+2*x)).learned,true);
 }
 return atlas;
}
function physical(start,actions){
 let [x,y,z]=numbers(start);
 for(const a of actions){
  if(a.primary===0){z+=a.step*y;x+=a.step;}
  else if(a.primary===1){z+=a.step*2*x;y+=a.step;}
  else throw Error("Action outside trained physical numerical field");
 }
 return [x,y,z];
}
test("1800 UNSEEN typed text worlds through original Brain, with complete preaction path, frozen evidence, independent action execution",{
 timeout:240000
},()=>{
 const startTime=performance.now(),brain=nativeBrain(),atlas=prepare(brain),
  outcomes={plus1:0,minus1:0,plus2:0},N=600;
 const sample=[];
 for(const [kind,delta] of [["plus1",1],["minus1",-1],["plus2",2]]){
  for(let i=0;i<N;i++){
   const x=12+i%41,y=16+((i*17+Math.floor(i/41))%47),start=show(x,y,x*y);
   const learnedBefore=atlas.memory.witnessed,plan=atlas.plan({start,dependentDelta:delta});
   assert.ok(plan.found,JSON.stringify({kind,i,plan}).slice(0,550));
   assert.equal(plan.plannedBeforeFirstAction,true);
   assert.equal(plan.trainingPairs,learnedBefore);
   const executed=atlas.execute(plan);
   assert.equal(executed.valid,true,JSON.stringify({kind,i,executed}).slice(0,400));
   assert.deepEqual(physical(start,plan.path.map(s=>s.action)),[x,y,x*y+delta]);
   assert.equal(plan.predicted,show(x,y,x*y+delta));
   assert.equal(atlas.memory.witnessed,learnedBefore);
   outcomes[kind]++;
   if(i===0)sample.push({kind,unseenStart:start,actions:plan.actionCount,
    graph:plan.graph,predicted:plan.predicted,originalBrain:plan.sharedOriginalBrain});
  }
 }
 const stats=process.memoryUsage();
 console.log("V31_PERSISTENT_ORIGINAL_BRAIN_1800_UNSEEN_WORLDS",JSON.stringify({
  independentUnseenStartGoalWorlds:3*N,correctFullPreactionPaths:3*N,
  originalMazeEpisodes:brain.disc.episodes,
  observedTextTrainingPairs:atlas.memory.witnessed,
  nativeBrainOwnsEvidence:true,
  outcomes,sample,
  elapsedMilliseconds:performance.now()-startTime,heapMB:stats.heapUsed/1048576,
  limitation:"Typed x@y~z grammar and goal delta are supplied, not arbitrary real-language questions."
 }));
});
test("Atlas of ALL explored branches and per-state original attraction is available for independent inspection",()=>{
 const atlas=prepare(nativeBrain());
 const p=atlas.plan({start:show(13,18,234),dependentDelta:1,includeAtlas:true});
 assert.ok(p.found&&p.atlas?.nodes.length>20);
 assert.ok(p.atlas.edges.length>p.path.length);
 assert.equal(p.atlas.completeWithinDepth,8);
 const initial=p.atlas.nodes[0],last=p.atlas.nodes[p.atlas.initialShapeIds.at(-1)];
 assert.ok(initial.potential>0);
 assert.equal(last.kind,KIND.target);
 assert.ok(p.path.every(x=>x.alternatives?.length>=1));
 console.log("V31_FULL_OBSERVED_TRANSFORMATION_ATLAS",JSON.stringify({
  exploredNodes:p.atlas.nodes.length,observedDerivedEdges:p.atlas.edges.length,
  predictedShortestPath:p.actionCount,branchAlternatives:
   p.path.map(x=>x.alternatives.length),
  nonPathEdges:p.atlas.edges.length-p.actionCount,
  nativeOriginalAttractionAtStart:initial.potential,
  completeToDepth:p.atlas.completeWithinDepth
 }));
});
test("Entire witnessed action memory, original 2D Brain, and preaction predicted path survive original Brain.save/load and remain frozen",()=>{
 const brain=nativeBrain(),atlas=prepare(brain),start=show(18,24,432);
 const pre=atlas.plan({start,dependentDelta:2,includeAtlas:true});
 assert.ok(pre.found);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v31-native-memory-"));
 try {
  const file=path.join(tmp,"brain.v8");
  const bytes=brain.save(file);
  const restored=Brain.load(file);
  assert.equal(restored.persistentCausalAtlasEvidence.witnessed,18);
  assert.equal(typeof restored.disc.shapeGraph,"function");
  const recovered=new NativePersistentCausalAtlas(restored,{
   maxStates:3000,maxDepth:8,maxValue:1000000000
  }),post=recovered.plan({start,dependentDelta:2,includeAtlas:true});
  assert.equal(post.found,true);
  assert.equal(post.predicted,pre.predicted);
  assert.deepEqual(post.path.map(s=>s.action),pre.path.map(s=>s.action));
  assert.equal(post.atlas.edges.length,pre.atlas.edges.length);
  assert.equal(restored.persistentCausalAtlasEvidence.witnessed,18);
  console.log("V31_BRAIN_SAVE_RELOAD_CAUSAL_ATLAS",JSON.stringify({
   storedBytes:bytes,witnessedPairs:18,exactOriginalPathRestored:true,
   completeAtlasRestored:true,checkpointOriginalBrain:true,
   expected:pre.predicted,recovered:post.predicted
  }));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
test("1,024,000 continuous action results on unseen starts: learned noncommutative history beats endpoint-only inference",{
 timeout:220000
},()=>{
 const atlas=prepare(nativeBrain()),field=atlas.learned;
 const r=(()=>{let x=55191;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}})();
 const length=2048,episodes=500;let exact=0,endpointExact=0,wrongAreaExact=0,nontrivial=0;
 let sourceSteps=0,sourceOutputs=0;
 const t0=performance.now();
 for(let j=0;j<episodes;j++){
  const sx=200+(j%31),sy=220+(j%37),sz=20000000+sx*sy,start=show(sx,sy,sz),actions=[];
  // All action objects come from observed operator model, not hidden laws.
  const model=field.discover(start);
  assert.equal(model.ready,true);
  let text=tokenizeObservation(start);
  let x=sx,y=sy,z=sz;
  for(let a=0;a<length;a++){
   const op=model.operators[Math.floor(r()*model.operators.length)];
   const next=field.apply(text,op,model);
   assert.ok(next,"Unseen action left the learned numeric world");
   text=next;actions.push({primary:op.primary,step:op.step});
   if(op.primary===0){z+=op.step*y;x+=op.step;}
   else if(op.primary===1){z+=op.step*2*x;y+=op.step;}
   sourceSteps++;
  }
  const observed=numbers(text),pred=predictFromPath(field,start,actions);
  assert.equal(pred.ready,true);
  assert.deepEqual(observed,[x,y,z]);
  const agrees=Math.abs(pred.finalOutput-z)<1e-6&&pred.finalX===x&&pred.finalY===y;
  exact+=+agrees;endpointExact+=+(Math.abs(pred.endpointOnlyOutput-z)<1e-6);
  wrongAreaExact+=+(Math.abs((pred.endpointOnlyOutput-pred.pathOrderContribution)-z)<1e-6);
  nontrivial+=+(Math.abs(pred.pathOrderContribution)>1e-6);
  sourceOutputs++;
 }
 assert.equal(exact,episodes);
 assert.ok(endpointExact<episodes/2,
  "If endpoint-only already solves everything, history offers no causal improvement");
 console.log("V31_LEARNED_NONCOMMUTATIVE_MILLION_ACTIONS",JSON.stringify({
  observedTextTrainingPairs:atlas.memory.witnessed,
  withheldUnseenStarts:episodes,totalActualLearnedTextActions:sourceSteps,
  actualPhysicalOutputStates:sourceOutputs,
  completePredictions:exact,
  endpointOnlyCorrect:endpointExact,wrongAreaCorrect:wrongAreaExact,
  nontrivialHistoricalCorrections:nontrivial,
  elapsedMilliseconds:performance.now()-t0,
  limitations:"Observed operators use fixed locally affine numeric-token grammar. This is long-horizon causal prediction, NOT natural-language semantic answer generation."
 }));
});
