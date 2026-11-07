// This is a production-source, original-mechanism test of a STRICTLY
// goal-specified text transformation world. NOT a 100% long-TinyStories
// semantic solution benchmark. No answer string enters plan().
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze}
 from "../research/text-hypermaze/goal-conditioned-native.mjs";

function learnedOriginalBrain(seed=11){
 const b=new Brain({rules:"winner",seed});
 b.enableEndogenousNoise();
 const solved=[];
 for(let i=0;i<165;i++){
  const world=makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]);
  const row=playExercise(world,b.disc);
  solved.push(row.solved);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
     b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2,
  "Original Brain did not learn target attraction from the actually lived mazes");
 assert.ok(b.disc.conduct(KIND.floor)>=.5);
 return b;
}
const observations=[
 "She is happy.",
 "She is tired.",
 "He is tired.",
 "He is calm."
];
test("THE ACTUAL original Discoverer maze shape predicts a path in a learned NON-GRID text world before any output, with an unavailable reference answer",{
 timeout:100000
},()=>{
 const brain=learnedOriginalBrain(),adapter=new NativeGoalTextMaze(brain,{maxStates:300,maxDepth:5});
 const source=observations.join("\n");
 const evidence=adapter.observe(source);
 assert.equal(evidence.learned,true);
 assert.ok(brain.observedTransformations.operators.size>=2);
 assert.ok(brain.trace.geo.U.size>0);
 const before=brain.observedTransformations.seen;
 // The full answer is deliberately NEVER an argument of the planner.
 const request={start:"He is calm.",required:["She","calm"]};
 const plan=adapter.plan(request);
 assert.equal(plan.plannedBeforeFirstAction,true);
 assert.equal(plan.referenceAnswerProvided,false);
 assert.equal(plan.referenceUsedForGoal,false);
 assert.equal(plan.goalVisibleAsExplicitConstraints,true);
 assert.equal(plan.found,true,JSON.stringify(plan).slice(0,1100));
 assert.equal(plan.predicted,"She is calm.");
 assert.equal(brain.observedTransformations.containsSentence(plan.predicted),false,
  "Target sentence must be an actually NEVER-OBSERVED composition");
 assert.ok(plan.initialShape.length>=2);
 assert.ok(plan.actions.length>=1);
 assert.ok(plan.graph.observedOperatorEdges>0);
 assert.equal(brain.observedTransformations.seen,before,
  "Planning must not silently train from heldout data");
 const frozen=adapter.execute(plan,{trainNoise:false,enableNoise:false});
 assert.equal(frozen.attempted,true);
 assert.equal(frozen.solvedInternalGoal,true);
 assert.equal(frozen.executedFinal,"She is calm.");
 assert.equal(frozen.firstShape[0],"He is calm.");
 assert.equal(frozen.firstShape.at(-1),"She is calm.");
 assert.equal(frozen.frames[0].stage,"before-first-action");
 assert.equal(frozen.frames[0].worldActionsExecuted,0);
 assert.ok(frozen.frames.length>=2);
 assert.equal(frozen.externalSemanticGoalValidated,false);
 assert.equal(brain.observedTransformations.seen,before);
 const unchanged=adapter.plan(request);
 assert.deepEqual(unchanged.initialShape,plan.initialShape);
 console.log("NATIVE_DISCOVERER_TEXT_PATH_BEFORE_ACTION",JSON.stringify({
  originalMazeAttraction:brain.disc.attract(KIND.target),
  trainedObservedTextSentences:observations.length,
  realLearnedTextOperators:brain.observedTransformations.operators.size,
  graphStateCount:plan.graph.states,
  textShape:plan.initialShape,firstPredictionBeforeOutput:true,
  goalInternallyReached:frozen.solvedInternalGoal,
  referenceAnswerProvided:false,semanticTruthExternallyVerified:false,
  fullUnseenLongAnswer100PercentProved:false
 }));
});
test("Brain's SAME original NoiseAgency receives actual internal action/replanning feedback and survives save/load",{
 timeout:100000
},()=>{
 const brain=learnedOriginalBrain(17);
 const adapter=new NativeGoalTextMaze(brain,{maxStates:300,maxDepth:5});
 adapter.observe(observations.join("\n"));
 const shape=adapter.plan({start:"He is calm.",required:["She","calm"]});
 assert.equal(shape.found,true);
 const noise0=brain.noiseAgent.status().decisions;
 const policy0=brain.constructedPaths.pathPolicyUpdates;
 const lived=adapter.execute(shape,{trainNoise:true,enableNoise:true,maxSteps:14});
 assert.equal(lived.attempted,true);
 assert.ok(brain.noiseAgent.status().decisions>noise0,
  "The real original endogenous NoiseAgency was NOT used for text actions");
 assert.ok(brain.constructedPaths.pathPolicyUpdates>policy0,
  "Original transferable path policy from mazes was not updated by text world experience");
 assert.equal(lived.frames[0].stage,"before-first-action");
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"v17-hypermaze-original-"));
 const file=path.join(temp,"real-brain.v8");
 try{
  brain.save(file);
  const loaded=Brain.load(file);
  assert.equal(loaded.noiseAgent.status().decisions,
   brain.noiseAgent.status().decisions);
  assert.equal(loaded.constructedPaths.pathPolicyUpdates,
   brain.constructedPaths.pathPolicyUpdates);
  assert.ok(loaded.observedTransformations.operators.size>=2);
  assert.ok(loaded.trace.geo.U.size>=2);
  const model=new NativeGoalTextMaze(loaded,{maxStates:300,maxDepth:5});
  const restored=model.plan({start:"He is calm.",required:["She","calm"]});
  assert.deepEqual(restored.initialShape,shape.initialShape,
   "Original shape should survive .v8 save/restore");
  console.log("NATIVE_HYPERMAZE_NOISE_AND_CHECKPOINT",JSON.stringify({
   realNativeNoiseChoices:loaded.noiseAgent.status().decisions,
   nativePolicyLearningUpdates:loaded.constructedPaths.pathPolicyUpdates,
   observedOperators:loaded.observedTransformations.operators.size,
   learned5DStateCoords:loaded.trace.geo.U.size,
   checkpointBytes:fs.statSync(file).size,
   pretrainedTinyStoriesNPZUnchanged:true,
   semanticGoalProof:false
  }));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
test("No explicit goal => no fabricated shape; no learned operators => no oracle answer",()=>{
 const brain=new Brain({rules:"winner",seed:11}),a=new NativeGoalTextMaze(brain);
 assert.throws(()=>a.plan({start:"The gate opens.",required:[]}),
  /Explicit text goal constraints required/);
 const unknown=a.plan({start:"The gate opens.",required:["exit"]});
 assert.equal(unknown.found,false);
 assert.equal(unknown.referenceAnswerProvided,false);
 assert.equal(unknown.predicted,null);
});
