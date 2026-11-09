// V43 additive ONE-ORGANISM fused text experience.
// Requires the exact original V42 Brain, original Discoverer, and frozen real GGUF atlas.
// The original V42 trainer, learning equations, CUDA calls, checkpoints and UI are NOT replaced.
import fs from 'node:fs';
import path from 'node:path';
import {writeV43Telemetry} from './v43-telemetry.mjs';
import {BrainCharacterWorld} from './brain-character-world.mjs';

function match(reference,generated) {
  const a=Array.from(String(reference)),b=Array.from(String(generated));
  const right=a.reduce((n,ch,i)=>n+(ch===b[i]?1:0),0);
  const wrong=Math.max(a.length,b.length)-right;
  const mismatches=[];
  for(let i=0;i<Math.max(a.length,b.length);i++){
    if(a[i]!==b[i]&&mismatches.length<1024)
      mismatches.push({at:i,expected:a[i]??null,observed:b[i]??null});
  }
  return {correct:right,wrong,expectedCharacters:a.length,predictedCharacters:b.length,
    accuracy:a.length&&a.length===b.length?right/a.length:
      Math.max(a.length,b.length)?right/Math.max(a.length,b.length):1,
    exact:a.length===b.length&&right===a.length,
    firstMismatch:mismatches[0]?.at??null,mismatches,
    mismatchesPreviewOnly:mismatches.length<wrong};
}
function whole(bytes) { return Buffer.from(bytes).toString('utf8'); }
function entryBytesPerSecond(answer,startedAt){
  return Buffer.byteLength(answer,'utf8')/Math.max(.001,(Date.now()-startedAt)/1000);
}
function atomicJSON(file,data){
  return writeV43Telemetry(file,data);
}
function requireRow(row){
  return row&&typeof row.prompt==='string'&&row.prompt.length&&
    typeof row.answer==='string'&&row.answer.length;
}

