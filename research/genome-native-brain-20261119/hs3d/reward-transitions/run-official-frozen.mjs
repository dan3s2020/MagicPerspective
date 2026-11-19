// OFFICIAL ACCEPTOR TEST: preserved exact reward-1000 native Brain action method.
// Selection was fixed in a committed pretest BEFORE original Test was loaded.
// ORIGINAL MagicPerspective V42 Brain learns actual real-world
// action -> correct/incorrect transitions with Brain.live() itself.
// At inference Brain.predict() forecasts action success before moving;
// same Brain.predict() classifies the physically observed second view.
// Two true 4-base observations per example, no label until after acting.
// No external trained actor, classifier, oracle, synthetic DNA or code edit.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const SOURCE_SHA="e04aa5aeb4035adac9ce6c65c2143c2ef7163332";
const START=70, CANDIDATES=[58,62,64,66,74,78];
const POSITIONS=[START,...CANDIDATES];
const MODES={"reward-zero":0,"reward-200":200,"reward-1000":1000};
const LABELS=["P","N"],hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const bytes=s=>Array.from(s,ch=>ch.charCodeAt(0));
const fail=s=>{throw Error(s)};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

function readFasta(file,label,minRows=1300) {
  const raw=fs.readFileSync(file),lines=raw.toString("utf8").split(/\r?\n/);
  const rows=[],rejected={length:0,bases:0};let seenSource=0;
  let header=null;
  for(const original of lines) {
    const line=original.trim();
    if(!line)continue;
    if(line.startsWith(">")){
      if(header!==null)fail("Incomplete FASTA pair "+file);
      header=line.slice(1).trim();continue;
    }
    if(header===null)fail("FASTA sequence without header "+file);
    seenSource++;const dna=line.toUpperCase();
    if(dna.length!==140)rejected.length++;
    else if(!/^[ACGT]{140}$/.test(dna))rejected.bases++;
    else rows.push({label,dna,id:label+":"+header+":"+seenSource});
    header=null;
  }
  if(header!==null)fail("Last FASTA header lacks sequence");
  if(rows.length<minRows)fail("Source below required minimum "+minRows+": "+file);
  return{rows,sha256:hash(raw),rejected,sourceCount:seenSource};
}
function sourceData(dir){
  const P=readFasta(path.join(dir,"Train/Acceptor_Train_Positive.txt"),"P");
  const N=readFasta(path.join(dir,"Train/Acceptor_Train_Negative.txt"),"N");
  const observed=new Map(),conflicting=new Set();
  for(const row of [...P.rows,...N.rows]){
    const prior=observed.get(row.dna);
    if(prior&&prior!==row.label)conflicting.add(row.dna);
    observed.set(row.dna,row.label);
  }
  const pool={};let duplicates=0;
  for(const [label,source] of [["P",P],["N",N]]){
    pool[label]=[];const seen=new Set();
    for(const row of source.rows){
      if(conflicting.has(row.dna)||seen.has(row.dna)){duplicates++;continue;}
      seen.add(row.dna);
      pool[label].push(row);
    }
    pool[label].sort((a,b)=>hash("hs3d-acceptor-transfer-v1:"+a.dna).localeCompare(hash("hs3d-acceptor-transfer-v1:"+b.dna)));
    if(pool[label].length<1300)fail("Not enough unique real acceptor DNA: "+label);
  }
  const interleave=(start,count)=>{
    const out=[];
    for(let i=start;i<start+count;i++)for(const label of LABELS)out.push(pool[label][i]);
    return out;
  };
  const train=interleave(0,600),calibration=interleave(600,500),dev=interleave(1100,200);
  const dnaBySplit=[train,calibration,dev].map(xs=>new Set(xs.map(r=>r.dna)));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)for(const dna of dnaBySplit[i])
    if(dnaBySplit[j].has(dna))fail("Training/calibration/dev DNA leakage");
  for(const r of [...train,...calibration,...dev])
    if(r.dna.slice(68,70)!=="AG")fail("Biological invariant failed: original human acceptor AG");
  return{train,calibration,dev,checksums:{P:P.sha256,N:N.sha256},duplicates,
    conflictDNA:conflicting.size,counts:{P:pool.P.length,N:pool.N.length},
    rejected:{P:P.rejected,N:N.rejected},sources:{P:P.sourceCount,N:N.sourceCount}};
}
function viewFor(row,position){
  const idx=POSITIONS.indexOf(position);
  if(idx<0)fail("Action is outside predeclared physical viewport world: "+position);
  const dna=row.dna.slice(position,position+4);
  if(dna.length!==4)fail("Viewport is not four actual observed bases");
  return{position,index:idx,observedDNA:dna,bytes:bytes(String.fromCharCode(97+idx)+dna)};
}
function nativePrediction(brain,w){
  const dist=brain.predict(w.bytes);
  if(!Array.isArray(dist)||dist.length<81||!Number.isFinite(dist[80])||!Number.isFinite(dist[78]))
    fail("Original native Brain failed to predict P/N");
  const P=Math.max(0,dist[80]),N=Math.max(0,dist[78]),mass=P+N;
  const q=mass?P/mass:0.5,margin=mass?Math.abs(P-N)/mass:0;
  return{classLabel:P>=N?"P":"N",q,margin,p:P,n:N};
}

