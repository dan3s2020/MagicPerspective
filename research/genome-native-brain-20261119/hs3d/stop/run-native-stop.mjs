// NEW original-Brain-native STOP vs OBSERVE, after EXACT previous delayed
// two-step primitive learning. Genuine biological DNA; same original Brain.
// V5-inspired TWO-STEP primitive composition using only original V42 Brain.
// Original Brain.live owns all learning; original Brain.predict selects EACH
// physical action, sees its true consequences, and emits final class.
// No Python Organism5, no external learner, no PWM in acting entity.
// The human has authored primitive semantics; they are not discovered.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const SOURCE_COMMIT="e04aa5aeb4035adac9ce6c65c2143c2ef7163332";
const MODES=["stop-no-train","stop-real-cost","stop-real-free","stop-shuffled"];
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
if(!dir||!MODES.includes(mode)||other.length)fail("Usage: run-native-stop.mjs HS3D_TRAIN_PATH stop-no-train|stop-real-cost|stop-real-free|stop-shuffled");
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

const GATE_ACTIONS=["g","s"]; // GO, STOP. Invariant tie: GO.
function gateContext(brain,view,stage){
  const classBelief=originalNativeClass(brain,view);
  const bucket=Math.min(3,Math.floor(4*classBelief.q));
  return{context:String.fromCharCode(48+4*stage+bucket),
    bucket,nativeClass:classBelief};
}
function offerNativeGate(brain,view,stage){
  const state=gateContext(brain,view,stage);
  const offers=GATE_ACTIONS.map(action=>{
    const input=bytes(view.actualBases+state.context+action);
    if(input.length!==6)fail("Original Brain C6 native stop/observe context must contain exactly six real tokens");
    const d=brain.predict(input);
    if(!Array.isArray(d)||d.length<46||!Number.isFinite(d[43])||!Number.isFinite(d[45]))
      fail("Original Brain failed the counterfactual stop reward prediction");
    const plus=Math.max(0,d[43]),minus=Math.max(0,d[45]);
    return{action,score:(plus+1e-12)/(plus+minus+2e-12)};
  });
  let preferred=offers[0]; // predeclared tie means GO
  if(offers[1].score>preferred.score+1e-14)preferred=offers[1];
  return{offers,preferred,state};
}
function gateTrajectory(brain,choice,reward){
  const seq=bytes(choice.view.actualBases+choice.context+choice.action+reward+"\n");
  if(seq.length!==8)fail("Wrong true original Brain gate trajectory length");
  for(const code of seq)brain.live(code,false);
}
function nativeStopEpisode(brain,row,index,{policy,exploration=false}){
  let current=realView(row,START),initialAnswer=originalNativeClass(brain,current);
  let answer=initialAnswer,previousPrimitive="0";
  const body={current:START,previous:START,
    visited:[{position:START,margin:answer.margin,when:0}]};
  const gateExperiences=[],stops=[],moveNames=[],moves=[START],observations=[current.actualBases];
  const gateBeliefs=[];
  for(let stage=0;stage<2;stage++){
    const offer=offerNativeGate(brain,current,stage);
    let action=offer.preferred.action;
    if(policy==="full")action="g";
    if(policy==="one")action="s";
    if(policy==="confidence")action=offer.state.nativeClass.margin>=0.8?"s":"g";
    if(policy==="random")action=hashNumber("stop-frozen-random:"+index+":"+stage)%2===0?"s":"g";
    if(policy==="native"&&exploration&&hashNumber("stop-gate-explore:"+index+":"+stage)%4===0)
      action=hashNumber("stop-gate-forced:"+index+":"+stage)%2===0?"s":"g";
    gateExperiences.push({view:current,context:offer.state.context,
      action,stage,bucket:offer.state.bucket});
    gateBeliefs.push({stage,actualObservedBases:current.actualBases,
      classP:offer.state.nativeClass.q,margin:offer.state.nativeClass.margin,
      gateProbabilityGo:offer.offers[0].score,gateProbabilityStop:offer.offers[1].score,
      chosenAction:action});
    stops.push(action);
    if(action==="s")break;
    const proposed=pickOriginalNativeAction(brain,current,previousPrimitive,null);
    const selected=proposed.chosen;
    const next=resolveAction(selected.primitive,body);
    // Native actor chooses a real physical primitive BEFORE reading destination bases.
    const received=realView(row,next);
    const newPrediction=originalNativeClass(brain,received);
    moveNames.push(selected.primitive);
    moves.push(next);observations.push(received.actualBases);
    body.previous=body.current;body.current=next;
    body.visited.push({position:next,margin:newPrediction.margin,when:stage+1});
    previousPrimitive=selected.symbol;
    current=received;answer=newPrediction;
  }
  return{
    trueLabel:row.label,prediction:answer.prediction,correct:answer.prediction===row.label,
    views:observations.length,extraObservations:observations.length-1,positions:moves,
    primitiveSequence:moveNames,gateSequence:stops,gateBeliefs,
    gateExperiences,finalPosition:moves.at(-1),initialCorrect:initialAnswer.prediction===row.label
  };
}
function hist(rows,where){
  const h={};for(const row of rows){const key=String(where(row));h[key]=(h[key]||0)+1}return h;
}
function summary(rows){
  return{
    score:metric(rows.map(r=>({truth:r.trueLabel,prediction:r.prediction}))),
    meanViews:acc(rows.map(r=>r.views))/rows.length,
    viewCounts:hist(rows,r=>r.views),
    stopActions:hist(rows,r=>r.gateSequence.join(">")),
    finalPositions:hist(rows,r=>r.finalPosition),
    primitiveSequences:hist(rows,r=>r.primitiveSequence.join(">")||"none"),
    stage0Gates:hist(rows,r=>r.gateSequence[0]),
    stage1Gates:hist(rows,r=>r.gateSequence[1]??"not-reached"),
    totalViewObservations:acc(rows.map(r=>r.views)),
    nontrivialConditionalActions:new Set(rows.map(r=>r.gateSequence.join(">"))).size
  };
}
const freezeBeforeGate=brain.lived;
const gateCalib={
  episodes:mode==="stop-no-train"?0:1000,
  rewardPlus:0,rewardMinus:0,correctFinal:0,
  stopAt0:0,stopAt1:0,fullBudget:0,
  livedSymbols:0,chosenGateSequences:{},trueHumanDNAObserved:0
};
for(let i=0;i<gateCalib.episodes;i++){
  const row=data.calibrate[i];
  const one=nativeStopEpisode(brain,row,i,{policy:"native",exploration:true});
  const gateN=one.gateExperiences.length;
  if(gateN<1||gateN>2)fail("Invalid native stop episode");
  const rawCorrect=one.correct;
  // Cost of an additional actually observed physical 4nt viewport:
  // precommitted 5% success penalty PER extra view, simulated as a
  // SHA-deterministic Bernoulli. No biological label enters native state.
  const viewsCost=mode==="stop-real-cost"||mode==="stop-shuffled";
  const costPenalty=viewsCost&&(hashNumber("stop-cost:"+row.dna+":"+i)%100)<5*one.extraObservations;
  const reward=mode==="stop-shuffled"?
      (hashNumber("stop-causality-destroyed:"+i)%2===0?"+":"-"):
      (rawCorrect&&!costPenalty?"+":"-");
  // Original native Brain lives only the actual chosen gate actions and
  // realized delayed outcome, AFTER both the action and classification.
  for(const state of one.gateExperiences){
    gateTrajectory(brain,state,reward);gateCalib.livedSymbols+=8;
  }
  gateCalib.rewardPlus+=Number(reward==="+");
  gateCalib.rewardMinus+=Number(reward==="-");
  gateCalib.correctFinal+=Number(rawCorrect);
  gateCalib.trueHumanDNAObserved+=one.views;
  if(one.views===1)gateCalib.stopAt0++;
  else if(one.views===2)gateCalib.stopAt1++;
  else gateCalib.fullBudget++;
  const seq=one.gateSequence.join(">");
  gateCalib.chosenGateSequences[seq]=(gateCalib.chosenGateSequences[seq]||0)+1;
}
const frozenLived=brain.lived,frozenAlign=brain.align?.lived??null;
if(frozenLived-freezeBeforeGate!==gateCalib.livedSymbols)
  fail("Original Brain stop-feedback learning is not fully accounted");
