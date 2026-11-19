// Scientific controls ONLY. Never used as the original Brain's predictor.
// Exact authentic 140nt HS3D donor dataset, same split as native Brain tests.
// Standard position-wise log odds, Laplace smoothing=1, threshold=0 frozen.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const BASES="ACGT";
function read(file,label){
  const lines=fs.readFileSync(file,"utf8").split(/\r?\n/);
  const out=[];let id="";
  for(const line of lines){
    const s=line.trim();
    if(!s)continue;
    if(s.startsWith(">")){id=s.slice(1).trim();continue;}
    const seq=s.toUpperCase();
    if(!id)throw Error("Missing FASTA header "+file);
    if(seq.length===140&&/^[ACGT]{140}$/.test(seq))out.push({id,label,dna:seq});
    id="";
  }
  if(out.length<200)throw Error("Insufficient authentic data "+file);
  return out;
}
function load(dir,part,label){
  const suffix=label==="P"?"Positive":"Negative";
  return read(path.join(dir,part,`Donor_${part}_${suffix}.txt`),label);
}
const [dir,...flags]=process.argv.slice(2);
const phase=(flags.find(x=>x.startsWith("--phase="))||"--phase=dev").slice(8);
if(!dir||!["dev","test"].includes(phase))throw Error("Usage: measure-pwm-controls.mjs HS3D_FOLDER --phase=dev|test");
if(phase==="test"&&process.env.HS3D_TEST_UNLOCK!=="FROZEN_NATIVE_VIEW")
  throw Error("Original official Test is locked; require frozen native winner");
const initial={P:load(dir,"Train","P"),N:load(dir,"Train","N")};
const conflicts=new Set();
const origin=new Map();
for(const label of ["P","N"])for(const row of initial[label]){
  if(origin.has(row.dna)&&origin.get(row.dna)!==label)conflicts.add(row.dna);
  origin.set(row.dna,label);
}
const pools={};
for(const label of ["P","N"]){
  const seen=new Set(),xs=[];
  for(const r of initial[label]){
    if(conflicts.has(r.dna)||seen.has(r.dna))continue;
    seen.add(r.dna);xs.push(r);
  }
  xs.sort((a,b)=>hash("hs3d-donor-blind-v1:"+a.dna).localeCompare(hash("hs3d-donor-blind-v1:"+b.dna)));
  if(xs.length<900)throw Error("Insufficient source 140nt rows");
  pools[label]=xs;
}
const train=[],dev=[];
for(let i=0;i<700;i++)for(const l of ["P","N"])train.push(pools[l][i]);
for(let i=700;i<900;i++)for(const l of ["P","N"])dev.push(pools[l][i]);
let test=[];
let excluded={crossSplitIdentical:0,duplicates:0,conflictingTruth:0};
if(phase==="test"){
  const prior=new Set([...train,...dev].map(x=>x.dna));
  const seen=new Map();
  for(const label of ["P","N"])for(const r of load(dir,"Test",label)){
    if(prior.has(r.dna)){excluded.crossSplitIdentical++;continue;}
    if(seen.has(r.dna)){
      if(seen.get(r.dna)!==label)excluded.conflictingTruth++;
      else excluded.duplicates++;
      continue;
    }
    seen.set(r.dna,label);test.push(r);
  }
}
const evalRows=phase==="dev"?dev:test;
const windows={centralGT:[70,72],sameNativeView:[72,76],local20:[60,80],entire140:[0,140]};
function learnPWM(train,lo,hi){
  const totals=Array.from({length:hi-lo},()=>({P:[1,1,1,1],N:[1,1,1,1]}));
  for(const r of train)for(let i=lo;i<hi;i++){
    const k=BASES.indexOf(r.dna[i]);if(k<0)throw Error("DNA non canonical");
    totals[i-lo][r.label][k]++;
  }
  const weights=totals.map(row=>BASES.split("").map((_,k)=>
    Math.log(row.P[k]/704)-Math.log(row.N[k]/704)));
  return r=>{let sum=0;for(let i=lo;i<hi;i++)sum+=weights[i-lo][BASES.indexOf(r.dna[i])];
    return sum>=0?"P":"N";};
}
function metrics(rows,pred){
  const C={P:{P:0,N:0},N:{P:0,N:0}};
  for(const r of rows)C[r.label][pred(r)]++;
  const perClass=["P","N"].map(l=>{
    const other=l==="P"?"N":"P",tp=C[l][l],fn=C[l][other],fp=C[other][l];
    return{label:l,support:tp+fn,precision:tp/(tp+fp||1),recall:tp/(tp+fn||1),
      f1:2*tp/(2*tp+fp+fn||1)};
  });
  return{n:rows.length,accuracy:(C.P.P+C.N.N)/rows.length,confusion:C,
    macroF1:perClass.reduce((s,x)=>s+x.f1,0)/2,
    balancedAccuracy:perClass.reduce((s,x)=>s+x.recall,0)/2,perClass};
}
const result={
  status:"EXECUTED_EXTERNAL_BASELINES_NOT_PART_OF_NATIVE_ORGANISM",
  phase,source:"OluwadareLab EnsembleSplice HS3D balanced donor human 140nt",
  datasetCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
  nTrain:train.length,nDev:dev.length,nTest:phase==="test"?test.length:null,
  excluded:phase==="test"?excluded:null,
  centralGT:{train:train.filter(r=>r.dna.slice(70,72)==="GT").length,
    eval:evalRows.filter(r=>r.dna.slice(70,72)==="GT").length},
  baselines:Object.fromEntries(Object.entries(windows).map(([name,[lo,hi]])=>
    [name,{positions:[lo,hi],...metrics(evalRows,learnPWM(train,lo,hi))}]))
};
console.log("HS3D_PWM_CONTROL "+JSON.stringify(result));
