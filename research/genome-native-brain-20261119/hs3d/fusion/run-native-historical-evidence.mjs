// True original Brain multi-view history fusion; original C6 and hist32.\n// V5-inspired TWO-STEP primitive composition using only original V42 Brain.
// Original Brain.live owns all learning; original Brain.predict selects EACH
// physical action, sees its true consequences, and emits final class.
// No Python Organism5, no external learner, no PWM in acting entity.
// The human has authored primitive semantics; they are not discovered.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const SOURCE_COMMIT="e04aa5aeb4035adac9ce6c65c2143c2ef7163332";
const MODES=["history-noextra","history-true","history-broken"];
const POSITIONS=[58,62,64,66,70,74,78];
const PRIMITIVES=["again","undo","open","right","new","left"];
const ACTION_SYMBOLS=["a","b","c","d","e","f"];
const LABELS=["P","N"];
const START=70;
const sha=s=>crypto.createHash("sha256").update(s).digest("hex");
const bytes=s=>Array.from(s,ch=>ch.charCodeAt(0));
const hashNumber=s=>Number.parseInt(sha(s).slice(0,8),16);
const fail=s=>{throw new Error(s)};
const acc=(xs)=>xs.reduce((sum,x)=>sum+x,0);

function parseFasta(filename,label){
  const raw=fs.readFileSync(filename);
  const lines=raw.toString("utf8").split(/\r?\n/);
  const rows=[];let header=null,sourceCount=0;
  const rejected={nonCanonical:0,wrongLength:0};
  for(const line0 of lines){
    const line=line0.trim();
    if(!line)continue;
    if(line.startsWith(">")){
      if(header!==null)fail("Invalid FASTA header/sequence parity");
      header=line.slice(1).trim();continue;
    }
    if(header===null)fail("FASTA without actual identifier: "+filename);
    sourceCount++;
    const dna=line.toUpperCase();
    if(dna.length!==140)rejected.wrongLength++;
    else if(!/^[ACGT]{140}$/.test(dna))rejected.nonCanonical++;
    else rows.push({label,dna,sourceHeader:header});
    header=null;
  }
  if(header!==null)fail("Incomplete final FASTA");
  if(rows.length<1300)fail("Not enough authentic 140nt acceptor data "+rows.length);
  return{rows,sha256:sha(raw),sourceCount,rejected};
}
function getData(dir){
  const sources={
    P:parseFasta(path.join(dir,"Train/Acceptor_Train_Positive.txt"),"P"),
    N:parseFasta(path.join(dir,"Train/Acceptor_Train_Negative.txt"),"N")
  };
  const firstSeen=new Map(),ambiguous=new Set();
  for(const label of LABELS)for(const r of sources[label].rows){
    const old=firstSeen.get(r.dna);
    if(old&&old!==label)ambiguous.add(r.dna);
    firstSeen.set(r.dna,label);
  }
  const pool={};let excluded=0;
  for(const label of LABELS){
    pool[label]=[];const seen=new Set();
    for(const r of sources[label].rows){
      if(ambiguous.has(r.dna)||seen.has(r.dna)){excluded++;continue}
      seen.add(r.dna);pool[label].push(r);
    }
    pool[label].sort((a,b)=>sha("hs3d-acceptor-transfer-v1:"+a.dna).localeCompare(sha("hs3d-acceptor-transfer-v1:"+b.dna)));
    if(pool[label].length<1300)fail("Not 1300 distinct actual "+label+" sequences");
  }
  const interleave=(lo,len)=>{
    const out=[];
    for(let i=lo;i<lo+len;i++)for(const label of LABELS)out.push(pool[label][i]);
    return out;
  };
  const train=interleave(0,600),calibrate=interleave(600,500),development=interleave(1100,200);
  const seenSets=[train,calibrate,development].map(rows=>new Set(rows.map(r=>r.dna)));
  for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)
    for(const dna of seenSets[i])if(seenSets[j].has(dna))fail("DNA leaked between partitions");
  for(const r of [...train,...calibrate,...development])
    if(r.dna.slice(68,70)!=="AG")fail("Conserved human acceptor AG not present");
  return{
    train,calibrate,development,
    sourceChecksums:{P:sources.P.sha256,N:sources.N.sha256},
    sourceCounts:Object.fromEntries(LABELS.map(k=>[k,sources[k].sourceCount])),
    availableUnique:Object.fromEntries(LABELS.map(k=>[k,pool[k].length])),
    excludedDuplicatesAndContradictions:excluded,
    distinctContradictoryDNAs:ambiguous.size,
    rejected:Object.fromEntries(LABELS.map(k=>[k,sources[k].rejected]))
  };
}
function realView(row,position){
  if(!POSITIONS.includes(position))fail("Illegal physical position");
  const dna=row.dna.slice(position,position+4);
  if(dna.length!==4||!/^[ACGT]{4}$/.test(dna))fail("Missing real four DNA bases");
  const posToken=String.fromCharCode(97+POSITIONS.indexOf(position));
  return{position,actualBases:dna,posToken,
    asNativeBytes:bytes(posToken+dna)};
}
function originalNativeClass(brain,view){
  const d=brain.predict(view.asNativeBytes);
  if(!Array.isArray(d)||d.length<81||!Number.isFinite(d[80])||!Number.isFinite(d[78]))
    fail("Real original Brain returned invalid P/N");
  const p=Math.max(0,d[80]),n=Math.max(0,d[78]),t=p+n;
  return{prediction:p>=n?"P":"N",q:t?p/t:.5,margin:t?Math.abs(p-n)/t:0};
}
function resolveAction(name,body){
  // Only known physical coordinates and actually VISITED view margins.
  // No unrevealed base, label, oracle or future reward is consulted.
  const {current,previous,visited}=body;
  const ascending=POSITIONS;
  const idx=ascending.indexOf(current);
  if(idx<0)fail("Body location not in real legal genomic sites");
  if(name==="again")return current;
  if(name==="undo")return previous;
  if(name==="open"){
    const sorted=[...visited].sort((a,b)=>a.margin-b.margin||a.when-b.when);
    return sorted[0].position;
  }
  if(name==="right")return ascending[Math.min(idx+1,ascending.length-1)];
  if(name==="left")return ascending[Math.max(idx-1,0)];
  if(name==="new"){
    const visitedPositions=new Set(visited.map(v=>v.position));
    const candidates=ascending.filter(p=>!visitedPositions.has(p))
      .sort((a,b)=>Math.abs(a-current)-Math.abs(b-current)||a-b);
    return candidates[0]??current;
  }
  fail("Unknown native primitive action "+name);
}
function nativeActionOffer(brain,currentView,prevPrimitive,index){
  const candidate=ACTION_SYMBOLS[index];
  const prefix=bytes(currentView.actualBases+prevPrimitive+candidate);
  if(prefix.length!==6)fail("Original native C6 action state must have 4 real bases + 2 actions");
  const dist=brain.predict(prefix);
  if(!Array.isArray(dist)||dist.length<46||!Number.isFinite(dist[43])||!Number.isFinite(dist[45]))
    fail("Original native Brain failed reward prediction");
  const plus=Math.max(0,dist[43]),minus=Math.max(0,dist[45]);
  const probability=(plus+1e-12)/(plus+minus+2e-12);
  return{primitive:PRIMITIVES[index],symbol:candidate,probabilityPositive:probability};
}
function pickOriginalNativeAction(brain,currentView,prevPrimitive,forcedIndex){
  const offers=PRIMITIVES.map((_,i)=>nativeActionOffer(brain,currentView,prevPrimitive,i));
  let best=offers[0];
  for(const o of offers)if(o.probabilityPositive>best.probabilityPositive+1e-14)best=o;
  return{chosen:forcedIndex===null?best:offers[forcedIndex],offers,
    preferredBeforeExploration:best};
}
function livedTrajectory(brain,decisionState,reward){
  const {view,previousAction,chosenSymbol}=decisionState;
  const sequence=bytes(view.actualBases+previousAction+chosenSymbol+reward+"\n");
  if(sequence.length!==8)fail("Invalid original-native real trajectory byte count");
  for(const token of sequence)brain.live(token,false);
  return sequence.length;
}
function episode(brain,row,episodeIndex,calibrate){
  // The body is the SAME original Brain's physically lived world. Candidate
  // genome windows remain inaccessible until their actual action executes.
  let currentView=realView(row,START),answer=originalNativeClass(brain,currentView);
  const body={
    current:START,previous:START,
    visited:[{position:START,margin:answer.margin,when:0}]
  };
  const primitiveTrail=[],physicalTrail=[START],transitionStates=[],offersTrace=[];
  let previousAction="0";
  for(let step=0;step<2;step++){
    let forcedIndex=null;
    if(calibrate){
      const explore=hashNumber("primitive-explore:"+episodeIndex+":"+step)%4===0;
      if(explore)forcedIndex=hashNumber("primitive-random:"+episodeIndex+":"+step)%PRIMITIVES.length;
    }
    const proposals=pickOriginalNativeAction(brain,currentView,previousAction,forcedIndex);
    const chosen=proposals.chosen;
    const from=currentView;
    const state={view:from,previousAction,chosenSymbol:chosen.symbol};
    const nextPosition=resolveAction(chosen.primitive,body);
    // ONLY HERE, AFTER choosing and committing to the physical primitive,
    // can the body receive four real bases at its destination.
    const revealed=realView(row,nextPosition);
    const nextAnswer=originalNativeClass(brain,revealed);
    transitionStates.push(state);
    primitiveTrail.push(chosen.primitive);physicalTrail.push(nextPosition);
    offersTrace.push(proposals.offers.map(x=>[x.primitive,x.probabilityPositive]));
    body.previous=body.current;body.current=nextPosition;
    body.visited.push({position:nextPosition,margin:nextAnswer.margin,when:step+1});
    currentView=revealed;answer=nextAnswer;previousAction=chosen.symbol;
  }
  const correct=answer.prediction===row.label;
  return{answer,correct,primitiveTrail,physicalTrail,transitionStates,
    offersTrace,finalPosition:body.current,lastRealBases:currentView.actualBases};
}
function metric(rows){
  const c={P:{P:0,N:0},N:{P:0,N:0}};
  for(const row of rows){
    if(!LABELS.includes(row.truth)||!LABELS.includes(row.prediction))fail("Invalid scored class");
    c[row.truth][row.prediction]++;
  }
  const perClass=LABELS.map(label=>{
    const other=label==="P"?"N":"P",tp=c[label][label],
      fp=c[other][label],fn=c[label][other],support=tp+fn;
    return{label,support,precision:tp/(tp+fp||1),recall:tp/(support||1),
      f1:2*tp/(2*tp+fp+fn||1)};
  });
  const correct=c.P.P+c.N.N, n=rows.length;
  return{n,correct,accuracy:correct/n,
    macroF1:acc(perClass.map(x=>x.f1))/2,
    balancedAccuracy:acc(perClass.map(x=>x.recall))/2,
    perClass,confusion:c};
}
const [dir,mode,...other]=process.argv.slice(2);
if(!dir||!MODES.includes(mode)||other.length)fail("Usage: run-native-historical-evidence.mjs HS3D_TRAIN_PATH history-noextra|history-true|history-broken");
const data=getData(dir);
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]},
  c:{cap:6},seed:20261120});
