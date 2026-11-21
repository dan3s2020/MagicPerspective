// Actual original V42 Brain native 9-symbol position-aware genomic
// perception; all eight original genome bases retained, no outside model.
// Original unmodified MagicPerspective V42 Brain C8, REAL HS3D human AG data.
// Tests whether two actually observable four-base genomic views jointly
// influence the original Brain's P/N prediction. No external learned head.
// All user original Brain code is imported read-only.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const MODES=new Set(["single-64-c8","joint-70-64-c8",
  "joint-70-64-scrambled-c8","joint-70-66-c8"]);
const LABELS=["P","N"],hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const fail=x=>{throw Error(x)},code=s=>Array.from(s,c=>c.charCodeAt(0));
const numHash=s=>parseInt(hash(s).slice(0,8),16);
function parseFile(filename,label){
  const buf=fs.readFileSync(filename),lines=buf.toString("utf8").split(/\r?\n/);
  const rows=[];let pending=null,rawCount=0;
  const rejected={badLength:0,nonACGT:0,nonAG:0};
  for(const original of lines){
    const s=original.trim();
    if(!s)continue;
    if(s.startsWith(">")){
      if(pending!==null)fail("Unpaired FASTA header in "+filename);
      pending=s.slice(1);
      continue;
    }
    if(pending===null)fail("FASTA sequence without header");
    rawCount++;const dna=s.toUpperCase();
    if(dna.length!==140)rejected.badLength++;
    else if(!/^[ACGT]{140}$/.test(dna))rejected.nonACGT++;
    else if(dna.slice(68,70)!=="AG")rejected.nonAG++;
    else rows.push({label,dna,id:label+":"+pending+":"+rawCount});
    pending=null;
  }
  if(pending!==null)fail("Trailing FASTA header");
  if(rejected.nonAG)fail("Unexpected non-AG acceptor genome at source");
  if(rows.length<1300)fail("Insufficient authentic 140nt AG sequence records");
  return{rows,sha256:hash(buf),rawCount,rejected};
}
function loadData(root){
  const files={
    P:parseFile(path.join(root,"Train/Acceptor_Train_Positive.txt"),"P"),
    N:parseFile(path.join(root,"Train/Acceptor_Train_Negative.txt"),"N")
  };
  const known=new Map(),bad=new Set();
  for(const label of LABELS)for(const r of files[label].rows){
    const prev=known.get(r.dna);
    if(prev&&prev!==label)bad.add(r.dna);
    known.set(r.dna,label);
  }
  let removed=0;
  const pools={};
  for(const label of LABELS){
    const seen=new Set();
    pools[label]=[];
    for(const r of files[label].rows){
      if(bad.has(r.dna)||seen.has(r.dna)){removed++;continue;}
      seen.add(r.dna);pools[label].push(r);
    }
    pools[label].sort((a,b)=>hash("hs3d-acceptor-transfer-v1:"+a.dna)
      .localeCompare(hash("hs3d-acceptor-transfer-v1:"+b.dna)));
    if(pools[label].length<1300)fail("No 1300 distinct biological "+label+" sequences");
  }
  const select=(first,n)=>{
    const out=[];
    for(let i=first;i<first+n;i++)for(const label of LABELS)
      out.push(pools[label][i]);
    return out;
  };
  const train=select(0,600),dev=select(1100,200);
  const trainDNA=new Set(train.map(r=>r.dna));
  for(const row of dev)if(trainDNA.has(row.dna))fail("Genomic DNA leaked into development");
  if(train.length!==1200||dev.length!==400)fail("Registered n mismatched");
  const dnaHashes=rows=>hash(rows.map(r=>r.dna).join("\n"));
  return{train,dev,trainDNAHash:dnaHashes(train),devDNAHash:dnaHashes(dev),
    sources:Object.fromEntries(LABELS.map(l=>[l,{sha256:files[l].sha256,
      rows:files[l].rawCount,invalid:files[l].rejected,unique:pools[l].length}])),
    excludedDuplicateOrContradictions:removed};
}
function physicalDNA(r,position){
  const dna=r.dna.slice(position,position+4);
  if(dna.length!==4||!/^[ACGT]{4}$/.test(dna))fail("Nonbiological 4base viewport");
  return dna;
}
function viewOf(r,mode,rows,i){
  const final=mode==="joint-70-66-c8"?physicalDNA(r,66):physicalDNA(r,64);
  let first;
  if(mode==="single-64-c8")first="____";
  else if(mode==="joint-70-64-scrambled-c8"){
    const idx=numHash("predeclared-independent-prefix:"+r.dna)%rows.length;
    const different=idx===i?rows[(idx+1)%rows.length]:rows[idx];
    if(different.dna===r.dna)fail("Scrambled negative control accidentally same source");
    first=physicalDNA(different,70);
  }else first=physicalDNA(r,70);
  const view=first+final;
  if(view.length!==8)fail("Native C8 sensor length invalid");
  return view;
}
function metrics(rows){
  const conf={P:{P:0,N:0},N:{P:0,N:0}};
  for(const x of rows)conf[x.truth][x.predicted]++;
  const perClass=LABELS.map(label=>{
    const other=label==="P"?"N":"P",tp=conf[label][label],
      fp=conf[other][label],fn=conf[label][other],support=tp+fn;
    return{label,support,precision:tp/(tp+fp||1),recall:tp/(support||1),
      f1:2*tp/(2*tp+fp+fn||1)};
  });
  const n=rows.length,correct=conf.P.P+conf.N.N;
  return{n,correct,accuracy:correct/n,
    macroF1:(perClass[0].f1+perClass[1].f1)/2,
    balancedAccuracy:(perClass[0].recall+perClass[1].recall)/2,
    confusion:conf,perClass};
}

