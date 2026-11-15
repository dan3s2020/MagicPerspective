// OUT-OF-DATASET VALIDATION for native Braivour V42 audio world's previously
// selected, FIXED, multiscale policy. No extra hyperparameter selection here.
// Train on genuine 440 CatMeows WAV clips; test on genuine *separate*, uncut
// extras.zip energy bursts (30 recordings), strictly unseen cat and owner.
// Only same native Brain.constructedPaths.scales[i].observe() learns sound
// transitions. Native .predict() produces each 9-channel next-frame output.
// Context labels, cat ID, owner ID never enter Brain sensory input or actions.
// The already chosen fixed policy remains [5,3,1,2,4,0], complex min 2.
// Controls: repeat previous frame, reverse/permute TRAIN sound frame order.
// Deliberately no new "winning" hyperparameters or semantic translation claims.
import fs from "node:fs";
import {Brain} from "../../v17/transcend/torus-aether/devour/brain.mjs";

const ROOT="runtime/catmeows", main=JSON.parse(fs.readFileSync(ROOT+"/sensory.json","utf8")),
  episodes=JSON.parse(fs.readFileSync(ROOT+"/real_sequences.json","utf8"));
if(main.length!==440||episodes.length!==30)throw Error("The verified CatMeows official datasets are missing");
const RULES={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const MODE="audio_change", ACTION="experience-actual-next-acoustic-frame", BANDS=9,STEPS=8;
const params={priority:[5,3,1,2,4,0],minNativeSupport:2,minFirstOrderSupport:1};
const parents=new Map();
function root(k){if(!parents.has(k))parents.set(k,k);let p=parents.get(k);if(p!==k)parents.set(k,root(p));return parents.get(k);}
function join(a,b){const x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
for(const r of [...main,...episodes])join("cat:"+r.cat,"owner:"+r.owner);
const comps=new Map();
for(const e of episodes){
  let k=root("cat:"+e.cat),x=comps.get(k)||{owners:new Set(),cats:new Set(),n:0};
  x.owners.add(e.owner);x.cats.add(e.cat);x.n++;comps.set(k,x);
}
const grouped=[...comps.values()].sort((a,b)=>b.n-a.n),folds=[new Set(),new Set(),new Set()],foldN=[0,0,0];
for(const g of grouped){const j=foldN.indexOf(Math.min(...foldN));const allOwners=[...new Set([...main,...episodes].filter(r=>root("cat:"+r.cat)===root("cat:"+[...g.cats][0])).map(r=>r.owner))];for(const o of allOwners)folds[j].add(o);foldN[j]+=g.n;}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffled(a,seed){let z=a.slice(),r=rng(seed);for(let i=z.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[z[i],z[j]]=[z[j],z[i]];}return z;}
function frames(r){const raw=r[MODE];if(!Array.isArray(raw)||raw.length!==BANDS*STEPS)throw Error("Expected genuine audio_change 8x9 frames");let f=[];for(let t=0;t<STEPS;t++){let row=[];for(let j=0;j<BANDS;j++){const v=raw[t*BANDS+j],low=20+j*12;if(!Number.isInteger(v)||v<low||v>low+11)throw Error("Audio event corrupt");row.push(v-low);}f.push(row);}return f;}
function stateKeys(f,j,t){
 const now=f[t][j],previous=t>0?f[t-1][j]:now,delta=Math.max(-3,Math.min(3,now-previous)),phase=t<2?"early":t<5?"middle":"late";
 const surround=j===0?f[t][1]:j===8?f[t][7]:Math.round((f[t][j-1]+f[t][j+1])/2);
 return [
  "ch"+j+":state"+now,
  "ch"+j+":state"+now+":motion"+delta,
  "ch"+j+":state"+now+":phase"+phase,
  "ch"+j+":state"+now+":adjacent"+Math.floor(surround/3),
  "ch"+j+":region"+Math.floor(now/3)+":direction"+Math.sign(now-previous),
  "ch"+j+":state"+now+":p"+Math.floor(previous/3)+":phase"+phase
 ];
}
function outcome(j,value){return "ch"+j+":state"+value;}
function train(brain,training,mode,seed){
 let n=0;
 for(const r of shuffled(training,seed)){
  let f=frames(r);
  if(mode==="reversed")f=f.slice().reverse();
  else if(mode==="permuted-within-call")f=shuffled(f,seed+91+n);
  brain.live(245);
  for(let t=0;t<STEPS;t++){
   brain.live(246);
   for(let j=0;j<BANDS;j++)brain.live(20+j*12+f[t][j]);
   brain.live(247);
   if(t>0)for(let j=0;j<BANDS;j++){
    const s=stateKeys(f,j,t-1),to=outcome(j,f[t][j]);
    for(let scale=0;scale<6;scale++)brain.constructedPaths.scales[scale].observe(s[scale],ACTION,to);
    n++;
   }
  }
  brain.live(248);
 }
 return n;
}
function forecast(brain,f,j,t){
 const keys=stateKeys(f,j,t);
 for(const scale of params.priority){
  const g=brain.constructedPaths.scales[scale],candidate=g.predict(keys[scale],ACTION);
  const choices=g.choices(keys[scale]).find(x=>x.action===ACTION);
  const valid=typeof candidate==="string"&&new RegExp("^ch"+j+":state(\\d+)$").exec(candidate);
  if(!valid||!choices||choices.total<(scale===0?1:params.minNativeSupport))continue;
  const v=Number(valid[1]);if(v>=0&&v<=11)return {value:v,scale,support:choices.total};
 }
 return {value:f[t][j],scale:null,support:0};
}
const report=[],predictions=[];
for(let fold=0;fold<3;fold++){
 const testing=episodes.filter(r=>folds[fold].has(r.owner));
 const heldCats=new Set(testing.map(r=>r.cat)),heldOwners=new Set(testing.map(r=>r.owner));
 const training=main.filter(r=>!folds[fold].has(r.owner)&&!heldCats.has(r.cat));
 if(!testing.length||training.length<30)throw Error("Unsupported real-audio fold");
 if(testing.some(x=>training.some(y=>x.cat===y.cat||x.owner===y.owner)))throw Error("Leakage");
 for(const mode of ["chronological","reversed","permuted-within-call"]){
  const brain=new Brain({rules:RULES,seed:991+fold*71}),observed=train(brain,training,mode,991+fold*71);
  const before=brain.constructedPaths.scales.map(g=>g.observations);
  let hits=0,prev=0,n=0,changingHits=0,changedN=0,used=0,mae=0;
  let recordingEvents=0;
  for(const episode of testing){
   for(let burstIndex=0;burstIndex<episode.bursts.length;burstIndex++){
    const burst=episode.bursts[burstIndex],f=frames(burst);
    recordingEvents++;
    for(let t=1;t<STEPS;t++)for(let j=0;j<BANDS;j++){
     const proposal=forecast(brain,f,j,t-1),truth=f[t][j],prior=f[t-1][j],isChange=truth!==prior;
     const hit=Number(proposal.value===truth);
     hits+=hit;prev+=Number(prior===truth);mae+=Math.abs(proposal.value-truth);n++;
     changedN+=Number(isChange);changingHits+=hit*Number(isChange);
     used+=Number(proposal.scale!==null);
     if(mode==="chronological")predictions.push({fold,owner:episode.owner,cat:episode.cat,recording:episode.recording,
       burstIndex,frame:t,channel:j,truth,previous:prior,originalBrainPrediction:proposal.value,
       nativeScale:proposal.scale});
    }
   }
  }
  if(brain.constructedPaths.scales.some((g,i)=>g.observations!==before[i]))
    throw Error("Heldout audio contaminated native Brain transition memory");
  const row={fold,mode,trainingWavs:training.length,trainDistinctCats:new Set(training.map(x=>x.cat)).size,
   heldoutUncutRecordings:testing.length,heldoutCats:heldCats.size,heldoutOwners:heldOwners.size,
   heldoutBurstCount:recordingEvents,heldoutSymbolForecasts:n,
   nativeAccuracy:hits/n,physicalInertiaAccuracy:prev/n,deltaNativeVsInertia:(hits-prev)/n,
   nativeAccOnChangingFrames:changingHits/Math.max(1,changedN),changingFrames:changedN,
   nativeMeanAbsoluteValueError:mae/n,nativeCoverage:used/n,
   originalBrainObservedTrainingTransitions:observed,trainedContextLabels:false};
  report.push(row);console.log("CATMEOWS_OUT_OF_DATASET_NATIVE_AUDIT "+JSON.stringify(row));
 }
}
fs.mkdirSync(ROOT,{recursive:true});
fs.writeFileSync(ROOT+"/native_external_validation.json",JSON.stringify({
 source:"official genuine separate CatMeows extras.zip, MD5 verified by audit_extras.py",
 originalTrainSource:"dataset.zip 440 meows, owner and cat disjoint from external target",
 originalBrain:true,sourceToStateAction:MODE,nativeAction:ACTION,fixedPolicy:params,
 noManualContextLabels:true,originalBrainLearns:true,conclusion:"Acoustic physical state prediction only; NOT meaning/translation",
 report
},null,2));
fs.writeFileSync(ROOT+"/native_external_validation_predictions.jsonl",predictions.map(r=>JSON.stringify(r)).join("\n")+"\n");
console.log("CATMEOWS_OUT_OF_DATASET_NATIVE_AUDIT_COMPLETE "+JSON.stringify({folds:report.length,realHeldoutFrames:predictions.length}));