const evalCases={native:[],sameBrainFull:[],oneView:[],threshold80:[],randomStop:[]};
const traces=[];
for(let i=0;i<data.development.length;i++){
  const row=data.development[i];
  const native=nativeStopEpisode(brain,row,i,{policy:"native"});
  const forced=nativeStopEpisode(brain,row,i,{policy:"full"});
  const onlyOne=nativeStopEpisode(brain,row,i,{policy:"one"});
  const threshold=nativeStopEpisode(brain,row,i,{policy:"confidence"});
  const random=nativeStopEpisode(brain,row,i,{policy:"random"});
  evalCases.native.push(native);
  evalCases.sameBrainFull.push(forced);
  evalCases.oneView.push(onlyOne);
  evalCases.threshold80.push(threshold);
  evalCases.randomStop.push(random);
  traces.push({
    DNAsha16:sha("native-stop-trace:"+row.dna).slice(0,16),
    truth:row.label,
    native:{prediction:native.prediction,views:native.views,positions:native.positions,
      actualPrimitiveSequence:native.primitiveSequence,
      gateSequence:native.gateSequence,gateBeliefs:native.gateBeliefs,correct:native.correct},
    full:{prediction:forced.prediction,views:forced.views,positions:forced.positions,
      correct:forced.correct},
    simpleThreshold:{prediction:threshold.prediction,views:threshold.views,correct:threshold.correct},
    randomStop:{prediction:random.prediction,views:random.views,correct:random.correct}
  });
}
if(brain.lived!==frozenLived||(brain.align?.lived??null)!==frozenAlign)
 fail("Native evaluation unexpectedly learned / altered original Brain state");
