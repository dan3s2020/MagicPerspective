// Original V42 Brain transfer study: real human donor GT -> acceptor AG.
// Original Brain.live()/Brain.predict() & ConstructedPathLearner kept intact.
// Inference receives no label, no synthetic correct route, no separate head.
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const ints=s=>Array.from(s,c=>c.charCodeAt(0));
const error=s=>{throw Error(s)};
const LABELS=["P","N"],CODE=[80,78];
const POS=[54,58,62,66,68,70,72,74,78,82,90,100];
const MODES=["donor-pretrained","fresh-acceptor"];
const ADAPT=[0,40,200,600,1200];

function parseFasta(filename,label){
 const source=fs.readFileSync(filename),lines=source.toString("utf8").split(/\r?\n/);
 const result=[];let header=null,rawCount=0,rejected=0;
 for(const line of lines){
  const s=line.trim();if(!s)continue;
  if(s.startsWith(">")){if(header!==null)error("FASTA contains orphan identifier "+filename);
   header=s.slice(1);continue;}
  if(header===null)error("Sequence without identifier "+filename);
  rawCount++;
  const dna=s.toUpperCase();
  if(dna.length===140&&/^[ACGT]{140}$/.test(dna))
   result.push({label,dna,name:label+":"+header+":"+rawCount});
  else rejected++;
  header=null;
 }
 if(header!==null)rejected++;
 if(result.length<1600)error("Insufficient valid human HS3D for transfer "+filename+": "+result.length);
 return{records:result,sha256:hash(source),rawCount,rejected};
}
function task(trainDir,type,exclude=new Set()){
 const name=type==="donor"?"Donor":type==="acceptor"?"Acceptor":error("bad task");
 const raw={P:parseFasta(path.join(trainDir,"Train",name+"_Train_Positive.txt"),"P"),
  N:parseFasta(path.join(trainDir,"Train",name+"_Train_Negative.txt"),"N")};
 const seen=new Map(),conflict=new Set();
 for(const label of LABELS)for(const r of raw[label].records){
  if(seen.has(r.dna)&&seen.get(r.dna)!==label)conflict.add(r.dna);
  seen.set(r.dna,label);
 }
 const groups={},duplicates={P:0,N:0},excludedCrossTask={P:0,N:0};
 for(const label of LABELS){
  groups[label]=[];const current=new Set();
  for(const r of raw[label].records){
   if(exclude.has(r.dna)){excludedCrossTask[label]++;continue}
   if(conflict.has(r.dna)||current.has(r.dna)){duplicates[label]++;continue}
   current.add(r.dna);groups[label].push(r);
  }
  const salt=type==="donor"?"hs3d-donor-blind-v1:":"hs3d-acceptor-transfer-v1:";
  groups[label].sort((a,b)=>hash(salt+a.dna).localeCompare(hash(salt+b.dna)));
  if(groups[label].length<1600)error("Insufficient unique "+type+" "+label+": "+groups[label].length);
 }
 const motif=type==="donor"?"GT":"AG",site=type==="donor"?70:68;
 return{groups,sourceHashes:Object.fromEntries(LABELS.map(l=>[l,raw[l].sha256])),
  sourceRejected:Object.fromEntries(LABELS.map(l=>[l,raw[l].rejected])),
  duplicateCounts:duplicates,crossTaskExclusions:excludedCrossTask,
  motif,site,counts:Object.fromEntries(LABELS.map(l=>[l,groups[l].length]))};
}
function interleave(groups,start,count){
 const xs=[];
 for(let i=start;i<start+count;i++)for(const label of LABELS){
  const r=groups[label][i];if(!r)error("Index not found "+label+" "+i);xs.push(r);
 }
 return xs;
}
function observedView(row,index){
 const start=POS[index],s=row.dna.slice(start,start+4);
 if(s.length!==4)error("Window out of range");
 return {index,start,kmer:s,bytes:ints(String.fromCharCode(97+index)+s)};
}
function observeClass(brain,w){
 const prediction=brain.predict(w.bytes);
 if(!Array.isArray(prediction)||prediction.length<81||CODE.some(c=>!Number.isFinite(prediction[c])))
  error("Original Brain.predict() invalid");
 const P=Math.max(0,prediction[80]),N=Math.max(0,prediction[78]),total=P+N;
 const confidence=total?Math.abs(P-N)/total:0,probPositive=total?P/total:0.5;
 const position=Math.max(-1,Math.min(1,(w.start-70)/70));
 const features=[1,position,confidence,-(1-confidence),probPositive,
  1-Math.min(1,Math.abs(w.start-70)/30)];
 return {...w,prediction:P>=N?"P":"N",confidence,features,
  pathScore:brain.constructedPaths.transferableScore(features)};
}
function candidates(brain,row){return POS.map((_,i)=>observeClass(brain,observedView(row,i)));}
function choiceNative(options){let best=options[0];for(const o of options)if(o.pathScore>best.pathScore+1e-14)best=o;return best;}
function choiceConfidence(options){let best=options[0];for(const o of options)if(o.confidence>best.confidence+1e-14)best=o;return best;}
function trainOriginal(brain,records){
 let views=0;
 for(let index=0;index<records.length;index++){
  const row=records[index];
  for(let offset=0;offset<POS.length;offset++){
   const w=observedView(row,(offset+index)%POS.length);
   for(const symbol of [...w.bytes,row.label.charCodeAt(0),10])brain.live(symbol,false);
   views++;
  }
 }
 return views;
}
function rewardOriginal(brain,records){
 let rewards=0,preRewardCorrect=0;
 for(const row of records){
  const all=candidates(brain,row),native=choiceNative(all);
  preRewardCorrect+=Number(native.prediction===row.label);
  // Historical label is used solely after native predictions are formed.
  for(const w of all){brain.constructedPaths.learnTransferable(w.features,w.prediction===row.label,0.02);rewards++;}
 }
 return{rewards,preRewardCorrect};
}
function calcMetrics(rows){
 const C={P:{P:0,N:0},N:{P:0,N:0}};
 for(const r of rows)C[r.truth][r.prediction]++;
 const detail=LABELS.map(label=>{
  const other=label==="P"?"N":"P",tp=C[label][label],fn=C[label][other],fp=C[other][label];
  return{label,support:tp+fn,precision:tp/(tp+fp||1),recall:tp/(tp+fn||1),
   f1:(2*tp)/(2*tp+fn+fp||1)};
 });
 return {n:rows.length,correct:C.P.P+C.N.N,accuracy:(C.P.P+C.N.N)/rows.length,
  balancedAccuracy:detail.reduce((s,d)=>s+d.recall,0)/2,
  macroF1:detail.reduce((s,d)=>s+d.f1,0)/2,perClass:detail,confusion:C};
}
function evalBrain(brain,rows){
 const lived=brain.lived,aligned=brain.align?.lived,updates=brain.constructedPaths.pathPolicyUpdates;
 const byMethod={nativePolicy:[],fixed70:[],fixed72:[],confidence:[]};
 const selected={},details=[];
 for(const row of rows){
  const opts=candidates(brain,row),chosen=choiceNative(opts);
  selected[chosen.start]=(selected[chosen.start]||0)+1;
  const picks={nativePolicy:chosen,fixed70:opts[POS.indexOf(70)],
    fixed72:opts[POS.indexOf(72)],confidence:choiceConfidence(opts)};
  for(const [key,p] of Object.entries(picks))
   byMethod[key].push({truth:row.label,prediction:p.prediction});
  details.push({sampleHash:hash("audit:"+row.dna),truth:row.label,
   predictions:Object.fromEntries(Object.entries(picks).map(([key,p])=>[key,p.prediction])),
   nativePosition:chosen.start,allViews:opts.map(p=>[p.start,p.prediction])});
 }
 if(brain.lived!==lived||brain.align?.lived!==aligned||
    brain.constructedPaths.pathPolicyUpdates!==updates)error("Original Brain mutated during blind evaluation");
 return{n:rows.length,selected,metrics:Object.fromEntries(Object.entries(byMethod).map(([k,v])=>[k,calcMetrics(v)])),
  details};
}
const [dir,mode,adaptText,...extra]=process.argv.slice(2);
if(!dir||!MODES.includes(mode)||extra.length)error("Usage: node run-transfer.mjs PATH_TO_HS3D_TRAIN donor-pretrained|fresh-acceptor 0|40|200|600|1200");
const adapt=Number(adaptText);if(!ADAPT.includes(adapt))error("Unregistered acceptor adaptation size");
if(fs.existsSync(path.join(dir,"Test")))
 error("Official HS3D Test must NOT be checked out during transfer development");
