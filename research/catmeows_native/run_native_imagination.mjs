// Actual ORIGINAL Braivour Brain hallucinating / imagining future feline audio
// from its OWN lived native ConstructedPathLearner observations of genuine WAVs.
// No LLM, no attached trained generator, no fake content or hand-written meow
// melodies. The following sound decoder only renders its auditory trajectory.
//
// Generation modes: autonomously from one learned prior acoustic state;
// 3-frame primed continuation from an UNSEEN CAT; shuffled-training control;
// deterministic greedy original Brain native transition readout.
// All outputs include the EXACT 48x9 generated physical state for audit.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';

const SOURCE='runtime/catmeows/generative_perception.json';
const data=JSON.parse(fs.readFileSync(SOURCE,'utf8'));
if(data.recordings.length!==440 || data.sensory_frames!==48 ||
   data.channels!==9 || data.sample_rate!==8000)
 throw Error('Original genuine CatMeows 48x9 waveform observations missing');
const rows=data.recordings;
const ACTION="lived-next-auditory-state";
const RULES={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const N=48,C=9,ORDER=[5,3,1,2,4,0];
const parents=new Map();
function root(k){if(!parents.has(k))parents.set(k,k);let y=parents.get(k);if(y!==k)parents.set(k,root(y));return parents.get(k);}
function join(a,b){let x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
rows.forEach(x=>join("cat:"+x.cat,"owner:"+x.owner));
const components=new Map();
for(const r of rows){const k=root("cat:"+r.cat),a=components.get(k)||{owners:new Set(),n:0};a.owners.add(r.owner);a.n++;components.set(k,a);}
const cs=[...components.values()].sort((a,b)=>b.n-a.n);
const folds=[new Set(),new Set(),new Set()],sizes=[0,0,0];
for(const g of cs){const index=sizes.indexOf(Math.min(...sizes));sizes[index]+=g.n;for(const owner of g.owners)folds[index].add(owner);}
const hold=rows.filter(x=>folds[0].has(x.owner)),train=rows.filter(x=>!folds[0].has(x.owner));
if(hold.some(x=>train.some(y=>x.cat===y.cat||x.owner===y.owner)))throw Error('Cat/owner leakage into original native Brain');
if(train.length<100||hold.length<50)throw Error("Train/test split corrupted");
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(arr,seed){const a=arr.slice(),r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function isValid(a){return Array.isArray(a)&&a.length===C&&a.every(v=>Number.isInteger(v)&&v>=0&&v<=11);}
function senseKeys(frames,j,t){
 const now=frames[t][j],prev=t>0?frames[t-1][j]:now;
 const phase=t<16?"early":t<32?"middle":"late";
 const motion=Math.max(-3,Math.min(3,now-prev));
 const surround=j===0?frames[t][1]:j===C-1?frames[t][C-2]:Math.round((frames[t][j-1]+frames[t][j+1])/2);
 return [
  "auditory:"+j+":state:"+now,
  "auditory:"+j+":state:"+now+":motion:"+motion,
  "auditory:"+j+":state:"+now+":phase:"+phase,
  "auditory:"+j+":state:"+now+":surround:"+Math.floor(surround/3),
  "auditory:"+j+":region:"+Math.floor(now/3)+":movement:"+Math.sign(now-prev),
  "auditory:"+j+":state:"+now+":prior:"+Math.floor(prev/3)+":phase:"+phase
 ];
}
const target=(j,v)=>"auditory:"+j+":state:"+v;
function trainBrain(brain,observations,shuffledTime=false){
 if(brain.constructedPaths.scales.length!==6)
   throw Error("This is not original Braivour native Brain six-scale learner");
 let experiences=0,transitions=0;
 for(const record of shuffle(observations,9181)){
  let frames=record.frames;
  if(frames.length!==N||frames.some(f=>!isValid(f)))throw Error("Real auditory observation invalid");
  if(shuffledTime)frames=shuffle(frames,9181+experiences*19);
  brain.live(245);
  for(let i=0;i<N;i++){
   brain.live(246);
   for(let ch=0;ch<C;ch++)brain.live(20+12*ch+frames[i][ch]);
   brain.live(247);
   if(i>0)for(let ch=0;ch<C;ch++){
    let keys=senseKeys(frames,ch,i-1);
    for(let scale=0;scale<6;scale++){
      if(!brain.constructedPaths.scales[scale].observe(keys[scale],ACTION,target(ch,frames[i][ch])))
        throw Error("Original native graph capacity exceeded");
    }
    transitions++;
   }
  }
  brain.live(248);
  experiences++;
 }
 return {experiences,transitions,nativeGraphStates:brain.constructedPaths.scales.map(x=>x.status())};
}
function pick(brain,frames,j,t,random,mode){
 const keys=senseKeys(frames,j,t),graphs=brain.constructedPaths.scales;
 for(const scale of ORDER){
  const g=graphs[scale],bucket=g.choices(keys[scale]).find(x=>x.action===ACTION);
  if(!bucket || bucket.total<(scale===0?1:2))continue;
  const selected=(mode==="greedy")?g.predict(keys[scale],ACTION):
   (()=>{
    // This sampling only chooses among successors actually experienced
    // by the ORIGINAL organism, following its own native edge frequencies.
    const temperature=0.95;
    const weighted=bucket.successors.map(x=>({value:x.to,weight:Math.pow(x.probability,1/temperature)}));
    const sum=weighted.reduce((a,b)=>a+b.weight,0);
    let p=random()*sum;
    for(const option of weighted){p-=option.weight;if(p<=0)return option.value;}
    return weighted.at(-1).value;
   })();
  const m=typeof selected==="string"&&new RegExp("^auditory:"+j+":state:(\\d+)$").exec(selected);
  if(!m)throw Error("Native selected edge outside sensory world "+selected);
  return {v:Number(m[1]),scale,support:bucket.total,available:bucket.successors.length};
 }
 return {v:frames[t][j],scale:null,support:0,available:0};
}
function imagine(brain,seedFrames,randSeed,mode="stochastic"){
 const r=rng(randSeed),frames=seedFrames.map(f=>f.slice());
 if(!frames.length||frames.length>=N||frames.some(f=>!isValid(f)))throw Error("Invalid generation primer");
 let native=0,total=0,changed=0,branches=0,fallback=0;
 let origins=[];
 for(let t=frames.length-1;t<N-1;t++){
  const next=[];
  for(let j=0;j<C;j++){
   const p=pick(brain,frames,j,t,r,mode);
   next[j]=p.v;
   native+=Number(p.scale!==null);fallback+=Number(p.scale===null);
   changed+=Number(p.v!==frames[t][j]);branches+=Number(p.available>1);total++;
   origins.push({frame:t+1,channel:j,scale:p.scale,support:p.support,choices:p.available});
  }
  if(!isValid(next))throw Error("Native Braivour produced invalid sound state");
  frames.push(next);
 }
 if(frames.length!==N)throw Error("Native Brain not generating complete sound");
 return {frames,stats:{initialRealFrames:seedFrames.length,generatedFrames:N-seedFrames.length,
   totalNativeDecisions:total,nativeTransitionFraction:native/total,
   actualChangesInNativeProposals:changed,branchChoiceFraction:branches/total,
   fallbackFraction:fallback/total,modelType:"Original Brain.constructedPaths.scales"},
   provenance:origins};
}
const original=new Brain({rules:RULES,seed:7321});
const training=trainBrain(original,train,false);
const nativeBefore=original.constructedPaths.scales.map(x=>x.observations);
const starts=train.filter(r=>r.frames[0][0]>0 && r.frames[0][1]>1);
const seededHold=hold.filter(r=>r.frames[1][0]>0&&r.frames[1][1]>1);
if(starts.length<3||seededHold.length<3)throw Error("Insufficient physically voiced candidate starts");
const imagined=[];
function add(id,frames,seed,mode,source){
 const out=imagine(original,frames,seed,mode);
 imagined.push({id,kind:source,seedSourceKind:source,seedAudioFrameCount:frames.length,...out});
}
add("autonomous_01", [starts[4].frames[0]],1923,"stochastic","learned-prior-first-sensory-state");
add("autonomous_02", [starts[19].frames[0]],2711,"stochastic","learned-prior-first-sensory-state");
add("autonomous_greedy", [starts[3].frames[0]],1923,"greedy","learned-prior-first-sensory-state");
add("unseen_cat_continuation", seededHold[0].frames.slice(0,3),4173,"stochastic","three-frames-from-owner-cat-heldout");
if(original.constructedPaths.scales.some((g,i)=>g.observations!==nativeBefore[i]))throw Error("The original Brain learned generated / heldout audio");
const control=new Brain({rules:RULES,seed:7321});
const ctrlTraining=trainBrain(control,train,true);
const controlBefore=control.constructedPaths.scales.map(x=>x.observations);
const controlGenerated=imagine(control,[starts[4].frames[0]],1923,"stochastic");
if(control.constructedPaths.scales.some((g,i)=>g.observations!==controlBefore[i]))throw Error("Control Brain learned fake sensory audio");
imagined.push({id:"destroyed_time_control",kind:"learned-prior-first-sensory-state, chronological frame order destroyed in training",
 seedAudioFrameCount:1,...controlGenerated});
function identicalToAnyTraining(generated){
 return train.filter(r=>JSON.stringify(r.frames)===JSON.stringify(generated)).length;
}
function longestSharedRun(generated){
 let best=0;
 // This novelty control penalizes continuous copied acoustic whole-frame phrases.
 const trainKeys=train.map(r=>r.frames.map(f=>f.join(",")));
 const seq=generated.map(f=>f.join(","));
 for(const real of trainKeys){
  let dp=new Uint8Array(N+1);
  for(let i=1;i<=N;i++){
   const nd=new Uint8Array(N+1);
   for(let j=1;j<=N;j++)if(seq[i-1]===real[j-1]){nd[j]=dp[j-1]+1;best=Math.max(best,nd[j]);}
   dp=nd;
  }
 }
 return best;
}
const manifest={status:"ACTUAL_ORIGINAL_BRAIN_NATIVE_GENERATIVE_AUDIO_TRAJECTORIES",
 dataSource:"original real CatMeows WAV MD5 b5fa911bcd6514e39dfef6876f747df4",
 originalBrain:true,trainedOnRealAudioOnly:true,outputAudioWaveformsDecodedBy:"deterministic physical harmonic-noise sound renderer, no trained sound model",
 catAndOwnerHeldout:true,trainRecords:train.length,heldoutRecords:hold.length,
 training,controlTraining:ctrlTraining,
 auditoryFrameCount:N,channels:C,samplingRule:"choose actually observed native acoustic state successors by their recorded edge probabilities",
 output:imagined.map(obj=>({
   ...obj,identicalCompleteTrajectoryInTraining:identicalToAnyTraining(obj.frames),
   longestConsecutiveIdentical48DFrameRunWithTraining:longestSharedRun(obj.frames),
   trueCatMeaningOrIntentionKnown:false
 }))};
fs.mkdirSync("runtime/catmeows",{recursive:true});
fs.writeFileSync("runtime/catmeows/native_imagined_voice_manifest.json",JSON.stringify(manifest,null,2));
console.log("CATMEOWS_NATIVE_GENERATION_COMPLETE "+JSON.stringify({
 trainingEpisodes:training.experiences,trainingTransitions:training.transitions,outputs:manifest.output.map(x=>({
 id:x.id,...x.stats,exactMemorizedCall:x.identicalCompleteTrajectoryInTraining,
 longestCopiedAcousticFramePhrase:x.longestConsecutiveIdentical48DFrameRunWithTraining
 }))}));
