// Genuine human HS3D donor-site experiment with unmodified native V42 Brain.
// This is NOT an AlphaGenome 2 comparison and does NOT claim automatic
// viewpoint discovery. True/false labels are hidden from the original Brain
// at EVERY evaluation step. The real 140nt sequence remains complete.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {Brain} from "../../../v17/transcend/torus-aether/devour/brain.mjs";

const MODES={
  "R3-default-core70": {start:70,off:[]},
  "R3-off-core70": {start:70,off:["R3"]},
  "R3-off-up58": {start:58,off:["R3"]},
  "R3-off-up62": {start:62,off:["R3"]},
  "R3-off-up66": {start:66,off:["R3"]},
  "R3-off-up68": {start:68,off:["R3"]},
  "R3-off-down72": {start:72,off:["R3"]},
  "R3-off-down74": {start:74,off:["R3"]},
  "R3-off-down78": {start:78,off:["R3"]},
  "R3-off-remote100": {start:100,off:["R3"]},
  "R2R3-off-up66": {start:66,off:["R2","R3"]},
  "R2R3-off-down72": {start:72,off:["R2","R3"]}
};
const LABELS=["P","N"],SYMBOLS=[80,78],SEED=20261119;
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const numhash=s=>parseInt(hash(s).slice(0,8),16);
const bytes=s=>Array.from(s,c=>c.charCodeAt(0));
const fail=s=>{throw Error(s)};

function parseFasta(filename,label) {
  const raw=fs.readFileSync(filename);
  const lines=raw.toString("utf8").split(/\r?\n/);
  const rows=[],rejected={length:0,invalidBases:0,empty:0};
  let pending=false,identifier="",idx=0;
  for(const line of lines) {
    const s=line.trim().toUpperCase();
    if(!s)continue;
    if(s.startsWith(">")){
      if(pending)fail("FASTA incomplete identifier in "+filename);
      identifier=line.slice(1).trim();pending=true;continue;
    }
    if(!pending)fail("FASTA sequence without header in "+filename);
    pending=false;idx++;
    if(s.length!==140){rejected.length++;continue;}
    if(!/^[ACGT]{140}$/.test(s)){rejected.invalidBases++;continue;}
    rows.push({label,dna:s,name:label+":"+identifier+":"+idx,group:identifier});
  }
  if(pending)rejected.empty++;
  if(!rows.length)fail("No 140nt real HS3D records: "+filename);
  return {rows,readCount:idx,sha256:hash(raw),rejected};
}
function loadSource(dir,phase){
  const files={
    pTrain:path.join(dir,"Train/Donor_Train_Positive.txt"),
    nTrain:path.join(dir,"Train/Donor_Train_Negative.txt"),
    pTest:path.join(dir,"Test/Donor_Test_Positive.txt"),
    nTest:path.join(dir,"Test/Donor_Test_Negative.txt")
  };
  const p=parseFasta(files.pTrain,"P"),n=parseFasta(files.nTrain,"N");
  // Do not read the original official TEST until a selected method is
  // frozen in a prior commit and the final unlock is supplied by CI.
  const getTest=()=>{
    if(phase!=="test")fail("Test path cannot be accessed during development");
    return {p:parseFasta(files.pTest,"P"),n:parseFasta(files.nTest,"N")};
  };
  return {p,n,getTest};
}
function sourceSplit(data,phase){
  const byLabel={P:data.p.rows,N:data.n.rows};
  const repeated=new Map(),conflicts=new Set();
  for(const label of LABELS)for(const row of byLabel[label]){
    if(repeated.has(row.dna)&&repeated.get(row.dna)!==label)conflicts.add(row.dna);
    repeated.set(row.dna,label);
  }
  const pools={};
  let duplicateCount=0;
  for(const label of LABELS){
    const seen=new Set();pools[label]=[];
    for(const row of byLabel[label]){
      if(conflicts.has(row.dna)){duplicateCount++;continue;}
      if(seen.has(row.dna)){duplicateCount++;continue;}
      seen.add(row.dna);pools[label].push(row);
    }
    pools[label].sort((a,b)=>hash("hs3d-donor-blind-v1:"+a.dna).localeCompare(hash("hs3d-donor-blind-v1:"+b.dna)));
    if(pools[label].length<900)fail("Insufficient authentic source examples "+label+":"+pools[label].length);
  }
  const training=[],dev=[];
  for(let i=0;i<700;i++)for(const label of LABELS)training.push(pools[label][i]);
  for(let i=700;i<900;i++)for(const label of LABELS)dev.push(pools[label][i]);
  let final=[];
  const heldout=phase==="test"?data.getTest():null;
  const excludedFinal={crossSplitIdentical:0,duplicates:0,conflictingTruth:0};
  if(heldout){
    const prior=new Set([...training,...dev].map(x=>x.dna));
    const seen=new Map();
    const unique=[];
    for(const label of LABELS)for(const r of heldout[label.toLowerCase()].rows){
      if(prior.has(r.dna)){excludedFinal.crossSplitIdentical++;continue;}
      if(seen.has(r.dna)){
        if(seen.get(r.dna)!==label){excludedFinal.conflictingTruth++;}
        else excludedFinal.duplicates++;
        continue;
      }
      seen.set(r.dna,label);unique.push(r);
    }
    final=unique;
    if(final.length<200)fail("Too few original official test records");
  }
  const motifRate=rows=>({n:rows.length,
    gt:rows.filter(x=>x.dna.slice(70,72)==="GT").length,
    near:rows.filter(x=>x.dna.slice(68,74).includes("GT")).length});
  return {training,dev,final,excludedFinal,duplicateCount,conflictDNA:conflicts.size,
    sourceCounts:{positive:pools.P.length,negative:pools.N.length},
    motifs:{training:motifRate(training),dev:motifRate(dev),
      final:phase==="test"?motifRate(final):null}};
}
function present(dna,start){
  if(dna.length!==140||start<0||start>136)fail("Invalid genuine 140nt observation");
  return "DNA "+dna.slice(0,start)+dna.slice(start+4)+dna.slice(start,start+4);
}
function predict(brain,dna,start){
  const d=brain.predict(bytes(present(dna,start)));
  if(!Array.isArray(d)||d.length<81||SYMBOLS.some(c=>!Number.isFinite(d[c])))
    fail("Original native Brain did not return a valid P/N distribution");
  return d[80]>=d[78]?"P":"N";
}
function measure(rows,predictor){
  const conf={P:{P:0,N:0},N:{P:0,N:0}};
  const all=[];
  for(const r of rows){
    const guess=predictor(r);
    if(!LABELS.includes(guess))fail("Native class code is invalid");
    conf[r.label][guess]++;all.push({name:r.name,label:r.label,prediction:guess});
  }
  const n=rows.length,correct=conf.P.P+conf.N.N;
  const perClass=LABELS.map(label=>{
    const TP=conf[label][label],FN=conf[label][label==="P"?"N":"P"],
      FP=conf[label==="P"?"N":"P"][label],support=TP+FN;
    return {label,support,recall:TP/(support||1),
      precision:TP/(TP+FP||1),f1:2*TP/(2*TP+FP+FN||1)};
  });
  return{n,correct,accuracy:correct/n,
    macroF1:perClass.reduce((a,x)=>a+x.f1,0)/2,
    balancedAccuracy:perClass.reduce((a,x)=>a+x.recall,0)/2,
    perClass,confusion:conf,predictions:all};
}
const [dir,mode,...flags]=process.argv.slice(2);
if(!dir||!Object.hasOwn(MODES,mode))
  fail("Usage: node run-native-donor.mjs PATH_TO_HS3D_BAL MODE --phase=dev|test");
