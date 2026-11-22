// OFFICIAL ONE-SHOT FROZEN ORIGINAL native LeanC.top MFASS-v2 8324 genetic variants.
// Source-coded native masks and K fixed BEFORE any official group was scored.
// Date 2026-11-23. NEW, separately preregistered use of existing original
// LeanC.top native multi-perspective mechanism, no rewrite of V42 source.
// One genuine original V42 Brain, 120 PRE-EXISTING native C masks;
// CHOOSE by source-real 150-gene-group calibration average precision;
// source-only 150-gene DEV, never original official MFASS-v2 test.
// ORIGINAL V42 Brain on real 27,733-variant MFASS human functional splice effects.
// Trains only on official TRAIN, with a NEW whole-gene/exon group internal split.
// Official original 8,324 variant TEST never exposed to native predictor.
// No alternate learned prediction model, fabricated labels, or changed Brain source.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../../../../v17/transcend/torus-aether/devour/brain.mjs";
import {candidates} from "../../../../../v17/transcend/epistemic-text/engine.mjs";
import {loadMfassOneShotFinal,physicalFeature} from "./mfass-source-one-shot-final.mjs";
const SHA=s=>crypto.createHash("sha256").update(s).digest("hex");
const need=(v,msg)=>{if(!v)throw Error(msg)};
const MODES=["outcome-c"];
const [src,bench,mode,...extra]=process.argv.slice(2);
need(src&&bench&&MODES.includes(mode)&&!extra.length,
 "Usage: node run-original-brain-AP-select.mjs ORIGINAL_SOURCE CORRECTED_BENCHMARK outcome-c");
need(process.env.MFASS_NATIVE_PHASE==="official-final",
 "Official MFASS final may only run with the frozen official-final phase gate");
const data=loadMfassOneShotFinal(src,bench);
need(data.sampleCounts.train.groups===827&&data.sampleCounts.dev.groups===150&&
 data.sampleCounts.calibration.groups===150&&data.canonical.officialTestProtectedN===8324,
 "FROZEN REAL SOURCE gene-group partition changed");
// Include all real eligible genuine source TRAIN variants ONCE. No rebalancing.
const tr=[...data.split.train].sort((a,b)=>SHA("MFASS-NATIVE-TRAIN-BODY-V1:"+a.id)
 .localeCompare(SHA("MFASS-NATIVE-TRAIN-BODY-V1:"+b.id)));
const dev=data.officialTest,calibrationRows=data.split.calibration;
need(tr.length===14498&&dev.length===8324&&calibrationRows.length===2421&&
 new Set(dev.map(r=>r.group)).size===463&&
 dev.reduce((v,r)=>v+r.strongDisruption,0)===315,
 "MFASS real gene-separated experiment too small; fail rather than fake");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},
 c:{cap:8},seed:20261122});
brain.liveWorld="text";
// Original, unchanged native C.observe is called at distinct world moments.
const originalObserve=brain.e.c.observe.bind(brain.e.c);
let allowC=false,observedC=0;
if(mode!=="global-c"){
 brain.e.c.observe=(ctx,y)=>{
  if(allowC){observedC++;return originalObserve(ctx,y);}
  return undefined;
 };
}
for(const r of tr){
 const physical=physicalFeature(r);
 for(let i=0;i<8;i++){
  allowC=mode==="alt-c"&&i===7;
  brain.live(physical.stimulus[i],false);
 }
 allowC=mode==="outcome-c";
 brain.live((r.strongDisruption?"1":"0").charCodeAt(0),false);
 allowC=false;
 brain.live(10,false);
}
const expectedNativeSymbols=tr.length*10;
need(brain.lived===expectedNativeSymbols,"Original native Brain did not live each authentic observed symbol");
const expectedC=mode==="global-c"?expectedNativeSymbols:tr.length;
need(brain.e.c.episodes===expectedC&&
 (mode==="global-c"||observedC===expectedC),
 "Original native C episode count differs from frozen biological moment schedule");
