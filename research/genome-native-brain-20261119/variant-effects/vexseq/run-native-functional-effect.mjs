// Authentic measured human Vex-seq ΔPSI consequence: ORIGINAL V42 Brain only.
// Reference and alternate 4-base local windows are source-verified from
// real experimental construct DNA, not synthesized mutation effects.
// No external learned predictor is connected to the original Brain.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";
import {loadVexseq,summarize} from "./vexseq-source.mjs";

const MODES={
 "native-C8-pair":{cap:8,kind:"pair",off:["R2","R3"]},
 "native-C9-position":{cap:9,kind:"position",off:["R2","R3"]},
 "native-C9-corrupted-position":{cap:9,kind:"corrupt",off:["R2","R3"]},
 "native-C9-position-R3":{cap:9,kind:"position",off:["R2"]}
};
const LABELS=["0","-","+"],LABEL_BYTES=LABELS.map(s=>s.charCodeAt(0));
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const fail=s=>{throw Error(s)};
const bytes=s=>Array.from(s,c=>c.charCodeAt(0));
function binOf(record){
 const d=Math.min(Math.abs(record.distance3SS),Math.abs(record.distance5SS));
 return d<=3?"a":d<=10?"b":d<=25?"c":d<=50?"d":"e";
}
function corruptBin(record){
 const i=parseInt(sha("vexseq-corrupted-coordinate-v1:"+record.id).slice(0,8),16)%5;
 return "abcde"[i];
}
function context(r,cfg){
 const start=Math.max(0,Math.min(r.ref.length-4,r.changeIndex-2));
 const before=r.ref.slice(start,start+4),after=r.alt.slice(start,start+4);
 if(before.length!==4||after.length!==4||
  [...before].reduce((count,b,i)=>count+Number(b!==after[i]),0)!==1)
  fail("Authentic REF/ALT context failed exact one base invariant "+r.id);
 const core=before+after;
 return bytes(cfg.kind==="position"?binOf(r)+core:cfg.kind==="corrupt"?corruptBin(r)+core:core);
}
function rank(values){
 const sorted=values.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);
 const result=new Array(values.length);
 for(let i=0;i<sorted.length;){
  let j=i+1;while(j<sorted.length&&sorted[j].v===sorted[i].v)j++;
  const mid=(i+j-1)/2+1;
  for(let k=i;k<j;k++)result[sorted[k].i]=mid;
  i=j;
 }
 return result;
}
function correlation(a,b){
 if(a.length!==b.length||a.length<3)fail("Invalid correlation arrays");
 const ra=rank(a),rb=rank(b);
 const am=ra.reduce((s,x)=>s+x,0)/ra.length,bm=rb.reduce((s,x)=>s+x,0)/rb.length;
 let cross=0,aa=0,bb=0;
 for(let i=0;i<ra.length;i++){
  const x=ra[i]-am,y=rb[i]-bm;cross+=x*y;aa+=x*x;bb+=y*y;
 }
 return aa&&bb?cross/Math.sqrt(aa*bb):null;
}
function trainLookup(rows,key){
 const map=new Map(),global=Object.fromEntries(LABELS.map(l=>[l,1]));
 for(const r of rows){
  global[r.effectClass]++;const k=key(r);
  if(!map.has(k))map.set(k,Object.fromEntries(LABELS.map(l=>[l,1])));
  map.get(k)[r.effectClass]++;
 }
 return r=>{
  const counts=map.get(key(r))||global;
  const labels=[...LABELS].sort((a,b)=>counts[b]-counts[a]);
  return labels[0];
 };
}
function metrics(records){
 const conf=Object.fromEntries(LABELS.map(a=>[a,Object.fromEntries(LABELS.map(b=>[b,0]))]));
 const perClass=LABELS.map(l=>{
  for(const r of records)if(r.truth===l&&!LABELS.includes(r.prediction))fail("Invalid label emitted");
  return{label:l};
 });
 for(const r of records)conf[r.truth][r.prediction]++;
 for(const row of perClass){
  const l=row.label,tp=conf[l][l];
  const support=LABELS.reduce((s,k)=>s+conf[l][k],0);
  const fp=LABELS.filter(k=>k!==l).reduce((s,k)=>s+conf[k][l],0);
  const fn=support-tp;
  row.support=support;row.precision=tp/(tp+fp||1);
  row.recall=tp/(support||1);row.f1=2*tp/(2*tp+fp+fn||1);
 }
 const correct=LABELS.reduce((s,l)=>s+conf[l][l],0);
 return{n:records.length,correct,accuracy:correct/records.length,
  macroF1:perClass.reduce((s,x)=>s+x.f1,0)/3,
  balancedAccuracy:perClass.reduce((s,x)=>s+x.recall,0)/3,
  perClass,confusion:conf};
}
const [folder,mode,...other]=process.argv.slice(2);
if(!folder||!Object.hasOwn(MODES,mode)||other.length)
 fail("Usage: node run-native-functional-effect.mjs VEXSEQ_ROOT native-C8-pair|native-C9-position|native-C9-corrupted-position|native-C9-position-R3");
if(process.env.VEXSEQ_PHASE && process.env.VEXSEQ_PHASE!=="dev")
 fail("The original functional-variant final 267 samples are locked before model selection");
