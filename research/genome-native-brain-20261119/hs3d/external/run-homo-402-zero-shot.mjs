// FIRST SOURCE-EXTERNAL human 402nt AG acceptor validation, real original Brain unchanged.\n// FROZEN 1600-ROW CONFIRMATION: exact previously selected native C6\n// two-action method, unchanged original Brain and action physics.\n// V5-inspired TWO-STEP primitive composition using only original V42 Brain.
// Original Brain.live owns all learning; original Brain.predict selects EACH
// physical action, sees its true consequences, and emits final class.
// No Python Organism5, no external learner, no PWM in acting entity.
// The human has authored primitive semantics; they are not discovered.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../../../../v17/transcend/torus-aether/devour/brain.mjs";

const SOURCE_COMMIT="e04aa5aeb4035adac9ce6c65c2143c2ef7163332";
const MODES=["chain-zero","chain-last","chain-last-repeat","chain-delayed","chain-shuffled"];
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
    if(pool[label].length<2100)fail("Not 2100 distinct actual "+label+" sequences");
  }
  const interleave=(lo,len)=>{
    const out=[];
    for(let i=lo;i<lo+len;i++)for(const label of LABELS)out.push(pool[label][i]);
    return out;
  };
  const train=interleave(0,600),calibrate=interleave(600,500),development=interleave(1300,800);
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