need(brain.e.c.maxLag===8,"Original native C did not reach 8-nucleotide perspective");
// Native original Brain probability is final FULL A/C chain, not an outside head.
// Official test may not be predicted before the frozen source CALIBRATION
// is fully repeated and its predetermined masks are asserted.
function rankStats(rows){
 need(rows.length>0,"Cannot compute rare-effect ranking on empty real assay");
 const sorted=[...rows].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const P=sorted.reduce((s,r)=>s+r.truth,0),N=sorted.length-P;
 need(P>0&&N>0,"Split lacks positive/negative actual MFASS outcomes");
 let tp=0,area=0,distinct=0,tpAt100=0,topN=Math.min(100,sorted.length),
  tpAt10Percent=0,tenth=Math.max(1,Math.ceil(0.1*sorted.length));
 for(let i=0;i<sorted.length;){
  let j=i+1,groupPos=sorted[i].truth;
  while(j<sorted.length&&sorted[j].score===sorted[i].score){groupPos+=sorted[j].truth;j++;}
  tp+=groupPos;
  area+=(groupPos/P)*(tp/j); // noninterpolated average precision, same tied-score convention as sklearn.
  const rankOverlap=(start,k)=>Math.max(0,Math.min(j,k)-start);
  if(i<topN)tpAt100+=rankOverlap(i,topN)*(groupPos/(j-i));
  if(i<tenth)tpAt10Percent+=rankOverlap(i,tenth)*(groupPos/(j-i));
  i=j;distinct++;
 }
 // Tie-aware AUC as Mann-Whitney: positives rank above negatives, ties=0.5.
 let wins=0,prefixNeg=0;
 for(let i=sorted.length-1;i>=0;){
  let start=i,positive=sorted[i].truth,negative=1-sorted[i].truth;
  while(start>0&&sorted[start-1].score===sorted[i].score){
   start--;positive+=sorted[start].truth;negative+=1-sorted[start].truth;
  }
  wins+=positive*prefixNeg+0.5*positive*negative;
  prefixNeg+=negative;
  i=start-1;
 }
 return{n:sorted.length,positive:P,negative:N,prevalence:P/sorted.length,
  averagePrecision:area,AUROC:wins/(P*N),
  expectedPrecisionAt100UnderTies:tpAt100/topN,
  expectedTruePositivesAt100UnderTies:tpAt100,
  precisionInTop10PercentWithTieFraction:tpAt10Percent/tenth,
  distinctOriginalNativeScores:distinct,
  top100NativeScores:{highest:sorted[0].score,rank100:sorted[topN-1].score,
   lowest:sorted.at(-1).score}};
}
function trainingOnlyEmpirical(rows,evalRows){
 // Non-organism reference: Laplace-smoothed original published physical
 // region + splice boundary distance + actual REF>ALT substitution.
 const histogram=new Map(),totals={positive:0,total:0};
 for(const r of rows){
  const key=physicalFeature(r).basicKey;
  if(!histogram.has(key))histogram.set(key,{positive:0,total:0});
  const bin=histogram.get(key);bin.positive+=r.strongDisruption;bin.total++;
  totals.positive+=r.strongDisruption;totals.total++;
 }
 const pPrior=(totals.positive+1)/(totals.total+2);
 return{pPrior,numberSourceOnlyCategories:histogram.size,
  records:evalRows.map(r=>{
   const h=histogram.get(physicalFeature(r).basicKey);
   const score=h?(h.positive+2*pPrior)/(h.total+2):pPrior;
   return{id:r.id,group:r.group,truth:r.strongDisruption,score};
  })};
}

