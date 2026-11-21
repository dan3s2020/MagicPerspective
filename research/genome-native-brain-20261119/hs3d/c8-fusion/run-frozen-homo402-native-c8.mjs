// PRE-FROZEN SOURCE EXTERNAL human AG acceptor original native C8 test.
// Exact original 1200 HS3D training; NO learning on DRANet human DNA.
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
  return{train,dev,
    fullSourceDNA:new Set([...pools.P,...pools.N].map(r=>r.dna)),
    trainDNAHash:dnaHashes(train),devDNAHash:dnaHashes(dev),
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
const EXTERNAL_PIN="fe300cd8e4a55471268e1271621df208430157a5";
function loadIndependentHumanAcceptors(externalDir,originalData){
  // Original source DNA and class labels come ONLY from the independent
  // published DRANetSplicer 402bp positive and negative human acceptor files.
  // There is no new training. The native organism sees only its actual four
  // 4nt views in the original exact 140nt coordinate frame.
  const seenHS3D=originalData.fullSourceDNA;
  const sources={},firstClass=new Map(),contradictory=new Set();
  for(const [label,filename] of [
    ["P","homo_acceptor_positive.txt"],
    ["N","homo_acceptor_negative.txt"]
  ]){
    const full=path.join(externalDir,filename);
    const buf=fs.readFileSync(full);
    const originalLines=buf.toString("utf8").split(/\r?\n/);
    const raw={file:filename,sha256:hash(buf),totalRawNonempty:0,
      wrongLength:0,noncanonical:0,nonAGat200:0,candidates:[]};
    for(let i=0;i<originalLines.length;i++){
      const dna=originalLines[i].trim().toUpperCase();
      if(!dna)continue;
      raw.totalRawNonempty++;
      if(dna.length!==402){raw.wrongLength++;continue}
      if(!/^[ACGT]{402}$/.test(dna)){raw.noncanonical++;continue}
      if(dna.slice(200,202)!=="AG"){raw.nonAGat200++;continue}
      const cropped=dna.slice(132,272);
      if(cropped.length!==140||cropped.slice(68,70)!=="AG")
        fail("External 402-to-140 physical perspective frame is inconsistent");
      const prev=firstClass.get(cropped);
      if(prev&&prev!==label)contradictory.add(cropped);
      firstClass.set(cropped,label);
      raw.candidates.push({label,dna:cropped,
        recordKey:hash("external-original-sequence:"+dna).slice(0,16),
        id:label+":"+hash("external-original-sequence:"+dna).slice(0,16),
        rankKey:hash("external-homo-native-20261120:"+cropped)});
    }
    sources[label]=raw;
  }
  const unique={},exclusions={duplicateInExternal:0,contradictoryExternal:0,
    exactOverlapWithOriginalHS3D:0};
  for(const label of LABELS){
    const observed=new Set(),rows=[];
    for(const record of sources[label].candidates){
      if(contradictory.has(record.dna)){exclusions.contradictoryExternal++;continue;}
      if(seenHS3D.has(record.dna)){exclusions.exactOverlapWithOriginalHS3D++;continue;}
      if(observed.has(record.dna)){exclusions.duplicateInExternal++;continue;}
      observed.add(record.dna);rows.push(record);
    }
    rows.sort((a,b)=>a.rankKey.localeCompare(b.rankKey));
    if(rows.length<800)fail("Not enough independent real human acceptor AG examples: "+label+" count "+rows.length);
    unique[label]=rows;
  }
  const selected=[];
  for(let i=0;i<800;i++)for(const label of LABELS)selected.push(unique[label][i]);
  const selectedDna=new Set(selected.map(r=>r.dna));
  if(selectedDna.size!==1600)fail("External 1600 evaluation has DNA overlap");
  return{
    rows:selected,
    provenance:{
      source:"XueyanLiu-creator/DRANetSplicer",
      sourceCommit:EXTERNAL_PIN,
      originalPositiveFileSHA256:sources.P.sha256,
      originalNegativeFileSHA256:sources.N.sha256,
      originalRawRows:{P:sources.P.totalRawNonempty,N:sources.N.totalRawNonempty},
      sourceNonCanonical:{P:sources.P.noncanonical,N:sources.N.noncanonical},
      sourceWrongLength:{P:sources.P.wrongLength,N:sources.N.wrongLength},
      sourceWrongCentralMotif:{P:sources.P.nonAGat200,N:sources.N.nonAGat200},
      uniqueUsableExternal:{P:unique.P.length,N:unique.N.length},
      excluded:exclusions,
      selected:{P:800,N:800},
      exactExternalWindow:"402nt to 140nt: external.slice(132,272)",
      originalNativeReferenceMotif:"AG at internal [68,70) equals external [200,202)",
      noExternalLabeledExampleEverUsedForNativeLearning:true,
      externalSequenceTruthOnlyRevealedAfterNativePrediction:true,
      exactKnownHS3DUsedDNAOverlapExcluded:true,
      geneOrFamilyHomologyDisjointUnproven:true
    }
  };
}


const [dir,externalDir,mode,...extra]=process.argv.slice(2);
if(!dir||!externalDir||!["joint-70-64-c8","single-64-c8","joint-70-64-scrambled-c8"].includes(mode)||extra.length||
  process.env.HS3D_C8_EXTERNAL_UNLOCK!=="FROZEN_EXTERNAL_C8_WINNER_20261121")
  fail("Usage: node run-native-paired-evidence.mjs HS3D_DIR single-64-c8|joint-70-64-c8|joint-70-64-scrambled-c8|joint-70-66-c8");
const data=loadData(dir);
const external=loadIndependentHumanAcceptors(externalDir,data);
if(external.rows.length!==1600||external.rows.some(r=>data.fullSourceDNA.has(r.dna)))
  fail("External evaluation failed 1600/1600 or source independence");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,
  off:["R2","R3"]},c:{cap:8},seed:20261121});
