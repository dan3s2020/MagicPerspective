// New genuine real human 170nt source MFASS body: actual two-location DNA observation.
// ORIGINAL V42 Brain and native C8, outcome learning only; matched physical controls.
// ORIGINAL V42 Brain on real 27,733-variant MFASS human functional splice effects.
// Trains only on official TRAIN, with a NEW whole-gene/exon group internal split.
// Official original 8,324 variant TEST never exposed to native predictor.
// No alternate learned prediction model, fabricated labels, or changed Brain source.
import fs from "node:fs";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";
import {loadMfassTrainOnly,physicalFeature} from "../mfass-source.mjs";
const SHA=s=>crypto.createHash("sha256").update(s).digest("hex");
const need=(v,msg)=>{if(!v)throw Error(msg)};
const MODES=["paired-local-ref-alt","paired-alt-real-junction","paired-alt-non-junction","paired-ref-real-junction"];
const [src,bench,mode,...extra]=process.argv.slice(2);
need(src&&bench&&MODES.includes(mode)&&!extra.length,
 "Usage: node run-native-real-genome-span.mjs ORIGINAL_SOURCE CORRECTED_BENCHMARK paired-local-ref-alt|paired-alt-real-junction|paired-alt-non-junction|paired-ref-real-junction");
need(!process.env.MFASS_NATIVE_PHASE||process.env.MFASS_NATIVE_PHASE==="internal-dev",
 "The corrected canonical 8324 official MFASS tests must NOT be scored here");

function clampStart(x){return Math.max(0,Math.min(166,x));}
function trueGenomicGeometry(r){
 const nearAccept=r.upstreamIntron,nearDonor=r.upstreamIntron+r.exonLength;
 const nearest=Math.abs(r.p-nearAccept)<=Math.abs(r.p-nearDonor)?nearAccept:nearDonor;
 const mutationStart=clampStart(r.p-2),junctionStart=clampStart(nearest-2);
 const ref4=r.ref.slice(mutationStart,mutationStart+4),
  alt4=r.alt.slice(mutationStart,mutationStart+4),
  junction4=r.alt.slice(junctionStart,junctionStart+4);
 need(ref4.length===4&&alt4.length===4&&junction4.length===4&&
  [...ref4].filter((x,i)=>x!==alt4[i]).length===1,
  "Actual original 170nt MFASS human REF/ALT or junction view not genuine "+r.id);
 const validRemote=[];
 for(let start=0;start<=166;start++){
  const center=start+1.5;
  if(Math.abs(center-r.p)>=12&&Math.abs(center-nearest)>=12)
   validRemote.push(start);
 }
 need(validRemote.length>0,"No real remote negative-control view "+r.id);
 const hashed=parseInt(SHA("MFASS-GENUINE-REMOTE-DNA-V1:"+r.id).slice(0,8),16);
 const remoteStart=validRemote[hashed%validRemote.length];
 const remote4=r.alt.slice(remoteStart,remoteStart+4);
 need(remote4.length===4,"Real external negative-control DNA shorter than four bases "+r.id);
 return{ref4,alt4,junction4,remote4,mutationStart,junctionStart,remoteStart,
  nearestJunction:nearest,distanceToJunction:Math.abs(nearest-r.p),
  actualWindowSeparation:Math.abs(mutationStart-junctionStart),
  junctionOverlapsMutation:r.p>=junctionStart&&r.p<junctionStart+4};
}
function genomeView(r,mode){
 const g=trueGenomicGeometry(r);
 const observed=mode==="paired-local-ref-alt"?g.ref4+g.alt4:
  mode==="paired-alt-real-junction"?g.alt4+g.junction4:
  mode==="paired-alt-non-junction"?g.alt4+g.remote4:
  mode==="paired-ref-real-junction"?g.ref4+g.junction4:
  null;
 need(observed&&observed.length===8&&/^[ACGT]{8}$/.test(observed),
  "Original two physical human DNA observations must be eight genuine nucleotides");
 const basic=physicalFeature(r);
 return{stimulus:Array.from(observed,x=>x.charCodeAt(0)),
  sourceGenomeBases:8,sourceLocusDNAHash:SHA(r.ref+"|"+r.alt),
  region:basic.region,bin:basic.bin,
  nearestJunctionPosition:g.nearestJunction,
  physicalSeparation:g.actualWindowSeparation,
  junctionOverlapsMutation:g.junctionOverlapsMutation};
}

