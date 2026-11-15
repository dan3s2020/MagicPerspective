// Continue ACTUALLY SAVED ORIGINAL Braivour Brain training, not a fresh instance.
// Input: prior real .v8 checkpoint from independent verified run 43749811152
// Output: new whole .v8 checkpoint after additional genuine sound-world episodes.
// Does NOT train on heldout cats/owners; evaluates the SAME tasks before/after.
// No original source files altered. No separate sound/AI model.
//
// This stage tests whether extra action-consequence episodes improve path
// efficiency or reachability after 320 earlier games. A zero/negative gain is
// a measured result; it is NOT concealed behind a new easier target.
import fs from 'node:fs';
import path from 'node:path';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {NativeTemporalAuditoryBody} from './native_temporal_body.mjs';

const ORIGINAL='runtime/catmeows/Original_Braivour_CatMeows_TemporalBody.v8';
const INPUT='runtime/catmeows/generative_perception.json';
const OUTPUT='runtime/catmeows/Original_Braivour_CatMeows_TemporalBody_Continued.v8';
const PROOF='runtime/catmeows/native_body_continued_training_audit.json';
const ROUNDS=Number(process.env.CATMEOWS_CONTINUE_GAMES??220);
if(!Number.isInteger(ROUNDS)||ROUNDS<10||ROUNDS>800)throw Error('Invalid native additional training episode count');
if(!fs.existsSync(ORIGINAL)||!fs.existsSync(INPUT))
 throw Error('Saved actual organism and verified PCM-derived sensory input are required: never synthesize training data');
const data=JSON.parse(fs.readFileSync(INPUT,'utf8'));
if(data.recordings.length!==440||data.sensory_frames!==48)
 throw Error('Expected actual full original CatMeows 440 WAV sensory input');