brain.liveWorld="text";
if(brain.CTX!==6)fail("Original native LeanC cap6 not available");
brain.body.genomePrimitiveComposition={
  trueBody:true,primitiveNames:PRIMITIVES.slice(),position:START,
  realWorld:"HS3D human AG splice acceptor",actionsExecuted:0,
  originalBrainLearnsActionFeedback:true
};
const trainingViews=[70,58,62,64,66,74,78];
for(let i=0;i<data.train.length;i++)for(let k=0;k<trainingViews.length;k++){
  const physicalPosition=trainingViews[(i+k)%trainingViews.length];
  const window=realView(data.train[i],physicalPosition);
  const sequence=[...window.asNativeBytes,data.train[i].label.charCodeAt(0),10];
  if(sequence.length!==7)fail("Original supervised lived record not seven tokens");
  for(const token of sequence)brain.live(token,false);
}
const initialSupervisedLived=brain.lived;
if(initialSupervisedLived!==data.train.length*trainingViews.length*7)
  fail("Original Brain supervision didn't consume all real genomic views");
const calibrationStats={episodes:1000,
  trueSuccess:0,trueFailure:0,trueRewardSymbolsLived:0,
  falseRewardSymbolsLived:0,firstActionRewardPassages:0,
  lastActionRewardPassages:0,primitivePairs:{},initialActions:{},finalDestinations:{}};
