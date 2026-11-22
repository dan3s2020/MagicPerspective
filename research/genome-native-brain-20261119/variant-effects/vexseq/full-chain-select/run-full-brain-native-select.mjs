// FROZEN FOLLOW-UP: original native C mask selection uses full ORIGINAL Brain.predict,
// instead of C-alone distribution, on independent authentic calibration events.
// One real ORIGINAL MagicPerspective V42 Brain. Biological outcome-gated
// ORIGINAL native LeanC.observe/reframe vs equally budgeted negative controls.
// True published Vex-seq K562/HepG2 source events; no alternate classifier.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../../../../v17/transcend/torus-aether/devour/brain.mjs";
import {candidates} from "../../../../../v17/transcend/epistemic-text/engine.mjs";
import {loadVexseq} from "../vexseq-source.mjs";

const SHA=s=>crypto.createHash("sha256").update(s).digest("hex");
const MODES=["global-true-first","outcome-true-first","outcome-true-last",
 "outcome-blind-last","alt-only-true-last"];
const LABELS=["0","-","+"],ASCII=LABELS.map(c=>c.charCodeAt(0)),CELLS=["K","H"];
const need=(okay,msg)=>{if(!okay)throw Error(msg)};
const sign=v=>v>=5?"+":v<=-5?"-":"0";
function readLab(root){
 const text=fs.readFileSync(root+"/processed_files/delta_PSI_values.tsv","utf8");
 const lines=text.trim().split(/\r?\n/),h=lines.shift().split("\t");
 need(h.includes("delta_psi_K")&&h.includes("delta_psi_H"),"Missing source cell observations");
 return new Map(lines.map(line=>{
  const p=line.split("\t"),r=Object.fromEntries(h.map((v,i)=>[v,p[i]]));
  return[r.variant,{K:Number(r.delta_psi_K),H:Number(r.delta_psi_H)}];
 }));
}
function positionBin(r){
 const d=Math.min(Math.abs(r.distance3SS),Math.abs(r.distance5SS));
 return d<=3?"a":d<=10?"b":d<=25?"c":d<=50?"d":"e";
}
function actualWindow(r){
 const from=Math.max(0,Math.min(r.ref.length-4,r.changeIndex-2));
 const ref=r.ref.slice(from,from+4),alt=r.alt.slice(from,from+4);
 const offset=r.changeIndex-from,mutated=r.alt[r.changeIndex];
 need(ref.length===4&&alt.length===4&&offset>=0&&offset<4&&
  [...ref].map((base,i)=>i===offset?mutated:base).join("")===alt&&
  [...ref].filter((base,i)=>base!==alt[i]).length===1,
  "Published reference/alternative DNA not losslessly reconstructible "+r.id);
 return {ref,alt,offset,mutated,bin:positionBin(r)};
}
function stimulus(r,cell,mode,swap=false){
 const v=actualWindow(r);
 const token=mode==="outcome-blind-last"?"X":swap?(cell==="K"?"H":"K"):cell;
 const result=mode.endsWith("first")?
   token+v.bin+String(v.offset)+v.ref+v.mutated:
   v.bin+String(v.offset)+v.ref+v.mutated+token;
 need(result.length===8,"Wrong actual original C8 sensory context");
 return Array.from(result,c=>c.charCodeAt(0));
}
function getMeasuredCase(r,cell,lab){
 const values=lab.get(r.id);
 need(values&&Number.isFinite(values[cell]),"Missing authentic cell-specific ΔPSI "+r.id);
 return{r,cell,truth:sign(values[cell]),value:values[cell]};
}
function sourceRecords(source,lab){
 const allOriginalGroups=[...new Set(source.splits.train.map(r=>r.event))];
 need(allOriginalGroups.length===77,"Original train event groups changed");
 allOriginalGroups.sort((a,b)=>SHA("vexseq-outcome-calibration-groups-v1:"+a)
   .localeCompare(SHA("vexseq-outcome-calibration-groups-v1:"+b)));
 const calibrationEvents=new Set(allOriginalGroups.slice(0,10));
 const train=source.splits.train.filter(r=>!calibrationEvents.has(r.event));
 const calib=source.splits.train.filter(r=>calibrationEvents.has(r.event));
 need(new Set(train.map(r=>r.event)).size===67&&
  new Set(calib.map(r=>r.event)).size===10&&
  train.length+calib.length===1303,"Train/calibration event leakage");
 const sortVariants=xs=>[...xs].sort((a,b)=>SHA("vexseq-outcome-train-order-v1:"+a.id)
   .localeCompare(SHA("vexseq-outcome-train-order-v1:"+b.id)));
 const toCases=xs=>xs.flatMap(r=>CELLS.map(cell=>getMeasuredCase(r,cell,lab)));
 return{train:toCases(sortVariants(train)),calib:toCases(sortVariants(calib)),
   dev:toCases(source.splits.dev),calibrationEvents:[...calibrationEvents].sort((a,b)=>a-b),
   trainingEvents:allOriginalGroups.slice(10)};
}
function nativePrediction(brain,bytes){
 const out=brain.predict(bytes);
 need(Array.isArray(out)&&ASCII.every(i=>Number.isFinite(out[i])),
  "Original native Brain did not produce an effect probability distribution");
 return interpreted(out);
}
function interpreted(dist){
 const prob=ASCII.map(i=>Math.max(0,dist[i]||0)),denom=prob.reduce((a,b)=>a+b,0);
 let index=0;for(let i=1;i<prob.length;i++)if(prob[i]>prob[index])index=i;
 return{pred:LABELS[index],score:denom?(prob[2]-prob[1])/denom:0};
}
function matrix(rows){
 const confusion=Object.fromEntries(LABELS.map(l=>[l,Object.fromEntries(LABELS.map(o=>[o,0]))]));
 for(const x of rows){
  need(LABELS.includes(x.truth)&&LABELS.includes(x.pred),"Invalid native class");
  confusion[x.truth][x.pred]++;
 }
 const per=LABELS.map(l=>{
  const tp=confusion[l][l],support=LABELS.reduce((s,k)=>s+confusion[l][k],0);
  const fp=LABELS.reduce((s,k)=>s+confusion[k][l],0)-tp,fn=support-tp;
  return{label:l,support,precision:tp/(tp+fp||1),recall:tp/(support||1),
   f1:2*tp/(2*tp+fp+fn||1)};
 });
 const acc=per.reduce((s,x)=>s+confusion[x.label][x.label],0)/(rows.length||1);
 return{n:rows.length,correct:Math.round(acc*rows.length),accuracy:acc,
  macroF1:per.reduce((s,x)=>s+x.f1,0)/3,
  balancedAccuracy:per.reduce((s,x)=>s+x.recall,0)/3,
  perClass:per,confusion};
}
function ranks(xs){
 const sort=xs.map((v,i)=>({v,i})).sort((a,b)=>a.v-b.v);const result=new Array(xs.length);
 for(let i=0;i<sort.length;){
  let j=i+1;while(j<sort.length&&sort[j].v===sort[i].v)j++;
  for(let k=i;k<j;k++)result[sort[k].i]=(i+j-1)/2;
  i=j;
 }
 return result;
}
function rho(rows){
 const a=ranks(rows.map(x=>x.score)),b=ranks(rows.map(x=>x.value));
 const am=a.reduce((s,x)=>s+x,0)/a.length,bm=b.reduce((s,x)=>s+x,0)/b.length;
 let xy=0,xx=0,yy=0;
 for(let i=0;i<a.length;i++){const p=a[i]-am,q=b[i]-bm;xy+=p*q;xx+=p*p;yy+=q*q;}
 return xx&&yy?xy/Math.sqrt(xx*yy):null;
}
function biologicalPairReadout(records){
 need(records.length%2===0,"Pair records must match K and H");
 const paired=new Map();
 for(const r of records){
  if(!paired.has(r.id))paired.set(r.id,{});
  paired.get(r.id)[r.cell]=r;
 }
 let trueDifferent=0,predDifferent=0,bothCorrect=0,bothCorrectDiscordant=0,changedCorrect=0;
 for(const [id,p] of paired){
  need(p.K&&p.H,"Actual measured K/H case missing "+id);
  const mismatch=p.K.truth!==p.H.truth,predMismatch=p.K.pred!==p.H.pred;
  if(mismatch)trueDifferent++;
  if(predMismatch)predDifferent++;
  if(p.K.pred===p.K.truth&&p.H.pred===p.H.truth){
   bothCorrect++;if(mismatch)bothCorrectDiscordant++;
  }
  if(mismatch&&predMismatch&&p.K.pred===p.K.truth&&p.H.pred===p.H.truth)
   changedCorrect++;
 }
 return{nPairs:paired.size,truthDifferentPairs:trueDifferent,predictedDifferentPairs:predDifferent,
  bothCellOutcomesCorrect:bothCorrect,bothCellOutcomesCorrectWhenTruthDiffers:bothCorrectDiscordant,
  correctlyChangedCellResponse:changedCorrect};
}
function baseline(train,dev){
 const classMajority=Object.fromEntries(LABELS.map(l=>[l,1]));
 const keyed=new Map();
 const key=x=>x.cell+":"+positionBin(x.r)+":"+x.r.observedRef+">"+x.r.observedAlt;
 for(const r of train){
  classMajority[r.truth]++;
  const k=key(r);
  if(!keyed.has(k))keyed.set(k,Object.fromEntries(LABELS.map(l=>[l,1])));
  keyed.get(k)[r.truth]++;
 }
 const pick=counts=>LABELS.reduce((best,l)=>counts[l]>counts[best]?l:best,"0");
 const pred=dev.map(x=>({...x,pred:pick(keyed.get(key(x))||classMajority)}));
 return{alwaysNeutral:matrix(dev.map(x=>({...x,pred:"0"}))),
  substitutionDistanceCell:matrix(pred),majorityFromTrain:pick(classMajority)};
}
function originalNativeCandidates(brain,mode){
 // Position 0 is MOST RECENT after Brain.ctxOf(); original input is reversed.
 const first=mode.endsWith("first");
 const required=first?
   [{bit:0,name:"ALT"},{bit:5,name:"mutationOffset"},{bit:7,name:"cell"}]:
   [{bit:0,name:"cell"},{bit:1,name:"ALT"},{bit:6,name:"mutationOffset"}];
 const refBits=first?[1,2,3,4]:[2,3,4,5];
 const allowed=candidates(8).filter(p=>{
  if(!["exact","fold"].includes(p.kind))return false;
  if(required.some(x=>!(p.mask&(1<<x.bit))))return false;
  if(!refBits.some(bit=>p.mask&(1<<bit)))return false;
  return true;
 });
 need(brain.e.c.maxLag===8&&allowed.length===60,
  "Original C capacity or native perspective coverage changed: "+allowed.length);
 need(!brain.e.c.top?.length,"Original C ensemble must be disabled for causal readout");
 return{allowed,tokenMap:first?["ALT","REF3","REF2","REF1","REF0","mutationOffset","spliceBin","cell"]:
  ["cell","ALT","REF3","REF2","REF1","REF0","mutationOffset","spliceBin"]};
}
function selectionByFullOriginalBrainCalibration(brain,cases,mode){
 const originalActive=brain.e.c.active;
 const lives=brain.lived,ep=brain.e.c.episodes;
 const {allowed,tokenMap}=originalNativeCandidates(brain,mode);
 const calibrated=cases.map(r=>({
  ...r,ctx:brain.ctxOf(stimulus(r.r,r.cell,mode),8)}));
 const permutation=calibrated.slice().sort((a,b)=>
  SHA("vexseq-shuffle-cal-outcome-v1:"+a.r.id+":"+a.cell)
   .localeCompare(SHA("vexseq-shuffle-cal-outcome-v1:"+b.r.id+":"+b.cell)))
   .map(x=>x.truth);
 // Numeric class distribution preserved by permuting the truth among cases.
 const scored=[];
 for(const native of allowed){
  brain.e.c.active=native.id;
  // Biological outcome CALIBRATION must score the SAME native output
  // used in actual evaluation: C + original A paths + original backward merge.
  const predictions=calibrated.map(x=>
   nativePrediction(brain,stimulus(x.r,x.cell,mode)).pred);
  const rows=calibrated.map((r,i)=>({truth:r.truth,pred:predictions[i]}));
  const shuffledRows=calibrated.map((r,i)=>({truth:permutation[i],pred:predictions[i]}));
  const m=matrix(rows),nullM=matrix(shuffledRows);
  scored.push({id:native.id,mask:native.mask,kind:native.kind,m,
   shuffleScore:nullM.macroF1,shuffleAccuracy:nullM.accuracy});
 }
 brain.e.c.active=originalActive;
 need(brain.lived===lives&&brain.e.c.episodes===ep,
  "Original native calibration must not alter learned Brain memory");
 scored.sort((a,b)=>b.m.macroF1-a.m.macroF1||
  b.m.balancedAccuracy-a.m.balancedAccuracy||
  a.id.localeCompare(b.id));
 const best=scored[0];
 const shuffled=[...scored].sort((a,b)=>b.shuffleScore-a.shuffleScore||
  b.shuffleAccuracy-a.shuffleAccuracy||a.id.localeCompare(b.id))[0];
 const brief=x=>({id:x.id,mask:x.mask,kind:x.kind,selectedTokens:tokenMap.filter((_,bit)=>x.mask&(1<<bit)),
  correctCalibrationMacroF1:x.m.macroF1,calibrationAccuracy:x.m.accuracy,
  shuffledCalibrationMacroF1:x.shuffleScore});
 return{selfSelectedBeforeCalibration:originalActive,nCandidateMasks:allowed.length,
  selectedByTruth:brief(best),selectedByShuffledTruth:brief(shuffled),
  maxLag:brain.e.c.maxLag,trainOnlyCOutcomeCount:brain.e.c.episodes,
  calibrationCases:cases.length,calibrationLabels:Object.fromEntries(LABELS.map(l=>[l,cases.filter(x=>x.truth===l).length])),
  topFiveReal:scored.slice(0,5).map(brief),nativeCandidateIds:allowed.map(x=>x.id)};
}
function evaluateReadout(brain,rows,mode,selectedId,withCounterfactual=true){
 const old=brain.e.c.active,oldLived=brain.lived,oldC=brain.e.c.episodes;
 brain.e.c.active=selectedId;
 const pred=[],swapped=[];
 try{
  for(const r of rows){
   const out=nativePrediction(brain,stimulus(r.r,r.cell,mode));
   pred.push({id:r.r.id,event:r.r.event,cell:r.cell,truth:r.truth,value:r.value,...out});
   if(withCounterfactual){
    const sw=nativePrediction(brain,stimulus(r.r,r.cell,mode,true));
    swapped.push({id:r.r.id,event:r.r.event,cell:r.cell,truth:r.truth,value:r.value,...sw});
   }
  }
 }finally{brain.e.c.active=old;}
 need(brain.lived===oldLived&&brain.e.c.episodes===oldC,
  "Evaluation mutated native Brain learning state");
 const perCell=Object.fromEntries(CELLS.map(c=>[c,matrix(pred.filter(r=>r.cell===c))]));
 const result={activeNativeC:selectedId,combined:matrix(pred),perCell,
  biologicalPairs:biologicalPairReadout(pred),spearmanCombined:rho(pred),
  spearmanByCell:Object.fromEntries(CELLS.map(c=>[c,rho(pred.filter(x=>x.cell===c))])),
  swappedCell:matrix(swapped),swappedPairs:biologicalPairReadout(swapped)};
 return{summary:result,raw:{predictions:pred,swapped}};
}
const [root,mode,...extra]=process.argv.slice(2);
need(root&&MODES.includes(mode)&&!extra.length,
 "Usage: node run-native-outcome-gated.mjs VEXSEQ_SOURCE global-true-first|outcome-true-first|outcome-true-last|outcome-blind-last|alt-only-true-last");
