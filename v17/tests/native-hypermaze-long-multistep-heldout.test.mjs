// Controlled large-text falsification: 100 exact completely held-out
// >1024-byte output passages, 5 simultaneously altered word axes, SAME
// original trained V17 Discoverer.shapeGraph. No reference supplied to plan.
// Distinguish structured composition from natural-language reasoning.
import test from "node:test";
import assert from "node:assert/strict";
import {performance} from "node:perf_hooks";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {tokenizeObservation}
 from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {NativeGoalTextMaze}
 from "../research/text-hypermaze/goal-conditioned-native.mjs";

const axes=[
 ["atlas","orion","meridian","zenith"],
 ["bronze","copper","quartz","granite"],
 ["silent","vivid","restless","steady"],
 ["spectrum","compass","archive","lattice"],
 ["violet","indigo","emerald","scarlet"]
];
const segments=[
 "The multidisciplinary investigation remained active through the entire observation cycle because every participant was required to document the origin of each hypothesis and the independently measured effect of every intervention while maintaining a complete chronological record of the evidence collected at the experimental station, and the first identifier assigned to this particular observation was ",
 " while the physical instrument enclosure was constructed from material described consistently in every calibration report as ",
 " despite the recurring atmospheric disturbances, the localized motion of the sensor array was carefully classified by the observers as ",
 " and the principal observational procedure remained linked to the technical device designated in the official operating protocol as ",
 " therefore the final annotation color used by the investigators for the archived result was ",
 " and none of these descriptions altered the measurement procedure, the identity of the witnesses, the order of the recorded events, the physical location of the laboratory, the provenance of the instrument readings, or the requirement that every proposed explanation be checked against the actual observed transformations before accepting any conclusion."
];
const passage=ids=>{
 let out=segments[0];
 for(let i=0;i<axes.length;i++)out+=axes[i][ids[i]]+segments[i+1];
 return out;
};
const baseline=Array(5).fill(0);
const observed=[passage(baseline)];
for(let axis=0;axis<5;axis++)for(let value=1;value<4;value++){
 const xs=baseline.slice();xs[axis]=value;
 observed.push(passage(xs));
}
const choices=[];
for(let a=1;a<4;a++)for(let b=1;b<4;b++)
 for(let c=1;c<4;c++)for(let d=1;d<4;d++)for(let e=1;e<4;e++)
  choices.push([a,b,c,d,e]);
assert.equal(choices.length,243);
test("original pre-action shape navigates 100 unseen >1KB full textual states with 5 independent transformed axes (structured goal only)",{
 timeout:180000
},()=>{
 assert.equal(observed.length,16);
 assert.ok(Buffer.byteLength(passage(baseline),"utf8")>=1024);
 assert.ok(tokenizeObservation(passage(baseline)).length<=256,
  "This long textual control MUST fit the original 256-token observation window");
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
   empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<70;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,2090+i*17),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 const M=new NativeGoalTextMaze(b,{maxStates:3500,maxDepth:5,
  geometryWeight:.025,sharedPolicyWeight:.01});
 const t0=performance.now();
 for(const passageText of observed)M.observe(passageText);
 const t1=performance.now();
 assert.equal(b.observedTransformations.seen,16,
  "All actual observed long sentences must be learned, not just byte counts");
 const observedBefore=b.observedTransformations.seen;
 let exact=0,finished=0,cacheHits=0,geometryOutputEffects=0,policyOutputEffects=0;
 const rows=[];
 for(const [i,ids] of choices.slice(0,100).entries()){
  const wanted=passage(ids);
  assert.equal(b.observedTransformations.containsSentence(wanted),false,
   "Full heldout prose was leaked into learned corpus");
  const required=ids.map((n,k)=>axes[k][n]);
  const pre=M.plan({start:passage(baseline),required});
  if(pre.graph.topologyCacheHit)cacheHits++;
  const noGeom=M.plan({start:passage(baseline),required,geometryWeight:0});
  const noPolicy=M.plan({start:passage(baseline),required,sharedPolicyWeight:0});
  const match=pre.found&&pre.predicted===wanted;
  const execute=match?M.execute(pre,{maxSteps:8,enableNoise:false,trainNoise:false}):null;
  exact+=Number(match);
  finished+=Number(execute?.solvedInternalGoal&&execute.executedFinal===wanted);
  geometryOutputEffects+=Number(pre.predicted!==noGeom.predicted);
  policyOutputEffects+=Number(pre.predicted!==noPolicy.predicted);
  if(i<5)rows.push({id:i,goal:required,
    bytes:Buffer.byteLength(wanted),originalShapeActions:pre.actions.length,
    predictedExactBeforeAction:match,
    goalReachedByOriginalLearnedBody:!!execute?.solvedInternalGoal,
    sourceTopologyCacheUsed:pre.graph.topologyCacheHit});
  assert.ok(pre.actions.length>=5 || !pre.found,
   "Every change requires >=5 learned text-body actions; never credit a one-step copied answer");
  assert.equal(pre.referenceAnswerProvided,false);
  assert.equal(b.observedTransformations.seen,observedBefore,
   "Frozen withheld evaluation must NEVER update the original learner");
 }
 const ms=performance.now()-t1;
 const output={
  trainingObservations:observed.length,
  trainingMilliseconds:+(t1-t0).toFixed(1),
  longHeldoutTested:100,
  fullExactFirstActionPredictions:exact,
  executedLearnedGoalSuccess:finished,
  fullTextUTF8Bytes:Buffer.byteLength(passage(baseline),"utf8"),
  minimumOriginalTokenActions:5,
  cacheHits,evalMilliseconds:+ms.toFixed(1),
  originalLearnedOperators:b.observedTransformations.operators.size,
  geomAblationOutputChanged:geometryOutputEffects,
  pathPolicyAblationOutputChanged:policyOutputEffects,
  labels:"structured explicit goal tokens, not long open-ended semantic Q&A",
  externalSemanticTruthProved:false,realCUDAOriginalHypermazeTested:false,
  sample:rows
 };
 console.log("NATIVE_LONG_TEXT_STRUCTURED_HELDOUT_100",JSON.stringify(output));
 assert.equal(exact,100,"The original V17 pre-first-action full passage shape failed at least one heldout long state");
 assert.equal(finished,100,"An actual original learned-operator body failed to execute at least one complete long target state");
 assert.ok(cacheHits>=99,"Bounded original topology cache must prevent 100 repeated full scans");
});