function predictedRewardForAction(brain,first,index){
  // ORIGINAL Brain's own next-symbol probabilities for positive/negative
  // outcome of a HYPOTHETICAL action; no unobserved DNA has been accessed.
  const actionSymbol=49+index; // '1'..'6': physically possible body moves
  const hypotheticallyLived=[...first.bytes.slice(1),actionSymbol];
  if(hypotheticallyLived.length!==5)fail("Expected only four seen bases plus one action");
  const d=brain.predict(hypotheticallyLived);
  if(!Array.isArray(d)||d.length<46||!Number.isFinite(d[43])||!Number.isFinite(d[45]))
    fail("Native Brain invalid reward-transition predictions");
  const successMass=Math.max(0,d[43]),failureMass=Math.max(0,d[45]);
  const probability=(successMass+1e-10)/(successMass+failureMass+2e-10);
  return{position:CANDIDATES[index],index,actionSymbol,
    predictedPositiveReward:probability,plus:successMass,minus:failureMass};
}
function chooseActionByOriginalBrain(brain,first,forcedIndex=null){
  const offered=CANDIDATES.map((_,i)=>predictedRewardForAction(brain,first,i));
  let selected=offered[0];
  for(const offer of offered)if(offer.predictedPositiveReward>selected.predictedPositiveReward+1e-14)
    selected=offer;
  return{offers:offered,chosen:forcedIndex===null?selected:offered[forcedIndex],
    nativeUnforced: selected};
}
function randIndex(dna,phase){
  return Number.parseInt(hash(phase+":"+dna).slice(0,8),16)%CANDIDATES.length;
}
function score(rows){
  const C={P:{P:0,N:0},N:{P:0,N:0}};
  for(const row of rows){
    if(!LABELS.includes(row.label)||!LABELS.includes(row.prediction))
      fail("Invalid measured original-native class");
    C[row.label][row.prediction]++;
  }
  const perClass=LABELS.map(l=>{
    const other=l==="P"?"N":"P",tp=C[l][l],fn=C[l][other],fp=C[other][l];
    return{label:l,support:tp+fn,precision:tp/(tp+fp||1),recall:tp/(tp+fn||1),
      f1:2*tp/(2*tp+fp+fn||1)};
  });
  return{n:rows.length,correct:C.P.P+C.N.N,accuracy:(C.P.P+C.N.N)/rows.length,
    macroF1:perClass.reduce((a,x)=>a+x.f1,0)/2,
    balancedAccuracy:perClass.reduce((a,x)=>a+x.recall,0)/2,
    confusion:C,perClass};
}

const [dir,mode,...extra]=process.argv.slice(2);
if(!dir||mode!=="reward-1000"||extra.length||
   process.env.HS3D_ACCEPTOR_OFFICIAL_UNLOCK!=="FROZEN_REWARD_1000")
  fail("Official Test requires PREVIOUSLY FROZEN native reward-1000 protocol and unlock");

