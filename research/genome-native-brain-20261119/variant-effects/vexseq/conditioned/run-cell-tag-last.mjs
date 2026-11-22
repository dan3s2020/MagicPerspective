// Causal original Brain comparison of real cell identity as last native C8 symbol.
// Same real data, same published effects, same original native V42 learning.
// Original unchanged V42 Brain learns authentic K562/HepG2 variant-specific
// exon inclusion changes from 100% reconstructible REF-ALT local DNA pairs.
// ONE original Brain shared across both conditions, no outside learned head.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../../../../v17/transcend/torus-aether/devour/brain.mjs";
import {loadVexseq} from "../vexseq-source.mjs";
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const MODE=["condition-true-last","condition-blind-last"];
const LABELS=["0","-","+"],ASCII=LABELS.map(s=>s.charCodeAt(0));
const CONDITION=["K","H"],BASES="ACGT";
const fail=s=>{throw Error(s)};
const cls=value=>value>=5?"+":value<=-5?"-":"0";
const bins=r=>{
 const d=Math.min(Math.abs(r.distance3SS),Math.abs(r.distance5SS));
 return d<=3?"a":d<=10?"b":d<=25?"c":d<=50?"d":"e";
};
const input=r=>{
 const start=Math.max(0,Math.min(r.ref.length-4,r.changeIndex-2));
 const core=r.ref.slice(start,start+4),altCore=r.alt.slice(start,start+4);
 const offset=r.changeIndex-start,altBase=r.alt[r.changeIndex];
 if(core.length!==4||altCore.length!==4||offset<0||offset>3||
  core===altCore||[...core].reduce((s,c,i)=>s+Number(c!==altCore[i]),0)!==1||
  [...core].map((c,i)=>i===offset?altBase:c).join("")!==altCore)
  fail("Reference/alternative reconstruction failed for "+r.id);
 return {core,offset,altBase,metadata:bins(r)};
};
function stimulus(r,cell,mode,swapped=false){
 const p=input(r);let token=mode==="condition-blind-last"?"X":swapped?(cell==="K"?"H":"K"):cell;
 const assembled=p.metadata+String(p.offset)+p.core+p.altBase+token;
 if(assembled.length!==8||!Array.from(assembled).every(c=>c.charCodeAt(0)<128))
  fail("Original Brain context must preserve exact 8 symbols");
 return Array.from(assembled,c=>c.charCodeAt(0));
}
function sourceMeasurements(root){
 const path=root+"/processed_files/delta_PSI_values.tsv";
 const file=fs.readFileSync(path,"utf8").trim().split(/\r?\n/);
 const header=file.shift().split("\t");
 const columns=new Set(["variant","delta_psi_K","delta_psi_H"]);
 if([...columns].some(n=>!header.includes(n)))fail("Original Vex-seq source missing cell condition outputs");
 const rows=new Map();
 for(const line of file){
  const cols=line.split("\t");
  const v=Object.fromEntries(header.map((h,i)=>[h,cols[i]]));
  rows.set(v.variant,{K:Number(v.delta_psi_K),H:Number(v.delta_psi_H)});
 }
 return rows;
}
function recordClass(records,labels){
 const C=Object.fromEntries(LABELS.map(l=>[l,Object.fromEntries(LABELS.map(x=>[x,0]))]));
 for(const r of records)C[r.truth][r.prediction]++;
 const per=LABELS.map(l=>{
  const tp=C[l][l],fn=LABELS.reduce((s,x)=>s+C[l][x],0)-tp,
   fp=LABELS.reduce((s,x)=>s+C[x][l],0)-tp;
  return{label:l,support:tp+fn,recall:tp/(tp+fn||1),
   precision:tp/(tp+fp||1),f1:2*tp/(2*tp+fp+fn||1)};
 });
 return {n:records.length,correct:LABELS.reduce((s,l)=>s+C[l][l],0),
  accuracy:LABELS.reduce((s,l)=>s+C[l][l],0)/records.length,
  macroF1:per.reduce((s,x)=>s+x.f1,0)/3,
  balancedAccuracy:per.reduce((s,x)=>s+x.recall,0)/3,perClass:per,confusion:C};
}
function spearman(x,y){
 const rank=v=>{const a=v.map((val,i)=>({val,i})).sort((p,q)=>p.val-q.val);const r=new Array(v.length);
 for(let i=0;i<a.length;){let j=i+1;while(j<a.length&&a[j].val===a[i].val)j++;
  for(let k=i;k<j;k++)r[a[k].i]=(i+j-1)/2; i=j;}return r};
 const a=rank(x),b=rank(y),m=a.reduce((s,v)=>s+v,0)/a.length,
  n=b.reduce((s,v)=>s+v,0)/b.length;
 let xy=0,xx=0,yy=0;
 for(let i=0;i<a.length;i++){const p=a[i]-m,q=b[i]-n;xy+=p*q;xx+=p*p;yy+=q*q}
 return xx&&yy?xy/Math.sqrt(xx*yy):null;
}
function nativePredict(brain,r,cell,mode,swapped=false){
 const out=brain.predict(stimulus(r,cell,mode,swapped));
 if(!Array.isArray(out)||ASCII.some(c=>!Number.isFinite(out[c])))
  fail("Original V42 Brain has no finite native effect distribution");
 const p=ASCII.map(c=>Math.max(0,out[c])),sum=p.reduce((a,b)=>a+b,0);
 let winner=0;for(let i=1;i<p.length;i++)if(p[i]>p[winner])winner=i;
 return{prediction:LABELS[winner],score:sum?(p[2]-p[1])/sum:0};
}
function empiricalPredictor(train,key){
 const prior=Object.fromEntries(LABELS.map(l=>[l,1])),counts=new Map();
 for(const r of train){prior[r.truth]++;const k=key(r);
 if(!counts.has(k))counts.set(k,Object.fromEntries(LABELS.map(l=>[l,1])));
 counts.get(k)[r.truth]++;}
 return r=>{const c=counts.get(key(r))||prior;let label=LABELS[0];
 for(let i=1;i<LABELS.length;i++)if(c[LABELS[i]]>c[label])label=LABELS[i];return label;};
}
const [root,mode,...rest]=process.argv.slice(2);
if(!root||!MODE.includes(mode)||rest.length)fail("Usage: node run-cell-tag-last.mjs PINNED_VEXSEQ_ROOT condition-true-last|condition-blind-last");
if(process.env.VEXSEQ_CELL_PHASE && process.env.VEXSEQ_CELL_PHASE!=="dev")
 fail("Cell-specific final 267 real variants remain locked");