const data=loadMfassTrainOnly(src,bench);
need(data.sampleCounts.train.groups===827&&data.sampleCounts.dev.groups===150&&
 data.sampleCounts.calibration.groups===150&&data.canonical.officialTestProtectedN===8324,
 "FROZEN REAL SOURCE gene-group partition changed");
// Include all real eligible genuine source TRAIN variants ONCE. No rebalancing.
const tr=[...data.split.train].sort((a,b)=>SHA("MFASS-NATIVE-TRAIN-BODY-V1:"+a.id)
 .localeCompare(SHA("MFASS-NATIVE-TRAIN-BODY-V1:"+b.id)));
const dev=data.split.dev;
need(tr.length>5000&&dev.length>300,
 "MFASS real gene-separated experiment too small; fail rather than fake");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},
 c:{cap:8},seed:20261122});
brain.liveWorld="text";
// Original, unchanged native C.observe is called at distinct world moments.
const originalObserve=brain.e.c.observe.bind(brain.e.c);
let allowC=false,observedC=0;
brain.e.c.observe=(ctx,y)=>{
 if(allowC){observedC++;return originalObserve(ctx,y);}
 return undefined;
};
for(const r of tr){
 const physical=genomeView(r,mode);
 for(let i=0;i<8;i++){
  allowC=false;
  brain.live(physical.stimulus[i],false);
 }
 allowC=true;
 brain.live((r.strongDisruption?"1":"0").charCodeAt(0),false);
 allowC=false;
 brain.live(10,false);
}
const expectedNativeSymbols=tr.length*10;
need(brain.lived===expectedNativeSymbols,"Original native Brain did not live each authentic observed symbol");
const expectedC=tr.length;
need(brain.e.c.episodes===expectedC&&
 observedC===expectedC,
 "Original native C episode count differs from frozen biological moment schedule");
need(brain.e.c.maxLag===8,"Original native C did not reach 8-nucleotide perspective");
// Native original Brain probability is final FULL A/C chain, not an outside head.
const sourcePred=[],livedBefore=brain.lived,episodesBefore=brain.e.c.episodes;
for(const r of dev){
 const view=genomeView(r,mode),dist=brain.predict(view.stimulus);
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
const baseline=trainingOnlyEmpirical(tr,dev);
const native=rankStats(sourcePred),empirical=rankStats(baseline.records);
const delta={averagePrecision:native.averagePrecision-empirical.averagePrecision,
 AUROC:native.AUROC-empirical.AUROC,
 expectedPrecisionAt100:native.expectedPrecisionAt100UnderTies-
  empirical.expectedPrecisionAt100UnderTies};
const report={
 status:"AUTHENTIC_MFASS_ORIGINAL_V42_BRAIN_PHYSICALLY_REAL_TWO_LOCATION_170NT_GENE_SPAN",
 phase:"TRAIN_ONLY_INTERNAL_GENE_GROUP_DEV_DO_NOT_TOUCH_CANONICAL_TEST",
 mode,scientificTarget:"Original MFASS minigene experimentally measured rare human splicing-disrupting variants",
 source:{sourceSHA256:data.sourceSha,correctedSplitSHA256:data.splitSha,
  canonicalCounts:data.canonical,internalActualGroupSplit:data.sampleCounts,
  originalMFASSSource:"KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8"},
 native:{onlyActualOriginalBrain:true,originalSourceUnchanged:true,
  actualPhysicalViewMode:mode,
  methodUsesAuthenticTwoSourceWindows:true,
  humanDefinedSourceJunctionCoordinate:true,
  devActuallySeparatedViews:dev.filter(r=>trueGenomicGeometry(r).actualWindowSeparation>=8).length,
  devJunctionViewOverlapsRealMutation:dev.filter(r=>trueGenomicGeometry(r).junctionOverlapsMutation).length,
  manualPhysicalContext:"two real genuine four-nucleotide windows selected from authentic MFASS REF/ALT 170nt reporter constructs",
  physicallyObservedGenomeBases:8,originalReporterConstructBases:170,
  originalBrainLived:brain.lived,originalCUpdates:brain.e.c.episodes,
  nativeSelectedC:brain.e.c.active,maxLag:brain.e.c.maxLag,
  originalNativeCModels:Object.keys(brain.e.c.models).length},
 internalDevelopment:{native,empiricalSourceOnly:empirical,
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
  sourceOnlyReferencePredictions:baseline.records},null,2)+"\n");
console.log("MFASS_NATIVE_REAL_GENOME_SPAN_RESULT "+JSON.stringify(report));