function fullNativeScoreForSequence(r){
 const native=brain.predict(physicalFeature(r).stimulus);
 need(Array.isArray(native)&&Number.isFinite(native[48])&&Number.isFinite(native[49]),
  "Original full V42 Brain missing binary lab-effect output at native mask");
 const zero=Math.max(0,native[48]),one=Math.max(0,native[49]);
 return zero+one>0?one/(zero+one):0.5;
}
const autoNativeMask=brain.e.c.active;
need(autoNativeMask==="class:1","Frozen source-native self-selection changed, do not compare as identical experiment");
const allowed=candidates(8).filter(p=>
 (p.kind==="exact"||p.kind==="fold")&&
 !!(p.mask&1)&&!!(p.mask&(1<<5))&&
 !!(p.mask&(2|4|8|16))
);
need(allowed.length===120&&brain.e.c.maxLag===8,
 "Original native C8 candidate count differs from pre-registered candidate set");
const preCalLived=brain.lived,preCalCEpisodes=brain.e.c.episodes;
const labels=calibrationRows.map(r=>r.strongDisruption);
const permuted=[...labels];
for(let i=permuted.length-1;i>0;i--){
 const j=parseInt(SHA("mfass-shuffled-calibration-effect-v1:"+i).slice(0,8),16)%(i+1);
 [permuted[i],permuted[j]]=[permuted[j],permuted[i]];
}
need(permuted.reduce((s,y)=>s+y,0)===labels.reduce((s,y)=>s+y,0),
 "Calibration permutation changed actual rare-positive prevalence");
const calibrations=[];
for(const p of allowed){
 brain.e.c.active=p.id;
 const modelScore=calibrationRows.map(r=>fullNativeScoreForSequence(r));
 const genuine=rankStats(calibrationRows.map((r,i)=>({
  id:r.id,truth:r.strongDisruption,score:modelScore[i]})));
 const shuffled=rankStats(calibrationRows.map((r,i)=>({
  id:r.id,truth:permuted[i],score:modelScore[i]})));
 calibrations.push({id:p.id,mask:p.mask,kind:p.kind,
  calibrationAP:genuine.averagePrecision,calibrationAUROC:genuine.AUROC,
  shuffledAP:shuffled.averagePrecision,shuffledAUROC:shuffled.AUROC,
  distinctGenuineScores:genuine.distinctOriginalNativeScores});
}
brain.e.c.active=autoNativeMask;
need(brain.lived===preCalLived&&brain.e.c.episodes===preCalCEpisodes,
 "Native Brain mutated while only CALIBRATION original gene groups were predicted");
const ranking=(a,b,noise=false)=>{
 const key=noise?"shuffledAP":"calibrationAP",aurocKey=noise?"shuffledAUROC":"calibrationAUROC";
 return b[key]-a[key]||b[aurocKey]-a[aurocKey]||a.id.localeCompare(b.id);
};
const selected=[...calibrations].sort((a,b)=>ranking(a,b))[0];
const shuffledSelected=[...calibrations].sort((a,b)=>ranking(a,b,true))[0];
function maskTokens(mask){
 const ordered=["ALT","REF3","REF2","REF1","REF0","mutationOffset","exonBoundaryDistanceBin","physicalExonOrIntronRegion"];
 return ordered.filter((token,i)=>mask&(1<<i));
}
function readOnlyScoreAtMask(mask){
 const old=brain.e.c.active;
 brain.e.c.active=mask;
 try{return dev.map(r=>({id:r.id,group:r.group,exon:r.exon,
  truth:r.strongDisruption,score:fullNativeScoreForSequence(r)}));}
 finally{brain.e.c.active=old;}
}
// Official native readouts are computed ONLY after exact CALIBRATION mask
// reproduction and pre-frozen mixture configuration verification below.
const calibrationResult={source:"EXCLUSIVELY_150_GENE_GROUP_SOURCE_TRAIN_CALIBRATION_NO_DEV_LABELS",
 candidatesEvaluated:calibrations.length,
 originalNativeCModels:Object.keys(brain.e.c.models).length,
 nativeSelectedWithoutOutsideCalibration:autoNativeMask,
 sourceTrueCalibrationN:calibrationRows.length,
 sourceTrueCalibrationPositive:labels.reduce((s,y)=>s+y,0),
 labelPermutationPositive:permuted.reduce((s,y)=>s+y,0),
 selectedByAuthenticRareSplicingAP:{...selected,tokens:maskTokens(selected.mask)},
 selectedByShuffledRareSplicingAP:{...shuffledSelected,tokens:maskTokens(shuffledSelected.mask)},
 topFiveCalibratedOriginalCPrograms:calibrations.slice().sort((a,b)=>ranking(a,b)).slice(0,5)
 .map(x=>({...x,tokens:maskTokens(x.mask)})),
 authenticBiologicalSourceNotUsedToRetrainC:true,
 originalNativeBrainLiveSymbolsAfterCalibration:brain.lived};