const rows=data.recordings;
const parents=new Map();
function root(k){if(!parents.has(k))parents.set(k,k);const p=parents.get(k);if(p!==k)parents.set(k,root(p));return parents.get(k);}
function join(a,b){const x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
for(const r of rows)join('cat:'+r.cat,'owner:'+r.owner);
const component=new Map();
for(const r of rows){
 const key=root('cat:'+r.cat),obj=component.get(key)||{owners:new Set(),count:0};
 obj.owners.add(r.owner);obj.count++;component.set(key,obj);
}
const foldOwners=[new Set(),new Set(),new Set()],counts=[0,0,0];
for(const g of [...component.values()].sort((a,b)=>b.count-a.count)){
 const idx=counts.indexOf(Math.min(...counts));counts[idx]+=g.count;
 for(const owner of g.owners)foldOwners[idx].add(owner);
}
const train=rows.filter(r=>!foldOwners[0].has(r.owner)),
 held=rows.filter(r=>foldOwners[0].has(r.owner));
if(train.length!==252||held.length!==188||
   train.some(x=>held.some(y=>x.cat===y.cat||x.owner===y.owner)))
 throw Error('Checkpoint fold-0 data identity mismatch; do NOT continue on different cats');
const brain=Brain.load(ORIGINAL);
if(!brain.auditoryBody || !brain.disc || !brain.constructedPaths?.links)
 throw Error('Original save lost its real acoustic body');
Object.setPrototypeOf(brain.auditoryBody,NativeTemporalAuditoryBody.prototype);
brain.auditoryBody.brain=brain;
const body=brain.auditoryBody;
if(body.recordingsLived!==252||body.seen.length!==144||body.adjacency.length!==144)
 throw Error('Checkpoint is not original fold 0, 252 real-cat-WAV Brain');
const initial={
 file:ORIGINAL,bytes:fs.statSync(ORIGINAL).size,
 nativeEpisodes:brain.disc.episodes,
 originalNativeBodySelf:brain.disc.self(),
 actualMotorEffects:[0,1,2,3,4,5,6,7].map(a=>brain.disc.effect(a)),
 originalNativeGraphObservations:brain.constructedPaths.links.observations,
 genuineWAVsSeenBySavedBrain:body.recordingsLived,
 acousticCellsSeenBySavedBrain:body.cells.length,
 nativeBrainLivedSteps:brain.lived,
 bodyAttenuation:[0,1,2,3].map(k=>brain.disc.conduct(k)),
 bodyNativeTargetAttraction:[0,1,2,3].map(k=>brain.disc.attract(k))
};
if(initial.originalNativeBodySelf!==3||initial.actualMotorEffects.filter(Boolean).length!==4)
 throw Error('The original Brain did not actually learn bodily self and its actions');
if(initial.nativeEpisodes<320)
 throw Error('Original 320-game learned Brain checkpoint unexpectedly lost its training');
const trainTasks=train.map(x=>body.fromRecording(x)).filter(Boolean);
const eligibleHeldout=held.map(x=>body.fromRecording(x)).filter(Boolean);
if(trainTasks.length<240||eligibleHeldout.length<160)
 throw Error('Native whole acoustic world does not support its original baseline');
const evaluation=eligibleHeldout.slice(0,160);
function testFrozen(name){
 const before={learnedEdges:brain.constructedPaths.links.observations,
   episodes:brain.disc.episodes,lived:brain.lived};
 const results=evaluation.map((e,i)=>{
  const r=body.frozenPlay(e);
  return {recording:e.source,steps:r.steps,solved:r.solved,optimal:r.optimal,
    path:r.path,planCorrectPrefix:r.firstNativeShapeCorrectPrefix,
    originalBodySelf:r.nativeBodySelf,
    pathWasActuallyObserved:r.allPhysicalPathsFollowActuallyExperiencedAudioTransitions};
 });
 if(before.learnedEdges!==brain.constructedPaths.links.observations||
    before.episodes!==brain.disc.episodes||before.lived!==brain.lived)
  throw Error('Unseen data contaminated the original Brain during frozen evaluation');
 const solved=results.filter(x=>x.solved).length;
 const steps=results.reduce((s,x)=>s+x.steps,0);
 const optimum=results.reduce((s,x)=>s+x.optimal,0);
 const unnecessarilyLong=results.filter(x=>x.solved&&x.steps>x.optimal*2).length;
 return {stage:name,evaluated:results.length,solved,meanSteps:steps/results.length,
  optimalMean:optimum/results.length,meanStepsPerOptimal:steps/Math.max(1,optimum),
  moreThanDoubleOptimal:unnecessarilyLong,
  actionsAlongPhysicallyObservedAudioTransitions:results.every(x=>x.pathWasActuallyObserved),
  originalBodySelf:brain.disc.self(),
  resultRows:results};
}
const baseline=testFrozen('BEFORE_continued_training_from_unchanged_original_checkpoint');
const lesson=[];
for(let i=0;i<ROUNDS;i++){
 // AFTER original 320-episode curriculum, only full acoustic targets, not
 // trivial first-neighbour tasks. The native player chooses and feels moves.
 const t=trainTasks[(i*23+37)%trainTasks.length],result=body.train(t);
 lesson.push({episode:i+321,realRecording:t.source,
  solved:result.solved,steps:result.steps,optimal:result.optimal,
  originalNativeShapeCorrectPrefix:result.firstNativeShapeCorrectPrefix,
  originalBodyRecognizedSelf:result.nativeBodySelf===3});
}
const after=testFrozen('AFTER_continued_training_in_exact_same_original_Brain');
if(after.solved<baseline.solved)
 console.log('CATMEOWS_CONTINUED_NATIVE_BODY_REGRESSION_SAVED_AS_EVIDENCE '+JSON.stringify({
  before:baseline.solved,after:after.solved}));
const originalBody=body.brain;body.brain=null;
let checkpointBytes;
try{checkpointBytes=brain.save(OUTPUT);}
finally{body.brain=originalBody;}
if(!fs.existsSync(OUTPUT)||checkpointBytes<1000000)
 throw Error('Continued original Brain checkpoint was not written');
const restored=Brain.load(OUTPUT);
if(!restored.auditoryBody||!restored.disc)throw Error('Original Brain learner missing after save/resume');
Object.setPrototypeOf(restored.auditoryBody,NativeTemporalAuditoryBody.prototype);
restored.auditoryBody.brain=restored;
const verify=restored.auditoryBody.frozenPlay(evaluation[0]);
if(!verify.solved||restored.disc.episodes!==brain.disc.episodes||
   restored.constructedPaths.links.observations!==brain.constructedPaths.links.observations)
 throw Error('Continued original Brain checkpoint is not actually resumable');
const genuinelyNew=restored.auditoryBody.dream({seed:910253,length:48});
if(!genuinelyNew.stats.everyDreamTransitionInNativeActualAudioGraph)
 throw Error('Resumed original Brain imagined fake audio movement');
const report={
 status:'REAL_ORIGINAL_BRAIVOUR_BRAIN_CHECKPOINT_CONTINUED_AND_RELOADED',
 gitSource:'MagicPerspective experiment/CATMEOWS-CONTINUE-NATIVE-BODY-20261116',
 originalSavedCheckpointUnmodified:true,additionalWAVsAbsorbed:0,
 actualNewNativeTrainingGames:ROUNDS,
 originalCatMeowsTrainWAVs:train.length,
 originallyHeldOutCatMeowsWAVs:held.length,
 neverTrainOnHeldoutCats:true,
 originalBrainOnly:true,
 noTrainedExternalModel:true,
 initial,
 beforeFrozen:baseline,
 afterFrozen:after,
 additionalTraining:{games:lesson.length,solved:lesson.filter(x=>x.solved).length,
   meanSteps:lesson.reduce((s,x)=>s+x.steps,0)/lesson.length,
   first50:lesson.slice(0,50).filter(x=>x.solved).length,
   last50:lesson.slice(-50).filter(x=>x.solved).length,
   uniqueRealTrainingRecordingsUsed:new Set(lesson.map(x=>x.realRecording)).size,
   rawNativeActionsAndResults:lesson},
 finalCheckpoint:{path:OUTPUT,bytes:checkpointBytes,
   totalOriginalEpisodes:restored.disc.episodes,
   originalBrainOnly:true,reloadVerified:true,
   originalNativeMotorEffects:[0,1,2,3,4,5,6,7].map(x=>restored.disc.effect(x)),
   originalRealAudioGraphObservations:restored.constructedPaths.links.observations},
 newDreamAfterReload:genuinelyNew
};
fs.writeFileSync(PROOF,JSON.stringify(report,null,2));
console.log('CATMEOWS_ORIGINAL_BRAIN_REAL_CONTINUED_TRAINING '+JSON.stringify({
 initial,numberOfActualAddedGames:ROUNDS,
 gamesWon:report.additionalTraining.solved,
 originalNoAudioDataAdded:true,
 before:{solved:baseline.solved,total:baseline.evaluated,
  meanSteps:baseline.meanSteps,meanStepsPerOptimal:baseline.meanStepsPerOptimal},
 after:{solved:after.solved,total:after.evaluated,
  meanSteps:after.meanSteps,meanStepsPerOptimal:after.meanStepsPerOptimal},
 finalCheckpoint:report.finalCheckpoint,
 restoredBrainDream:genuinelyNew.stats
}));