const EXTERNAL_PIN="fe300cd8e4a55471268e1271621df208430157a5";
function loadIndependentHumanAcceptors(externalDir,originalData){
  // Original source DNA and class labels come ONLY from the independent
  // published DRANetSplicer 402bp positive and negative human acceptor files.
  // There is no new training. The native organism sees only its actual four
  // 4nt views in the original exact 140nt coordinate frame.
  const seenHS3D=new Set([...originalData.train,...originalData.calibrate,...originalData.development].map(r=>r.dna));
  const sources={},firstClass=new Map(),contradictory=new Set();
  for(const [label,filename] of [
    ["P","homo_acceptor_positive.txt"],
    ["N","homo_acceptor_negative.txt"]
  ]){
    const full=path.join(externalDir,filename);
    const buf=fs.readFileSync(full);
    const originalLines=buf.toString("utf8").split(/\r?\n/);
    const raw={file:filename,sha256:sha(buf),totalRawNonempty:0,
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
        recordKey:sha("external-original-sequence:"+dna).slice(0,16),
        rankKey:sha("external-homo-native-20261120:"+cropped)});
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

const [dir,externalDir,mode,...other]=process.argv.slice(2);
if(!dir||!externalDir||mode!=="chain-delayed"||other.length||
   process.env.HS3D_EXTERNAL_TRANSFER_UNLOCK!=="EXTERNAL_HOMO_PRE_FROZEN")
  fail("Zero-shot external 402nt human acceptor test requires HS3D source, pinned independent source path and frozen chain-delayed mode");
const data=getData(dir);
const external=loadIndependentHumanAcceptors(externalDir,data);
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
const calibrationStats={episodes:mode==="chain-zero"?0:1000,
  trueSuccess:0,trueFailure:0,trueRewardSymbolsLived:0,
  falseRewardSymbolsLived:0,firstActionRewardPassages:0,
  lastActionRewardPassages:0,primitivePairs:{},initialActions:{},finalDestinations:{}};
const calibrationResults=[];
for(let i=0;i<calibrationStats.episodes;i++){
  const row=data.calibrate[i];
  const one=episode(brain,row,i,true);
  const actualReward=one.correct?"+":"-";
  const livedReward=mode==="chain-shuffled"?(hashNumber("broken-independent-reward:"+i)%2===0?"+":"-"):actualReward;
  const trueCategory=one.correct?"trueSuccess":"trueFailure";
  calibrationStats[trueCategory]++;
  calibrationStats[livedReward==="+"?"trueRewardSymbolsLived":"falseRewardSymbolsLived"]++;
  const lastState=one.transitionStates[1];
  if(!lastState||one.transitionStates.length!==2)fail("Two real primitive moves absent");
  if(mode==="chain-delayed"||mode==="chain-shuffled"){
    // After the final outcome, the original Brain re-lives the real
    // first -> second physical action sequence in the same temporal order.
    livedTrajectory(brain,one.transitionStates[0],livedReward);
    calibrationStats.firstActionRewardPassages++;
  }
  livedTrajectory(brain,lastState,livedReward);
  calibrationStats.lastActionRewardPassages++;
  if(mode==="chain-last-repeat"){
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
const outputs={native:[],fixed64:[],fixed66:[],initial70:[],randomTwo:[],fixedLeftLeft:[]};
const developmentTraces=[],frozenActions={first:{},second:{},pair:{},destinations:{}};
let compositionChange=0;
for(let i=0;i<external.rows.length;i++){
  const row=external.rows[i];
  const native=episode(brain,row,i,false);
  outputs.native.push({truth:row.label,prediction:native.answer.prediction});
  frozenActions.destinations[native.finalPosition]=(frozenActions.destinations[native.finalPosition]||0)+1;
  for(let k=0;k<2;k++){
    const primitive=native.primitiveTrail[k],dict=k===0?frozenActions.first:frozenActions.second;
    dict[primitive]=(dict[primitive]||0)+1;
  }
  const pair=native.primitiveTrail.join(" > ");
  frozenActions.pair[pair]=(frozenActions.pair[pair]||0)+1;
  if(native.physicalTrail[1]!==native.physicalTrail[2])compositionChange++;
  // Read-only controls. None of these observations are passed to native
  // action selection; the chosen action is already irrevocably finished.
  const cls=p=>originalNativeClass(brain,realView(row,p)).prediction;
  outputs.fixed64.push({truth:row.label,prediction:cls(64)});
  outputs.fixed66.push({truth:row.label,prediction:cls(66)});
  outputs.initial70.push({truth:row.label,prediction:cls(70)});
  outputs.fixedLeftLeft.push({truth:row.label,prediction:cls(64)}); // 70 -> 66 -> 64
  const randomState={current:70,previous:70,visited:[{position:70,margin:0.5,when:0}]};
  for(let k=0;k<2;k++){
    const primitive=PRIMITIVES[hashNumber("dev-random-primitive:"+i+":"+k)%PRIMITIVES.length];
    const next=resolveAction(primitive,randomState);
    randomState.previous=randomState.current;randomState.current=next;
    const nextView=realView(row,next);
    randomState.visited.push({position:next,margin:originalNativeClass(brain,nextView).margin,when:k+1});
  }
  outputs.randomTwo.push({truth:row.label,prediction:cls(randomState.current)});
  developmentTraces.push({
    rowKey:sha("anonymised-study:"+row.dna).slice(0,16),
    actualTruth:row.label,
    primitiveSequence:native.primitiveTrail,
    positions:native.physicalTrail,
    firstPositionObservedBases:row.dna.slice(70,74),
    actualFinalObservedBases:native.lastRealBases,
    originalNativeAnswer:native.answer.prediction,
    correct:native.correct,
    beliefInActionRewardBeforeMovement:native.offersTrace,
    biologicalTruthNeverProvidedDuringEvaluation:true
  });
}
if(brain.lived!==learnedLived||(brain.align?.lived??null)!==learnedAlignment)
  fail("Evaluation illegally changed Brain learning state");
const measured=Object.fromEntries(Object.entries(outputs).map(([key,rows])=>[key,metric(rows)]));
const result={
  status:"FROZEN_ORIGINAL_BRAIN_ZERO_SHOT_INDEPENDENT_HUMAN_AG_ACCEPTORS",
  sourceCommit:SOURCE_COMMIT,source:"TRAIN ONLY from authentic HS3D human acceptors, ZERO-SHOT external human acceptor evaluation from DRANetSplicer",
  phase:"FROZEN_DIFFERENT_SOURCE_HUMAN_402NT_AG_ZERO_SHOT_TEST",
  pretest:"EXTERNAL_HUMAN_TRANSFER_PRETEST.md",
  originalFreezeCommit:"892e1a95200a9cf124273dcde9c22ddfd4dfda48",
  externalHumanSource:external.provenance,
  inspiration:"Braivour discovery_maze_v5.py primitives and n-step delayed credit; actual Python V5 IS NOT used",
  mode,sourceChecksums:data.sourceChecksums,sourceCounts:data.sourceCounts,availableUnique:data.availableUnique,
  exclusions:{duplicateOrContradictory:data.excludedDuplicatesAndContradictions,
    distinctContradictoryDNAs:data.distinctContradictoryDNAs,invalid:data.rejected},
  training:{actualHumanGenomeExamples:data.train.length,
    viewsPerSupervisedExample:7,nativeBrainLearnedSymbols:initialSupervisedLived,
    capacity:6,originalNativeR2R3off:true},
  calibration:{...calibrationStats,livedRewardSymbols:livedDelta,
    finalBrainLived:learnedLived,realActualCalibrationCases:data.calibrate.length,
    exampleTransitions:calibrationResults},
  development:{examples:external.rows.length,realDNAViewsPerOriginalActionPrediction:3,
    physicalActionsPerPrediction:2,
    nativeSelectionHistogram:frozenActions,
    differentLocationAfterSecondAction:compositionChange,
    results:measured,
    noOutcomeOrUnobservedNucleotidesInNativeActionSelection:true,
    comparedControlsAreReadOnly:true},
  scientificScope:{
    newCausalQuestion:"Can same original Brain learn two-step primitive composition from delayed real action feedback?",
    manuallySpecifiedPrimitives:true,originalBrainOnly:true,
    originalBraivourDiscoveryMazeV5NotRerun:true,
    realGGUFNotUsed:true,officialAcceptorTestNotUsed:true,alphaGenome2NotRun:true,
    independentExternalValidation:false,
    previousHS3DAcceptorDevPreviouslyOpened:true,
    newEvaluationRowsWereNeverScoredBeforeThisRun:true,
    groupHomologyDisjoint:false,
    independentExternalDataset:true
  }
};
if(process.env.HS3D_PRIMITIVE_RESULT_PATH)fs.writeFileSync(process.env.HS3D_PRIMITIVE_RESULT_PATH,
  JSON.stringify({...result,rawDevelopmentTraces:developmentTraces},null,2)+"\n");
console.log("HS3D_INDEPENDENT_HUMAN_ZERO_SHOT_RESULT "+JSON.stringify(result));