need(!process.env.VEXSEQ_OUTCOME_PHASE||process.env.VEXSEQ_OUTCOME_PHASE==="dev",
 "Official final Vexseq variant effects remain forbidden until a separately frozen protocol");
const source=loadVexseq(root),lab=readLab(root),split=sourceRecords(source,lab);
need(source.splits.final.length===267&&source.splits.dev.length===390&&
 split.train.length>900&&split.calib.length>80&&split.dev.length===780,
 "Actual original event-separated Vexseq source unexpectedly changed");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},
 c:{cap:8},seed:20261122});
brain.liveWorld="text";
const nativeObserve=brain.e.c.observe.bind(brain.e.c);
let cAllowed=false,originalCObserve=0;
if(mode!=="global-true-first"){
 brain.e.c.observe=(ctx,y)=>{
  if(cAllowed){originalCObserve++;return nativeObserve(ctx,y);}
  return undefined;
 };
}
for(const s of split.train){
 const bytes=stimulus(s.r,s.cell,mode);
 for(let i=0;i<bytes.length;i++){
  cAllowed=mode==="alt-only-true-last"&&i===6;
  brain.live(bytes[i],false);
 }
 cAllowed=mode.startsWith("outcome-");
 brain.live(s.truth.charCodeAt(0),false);
 cAllowed=false;
 brain.live(10,false);
}
need(brain.lived===split.train.length*10,"Native original Brain symbol budget mismatched");
const expectedC=mode==="global-true-first"?split.train.length*10:split.train.length;
need(brain.e.c.episodes===expectedC,
 "Native C gating did not result in exact declared target/matched-control updates");
