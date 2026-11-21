// Original unmodified MagicPerspective V42 Brain C8, REAL HS3D human AG data.
// One original Brain chooses TWO physical genome primitives, then fuses
// its actual START and chosen FINAL real 4base view in native C8. No second learner.
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
  const train=select(0,600),calibrate=select(600,500),dev=select(1100,200);
  const trainDNA=new Set(train.map(r=>r.dna));
  for(const row of [...calibrate,...dev])if(trainDNA.has(row.dna))fail("Genomic DNA leaked out of train");
  const calDNA=new Set(calibrate.map(r=>r.dna));
  for(const row of dev)if(calDNA.has(row.dna))fail("Genomic DNA leaked from calibration into dev");
  if(train.length!==1200||calibrate.length!==1000||dev.length!==400)fail("Registered original data n mismatched");
  const dnaHashes=rows=>hash(rows.map(r=>r.dna).join("\n"));
  return{train,calibrate,dev,trainDNAHash:dnaHashes(train),devDNAHash:dnaHashes(dev),
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

const MODES_ACTIVE=new Set(["active-zero","active-delayed","active-shuffled",
  "active-delayed-class","active-shuffled-class"]);
const POSITIONS=[58,62,64,66,70,74,78];
const PRIMITIVES=["again","undo","open","right","new","left"];
const ACTION_CODES=["a","b","c","d","e","f"],START=70;
const ACTION_SENTINEL="!!";
function classFromViews(brain,startFour,currentFour){
  if(startFour.length!==4||currentFour.length!==4)fail("Real native C8 view length mismatch");
  const input=startFour+currentFour;
  if(!/^[ACGT]{8}$/.test(input))fail("Native class view must be eight real biological bases");
  const d=brain.predict(code(input));
  if(!Array.isArray(d)||d.length<81||!Number.isFinite(d[80])||!Number.isFinite(d[78]))
    fail("Original native Brain did not predict real P/N class");
  const p=Math.max(0,d[80]),n=Math.max(0,d[78]),total=p+n;
  return{prediction:p>=n?"P":"N",p,n,confidence:total?Math.abs(p-n)/total:0};
}
function actionRewardExpectation(brain,seenFour,previousCode,proposedCode){
  const realActionInput=ACTION_SENTINEL+seenFour+previousCode+proposedCode;
  if(realActionInput.length!==8)fail("Original C8 action input should contain exactly 8 symbols");
  const d=brain.predict(code(realActionInput));
  if(!Array.isArray(d)||d.length<46||!Number.isFinite(d[43])||!Number.isFinite(d[45]))
    fail("Original native action-reward prediction invalid");
  const positive=Math.max(0,d[43]),negative=Math.max(0,d[45]);
  return(positive+1e-12)/(positive+negative+2e-12);
}
function bodyNext(name,body){
  const current=body.current,previous=body.previous,index=POSITIONS.indexOf(current);
  if(index<0)fail("Body outside real legal physical positions");
  if(name==="again")return current;
  if(name==="undo")return previous;
  if(name==="right")return POSITIONS[Math.min(POSITIONS.length-1,index+1)];
  if(name==="left")return POSITIONS[Math.max(0,index-1)];
  if(name==="open"){
    const known=body.visited.slice().sort((a,b)=>a.uncertainty-b.uncertainty||a.when-b.when);
    return known[0].position;
  }
  if(name==="new"){
    const prior=new Set(body.visited.map(x=>x.position));
    const opts=POSITIONS.filter(pos=>!prior.has(pos)).sort((a,b)=>
      Math.abs(a-current)-Math.abs(b-current)||a-b);
    return opts[0]??current;
  }
  fail("Unknown researcher-authored physical primitive "+name);
}
function chooseNativePrimitive(brain,actualFour,previousCode,forced=null){
  const choices=PRIMITIVES.map((primitive,i)=>({
    primitive,code:ACTION_CODES[i],
    probability:actionRewardExpectation(brain,actualFour,previousCode,ACTION_CODES[i])
  }));
  let best=choices[0];
  for(const c of choices)if(c.probability>best.probability+1e-14)best=c;
  return{chosen:forced===null?best:choices[forced],nativePreferred:best,offers:choices};
}
function episode(brain,row,idx,{training=false,policy="native"}={}){
  const start=physicalDNA(row,START),base=classFromViews(brain,start,start);
  const body={current:START,previous:START,
    visited:[{position:START,uncertainty:base.confidence,when:0}]};
  const observations=[{position:START,actualDNA:start}],moves=[],decisionStates=[];
  let previousActionCode="0",currentFour=start;
  for(let step=0;step<2;step++){
    let forced=null;
    if(training){
      if(numHash("active-c8-explore:"+idx+":"+step)%4===0)
        forced=numHash("active-c8-trainrandom:"+idx+":"+step)%PRIMITIVES.length;
    }else if(policy==="random")
      forced=numHash("active-c8-evalrandom:"+idx+":"+step)%PRIMITIVES.length;
    else if(policy==="fixed64"){
      const selected=step===0?"left":"left";forced=PRIMITIVES.indexOf(selected);
    }else if(policy==="fixed66"){
      const selected=step===0?"left":"again";forced=PRIMITIVES.indexOf(selected);
    }else if(policy==="fixed70"){
      forced=0;
    }
    // ONLY actual observed four bases enter native action selection.
    const choice=chooseNativePrimitive(brain,currentFour,previousActionCode,forced);
    const chosen=choice.chosen,from=currentFour;
    const state={seenFour:from,previousCode:previousActionCode,actionCode:chosen.code};
    const destination=bodyNext(chosen.primitive,body);
    // Crucial physical causality: reveal destination DNA only AFTER move.
    const newlyObserved=physicalDNA(row,destination);
    const nativeNow=classFromViews(brain,start,newlyObserved);
    moves.push({primitive:chosen.primitive,destination,fromPosition:body.current,
      predictedReward:chosen.probability,nativePreferred:choice.nativePreferred.primitive});
    decisionStates.push(state);
    body.previous=body.current;body.current=destination;
    body.visited.push({position:destination,uncertainty:nativeNow.confidence,when:step+1});
    observations.push({position:destination,actualDNA:newlyObserved});
    previousActionCode=chosen.code;currentFour=newlyObserved;
  }
  const originalAnswer=classFromViews(brain,start,currentFour);
  return{
    answer:originalAnswer.prediction,predictionEvidence:start+currentFour,
    finalPosition:body.current,actuallyObserved:observations,moves,
    decisionStates,actualReward:originalAnswer.prediction===row.label?"+":"-"
  };
}
function liveNativeActionTrajectory(brain,state,reward){
  const experience=ACTION_SENTINEL+state.seenFour+
    state.previousCode+state.actionCode+reward+"\n";
  if(experience.length!==10)fail("Native real action lived trajectory length must be 10");
  for(const y of code(experience))brain.live(y,false);
}
const [dir,mode,...extras]=process.argv.slice(2);
if(!dir||!MODES_ACTIVE.has(mode)||extras.length)
  fail("Usage: node run-one-native-Brain-active-C8.mjs HS3D_PATH active-zero|active-delayed|active-shuffled|active-delayed-class|active-shuffled-class");
const data=loadData(dir);
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,
  off:["R2","R3"]},c:{cap:8},seed:20261121});
