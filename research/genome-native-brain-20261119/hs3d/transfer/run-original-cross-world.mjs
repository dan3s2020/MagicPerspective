// TRUE cross-world transfer of SAME original native V42 Brain state.
// Train GT donor -> adapt on AG acceptor, matched against fresh and donor
// feedback inversion; genuine HS3D 140nt DNA and actual source labels.
// No outside trained classifier, helper prediction head or original code edit.
// ONLY upstream public Train is present; official Test is never read.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const PINNED_COMMIT="e04aa5aeb4035adac9ce6c65c2143c2ef7163332";
const LABELS=["P","N"],codes={P:80,N:78};
const SHOTS=new Set([0,40,200,800]);
const MODE=new Set(["fresh","donor","donor-inverted"]);
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const bytes=s=>Array.from(s,ch=>ch.charCodeAt(0));
const fail=s=>{throw Error(s)};
function readFasta(p,label){
  const buf=fs.readFileSync(p),lines=buf.toString("utf8").split(/\r?\n/);
  const out=[],issues={invalidLength:0,invalidAlphabet:0,incomplete:0};
  let header=null,ordinal=0;
  for(const original of lines){
    const line=original.trim();
    if(!line)continue;
    if(line.startsWith(">")){
      if(header!==null)fail("Orphan FASTA record in "+p);
      header=line.slice(1).trim();
      continue;
    }
    if(header===null)fail("Missing FASTA header: "+p);
    ordinal++;
    const dna=line.toUpperCase();
    if(dna.length!==140)issues.invalidLength++;
    else if(!/^[ACGT]{140}$/.test(dna))issues.invalidAlphabet++;
    else out.push({label,dna,identifier:label+":"+header+":"+ordinal});
    header=null;
  }
  if(header!==null)issues.incomplete++;
  if(out.length<950)fail("Too few genuine 140nt records in "+p+": "+out.length);
  return{rows:out,sha256:sha(buf),issues,sourceCount:ordinal};
}
function buildSource(dir,type,salt){
  const prefix=type==="donor"?"Donor":"Acceptor";
  const P=readFasta(path.join(dir,"Train",prefix+"_Train_Positive.txt"),"P");
  const N=readFasta(path.join(dir,"Train",prefix+"_Train_Negative.txt"),"N");
  const map=new Map(),conflicts=new Set();
  for(const x of [...P.rows,...N.rows]){
    const prev=map.get(x.dna);
    if(prev&&prev!==x.label)conflicts.add(x.dna);
    map.set(x.dna,x.label);
  }
  let excluded=0;
  const groups={P:[],N:[]};
  for(const [label,r] of [["P",P],["N",N]]){
    const seen=new Set();
    for(const row of r.rows){
      if(conflicts.has(row.dna)||seen.has(row.dna)){excluded++;continue}
      seen.add(row.dna);groups[label].push(row);
    }
    groups[label].sort((a,b)=>sha(salt+a.dna).localeCompare(sha(salt+b.dna)));
  }
  return {groups,files:{P:P.sha256,N:N.sha256},
    excludedDuplicateAndConflict:excluded,conflicts:conflicts.size,
    sources:{P:P.sourceCount,N:N.sourceCount},
    accepted:{P:groups.P.length,N:groups.N.length},
    invalid:{P:P.issues,N:N.issues}};
}
function fixedView(dna,site){
  if(!/^[ACGT]{140}$/.test(dna))fail("Observation isn't genuine exact 140nt DNA");
  const anchor=site==="donor"?72:70;
  return "DNA "+dna.slice(0,anchor)+dna.slice(anchor+4)+dna.slice(anchor,anchor+4);
}
function expectedMotif(site){return site==="donor"?{start:70,bases:"GT"}:{start:68,bases:"AG"}}
function assertMotifs(rows,site){
 const {start,bases}=expectedMotif(site);
 let wrong=0;for(const row of rows)wrong+=Number(row.dna.slice(start,start+2)!==bases);
 if(wrong)fail("Source has "+wrong+" records without real central "+bases+" for "+site);
 return{motif:bases,index:start,n:rows.length,matching:rows.length};
}
function interleave(source,start=0,numPerClass=0){
 const out=[];
 for(let i=start;i<start+numPerClass;i++)for(const label of LABELS){
   if(!source.groups[label][i])fail("Missing real "+label+" row at "+i);
   out.push(source.groups[label][i]);
 }
 return out;
}
function train(brain,rows,site,invert=false){
 const before=brain.lived;
 for(const row of rows){
   const truth=invert?(row.label==="P"?"N":"P"):row.label;
   const s=fixedView(row.dna,site)+truth+"\n";
   for(const code of bytes(s))brain.live(code,false);
 }
 if(brain.lived-before!==rows.length*146)
   fail("Native training accounting mismatch "+(brain.lived-before)+" for "+rows.length);
 return brain.lived-before;
}
function prediction(brain,row,site){
 const distr=brain.predict(bytes(fixedView(row.dna,site)));
 if(!Array.isArray(distr)||distr.length<81||!Number.isFinite(distr[80])||!Number.isFinite(distr[78]))
   fail("Original native Brain invalid class distribution");
 return distr[80]>=distr[78]?"P":"N";
}
function evaluate(brain,rows,site){
 const confusion={P:{P:0,N:0},N:{P:0,N:0}},observed=[];
 for(const row of rows){
   const predicted=prediction(brain,row,site);
   confusion[row.label][predicted]++;
   observed.push({identifier:row.identifier,truth:row.label,predicted,correct:row.label===predicted});
 }
 const n=rows.length,correct=confusion.P.P+confusion.N.N;
 const perClass=LABELS.map(l=>{
   const other=l==="P"?"N":"P";
   const tp=confusion[l][l],fp=confusion[other][l],fn=confusion[l][other];
   return{label:l,support:tp+fn,precision:tp/(tp+fp||1),recall:tp/(tp+fn||1),
     f1:2*tp/(2*tp+fp+fn||1)};
 });
 return{
   n,correct,accuracy:correct/n,macroF1:perClass.reduce((s,v)=>s+v.f1,0)/2,
   balancedAccuracy:perClass.reduce((s,v)=>s+v.recall,0)/2,
   confusion,perClass,observed};
}
const [dataDir,startingState,shotString,...extras]=process.argv.slice(2);
if(!dataDir||!MODE.has(startingState)||extras.length)fail(
  "Usage: node run-original-cross-world.mjs /path/to/HS3D TRAIN fresh|donor|donor-inverted 0|40|200|800");