const source=loadVexseq(folder),cfg=MODES[mode];
if(source.validatedTotal!==1960||source.splits.train.length!==1303||
 source.splits.dev.length!==390||source.splits.final.length!==267)
 fail("Published REF/ALT experimental group split changed");
const training=[...source.splits.train].sort((a,b)=>sha("vexseq-live-20261122:"+a.id).localeCompare(sha("vexseq-live-20261122:"+b.id)));
const dev=source.splits.dev;
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:cfg.off},
 c:{cap:cfg.cap},seed:20261122});
brain.liveWorld="text";
const pre=brain.lived;
for(const r of training){
 for(const y of [...context(r,cfg),r.effectClass.charCodeAt(0),10])
  brain.live(y,false);
}
const expected=training.length*(cfg.cap+2);
if(brain.lived-pre!==expected)fail("Native Brain learned unexpected symbol count");
const lived=brain.lived,aligned=brain.align?.lived;
const scored=[];
for(const r of dev){
 const dist=brain.predict(context(r,cfg));
 if(!Array.isArray(dist)||LABEL_BYTES.some(i=>!Number.isFinite(dist[i])))
  fail("Original Brain did not produce finite native effect distribution");
 const probabilities=LABEL_BYTES.map(i=>Math.max(0,dist[i]));
 const sum=probabilities.reduce((s,x)=>s+x,0);
 const indexed=probabilities.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p||a.i-b.i);
 const predicted=LABELS[indexed[0].i];
 scored.push({id:r.id,event:r.event,truth:r.effectClass,prediction:predicted,
  deltaPSI:r.deltaPSI,effectRanking:sum?(probabilities[2]-probabilities[1])/sum:0,
  nativeEffectProbabilities:Object.fromEntries(LABELS.map((l,i)=>[l,probabilities[i]])),
  originalRealVariantHash:sha(r.ref+"|"+r.alt)});
}
if(brain.lived!==lived||brain.align?.lived!==aligned)
 fail("Native original Brain mutated during development evaluation");
const primary=metrics(scored),majority=training.reduce((o,r)=>(o[r.effectClass]++,o),
 Object.fromEntries(LABELS.map(l=>[l,0])));
const bestLabel=[...LABELS].sort((a,b)=>majority[b]-majority[a])[0];
const cMajority=metrics(dev.map(r=>({truth:r.effectClass,prediction:bestLabel})));
const bySubstitution=trainLookup(training,r=>r.observedRef+">"+r.observedAlt);
const byDistanceAndSub=trainLookup(training,r=>binOf(r)+":"+r.observedRef+">"+r.observedAlt);
const baselines={
 majority:{classLabel:bestLabel,...cMajority},
 substitution:metrics(dev.map(r=>({truth:r.effectClass,prediction:bySubstitution(r)}))),
 substitutionDistance:metrics(dev.map(r=>({truth:r.effectClass,prediction:byDistanceAndSub(r)})))
};
const spearman=correlation(scored.map(r=>r.effectRanking),scored.map(r=>r.deltaPSI));
const actualSignSubset=scored.filter(r=>r.truth!=="0");
const strongSignAccuracy=actualSignSubset.length?actualSignSubset.filter(r=>r.prediction===r.truth).length/actualSignSubset.length:null;
const result={
 status:"EXECUTED_REAL_ASSAY_NATIVE_BRAIN_DELTA_PSI_CATEGORY_NOT_ALPHA_GENOME",
 task:"Real experimentally measured Vex-seq REF vs ALT variant effects on exon inclusion",
 phase:"DEVELOPMENT_EVENT_GROUP_HELDOUT_NOT_FINAL",
 mode,config:cfg,originalBrainUnmodified:true,
 nativeTraining:{records:training.length,livedSymbols:lived,selectedC:brain.e?.c?.active||null,
  maxLag:brain.e?.c?.maxLag??null,originalNativeModelCandidates:brain.e?.c?.models?.length??null},
 publishedSource:{commit:source.pinnedSourceCommit,hashes:source.sourceInputSHA256,
  validatedVariants:source.validatedTotal,events:source.uniqueEvents,
  rejected:source.rejected,train:summarize(training),dev:summarize(dev),
  finalLocked:true,finalCount:source.splits.final.length},
 native:{...primary,continuousDeltaPSIRankSpearman:spearman,
  strongEffectSignedClassExactAccuracy:strongSignAccuracy,
  strongEffectN:actualSignSubset.length},
 baselines,
 biologicalCaveats:["3-class ±5 percentage point outcome (not quantitative effect regression)",
  "In vitro reporter assay","locus-group heldout, homology-independent status unknown",
  "no AlphaGenome 2 API or matched outputs","native perspective manually centered at the measured variant"],
 targetHiddenAtInference:true,finalTestNotAccessed:true
};
if(process.env.VEXSEQ_NATIVE_RESULT_FILE)
 fs.writeFileSync(process.env.VEXSEQ_NATIVE_RESULT_FILE,JSON.stringify({...result,perExample:scored},null,2)+"\n");
console.log("VEXSEQ_NATIVE_VARIANT_EFFECT_RESULT "+JSON.stringify(result));