brain.liveWorld="text";
if(brain.CTX!==8)fail("The genuine original Brain C8 did not activate");
brain.body.genomeOriginalActiveFusedWorld={
  physicalPositions:POSITIONS.slice(),primitiveNames:PRIMITIVES.slice(),
  bodyVersion:"one-original-Brain-two-physical-movements-and-eight-base-native-fusion",
  realHumanDNA:true,executedMoves:0,sourceOnlyTraining:true
};
for(let i=0;i<data.train.length;i++){
  const record=data.train[i],start=physicalDNA(record,70),
    second=physicalDNA(record,64);
  const originalClassExperience=start+second+record.label+"\n";
  if(originalClassExperience.length!==10)fail("Original native C8 class training record should be ten symbols");
  for(const y of code(originalClassExperience))brain.live(y,false);
}
const baseLived=brain.lived;
if(baseLived!==12000)fail("Native actual 1200 training examples were not fully lived");
const trueDelayed=mode==="active-delayed"||mode==="active-delayed-class";
const corrupt=mode==="active-shuffled"||mode==="active-shuffled-class";
const classAfter=mode.endsWith("-class");
const episodes=mode==="active-zero"?0:1000;
const calib={episodes,trueSuccess:0,trueFailure:0,actionExperiences:0,
  realEncounteredClassFeedback:0,physicalPairs:{},finalPositions:{},
  actualCorrectPositiveReward:0,actualCorrectNegativeReward:0,
  rewardSource:corrupt?"INDEPENDENT_SHA_DETERMINISTIC":"+/- actual native prediction outcome"};