test("1,000 distinct >1KB corpus observations train ORIGINAL native V17 operator graph and 24 remaining passages stay frozen unseen",{
 timeout:180000
},()=>{
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
   empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<70;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,2090+i*17),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 const M=new NativeGoalTextMaze(b,{maxStates:3500,maxDepth:5});
 const all=[];
 for(let a=0;a<4;a++)for(let c=0;c<4;c++)for(let d=0;d<4;d++)
  for(let e=0;e<4;e++)for(let f=0;f<4;f++)all.push([a,c,d,e,f]);
 assert.equal(all.length,1024);
 const inputs=all.slice(0,1000),hidden=all.slice(1000);
 const start=passage([0,0,0,0,0]);
 const bytes=inputs.reduce((n,x)=>n+Buffer.byteLength(passage(x),"utf8"),0);
 const t0=performance.now();
 for(const x of inputs)M.observe(passage(x));
 const secs=(performance.now()-t0)/1000;
 const original= b.observedTransformations;
 assert.equal(original.seen,1000);
 assert.ok(original.operators.size>=40,
  "Large real observation loop learned too few reusable transformations");
 assert.equal(hidden.length,24);
 let exact=0,executed=0,cached=0;
 const t1=performance.now();
 for(const x of hidden){
  const gold=passage(x),goals=x.map((v,i)=>axes[i][v]);
  assert.equal(original.containsSentence(gold),false,"Frozen heldout passage leaked");
  const result=M.plan({start,required:goals});
  if(result.graph.topologyCacheHit)cached++;
  if(result.found&&result.predicted===gold)exact++;
  if(result.found){
   const body=M.execute(result,{trainNoise:false,enableNoise:false,maxSteps:8});
   if(body.solvedInternalGoal&&body.executedFinal===gold)executed++;
  }
 }
 const inferenceSeconds=(performance.now()-t1)/1000;
 const result={numberOfActualDistinctLongObservations:1000,
  trainingUTF8MB:+(bytes/1e6).toFixed(3),
  observedMBPerSecond:+(bytes/1e6/secs).toFixed(4),
  observedExercisesPerSecond:+(1000/secs).toFixed(2),
  trainingElapsedSeconds:+secs.toFixed(3),
  trainedV17Operators:original.operators.size,
  heldout24ExactBeforeFirstAction:exact,heldout24Executed:executed,
  heldoutLongBytesAtLeast:Buffer.byteLength(start),
  inferenceElapsedSeconds:+inferenceSeconds.toFixed(3),
  cachedHypermazeQueries:cached,
  originalCPUOnly:true,notRTXCUDAThroughput:true,
  notRealOpenThoughtsCorpus:true,notGeneralSemanticAnswerAccuracy:true,
  nodeHeapMiB:+(process.memoryUsage().heapUsed/1048576).toFixed(2)};
 console.log("NATIVE_1K_LONG_OBSERVED_CORPUS_CPU_THROUGHPUT",JSON.stringify(result));
 assert.equal(exact,24,"Frozen original-motor full long predictions must cover all remaining unique combinations");
 assert.equal(executed,24,"The original body's actions must actually reach the withheld long states");
 assert.equal(original.seen,1000,"Heldout test must not secretly train on answers");
});
