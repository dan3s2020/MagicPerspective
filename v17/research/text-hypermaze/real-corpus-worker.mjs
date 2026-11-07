// The ONLY TRAINING BRAIN for the standalone *tested* NativeGoalTextMaze.
// No AligningGraph training, no TinyStories byte-predictor, no parallel V17
// trainer; this is precisely the original Discoverer.shapeGraph +
// ObservedTransformations + NoiseAgency architecture proven in research CI.
// CPU until the ENTIRE native motor has demonstrated CUDA parity; never
// mislabel the legacy unrelated PyTorch text head as this learner's GPU.
import {parentPort,workerData} from "node:worker_threads";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {performance} from "node:perf_hooks";
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {ObservedTransformations,tokenizeObservation,renderObservation}
 from "../../transcend/torus-aether/worlds/observed-transformations.mjs";
import {playExercise,KIND}
 from "../../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze} from "./goal-conditioned-native.mjs";
import {openNativeMotifArchive} from "./native-motif-disk-archive.mjs";
import {rawJSONLLines,parseActualJSONL} from "./openthoughts-jsonl-source.mjs";

const opts=workerData.opts,files=workerData.files,out=workerData.out;
const statePath=path.join(out,"native-hypermaze-progress.json");
const inputFiles=files.map(x=>({path:x.path,size:x.size,mtimeMs:x.mtimeMs}));
const totalBytes=files.reduce((n,x)=>n+x.size,0);
const holdoutEvery=opts.holdoutEvery||100;
const checkpointEvery=Math.max(1,opts.saveEvery||500);
const transitionEvery=Math.max(1,opts.transitionEvery||128);
const windowTokens=opts.windowTokens||96;
const startedAt=performance.now();
let sessionTrainingBytes=0,sessionRows=0,sessionSourceBytes=0;
let brain,engine,motifArchive=null,seq=0,stop=false,paused=!opts.autoStart,saveRequested=false,saving=false,done=false,fatal=false;
const yieldTurn=()=>new Promise(resolve=>setImmediate(resolve));
const time=()=>performance.now();
const counters={
 inputFiles:files.length,totalBytes,bytesRead:0,bytesForLearning:0,
 sourceTextUTF8Bytes:0,trainTextUTF8Bytes:0,observedTokens:0,trainTokens:0,
 tokenWindows:0,actualObservedWindows:0,trainedRows:0,heldoutRows:0,
 qaTrainingPairs:0,qaLearnedPairs:0,qaFrozenHeldoutQuestions:0,
 qaFrozenGoalsFound:0,qaFrozenWholeRawExact:0,qaFrozenWholeCanonicalExact:0,
 qaFrozenPredictionErrors:0,qaLastPrediction:null,
 rowsRead:0,parsedRows:0,emptyTextRows:0,malformedRows:0,
 preActionProbes:0,probeEligible:0,probeCorrect:0,
 endogenousNoiseDecisions:0,endogenousNoiseCorrect:0,
 newOperators:0,geometryPairs:0,
 fileIndex:0,offset:0,lastSavedAt:null,lastSavedRows:0,
 sourceKind:"actual-openthoughts-JSONL",device:"cpu-native-original-shape",
 frozenHeldoutIsNotTraining:true,fullSemanticAccuracyProven:false
};
function send(type,body={}){parentPort.postMessage({type,...body});}
const errText=e=>e instanceof Error?e.stack||e.message:String(e);
function info(){
 const o=brain?.observedTransformations;
 const elapsed=Math.max(0.001,(time()-startedAt)/1000);
 return {...counters,
  totalBytes,percent:100*counters.bytesRead/Math.max(1,totalBytes),
  elapsedSeconds:+elapsed.toFixed(2),
  textMBPerSecond:+((counters.trainTextUTF8Bytes-sessionTrainingBytes)/1e6/elapsed).toFixed(4),
  sourceMBPerSecond:+((counters.bytesRead-sessionSourceBytes)/1e6/elapsed).toFixed(4),
  exercisesPerSecond:+((counters.trainedRows-sessionRows)/elapsed).toFixed(2),
  observedTokenWindowsPerSecond:+(counters.actualObservedWindows/elapsed).toFixed(2),
  observedStates:o?.records.size??0,totalObservedStates:o?.newObservations??0,
  learnedOperators:o?.operators.size??0,
  learnedGeometry5DAxes:brain?.hypermazeLearnedAxes?.size??0,
  operatorsDropped:o?.droppedOperators??0,
  oldStatesEvicted:o?.evicted??0,
  rejectedOverTokenCap:o?.rejectedLong??0,
  noise:brain?.noiseAgent?.status()??null,
  originalMazeEpisodes:brain?.disc?.episodes??0,
  originalMazeAttraction:brain?.disc?.attract(KIND.target)??0,
  originalFloorConductance:brain?.disc?.conduct(KIND.floor)??0,
  phase:fatal?"error":done?"complete":saving?"saving":paused?"paused":"training",
  completed:done,checkpointFile:counters.checkpointFile||null,
  checkpointWritten:!!counters.lastSavedAt,
  nativePolicy:"actual-original-Discoverer.shapeGraph",
  originalHypermazeWorkerOnly:true,legacyParallelTrainer:false,
  heldoutTop1NextStateAccuracy:counters.probeEligible?
   counters.probeCorrect/counters.probeEligible:null,
  accuracyMeaning:"frozen local next-state only; NOT semantic exact-answer accuracy",
  qaWholeAnswerExactRate:counters.qaFrozenHeldoutQuestions?
    counters.qaFrozenWholeRawExact/counters.qaFrozenHeldoutQuestions:null,
  qaCanonicalWholeAnswerExactRate:counters.qaFrozenHeldoutQuestions?
    counters.qaFrozenWholeCanonicalExact/counters.qaFrozenHeldoutQuestions:null,
  qaFrozenGoalCoverage:counters.qaFrozenHeldoutQuestions?
    counters.qaFrozenGoalsFound/counters.qaFrozenHeldoutQuestions:null,
  qaRoleWitnessedAxisEdges:brain?.qaRoleEvidence?.edges?.length??0,
  qaRoleActiveObservations:brain?.qaRoleEvidence?.examples?.length??0,
  qaLongFormEpisodes:brain?.qaRoleEvidence?.longForm?.episodes??0,
  qaLongFormQuestionTokens:brain?.qaRoleEvidence?.longForm?.questionTokens??0,
  qaLongFormAnswerTokens:brain?.qaRoleEvidence?.longForm?.answerTokens??0,
  qaLongFormChunkNodes:brain?.qaRoleEvidence?.longForm?.questionChunks+
    brain?.qaRoleEvidence?.longForm?.answerChunks||0,
  qaLongFormSequentialEdges:brain?.qaRoleEvidence?.longForm?.observedRoleTransitions??0,
  qaLongFormActiveChunkDigests:brain?.qaRoleEvidence?.longForm?.activeChunks??0,
  qaLongFormEvictedSequences:brain?.qaRoleEvidence?.longForm?.evictedSequences??0,
  qaLongFormUnretained:brain?.qaRoleEvidence?.longForm?.tooLongToRetainChunks??0,
  qaSemanticCaveat:"Full answers are scored WITHOUT passing heldout answer or target tokens to the original shape planner.",
  // SQLite disk is a SOURCE-EVIDENCE index, not a semantic action model.
  qaDiskMotifArchive:motifArchive?.status()||{
   enabled:false,sourceOnly:true,
   reason:"Node.js >=22 required or explicitly disabled for this run"
  },
  // One persistent original Brain graph across training rows and episodes.
  // Distinguish witnessed real operators/observed sequence from validated
  // physical paths; a text-adjacent segment is NOT a semantic wall crossing.
  crossMazeMemory:engine?.cumulativeWorldStatus?.()||null,
  atlasTotals:engine?.cumulativeAtlas?.({view:"attempts",limit:1})?.memory||null,
  crossMazeTopologicalCompleteness:"bounded by retained observations; cannot assume unknown language connections exist",
  saturated:o?.droppedOperators>0,
  boundedMemoryWarning:"Observed text-window states are bounded; evicted states are not permanently retained as individual observations. All source bytes are streamed, not all bytes become unique persistent nodes."
 };
}
function publish(){send("status",{status:info()});}