const phase=(flags.find(s=>s.startsWith("--phase="))||"--phase=dev").slice(8);
if(!["dev","test"].includes(phase))fail("Unsupported phase");
if(phase==="test"&&process.env.HS3D_TEST_UNLOCK!=="FROZEN_NATIVE_VIEW")
  fail("Official test locked until winner frozen before the run");
const cfg=MODES[mode],source=loadSource(dir,phase),split=sourceSplit(source,phase);
const evalRows=phase==="dev"?split.dev:split.final;
if(split.training.length!==1400||split.dev.length!==400)fail("Split integrity error");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,
  ...(cfg.off.length?{off:cfg.off}:{})},c:{cap:4},seed:SEED});
brain.liveWorld="text";
for(const r of split.training){
  const observation=present(r.dna,cfg.start)+r.label+"\n";
  for(const y of bytes(observation))brain.live(y,false);
}
const lived=brain.lived,alignedLived=brain.align?.lived;
const measured=measure(evalRows,r=>predict(brain,r.dna,cfg.start));
if(brain.lived!==lived||brain.align?.lived!==alignedLived)
  fail("Evaluation illegally mutated original organism training counters");
const majority=measure(evalRows,()=>split.training.filter(x=>x.label==="P").length>=700?"P":"N");
const motifOnly=measure(evalRows,()=>"P"); // central GT is constant in this dataset
const result={
  status:"ACTUAL_EXECUTED_ORIGINAL_V42_BRAIN_REAL_HUMAN_HS3D",
  study:"Human HS3D donor true-vs-false splice-site classification; 140nt",
  scope:"Central GT motif shared by true and false; NOT AlphaGenome2 assay",
  mode,phase,config:cfg,datasetCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
  sourceFiles:{P:source.p.sha256,N:source.n.sha256},
  sourceCounts:split.sourceCounts,motifs:split.motifs,
  split:{train:split.training.length,dev:split.dev.length,
    test:phase==="test"?split.final.length:null,
    excludedConflictDNA:split.conflictDNA,
    excludedDuplicateDNA:split.duplicateCount,
    excludedFinal:phase==="test"?split.excludedFinal:null},
  nativeBrain:{learnedSymbols:lived,mode:"original EmergentChain with original C/A organs",
    noSeparateLearnedClassifier:true,originalBrainUnchanged:true,
    labelAtInference:false},
  measured:{...measured,predictions:undefined},
  baselines:{majority:{accuracy:majority.accuracy,macroF1:majority.macroF1},
    coreGTOnly:{accuracy:motifOnly.accuracy,macroF1:motifOnly.macroF1}},
  comparedWithAlphaGenome2:false,
  outcomeStatus:"MEASURED_NOT_AG2_COMPARISON"
};
if(process.env.HS3D_RAW_RESULT_FILE)
  fs.writeFileSync(process.env.HS3D_RAW_RESULT_FILE,JSON.stringify({...result,predictions:measured.predictions},null,2)+"\n");
console.log("HS3D_NATIVE_RESULT "+JSON.stringify(result));