const POSITION_ARMS=new Set(["native-C9-real-position","native-C9-missing-position",
  "native-C9-broken-position"]);
const SECOND_POSITIONS=[64,66],START=70;
function originalPhysicalPositionCode(realPosition,mode,row){
  if(mode==="native-C9-missing-position")return "_";
  if(mode==="native-C9-broken-position")
    return numHash("unrelated-C9-body-location:"+row.dna+":"+realPosition)%2===0?"c":"d";
  if(mode==="native-C9-real-position")
    return realPosition===64?"c":"d";
  fail("C9 selected mode invalid");
}
function genuineNativeNineSymbolView(row,position,mode){
  if(!SECOND_POSITIONS.includes(position))fail("Illegal actual 4nt observation destination");
  const prefix=originalPhysicalPositionCode(position,mode,row);
  const realStart=physicalDNA(row,START),realFinal=physicalDNA(row,position);
  const sensed=prefix+realStart+realFinal;
  if(sensed.length!==9||!/^[ACGT]{8}$/.test(sensed.slice(1)))
    fail("Native C9 must have 1 true location-symbol plus 8 real human DNA bases");
  return{realPhysicalPosition:position,actualNine:sensed,
    actualFirstFour:realStart,actualFinalFour:realFinal,positionSymbol:prefix};
}
function nativeOriginalClass(brain,view){
  const d=brain.predict(code(view.actualNine));
  if(!Array.isArray(d)||d.length<81||!Number.isFinite(d[80])||!Number.isFinite(d[78]))
    fail("Original V42 Brain native C9 failed true P/N outcome");
  return{predicted:d[80]>=d[78]?"P":"N",p:d[80],n:d[78]};
}
const [dir,mode,...extra]=process.argv.slice(2);
if(!dir||!POSITION_ARMS.has(mode)||extra.length)
  fail("Usage: run-original-C9-physical-position.mjs HS3D_DIR native-C9-real-position|native-C9-missing-position|native-C9-broken-position");
const data=loadData(dir);
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,
  off:["R2","R3"]},c:{cap:9},seed:20261121});
brain.liveWorld="text";
if(brain.CTX!==9)fail("Original LeanC cap9 unavailable");
brain.body.genomeNativePhysicalPosition={
  originalBrainOnly:true,knownGenomePhysicalCoordinates:[58,62,64,66,70,74,78],
  biologicalStart:70,allEightBasesActuallyObserved:true,
  locationIdentityLearnedAsNativeSensoryCoordinate:true
};
let originalSourceLived=0;
for(let i=0;i<data.train.length;i++){
  const row=data.train[i],positions=i%2===0?[64,66]:[66,64];
  for(const pos of positions){
    const actualNine=genuineNativeNineSymbolView(row,pos,mode);
    const originalExperience=actualNine.actualNine+row.label+"\n";
    if(originalExperience.length!==11)fail("Native C9 class training exactly eleven true symbols");
    for(const y of code(originalExperience)){brain.live(y,false);originalSourceLived++;}
  }
}
if(originalSourceLived!==26400||brain.lived!==26400||brain.e.c.maxLag!==9)
  fail("Original native C9 failed complete genuine 2position human training");