const calibrationResults=[];
for(let i=0;i<calibrationStats.episodes;i++){
  const row=data.calibrate[i];
  const one=episode(brain,row,i,true);
  const actualReward=one.correct?"+":"-";
  const livedReward=actualReward;
  const trueCategory=one.correct?"trueSuccess":"trueFailure";
  calibrationStats[trueCategory]++;
  calibrationStats[livedReward==="+"?"trueRewardSymbolsLived":"falseRewardSymbolsLived"]++;
  const lastState=one.transitionStates[1];
  if(!lastState||one.transitionStates.length!==2)fail("Two real primitive moves absent");
  if(true){
    // After the final outcome, the original Brain re-lives the real
    // first -> second physical action sequence in the same temporal order.
    livedTrajectory(brain,one.transitionStates[0],livedReward);
    calibrationStats.firstActionRewardPassages++;
  }
  livedTrajectory(brain,lastState,livedReward);
  calibrationStats.lastActionRewardPassages++;
  if(false){
    // Exposure-count control: no false first-action teacher, just repeat
    // the actual terminal experience at the exact matched lived length.
    livedTrajectory(brain,lastState,livedReward);
    calibrationStats.lastActionRewardPassages++;
  }
  const pair=one.primitiveTrail.join(" > ");
  calibrationStats.primitivePairs[pair]=(calibrationStats.primitivePairs[pair]||0)+1;
  calibrationStats.initialActions[one.primitiveTrail[0]]=(calibrationStats.initialActions[one.primitiveTrail[0]]||0)+1;
  calibrationStats.finalDestinations[one.finalPosition]=(calibrationStats.finalDestinations[one.finalPosition]||0)+1;
  brain.body.genomePrimitiveComposition.position=one.finalPosition;
  brain.body.genomePrimitiveComposition.actionsExecuted+=2;
  if(calibrationResults.length<20)calibrationResults.push({id:i,actualReward,
    livedReward,primitives:one.primitiveTrail,positions:one.physicalTrail});
}
const learnedLived=brain.lived,learnedAlignment=brain.align?.lived??null,
  livedDelta=learnedLived-initialSupervisedLived;