async function init(){
 await fsp.mkdir(out,{recursive:true});
 if(fs.existsSync(statePath)){
  const previous=JSON.parse(await fsp.readFile(statePath,"utf8"));
  if(previous.version!==1||JSON.stringify(previous.inputFiles)!==JSON.stringify(inputFiles))
   throw Error("Dataset file paths/sizes/dates changed since checkpoint. Refuse unsafe resume.");
  const checkpoint=path.join(out,previous.checkpoint);
  if(!fs.existsSync(checkpoint))throw Error("Checkpoint listed in durable cursor manifest is missing: "+checkpoint);
  brain=Brain.load(checkpoint);
  // Legitimate capacity increase is safe on restart because every committed
  // source cursor names the EXACT atomically saved original Brain state.
  // Never shrink saved learning capacity or discard previously learned ops.
  brain.observedTransformations.maxOperators=Math.max(
   brain.observedTransformations.maxOperators,opts.maxOperators||80000);
  brain.observedTransformations.maxObserved=Math.max(
   brain.observedTransformations.maxObserved,opts.maxObserved||12000);
  Object.assign(counters,previous.counters);
  seq=previous.seq;
  counters.checkpointFile=previous.checkpoint;
  send("note",{text:"Resumed EXACT original Brain + byte-offset cursor from "+checkpoint});
 }else{
  brain=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
    empty:true,maxWires:32,fold:false},seed:11});
  brain.enableEndogenousNoise();
  brain.observedTransformations=new ObservedTransformations({
   maxObserved:opts.maxObserved||12000,
   maxOperators:opts.maxOperators||80000,
   maxCandidatePairs:64,maxTokens:Math.max(windowTokens+2,128)});
  // The SAME original Discoverer attractor actually learned from original
  // generated maze experiences, as in the verified 100/100 research test.
  for(let i=0;i<150;i++){
   const maze=makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]);
   playExercise(maze,brain.disc);
   if(i>=24&&brain.disc.attract(KIND.target)>.2&&
      brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
  }
  if(brain.disc.attract(KIND.target)<=.2||brain.disc.conduct(KIND.floor)<.5)
   throw Error("Original maze pre-action shape failed to learn target/walkable field; do not start fake text training");
  send("note",{text:"Original Discoverer.shapeGraph learned maze attractor in "+brain.disc.episodes+" real procedural worlds"});
 }
 brain.enableEndogenousNoise();
 sessionTrainingBytes=counters.trainTextUTF8Bytes;
 sessionSourceBytes=counters.bytesRead;
 sessionRows=counters.trainedRows;
 engine=new NativeGoalTextMaze(brain,{maxStates:1500,maxDepth:6});
 // All prior training Q/A motifs remain addressable on DISK even after
 // bounded active Brain motif memory evicts them at 50k nodes. This store
 // never sees heldout rows, only actual observeQA() training evidence.
 if(opts.disableMotifDiskArchive!==true){
  try{
   motifArchive=await openNativeMotifArchive(path.join(out,
    "original-native-long-language-motifs.sqlite"));
   engine.qaRole.attachMotifArchive(motifArchive);
   send("note",{text:"Same native original Brain attached durable exact witnessed source motif disk index: "+
    motifArchive.filename});
  }catch(error){
   // The existing released native launcher explicitly supports Node20+.
   // Older Node20 lacks node:sqlite. Preserve that WORKING legacy training,
   // but make lost disk coverage VISIBLE, never claim full retention.
   if(String(error?.message||error).includes("requires Node.js >=22")){
    send("note",{text:"WARNING: Node20+ legacy V17 training works, but indexed motif DISK memory is unavailable until Node22+. Recurrent source nodes can be evicted from active RAM."});
   }else throw error;
  }
 }else send("note",{text:"EXPLICIT WARNING: long-language motif disk memory disabled by caller; active graph can evict old evidence"});
 done=counters.fileIndex>=files.length;
 publish();
}