const mask=brain.e.c.active,aligned=brain.align?.lived??null,episodes=brain.e.c.episodes;
const outputs={fixed64:[],fixed66:[]},cases=[];let changed=0,oracleAnyCorrect=0;
for(const row of data.dev){
  const a=genuineNativeNineSymbolView(row,64,mode);
  const b=genuineNativeNineSymbolView(row,66,mode);
  const aAnswer=nativeOriginalClass(brain,a),bAnswer=nativeOriginalClass(brain,b);
  outputs.fixed64.push({truth:row.label,predicted:aAnswer.predicted});
  outputs.fixed66.push({truth:row.label,predicted:bAnswer.predicted});
  if(aAnswer.predicted!==bAnswer.predicted)changed++;
  if(aAnswer.predicted===row.label||bAnswer.predicted===row.label)oracleAnyCorrect++;
  cases.push({rowId:row.id,realClassForScoringOnly:row.label,
    actuallyObservedInitialFour:a.actualFirstFour,
    physicallyObserved64:a.actualFinalFour,
    physicallyObserved66:b.actualFinalFour,
    actualPhysicalPositionCode64:a.positionSymbol,
    actualPhysicalPositionCode66:b.positionSymbol,
    originalBrainNative64:aAnswer.predicted,
    originalBrainNative66:bAnswer.predicted,
    labelsHiddenAtBothBrainPredictions:true,
    twoPositionsScoredOnlyAfterOriginalBrainAnswered:true});
}
if(brain.lived!==26400||brain.e.c.episodes!==episodes||
   brain.e.c.active!==mask||(brain.align?.lived??null)!==aligned)
  fail("Original Brain C9 leaked live truth into development");
const scores=Object.fromEntries(Object.entries(outputs).map(([k,records])=>[k,metrics(records)]));
const outcome={
  status:"ORIGINAL_V42_BRAIN_NATIVE_C9_REAL_BODY_DESTINATION_IDENTITY_AND_TRUE_EIGHT_DNA_BASES",
  mode,phase:"EXPLORATORY_HISTORICALLY_EXAMINED_HS3D_DEV400",
  nativeBrainSourceUnmodified:true,
  originalModules:["Brain.live","Brain.predict","LeanC cap9","EmergentChain"],
  originalRealHumanGenomeSource:"OluwadareLab/EnsembleSplice",
  originalSourceCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
  priorFrozenPretest:"PRETEST.md",
  data:{authenticTrain:data.train.length,authenticDev:data.dev.length,
    trainDNAHash:data.trainDNAHash,devDNAHash:data.devDNAHash,
    source:data.sources,duplicateExclusions:data.excludedDuplicateOrContradictions},
  originalNative:{
    cap:brain.CTX,finalMaxLag:brain.e.c.maxLag,
    activeSelectedNativePerspective:mask,
    candidateModels:Object.keys(brain.e.c.models||{}).length,
    totalActuallyLivedOriginalSymbols:originalSourceLived,
    realDestinationsLearnedPerHumanTrainingCase:2},
  evaluation:{
    actualRealFourBaseGenomeViewsPerScoredPosition:3,
    chosenDestinationIsFixedForThisRepresentationTest:true,
    humanDefinedPositionMeaningNotOracleClass:true,
    scores,changedPredictionsBetweenTrueDestinations:changed,
    oracleEvaluatorOnlyAtLeastOneDestinationCorrect:oracleAnyCorrect,
    oracleEvaluatorOnlyCeiling:oracleAnyCorrect/data.dev.length
  },
  noExternalActionModel:true,
  notAnOriginalLearnedNavigationExperiment:true,
  noExternalSourceScoredYet:true,
  noAlphaGenome2Benchmark:true
};
if(process.env.HS3D_C9_RAW_FILE)
 fs.writeFileSync(process.env.HS3D_C9_RAW_FILE,
   JSON.stringify({...outcome,perRecordNativeReadouts:cases},null,2)+"\n");
console.log("HS3D_NATIVE_C9_POSITION_RESULT "+JSON.stringify(outcome));