const actual=mode==="global-true-first"?expectedC:originalCObserve;
need(actual===expectedC,"Unexpected skipped outcome observation count");
const calibration=selectionByFullOriginalBrainCalibration(brain,split.calib,mode);
const auto=evaluateReadout(brain,split.dev,mode,calibration.selfSelectedBeforeCalibration);
const trueCal=evaluateReadout(brain,split.dev,mode,calibration.selectedByTruth.id);
const shuffledCal=evaluateReadout(brain,split.dev,mode,calibration.selectedByShuffledTruth.id);
const report={
 name:"ORIGINAL_V42_NATIVE_C8_MASK_CALIBRATED_BY_FULL_BRAIN_CHAIN_ON_REAL_K_H_MUTATION_EFFECTS",
 phase:"EXPLORATORY_16_SOURCE_EVENT_DEV_NOT_OFFICIAL_FINAL",
 mode,originalBrainSourceUntouched:true,
 source:{repo:source.source,pinnedCommit:source.pinnedSourceCommit,originalSha256:source.sourceInputSHA256,
  trueSNVs:source.validatedTotal,trainVariants:split.train.length/2,
  trainOriginalEventGroups:67,calibrationVariants:split.calib.length/2,calibrationEventGroups:10,
  devVariants:390,devOriginalEventGroups:16,finalVariantsLocked:267,finalEventGroups:17,
  calibrationOriginalSourceEventIDs:split.calibrationEvents,
  actualTrainSourceEvents:split.trainingEvents},
 nativeMechanism:{oneOriginalBrain:true,sameRealBiologicalInputBytesForAllModes:true,
  nativeCObservesOnlyGenuineOutcome:mode.startsWith("outcome-"),
  nativeCObservesOnlyAltBase:mode==="alt-only-true-last",
  allOtherBrainOrgansStillLiveEveryInputAndRealLabel:true,
  actualBrainLivedSymbols:brain.lived,
  originalCObserveCalls:expectedC,originalCMaxLag:brain.e.c.maxLag,
  originalSelfSelectedC:calibration.selfSelectedBeforeCalibration,
  originalCActiveAfterScoring:brain.e.c.active,originalCNativeModelCount:Object.keys(brain.e.c.models).length,
  noExternalTrainablePredictionHead:true},
 originalNativeFullBrainCalibration:calibration,
 evaluation:{auto: auto.summary,calibrationNativeC:trueCal.summary,
  shuffledCalibrationNativeC:shuffledCal.summary,
  matchedStatisticalReference:baseline(split.train,split.dev)},
 truthAtNativePredictionHidden:true,
 noFinalEvaluation:true,notAlphaGenome2Benchmarked:true,
 limitations:["K562/HepG2 laboratory reporter assay short local reference-alternative window",
  "Original human genome event-group split only (not homolog-disjoint)",
  "Calibration chooser is human-authored outcome scorer of ORIGINAL C candidate pool, not autonomously invented objective",
  "Native C gating also affects A learning through predecessor beliefs",
  "Unexamined final 267 Vexseq variants protected"]
};
if(process.env.VEXSEQ_OUTCOME_RAW_FILE)
 fs.writeFileSync(process.env.VEXSEQ_OUTCOME_RAW_FILE,
 JSON.stringify({...report,devOriginalPredictions:{
  nativeSelfSelected:auto.raw,calibrationNativeC:trueCal.raw,
  shuffledCalibrationNativeC:shuffledCal.raw}},null,2)+"\n");
console.log("VEXSEQ_NATIVE_FULL_CHAIN_SELECTION_RESULT "+JSON.stringify(report));
