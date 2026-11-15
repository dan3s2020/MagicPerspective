// Between-call native original Braivour communication-structure experiment.
// ACTUAL recorded time order of real CatMeows extras.zip acoustic bursts.
// Its single Brain owns learned native six-scale observed transition graphs;
// the next call trajectory is NOT an attached separate classifier or oracle.
// Hypothesis: training a single physical acoustic-state operator across the
// micro-time of a call AND macro-time between calls yields transferable laws.
// Owner/cat-disjoint heldout, reverse/permuted chronology control, last-call
// baseline, and explicitly count how much of predicted NEXT CALL is correct.
// No human recording context, cat identity or answer is fed as a model signal.
import fs from "node:fs";
import {Brain} from "../../v17/transcend/torus-aether/devour/brain.mjs";
const ROOT="runtime/catmeows",episodes=JSON.parse(fs.readFileSync(ROOT+"/real_sequences.json","utf8")),
   mains=JSON.parse(fs.readFileSync(ROOT+"/sensory.json","utf8"));
if(episodes.length!==30||mains.length!==440)throw Error("Verified genuine CatMeows material missing");
const PRETRAIN=process.env.CATMEOWS_PRETRAIN||"none";
if(!["none","within-call","within-call-permuted"].includes(PRETRAIN))throw Error("Unknown acoustic transfer experiment");
const RULES={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const ADVANCE="experience-actual-next-acoustic-frame";
const MODE="audio_global",POLICIES=["continuity","native-first-order","native-multiscale"];
const parents=new Map();
function root(k){if(!parents.has(k))parents.set(k,k);let p=parents.get(k);if(p!==k)parents.set(k,root(p));return parents.get(k);}
function join(a,b){let x=root(a),y=root(b);if(x!==y)parents.set(x,y);}
for(const r of [...episodes,...mains])join("owner:"+r.owner,"cat:"+r.cat);
const comps=new Map();
for(const e of episodes){
 const k=root("owner:"+e.owner),v=comps.get(k)||{key:k,n:0};v.n++;comps.set(k,v);
}
const sorted=[...comps.values()].sort((a,b)=>b.n-a.n);
const groups=[new Set(),new Set(),new Set()],sizes=[0,0,0];
for(const g of sorted){
 const ix=sizes.indexOf(Math.min(...sizes));sizes[ix]+=g.n;
 for(const r of [...episodes,...mains])if(root("owner:"+r.owner)===g.key)groups[ix].add(r.owner);
}
function rng(seed){let x=seed>>>0;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
function shuffle(arr,seed){let a=arr.slice(),r=rng(seed);for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function digits(x){
 if(!Array.isArray(x)||x.length!==9)throw Error("Expected actual 9-channel call summary");
 return x.map((v,j)=>{const base=20+j*12;if(!Number.isInteger(v)||v<base||v>base+11)throw Error("Invalid physical feature");return v-base;});
}
function callState(b){return digits(b[MODE]);}
function frames(r){
 const x=r.audio_absolute;if(!Array.isArray(x)||x.length!==72)throw Error("Genuine intra-call audio absent");
 return Array.from({length:8},(_,t)=>digits(x.slice(t*9,t*9+9)));
}
function keys(f,j,t){
 let v=f[t][j],p=t>0?f[t-1][j]:v,
   d=Math.max(-3,Math.min(3,v-p)),phase=t<2?"early":t<5?"middle":"late",
   n=j===0?f[t][1]:j===8?f[t][7]:Math.round((f[t][j-1]+f[t][j+1])/2);
 return [
 "ch"+j+":state"+v,
 "ch"+j+":state"+v+":motion"+d,
 "ch"+j+":state"+v+":phase"+phase,
 "ch"+j+":state"+v+":adjacent"+Math.floor(n/3),
 "ch"+j+":region"+Math.floor(v/3)+":direction"+Math.sign(v-p),
 "ch"+j+":state"+v+":p"+Math.floor(p/3)+":phase"+phase
 ];
}
function learnTransitions(brain,sequence){
 for(let t=1;t<sequence.length;t++)for(let j=0;j<9;j++){
  const ks=keys(sequence,j,t-1),answer="ch"+j+":state"+sequence[t][j];
  for(let scale=0;scale<6;scale++)brain.constructedPaths.scales[scale].observe(ks[scale],ADVANCE,answer);
 }
 return 9*Math.max(0,sequence.length-1);
}
function liveFrames(brain,f){
 brain.live(245);
 for(const row of f){brain.live(246);row.forEach((v,j)=>brain.live(20+j*12+v));brain.live(247);}
 brain.live(248);
}
function pretrained(brain,training,seed){
 if(PRETRAIN==="none")return 0;
 let observations=0;
 for(let k=0;k<training.length;k++){
  let f=frames(training[k]);
  if(PRETRAIN==="within-call-permuted")f=shuffle(f,seed+91+k*7);
  liveFrames(brain,f);
  observations+=learnTransitions(brain,f);
 }
 return observations;
}
function trainUncut(brain,training,mode,seed){
 let observations=0;
 for(let k=0;k<training.length;k++){
  const r=training[k];
  let f=r.bursts.map(callState);
  if(mode==="reversed")f=f.slice().reverse();
  if(mode==="permuted")f=shuffle(f,seed+31+k*17);
  liveFrames(brain,f);
  observations+=learnTransitions(brain,f);
 }
 return observations;
}
function predict(brain,past,j,policy){
 const now=past.at(-1)[j];
 if(policy==="continuity")return {value:now,scale:null,support:0};
 const order=policy==="native-first-order"?[0]:[5,3,1,2,4,0],
  ks=keys(past,j,past.length-1);
 for(const scale of order){
  const g=brain.constructedPaths.scales[scale],from=ks[scale];
  const answer=g.predict(from,ADVANCE),
    choice=g.choices(from).find(z=>z.action===ADVANCE);
  if(!choice||choice.total<(scale===0?1:2))continue;
  const match=typeof answer==="string"&&new RegExp("^ch"+j+":state(\\d+)$").exec(answer);
  if(!match)continue;
  const val=Number(match[1]);
  if(Number.isInteger(val)&&val>=0&&val<=11)return {value:val,scale,support:choice.total};
 }
 return {value:now,scale:null,support:0};
}
const RESULTS=[],RAW=[];
for(let fold=0;fold<3;fold++){
 const held=episodes.filter(r=>groups[fold].has(r.owner)),
   train=episodes.filter(r=>!groups[fold].has(r.owner)),
   heldCats=new Set(held.map(r=>r.cat)),
   trainMeows=mains.filter(r=>!groups[fold].has(r.owner)&&!heldCats.has(r.cat));
 if(!held.length||!train.length||!trainMeows.length)throw Error("Invalid owner-disjoint call world");
 if(held.some(x=>train.some(y=>x.owner===y.owner||x.cat===y.cat)) ||
    held.some(x=>trainMeows.some(y=>x.owner===y.owner||x.cat===y.cat)))
  throw Error("Identity leaked to original Brain");
 for(const mode of ["chronological","reversed","permuted"]){
  const brain=new Brain({rules:RULES,seed:343+fold});
  const transfer=pretrained(brain,trainMeows,343+fold);
  const observed=trainUncut(brain,train,mode,343+fold);
  const before=brain.constructedPaths.scales.map(x=>x.observations);
  for(const policy of POLICIES){
   let hits=0,absErr=0,count=0,changedHits=0,changedN=0,used=0,complete=0,callCount=0;
   for(const e of held){
    const sequence=e.bursts.map(callState);
    for(let t=1;t<sequence.length;t++){
     let n=0;callCount++;
     for(let j=0;j<9;j++){
      // Only PREVIOUS CALLS are visible to original native Brain here.
      const predicted=predict(brain,sequence.slice(0,t),j,policy),truth=sequence[t][j],prev=sequence[t-1][j],hit=predicted.value===truth;
      n+=hit;hits+=hit;absErr+=Math.abs(predicted.value-truth);count++;
      changedN+=Number(truth!==prev);if(truth!==prev)changedHits+=Number(hit);
      used+=Number(predicted.scale!==null);
      if(policy==="native-multiscale")RAW.push({pretrain:PRETRAIN,fold,mode,source:e.recording,owner:e.owner,cat:e.cat,
        burstIndex:t,channel:j,previous:prev,target:truth,prediction:predicted.value,
        learnedScale:predicted.scale,support:predicted.support});
     }
     complete+=Number(n===9);
    }
   }
   if(brain.constructedPaths.scales.some((g,i)=>g.observations!==before[i]))throw Error("Heldout acoustic data was learned");
   const r={pretrain:PRETRAIN,fold,mode,policy,trainUncutRecordings:train.length,
       trainMeows:PRETRAIN==="none"?0:trainMeows.length,
       heldUncutRecordings:held.length,heldCats:heldCats.size,
       heldNextCallSituations:callCount,heldAcousticEvents:count,
       exactAudioEventAccuracy:hits/count,fullyPredictedNextCalls:complete,
       meanAbsoluteAudioError:absErr/count,
       changingAudioEventAccuracy:changedHits/Math.max(1,changedN),
       changedAudioEvents:changedN,nativeMemoryUsage:used/count,
       actualNativeTransferObservations:transfer,actualNativeCallTransitions:observed,
       contextLabelsInInput:false,meaningDecoded:false};
   RESULTS.push(r);console.log("CATMEOWS_NATIVE_INTERCALL "+JSON.stringify(r));
  }
 }
}
fs.mkdirSync(ROOT,{recursive:true});
fs.writeFileSync(ROOT+"/native_intercall_"+PRETRAIN+"_results.json",JSON.stringify({
  purpose:"true vocalization to vocalization physical transition, not context label",
  fixedNativeScaleOrder:[5,3,1,2,4,0],interCallTrainingAudioOnly:true,pretraining:PRETRAIN,
  originalBrainConstructedPathsAuthoritative:true,
  reports:RESULTS},null,2));
fs.writeFileSync(ROOT+"/native_intercall_"+PRETRAIN+"_predictions.jsonl",RAW.map(x=>JSON.stringify(x)).join("\n")+"\n");
console.log("CATMEOWS_NATIVE_INTERCALL_COMPLETE "+JSON.stringify({configs:RESULTS.length,predictions:RAW.length,pretrain:PRETRAIN}));
