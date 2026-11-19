// Native single-action credit vs full-information causal comparison, original Brain.
// Same ORIGINAL V42 Brain + its ORIGINAL ConstructedPathLearner pathPolicy.
// Genome is a real HS3D 140nt world; windows are observed from it, never
// synthetic targets. Classifier is exclusively Brain.predict(); navigator's
// learned weights live in brain.constructedPaths, not an external predictor.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";
const POS=[54,58,62,66,68,70,72,74,78,82,90,100];
const LABELS=["P","N"],CODES=[80,78],hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const bytes=s=>Array.from(s,c=>c.charCodeAt(0));
const fail=x=>{throw Error(x)};
const CONFIGS={
 "R2R3-bandit-topology":{off:["R2","R3"],feedback:"bandit"},
 "R2R3-allviews-topology":{off:["R2","R3"],feedback:"all"}
};
function readFasta(filename,label){
 const lines=fs.readFileSync(filename,"utf8").split(/\r?\n/),out=[];
 let name=null,idx=0,rejected=0;
 for(const line of lines){
  const s=line.trim();if(!s)continue;
  if(s.startsWith(">")){if(name!==null)fail("FASTA orphan header");name=s.slice(1).trim();continue}
  if(name===null)fail("FASTA record lacks header");
  const dna=s.toUpperCase();idx++;
  if(dna.length!==140||!/^[ACGT]{140}$/.test(dna))rejected++;
  else out.push({label,name:label+":"+name+":"+idx,dna});
  name=null;
 }
 // A minority of genuine upstream rows are malformed; exclude, count and disclose.
 if(out.length<900)fail("Insufficient real HS3D source "+filename);
 return {rows:out,sha256:hash(fs.readFileSync(filename)),rejected};
}
function sourceRows(dir){
 const p=readFasta(path.join(dir,"Train/Donor_Train_Positive.txt"),"P");
 const n=readFasta(path.join(dir,"Train/Donor_Train_Negative.txt"),"N");
 const conflicts=new Set(),source=new Map();
 for(const group of [p.rows,n.rows])for(const r of group){
  if(source.has(r.dna)&&source.get(r.dna)!==r.label)conflicts.add(r.dna);
  source.set(r.dna,r.label);
 }
 const groups={P:[],N:[]},duplicates={P:0,N:0};
 for(const item of [p,n]){
  const label=item.rows[0].label,seen=new Set();
  for(const r of item.rows){
   if(conflicts.has(r.dna)||seen.has(r.dna)){duplicates[label]++;continue}
   seen.add(r.dna);groups[label].push(r);
  }
  groups[label].sort((a,b)=>hash("hs3d-donor-blind-v1:"+a.dna).localeCompare(hash("hs3d-donor-blind-v1:"+b.dna)));
  if(groups[label].length<1300)fail("Required 1300 genuine donor rows per class");
 }
 const train=[],calibration=[],dev=[];
 for(let i=0;i<600;i++)for(const label of LABELS)train.push(groups[label][i]);
 for(let i=600;i<1100;i++)for(const label of LABELS)calibration.push(groups[label][i]);
 for(let i=1100;i<1300;i++)for(const label of LABELS)dev.push(groups[label][i]);
 const seen=[new Set(train.map(r=>r.dna)),new Set(calibration.map(r=>r.dna)),new Set(dev.map(r=>r.dna))];
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)for(const dna of seen[i])if(seen[j].has(dna))fail("TRAIN/CALIB/DEV leakage");
 return {train,calibration,dev,datasetHashes:{positive:p.sha256,negative:n.sha256},counts:{positive:groups.P.length,negative:groups.N.length},rejected:{positive:p.rejected,negative:n.rejected},duplicates,conflicts:conflicts.size};
}
function view(row,idx){
 const pos=POS[idx];
 if(!Number.isInteger(pos)||idx<0||idx>=POS.length)fail("Unsupported action");
 const kmer=row.dna.slice(pos,pos+4);
 if(kmer.length!==4)fail("Observed DNA window too short");
 return {index:idx,start:pos,bytes:bytes(String.fromCharCode(97+idx)+kmer),kmer};
}
function classObservation(brain,w){
 const output=brain.predict(w.bytes);
 if(!Array.isArray(output)||output.length<81||CODES.some(c=>!Number.isFinite(output[c])))fail("Invalid original Brain output");
 const positive=Math.max(0,output[80]),negative=Math.max(0,output[78]),sum=positive+negative;
 const q=sum?positive/sum:0.5;
 const nativeClass=positive>=negative?"P":"N";
 const margin=sum?Math.abs(positive-negative)/sum:0;
 // The 6D original native pathPolicy is the only learned view selector.
 // All features are from body position and native unlabelled beliefs.
 const normalizedPosition=Math.max(-1,Math.min(1,(w.start-70)/70));
 const f=[1,normalizedPosition,margin,-(1-margin),q,1-Math.min(1,Math.abs(w.start-70)/30)];
 return {...w,prediction:nativeClass,probabilityPositive:q,confidence:margin,
  features:f,policyScore:brain.constructedPaths.transferableScore(f)};
}
function inspect(brain,row){
 // Twelve actual sensory observations; this is NOT a hidden-oracle search
 // for an unseen answer, and there is no label in the observations.
 return POS.map((_,i)=>classObservation(brain,view(row,i)));
}
function selectNative(brain,observed){
 let best=observed[0];
 for(const o of observed)if(o.policyScore>best.policyScore+1e-14)best=o;
 return best;
}
function selectConfidence(observed){
 let best=observed[0];
 for(const o of observed)if(o.confidence>best.confidence+1e-14)best=o;
 return best;
}
const measure=records=>{
 const C={P:{P:0,N:0},N:{P:0,N:0}};
 for(const row of records)C[row.label][row.prediction]++;
 const n=records.length,tp=C.P.P,tn=C.N.N;
 const perClass=LABELS.map(l=>{
  const o=l==="P"?"N":"P",x=C[l][l],fn=C[l][o],fp=C[o][l];
  return {label:l,support:x+fn,precision:x/(x+fp||1),recall:x/(x+fn||1),
   f1:2*x/(2*x+fn+fp||1)};
 });
 return{n,correct:tp+tn,accuracy:(tp+tn)/n,
  macroF1:perClass.reduce((s,x)=>s+x.f1,0)/2,
  balancedAccuracy:perClass.reduce((s,x)=>s+x.recall,0)/2,
  perClass,confusion:C};
};
const [dir,mode,...args]=process.argv.slice(2);
if(!dir||!Object.hasOwn(CONFIGS,mode))fail("Usage: node run-bandit-credit.mjs REAL_HS3D_TRAIN_FOLDER R2R3-bandit-topology|R2R3-allviews-topology");
if(args.length)fail("No test phase supported: this is a development-only policy experiment");
const data=sourceRows(dir),cfg=CONFIGS[mode];
if(data.train.length!==1200||data.calibration.length!==1000||data.dev.length!==400)
 fail("Original train/calibration/development split count invalid");
