// Genuine frozen compositional heldout tasks on original V17 Discoverer.shape
// in a learned, non-grid textual transformation topology. Withheld target
// sentences are NEVER passed to model.observe() or to plan() as references.
// They are strict STRUCTURED controls, NOT natural long-answer accuracy.
import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze}
 from "../research/text-hypermaze/goal-conditioned-native.mjs";
const subjects=["You","I","They","We","She"];
const properties=["quiet","ready","brave","curious","calm"];
const withheld=[[0,4],[1,1],[2,2],[3,3],[4,0],[4,4]];
const withheldKey=new Set(withheld.map(([a,b])=>a+","+b));
const sentence=(a,b)=>subjects[a]+" feel "+properties[b]+".";
test("Original Discoverer.shapeGraph composes withheld text goals using ONLY actually observed text edit effects and the native V17 maze attractor",{
 timeout:100000
},()=>{
 const brain=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 const disc=brain.disc;
 let episodes=0;
 for(let i=0;i<100;i++){
  const world=makeMaze(seedOf(SEEDS.train,1010+i*17),[7,9,11][i%3]);
  playExercise(world,disc);episodes++;
  if(i>=25&&disc.attract(KIND.target)>.2&&disc.conduct(KIND.floor)>=.5&&disc.self()>=0)break;
 }
 assert.ok(disc.attract(KIND.target)>.2);
 assert.ok(disc.conduct(KIND.floor)>=.5);
 brain.enableEndogenousNoise();
 const adapter=new NativeGoalTextMaze(brain,{maxStates:1000,maxDepth:5,
  geometryWeight:.025,sharedPolicyWeight:.01});
 const actualTraining=[];
 for(let i=0;i<5;i++)for(let j=0;j<5;j++){
  if(!withheldKey.has(i+","+j))actualTraining.push(sentence(i,j));
 }
 assert.equal(actualTraining.length,19);
 const learned=adapter.observe(actualTraining.join("\n"));
 assert.ok(learned.newSentences>=19);
 assert.ok(brain.observedTransformations.operators.size>10);
 const trainedCount=brain.observedTransformations.seen;
 const nativeNoiseBefore=brain.noiseAgent.status().decisions;
 const results=[];
 for(const [a,b] of withheld){
  const expected=sentence(a,b);
  assert.equal(brain.observedTransformations.containsSentence(expected),false,
   "One withheld answer leaked into learned text: "+expected);
  let start=sentence((a+1)%subjects.length,b);
  if(withheldKey.has(((a+1)%subjects.length)+","+b))
   start=sentence(a,(b+1)%properties.length);
  assert.ok(actualTraining.includes(start),"Start must be a REAL observed sentence");
  const problem={start,required:[subjects[a],properties[b]]};
  const proposed=adapter.plan(problem);
  assert.equal(proposed.plannedBeforeFirstAction,true);
  assert.equal(proposed.referenceAnswerProvided,false);
  assert.equal(proposed.referenceUsedForGoal,false);
  assert.equal(proposed.found,true,JSON.stringify(proposed).slice(0,700));
  const disabledGeometry=adapter.plan({...problem,geometryWeight:0});
  const disabledPolicy=adapter.plan({...problem,sharedPolicyWeight:0});
  const executed=adapter.execute(proposed,{enableNoise:false,trainNoise:false,maxSteps:10});
  assert.equal(executed.solvedInternalGoal,true,JSON.stringify(executed).slice(0,700));
  assert.equal(executed.executedFinal,expected,
   "Original-shape text navigator failed withheld composition: "+expected);
  assert.equal(proposed.predicted,expected,
   "Global solution shape was NOT correct before first action: "+expected);
  assert.equal(executed.predictedBeforeMovement,expected);
  assert.equal(brain.observedTransformations.seen,trainedCount,
   "Frozen text tests must not train original edit operator model");
  results.push({start,goalTokens:problem.required,expected,
   beforeFirstAction:proposed.predicted,firstTryExact:proposed.predicted===expected,
   originalShapeSteps:proposed.actions.length,
   goalSolved:executed.solvedInternalGoal,
   ablatedGeometryPrediction:disabledGeometry.predicted,
   ablatedTransferPolicyPrediction:disabledPolicy.predicted,
   trueLearned5DAxes:proposed.graph.shared5DActionAxes});
 }
 assert.equal(results.length,6);
 assert.equal(brain.noiseAgent.status().decisions,nativeNoiseBefore,
  "Frozen tests must NOT update native noise policy");
 assert.equal(brain.observedTransformations.seen,trainedCount);
 console.log("NATIVE_ORIGINAL_SHAPE_HELDOUT_COMPOSITIONS",JSON.stringify({
  originalRealMazeEpisodes:episodes,learnedTextSentences:19,
  exactHeldout:results.filter(x=>x.firstTryExact).length,totalHeldout:6,
  nativeShapeSameAlgorithm:true,
  geometryAblationChangedOutput:results.filter(x=>x.ablatedGeometryPrediction!==x.beforeFirstAction).length,
  transferPolicyAblationChangedOutput:results.filter(x=>x.ablatedTransferPolicyPrediction!==x.beforeFirstAction).length,
  semanticBenchmarksStillMissing:true,largeUnseenAnswersNotMeasured:true,
  results}));
});
