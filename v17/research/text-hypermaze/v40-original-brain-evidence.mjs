// V40: measured integration, not a surrogate unified semantic learner.
// Same original V34 Brain.v8 owns BOTH the V36 learned witnessed intent
// history and V39 real human answer-span weights. Original Discoverer.shape
// and Discoverer.shapeGraph implement two *different* original paths.
// Never assert that a path in either graph physically verifies the other.
import {Brain} from '../../transcend/torus-aether/devour/brain.mjs';
import {LearnedCognitiveMap} from '../../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {observeInstructionTrajectory} from '../../transcend/torus-aether/worlds/observed-instruction-goals.mjs';
import {answerFromObservedInstructionPath}
 from '../../transcend/torus-aether/worlds/path-answer-writer.mjs';
import {NativeRealTextEvidencePaths} from './real-squad-evidence-paths.mjs';

const fmtReason=e=>e instanceof Error?e.message:String(e);
function cloneEntries(rows) {
 return Array.isArray(rows)?rows.map(([key,val])=>[key,structuredClone(val)]):[];
}
const fresh=()=>({
 version:1,observedTextWorlds:0,observedTaskEpisodes:0,firstTryQueries:0,
 cognitiveSnapshot:null,instructionGoalEntries:[],
 instructionGoalEpisodes:0,lastDiagnostic:null
});
export class V40OriginalBrainEvidence {
 constructor(brain){
  if(!(brain instanceof Brain))throw Error('Original V34 Brain instance required');
  this.brain=brain;
  const state=brain.v40UnifiedEvidence ||=fresh();
  if(state.version!==1)throw Error('Unsupported V40 integrated memory');
  this.state=state;
  this.qa=new NativeRealTextEvidencePaths(brain);
  this.map=state.cognitiveSnapshot?
    LearnedCognitiveMap.restore(state.cognitiveSnapshot):
    new LearnedCognitiveMap({maxExamples:4000,maxRules:30000,maxNodes:768,maxDepth:12});
  this.map.instructionGoalMemory=new Map(cloneEntries(state.instructionGoalEntries));
  this.map.instructionGoalEpisodes=state.instructionGoalEpisodes||0;
 }
 persist(){
  this.state.cognitiveSnapshot=this.map.export();
  this.state.instructionGoalEntries=cloneEntries([...this.map.instructionGoalMemory]);
  this.state.instructionGoalEpisodes=this.map.instructionGoalEpisodes||0;
  return this.state;
 }
 observeTextWorld(text,sourceId){
  if(typeof sourceId!=='string'||!sourceId)throw Error('Source episode provenance required');
  const result=this.map.observeWorld(text,{id:sourceId});
  this.state.observedTextWorlds++;
  this.persist();
  return result;
 }
 observeInstructionEpisode({instruction,states,episodeId,executedTransitionsObserved=false}){
  // Supply actual observed before/after states, never fabricate them from
  // the target word or from a heldout test answer.
  const result=observeInstructionTrajectory(this.map,{
    instruction,states,episodeId,executedTransitionsObserved
  });
  if(result.ok)this.state.observedTaskEpisodes++;
  this.persist();
  return result;
 }
 trainHumanQA(samples,{epochs=2,snapshotEvery=200,burnIn=400}={}){
  // Gold source span offsets are allowed *only* at supervised TRAIN time.
  const result=this.qa.trainAveraged(samples,{epochs,snapshotEvery,burnIn});
  this.persist();
  return result;
 }
 planObservedInstruction({instruction,source,allowComposedInstructions=false,
   maxDepth=8,maxNodes=384,maxTokens=512,externalStep=null}={}){
  if(typeof instruction!=='string'||typeof source!=='string')
   throw Error('Question intent and full source are required');
  const original=JSON.stringify(this.map.export());
  const record=JSON.stringify([...this.map.instructionGoalMemory]);
  const beforeQA=this.qa.memory.updates;
  const plan=answerFromObservedInstructionPath(this.map,{instruction,source},
   {allowComposedInstructions,maxDepth,maxNodes,maxTokens,
    includeAtlas:true,externalStep});
  if(JSON.stringify(this.map.export())!==original||
     JSON.stringify([...this.map.instructionGoalMemory])!==record||
     this.qa.memory.updates!==beforeQA)
   throw Error('Frozen instruction prediction modified shared Brain learning');
  this.state.firstTryQueries++;
  this.state.lastDiagnostic={kind:'instruction-goal',found:plan.found,
    reason:plan.reason||null,originalMotor:plan.source,
    learnedIntentEvidences:plan.evidence?.sourceTrainingEpisodes?.length||0,
    candidateStates:plan.sourceStatesConsidered||0,
    note:'Finite witnessed instruction intent; not arbitrary human language'};
  return {kind:'instruction-goal',...plan,
    originalSharedBrain:true,trainedHumanQAWeights:this.qa.memory.averagedWeights?.size||0,
    sharedCheckpointMemory:true};
 }
 planHumanQA({question,context,weightMode='average',includeAtlas=true}={}){
  if(typeof question!=='string'||typeof context!=='string')
   throw Error('Real human question and complete observed source passage required');
  const before=this.qa.memory.updates;
  const snapshot=JSON.stringify(this.map.export());
  const plan=this.qa.plan({question,context,weightMode,includeAtlas});
  if(this.qa.memory.updates!==before||JSON.stringify(this.map.export())!==snapshot)
   throw Error('Frozen human QA evaluation modified original Brain');
  this.state.firstTryQueries++;
  this.state.lastDiagnostic={kind:'human-extractive',found:plan.found,
    reason:plan.reason||null,originalMotor:plan.originalMotor,
    states:plan.graph?.states||0,
    goalInferredBy:'supervised question-to-source-span preference',
    note:'Independent V39 ranker chooses goal; shapeGraph navigates the source evidence graph'};
  return {kind:'human-extractive',...plan,originalSharedBrain:true,
    witnessedIntentCount:this.state.observedTaskEpisodes,
    sharedCheckpointMemory:true,
    independentSemanticPhysicsVerified:false};
 }
 // Strictly one routing decision by caller: do not silently reclassify
 // unknown semantic questions as known finite edit intents.
 answer(request){
  if(request?.kind==='instruction-goal')return this.planObservedInstruction(request);
  if(request?.kind==='human-extractive')return this.planHumanQA(request);
  return {found:false,answer:null,reason:'UNKNOWN_TASK_FAMILY_NO_ORACLE_FALLBACK'};
 }
 report(){
  return {sameBrain:true,learnedHumanQAExamples:this.qa.memory.acceptedPairs,
    learnedHumanQAFeatures:this.qa.memory.weights.size,
    averagedHumanQAFeatures:this.qa.memory.averagedWeights?.size||0,
    observedWorlds:this.state.observedTextWorlds,
    instructionTaskEpisodes:this.state.observedTaskEpisodes,
    intentClasses:this.map.instructionGoalMemory.size,
    originalMazeEpisodes:this.brain.disc.episodes||0,
    checkpointMethod:'Brain.save / Brain.load original V17',
    limitations:'Two original field routes coexist in the same Brain checkpoint, not a proven single semantic world graph'};
 }
}