const result={
  status:"ACTUAL_ORIGINAL_V42_BRAIN_NATIVE_STOP_OR_OBSERVE",
  source:"Real 140nt human HS3D AG acceptor original TRAIN only",
  sourceCommit:SOURCE_COMMIT,
  studyPhase:"EXPLORATORY_PREVIOUSLY_SEEN_HS3D_TRAIN_DEV400",
  mode,
  originalNativeCode:"v17/transcend/torus-aether/devour/brain.mjs",
  originalBrainSameObjectThroughAllPhases:true,
  originalV5PythonNotUsed:true,
  sourceChecksums:data.sourceChecksums,sourceCounts:data.sourceCounts,
  counts:{train:data.train.length,primitiveCalibration:data.calibrate.length,
    nativeStopCalibration:gateCalib.episodes,evaluation:data.development.length},
  originalLearning:{supervisedSymbols:initialSupervisedLived,
    primitiveNativeRewardSymbols:freezeBeforeGate-initialSupervisedLived,
    stopGateRewardSymbols:gateCalib.livedSymbols,
    totalFrozenLived:frozenLived},
  nativeGate:gateCalib,
  observed:Object.fromEntries(Object.entries(evalCases).map(([k,rows])=>[k,summary(rows)])),
  successChecks:{
    nativeControlsOwnActions:true,hiddenNucleotidesNotReadBeforeMovement:true,
    noTrueClassAtDecision:true,maxPhysicalViews:3,
    originalBrainPredictionUsedForStopAndMoveAndClass:true,
    achievedViewReduction15pct:
      summary(evalCases.native).meanViews<=2.55,
    preservedAccuracyWithin1_5ppVsOwnFull:
      summary(evalCases.native).score.accuracy>=summary(evalCases.sameBrainFull).score.accuracy-0.015,
    preservedMacroF1Within2ppVsOwnFull:
      summary(evalCases.native).score.macroF1>=summary(evalCases.sameBrainFull).score.macroF1-0.02,
    conditionalNativeGateChoices:
      new Set(evalCases.native.map(r=>r.gateSequence.join(">"))).size>1
  },
  alphaGenome2NotRun:true,donorGGUFNotRun:true,independentBiologicalValidation:false
};
if(process.env.HS3D_STOP_RESULT_FILE)
 fs.writeFileSync(process.env.HS3D_STOP_RESULT_FILE,
   JSON.stringify({...result,rawPerExampleTraces:traces},null,2)+"\n");
console.log("HS3D_NATIVE_STOP_RESULT "+JSON.stringify(result));