brain.liveWorld="text";
if(brain.CTX!==8)fail("Original native Brain C8 capacity not activated");
const before=brain.lived;
for(let i=0;i<data.train.length;i++){
  const r=data.train[i],view=viewOf(r,mode,data.train,i);
  const sequence=view+r.label+"\n";
  if(sequence.length!==10)fail("Expected 8 real/sensor + P/N + newline");
  for(const y of code(sequence))brain.live(y,false);
}
const trained=brain.lived-before;
if(trained!==12000)fail("Original native learning count differs from 12000: "+trained);
const cLag=brain.e?.c?.maxLag,cActive=brain.e?.c?.active;
const alignLived=brain.align?.lived;
const measured=[];
for(let i=0;i<external.rows.length;i++){
  const r=external.rows[i],view=viewOf(r,mode,external.rows,i);
  const predicted=brain.predict(code(view));
  if(!Array.isArray(predicted)||predicted.length<81||
    !Number.isFinite(predicted[80])||!Number.isFinite(predicted[78]))
    fail("Original Brain native prediction missing P/N");
  const answer=predicted[80]>=predicted[78]?"P":"N";
  measured.push({id:r.id,truth:r.label,predicted:answer,first4:view.slice(0,4),
    last4:view.slice(4),p:predicted[80],n:predicted[78]});
}
if(brain.lived-before!==trained||brain.align?.lived!==alignLived)
  fail("Native Brain mutated during blind evaluation");
const outcome={
 status:"ACTUAL_UNMODIFIED_ORIGINAL_V42_BRAIN_C8_REAL_HUMAN_AG_MULTI_VIEW_TEST",
 date:"2026-11-21",mode,
 phase:"FROZEN_SOURCE_EXTERNAL_REAL_HUMAN_AG_1600_ZERO_SHOT",
 sourceCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
 source:"Original HS3D 140nt TRAIN learning; frozen external DRANet human 402nt true/false acceptor evaluation",
 data:{train:data.train.length,external:external.rows.length,
   source:data.sources,excluded:data.excludedDuplicateOrContradictions,
   trainDNAHash:data.trainDNAHash,devDNAHash:data.devDNAHash},
 native:{originalBrainFile:"v17/transcend/torus-aether/devour/brain.mjs",
   originalAlgorithms:["Brain.live","Brain.predict","LeanC","EmergentChain"],
   originalSourceUnchanged:true,cap:brain.CTX,learnedSymbols:trained,
   cMaxLagAfterTraining:cLag,cActiveAfterTraining:cActive,
   nativeCModelCount:Object.keys(brain.e.c.models||{}).length},
 measured:metrics(measured),
 externalHumanDataset:external.provenance,
 frozenPretest:"FROZEN_EXTERNAL_VALIDATION.md",
 biologicalTruthHiddenDuringPrediction:true,originalGenomeSourceReal:true,
 noExternalClassifier:true,notAG2Benchmark:true,
 priorEvidenceAlreadySeen:true,
 externalSourceWasUsedByEarlierDifferentModels:true,
 noExternalGenomeEverTrained:true,
 shamControlIsNotNaturalDNA:mode==="joint-70-64-scrambled-c8"
};
if(process.env.HS3D_C8_RAW_PATH)
 fs.writeFileSync(process.env.HS3D_C8_RAW_PATH,JSON.stringify({...outcome,
   rawNativePredictions:measured},null,2)+"\n");
console.log("HS3D_C8_EXTERNAL_RESULT "+JSON.stringify(outcome));