// FROZEN original multi-perspective \`LeanC.top\` branch: original distC()
 // already knows how to combine native learned C belief distributions.
const priorNativeTop=brain.e.c.top;
const topKChoices=[1,2,3,5,8,12];
const weightChoices=["equal","calibrated-squared"];
function trueOriginalPerspectiveSelectorOrder(a,b,noise=false){
 const ap=noise?"shuffledAP":"calibrationAP",
  auc=noise?"shuffledAUROC":"calibrationAUROC";
 return b[ap]-a[ap]||b[auc]-a[auc]||a.id.localeCompare(b.id);
}
function nativeTopFromRealModels(ranking, K, weights, noise=false){
 const key=noise?"shuffledAP":"calibrationAP";
 return ranking.slice(0,K).map(p=>({
  id:p.id,kind:p.kind,mask:p.mask,
  w:weights==="equal"?1:Math.pow(Math.max(1e-8,p[key]),2)
 }));
}
function scoreNativeWithOriginalTop(rows,top){
 const old=brain.e.c.top;
 brain.e.c.top=top;
 try{return rows.map(r=>({
  id:r.id,group:r.group,exon:r.exon,truth:r.strongDisruption,
  score:fullNativeScoreForSequence(r)
 }));}
 finally{brain.e.c.top=old;}
}
function chooseMixtureWithNativeCalibration(noise=false){
 const order=[...calibrations].sort((a,b)=>trueOriginalPerspectiveSelectorOrder(a,b,noise));
 const permutedCalibrationTruth=noise?permuted:labels;
 const trials=[];
 for(const K of topKChoices)for(const weight of weightChoices){
  const top=nativeTopFromRealModels(order,K,weight,noise);
  const candidateScores=scoreNativeWithOriginalTop(calibrationRows,top);
  const scored=rankStats(candidateScores.map((p,i)=>({
   ...p,truth:permutedCalibrationTruth[i]
  })));
  trials.push({K,weight,top,calibrationAP:scored.averagePrecision,
   calibrationAUROC:scored.AUROC,calibrationPAt100:scored.expectedPrecisionAt100UnderTies,
   distinctNativeCalibrationScores:scored.distinctOriginalNativeScores});
 }
 trials.sort((a,b)=>b.calibrationAP-a.calibrationAP||
  b.calibrationAUROC-a.calibrationAUROC||a.K-b.K||
  (a.weight==="equal"?-1:1));
 return{best:trials[0],trials:trials.map(t=>({
  K:t.K,weight:t.weight,calibrationAP:t.calibrationAP,
  calibrationAUROC:t.calibrationAUROC,calibrationPAt100:t.calibrationPAt100
 }))};
}
const chosenTrue=chooseMixtureWithNativeCalibration(false);
const chosenShuffled=chooseMixtureWithNativeCalibration(true);
// Mandatory exact equivalence: one member of original mixture must be identical
// to setting that exact same existing C mask as the active native C.
const firstNative=calibrations.slice().sort((a,b)=>trueOriginalPerspectiveSelectorOrder(a,b))[0];
const keyOne=[firstNative.id];
const beforeCompare=brain.e.c.active;
brain.e.c.active=firstNative.id;
const oneNativeSingle=calibrationRows.slice(0,24).map(r=>fullNativeScoreForSequence(r));
brain.e.c.active=beforeCompare;
const oneNativeMix=scoreNativeWithOriginalTop(calibrationRows.slice(0,24),
 [{id:firstNative.id,kind:firstNative.kind,mask:firstNative.mask,w:1}]);
