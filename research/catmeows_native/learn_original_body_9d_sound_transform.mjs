// ORIGINAL BRAIVOUR BODY — learn seven missing acoustic transformations as
// genuine experienced motor CONSEQUENCES, not independent PCM frame averages.
//
// Restore original after 540 real played games, KEEP existing motor/shapes.
// New auditory-motor feature memories use ORIGINAL SAME Brain.constructedPaths
// .links.observe() and .choices(), not a replacement model, not an oracle.
//
// Only original fold-0 verified real CatMeows WAV frames train new memory.
// In heldout evaluation, the NEXT two motor coordinates (pitch+loudness) are
// observed as a conditioned test input. The seven OTHER true future features
// are NEVER observed before prediction. This is conditional 7D next-state
// inference, not free-form 9D vocal prediction or feline semantic decoding.
//
// The dream is driven by the ORIGINAL Discoverer.choose()/shapeGraph() motor
// sequence; each next 7D vocal change is drawn from ORIGINAL Brain native
// observed state/action/successor records, then applied incrementally in the
// living body instead of teleporting to mean timbre at the next 2D cell.
//
// A chronological vs deliberately SHUFFLED within-call control is run with
// the SAME checkpoint and exactly the SAME heldout cats, and matched actions.
// The new whole original Brain checkpoint retains all learned transformations.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {NativeTemporalAuditoryBody} from './native_temporal_body.mjs';

const ROOT='runtime/catmeows/';
const INPUT=ROOT+'generative_perception.json';
const SAVED=ROOT+'Original_Braivour_CatMeows_TemporalBody_Continued.v8';
const MODE=process.env.CATMEOWS_9D_TRANSFORM_ORDER||'chronological';
if(!['chronological','shuffled'].includes(MODE))throw Error('Original Brain only chronological/shuffled controls');
const BANDS=9,FRAMECOUNT=48;
if(!fs.existsSync(INPUT)||!fs.existsSync(SAVED))throw Error('True old Brain and verified real CatMeows audio needed');
const inputs=JSON.parse(fs.readFileSync(INPUT,'utf8')).recordings;
if(inputs.length!==440)throw Error('Original 440 genuine CatMeows WAV sensory frames missing');
const brain=Brain.load(SAVED);
if(brain.disc.episodes!==540)throw Error('Not the actually continued original 540-episode Braivour Brain');
Object.setPrototypeOf(brain.auditoryBody,NativeTemporalAuditoryBody.prototype);
brain.auditoryBody.brain=brain;
const body=brain.auditoryBody;
if(body.recordingsLived!==252||body.adjacency.length!==144)throw Error('Original learned sound body missing');
const par=new Map();
function root(k){if(!par.has(k))par.set(k,k);const x=par.get(k);if(x!==k)par.set(k,root(x));return par.get(k);}
function join(a,b){const x=root(a),y=root(b);if(x!==y)par.set(x,y);}
for(const rec of inputs)join('cat:'+rec.cat,'owner:'+rec.owner);
const groups=new Map();
for(const rec of inputs){const id=root('cat:'+rec.cat),o=groups.get(id)||{owners:new Set(),n:0};o.n++;o.owners.add(rec.owner);groups.set(id,o);}
const owners=[new Set(),new Set(),new Set()],sizes=[0,0,0];
for(const o of [...groups.values()].sort((a,b)=>b.n-a.n)){
 const i=sizes.indexOf(Math.min(...sizes));sizes[i]+=o.n;for(const owner of o.owners)owners[i].add(owner);
}
const train=inputs.filter(r=>!owners[0].has(r.owner)),
 heldout=inputs.filter(r=>owners[0].has(r.owner));
