// CatMeows isn't an audio classifier in this test. This is a real playable
// world whose physical cells ARE observed combinations of real meow pitch and
// loudness. The ORIGINAL MagicPerspective Brain is the player and only actor.
//
// Body is native Brain.disc; no oracle moves are given, exactly as playExercise.
// It must discover its own outputs by living their physical acoustic effects.
// Target-conditioned playback of an unseen cat's early/final acoustic locations
// never reveals the heldout recording's intervening future observations.
// Actual sound is reconstructed from paths the body takes, not a canned WAV.
//
// Important distinction: "reaches acoustic target" is NOT a scientific claim
// of language translation or acoustic grammar. The physical movement directions
// are the ORIGINAL maze 4-direction actuator set, embedded in acoustic space.
// This trial tests native embodied sound control, not passive token prediction.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {NativeAuditoryBody} from './auditory_body.mjs';

const DATA='runtime/catmeows/generative_perception.json';
if(!fs.existsSync(DATA))throw Error('Real original CatMeows WAV-derived 48x9 auditory data missing');
const inputs=JSON.parse(fs.readFileSync(DATA,'utf8'));
if(inputs.recordings.length!==440)throw Error('The full 440 CatMeows recordings are required');
const rows=inputs.recordings,RULES={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const identity=new Map();
function root(k){if(!identity.has(k))identity.set(k,k);const p=identity.get(k);if(p!==k)identity.set(k,root(p));return identity.get(k);}
function join(a,b){const x=root(a),y=root(b);if(x!==y)identity.set(x,y);}
for(const r of rows)join('cat:'+r.cat,'owner:'+r.owner);
const grouped=new Map();
for(const r of rows){const k=root('cat:'+r.cat),v=grouped.get(k)||{cats:new Set(),owners:new Set(),count:0};v.cats.add(r.cat);v.owners.add(r.owner);v.count++;grouped.set(k,v);}
const foldOwners=[new Set(),new Set(),new Set()],weights=[0,0,0];
for(const group of [...grouped.values()].sort((a,b)=>b.count-a.count)){
 const k=weights.indexOf(Math.min(...weights));weights[k]+=group.count;
 for(const owner of group.owners)foldOwners[k].add(owner);
}
const FOLD=Number(process.env.CATMEOWS_BODY_FOLD??0);
if(![0,1,2].includes(FOLD))throw Error('Only true cat-disjoint folds 0,1,2 are accepted');
const train=rows.filter(r=>!foldOwners[FOLD].has(r.owner)),
 held=rows.filter(r=>foldOwners[FOLD].has(r.owner));
if(held.some(x=>train.some(y=>x.cat===y.cat||x.owner===y.owner)))throw Error('Cat or owner leakage');
const ORDER=process.env.CATMEOWS_BODY_AUDIO_ORDER||'chronological';
if(!['chronological','shuffled'].includes(ORDER))throw Error('Unrecognized true audio chronological control');
function random(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(arr,seed){const a=arr.slice(),r=random(seed);for(let i=a.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const brain=new Brain({rules:RULES,seed:733});
const body=new NativeAuditoryBody(brain);
for(let i=0;i<train.length;i++){
 const r=train[i];
 const source=ORDER==='chronological'?r:
   {...r,frames:shuffle(r.frames,60011+i*17)};
 body.absorb(source);
}
const sensed=body.finishPerception();
const trainTasks=train.map(x=>body.fromRecording(x)).filter(Boolean);
const unseenTasks=held.map(x=>body.fromRecording(x)).filter(Boolean);
console.log('CATMEOWS_REAL_NATIVE_BODY_SENSING '+JSON.stringify({
 fold:FOLD,trainN:train.length,unseenN:held.length,
 order:ORDER,trainTasks:trainTasks.length,unseenTasks:unseenTasks.length,...sensed}));
if(trainTasks.length<12||unseenTasks.length<8)
 throw Error('Genuine auditory support is too sparse: cannot validate original body without inventing world states');
const priorEffects=[0,1,2,3,4,5,6,7].map(x=>brain.disc.effect(x));
const learnRuns=[];
const games=Number(process.env.CATMEOWS_BODY_GAMES??320);
if(!Number.isInteger(games)||games<50||games>750)throw Error('Training games 50..750 only');
for(let i=0;i<games;i++){
 const task=trainTasks[(i*17+Math.floor(i/Math.max(1,trainTasks.length)))%trainTasks.length];
 const res=body.train(task);
 learnRuns.push({i,solved:res.solved,steps:res.steps,optimal:res.optimal,
    learnedSelf:res.knows?.knows??res.knows?.self,
    effects:res.knows?.moves,wallRepels:res.knows?.wallRepels,targetAttracts:res.knows?.targetAttracts});
 if(i===0||i===24||i===99||i===199||i===games-1){
  const scope=learnRuns.slice(Math.max(0,i-49));
  console.log('CATMEOWS_BODY_TRAIN_CHECKPOINT '+JSON.stringify({
   gamesDone:i+1,lastWindow:scope.length,
   solveRate:scope.filter(r=>r.solved).length/scope.length,
   originalDiscovererSelf:brain.disc.self(),
   learnedOutputEffects:[0,1,2,3,4,5,6,7].map(a=>brain.disc.effect(a)),
   actualOriginalBodyTrust:brain.disc.trust}));
 }
}
const evalLength=Math.min(100,unseenTasks.length),evaluation=unseenTasks.slice(0,evalLength);
const frozenBefore={lived:brain.lived,learnedObservations:brain.constructedPaths.links.observations,
 episodes:brain.disc.episodes};
const results=[],control=[];
for(let i=0;i<evaluation.length;i++){
 const task=evaluation[i];
 const candidate=body.frozenPlay(task);
 const cold=body.frozenPlay(task,{cold:true});
 const entry={index:i,source:task.source,heldoutCat:held.find(x=>x.name===task.source)?.cat??null,
   native:candidate.solved,randomBaseline:cold.solved,
   nativeSteps:candidate.steps,coldSteps:cold.steps,
   optimal:task.world.dist[task.world.start],
   originalBodyKnewItself:candidate.originalBodyHadLearnedSelf,
   originalShapeOffered:candidate.nativeShapeWasAvailable,
   initialNativeShapeLength:candidate.originalShapeFirstLength,
   firstShapeCorrectPrefix:candidate.originalShapeFirstCorrectPrefix,
   originalNativeMotorMovements:candidate.originalNativeMotorMovements,
   nativePath:candidate.path,coldPath:cold.path,
   futureUnseenAudioFramesShownToBrain:false};
 results.push(entry);
}
if(brain.disc.episodes!==frozenBefore.episodes||
   brain.lived!==frozenBefore.lived||
   brain.constructedPaths.links.observations!==frozenBefore.learnedObservations)
 throw Error('Heldout auditory world caused training update — invalid frozen results');
const solved=results.filter(r=>r.native).length,randomSolved=results.filter(r=>r.randomBaseline).length;
const pathPlans=results.filter(r=>r.originalShapeOffered).length;
const candidateStart=trainTasks.find(x=>x.world.dist[x.world.start]>=3)||trainTasks[0],
 heldoutStart=evaluation.find(x=>x.world.dist[x.world.start]>=2)||evaluation[0];
const priorWorld=brain.liveWorld;
brain.liveWorld='auditory';
const dreams=[
 {id:'body_free_dream_01',type:'organism-chooses-native-goals-from-its-lived-real-acoustics',
  ...body.dream({seed:18201,length:48})},
 {id:'body_free_dream_02',type:'organism-chooses-native-goals-from-its-lived-real-acoustics',
  ...body.dream({seed:37122,length:48})},
 {id:'body_target_conditioned',type:'goal-conditioned-genuine-training-wav-endpoint',
  ...body.dream({seed:97112,length:48,start:candidateStart.world.start,desired:candidateStart.world.goal})},
 {id:'body_unseen_cat_goal',type:'goal-conditioned-unseen-cat-wav-start-and-end-only',
  ...body.dream({seed:44291,length:48,start:heldoutStart.world.start,desired:heldoutStart.world.goal})},
];
brain.liveWorld=priorWorld;
if(brain.disc.episodes!==frozenBefore.episodes||
   brain.lived!==frozenBefore.lived||
   brain.constructedPaths.links.observations!==frozenBefore.learnedObservations)
 throw Error('Imagining changed learning memory — invalid native imagination');
const finalNativeBodyAudit=body.audit();
const output={
 status:'ORIGINAL_BRAIVOUR_NATIVE_AUDITORY_BODY_REAL_WORLD_EXPERIMENT',
 executedRealWaveforms:true,catmeowsDataset:'Zenodo original verified 440 WAV MD5 b5fa911bcd6514e39dfef6876f747df4',
 fixedOriginalBrain:true,
 body:"Brain.auditoryBody + Brain.disc original Discoverer playExercise/learnStep/effect/shape/choose",
 physicalAudioWorld:{axisX:"genuine-cat-voice-pitch-level",axisY:"genuine-cat-voice-loudness-level",
   passableStateConstraint:"state actually perceived in a train-only genuine cat WAV",
   fullEmbodiedSound:"nine original physical auditory parameters stored in native body, no generated WAV read from donor",
   bodyActuation:"original 8 output symbols: four move the sonic body by one physical acoustic cell, shuffled meaning learned only from consequences",
   goal:"known target end-of-call acoustic state; target-conditioned, NOT intention/semantics",
   caveat:"2D control physics is defined for the audio game; not proven to be natural cat vocal anatomy"},
 fold:FOLD,trainingAudioOrder:ORDER,
 inputProvenance:{trainingCats:new Set(train.map(x=>x.cat)).size,
     heldoutCats:new Set(held.map(x=>x.cat)).size,trainWAVs:train.length,unseenWAVs:held.length},
 trueSoundWorld:sensed,
 gamesPlayed:learnRuns.length,trainingGameWinRate:learnRuns.filter(r=>r.solved).length/learnRuns.length,
 learnedOriginalNativeBody:{priorEffects,afterEffects:[0,1,2,3,4,5,6,7].map(a=>brain.disc.effect(a)),
   nativeSelf:brain.disc.self(),trust:brain.disc.trust,
   nativeConductance:[0,1,2,3].map(k=>brain.disc.conduct(k)),
   nativeAttraction:[0,1,2,3].map(k=>brain.disc.attract(k))},
 heldout:{
   evaluatedTasks:results.length,originalBrainWinRate:solved/results.length,
   coldOriginalBrainWinRate:randomSolved/results.length,
   originalBrainPlanAvailabilityRate:pathPlans/results.length,
   exactSameUnseenTasksForBaseline:true,
   frozenEvaluation:true,
   futureAcousticFramesHiddenExceptVisibleGoal:true
 },imagined:dreams.map(d=>({
   id:d.id,type:d.type,stats:d.stats,
   frames:d.frames,cells:d.cells,
   actualNativeBodyActionSymbols:d.actions,attendedGoals:d.requestedGoals,
   noWaveformCutPaste:true,noSeparateGenerativeModel:true
 })),
 trainingGameMetrics:learnRuns,
 heldoutGameMetrics:results
};
fs.mkdirSync('runtime/catmeows',{recursive:true});
fs.writeFileSync('runtime/catmeows/native_embodied_audio_game.json',JSON.stringify(output,null,2));
console.log('CATMEOWS_REAL_EMBODIED_AUDIO_BODY_COMPLETE '+JSON.stringify({
 fold:FOLD,order:ORDER,trainedAudioWorldCells:sensed.experiencedCells,
 gameTrainingTrials:games,trainingSuccess:output.trainingGameWinRate,
 heldoutGames:results.length,heldoutNativeWinRate:solved/results.length,
 heldoutColdOriginalBrainWinRate:randomSolved/results.length,
 nativeLearnedBody:output.learnedOriginalNativeBody,
 dreams:dreams.map(x=>({id:x.id,stats:x.stats}))
}));
