// ORIGINAL unmodified Brain uses internal ConstructedPathLearner for actions,
// protects its original native C8 DNA classifier from action reward symbols.
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

const MODES_ACTIVE=new Set(["protected-zero","protected-real","protected-shuffled"]);
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

function chooseNativePrimitive(brain,body,actualFour,previousCode,forced=null,step=0,startFour=actualFour){
  const nativePath=brain.constructedPaths;
  if(!nativePath?.links?.choices||!nativePath?.transferableFeatures||
     !nativePath?.transferableScore)fail("Original Brain's internal ConstructedPathLearner missing");
  // Coarse body representation contains only ACTUALLY SEEN DNA and history.
  const stateKey=["human-AG",step,body.current,startFour[0],actualFour[2],previousCode].join(":");
  const links=nativePath.links.choices(stateKey);
  const choices=PRIMITIVES.map((primitive,i)=>{
    const dest=bodyNext(primitive,body);
    const visited=body.visited.filter(x=>x.position===dest);
    const seen=visited.length>0;
    const confidence=seen?visited[visited.length-1].uncertainty:0;
    const features=nativePath.transferableFeatures({
      progress:Math.max(-1,Math.min(1,
        (Math.abs(body.current-68)-Math.abs(dest-68))/8)),
      support:confidence,uncertainty:seen?1-confidence:1,
      novelty:seen?0:1,terminal:Number(step===1)
    });
    const global=nativePath.transferableScore(features);
    const previous=links.find(edge=>edge.action===primitive);
    let positives=0,negatives=0;
    if(previous)for(const next of previous.successors){
      if(next.to==="+")positives+=next.seen;
      else if(next.to==="-")negatives+=next.seen;
    }
    const support=positives+negatives;
    const local=Math.log((1+positives)/(1+negatives))*Math.min(1,support/3);
    return{primitive,code:ACTION_CODES[i],position:dest,features,stateKey,
      score:global+local,observedSimilarActions:support,positives,negatives};
  });
  let best=choices[0];
  for(const c of choices)if(c.score>best.score+1e-14)best=c;
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
    const choice=chooseNativePrimitive(brain,body,currentFour,previousActionCode,forced,step,start);
    const chosen=choice.chosen,from=currentFour;
    const state={seenFour:from,previousCode:previousActionCode,actionCode:chosen.code,
      stateKey:chosen.stateKey,primitive:chosen.primitive,features:chosen.features};
    const destination=bodyNext(chosen.primitive,body);
    // Crucial physical causality: reveal destination DNA only AFTER move.
    const newlyObserved=physicalDNA(row,destination);
    const nativeNow=classFromViews(brain,start,newlyObserved);
    moves.push({primitive:chosen.primitive,destination,fromPosition:body.current,
      predictedNativePathScore:chosen.score,nativePreferred:choice.nativePreferred.primitive});
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

function nativeInternalPathFeedback(brain,state,reward){
  // Real original Brain's path graph learns outcomes; shared C8 class memory
  // receives NO unrelated symbolic reward observations, preventing corruption.
  brain.constructedPaths.links.observe(state.stateKey,state.primitive,reward);
  brain.constructedPaths.learnTransferable(state.features,reward==="+",.04);
}

const [dir,mode,...extra]=process.argv.slice(2);
if(!dir||!MODES_ACTIVE.has(mode)||extra.length)
  fail("Usage: run-protected-original-Brain.mjs HS3D_PATH protected-zero|protected-real|protected-shuffled");
const data=loadData(dir);
const brain=new Brain({rules:{depth:2,seeker:"C",budEvery:400,maxWires:16,
  off:["R2","R3"]},c:{cap:8},seed:20261121});
brain.liveWorld="text";
if(brain.CTX!==8||!brain.constructedPaths?.links)
  fail("Native original Brain C8 and internal ConstructedPathLearner absent");
brain.body.originalProtectedHumanDNA={
  allowedPositions:POSITIONS.slice(),realBiologicalGenomes:true,
  internalOriginalPathLearner:true,internalC8Classification:true,
  sameOriginalBrain:true};
for(let i=0;i<data.train.length;i++){
  const row=data.train[i],first=physicalDNA(row,70);
  const order=i%2===0?[64,66]:[66,64];
  for(const destination of order){
    const lived=first+physicalDNA(row,destination)+row.label+"\n";
    if(lived.length!==10)fail("Original native paired DNA-class observation malformed");
    for(const y of code(lived))brain.live(y,false);
  }
}
const nativeClassSymbols=brain.lived,nativeClassEpisodes=brain.e.c.episodes;
const nativeMask=brain.e.c.active,alignedBefore=brain.align?.lived??null;
if(nativeClassSymbols!==24000)fail("Original Brain did not live full real 24k symbols");
const episodes=mode==="protected-zero"?0:1000;
const calibration={episodes,actualSuccess:0,actualFailure:0,
  pathUpdates:0,chosenPairs:{},chosenDestinations:{}};
for(let i=0;i<episodes;i++){
  const row=data.calibrate[i],one=episode(brain,row,i,{training:true});
  if(one.moves.length!==2||one.decisionStates.length!==2)
    fail("Original physical body did not execute two real movements");
  calibration[one.actualReward==="+"?"actualSuccess":"actualFailure"]++;
  const reward=mode==="protected-shuffled"?
    (numHash("broken-protected-path:"+i)%2===0?"+":"-"):one.actualReward;
  for(const state of one.decisionStates){
    nativeInternalPathFeedback(brain,state,reward);
    calibration.pathUpdates++;
  }
  const pair=one.moves.map(x=>x.primitive).join(" > ");
  calibration.chosenPairs[pair]=(calibration.chosenPairs[pair]||0)+1;
  calibration.chosenDestinations[one.finalPosition]=(calibration.chosenDestinations[one.finalPosition]||0)+1;
}
if(brain.lived!==nativeClassSymbols||brain.e.c.episodes!==nativeClassEpisodes||
  brain.e.c.active!==nativeMask||(brain.align?.lived??null)!==alignedBefore)
  fail("Protected original native C8 class memory changed during path learning");
if(brain.constructedPaths.pathPolicyUpdates!==2*episodes)
  fail("Internal original path learner expected precisely two updates per world");
const controls=["native","fixed64","fixed66","fixed70","random"];
const scored=Object.fromEntries(controls.map(k=>[k,[]]));
const destinations={},pairs={},rawTraces=[];let secondLocationChange=0;
for(let i=0;i<data.dev.length;i++){
  const row=data.dev[i],out={};
  for(const policy of controls){
    const played=episode(brain,row,i,{training:false,policy});
    out[policy]=played;scored[policy].push({truth:row.label,predicted:played.answer});
  }
  const native=out.native;
  destinations[native.finalPosition]=(destinations[native.finalPosition]||0)+1;
  const pair=native.moves.map(x=>x.primitive).join(" > ");
  pairs[pair]=(pairs[pair]||0)+1;
  secondLocationChange+=Number(native.actuallyObserved[1].position!==native.actuallyObserved[2].position);
  if(out.fixed64.finalPosition!==64||out.fixed66.finalPosition!==66)
    fail("Fixed physically executed original Brain control missed destination");
  rawTraces.push({id:row.id,realLabelForScoringOnly:row.label,
    originalNativeMoves:native.moves,
    nativeRealViews:native.actuallyObserved,
    nativeAnswer:native.answer,nativeFinalPosition:native.finalPosition,
    fixed64Answer:out.fixed64.answer,fixed66Answer:out.fixed66.answer,
    randomAnswer:out.random.answer,labelsHiddenDuringAction:true});
}
if(brain.lived!==nativeClassSymbols||brain.e.c.active!==nativeMask)
  fail("Frozen development illegally changed original Brain C8 perception");
const scores=Object.fromEntries(controls.map(k=>[k,metrics(scored[k])]));
const result={
  status:"REAL_ONE_ORIGINAL_BRAIN_PROTECTED_C8_PERCEPTION_AND_NATIVE_CONSTRUCTEDPATH_ACTIONS",
  mode,phase:"EXPLORATORY_PREVIOUSLY_USED_HS3D_DEV400",
  pretest:"PRETEST.md",sourceCommit:"e04aa5aeb4035adac9ce6c65c2143c2ef7163332",
  source:"Original genuine human HS3D 140nt AG acceptor TRAIN only",
  nativeOriginalSourceUnmodified:true,
  actualOriginalModules:["Brain.live","Brain.predict","LeanC C8",
    "ConstructedPathLearner.learnTransferable","ConstructedTransitionGraph.links"],
  originalNativeOneBrainOnly:true,
  sourceCounts:{train:data.train.length,calibration:data.calibrate.length,dev:data.dev.length,
    trainDNAHash:data.trainDNAHash,devDNAHash:data.devDNAHash,sourceSHA:data.sources},
  protectedPerception:{
    originalBrainLivedBeforeAction:nativeClassSymbols,
    originalBrainLivedAfterAction:brain.lived,
    C8ActiveBeforeAction:nativeMask,C8ActiveAfterAction:brain.e.c.active,
    C8Episodes:brain.e.c.episodes,
    actionRewardNeverEnteredOriginalC8:true,
    twoLegalClassObservationDestinations:[64,66]},
  calibration:{...calibration,
    originalPathPolicyWeights:brain.constructedPaths.pathPolicy,
    originalPathPolicyUpdates:brain.constructedPaths.pathPolicyUpdates,
    nativeOriginalGraph:brain.constructedPaths.links.status()},
  dev:{n:data.dev.length,twoPhysicalActions:true,
    realViewsPerSample:3,destinations,primitivePairs:pairs,
    changedLocationOnSecondAction:secondLocationChange,scores},
  outcomeLabelsHiddenUntilAfterPhysicalDecisions:true,
  noExternalActionLearning:true,notAlphaGenome2Comparison:true
};
if(process.env.HS3D_PROTECTED_NATIVE_RESULT)
  fs.writeFileSync(process.env.HS3D_PROTECTED_NATIVE_RESULT,
    JSON.stringify({...result,fullPhysicalTrace:rawTraces},null,2)+"\n");
console.log("HS3D_PROTECTED_ONE_BRAIN_RESULT "+JSON.stringify(result));
