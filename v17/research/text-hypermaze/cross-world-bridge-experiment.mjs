// V31 actual bridge experiment: predict FIRST from reused transformations,
// then verify through an INDEPENDENT target-world action, and only then make
// a verified edge walkable in the SAME original Brain cumulative maze.
// The solution field is always the original Brain.disc.shapeGraph.
// No self-reported "correct" actions, no answer/reference oracle for planning,
// no invented edge promoted by corpus adjacency or source-only hypotheses.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {CumulativeHyperMaze} from "./cumulative-hypermaze.mjs";
import {NativeCrossEpisodeTransfer} from "./cross-episode-native.mjs";
import {ForensicPathAtlas} from "./forensic-path-atlas.mjs";

const safeEpisode=s=>{
 if(typeof s!=="string"||!s.trim()||s.length>128)
  throw Error("An independent target-world episode ID is required");
 return s;
};
export class CrossWorldBridgeExperiment{
 constructor(brain){
  if(!(brain instanceof Brain))throw Error("The SAME original native Brain is required");
  this.brain=brain;
  this.memory=new CumulativeHyperMaze(brain);
  this.transfer=new NativeCrossEpisodeTransfer(brain);
  this.atlas=new ForensicPathAtlas(brain);
 }
 // All episodes used for source learning were lived, never supplied as
 // target solution paths. Caller decides which independent step outcomes
 // are real, via observe() or an external validated experiment.
 observeSource(experience){return this.transfer.observe(experience);}
 frozen({startText,goal,required}={}){
  if(typeof startText!=="string"||!startText.trim())
   throw Error("Original start world is required");
  if(!Array.isArray(required)||!required.length)
   throw Error("Require an explicit partial goal predicate for atlas comparison");
  const predicted=this.transfer.plan({startText,goal});
  const original=this.memory.plan({start:startText,required,includeTopology:true});
  const diagnostic=this.atlas.analyse({start:startText,required,nativePlan:original});
  return {predicted,original,diagnostic,
   originalBrain:true,goalsVisibleBeforeMovement:true,
   sourceTransformationsInSameBrain:this.transfer.summary().reusableActions,
   referenceAnswerProvided:false,modelUnchangedByFrozenPlanning:true};
 }
 // The EXTERNAL WORLD STEP is mandatory. It gets only a real before state
 // and an action name, never an expected answer or the planned next state.
 observeAfterActualAction({episodeId,plan,physicalStep,required}={}){
  const episode=safeEpisode(episodeId);
  if(!plan?.found||!plan.plannedBeforeFirstAction)
   return {attempted:false,reason:"NO_FROZEN_PREDICTED_PATH",
    verificationNeverFabricated:true};
  if(typeof physicalStep!=="function")
   throw Error("Independent physical step is required");
  if(!Array.isArray(required)||!required.length)
   throw Error("Partial visible goal tokens must have been known before the experiment");
  const auditBefore=this.atlas.analyse({start:plan.start,required});
  const baseline=this.memory.plan({start:plan.start,required});
  const feedback=this.transfer.execute(plan,({text,action,step})=>
   physicalStep({text,action,step}),{learnFeedback:false});
  if(!feedback.attempted)throw Error("Physical evaluator did not execute original preaction path");
  const observed=[],failures=[];
  for(const frame of feedback.frames.slice(1)){
   const match=frame.predictionCorrect===true;
   const record=this.memory.observeTransition({
    episode,before:frame.before,after:frame.actual,action:frame.action,
    accepted:match,
    expectedAfter:frame.originallyPredicted,
    source:match?"INDEPENDENT_TARGET_WORLD_ACCEPTED_ACTION":
     "INDEPENDENT_TARGET_WORLD_REJECTED_PREDICTION"
   });
   const transfer=this.transfer.observe({
    episodeId:episode,action:frame.action,
    before:frame.before,after:frame.actual,accepted:true
   });
   const trace={step:frame.step,from:frame.before,
    predicted:frame.originallyPredicted,actual:frame.actual,
    action:frame.action,correct:match,
    nowWalkableInNativeCumulativeMemory:match&&record.walkable,
    sourceEvidence:plan.actions?.[frame.step-1]?.trainingWorldCount??null,
    memoryEvent:record,
    updatedTransferWitness:transfer.learned};
   observed.push(trace);
   if(!match)failures.push(trace);
   if(!match)break;
  }
  const selected=this.memory.plan({start:plan.start,required,
    allowInferred:false,includeTopology:true});
  const after=this.atlas.analyse({start:plan.start,required,nativePlan:selected});
  return {
   kind:"observed-target-world-feedback-opens-or-blocks-cumulative-path",
   attempted:true,originalBrain:true,
   frozenPredictionBeforeAction:true,referenceAnswerProvided:false,
   originalPlanner:"Discoverer.shapeGraph",
   trainedViaIndependentObservedEffectsOnly:true,
   predictedFullText:plan.predicted,
   predictedInitialPath:plan.initialShape.slice(),
   realExternalSteps:observed.length,
   correctlyVerifiedSteps:observed.filter(x=>x.correct).length,
   invalidPredictedSteps:failures.length,
   output:feedback.actualFinal,
   fullyMatchedIndependentPhysics:feedback.completeExact,
   evidence:observed,
   firstFailure:failures[0]||null,
   before:{reason:auditBefore.diagnosis,
    verifiedPathExists:auditBefore.topology.verifiedPathExists,
    originalFound:baseline.found,
    retainedGraphEdges:auditBefore.atlas.walkableVerifiedEdges},
   after:{reason:after.diagnosis,
    verifiedPathExists:after.topology.verifiedPathExists,
    originalFound:selected.found,
    originalOriginalShape:selected.originalPlanner,
    originalRoute:selected.actions,
    retainedGraphEdges:after.atlas.walkableVerifiedEdges},
   caveat:"Only independent physical action effects become verified edges. This is not universal text semantics."
  };
 }
}