if([...data.train,...data.calibration,...data.dev].some(r=>r.dna.slice(70,72)!=="GT"))
 fail("This HS3D study requires all real donor examples share central GT");
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:cfg.off},
 c:{cap:5},seed:20261119});
brain.liveWorld="text";
brain.body.genomeView={world:"real-HS3D-140nt",positions:POS.slice(),
 learner:"same original Brain.constructedPaths.pathPolicy",viewsActed:0,calibrationRewarded:0};
for(let i=0;i<data.train.length;i++){
 const r=data.train[i];
 for(let offset=0;offset<POS.length;offset++){
  const index=(offset+i)%POS.length,w=view(r,index);
  // The original Brain alone lives the real observed 5-symbol viewport
  // then the train label; no alternative learned classifier or donor.
  for(const y of [...w.bytes,r.label.charCodeAt(0),10])brain.live(y,false);
  brain.body.genomeView.viewsActed++;
 }
}
const livedAfterTrain=brain.lived,calibrationLivedBefore=brain.align?.lived;
const policyBefore=brain.constructedPaths.pathPolicy.slice();
let trainedFeedback=0,calibrationPriorCorrect=0;
for(const r of data.calibration){
 const exposed=inspect(brain,r);
 const originalSelection=selectNative(brain,exposed);
 calibrationPriorCorrect+=Number(originalSelection.prediction===r.label);
 // Original native action chosen BEFORE the target is revealed.
 const explore=parseInt(hash("bandit-exploration:"+r.dna).slice(0,8),16)%5===0;
 const exploratory=exposed[parseInt(hash("bandit-action:"+r.dna).slice(0,8),16)%POS.length];
 const executed=explore?exploratory:originalSelection;
 const rewards=cfg.feedback==="bandit"?[executed]:exposed;
 // Bandit rewards only the executed action; full mode rewards all observed.
 for(const w of rewards){
  const succeeded=w.prediction===r.label;
  brain.constructedPaths.learnTransferable(w.features,succeeded,0.02);
  brain.body.genomeView.calibrationRewarded++;
  trainedFeedback++;
 }
}
const policyAfter=brain.constructedPaths.pathPolicy.slice();
if(brain.lived!==livedAfterTrain||brain.align?.lived!==calibrationLivedBefore)
 fail("Calibration illegally changed original Brain supervision");