const expectedDelta=(calibrationStats.firstActionRewardPassages+calibrationStats.lastActionRewardPassages)*8;
if(livedDelta!==expectedDelta)fail("Native Brain learning token accounting mismatch "+livedDelta+" vs "+expectedDelta);

function sensoryPath(row,episode,historySource=null){
  const path=episode.physicalTrail,primitives=episode.primitiveTrail;
  if(path.length!==3||primitives.length!==2)fail("Original Brain must have moved exactly twice before path fusion");
  // Actual 17-symbol chronological sensory history remains inside original
  // Brain's 32-token learned-historical context. NO artificial DNA features:
  // position token, four ACTUALLY VISITED real genomic bases, real primitive.
  const first=realView(historySource||row,path[0]).asNativeBytes;
  const second=realView(historySource||row,path[1]).asNativeBytes;
  const final=realView(row,path[2]).asNativeBytes;
  const ac0=ACTION_SYMBOLS[PRIMITIVES.indexOf(primitives[0])];
  const ac1=ACTION_SYMBOLS[PRIMITIVES.indexOf(primitives[1])];
  if(!ac0||!ac1)fail("Missing actual original physical primitive code");
  const out=[...first,ac0.charCodeAt(0),...second,ac1.charCodeAt(0),...final];
  if(out.length!==17)fail("Native real historical sensory trajectory not exactly 17 tokens");
  return out;
}
function predictNativeP(brain,input){
  const d=brain.predict(input);
  if(!Array.isArray(d)||d.length<81||!Number.isFinite(d[80])||!Number.isFinite(d[78]))
    fail("Original Brain failed native history-based P/N prediction");
  return d[80]>=d[78]?"P":"N";
}
const pathLearning={
  mode,additionalExamples:mode==="history-noextra"?0:500,
  consumedOriginalBrainTokens:0,physicalActionsBeforeLabel:0,
  previousGenomeEvidenceIsReal:mode!=="history-broken",
  destroyedTemporalAlignmentControl:mode==="history-broken",
  learnedExamplesPositive:0,learnedExamplesNegative:0
};
for(let i=0;i<pathLearning.additionalExamples;i++){
  const row=data.calibrate[i];
  // First original Brain takes its OWN two real actions in a genuine human
  // DNA world, with no access to unseen target, answer or future window.
  const actual=episode(brain,row,i,false);
  pathLearning.physicalActionsBeforeLabel+=2;
  const alternateHistory=mode==="history-broken"?
    data.calibrate[(i+37)%data.calibrate.length]:null;
  // In the control ONLY, replace the two historical real views with DNA
  // from another actual human record. The actual final view is kept.
  const historical=sensoryPath(row,actual,alternateHistory);
  const lived=[...historical,row.label.charCodeAt(0),10];
  if(lived.length!==19)fail("Native full historical sensory input must be 19 tokens including source class");
  // The same original Brain experiences its actual real path (or explicitly
  // destroyed negative control) THEN the true source class, not before.
  for(const token of lived)brain.live(token,false);
  pathLearning.consumedOriginalBrainTokens+=lived.length;
  pathLearning[row.label==="P"?"learnedExamplesPositive":"learnedExamplesNegative"]++;
}
const frozenAfterPath=brain.lived;
const frozenAfterPathAlign=brain.align?.lived??null;
if(frozenAfterPath-learnedLived!==pathLearning.consumedOriginalBrainTokens)
 fail("Full original Brain lived-history symbol accounting mismatch");