const maximumOneDisagreement=Math.max(...oneNativeSingle.map((v,i)=>
 Math.abs(v-oneNativeMix[i].score)));
need(maximumOneDisagreement<1e-12,
 "Original LeanC.top K=1 is not identical to original C active one-mask prediction");
// Mandatory frozen check BEFORE the very first official native prediction.
const names=list=>list.map(x=>x.id);
const expectedPrimary=["exact:175","fold:175","exact:255","fold:255","exact:231"];
const expectedShuffled=["exact:115","fold:115","exact:121","fold:121","exact:99"];
need(autoNativeMask==="class:1"&&selected.id==="exact:175"&&
 shuffledSelected.id==="exact:115"&&
 chosenTrue.best.K===5&&chosenTrue.best.weight==="equal"&&
 chosenShuffled.best.K===5&&chosenShuffled.best.weight==="equal"&&
 JSON.stringify(names(chosenTrue.best.top))===JSON.stringify(expectedPrimary)&&
 JSON.stringify(names(chosenShuffled.best.top))===JSON.stringify(expectedShuffled)&&
 chosenTrue.best.top.every(x=>x.w===1)&&
 chosenShuffled.best.top.every(x=>x.w===1)&&
 Math.abs(chosenTrue.best.calibrationAP-0.1878785419304363)<1e-10,
 "Previously committed native MFASS mixture MUST reproduce exact original five masks on calibration; FAIL CLOSED");
need(brain.lived===144980&&brain.e.c.episodes===14498&&
 calibrationRows.length===2421&&dev.length===8324,
 "Original native Brain or MFASS independent source training/calibration/test counts drifted");
const sourcePred=readOnlyScoreAtMask("class:1");
const realNativeRecords=readOnlyScoreAtMask("exact:175");
const nullNativeRecords=readOnlyScoreAtMask("exact:115");
const realNative=rankStats(realNativeRecords),nullNative=rankStats(nullNativeRecords);
const nativeTrueMixtureRecords=scoreNativeWithOriginalTop(dev,chosenTrue.best.top);
const nativeShuffledMixtureRecords=scoreNativeWithOriginalTop(dev,chosenShuffled.best.top);
const nativeTrueMixture=rankStats(nativeTrueMixtureRecords);
const nativeShuffledMixture=rankStats(nativeShuffledMixtureRecords);
need(brain.e.c.top===priorNativeTop&&brain.e.c.active===autoNativeMask&&
 brain.lived===preCalLived&&brain.e.c.episodes===preCalCEpisodes,
 "Original native Brain changed while selecting or evaluating multiple C beliefs");