const source=loadVexseq(root),lab=sourceMeasurements(root);
if(source.splits.train.length!==1303||source.splits.dev.length!==390||
 source.splits.final.length!==267)fail("Source event partition not identical to frozen first functional benchmark");
const train=[...source.splits.train].sort((a,b)=>
 sha("vexseq-cell-native-20261122:"+a.id).localeCompare(sha("vexseq-cell-native-20261122:"+b.id)));
const trainCases=[];
for(const r of train){
 const cells=lab.get(r.id);if(!cells||!CONDITION.every(c=>Number.isFinite(cells[c])))fail("Missing measured cell outcome "+r.id);
 for(const condition of CONDITION)
  trainCases.push({r,condition,truth:cls(cells[condition]),value:cells[condition]});
}
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},
 c:{cap:8},seed:20261122});
brain.liveWorld="text";
for(const s of trainCases){
 for(const y of [...stimulus(s.r,s.condition,mode),s.truth.charCodeAt(0),10])
  brain.live(y,false);
}
if(brain.lived!==train.length*2*10)fail("Original Brain lived unexpected number of actual assay observations");
const before=brain.lived,alignBefore=brain.align?.lived;
const correct=[],swapped=[],byCondition={K:[],H:[]},pair=[],trainForControls=[];
for(const s of trainCases)trainForControls.push({r:s.r,condition:s.condition,truth:s.truth});
for(const r of source.splits.dev){
 const vals=lab.get(r.id);if(!vals||!CONDITION.every(c=>Number.isFinite(vals[c])))
  fail("Missing authentic measured Dev condition for "+r.id);
 const per={};
 for(const condition of CONDITION){
  const truth=cls(vals[condition]);
  const native=nativePredict(brain,r,condition,mode);
  const counter=nativePredict(brain,r,condition,mode,true);
  const entry={id:r.id,event:r.event,condition,truth,prediction:native.prediction,
   score:native.score,measured:vals[condition]};
  correct.push(entry);byCondition[condition].push(entry);
  swapped.push({id:r.id,condition,truth,prediction:counter.prediction,score:counter.score});
  per[condition]={truth,prediction:native.prediction};
 }
 pair.push({id:r.id,event:r.event,K:per.K,H:per.H,
  conditionActuallyDiffers:per.K.truth!==per.H.truth,
  predictedDiffers:per.K.prediction!==per.H.prediction,
  bothCorrect:per.K.truth===per.K.prediction&&per.H.truth===per.H.prediction});
}
if(brain.lived!==before||brain.align?.lived!==alignBefore)
 fail("Hidden evaluation accidentally retrained original V42 Brain");
