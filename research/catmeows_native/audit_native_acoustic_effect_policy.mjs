// ORIGINAL Braivour learned acoustic consequences -> choose physically
// consistent bodily effect using ONLY ITS native ConstructedPath graph.
//
// No extra AI model, no feature weights or a fit on test recordings.
// Weighted median = the action in the original graph's actually experienced
// successors with smallest expected absolute physical error. This is a
// different way of READING the same original Brain memory, not training it.
//
// The prior native top-count shortcut often moves a spectral band needlessly.
// Comparing original expected-consequence choice to raw top1, holding last
// feature and obsolete body-centroid on fully unseen cats is a honest test.
import fs from 'node:fs';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {NativeTemporalAuditoryBody} from './native_temporal_body.mjs';

const R='runtime/catmeows/';
const brain=Brain.load(R+'Original_Braivour_9D_SoundTransform_Body_chronological.v8');
if(brain.nativeAuditoryDynamics?.learntActual7Dims?.length!==7||
   brain.disc.episodes!==540)throw Error('Require previously trained actual original Brain, not a substitute');
Object.setPrototypeOf(brain.auditoryBody,NativeTemporalAuditoryBody.prototype);
brain.auditoryBody.brain=brain;
const body=brain.auditoryBody,G=brain.constructedPaths.links;
const rows=JSON.parse(fs.readFileSync(R+'generative_perception.json','utf8')).recordings;
if(rows.length!==440||body.recordingsLived!==252)throw Error('Original real sound world missing');
const p=new Map();
function root(x){if(!p.has(x))p.set(x,x);let v=p.get(x);if(v!==x)p.set(x,root(v));return p.get(x);}
function join(x,y){x=root(x);y=root(y);if(x!==y)p.set(x,y);}
for(const r of rows)join('cat:'+r.cat,'owner:'+r.owner);
const gs=new Map();
for(const r of rows){let id=root('cat:'+r.cat),v=gs.get(id)||{owners:new Set(),n:0};v.n++;v.owners.add(r.owner);gs.set(id,v);}
const sizes=[0,0,0],owners=[new Set(),new Set(),new Set()];
for(let v of [...gs.values()].sort((a,b)=>b.n-a.n)){
 const i=sizes.indexOf(Math.min(...sizes));sizes[i]+=v.n;for(const own of v.owners)owners[i].add(own);
}
const train=rows.filter(r=>!owners[0].has(r.owner));
const held=rows.filter(r=>owners[0].has(r.owner));
if(train.length!==252||held.length!==188)throw Error('Original Brain fold 0 mismatched');
const ACTION='lived-real-audio-next-state';
function fromKeys(a,b,ch,value){
 const k='body9d:v1:'+ch+':';
 return [k+'edge:'+a+'>'+b+':current:'+value,
         k+'edge:'+a+'>'+b+':coarse:'+Math.floor(value/3),
         k+'edge:'+a+'>'+b,
         k+'from:'+a+':current:'+value,
         k+'current:'+value];
}
function choices(a,b,ch,current){
 const kk=fromKeys(a,b,ch,current),min=[2,2,1,5,8];
 for(let i=0;i<kk.length;i++){
  const found=G.choices(kk[i]).find(x=>x.action===ACTION);
  if(found&&found.total>=min[i])return {found,key:kk[i],tier:i};
 }
 return null;
}
function delta(s){
 const x=/^delta:(-?\d+)$/.exec(s);
 if(!x)throw Error('Original native memory produced non-acoustic successor');
 return Number(x[1]);
}
function decideFromActualOriginalMemory(found,current){
 if(!found)return {n:0,tier:'inertia',confidence:0,top:0};
 const successors=found.found.successors.map(s=>({d:delta(s.to),p:s.probability}));
 // Native original graph .predict() reads its most common successor.
 const top=delta(G.predict(found.key,ACTION));
 // Compare ALL consequences previously lived by the SAME original organism.
 // For L1 physical sound error, choose the experienced acoustic movement
 // with the lowest expected distance to its other observed successors.
 const candidates=[0,...new Set(successors.map(s=>s.d))];
 const risk=d=>successors.reduce((s,e)=>s+e.p*Math.abs(Math.max(0,Math.min(11,current+d))-Math.max(0,Math.min(11,current+e.d))),0);
 let best=0,bestRisk=risk(0);
 for(const d of candidates){
  const candidate=risk(d);
  if(candidate<bestRisk-1e-9||(Math.abs(candidate-bestRisk)<1e-9&&Math.abs(d)<Math.abs(best))){
   bestRisk=candidate;best=d;
  }
 }
 return {n:best,tier:found.tier,confidence:successors.filter(s=>s.d===best).reduce((a,b)=>a+b.p,0),top};
}
let tested=0,eligible=0,nativeError=0,effectError=0,inertiaError=0,centroidError=0,
 decisions=0,actualMove=0,effectAccurate=0,top1Accurate=0,fromData=0,
 predictedActionChanged=0,positiveCases=0,
 nativeExact7=0,effectExact7=0,inertiaExact7=0,
 nByCh=Array.from({length:7},()=>({effect:0,top:0,baseline:0,centroid:0,bodyChanges:0}));