const mixtureReport={
 source:"AUTHENTIC_REAL_MFASS_150_CONNECTED_GENE_GROUP_CALIBRATION_ONLY",
 genuineOriginalLeanCManyMechanism:true,originalLeanCAndBrainSourceUnchanged:true,
 originalNativeCProgramsRanked:calibrations.length,
 calibrationOnlyTrueOutcomes:calibrationRows.length,
 calibrationTrueRareEffects:labels.reduce((s,x)=>s+x,0),
 sameCalibrationTruePositiveCountWhenPermuted:permuted.reduce((s,x)=>s+x,0),
 nativeTopMechanism:"EXISTING ORIGINAL distC(c,ctx) blends c.top learned native distributions",
 permittedOriginalTopK:topKChoices,precommittedWeights:weightChoices,
 singlePerspectiveEquivalenceMaxAbsError:maximumOneDisagreement,
 authenticMixture:{
  K:chosenTrue.best.K,weighting:chosenTrue.best.weight,
  calibrationAP:chosenTrue.best.calibrationAP,
  masks:chosenTrue.best.top,
  dev: nativeTrueMixture
 },
 shuffledControl:{
  K:chosenShuffled.best.K,weighting:chosenShuffled.best.weight,
  shuffledCalibrationAP:chosenShuffled.best.calibrationAP,
  masks:chosenShuffled.best.top,
  dev:nativeShuffledMixture
 },
 trialsRealCalibrated:chosenTrue.trials,
 trialsFalseCalibrated:chosenShuffled.trials
};


function bootstrapGeneGroupAP(models){
 const rows=Object.entries(models);
 const n=rows[0][1].length;
 need(n===8324&&rows.every(([k,v])=>v.length===n),
  "Original frozen official bootstrap must use exact same 8324 human variants");
 const truth=new Map(rows[0][1].map(x=>[x.id,{group:x.group,truth:x.truth}]));
 need(truth.size===8324&&rows.every(([k,arr])=>
  arr.every(x=>truth.has(x.id)&&truth.get(x.id).group===x.group&&
   truth.get(x.id).truth===x.truth)),"Official native and empirical control variants must match exactly");
 const groups=[...new Set(rows[0][1].map(x=>x.group))].sort();
 need(groups.length===463,"Canonical MFASS corrected gene-group count changed");
 const byModel=Object.fromEntries(rows.map(([k,arr])=>
 [k,new Map(groups.map(g=>[g,arr.filter(x=>x.group===g)]))]));
 for(const g of groups){
  const len=byModel.primary.get(g).length;
  need(rows.every(([key])=>byModel[key].get(g).length===len),
   "Source native and baseline group membership mismatch");
 }
 let state=parseInt(SHA("MFASS-GENE-BOOTSTRAP-1000-FROZEN-20261123").slice(0,8),16)>>>0;
 const next=()=>{
  state=(state+0x6D2B79F5)>>>0;
  let x=state;
  x=Math.imul(x^(x>>>15),x|1);
  x^=x+Math.imul(x^(x>>>7),x|61);
  return((x^(x>>>14))>>>0)/4294967296;
 };
 const diffs={primaryMinusEmpirical:[],primaryMinusSingle:[],primaryMinusShuffled:[]};
 for(let repeat=0;repeat<1000;repeat++){
  const chosen=new Array(groups.length).fill(null).map(()=>
   groups[Math.floor(next()*groups.length)]);
  const drawn=Object.fromEntries(rows.map(([key])=>[key,
   chosen.flatMap(g=>byModel[key].get(g))]));
  const score=Object.fromEntries(rows.map(([key])=>[key,rankStats(drawn[key]).averagePrecision]));
  diffs.primaryMinusEmpirical.push(score.primary-score.empirical);
  diffs.primaryMinusSingle.push(score.primary-score.single);
  diffs.primaryMinusShuffled.push(score.primary-score.shuffled);
 }
 const percentile=x=>[x[Math.floor(x.length*0.025)],x[Math.ceil(x.length*0.975)-1]];
 return{unit:"WHOLE_CONNECTEDEXON_GENE_GROUP",
  originalIndependentGroups:groups.length,pairedRealHumanVariantCounts:n,
  replicates:1000,deterministicPrecommittedSeed:"MFASS-GENE-BOOTSTRAP-1000-FROZEN-20261123",
  comparison:Object.fromEntries(Object.entries(diffs).map(([k,values])=>{
   values.sort((a,b)=>a-b);
   return[k,{confidence95Percentile:percentile(values),
    fractionPrimaryNoBetter:values.filter(d=>d<=0).length/values.length}];
  })),
  caveat:"Paired gene-cluster bootstrap over 463 published connected gene/exon source groups; not a clinical or homolog-disjoint genetic result"};
}

