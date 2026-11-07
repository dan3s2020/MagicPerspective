// A frozen native V17 predicted shape drives the emitted characters.
// This does NOT replace Brain.chat, fabricate action physics, infer arbitrary
// answer meaning, or write "gold" to the path planner.
// The physical-world callback sees only current state + action and never
// receives the predicted outcome/reference answer. All characters are emitted
// from the actual final independently observed state.
import {CumulativeHyperMaze} from "./cumulative-hypermaze.mjs";
import {ForensicPathAtlas} from "./forensic-path-atlas.mjs";
import {tokenizeObservation,renderObservation} from
 "../../transcend/torus-aether/worlds/observed-transformations.mjs";

const norm=s=>renderObservation(tokenizeObservation(String(s??"")));
export class NativeFrozenShapeWriter{
 constructor(brain){
  if(!brain?.disc||typeof brain.disc.shapeGraph!=="function")
   throw Error("Exact original V17 Discoverer.shapeGraph required");
  this.brain=brain;this.world=new CumulativeHyperMaze(brain);
  this.atlas=new ForensicPathAtlas(brain);
 }
 predict({start,required,allowInferred=false}={}){
  const plan=this.world.plan({start,required,
   includeTopology:true,allowInferred});
  const diagnostic=this.atlas.analyse({start,required,nativePlan:plan});
  return {plan,diagnostic,originalBrain:true,
   frozenBeforeFirstCharacter:true,
   outputCausallyControlledByOriginalShape:plan.found,
   referenceAnswerNotSupplied:true};
 }
 // Real external physics must be independent of predicted-next state. A
 // planned edge is NOT claimed verified just because it is on the path.
 actAndWrite(frozen,physicalStep,{learnAfterScoring=false,episode="heldout"}={}){
  if(!frozen?.plan?.found)return {found:false,
   reason:frozen?.plan?.reason||"NO_PREACTION_PATH",
   output:"",characterFrames:[],executedFrames:[],
   why:this.atlas.analyse({start:frozen?.plan?.start||"",
    required:frozen?.plan?.required||[],nativePlan:frozen?.plan})};
  if(frozen.plan.originalPlanner!=="Discoverer.shapeGraph"||
      frozen.plan.frozenBeforeAction!==true)
   throw Error("Cannot emit from a non-original or post-action text path");
  if(typeof physicalStep!=="function")throw Error("External independent world step required");
  let state=frozen.plan.start,match=0,fail=null;
  const executedFrames=[];
  for(const [i,step] of frozen.plan.actions.entries()){
   if(state!==step.before){fail={step:i,why:"PATH_STATE_DIVERGED_BEFORE_ACTION"};break;}
   const next=physicalStep({text:state,action:step.action,step:i});
   if(typeof next!=="string")throw Error("External physics must return actual text");
   const actual=norm(next),expected=step.after,equal=actual===expected;
   executedFrames.push({step:i+1,action:step.action,before:state,
     predictedNext:expected,actuallyObserved:actual,
     physicalWorldProvidedNext:true});
   executedFrames[executedFrames.length-1].matched=equal;
   if(learnAfterScoring)this.world.observeTransition({
     episode,before:state,after:actual,action:step.action,
     accepted:equal,expectedAfter:expected,
     source:"independent-external-world"
   });
   state=actual;match+=Number(equal);
   if(!equal){fail={step:i+1,why:"INDEPENDENT_PHYSICS_REJECTED_PREDICTED_EFFECT",
    predicted:expected,observed:actual};break;}
  }
  const targetReached=frozen.plan.required.every(t=>
   tokenizeObservation(state).includes(t));
  const complete=!fail&&executedFrames.length===frozen.plan.actions.length&&
   targetReached&&state===frozen.plan.predicted;
  const codepoints=Array.from(state);
  const predictedCodepoints=Array.from(frozen.plan.predicted);
  return {found:true,complete,frozenPredictedAnswer:frozen.plan.predicted,
   output:state,emittedCharacters:codepoints.length,
   characterFrames:codepoints.map((char,index)=>({
    index,emitted:char,predicted:predictedCodepoints[index]??null,
    matched:char===predictedCodepoints[index],
    originalSolutionShapeActionCount:frozen.plan.actions.length
   })),executedFrames,physicalStepsMatched:match,
   failure:fail,goalConditionReached:targetReached,
   originalPathUsedToControlCharacters:true,
   noNextCharacterPredictor:true,
   preactionAnswerShapeWasFrozen:true,
   independentPhysicalCallbackRequired:true,
   generalOpenDomainAnswerAccuracyNotProven:true};
 }
}