function loadFrozenOfficialAcceptor(originalTrain,dir){
  // Called ONLY after frozen reward-1000 pretest and explicit CI unlock.
  const p=readFasta(path.join(dir,"Test/Acceptor_Test_Positive.txt"),"P",1);
  const n=readFasta(path.join(dir,"Test/Acceptor_Test_Negative.txt"),"N",1);
  const prior=new Set([...originalTrain.train,...originalTrain.calibration,...originalTrain.dev].map(r=>r.dna));
  const labels=new Map(),contradictions=new Set();
  const all=[...p.rows,...n.rows];
  for(const row of all){
    if(labels.has(row.dna)&&labels.get(row.dna)!==row.label)contradictions.add(row.dna);
    labels.set(row.dna,row.label);
  }
  const seen=new Set(),retained=[];
  const excluded={crossTrainDNA:0,duplicateTestDNA:0,conflictingTestDNA:0};
  for(const row of all){
    if(prior.has(row.dna)){excluded.crossTrainDNA++;continue;}
    if(contradictions.has(row.dna)){excluded.conflictingTestDNA++;continue;}
    if(seen.has(row.dna)){excluded.duplicateTestDNA++;continue;}
    seen.add(row.dna);
    if(row.dna.slice(68,70)!=="AG")
      fail("Official real acceptor source contains unexpected non-AG central candidate");
    retained.push(row);
  }
  if(retained.length<500)fail("Official Test unexpected real sequence count "+retained.length);
  return{rows:retained,rawRows:all.length,excluded,
    sources:{P:{sha256:p.sha256,source:p.sourceCount,rejected:p.rejected},
      N:{sha256:n.sha256,source:n.sourceCount,rejected:n.rejected}}};
}

const amount=MODES[mode],data=sourceData(dir);
const officialEvaluation=loadFrozenOfficialAcceptor(data,dir);
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},c:{cap:5},seed:20261119});
brain.liveWorld="text";
if(brain.CTX!==5)fail("The original Brain did not build required native C5 sensor");
brain.body.genomeNativeRewardWorld={
  task:"original human HS3D AG acceptor physical action/feedback",
  agent:"same-original-Brain",
  actionSpace:CANDIDATES.slice(),
  observationBudget:2,
  feedbackLearnedOnlyAfterRealAction:true,
  actionExperiences:0
};
for(let i=0;i<data.train.length;i++){
  const row=data.train[i];
  for(let k=0;k<POSITIONS.length;k++){
    const pos=POSITIONS[(i+k)%POSITIONS.length],w=viewFor(row,pos);
    for(const y of [...w.bytes,row.label.charCodeAt(0),10])
      brain.live(y,false);
  }
}
const trainedLived=brain.lived;
if(trainedLived!==data.train.length*POSITIONS.length*7)
  fail("Native supervised training lived an incorrect number of symbols");
const beforeRewardLived=brain.lived,trainingPolicyUpdates=brain.constructedPaths.pathPolicyUpdates;
const calib={rows:amount,positiveRewards:0,negativeRewards:0,exploration:0,
  chosenPositions:{},nativeTransitionSymbols:0};
for(const row of data.calibration.slice(0,amount)){
  const initialPhysicalView=viewFor(row,START); // ONLY these four ACTUAL bases seen
  const explore=(Number.parseInt(hash("native-reward-explore:"+row.dna).slice(0,8),16)%4)===0;
  const forced=explore?randIndex(row.dna,"native-reward-explore-action"):null;
  const decision=chooseActionByOriginalBrain(brain,initialPhysicalView,forced);
  const chosen=decision.chosen;
  // The ACTUAL chosen window is revealed only AFTER the original action.
  const realPhysicalView=viewFor(row,chosen.position);
  const originalClassPrediction=nativePrediction(brain,realPhysicalView);
  const correct=originalClassPrediction.classLabel===row.label;
  // True biological P/N class is used by the environment to compute reward
  // only AFTER choice and genuine original-native class prediction. Brain
  // receives only + or - feedback, NOT a teacher/oracle correct action.
  const rewardCode=correct?43:45;
  const actualExperience=[...initialPhysicalView.bytes.slice(1),chosen.actionSymbol,rewardCode,10];
  if(actualExperience.length!==7)fail("Native action trajectory should be exactly 7 real symbols");
  for(const y of actualExperience)brain.live(y,false);
  calib.nativeTransitionSymbols+=7;
  calib.positiveRewards+=Number(correct);calib.negativeRewards+=Number(!correct);
  calib.exploration+=Number(explore);
  calib.chosenPositions[chosen.position]=(calib.chosenPositions[chosen.position]||0)+1;
  brain.body.genomeNativeRewardWorld.actionExperiences++;
}
const afterRewardLived=brain.lived,alignFrozen=brain.align?.lived??null;
if(afterRewardLived!==trainedLived+amount*7)
  fail("Original Brain failed to learn actual action->reward transitions");
if(brain.constructedPaths.pathPolicyUpdates!==trainingPolicyUpdates)
  fail("This reward study must not use original ConstructedPathLearner as a replacement predictor");