const baseline=trainingOnlyEmpirical(tr,dev);
const frozenOfficialEventUncertainty=bootstrapGeneGroupAP({
 primary:nativeTrueMixtureRecords,single:realNativeRecords,
 shuffled:nativeShuffledMixtureRecords,empirical:baseline.records
});
const native=rankStats(sourcePred),empirical=rankStats(baseline.records);
const delta={averagePrecision:native.averagePrecision-empirical.averagePrecision,
 AUROC:native.AUROC-empirical.AUROC,
 expectedPrecisionAt100:native.expectedPrecisionAt100UnderTies-
  empirical.expectedPrecisionAt100UnderTies};
const report={
 status:"FROZEN_ONE_SHOT_8324_ORIGINAL_HUMAN_MFASS_OFFICIAL_GENE_GROUP_TEST_NATIVE_MULTIBELIEF",
 phase:"OFFICIAL_FROZEN_ONE_SHOT_8324_VARIANTS_463_CONNECTED_GENE_GROUPS",
 mode,scientificTarget:"Original MFASS minigene experimentally measured rare human splicing-disrupting variants",
 source:{sourceSHA256:data.sourceSha,correctedSplitSHA256:data.splitSha,
  canonicalCounts:data.canonical,internalActualGroupSplit:data.sampleCounts,
  originalMFASSSource:"KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8"},
 native:{onlyActualOriginalBrain:true,originalSourceUnchanged:true,
  manualPhysicalContext:"real region, exon-boundary distance bin, mutation offset,4 authentic REF bases,one actual ALT mutated base",
  physicallyObservedGenomeBases:4,originalReporterConstructBases:170,
  originalBrainLived:brain.lived,originalCUpdates:brain.e.c.episodes,
  nativeSelectedC:brain.e.c.active,maxLag:brain.e.c.maxLag,
  originalNativeCModels:Object.keys(brain.e.c.models).length},
 officialOneShotHeldout:{native,empiricalSourceOnly:empirical,
  originalNativeRealCalibration:realNative,
  originalNativeShuffledCalibration:nullNative,
  perspectiveCalibration:calibrationResult,
  originalMultiPerspectiveMixture:mixtureReport,
  paired463GeneGroupAPUncertainty:frozenOfficialEventUncertainty,
  differenceNativeMinusEmpirical:delta,
  randomPrevalenceReference:native.prevalence,
  empiricalActualTrainCategories:baseline.numberSourceOnlyCategories},
 biologicalLimitations:["Original MFASS minigene rather than patient-derived RNA",
  "Original native C sees 4 of the 170 human bases near mutation",
  "Source grouping is exon+gene connected but not independent by remote homology",
  "Official corrected MFASS TEST scored exactly once under preregistered frozen C masks",
  "AlphaGenome 2 same-split predictions not available"],
 officialTestScored:true,officialTestN:8324,officialTestGroups:463,
  frozenNativeMasksVerified:true,noFurtherOfficialTestRetuning:true};
if(process.env.MFASS_NATIVE_DEV_RAW)
 fs.writeFileSync(process.env.MFASS_NATIVE_DEV_RAW,JSON.stringify({...report,
  originalBrainSourcePredictions:sourcePred,
  sourceOnlyReferencePredictions:baseline.records,
  actualCalibrationNativePredictions:realNativeRecords,
  falseLabelCalibrationNativePredictions:nullNativeRecords,
  authenticNativeMultiPerspectivePredictions:nativeTrueMixtureRecords,
  shuffledNativeMultiPerspectivePredictions:nativeShuffledMixtureRecords},null,2)+"\n");
console.log("MFASS_NATIVE_FROZEN_OFFICIAL_FINAL_RESULT "+JSON.stringify(report));