const exam=[];
const before={observations:G.observations,epis:brain.disc.episodes,lived:brain.lived};
for(const record of held){
 const frames=record.frames;
 for(let t=0;t<47;t++){
  const old=frames[t],next=frames[t+1],a=old[1]*12+old[0],b=next[1]*12+next[0];
  tested++;
  if(!body.seen[a]||!body.seen[b]||
    !(a===b||body.adjacency[a].some(e=>e.to===b)))continue;
  eligible++;
  const centroid=body.atCell(b);
  let a7=0,b7=0,c7=0;
  for(let ch=2;ch<9;ch++){
   const find=choices(a,b,ch,old[ch]);
   const policy=decideFromActualOriginalMemory(find,old[ch]);
   const val=Math.max(0,Math.min(11,old[ch]+policy.n)),
    top=Math.max(0,Math.min(11,old[ch]+policy.top));
   const truth=next[ch];
   const ef=Math.abs(val-truth),nf=Math.abs(top-truth),
    hold=Math.abs(old[ch]-truth),cf=Math.abs(centroid[ch]-truth);
   effectError+=ef;nativeError+=nf;inertiaError+=hold;centroidError+=cf;
   nByCh[ch-2].effect+=ef;
   nByCh[ch-2].top+=nf;
   nByCh[ch-2].baseline+=hold;
   nByCh[ch-2].centroid+=cf;
   nByCh[ch-2].bodyChanges+=Number(policy.n!==0);
   decisions++;actualMove+=Number(truth!==old[ch]);predictedActionChanged+=Number(policy.n!==0);
   effectAccurate+=Number(val===truth);top1Accurate+=Number(top===truth);
   fromData+=Number(!!find);
   a7+=Number(val===truth);b7+=Number(top===truth);c7+=Number(old[ch]===truth);
  }
  effectExact7+=Number(a7===7);nativeExact7+=Number(b7===7);inertiaExact7+=Number(c7===7);
 }
}
if(eligible<1000||before.observations!==G.observations||
   before.epis!==brain.disc.episodes||before.lived!==brain.lived)
 throw Error('Native memory test invalid, heldout audio leaked or none supported');
const res={status:'FROZEN_ORIGINAL_BRAIVOUR_BODY_NATIVE_EMPIRICAL_EFFECT_POLICY',
 originalBrainOnly:true,noExternalWeightsOrTraining:true,
 originalNativeGraphObservations:before.observations,
 strictRealHeldoutWAVs:held.length,strictRealTrainWAVs:train.length,
 realAuditorySteps:tested,nativePhysicallySupportedSteps:eligible,
 predictionTask:'the next pitch/loudness are supplied ONLY to isolate remaining 7 physical features',
 sevenFutureSpectralFeaturesHiddenDuringPrediction:true,
 decisions,originalNativeGraphAvailableFraction:fromData/decisions,
 actualChangeFraction:actualMove/decisions,
 originalGraphEmpiricalEffectChangedFraction:predictedActionChanged/decisions,
 nativeMostCommonSuccessorMAE:nativeError/decisions,
 nativeLowestExperiencedConsequenceRiskMAE:effectError/decisions,
 holdPreviousSevenFeaturesMAE:inertiaError/decisions,
 oldBodyNextCellCentroidMAE:centroidError/decisions,
 changeInMAEVsInertia:(inertiaError-effectError)/decisions,
 changeInMAEVsTop1:(nativeError-effectError)/decisions,
 sevenFeaturesCompletelyExact:{top1:nativeExact7,effect:effectExact7,inertia:inertiaExact7},
 sevenFeatureSingleDimensionExactFraction:{top1:top1Accurate/decisions,effect:effectAccurate/decisions},
 perChannel:nByCh.map(x=>({effect:x.effect/eligible,top1:x.top/eligible,
    inertia:x.baseline/eligible,centroid:x.centroid/eligible,
    originalBodyFeatureMotionFraction:x.bodyChanges/eligible}))};
const save=R+'original_body_native_effect_policy_test.json';
fs.writeFileSync(save,JSON.stringify(res,null,2));
console.log('CATMEOWS_ORIGINAL_BRAIN_LEARNED_EFFECT_POLICY '+JSON.stringify(res));