const originalDev={native:[],fixedInitial70:[],fixed64:[],fixed66:[],randomSecond:[]};
const positions={},traces=[];
for(const row of officialEvaluation.rows){
  const initialPhysical=viewFor(row,START),firstAnswer=nativePrediction(brain,initialPhysical);
  const decision=chooseActionByOriginalBrain(brain,initialPhysical);
  // NO CANDIDATE GENOMIC DNA was consulted to choose the movement.
  const w=viewFor(row,decision.chosen.position),answer=nativePrediction(brain,w);
  positions[decision.chosen.position]=(positions[decision.chosen.position]||0)+1;
  originalDev.native.push({label:row.label,prediction:answer.classLabel});
  originalDev.fixedInitial70.push({label:row.label,prediction:firstAnswer.classLabel});
  // Read-only counterfactual comparators, not used by native actor.
  originalDev.fixed64.push({label:row.label,prediction:nativePrediction(brain,viewFor(row,64)).classLabel});
  originalDev.fixed66.push({label:row.label,prediction:nativePrediction(brain,viewFor(row,66)).classLabel});
  const random=CANDIDATES[randIndex(row.dna,"reward-random-control")];
  originalDev.randomSecond.push({label:row.label,prediction:nativePrediction(brain,viewFor(row,random)).classLabel});
  traces.push({
    id:row.id,trueLabel:row.label,initialObservedBases:initialPhysical.observedDNA,
    initialNativeClass:firstAnswer.classLabel,physicalMoveTo:decision.chosen.position,
    observedMovedBases:w.observedDNA,nativeClass:answer.classLabel,
    expectedOutcomeProbability:decision.chosen.predictedPositiveReward,
    offeredActionRewardExpectations:decision.offers.map(v=>[v.position,v.predictedPositiveReward]),
    targetHiddenDuringActionAndPrediction:true
  });
}
if(brain.lived!==afterRewardLived||(brain.align?.lived??null)!==alignFrozen)
  fail("Frozen OFFICIAL test prediction mutated original Brain learning state");
const measured=Object.fromEntries(Object.entries(originalDev).map(([k,v])=>[k,score(v)]));
const result={
  status:"ACTUAL_FROZEN_ORIGINAL_BRAIN_NATIVE_REWARD_OFFICIAL_ACCEPTOR_TEST",
  task:"Genuine human HS3D AG acceptor true/false site discrimination",
  source:"OluwadareLab EnsembleSplice original TRAIN + previously unopened OFFICIAL ACCEPTOR TEST",
  sourceCommit:SOURCE_SHA,phase:"FROZEN_ONE_SHOT_OFFICIAL_ACCEPTOR_TEST",
  mode,originalBrainUnchanged:true,
  originalNativeMechanisms:["Brain.live","Brain.predict","LeanC","EmergentChain","native 5-symbol sensory window"],
  originalPathPolicyNotUsedForAction:true,
  sourceChecksums:data.checksums,sourceCounts:data.sources,availableUnique:data.counts,
  rejected:{duplicates:data.duplicates,contradictions:data.conflictDNA,invalid:data.rejected},
  training:{rows:data.train.length,actualPhysicalViewportsPerTrainingRow:POSITIONS.length,
    livedSymbols:trainedLived},
  calibration:{...calib,livedBefore:beforeRewardLived,livedAfter:afterRewardLived,
    updatesOriginalBrain:amount*7},
  evaluation:{
    nativePhysicalObservationsPerExample:2,
    nativeActionsPerExample:1,
    possibleUnobservedDestinations:CANDIDATES,
    selectedHistogram:positions,
    examples:officialEvaluation.rows.length,
    results:measured,
    truthHiddenAtPrediction:true,
    unobservedWindowNeverReadForNativeActionChoice:true,
    fixedCounterfactualControlsAreNotNativeActionObservations:true
  },
  frozenPriorToOfficialTestCommit:"579d1121221b957a75b12d80f437f7cc3f26eae3",
  officialTestData:{
    P:officialEvaluation.sources.P,
    N:officialEvaluation.sources.N,
    rawRows:officialEvaluation.rawRows,
    retainedRows:officialEvaluation.rows.length,
    excluded:officialEvaluation.excluded,
    observedMotifAllAG:true
  },
  methodNoveltyVsLiterature:"UNVERIFIED",
  abilityToDiscoverArbitraryGenomeCoordinates:false,
  alphaGenome2Compared:false
};
if(process.env.HS3D_NATIVE_REWARD_FILE)
  fs.writeFileSync(process.env.HS3D_NATIVE_REWARD_FILE,
    JSON.stringify({...result,perExampleOriginalNativeTraces:traces},null,2)+"\n");
console.log("HS3D_OFFICIAL_NATIVE_REWARD_RESULT "+JSON.stringify(result));