const acceptor=task(dir,"acceptor");
const acceptorDev=interleave(acceptor.groups,1300,200);
const adaptAll=interleave(acceptor.groups,0,600);
const acceptorProtected=new Set([...acceptorDev,...adaptAll].map(r=>r.dna));
const donor=task(dir,"donor",acceptorProtected);
const donorTrain=interleave(donor.groups,0,600),donorCal=interleave(donor.groups,600,100);
const acceptorLearn=interleave(acceptor.groups,0,adapt/2);
for(const r of donorTrain.concat(donorCal)){
 if(r.dna.slice(70,72)!=="GT")error("Donor GT integrity failure");
}
for(const r of acceptorLearn.concat(acceptorDev)){
 if(r.dna.slice(68,70)!=="AG")error("Acceptor AG integrity failure");
}
const sets=[donorTrain,donorCal,acceptorLearn,acceptorDev];
for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){
 const a=new Set(sets[i].map(r=>r.dna));
 for(const r of sets[j])if(a.has(r.dna))error("Duplicate DNA crosses experiment partitions "+i+"-"+j);
}
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},
 c:{cap:5},seed:20261122});
brain.liveWorld="text";
if(!brain.constructedPaths?.learnTransferable||
  !brain.constructedPaths?.transferableScore)error("Original constructed path organ absent");