for(let i=0;i<episodes;i++){
  const record=data.calibrate[i],run=episode(brain,record,i,{training:true});
  if(run.moves.length!==2||run.actuallyObserved.length!==3||run.decisionStates.length!==2)
    fail("Original body did not execute exactly two real actions");
  const trueReward=run.actualReward;
  const reward=corrupt?(numHash("destroy-native-class-reward:"+i)%2===0?"+":"-"):trueReward;
  calib[trueReward==="+"?"trueSuccess":"trueFailure"]++;
  calib[reward==="+"?"actualCorrectPositiveReward":"actualCorrectNegativeReward"]++;
  for(const state of run.decisionStates) {
    liveNativeActionTrajectory(brain,state,reward);
    calib.actionExperiences++;
  }
  if(classAfter){
    // Entire real observed physical path already completed, and only NOW
    // native one Brain lives real final DNA pair plus authentic class truth.
    const lived=run.predictionEvidence+record.label+"\n";
    if(lived.length!==10)fail("Actual self-selected class experience must have 10 symbols");
    for(const y of code(lived))brain.live(y,false);
    calib.realEncounteredClassFeedback++;
  }
  const pair=run.moves.map(x=>x.primitive).join(" > ");
  calib.physicalPairs[pair]=(calib.physicalPairs[pair]||0)+1;
  calib.finalPositions[run.finalPosition]=(calib.finalPositions[run.finalPosition]||0)+1;
  brain.body.genomeOriginalActiveFusedWorld.executedMoves+=2;
}
const livedTotal=brain.lived,expected=baseLived+calib.actionExperiences*10+calib.realEncounteredClassFeedback*10;
if(livedTotal!==expected)fail("Original native life symbol mismatch: "+livedTotal+" vs "+expected);
const aligned=brain.align?.lived,storedMask=brain.e.c.active;
const methods=["native","fixed64","fixed66","fixed70","random"];
const readings=Object.fromEntries(methods.map(k=>[k,[]]));
const movementHistogram={},pairHistogram={},traces=[];
let diverseFirst=0,diverseLast=0;
for(let i=0;i<data.dev.length;i++){
  const record=data.dev[i],arms={};
  for(const method of methods){
    const move=episode(brain,record,i,{training:false,policy:method});
    arms[method]=move;
    readings[method].push({truth:record.label,predicted:move.answer});
  }
  const move=arms.native;
  movementHistogram[move.finalPosition]=(movementHistogram[move.finalPosition]||0)+1;
  const pair=move.moves.map(x=>x.primitive).join(" > ");
  pairHistogram[pair]=(pairHistogram[pair]||0)+1;
  diverseFirst+=Number(move.actuallyObserved[0].position!==move.actuallyObserved[1].position);
  diverseLast+=Number(move.actuallyObserved[1].position!==move.actuallyObserved[2].position);
  if(arms.fixed64.finalPosition!==64||arms.fixed66.finalPosition!==66)
    fail("Fixed native physically executed controls failed to reach correct positions");
  traces.push({id:record.id,truth:record.label,
    nativePred:move.answer,nativeFinalPosition:move.finalPosition,
    actualObservedViews:move.actuallyObserved,realNativeMoves:move.moves,
    nativeStartAndActuallyChosenFinalFour:move.predictionEvidence,
    fixed64Pred:arms.fixed64.answer,fixed66Pred:arms.fixed66.answer,
    fixed70Pred:arms.fixed70.answer,randomPred:arms.random.answer,
    trueClassHiddenUntilAfterNativeDecision:true});
}
if(brain.lived!==livedTotal||brain.align?.lived!==aligned)
  fail("Native frozen evaluation mutated learned original Brain");
const scores=Object.fromEntries(methods.map(m=>[m,metrics(readings[m])]));
const output={
  status:"GENUINE_ORIGINAL_SINGLE_BRAIN_PHYSICAL_ACTION_PLUS_C8_REAL_DNA_FUSION",
  mode,phase:"EXPLORATORY_REUSED_HS3D_DEV400",
  previousPretest:"PRETEST.md",
  source:"Pinned genuine 140nt human HS3D AG P/N original Train only",
  sourceCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
  originalBrainSourceUnchanged:true,
  nativeAlgorithms:["Brain.live","Brain.predict","LeanC cap8","EmergentChain"],
  nativeArchitecture:{context:8,seed:20261121,activeRule:storedMask,
    maxLag:brain.e.c.maxLag,initialClassLived:baseLived,
    totalNativeLived:livedTotal,originalBrainSameForActionsAndFusedClass:true},
  source:{train:data.train.length,calibration:data.calibrate.length,
    dev:data.dev.length,trainDNAHash:data.trainDNAHash,devDNAHash:data.devDNAHash,
    upstreamFiles:data.sources},
  calibration:calib,
  evaluation:{devN:data.dev.length,
    actualPhysicalPrimitiveMovesPerNativeExample:2,
    actualGenomicViewExposuresPerNativeExample:3,
    finalNativeClassInput:"real initial four bases + actual physical destination final four bases",
    causalOrderNativeActionsBeforeUnvisitedDNAArrives:true,
    hiddenP_N_truthUntilEvaluation:true,
    movementHistogram,pairHistogram,firstLocationChanged:diverseFirst,
    secondLocationChanged:diverseLast,
    scores},
  comparisons:{nativeVsSameBrainFixed64Correct:scores.native.correct-scores.fixed64.correct,
    nativeVsSameBrainRandomCorrect:scores.native.correct-scores.random.correct},
  sourceExternalEvaluated:false,noAG2Prediction:true,
  firstPhysicallyVisitedDNAUnknownBeforeAction:true
};
if(process.env.HS3D_ONE_BRAIN_RAW)
  fs.writeFileSync(process.env.HS3D_ONE_BRAIN_RAW,JSON.stringify({...output,perRecordNativePhysicalTraces:traces},null,2)+"\n");
console.log("HS3D_ONE_BRAIN_ACTIVE_FUSION_RESULT "+JSON.stringify(output));