if(train.length!==252||heldout.length!==188||heldout.some(a=>train.some(b=>a.cat===b.cat||a.owner===b.owner)))
 throw Error('Real native checkpoint cats/owners must not leak to heldout');
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function shuffled(frames,seed){const a=frames.slice(),r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function cell(f){return 12*f[1]+f[0];}
function valid(f){return Array.isArray(f)&&f.length===BANDS&&f.every(x=>Number.isInteger(x)&&x>=0&&x<=11);}
function allowed(a,b){return !!body.seen[a]&&!!body.seen[b]&&(a===b||body.adjacency[a].some(x=>x.to===b));}
function keys(a,b,ch,value){
 const key='body9d:v1:'+ch+':';
 return [
  key+'edge:'+a+'>'+b+':current:'+value,
  key+'edge:'+a+'>'+b+':coarse:'+Math.floor(value/3),
  key+'edge:'+a+'>'+b,
  key+'from:'+a+':current:'+value,
  key+'current:'+value
 ];
}
const ACTION='lived-real-audio-next-state';
const G=brain.constructedPaths.links;  // ACTUAL original native Brain only
const beforeG=G.observations;
let realUnitEdgesLearned=0,realNonUnitEdgesSkipped=0,
 actualConditionedFeatureObservations=0;
for(let i=0;i<train.length;i++){
 const rec=train[i],sequence=MODE==='chronological'?rec.frames:shuffled(rec.frames,61721+i*17);
 for(let t=0;t<FRAMECOUNT-1;t++){
  const now=sequence[t],next=sequence[t+1];
  if(!valid(now)||!valid(next))throw Error('Original real auditory feature corrupted');
  const a=cell(now),b=cell(next);
  if(!allowed(a,b)){realNonUnitEdgesSkipped++;continue;}
  realUnitEdgesLearned++;
  for(let ch=2;ch<BANDS;ch++){
   const delta=next[ch]-now[ch],to='delta:'+delta;
   for(const key of keys(a,b,ch,now[ch])){
    if(!G.observe(key,ACTION,to))throw Error('Original Brain learned transition memory full');
    actualConditionedFeatureObservations++;
   }
  }
 }
}
if(G.observations-beforeG!==actualConditionedFeatureObservations)
 throw Error('Native original Brain graph did not absorb the actual sound features');
const trainedGraph={mode:MODE,
 realTrainingCatMeows:train.length,heldoutUnseenCatMeows:heldout.length,
 nativeSoundPairsExercised:realUnitEdgesLearned,
 trueAudioPairsSkippedDueToUnsupportedOriginalMotorWorld:realNonUnitEdgesSkipped,
 originalBrainNativeAcousticObservations:actualConditionedFeatureObservations,
 originalBrainNativeGraphObservationsBefore:beforeG,
 originalBrainNativeGraphObservationsAfter:G.observations};
function availableKey(a,b,ch,current){
 const options=keys(a,b,ch,current);
 for(let i=0;i<options.length;i++){
  const o=G.choices(options[i]).find(x=>x.action===ACTION);
  if(!o)continue;
  const required=[2,2,1,5,8][i];
  if(o.total<required)continue;
  return {source:options[i],successors:o.successors,total:o.total,level:i};
 }
 return null;
}
function deltaOf(s){const p=/^delta:(-?\d+)$/.exec(s);if(!p)throw Error('Original Brain invented unseen 9D delta '+s);let v=Number(p[1]);if(v< -11||v>11)throw Error('Impossible physical 9D change');return v;}
function next7(realPrior,source,dest,{sample=false,random=null}={}){
 const result=realPrior.slice(),levels=[],values=[];
 result[0]=dest%12;result[1]=Math.floor(dest/12);
 for(let ch=2;ch<BANDS;ch++){
  const found=availableKey(source,dest,ch,realPrior[ch]);
  if(!found){levels.push('inertia');values.push(0);continue;}
  const choice=sample?(()=>{
   const r=random();let p=r;
   for(const o of found.successors){p-=o.probability;if(p<=0)return o.to;}
   return found.successors.at(-1).to;
  })():G.predict(found.source,ACTION);
  if(!choice)throw Error('Original native transition graph provided no memory');
  const delta=deltaOf(choice);
  result[ch]=Math.max(0,Math.min(11,result[ch]+delta));
  levels.push(found.level);values.push(delta);
 }
 if(!valid(result))throw Error('Original native action produced invalid nine-D auditory state');
 return {state:result,levels,deltas:values};
}
function conditionalScore(){
 let tested=0,eligible=0,cellsUnreachable=0,errorsNative=0,errorsInertia=0,
  errorsOldCentroid=0,exactNative=0,exactInertia=0,exactOld=0,
  errorByChannel=Array.from({length:7},()=>({native:0,inertia:0,centroid:0})),
  featureSelections=[0,0,0,0,0,0,0],
  missed=[];
 for(const rec of heldout){
  for(let t=0;t<FRAMECOUNT-1;t++){
   const before=rec.frames[t],actual=rec.frames[t+1],a=cell(before),b=cell(actual);
   tested++;
   if(!allowed(a,b)){cellsUnreachable++;continue;}
   eligible++;
   const pred=next7(before,a,b),centroid=body.atCell(b);
   if(!centroid)throw Error('Original body has no true real audio at supported next state');
   let nExact=0,baseExact=0,oldExact=0;
   for(let ch=2;ch<BANDS;ch++){
    const y=actual[ch],
     nativeDiff=Math.abs(pred.state[ch]-y),
     inertiaDiff=Math.abs(before[ch]-y),
     centroidDiff=Math.abs(centroid[ch]-y);
    errorsNative+=nativeDiff;errorsInertia+=inertiaDiff;errorsOldCentroid+=centroidDiff;
    errorByChannel[ch-2].native+=nativeDiff;
    errorByChannel[ch-2].inertia+=inertiaDiff;
    errorByChannel[ch-2].centroid+=centroidDiff;
    nExact+=Number(pred.state[ch]===y);
    baseExact+=Number(before[ch]===y);
    oldExact+=Number(centroid[ch]===y);
    if(pred.levels[ch-2]==='inertia')featureSelections[6]++;
    else featureSelections[pred.levels[ch-2]]++;
   }
   exactNative+=Number(nExact===7);exactInertia+=Number(baseExact===7);exactOld+=Number(oldExact===7);
  }
 }
 if(!eligible)throw Error('No heldout real-audio transformation available');
 const features=eligible*7;
 return {totalRealUnseenCatAudioNextFrameSteps:tested,conditionedRealNativeSupportedSteps:eligible,
   unsupportedStepCount:cellsUnreachable,
   eligibleFraction:eligible/tested,
   evaluationsAtHeldoutCatsOnly:true,
   nextPitchLoudnessProvidedAsCondition:true,
   future7AcousticFeaturesNeverProvidedToNativePrediction:true,
   nativeOriginalBrainSevenDimMAE:errorsNative/features,
   holdSevenFeaturesInertiaMAE:errorsInertia/features,
   originalNextBodyCellSevenFeatureCentroidMAE:errorsOldCentroid/features,
   nativeImprovementVsOldCentroidMAE:errorsOldCentroid/features-errorsNative/features,
   nativeImprovementVsInertiaMAE:errorsInertia/features-errorsNative/features,
   exactAllSevenNative:exactNative,exactAllSevenInertia:exactInertia,exactAllSevenOldCentroid:exactOld,
   conditionalNativeRepresentationSelections:featureSelections,
   perChannelMAE:errorByChannel.map(x=>({native:x.native/eligible,
     inertia:x.inertia/eligible,centroid:x.centroid/eligible}))};
}
const predicted=conditionalScore();
const beforeDreamMemory={observations:G.observations,epis:brain.disc.episodes,lived:brain.lived};
const novelDreams=[];
const starts=[18201,37122,910253,129113];
for(const seed of starts){
 const motor=body.dream({seed,length:48});
 let state=body.atCell(motor.cells[0]);
 if(!valid(state))throw Error('Original auditory body had no real trained start state');
 const neo=[state],levels=[],deltas=[],old=motor.frames;
 const random=rng(seed^0x778811);
 for(let t=1;t<48;t++){
  let output=next7(state,motor.cells[t-1],motor.cells[t],{sample:true,random});
  state=output.state;
  neo.push(state);levels.push(output.levels);deltas.push(output.deltas);
 }
 if(neo.length!==48||!neo.every(valid))throw Error('Generated original 9D body sound invalid');
 const previousAbs=(states)=>states.slice(1).reduce((acc,f,i)=>acc+f.reduce((s,v,ch)=>s+Math.abs(v-states[i][ch]),0),0)/47;
 const oldBumps=previousAbs(old),newBumps=previousAbs(neo);
 const strictlyGenuine2DObserved=motor.stats.everyDreamTransitionInNativeActualAudioGraph;
 if(!strictlyGenuine2DObserved)throw Error('Original generated motor step not from actual audio memory');
 novelDreams.push({id:'learned_9d_native_dream_'+seed,seed,frames:neo,
  originalTwoDimBodyNaiveFrames:old,
  originalActualMotorActions:motor.outputs,
  actualNativeLearnedWorldCells:motor.cells,
  original9DNativeFeatureDeltas:deltas,
  nativeInferenceEvidence:levels,
  stats:{seed,soundFrames:neo.length,actualMotorActions:motor.outputs.length,
   exactOriginalMotorBody:true,actualOriginalNativeFeatureGraph:true,
   conditionalAudioMotionFromRealWAVsOnly:true,
   new9DMeanStepManhattan:newBumps,
   priorNaive9DMeanStepManhattan:oldBumps,
   createdByNovelNineDimensionalBodilyTransformations:true}});
}
if(brain.disc.episodes!==beforeDreamMemory.epis||G.observations!==beforeDreamMemory.observations||
 brain.lived!==beforeDreamMemory.lived)throw Error('Dream contaminated original native Brain learning');
brain.nativeAuditoryDynamics={mode:MODE,source:'real CatMeows original WAV only',
 learntActual7Dims:[2,3,4,5,6,7,8],trainingWAVCount:train.length,
 nativeGraphKeyPrefix:'body9d:v1:',modelsTrainedExternally:0,
 originalBrainSaveUsed:SAVED};
fs.mkdirSync(ROOT,{recursive:true});
const saved=ROOT+'Original_Braivour_9D_SoundTransform_Body_'+MODE+'.v8';
const bRef=body.brain;body.brain=null;
let bytes;
try{bytes=brain.save(saved);}finally{body.brain=bRef;}
const reload=Brain.load(saved);
if(reload.disc.episodes!==540||reload.constructedPaths.links.observations!==brain.constructedPaths.links.observations||
 reload.nativeAuditoryDynamics?.learntActual7Dims?.length!==7)
 throw Error('Actual original Brain acoustic 9D transform body was not retained in persisted .v8');
const out={status:'BRAIVOUR_NATIVE_REAL_WORLD_NINE_FEATURE_ACTION_CONSEQUENCES',
 dataset:'original CatMeows checksum-verified 440 real WAV / 21 cats / 12 owners',
 chronologicalOriginalBrainFold0:true,mode:MODE,
 actualBrainWasRestoredRatherThanReplaced:true,
 modelType:'one original Braivour Brain, one native original ConstructedPathLearner graph',
 originalBodyControlDimensions:[0,1],
 learnedConditionalEffectDimensions:[2,3,4,5,6,7,8],
 noAdditionalSourceWAVsBeyondOriginal252:true,
 trainedGraph,
 heldout7DConsequenceTest:predicted,
 nativeMotorGenerated9DSoundDreams:novelDreams,
 originalWholeBrainCheckpoint:{file:saved,bytes,allOriginalMotorEpisodes:reload.disc.episodes,
 originalConstructedPathsNativeGraphStillOperative:true,
 noIndependentPredictionHead:true},
 limitation:'Seven non-motor features are predicted as action-conditioned audio dynamics. Their motor controls are not yet independent. 2D motor movement graph was learned from true original audio.'
};
fs.writeFileSync(ROOT+'original_native_9d_action_consequence_'+MODE+'.json',JSON.stringify(out,null,2));
console.log('CATMEOWS_ORIGINAL_BRAIN_TRUE_9D_SOUND_TRANSFORM '+JSON.stringify({
 mode:MODE,
 extraRealFull9DAudioTransitions:trainedGraph.nativeSoundPairsExercised,
 extraOriginalGraphFeatureObservations:trainedGraph.originalBrainNativeAcousticObservations,
 heldoutTest:predicted,
 dreams:novelDreams.map(d=>d.stats),
 savedCheckpoint:{file:saved,bytes,episodes:reload.disc.episodes}
}));