if(mode==="condition-blind-last"&&pair.some(p=>p.predictedDiffers))
 fail("Condition-blind control must never differ solely because a hidden label changed");
const joint=recordClass(correct);
const sameCell=Object.fromEntries(CONDITION.map(c=>[c,recordClass(byCondition[c])]));
const trueDifferent=pair.filter(p=>p.conditionActuallyDiffers);
const controls={alwaysNeutral:recordClass(correct.map(s=>({...s,prediction:"0"})))};
const majorityPerCell=Object.fromEntries(CONDITION.map(cell=>{
 const labelCount=Object.fromEntries(LABELS.map(label=>[label,trainForControls.filter(t=>t.condition===cell&&t.truth===label).length]));
 const best=LABELS.reduce((a,b)=>labelCount[a]>=labelCount[b]?a:b);
 return[cell,best];
}));
controls.perCellMajority=recordClass(correct.map(s=>({...s,prediction:majorityPerCell[s.condition]})));
const empirical=empiricalPredictor(trainForControls,t=>t.condition+":"+bins(t.r)+":"+
 t.r.observedRef+">"+t.r.observedAlt);
controls.substitutionDistanceCell=recordClass(correct.map(s=>({...s,
 prediction:empirical({r:source.splits.dev.find(r=>r.id===s.id),condition:s.condition})})));
const report={
 status:"EXECUTED_AUTHENTIC_CELL_CONDITIONAL_NATIVE_C8_VARIANT_EFFECT",
 mode,originalBrainSourceUnmodified:true,
 science:"K562 versus HepG2 real Vex-seq in-vitro variant ΔPSI",
 source:{repo:source.source,commit:source.pinnedSourceCommit,verifiedSNVs:source.validatedTotal,
  originalControlGroups:source.uniqueEvents,trainGroups:77,devGroups:16,finalGroups:17},
 frozenInputEncoding:"real splice distance bin + actual mutation offset + 4 REF DNA bases + actual ALT mutation base + K/H or X (cell tag last)",
 training:{originalVariants:train.length,measuredCellCases:trainCases.length,originalLivedSymbols:brain.lived,
  selectedC:brain.e?.c?.active||null},
 evaluation:{originalVariants:source.splits.dev.length,measuredCellCases:correct.length,
  combined:joint,byCell:sameCell,
  swappedTags:recordClass(swapped),controls,
  conditionDisagreementsInTruth:trueDifferent.length,
  conditionDisagreementsPredicted:pair.filter(x=>x.predictedDiffers).length,
  conditionPairBothCorrectWhenTruthDifferent:trueDifferent.filter(x=>x.bothCorrect).length,
  spearmanCombined:spearman(correct.map(x=>x.score),correct.map(x=>x.measured)),
  spearmanByCell:Object.fromEntries(CONDITION.map(c=>[c,spearman(byCondition[c].map(x=>x.score),
    byCondition[c].map(x=>x.measured))]))},
 noOfficialFinalScoring:true,officialAlphaGenome2Comparison:false,
 interpretationLimitations:["Only one original Brain shared K/H","Manual cell and splice-distance features",
  "in-vitro reporter assay not endogenous tissue causal expression","no external model learned head","16 dev events only"]
};
if(process.env.VEXSEQ_CELL_RAW_RESULT_FILE)
 fs.writeFileSync(process.env.VEXSEQ_CELL_RAW_RESULT_FILE,
 JSON.stringify({...report,allOriginalPerCellPredictions:correct,
  experimentalCounterfactual:swapped,pairedEffectPredictions:pair},null,2)+"\n");
console.log("VEXSEQ_ORIGINAL_CELL_CONDITIONED "+JSON.stringify(report));