const shots=Number(shotString);
if(!SHOTS.has(shots))fail("Unregistered adaptation amount: "+shotString);
const donor=buildSource(dataDir,"donor","hs3d-donor-blind-v1:");
const acceptor=buildSource(dataDir,"acceptor","hs3d-acceptor-transfer-v1:");
const donorChosen=interleave(donor,0,700);
const allAcceptorTrain=interleave(acceptor,0,600);
const acceptorDev=interleave(acceptor,600,200);
if(allAcceptorTrain.length!==1200||acceptorDev.length!==400||donorChosen.length!==1400)
  fail("Actual human dataset train/dev pool count differs from preregistration");
const devDNAs=new Set(acceptorDev.map(r=>r.dna));
const acceptorTrainDNAs=new Set(allAcceptorTrain.map(r=>r.dna));
if(acceptorDev.some(r=>acceptorTrainDNAs.has(r.dna)))fail("Acceptor train/dev same DNA leakage");
const allowedDonor=donorChosen.filter(x=>!devDNAs.has(x.dna));
const donorExcluded=donorChosen.length-allowedDonor.length;
const actualAcceptorTraining=allAcceptorTrain.slice(0,shots);
if(actualAcceptorTraining.length!==shots)fail("Wrong adaptation count");
const motifCheck={
  donor:assertMotifs(allowedDonor,"donor"),
  acceptorTrain:assertMotifs(allAcceptorTrain,"acceptor"),
  acceptorDev:assertMotifs(acceptorDev,"acceptor")
};
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},c:{cap:4},seed:20261119});
brain.liveWorld="text";
const initialLived=brain.lived;
let donorLived=0;
if(startingState!=="fresh")donorLived=train(brain,allowedDonor,"donor",startingState==="donor-inverted");
const beforeAcceptor=brain.lived;
const acceptorLived=train(brain,actualAcceptorTraining,"acceptor");
const after=brain.lived,alignBefore=brain.align?.lived;
const metric=evaluate(brain,acceptorDev,"acceptor");
if(brain.lived!==after||brain.align?.lived!==alignBefore)
 fail("Evaluation accidentally trained original Brain");
const result={
  status:"GENUINE_SAME_ORIGINAL_BRAIN_DONOR_TO_ACCEPTOR_TEST",
  phase:"ACCEPTOR_TRAIN_SPLIT_EXPLORATORY_NO_OFFICIAL_TEST_OPENED",
  experiment:"HS3D human GT donor -> human AG acceptor native V42 state transfer",
  source:"OluwadareLab EnsembleSplice",pinnedCommit:PINNED_COMMIT,
  startingState,acceptorAdaptationExamples:shots,
  originalNativeCode:"v17/transcend/torus-aether/devour/brain.mjs Brain.live/Brain.predict",
  originalNativeLearner:{cCap:4,aDepth:2,off:["R2","R3"],seed:20261119},
  dataChecksums:{donor:donor.files,acceptor:acceptor.files},
  sourceCounts:{donor:donor.sources,acceptor:acceptor.sources},
  acceptedUnique:{donor:donor.accepted,acceptor:acceptor.accepted},
  rejected:{donor:donor.excludedDuplicateAndConflict,acceptor:acceptor.excludedDuplicateAndConflict,
    donorToAcceptorDevIdentical:donorExcluded},
  motifCheck,
  counts:{donorPretraining:startingState==="fresh"?0:allowedDonor.length,
    acceptorAdaptation:actualAcceptorTraining.length,acceptorDevelopment:acceptorDev.length},
  nativeStateContinuity:{brainReinstantiatedBetweenWorlds:false,initialLived,
    livedAfterDonor:beforeAcceptor,donorLivedSymbols:donorLived,acceptorLivedSymbols:acceptorLived,
    finalLived:after,originalSameBrain:true,
    fakeBiologicalFeedback:startingState==="donor-inverted"},
  measured:{...metric,observed:undefined},
  externalClassOnlyControls:{
    centralAGConstantMotifOnlyAccuracy:0.5,
    balancedMajorityBaselineAccuracy:0.5
  },
  provenance:{
    genuineHS3D: true,originalBrainUsed:true,allAcceptorsCentralAG:true,
    noExternalTrainableClassifier:true,acceptorTruthHiddenDuringInference:true,
    officialAcceptorTestNotOpened:true,alphaGenome2NotRun:true,
    originalCodeUnchanged:true
  }
};
if(process.env.HS3D_TRANSFER_RESULT_PATH)
 fs.writeFileSync(process.env.HS3D_TRANSFER_RESULT_PATH,
  JSON.stringify({...result,perExample:metric.observed},null,2)+"\n");
console.log("HS3D_NATIVE_TRANSFER_RESULT "+JSON.stringify(result));
