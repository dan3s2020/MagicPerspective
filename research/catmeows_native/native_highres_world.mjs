// CAUSAL SOUND-FIDELITY TEST: 24 real temporal audio frames and short FFT,
// EXACT SAME original native Brain/constructedPaths, fixed policy, no labels.
// Braivour ORIGINAL native multi-scale ConstructedTransitionGraph acoustic world.
// This changes the WORLD fed to the SAME Brain; no separate neural/classifier head.
// The organism's original constructedPaths.scales[i].observe() is the ONLY learner
// of acoustic transition probabilities, and its native .predict() is the ACTOR.
// It observes physical time-forward consequences of real WAV signals and predicts
// the next frame BEFORE it arrives. All scores frozen on completely new cats.
//
// Hypothesis: The old suffix-copy path ignored prior audio because meaningful
// acoustic state trajectories have no exact shared >20-symbol suffixes. The SAME
// native brain's learned observed state-action transitions may generalize across
// the *shape* of sound (channels, motion, current state), not byte sequences.
//
// This is not a claim of feline semantic translation. The audio is 8 frames x 9
// features, so benchmark is TEMPORAL ACOUSTIC FORM, not receiver intention.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../v17/transcend/torus-aether/devour/brain.mjs";

const DATA="runtime/catmeows/highres_sensory.json";
if(!fs.existsSync(DATA))throw Error("No real checksum-verified CatMeows audio. No dummy fallback.");
const rows=JSON.parse(fs.readFileSync(DATA,"utf8"));
if(rows.length!==440)throw Error("Expected precisely 440 CatMeows original WAV samples");
const RULES={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const VIEWS=["audio_absolute24","audio_change24"];
const TRAIN_MODES=["chronological","permuted-within-call"];
const POLICIES=["continuity","native-multiscale"];
const STEPS=24,BANDS=9;
const ADVANCE="experience-actual-next-acoustic-frame";
const parents=new Map();
function root(key){if(!parents.has(key))parents.set(key,key);let p=parents.get(key);if(p!==key)parents.set(key,root(p));return parents.get(key);}
function union(a,b){let x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
for(const r of rows)union("owner:"+r.owner,"cat:"+r.cat);
const components=new Map();
for(const r of rows){const k=root("cat:"+r.cat),g=components.get(k)||{owners:new Set(),cats:new Set(),n:0};g.owners.add(r.owner);g.cats.add(r.cat);g.n++;components.set(k,g);}
const groups=[...components.values()].sort((a,b)=>b.n-a.n);
const folds=[new Set(),new Set(),new Set()],sizes=[0,0,0];
for(const g of groups){let i=sizes.indexOf(Math.min(...sizes));for(const owner of g.owners)folds[i].add(owner);sizes[i]+=g.n;}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffled(a,seed){let z=a.slice(),r=rng(seed);for(let i=z.length-1;i>0;i--){let j=Math.floor(r()*(i+1));[z[i],z[j]]=[z[j],z[i]];}return z;}
function values(record,view){
 const x=record[view];
 if(!Array.isArray(x)||x.length!==STEPS*BANDS)throw Error("Invalid original audio 8x9 state");
 const f=[];
 for(let i=0;i<STEPS;i++){
  const a=[];
  for(let j=0;j<BANDS;j++){
   let token=x[i*BANDS+j];
   if(!Number.isInteger(token)||token<20+j*12||token>=32+j*12)throw Error("Corrupted WAV-acoustic feature channel");
   a.push(token-20-j*12);
  }
  f.push(a);
 }
 return f;
}
function clip(n,a,b){return Math.max(a,Math.min(b,n));}
function clampValue(v){return clip(v,0,11);}
function stateKeys(f,j,t){const now=f[t][j],previous=t>0?f[t-1][j]:now,delta=clip(now-previous,-3,3),phase=t<Math.floor(STEPS/3)?"early":t<Math.floor(2*STEPS/3)?"middle":"late";
 const surround= j===0?f[t][1]:j===8?f[t][7]:Math.round((f[t][j-1]+f[t][j+1])/2);
 const coarse=Math.floor(now/3),flow=Math.sign(now-previous);
 return [
  "ch"+j+":state"+now,
  "ch"+j+":state"+now+":motion"+delta,
  "ch"+j+":state"+now+":phase"+phase,
  "ch"+j+":state"+now+":adjacent"+Math.floor(surround/3),
  "ch"+j+":region"+coarse+":direction"+flow,
  "ch"+j+":state"+now+":p"+Math.floor(previous/3)+":phase"+phase
 ];
}
function successor(j,next){return "ch"+j+":state"+next;}
function decode(j,s){let m=typeof s==="string"&&new RegExp("^ch"+j+":state(\\d+)$").exec(s);return m?Number(m[1]):null;}
function readNative(graph,from,j){
 const list=graph.choices(from).find(e=>e.action===ADVANCE);
 const next=graph.predict(from,ADVANCE);
 const val=decode(j,next);
 return {value:val,support:list?list.total:0,
     entropy:list&&list.successors.length>1?
      -list.successors.reduce((h,e)=>h+e.probability*Math.log(e.probability),0):0,
     distinctSuccessors:list?list.successors.length:0};
}
function trainBrain(brain,training,view,orderMode,seed){
 if(!brain.constructedPaths||brain.constructedPaths.scales.length!==6)
  throw Error("Not the original six-scale native ConstructedPathLearner");
 let n=0,seen=0;
 for(const row of shuffled(training,seed)){
  let f=values(row,view);
  if(orderMode==="reversed")f=f.slice().reverse();
  if(orderMode==="permuted-within-call")f=shuffled(f,seed+97+seen*13);
  brain.live(245);
  for(let t=0;t<STEPS;t++){
   brain.live(246);
   for(let j=0;j<BANDS;j++)brain.live(20+j*12+f[t][j]);
   brain.live(247);
   if(t>0){
    for(let j=0;j<BANDS;j++){
     // Native organism compares present with earlier actual physical state.
     // The action is the world taking one time step, not a fabricated cat reply.
     const s=stateKeys(f,j,t-1),to=successor(j,f[t][j]);
     for(let scale=0;scale<brain.constructedPaths.scales.length;scale++)
      brain.constructedPaths.scales[scale].observe(s[scale],ADVANCE,to);
     n++;
    }
   }
  }
  brain.live(248);
  seen++;
 }
 return {trainedEpisodes:seen,observedNativeTransitions:n,
   nativeGraphStatus:brain.constructedPaths.scales.map(g=>g.status())};
}
function forecast(brain,f,j,t,policy){
 const current=f[t][j];
 if(policy==="continuity")return {value:current,from:"physical-inertia"};
 const keys=stateKeys(f,j,t),graphs=brain.constructedPaths.scales;
 const order=policy==="native-first-order"?[0]:
             policy==="native-motion"?[1,0]:
             [5,3,1,2,4,0];
 for(const scale of order){
  const r=readNative(graphs[scale],keys[scale],j);
  // Require >=2 actually observed physical transitions for complex states,
  // but one at native order-1; avoids one-observation aliasing.
  const min=scale===0?1:2;
  if(r.value!==null&&r.support>=min)
   return {value:r.value,from:"native-graph-"+scale,support:r.support,entropy:r.entropy};
 }
 return {value:current,from:"original-sensor-continuity-fallback"};
}
const summary=[],every=[];
for(const view of VIEWS)for(const fold of (process.env.CATMEOWS_FOLDS?process.env.CATMEOWS_FOLDS.split(",").map(Number):[0,1,2])){
 const train=rows.filter(r=>!folds[fold].has(r.owner));
 const test=rows.filter(r=>folds[fold].has(r.owner));
 if(test.some(r=>train.some(t=>r.cat===t.cat||r.owner===t.owner)))throw Error("CAT/OWNER identity leakage");
 const trains=new Map();
 const seed=991+fold*71;
 for(const mode of TRAIN_MODES){
  const brain=new Brain({rules:RULES,seed});
  const report=trainBrain(brain,train,view,mode,seed);
  trains.set(mode,{brain,report});
 }
 // Exactly matched acoustic outcomes for every experimental actor.
 for(const policy of POLICIES)for(const mode of TRAIN_MODES){
  const {brain,report}=trains.get(mode);
  const before=brain.constructedPaths.scales.map(g=>g.observations);
  let correct=0,within1=0,sumAbs=0,changingCorrect=0,changingN=0,
      wrongDirection=0,n=0,usedNative=0,byScale={};
  const perRecord=[];
  for(const r of test){
   const f=values(r,view);let rec={recording:r.recording,cat:r.cat,owner:r.owner,n:0,correct:0};
   for(let t=1;t<STEPS;t++)for(let j=0;j<BANDS;j++){
    const raw=forecast(brain,f,j,t-1,policy),pred=clampValue(raw.value),truth=f[t][j],
        prev=f[t-1][j],delta=truth-prev,predDelta=pred-prev;
    const hit=Number(pred===truth);
    correct+=hit;within1+=Number(Math.abs(pred-truth)<=1);
    sumAbs+=Math.abs(pred-truth);n++;rec.n++;rec.correct+=hit;
    changingN+=Number(delta!==0);if(delta!==0)changingCorrect+=hit;
    wrongDirection+=Number(Math.sign(delta)!==Math.sign(predDelta));
    usedNative+=Number(raw.from.startsWith("native-graph-"));
    byScale[raw.from]=(byScale[raw.from]||0)+1;
    if(policy==="native-multiscale")every.push({
      view,fold,mode,cat:r.cat,owner:r.owner,recording:r.recording,frame:t,channel:j,
      priorValue:prev,trueNext:truth,predicted:pred,nativeSource:raw.from,
      transitionSupport:raw.support??0
    });
   }
   perRecord.push(rec);
  }
  if(brain.constructedPaths.scales.some((g,i)=>g.observations!==before[i]))
   throw Error("HELDOUT CHANGE to original native Brain/constructed state");
  const row={view,fold,mode,policy,trainCatCount:new Set(train.map(r=>r.cat)).size,
   testCatCount:new Set(test.map(r=>r.cat)).size,
   trainCount:train.length,testCount:test.length,n,
   exactSymbolAccuracy:correct/n,withinOneAcousticBin:within1/n,
   meanAbsAcousticBinError:sumAbs/n,
   accuracyWhenAcousticStateActuallyChanges:changingCorrect/Math.max(1,changingN),
   changingEventCount:changingN,
   matchingMovementDirection:1-wrongDirection/n,
   nativeTransitionUsage:usedNative/n,
   nativeEvidence:byScale,
   nativeTraining:{episodes:report.trainedEpisodes,transitions:report.observedNativeTransitions},
   primaryGoal:"learn true world transition before observed consequence, not label decoding"};
  summary.push(row);console.log("CATMEOWS_NATIVE_HIGHRES_WORLD "+JSON.stringify(row));
 }
}
const byCell=new Map();
for(const item of summary)byCell.set([item.view,item.fold,item.mode,item.policy].join(":"),item);
for(const row of summary.filter(x=>x.mode==="chronological"&&x.policy!=="continuity")){
 const baseline=byCell.get([row.view,row.fold,"chronological","continuity"].join(":"));
 const reversed=byCell.get([row.view,row.fold,"reversed",row.policy].join(":"));
 const permuted=byCell.get([row.view,row.fold,"permuted-within-call",row.policy].join(":"));
 row.causes={deltaAgainstPhysicalContinuity:row.exactSymbolAccuracy-baseline.exactSymbolAccuracy,
 deltaAgainstReversedTraining:reversed?row.exactSymbolAccuracy-reversed.exactSymbolAccuracy:null,
 deltaAgainstPermutedTraining:row.exactSymbolAccuracy-permuted.exactSymbolAccuracy,
 ownerHeldoutCount:row.testCount};
}
const out={source:"CatMeows v1.0.2 REAL WAV verified in prepare_highres.py",nWav:rows.length,
 oneOriginalBrainPerFoldAndTrainingControl:true,
 learner:"brain.constructedPaths.scales[i].observe(from, action, observed successor)",
 player:"brain.constructedPaths.scales[i].predict(from, action) on frozen heldout episodes",
 originalBrainStillLivesEveryRealAudioEvent:true,trainedOnContextLabels:false,
 acousticChannels:9,timeFrames:STEPS,trainHasCatOrOwnerLeakage:false,
 noHumanSemanticLabels:true,results:summary};
fs.mkdirSync("runtime/catmeows",{recursive:true});
fs.writeFileSync("runtime/catmeows/native_highres_world_results.json",JSON.stringify(out,null,2));
fs.writeFileSync("runtime/catmeows/native_highres_world_predictions.jsonl",every.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log("CATMEOWS_NATIVE_HIGHRES_WORLD_COMPLETE "+JSON.stringify({
 configs:summary.length,heldoutPredictionRows:every.length,
 rows:summary.filter(x=>x.mode==="chronological").map(x=>({
   view:x.view,fold:x.fold,policy:x.policy,exact:x.exactSymbolAccuracy,change:x.accuracyWhenAcousticStateActuallyChanges,causes:x.causes
 }))}));