const scored={fullActualHistory:[],onlyFinalView:[],destroyedHistoryEvaluationOnly:[],onlyFirstView:[]};
const physicalPaths={},physicalDestinations={},individualTraces=[];
let changedByHistoricalIntervention=0,changedByFullHistory=0;
for(let i=0;i<data.development.length;i++){
  const row=data.development[i];
  // Physically navigate with the original Brain's same primitive policy:
  // it cannot read unseen genomic nucleotides or actual class.
  const actual=episode(brain,row,i,false);
  const realBytes=sensoryPath(row,actual);
  const fullClass=predictNativeP(brain,realBytes);
  const finalClass=originalNativeClass(brain,realView(row,actual.finalPosition)).prediction;
  const firstClass=originalNativeClass(brain,realView(row,START)).prediction;
  // Read-only negative causality check AFTER native action/prediction:
  // same final DNA and true path actions, but historical DNA of two earlier
  // visits is replaced by a different genuine human DNA row.
  const other=data.development[(i+73)%data.development.length];
  const brokenBytes=sensoryPath(row,actual,other);
  const destroyedClass=predictNativeP(brain,brokenBytes);
  scored.fullActualHistory.push({truth:row.label,prediction:fullClass});
  scored.onlyFinalView.push({truth:row.label,prediction:finalClass});
  scored.destroyedHistoryEvaluationOnly.push({truth:row.label,prediction:destroyedClass});
  scored.onlyFirstView.push({truth:row.label,prediction:firstClass});
  changedByHistoricalIntervention+=Number(fullClass!==destroyedClass);
  changedByFullHistory+=Number(fullClass!==finalClass);
  const pathKey=actual.primitiveTrail.join(">");
  physicalPaths[pathKey]=(physicalPaths[pathKey]||0)+1;
  physicalDestinations[actual.finalPosition]=(physicalDestinations[actual.finalPosition]||0)+1;
  individualTraces.push({
    realDNAsha16:sha("real-native-historical-genome:"+row.dna).slice(0,16),
    truth:row.label,
    physicalPositions:actual.physicalTrail,
    originalNativePrimitives:actual.primitiveTrail,
    fullActualHistoryNativePredicted:fullClass,
    originalTerminalOnlyNativePredicted:finalClass,
    destroyedHistorySameLastViewNativePredicted:destroyedClass,
    originalFirstOnlyPredicted:firstClass,
    trueClassNotSeenByOriginalDuringChoice:true,
    evidenceHistoryBytes:realBytes.length
  });
}
if(brain.lived!==frozenAfterPath||(brain.align?.lived??null)!==frozenAfterPathAlign)
 fail("Original Brain mutated in blind history integration evaluation");