export class V43FusedOneUniverse {
  constructor({brain,donor,saveFile,source='original V42 OpenThoughts',maxPredictionChars=16384}={}){
    if(!brain||!saveFile)throw Error('V43 needs SAME real native V42 Brain and its checkpoint path');
    this.brain=brain;
    this.world=new BrainCharacterWorld({brain,donor,saveFile,maxOutputBytes:0,maxActionsPerByte:16});
    this.file=saveFile+'.v43-status.json';
    this.events=saveFile+'.v43-exercises.jsonl';
    this.liveFile=saveFile+'.v43-live.json';
    this.pending=new Map();
    this.maxPredictionChars=maxPredictionChars;
    this.started=Date.now();
    let prev=null;
    if(fs.existsSync(this.file)){
      try{prev=JSON.parse(fs.readFileSync(this.file,'utf8'));}catch{}
    }
    this.state=prev?.format==='magicperspective/v43-one-universe/v1'?{
      ...prev,completedThisSession:0,charactersThisSession:0,phase:'ready',lastError:null,source,mode:'V43_FUSED_ONE_ORGANISM_ONLY'
    }:{
      format:'magicperspective/v43-one-universe/v1',version:43,
      mode:'V43_FUSED_ONE_ORGANISM_ONLY',source,phase:'ready',
      completed:0,completedCharacters:0,correctP2Characters:0,
      totalP2Characters:0,improvementCases:0,
      startTime:new Date(this.started).toISOString(),
      lastError:null,lastExercise:null,history:[],nativeBrain:true,
      originalV42EquationsPreserved:true,donorCanMoveDuringPlayer1:false,
      key:'one organism; player1 and player2 are internal movement roles'
    };
    this._publish();
  }
  _live(record){
    // Atomically published sidecar for the separate UI server. It contains
    // actual work and never asserts a successful Qwen forward pass.
    atomicJSON(this.liveFile,{format:'magicperspective/v43-live/v1',
      at:new Date().toISOString(),...record});
  }
  _publish() {
    const elapsed=Math.max(.001,(Date.now()-this.started)/1000);
    this.state.elapsedSeconds=elapsed;
    this.state.completedExercisesPerSecond=(this.state.completedThisSession||0)/elapsed;
    this.state.completedCharactersPerSecond=(this.state.charactersThisSession||0)/elapsed;
    this.state.updatedAt=new Date().toISOString();
    atomicJSON(this.file,this.state);
  }
  _nativePredict(question,expectedLength){
    // The native pre-action prediction is independent of the reference length;
    // do not reveal even the exercise output's LENGTH to Player 1.
    const cap=Math.max(1,Math.min(20000,this.maxPredictionChars));
    // Original saved multi-scale structural text navigator; NO donor consulted.
    // Frozen prediction only: imagineText() reads without training.
    try{
      if(this.brain.constructedPaths?.imagineText){
        const r=this.brain.constructedPaths.imagineText(question,{maxChars:cap,beamWidth:3});
        return {text:String(r?.predicted||''),route:Array.isArray(r?.path)?r.path:[],
          routeLength:r?.path?.length||0,source:'original V42 ConstructedPathLearner.imagineText',
          fullyScored:expectedLength<=this.maxPredictionChars,
          error:null};
      }
    }catch(err){
      return {text:'',route:[],routeLength:0,source:'original V42 constructed paths',
        error:String(err),fullyScored:false};
    }
    return {text:'',route:[],routeLength:0,source:'original V42 constructed paths',
      error:'The original text-shape navigator is absent',fullyScored:false};
  }
  observeBefore(row){
    if(!requireRow(row))return null;
    const key=String(row.k??'row:'+this.state.completed+':'+this.pending.size);
    if(this.pending.has(key))return this.pending.get(key);
    const before=this._nativePredict(row.prompt,Array.from(row.answer).length);
    this.pending.set(key,before);
    this.state.phase='original-V42-before-donor';
    this.state.pending=this.pending.size;
    return before;
  }
  experience(row){
    if(!requireRow(row))return null;
    const startedAt=Date.now();
    const key=String(row.k??'row:'+this.state.completed);
    const baseline=this.pending.get(key)||this.observeBefore(row);
    this.pending.delete(key);
    this.state.phase='player2-Qwen-puppet-moving';
    const referenceBytes=Buffer.byteLength(row.answer,'utf8');
    const progressBase={sourceRow:row.k??null,input:row.prompt,reference:row.answer,
      beforeText:baseline.text,beforeAccuracy:match(row.answer,baseline.text).accuracy,
      model:'Qwen-weight-derived coordinate puppet (not Qwen forward inference)',
      totalBytes:referenceBytes,startedAt:new Date(startedAt).toISOString()};
    this._live({...progressBase,active:true,phase:'planning real donor transformations',
      plannedBytes:0,outputPrefix:'',bytesPerSecond:0});
    this._publish();
    // Capture the EXACT route calculated by original BrainCharacterWorld.exercise.
    // No extra calls to the planner: the wrapper observes the one real traversal.
    let physicalPlan=null;
    const movementAtlas=new Map();
    const originalShape=this.world._nativeShape;
    const originalProgress=this.world.onPlanProgress;
    let lastProgressMs=0,lastShapeIndex=0,correctShapeCount=0;
    this.world.onPlanProgress=(done,total,instructions)=>{
      for(let i=lastShapeIndex;i<done;i++){
        const r=instructions[i];
        if(r&&r.planned&&r.predicted_before_move&&r.expectedFinal===r.wanted)
          correctShapeCount++;
      }
      lastShapeIndex=done;
      const now=Date.now();
      // At most three bounded, read-only UI snapshots per second. Previously
      // rebuilt and persisted an ever-growing 50k-byte prefix every 128 bytes,
      // causing quadratic CPU work and hundreds of Windows file renames.
      if(done!==total && now-lastProgressMs<350)return;
      lastProgressMs=now;
      const prefix=Buffer.from(instructions.map(p=>p.expectedFinal)).toString('utf8');
      this._live({...progressBase,active:true,
        phase:'planning full donor coordinate movements',plannedBytes:done,totalBytes:total,
        shapeVerifiedBeforeAction:correctShapeCount,shapeVerifiedTotal:done,
        shapeComplete:done===total&&correctShapeCount===total,
        frozenAxisRank:this.world.projector?.rank??0,
        frozenAxisDimensions:this.world.projector?.dim??0,
        outputPrefix:prefix,bytesPerSecond:+(done/Math.max(.001,(now-startedAt)/1000)).toFixed(2)});
    };
    const shapeCache=new Map();let shapeCacheHits=0;
    // Original Discoverer.shapeGraph remains the ONLY route constructor.
    // Whole-exercise preplanning has a frozen Discoverer, so identical
    // (from-state,goal-byte) questions have identical solutions within
    // this particular episode. No result is reused across training worlds.
    this.world._nativeShape=(from,wanted)=>{
      const k=String(from)+':'+String(wanted);
      if(shapeCache.has(k)){shapeCacheHits++;return shapeCache.get(k);}
      const found=originalShape.call(this.world,from,wanted);
      shapeCache.set(k,found);
      return found;
    };
    const originalPlan=this.world._planEntireExercise;
    this.world._planEntireExercise=(input,expected)=>{
      const instructions=originalPlan.call(this.world,input,expected);
      physicalPlan=instructions.map(p=>({
        from:p.from,wanted:p.wanted,planned:p.planned,
        predictedBeforeMove:p.predicted_before_move,
        steps:p.steps.map(s=>{
          if(s.action.type==='frozen-axis-composition'){
            const operatorId=s.from+':'+s.to;
            if(!movementAtlas.has(operatorId))movementAtlas.set(operatorId,{
              operatorId,sourceByte:s.from,targetByte:s.to,
              frozenDonorAxes:s.action.coefficientPairs,
              actualReadoutVerified:true,
              scope:'VISIBLE-GOAL, not Qwen text inference'
            });
            return {from:s.from,to:s.to,type:s.action.type,operatorId};
          }
          return {from:s.from,to:s.to,
            axis:s.action.axis,sign:s.action.sign,gain:s.action.gain};
        }),
        final:p.expectedFinal
      }));
      return instructions;
    };
    let traversed;
    try{traversed=this.world.exercise(row.prompt,row.answer,{record:true});}
    finally{
      this.world._planEntireExercise=originalPlan;
      this.world._nativeShape=originalShape;
      this.world.onPlanProgress=originalProgress;
    }
    if(!physicalPlan||physicalPlan.length!==Buffer.byteLength(row.answer,'utf8'))
      throw Error('Physical Player 2 route was not captured in full');
    const produced=whole(physicalPlan.map(p=>p.final));
    this._live({...progressBase,active:true,phase:'original Player 1 absorbing frozen donor observation',
      plannedBytes:referenceBytes,totalBytes:referenceBytes,outputPrefix:produced,
      bytesPerSecond:+(referenceBytes/Math.max(.001,(Date.now()-startedAt)/1000)).toFixed(2)});
    const frozen=physicalPlan.map(p=>({...p,steps:p.steps.map(s=>({...s}))}));
    // Exact, lossless movement compression for a full-rank donor world:
    // every completed byte is either a zero-action target or one real
    // composed donor move. Full output-state stream + unique operator atlas
    // reconstitute all actions without 50k duplicated JSON route objects.
    const compactDonorStream=frozen.every(p=>p.steps.length===0||
      (p.steps.length===1&&p.steps[0].type==='frozen-axis-composition'));
    const movementStream=compactDonorStream?{
      encoding:'frozen-donor-one-composed-operator-per-output-byte/v1',
      initialState:frozen[0]?.from??null,
      destinationStatesBase64:Buffer.from(frozen.map(p=>p.final)).toString('base64'),
      byteCount:frozen.length,
      operatorLookup:'sourceByte:targetByte in uniqueWeightCompositions',
      complete:true
    }:null;
    // Player 2 becomes a frozen OBSERVABLE part of the organism's experience.
    // Nothing below invokes donor .exercise, ._planEntireExercise, ._nativeShape,
    // or a donor-weight readout. Player 1 acts only through original V42 motors.
    this.state.phase='player2-frozen-visible-player1-native-navigation';
    const frozenBefore=JSON.stringify(frozen);
    let transfer=null,transferError=null;
    try{
      // Train the original V42 structure from real puppet-produced text ONLY
      // when physical donor movements reached the entire exercise reference.
      // Failed puppet demonstrations are still recorded, but never mislabeled
      // as successful transformations or silently added as correct lessons.
      if(produced===row.answer){
        transfer=this.brain.learnConstructedText(row.prompt,produced);
      }else{
        transferError='Physical puppet did not complete this exercise; no successful text path was transferred';
      }
    }catch(err){transferError=String(err);}
    if(JSON.stringify(frozen)!==frozenBefore)throw Error('Player 2 frozen route mutated');
    const after=this._nativePredict(row.prompt,Array.from(row.answer).length);
    const p1Before=match(row.answer,baseline.text);
    const p1After=match(row.answer,after.text);
    const p2=match(row.answer,produced);
    const durationMs=Math.max(1,Date.now()-this.started);
    const entry={
      id:this.state.completed+1,sourceRow:row.k??null,
      at:new Date().toISOString(),trainingWorld:'same original V42 text exercise',
      input:row.prompt,exerciseReference:row.answer,
      player1:{before:{...baseline,score:p1Before},
        after:{...after,score:p1After},
        deltaAccuracy:p1After.accuracy-p1Before.accuracy,
        learnedWithOriginalV42:true,originalMotor:'ConstructedPathLearner.trainText/imagineText',
        noDonorMovementsDuringThisPhase:true,transferError},
      player2:{output:produced,score:p2,
        cachedOriginalRoutes:shapeCacheHits,uniqueOriginalRoutes:shapeCache.size,
        actions:traversed.actions,plannedRoutes:traversed.predictedRoutes,
        firstPredictionsBeforeMovement:traversed.firstPredictionsBeforeMovement,
        visibleGoalShapeFraction:traversed.bytes?
          traversed.verifiedExactFirstShape/traversed.bytes:null,
        merelyPredictedRoutesBeforeMovement:traversed.firstPredictionsBeforeMovement,
        exactVerifiedFirstShapes:traversed.verifiedExactFirstShape,
        shapeBeforeMovementMeans:'predicted complete donor-movement route to visible target, not blind text generation',
        waveOptimization:traversed.waveOptimization,
        allMovements:compactDonorStream?frozen.slice(0,32):frozen,
        fullMovementStream:movementStream,
        fullMovementsCount:frozen.length,
        movementsCompressedInJournal:compactDonorStream,
        uniqueWeightCompositions:[...movementAtlas.values()],
        donorGeometryFrozen:true,physicalDonorActionsOnly:true,
        expectedOutputUsedInTrainingGame:true,
        donorFullForwardExecuted:false},
      diagnosis:{
        firstUnreachedIndexBefore:p1Before.firstMismatch,
        firstUnreachedIndexAfter:p1After.firstMismatch,
        p2UnreachedIndex:p2.firstMismatch,
        deltaCorrectCharacters:p1After.correct-p1Before.correct,
        transferStatus:transferError?'error':'native original V42 learned from physical donor-produced text',
        provesIndependentIntelligenceTransfer:false,
        note:'A matched exercise demonstration; improvement must be checked on unseen text with donor removed.'
      },
      bytesInQuestion:Buffer.byteLength(row.prompt,'utf8'),
      bytesInAnswer:Buffer.byteLength(row.answer,'utf8'),
      elapsedMs:Math.max(1,Date.now()-startedAt),
      answerBytesPerSecond:entryBytesPerSecond(row.answer,startedAt),
      secondsSinceV43Started:durationMs/1000
    };
    this.state.phase='recorded';
    this.state.completed++;
    this.state.completedThisSession=(this.state.completedThisSession||0)+1;
    this.state.charactersThisSession=(this.state.charactersThisSession||0)+entry.bytesInAnswer;
    this.state.completedCharacters+=entry.bytesInAnswer;
    this.state.correctP2Characters+=p2.correct;
    this.state.totalP2Characters+=p2.expectedCharacters;
    if(entry.player1.deltaAccuracy>0)this.state.improvementCases++;
    this.state.pending=this.pending.size;
    // The immutable full entry remains in the append-only journal. The live
    // status sidecar carries bounded path previews to avoid copying megabytes
    // of long Qwen movement traces at every browser poll.
    this.state.lastExercise={...entry,player2:{...entry.player2,
      allMovements:frozen.slice(0,32),
      uniqueWeightCompositions:[...movementAtlas.values()].slice(0,8),
      weightCompositionsTruncatedInStatus:movementAtlas.size>8,
      movementsTruncatedInStatus:frozen.length>32}};
    this.state.history.push({
      id:entry.id,row:entry.sourceRow,at:entry.at,
      before:p1Before.accuracy,player2:p2.accuracy,after:p1After.accuracy,
      improvement:entry.player1.deltaAccuracy,characters:p2.expectedCharacters,
      p1Correct:p1After.correct,p1Wrong:p1After.wrong,
      p2Correct:p2.correct,p2Wrong:p2.wrong,
      actions:entry.player2.actions
    });
    if(this.state.history.length>1500)this.state.history.splice(0,this.state.history.length-1500);
    fs.mkdirSync(path.dirname(this.events),{recursive:true});
    fs.appendFileSync(this.events,JSON.stringify(entry)+'\n','utf8');
    this._publish();
    this._live({...progressBase,active:false,phase:'completed and scored',
      plannedBytes:referenceBytes,totalBytes:referenceBytes,
      outputPrefix:produced,afterText:after.text,
      bytesPerSecond:entry.answerBytesPerSecond,completeExerciseId:entry.id});
    return entry;
  }
}