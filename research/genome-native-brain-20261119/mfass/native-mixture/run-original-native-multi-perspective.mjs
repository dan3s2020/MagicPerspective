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
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";
import {candidates} from "../../../../v17/transcend/epistemic-text/engine.mjs";
import {loadMfassTrainOnly,physicalFeature} from "../mfass-source.mjs";
const SHA=s=>crypto.createHash("sha256").update(s).digest("hex");
const need=(v,msg)=>{if(!v)throw Error(msg)};
const MODES=["outcome-c"];
const [src,bench,mode,...extra]=process.argv.slice(2);
need(src&&bench&&MODES.includes(mode)&&!extra.length,
 "Usage: node run-original-brain-AP-select.mjs ORIGINAL_SOURCE CORRECTED_BENCHMARK outcome-c");
need(!process.env.MFASS_NATIVE_PHASE||process.env.MFASS_NATIVE_PHASE==="internal-dev",
 "The corrected canonical 8324 official MFASS tests must NOT be scored here");
const data=loadMfassTrainOnly(src,bench);
need(data.sampleCounts.train.groups===827&&data.sampleCounts.dev.groups===150&&
 data.sampleCounts.calibration.groups===150&&data.canonical.officialTestProtectedN===8324,
 "FROZEN REAL SOURCE gene-group partition changed");
// Include all real eligible genuine source TRAIN variants ONCE. No rebalancing.
const tr=[...data.split.train].sort((a,b)=>SHA("MFASS-NATIVE-TRAIN-BODY-V1:"+a.id)
 .localeCompare(SHA("MFASS-NATIVE-TRAIN-BODY-V1:"+b.id)));
const dev=data.split.dev,calibrationRows=data.split.calibration;
need(tr.length===14498&&dev.length===2490&&calibrationRows.length===2421,
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
const sourcePred=[],livedBefore=brain.lived,episodesBefore=brain.e.c.episodes;
for(const r of dev){
 const view=physicalFeature(r),dist=brain.predict(view.stimulus);
 need(Array.isArray(dist)&&Number.isFinite(dist[48])&&Number.isFinite(dist[49]),
  "Original native Brain lacks finite real disruption probability");
 const p0=Math.max(0,dist[48]),p1=Math.max(0,dist[49]);
 const p=p0+p1>0?p1/(p0+p1):0.5;
 need(Number.isFinite(p)&&p>=0&&p<=1,"Native Brain original score outside probability bounds");
 sourcePred.push({id:r.id,group:r.group,exon:r.exon,truth:r.strongDisruption,score:p,
  chosenNativeC:brain.e.c.active,region:view.region,bin:view.bin,
  refAllele:r.ref[r.p],altAllele:r.alt[r.p],variantPosition:r.p});
}
need(brain.lived===livedBefore&&brain.e.c.episodes===episodesBefore,
 "Read-only biological development test modified original Brain");
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
const realNativeRecords=readOnlyScoreAtMask(selected.id);
const nullNativeRecords=readOnlyScoreAtMask(shuffledSelected.id);
need(brain.e.c.active===autoNativeMask&&
 brain.lived===preCalLived&&brain.e.c.episodes===preCalCEpisodes,
 "Read-only native C mask selection or development evaluation mutated original Brain");
const realNative=rankStats(realNativeRecords),nullNative=rankStats(nullNativeRecords);
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

const baseline=trainingOnlyEmpirical(tr,dev);
const native=rankStats(sourcePred),empirical=rankStats(baseline.records);
const delta={averagePrecision:native.averagePrecision-empirical.averagePrecision,
 AUROC:native.AUROC-empirical.AUROC,
 expectedPrecisionAt100:native.expectedPrecisionAt100UnderTies-
  empirical.expectedPrecisionAt100UnderTies};
const report={
 status:"AUTHENTIC_MFASS_ORIGINAL_V42_BRAIN_FULL_CHAIN_CALIBRATION_AP_ON_GENE_DISJOINT_VARIANTS",
 phase:"TRAIN_ONLY_INTERNAL_GENE_GROUP_DEV_DO_NOT_TOUCH_CANONICAL_TEST",
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
 internalDevelopment:{native,empiricalSourceOnly:empirical,
  originalNativeRealCalibration:realNative,
  originalNativeShuffledCalibration:nullNative,
  perspectiveCalibration:calibrationResult,
  originalMultiPerspectiveMixture:mixtureReport,
  differenceNativeMinusEmpirical:delta,
  randomPrevalenceReference:native.prevalence,
  empiricalActualTrainCategories:baseline.numberSourceOnlyCategories},
 biologicalLimitations:["Original MFASS minigene rather than patient-derived RNA",
  "Original native C sees 4 of the 170 human bases near mutation",
  "Source grouping is exon+gene connected but not independent by remote homology",
  "No official corrected MFASS TEST scored by native organism",
  "AlphaGenome 2 same-split predictions not available"],
 noOfficialTestPrediction:true,officialTestLockedN:8324};
if(process.env.MFASS_NATIVE_DEV_RAW)
 fs.writeFileSync(process.env.MFASS_NATIVE_DEV_RAW,JSON.stringify({...report,
  originalBrainSourcePredictions:sourcePred,
  sourceOnlyReferencePredictions:baseline.records,
  actualCalibrationNativePredictions:realNativeRecords,
  falseLabelCalibrationNativePredictions:nullNativeRecords,
  authenticNativeMultiPerspectivePredictions:nativeTrueMixtureRecords,
  shuffledNativeMultiPerspectivePredictions:nativeShuffledMixtureRecords},null,2)+"\n");
console.log("MFASS_NATIVE_MULTIBELIEF_PERSPECTIVE_RESULT "+JSON.stringify(report));