const metrics=Object.fromEntries(Object.entries(scored).map(([key,rows])=>[key,metric(rows)]));
const result={
  status:"ORIGINAL_V42_BRAIN_CAUSAL_MULTI_VIEW_REAL_HISTORY_INFERENCE",
  evidencePhase:"EXPLORATORY_PREVIOUSLY_OPENED_HS3D_TRAIN_DERIVED_DEV400",
  originalNativeMethodsUsed:["Brain.live","Brain.predict","original 32-byte histOf","original 6-byte ctxOf"],
  originalBrainSource:"v17/transcend/torus-aether/devour/brain.mjs",
  sourceCommit:SOURCE_COMMIT,
  mode,sourceChecksums:data.sourceChecksums,sourceCounts:data.sourceCounts,
  training:{
    supervisedOriginalBrainLived:initialSupervisedLived,
    originalTwoStepActionRewardLived:livedDelta,
    physicalActionCalibration:calibrationStats.episodes,
    historyFusion:pathLearning,
    afterOriginalHistoricalTrainingLived:frozenAfterPath
  },
  evaluation:{
    genuineHumanAGExamples:data.development.length,
    metrics,
    physicalPrimitiveCompositions:physicalPaths,
    nativeDestinations:physicalDestinations,
    actualHistoricalInputLength:17,
    percentagePredictionsChangedByEarlierObservedHistory:changedByHistoricalIntervention/data.development.length,
    percentageFullHistoryVsTerminalOnlyChanged:changedByFullHistory/data.development.length,
    sameRealTerminal4ntInHistoryIntervention:true,
    originalBrainFrozenDuringScoring:true
  },
  causalSuccessGates:{
    fullHistoryImprovesMacroF1AtLeast3ppOverSameBrainLast:
      metrics.fullActualHistory.macroF1-metrics.onlyFinalView.macroF1>=.03,
    actuallySensitiveToEarlierObservedDNAAtLeast5pct:
      changedByHistoricalIntervention/data.development.length>=.05,
    sourceHumanDNAReal:true,anotherTrainedClassifierNotUsed:true,
    realQwenGGUFNotUsed:true,alphaGenome2NotCompared:true,
    externalHumanValidationNotReused:true
  }
};
if(process.env.HS3D_HISTORY_RESULT_FILE)fs.writeFileSync(process.env.HS3D_HISTORY_RESULT_FILE,
 JSON.stringify({...result,allOriginalNativeHistoryTraces:individualTraces},null,2)+"\n");
console.log("HS3D_NATIVE_HISTORY_RESULT "+JSON.stringify(result));