const all={native:[],fixed72:[],fixed70:[],fixed66:[],confidence:[],deterministicRandom:[]};
const selectedPositions={},originalPredictions=[];
for(const row of data.dev){
 const observed=inspect(brain,row);
 const selected=selectNative(brain,observed);
 const fixed=idx=>observed[POS.indexOf(idx)];
 const random=observed[parseInt(hash("world-random-window:"+row.dna).slice(0,8),16)%POS.length];
 for(const [k,v] of Object.entries({
  native:selected,fixed72:fixed(72),fixed70:fixed(70),fixed66:fixed(66),
  confidence:selectConfidence(observed),deterministicRandom:random
 }))all[k].push({label:row.label,prediction:v.prediction});
 selectedPositions[selected.start]=(selectedPositions[selected.start]||0)+1;
 if(originalPredictions.length<100)originalPredictions.push({
  name:row.name,truth:row.label,chosenView:selected.start,
  prediction:selected.prediction,policyScore:selected.policyScore,
  confidence:selected.confidence,
  otherWindowPredictions:observed.map(w=>[w.start,w.prediction])
 });
}
if(brain.lived!==livedAfterTrain||brain.align?.lived!==calibrationLivedBefore)
 fail("Development leaked labels to original Brain");
if(brain.constructedPaths.pathPolicyUpdates!==trainedFeedback)
 fail("Unexpected original native pathPolicy update count");
const result={
 status:"ACTUAL_ORIGINAL_BRAIN_NATIVE_BANDIT_CREDIT_HS3D",
 method:"Original V42 Brain C5 and native ConstructedPathLearner; bandit versus full-information action credit",
 mode,phase:"NEW_TRAIN_ONLY_DEV_EXPLORATORY",noOfficialTestViewed:true,calibrationFeedback:cfg.feedback,
 source:"OluwadareLab EnsembleSplice HS3D balanced human donor 140nt",
 pinnedCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
 sourceChecksums:data.datasetHashes,sourceCounts:data.counts,rejectedSourceRows:data.rejected,duplicates:data.duplicates,
 training:{rows:data.train.length,livedSymbols:livedAfterTrain,viewActions:brain.body.genomeView.viewsActed},
 calibration:{rows:data.calibration.length,nativeFeedback:trainedFeedback,
  nativePathPolicyBefore:policyBefore,nativePathPolicyAfter:policyAfter,
  initialNativeCorrect:calibrationPriorCorrect},
 development:{rows:data.dev.length,selectedPositions,
  metrics:Object.fromEntries(Object.entries(all).map(([k,v])=>[k,measure(v)]))},
 originalBrainPredictsAllClasses:true,
 policyIsOriginalBrainConstructedPaths:true,
 nativeActionSpaceManuallyEnumerated:true,
 allViewpointsScannedBeforeSelection:true,
 autonomousDiscoveryOfArbitraryViews:false,
 officialAlphaGenome2Comparison:false,
 selectedExamples:originalPredictions
};
if(process.env.HS3D_NATIVE_ACTIONS_RESULT_FILE)
 fs.writeFileSync(process.env.HS3D_NATIVE_ACTIONS_RESULT_FILE,JSON.stringify(result,null,2)+"\n");
console.log("HS3D_NATIVE_ACTIONS_RESULT "+JSON.stringify({...result,selectedExamples:undefined}));