async function checkpoint(){
 if(saving)return;
 saving=true;publish();
 try{
  const next=seq+1;
  const file="native-brain-"+String(next).padStart(6,"0")+".v8";
  const checkpointPath=path.join(out,file);
  // Brain.save already writes .tmp then atomically renames to .v8.
  // Progress points at a generation ONLY AFTER its full Brain was written.
  const written=brain.save(checkpointPath);
  const updated={...counters,lastSavedRows:counters.rowsRead,
   lastSavedAt:new Date().toISOString(),checkpointFile:file,
   savedCheckpointBytes:written};
  const manifest={version:1,seq:next,inputFiles,counters:updated,
   checkpoint:file,origin:"same-tested-native-hypermaze-no-byte-predictor",
   // Database is distinct from the single Brain weights, never a
   // substitute trainer. Exact source witness index persists across
   // original checkpoint generations and can be reattached on resume.
   sourceMotifDiskArchive:motifArchive?.filename||null,
   sourceMotifDiskStats:motifArchive?.status()||null};
  const temporary=statePath+".tmp";
  await fsp.writeFile(temporary,JSON.stringify(manifest,null,2),"utf8");
  await fsp.rename(temporary,statePath);
  seq=next;Object.assign(counters,updated);
  // Keep two prior complete generations for rollback (not just the latest).
  if(seq>3){
   const old=path.join(out,"native-brain-"+String(seq-3).padStart(6,"0")+".v8");
   await fsp.unlink(old).catch(e=>{if(e.code!=="ENOENT")throw e;});
  }
  send("saved",{file,bytes:written,rows:counters.rowsRead});
 }finally{saving=false;saveRequested=false;publish();}
}
function observedEndOfSegment(tokens){
 if(tokens.length<2)return;
 for(let i=0;i<tokens.length;){
  let end=Math.min(tokens.length,i+windowTokens);
  if(tokens.length-end===1&&end-i>2)end--;
  const part=tokens.slice(i,end);
  i=end;
  if(part.length<2)continue;
  // Each window is an actual contiguous part of the original observed
  // stream. No fabricated reference target is inserted.
  counters.tokenWindows++;
  const usePrefix=counters.tokenWindows%transitionEvery===0&&part.length>=4;
  if(usePrefix){
   const before=part.slice(0,-1);
   const observedNext=renderObservation(part);
   // Decide using ONLY the brain BEFORE the next original token is seen.
   const options=brain.observedTransformations.neighbors(before);
   const probable=options.slice().sort((a,b)=>
    b.action.observedSupport-a.action.observedSupport)[0];
   const portal=brain.noiseAgent?.decide({domain:"text",known:options.length>0,
    planned:!!probable})||null;
   let hypothesis=probable;
   if(portal&&options.length>1&&["action","imagination"].includes(portal.site)){
    const ix=brain.noiseAgent.output(0,options.length,portal);
    hypothesis=options[ix]??probable;
   }
   const predicted=hypothesis?renderObservation(hypothesis.tokens):null;
   // Compare AFTER the actual next token from the lived corpus is revealed.
   const correct=predicted!==null&&predicted===observedNext;
   counters.preActionProbes++;
   counters.probeEligible+=Number(predicted!==null);
   counters.probeCorrect+=Number(correct);
   if(portal){
    brain.noiseAgent.learn(portal,{correct});
    counters.endogenousNoiseDecisions++;
    counters.endogenousNoiseCorrect+=Number(correct);
   }
   const first=engine.observeTokenWindow(before);
   counters.newOperators+=first.newOperators||0;
   counters.geometryPairs+=first.newRealGeometryPairs||0;
   counters.actualObservedWindows++;
  }
  const result=engine.observeTokenWindow(part);
  counters.newOperators+=result.newOperators||0;
  counters.geometryPairs+=result.newRealGeometryPairs||0;
  counters.actualObservedWindows++;
 }
}
function absorbLine(segments){
 for(const text of segments){
  const tokens=tokenizeObservation(text);
  counters.sourceTextUTF8Bytes+=Buffer.byteLength(text,"utf8");
  counters.observedTokens+=tokens.length;
  for(let i=0;i<tokens.length;){
   let end=Math.min(tokens.length,i+opts.maxTokensPerSegment);
   // Avoid placing an unlearnable single-token tail at a segment boundary.
   if(tokens.length-end===1&&end-i>3)end--;
   const segment=tokens.slice(i,end);
   i=end;
   counters.trainTokens+=segment.length;
   if(segment.length>=2)observedEndOfSegment(segment);
  }
  counters.trainTextUTF8Bytes+=Buffer.byteLength(text,"utf8");
 }
}
function heldoutProbe(segments,qaPairs=[]){
 // The heldout correct answer is read ONLY after the frozen question-only
 // field has produced its entire prediction or abstained. No gold enters model.
 for(const pair of qaPairs){
  counters.qaFrozenHeldoutQuestions++;
  let plan=null,error=null;
  try{plan=engine.planQA({question:pair.question});}
  catch(e){error=errText(e);counters.qaFrozenPredictionErrors++;}
  const proposed=plan?.found?plan.predicted:null;
  counters.qaFrozenGoalsFound+=Number(typeof proposed==="string");
  const actual=pair.answer.trim();
  const exact=proposed!==null&&proposed===actual;
  const canonical=proposed!==null&&proposed===
    renderObservation(tokenizeObservation(actual));
  counters.qaFrozenWholeRawExact+=Number(exact);
  counters.qaFrozenWholeCanonicalExact+=Number(canonical);
  // Publish every real heldout question and real failed answer in the SAME
  // original persistent atlas. The correct answer string is NOT passed to
  // this call or stored in the native Brain checkpoint.
  const audited=engine.auditFrozenQA({
   question:pair.question,plan,exact,canonical,source:"authentic-jsonl-heldout"
  });
  if(!audited.withheldAnswerNeverStored)
   throw Error("Frozen QA atlas attempted to retain reference answer");
  counters.qaLastPrediction={
   questionPreview:pair.question.slice(0,140),
   modelPrediction:proposed?.slice(0,400)??null,
   plannedActions:plan?.actions?.length??0,
   exactWholeAnswer:exact,canonicalWholeAnswer:canonical,
   reason:plan?.reason||error||null,
   withheldReferenceNeverPassedToModel:true
  };
 }

 // Completely frozen. NEVER observe a withheld reference, never provide
 // a goal derived from it to the planner, and never claim this is an IQ test.
 for(const text of segments.slice(0,1)){
  const tokens=tokenizeObservation(text);
  if(tokens.length<4)continue;
  const cut=Math.min(24,tokens.length-1);
  const before=tokens.slice(0,cut);
  const expected=renderObservation(tokens.slice(0,cut+1));
  const candidates=brain.observedTransformations.neighbors(before);
  const p=candidates.slice().sort((a,b)=>
   b.action.observedSupport-a.action.observedSupport)[0];
  const predicted=p?renderObservation(p.tokens):null;
  counters.preActionProbes++;
  counters.probeEligible+=Number(predicted!==null);
  counters.probeCorrect+=Number(predicted===expected);
 }
}
async function train(){
 if(done){publish();return;}
 paused=false;
 send("note",{text:"Started genuine JSONL streaming through ONE original learned text hypermaze, NOT legacy AligningGraph training"});
 let reportAt=time(),rowsSinceYield=0;
 try{
  for(let f=counters.fileIndex;f<files.length;f++){
   for await(const {line,endOffset,bytes} of rawJSONLLines(files[f],{
     offset:f===counters.fileIndex?counters.offset:0})){
    while(paused&&!stop){
     if(saveRequested)await checkpoint();
     await new Promise(resolve=>setTimeout(resolve,75));
    }
    if(stop)break;
    let result;
    if(line.length){
     try{result=parseActualJSONL(line);}
     catch(e){
      counters.malformedRows++;
      // No skipped corrupt row or imaginary recovered bytes.
      throw Error("JSONL line #"+(counters.rowsRead+1)+" at "+files[f].path+
       " byte end="+endOffset+": "+e.message);
     }
    }else result={text:[],empty:true};
    const originalRow=counters.rowsRead+1;
    counters.rowsRead++;
    counters.bytesRead+=bytes;
    counters.fileIndex=f;counters.offset=endOffset;
    if(result.empty)counters.emptyTextRows++;
    else counters.parsedRows++;
    // Never announce 100% consumption of 594MB if the converted JSONL
    // schema is not actually readable by the original native learner.
    // Stop BEFORE any further silent no-op, preserving the committed state.
    if(counters.rowsRead===100&&counters.emptyTextRows>20)
     throw Error("Unsupported real JSONL shape: "+counters.emptyTextRows+
       "/100 source rows contain no discoverable text. "+
       "Inspect actual top-level fields; refusing to fake dataset learning.");
    if(originalRow%holdoutEvery===0){
     counters.heldoutRows++;heldoutProbe(result.text,result.qaPairs||[]);
    }else{
     counters.trainedRows++;
     counters.bytesForLearning+=bytes;
     absorbLine(result.text);
     // Real user/GPT relation learned in same original Brain only.
     for(const pair of result.qaPairs||[]){
      counters.qaTrainingPairs++;
      const learned=engine.observeQA(pair.question,pair.answer);
      counters.qaLearnedPairs+=Number(!!learned.learned);
     }
     if(brain.observedTransformations.droppedOperators>0)
      throw Error("REAL hypermaze action capacity reached after "+
       brain.observedTransformations.operators.size+" learned operators. "+
       "Stopping BEFORE claiming full dataset consumption. "+
       "The last committed original Brain checkpoint is intact; "+
       "restart with a larger -MaxOperators or a differently partitioned corpus.");
    }
    rowsSinceYield++;
    const now=time();
    if(counters.rowsRead-counters.lastSavedRows>=checkpointEvery||saveRequested)
     await checkpoint();
    if(now-reportAt>1000){publish();reportAt=now;}
    // The original learner remains on ONE worker thread. Yield for UI
    // messages, pauses and frozen goals without starting a second model.
    if(rowsSinceYield>=8){rowsSinceYield=0;await yieldTurn();}
   }
   if(stop)break;
   counters.fileIndex=f+1;counters.offset=0;publish();
  }
  if(!stop){done=true;paused=true;}
  await checkpoint();
  publish();
  send("note",{text:done?"Entire selected real JSONL file set consumed, native Brain checkpointed":"Stopped and checkpointed at exact source byte offset"});
 }catch(err){
  paused=true;fatal=true;
  // A corrupt JSONL record, invalid UTF-8 or exceeded model capacity may
  // have partially changed the CURRENT unsaved row. NEVER persist that
  // partial row with an advanced source cursor: that would lose training
  // data. Preserve the last successfully committed Brain generation and
  // exact source offset for a clean, reproducible restart.
  send("fatal",{error:errText(err)+"\nUncommitted partial batch discarded "+
   "on restart; previous atomic checkpoint remains intact.",status:info()});
 }
}
let running=null;
parentPort.on("message",m=>{
 const id=m?.id;
 void(async()=>{
  if(m.cmd==="status")return send("rpc",{id,result:info()});
  if(m.cmd==="pause"){paused=true;publish();return send("rpc",{id,result:info()});}
  if(m.cmd==="save"){saveRequested=true;
   if(paused||done)await checkpoint();
   return send("rpc",{id,result:{requested:true,...info()}});}
  if(m.cmd==="start"){
   if(!running&&!done){paused=false;running=train().finally(()=>{running=null;});}
   else if(!done)paused=false;
   publish();return send("rpc",{id,result:info()});
  }
  if(m.cmd==="qa"){
   const question=String(m.question||"");
   if(!question.trim()||question.length>4000)
    throw Error("Real Q/A question must contain 1..4000 characters");
   const plan=engine.planQA({question});
   const body=m.execute&&plan.found?engine.executeQA(plan):null;
   return send("rpc",{id,result:{...plan,body,originalBrain:true,
    realTrainingCorpus:files.map(x=>x.path),
    withheldAnswerSupplied:false,generalNaturalLanguageAccuracyProven:false}});
  }
  if(m.cmd==="motifArchive"){
   if(!motifArchive)return send("rpc",{id,result:{
    enabled:false,reason:"exact disk witness archive disabled"
   }});
   const digest=String(m.digest||"");
   if(digest){
    if(!/^\\d+:[a-f0-9]{64}$/.test(digest))
     throw Error("Motif lookup requires exact original SHA256 motif id");
    return send("rpc",{id,result:{
     enabled:true,queryId:digest,
     exactOriginalWitness:motifArchive.lookupMotif(digest),
     sourceOnlyNeighbors:motifArchive.related(digest,{
      limit:Number(m.limit||50)
     }),
     physicallyVerifiedSemanticEdges:0,archive:motifArchive.status()
    }});
   }
   return send("rpc",{id,result:{
    ...motifArchive.inspect({view:"motifs",
     offset:Number(m.offset||0),limit:Number(m.limit||50)}),
    archive:motifArchive.status()
   }});
  }
  if(m.cmd==="atlas"){
   // The atlas is the SAME saved native Brain. It is a read-only factual
   // inspector, paginated so tens of thousands of nodes/edges do not
   // overwhelm the original UI or a 4GB VRAM Windows laptop.
   const evidence=engine.cumulativeAtlas({
    view:String(m.view||"attempts"),
    offset:Number(m.offset||0),limit:Number(m.limit||50),
    filter:String(m.filter||"all"),
    search:String(m.search||""),
    attemptId:m.attemptId??null
   });
   return send("rpc",{id,result:{
    ...evidence,sameNativeBrain:true,
    originalPlanner:"Discoverer.shapeGraph",
    allUnknownWorldsMapped:false,
    historicalSamplesBounded:true
   }});
  }
  if(m.cmd==="cumulative"){
   const start=String(m.start||"");
   if(!start.trim()||start.length>4000||!Array.isArray(m.required)||
    m.required.length<1||m.required.length>16)
    throw Error("Cross-maze planning needs observed source and explicit 1..16 goal tokens; no hidden answer");
   const plan=engine.planCumulativeWorld({
    start,required:m.required,allowInferred:!!m.allowInferred,
    maxExpansionDepth:Number(m.maxExpansionDepth||12),
    maxGraphNodes:Number(m.maxGraphNodes||2200),
    includeTopology:!!m.topology
   });
   publish(); // refresh live atlas totals after original V17 path/refusal
   return send("rpc",{id,result:{...plan,originalBrain:true,
    trainedRealOperators:brain.observedTransformations.operators.size,
    noProvidedReferenceAnswer:true,
    fullGeneralLanguageCompetenceProven:false}});
  }
  if(m.cmd==="cumulativeQuestion"){
   const question=String(m.question||"");
   if(!question.trim()||question.length>4000)
    throw Error("Native question-only cumulative navigation needs a 1..4000 character question; never send the answer");
   const prediction=engine.planCumulativeQuestion({
    question,maxGraphNodes:Number(m.maxGraphNodes||2200),
    maxExpansionDepth:Number(m.maxExpansionDepth||18),
    includeTopology:!!m.topology
   });
   publish(); // include question-only attempt in same live atlas
   return send("rpc",{id,result:{...prediction,
    originalBrain:true,goalFromPreviousQuestionExamples:true,
    fullGoldAnswerNotPassed:true,
    independentPhysicalAcceptanceStillRequired:true,
    unrestrictedSemanticAnswerAccuracyProven:false}});
  }
  if(m.cmd==="cumulativeNumeric"){
   const start=String(m.start||"");
   if(!start.trim()||start.length>4000||!Array.isArray(m.numericGoals)||
      m.numericGoals.length<1||m.numericGoals.length>12)
    throw Error("Numeric cumulative goal needs current text and input indices ONLY");
   const plan=engine.planCumulativeNumericWorld({
    start,numericGoals:m.numericGoals,
    maxExpansionDepth:Number(m.maxExpansionDepth||18),
    maxGraphNodes:Number(m.maxGraphNodes||2200),
    includeTopology:!!m.topology
   });
   publish(); // include inferred numeric attempt in same atlas
   return send("rpc",{id,result:{...plan,
    originalBrain:true,noProvidedDependentAnswer:true,
    everyPredictedNumericalStepMustBePhysicallyVerified:true}});
  }
  if(m.cmd==="plan"){
   const start=String(m.start||""),required=m.required;
   if(start.length>4000||!Array.isArray(required)||required.length>16)
    throw Error("Too many goal tokens or too long start; no hidden reference accepted");
   const plan=engine.plan({start,required,includeTopology:!!m.topology});
   const body=m.execute&&plan.found?
    engine.execute(plan,{maxSteps:40,trainNoise:false,enableNoise:true}):null;
   return send("rpc",{id,result:{...plan,body,originalBrain:true,
    realTrainingCorpus:files.map(x=>x.path),sameNativeShapeAlgorithm:true,
    exactUnseenLargeAnswerProven:false,semanticExternalTruthUnverified:true}});
  }
  if(m.cmd==="stop"){stop=true;paused=false;
   if(!running)await checkpoint();
   return send("rpc",{id,result:info()});}
  throw Error("Unknown original hypermaze control "+m.cmd);
 })().catch(err=>send("rpc",{id,error:errText(err)}));
});
try{
 await init();
 if(opts.autoStart&&!done)running=train().finally(()=>{running=null;});
}catch(err){send("fatal",{error:errText(err)});process.exitCode=1;}
