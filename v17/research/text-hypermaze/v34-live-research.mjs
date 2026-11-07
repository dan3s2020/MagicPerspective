// V34 RESEARCH LANE — runs IN the same live V17 worker/Brain as the
// real OpenThoughts trainer and all existing UI graphs.
// This module does not train a substitute next-character model.
// Native V31 sparse attraction is the exact original equation; V24
// character-path hypotheses derive ONLY from actual V17 observed text
// contrasts and are NEVER promoted to independently verified actions.
// No hidden answer/gold response enters frozen plan construction.
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {tokenizeObservation} from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {NativePersistentCausalAtlas} from "./native-persistent-causal-atlas.mjs";
import {CharacterHypermaze} from "../../transcend/torus-aether/worlds/character-hypermaze.mjs";

const sessions=new WeakMap();
const bounded=(v,lo,hi,label)=>{
 const n=Number(v);
 if(!Number.isSafeInteger(n)||n<lo||n>hi)throw Error(label+" outside ["+lo+","+hi+"]");
 return n;
};
const raw=(v,description,limit=10000)=>{
 if(typeof v!=="string"||!v.trim()||v.length>limit)
  throw Error(description+" must be 1.."+limit+" nonempty characters");
 return v;
};
function sameBrainSession(brain){
 if(!(brain instanceof Brain))throw Error("V34 requires actual original V17 live Brain instance");
 let s=sessions.get(brain);
 if(!s){s={causal:new NativePersistentCausalAtlas(brain),
  characters:null,charactersEvidenceVersion:null};
  sessions.set(brain,s);
 }
 return s;
}
function collectObservedCharacterHypotheses(brain,s){
 const native=brain.observedTransformations;
 if(!native)throw Error("Original V17 word contrast evidence absent");
 // Build the original text-observation view ONCE per original Brain.
 // A streaming corpus may change native.seen every sentence. Rebuilding
 // every character rule and all evidence after each fresh sentence caused
 // Windows UI stalls: preserve incremental provenance instead.
 if(!s.characters){
  s.characters=new CharacterHypermaze({minIndependentWorlds:2});
  s.characterSeenEvents=new Map();
  s.characterMetrics={inspected:0,observed:0,skipped:0};
  s.charactersEvidenceVersion=null;
 }
 const c=s.characters,key=[native.seen,native.operators.size,native.comparisons].join(":");
 if(s.charactersEvidenceVersion===key)return c;
 const metrics=s.characterMetrics,seen=s.characterSeenEvents;
 for(const op of native.operators.values()){
  if(op.kind!=="replace"||!op.from||!op.to)continue;
  let sourceEvents=seen.get(op.key);
  if(!sourceEvents){sourceEvents=new Set();seen.set(op.key,sourceEvents);}
  for(const event of op.evidence||[]){
   if(typeof event.from!=="string"||typeof event.to!=="string")continue;
   const fingerprint=JSON.stringify([event.from,event.to]);
   if(sourceEvents.has(fingerprint))continue;
   sourceEvents.add(fingerprint);
   metrics.inspected++;
   const before=tokenizeObservation(event.from),
    after=tokenizeObservation(event.to),at=op.index;
   if(before.length!==after.length||before[at]!==op.from||after[at]!==op.to){
    metrics.skipped++;continue;
   }
   // Neither the old word contrast nor its inferred 1-character step is
   // automatically an independently executed physical intervention.
   const accepted=c.observeWordContrast({type:"rule-evidence",world:"text",
    before,after,from:op.from,to:op.to,at,
    action:op.key,documentId:null});
   metrics.observed+=Number(accepted);
  }
 }
 c.originalV17ContrastProvenance={
  source:"SAME ORIGINAL V17 ObservedTransformations (retained corpus)",
  extraction:"INCREMENTAL_EVIDENCE_FROM_ALREADY_OBSERVED_ORIGINAL_CORPUS",
  observedComparisons:native.comparisons,
  scannedOriginalSentencePairs:metrics.inspected,
  acceptedMinimalOneCharacterContrasts:metrics.observed,
  unsupportedOrUnmatchedEvidence:metrics.skipped,
  originalTextOperators:native.operators.size,
  originalTextSentencesRetained:native.records.size,
  originalTextSentencesEvicted:native.evicted,
  documentIDsNotRetained:true,
  independentPhysicalWorldActionsVerified:false,
  noGoldAnswersUsed:true
 };
 s.charactersEvidenceVersion=key;
 return c;
}
function status(brain,s){
 const native=brain.observedTransformations,xd=brain.xdAtlas,
  text=brain.constructedPaths,causal=s.causal;
 return {
  mode:"ONE original live V17 Brain, additive V34 read-only research/typed-evidence lane",
  originalBrainIdentityVerified:true,
  sourceTraining:{charactersCommitted:brain.chars,
   exercisesCommitted:brain.exercises,
   nativeTextWindowsSeen:native?.seen||0,
   nativeTextStatesActive:native?.records?.size||0,
   nativeTextStatesEvicted:native?.evicted||0,
   nativeTextContrasts:native?.operators?.size||0,
   originalSixScaleLearning:text?.summary?.()||null},
  physicalXDAtlas:{
   learnedWorlds:xd?.trainedWorlds||0,
   actionEffectClasses:xd?.effects?.size||0,
   actualLastWorld:xd?.last||null},
  causalNumeric:{
   externallyProvidedPairs:causal.memory.witnessed,
   rejectedPairs:causal.memory.rejected,
   conditionalModel:causal.memory.witnessed>0?
    "native StateDependentTextAxes from actual supplied before/after changes":
    "not yet witnessed",
   independenceOfUserSuppliedObservationsNotAutomaticallyVerified:true},
  originalField:{
   mazeEpisodes:brain.disc?.episodes||0,
   floorConductance:brain.disc?.conduct(KIND.floor)??null,
   targetAttraction:brain.disc?.attract(KIND.target)??null,
   originalAlgorithm:"Discoverer.shape / shapeGraph / V31 sparse-exact-equation"},
  recordedNoise:brain.noiseAgent?.status?.()||null,
  scientificGates:{
   originalVDashboardAndAtlasUnchanged:true,
   V31MillionStateResearchTestSeparate:true,
   unrestrictedSemanticQA70PercentProven:false,
   cudaHardwareBenchmarkThisRequest:false
  }
 };
}
export function v34LiveResearch(brain,payload={}){
 const s=sameBrainSession(brain);
 if(!payload||typeof payload!=="object"||Array.isArray(payload))
  throw Error("Real V34 JSON request expected");
 const type=payload.type||"status";
 if(type==="status")return status(brain,s);
 if(type==="numeric-observe"){
  // This can add verified-labelled SOURCE observations ONLY when the
  // connected human/physical world explicitly supplies before and after.
  // It is evidence supplied by an external source, NOT independently
  // executed physical validation inside this algorithm.
  if(payload.actualActionWitness!==true)
   throw Error("Explicit actualActionWitness=true required; do not turn a predicted text edit into causal evidence");
  const before=raw(payload.before,"Actual before",2000),
   after=raw(payload.after,"Actually observed after",2000);
  const observed=s.causal.observePair(before,after);
  return {operation:"actual-external-numeric-observation",
   evidence:observed,externalSourceAttestation:true,
   externalPhysicsIndependenceNotProvenByUI:true,
   originalBrainNowStoresEvidence:true,
   causalNumericWitnesses:s.causal.memory.witnessed,
   originalBrainCheckpointSaved:false,
   requiresUserToSaveOriginalBrain:true};
 }
 if(type==="numeric-plan"){
  const start=raw(payload.start,"Unseen starting numeric world",5000);
  const dependentDelta=bounded(payload.dependentDelta,-10000,10000,"dependentDelta");
  if(dependentDelta===0)throw Error("Goal delta must be nonzero");
  const result=s.causal.plan({start,dependentDelta,includeAtlas:payload.includeAtlas!==false});
  return {operation:"exact-original-numeric-graph-first-shape",
   ...result,originalNativeBrain:true,
   taskProvidedNumericDelta:true,goalAnswerNotGiven:true,
   proposedActionsOnlyUntilIndependentEnvironmentExecution:true,
   originalSemanticQANotProven:true};
 }
 if(type==="character-status"){
  const c=collectObservedCharacterHypotheses(brain,s);
  return {operation:"real-original-V17-corpus-to-Unicode-transformations",
   ...c.originalV17ContrastProvenance,
   characterRuleClasses:c.evidence.size,
   structurallyReusableHypotheses:c.transferable().length,
   rules:c.transferable().slice(0,100).map(r=>({
    kind:r.op,from:r.from,to:r.to,
    corpusSentenceExamples:r.sourcePairs.length,
    differentContexts:r.wordContexts.length,
    actualIndependentWorldValidation:r.accepted>0,
    sampleSourcePairs:r.sourcePairs.slice(0,3)})),
   sourceIsNotIndependentPhysics:true,
   originalBrainCheckpointAlreadyStoresUnderlyingTextEvidence:true};
 }
 if(type==="character-plan"){
  const c=collectObservedCharacterHypotheses(brain,s);
  const start=raw(payload.start,"Unseen character world",4096);
  if(!payload.charSlots||typeof payload.charSlots!=="object"||
    Array.isArray(payload.charSlots))
   throw Error("Explicit character goal slots required; no hidden answer oracle");
  const keys=Object.entries(payload.charSlots);
  if(!keys.length||keys.length>50)
   throw Error("Choose 1..50 actual required character positions");
  const slots={};
  for(const [key,value] of keys){
   const at=bounded(key,0,4095,"Character coordinate");
   if(typeof value!=="string"||Array.from(value).length!==1)
    throw Error("Goal value must be exactly one Unicode codepoint");
   slots[at]=value;
  }
  const plan=c.formSolution(start,{charSlots:slots},{
   maxNodes:bounded(payload.maxNodes??800,2,5000,"maxNodes"),
   maxDepth:bounded(payload.maxDepth??6,1,16,"maxDepth"),
   transfer:payload.allowCorpusHypotheses===true
  });
  return {
   operation:"original-Discoverer-character-level-first-shape",
   found:plan.found,reason:plan.reason,
   plannedBeforeAnyPhysicalAction:true,
   candidatePath:plan.firstPrediction||[],
   observedSourceEvidence:c.originalV17ContrastProvenance,
   knownWorldGraph:plan.world,
   depthAndNodeDesignLimits:plan.world?.diagnostics||null,
   unverifiedHypothesesAllowed:payload.allowCorpusHypotheses===true,
   externalPhysicalCorrectnessProven:false,
   original5DCoordinatePathProven:false,
   fullAnswerSemanticsNotProven:true};
 }
 throw Error("Unknown V34 live research request type");
}