const checkpoints=[],initialPolicy=brain.constructedPaths.pathPolicy.slice();
let observedDonor=0,observedAcceptor=0,donorReward=null,acceptorReward=null;
if(mode==="donor-pretrained"){
 observedDonor=trainOriginal(brain,donorTrain);
 donorReward=rewardOriginal(brain,donorCal);
 checkpoints.push({stage:"afterDonor",lived:brain.lived,policy:brain.constructedPaths.pathPolicy.slice(),
   updates:brain.constructedPaths.pathPolicyUpdates});
}
if(adapt>0){
 observedAcceptor=trainOriginal(brain,acceptorLearn);
 acceptorReward=rewardOriginal(brain,acceptorLearn);
}
const after=brain.constructedPaths.pathPolicy.slice();
const results=evalBrain(brain,acceptorDev);
const report={
 study:"Cross-task transfer authentic human HS3D donor GT -> acceptor AG",
 phase:"ACCEPTOR_TRAIN_ONLY_DEV_NOT_OFFICIAL_TEST",mode,adapt,
 pinnedUpstreamCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
 taskIntegrity:{donorGTsite70:true,acceptorAGsite68:true,officialTestNotRead:true,
  sourceSHA256:{donor:donor.sourceHashes,acceptor:acceptor.sourceHashes},
  sourceRejected:{donor:donor.sourceRejected,acceptor:acceptor.sourceRejected},
  uniqueCandidateCounts:{donor:donor.counts,acceptor:acceptor.counts},
  excludedDonorOverlaps:donor.crossTaskExclusions,
  sourceDuplicateCounts:{donor:donor.duplicateCounts,acceptor:acceptor.duplicateCounts}},
 training:{donorExamples:mode==="donor-pretrained"?donorTrain.length:0,
  donorCalibration:mode==="donor-pretrained"?donorCal.length:0,
  acceptorExamples:acceptorLearn.length,acceptorDevelopment:acceptorDev.length,
  donorViewActions:observedDonor,acceptorViewActions:observedAcceptor,
  livedSymbols:brain.lived,donorReward,acceptorReward,
  originalNativePolicyInitial:initialPolicy,checkpoints,originalNativePolicyFinal:after,
  nativePolicyUpdates:brain.constructedPaths.pathPolicyUpdates},
 evaluation:{n:results.n,selected:results.selected,metrics:results.metrics},
 claims:{originalBrainUnchanged:true,usesSameOriginalBrainForDonorThenAcceptor:true,
  testAnswerHiddenAtPrediction:true,policyIsOriginalConstructedPaths:true,
  allViewsObserved:true,windowCoordinatesPredefined:true,
  transferEstablished:false,AlphaGenome2Compared:false}
};
if(process.env.TRANSFER_RAW_FILE)fs.writeFileSync(process.env.TRANSFER_RAW_FILE,
 JSON.stringify({...report,perExample:results.details},null,2)+"\n");
console.log("HS3D_TRANSFER_RESULT "+JSON.stringify(report));
