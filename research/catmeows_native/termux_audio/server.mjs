// Braivour / MagicPerspective Termux LOCAL audio conversation lab.
// Node built-ins only. Original V17 Brain + its original Discoverer + actual
// saved 540-episode real CatMeows body + learned 7D audio consequences.
//
// WHAT IT DOES:
//  - microphone / audio upload -> EXACT real 9D physical original WAV sensor
//  - original body experiences sound; its real learned sound-world motions and
//    seven learned auditory physical consequences produce an audible reply
//  - explicit TRAIN makes same Brain.live(), native path observations,
//    original Discoverer.learnStep(), endEpisode() and native 7D delta learning
//  - STOP/SAVE/RESTART whole original v8 checkpoint on device, with no reset
//  - all sound stays on localhost, never sent to a remote inference service
//
// WHAT IT DOES NOT DO:
//  - claim to understand cat semantics or reproduce natural meows reliably
//  - train a new unrelated LLM, audio classifier, TTS or diffusion model
//  - use fake "success" when uploaded audio cannot form a playable route
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Brain} from '../../../v17/transcend/torus-aether/devour/brain.mjs';
import {NativeTemporalAuditoryBody} from '../native_temporal_body.mjs';

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'../../..');
const WORK=path.join(ROOT,'runtime','termux_cat_audio');
const INPUTS=path.join(WORK,'input');
const OUTPUTS=path.join(WORK,'output');
const CKPT=path.join(WORK,'checkpoints','active.v8');
const BACKUP=path.join(WORK,'checkpoints','previous.v8');
const STATE_FILE=path.join(WORK,'state.json');
const PORT=Number(process.env.BRAIVOUR_PORT||8765);
const PYTHON=process.env.BRAIVOUR_PYTHON||'python';
const MAX_UPLOAD=12_000_000;
const ACTION='lived-real-audio-next-state';
const ATLAS='body9d:v1:';
const CHANNELS=9;
const MEDIA_RE=/^[a-z0-9_-]+\.wav$/;

for(const dir of [WORK,INPUTS,OUTPUTS,path.dirname(CKPT)])fs.mkdirSync(dir,{recursive:true});
if(!Number.isInteger(PORT)||PORT<1024||PORT>65535)throw Error('Invalid local Termux port');
if(!fs.existsSync(CKPT))throw Error('Original saved Brain checkpoint absent: '+CKPT+
 '\nInstall first from Braivour_Native_9D_Sound_Transform_WAVs_And_Brain.zip.');
let brain=Brain.load(CKPT);
if(!brain.auditoryBody || !brain.disc || !brain.constructedPaths?.links ||
   !Array.isArray(brain.nativeAuditoryDynamics?.learntActual7Dims) ||
   brain.nativeAuditoryDynamics.learntActual7Dims.length!==7)
 throw Error('Checkpoint must contain the ACTUAL original trained 9D acoustic body, not an empty Brain');
Object.setPrototypeOf(brain.auditoryBody,NativeTemporalAuditoryBody.prototype);
brain.auditoryBody.brain=brain;
let body=brain.auditoryBody;
if(body.seen.length!==144||body.adjacency.length!==144||body.recordingsLived<252)
 throw Error('Original real audio world did not survive full Brain.load()');
let db={recordings:[],responses:[],trainingRuns:[],lastSaved:null};
if(fs.existsSync(STATE_FILE)){
 try{const prior=JSON.parse(fs.readFileSync(STATE_FILE,'utf8'));
  if(Array.isArray(prior.recordings)&&Array.isArray(prior.responses)&&Array.isArray(prior.trainingRuns))
   db=prior;
 }catch(e){console.warn('Optional UI history unreadable:',String(e));}
}
let busy=false,training=null,stopTraining=false;
function utc(){return new Date().toISOString();}
function stateSave(){
 const staged=STATE_FILE+'.new';
 fs.writeFileSync(staged,JSON.stringify(db,null,2));
 fs.renameSync(staged,STATE_FILE);
}
function metric(){
 return {
   status:'REAL_ORIGINAL_BRAIVOUR_RUNNING_LOCALLY',
   loadedOriginalCheckpoint:true,
   originalBrainTrainingEpisodes:brain.disc.episodes,
   realWavsExperiencedInOriginalDataset:252,
   additionalUserAudioClipsAbsorbed:Math.max(0,body.recordingsLived-252),
   soundWorldKnownCells:body.cells.length,
   originalNativeAuditoryGraphObservations:brain.constructedPaths.links.observations,
   originalBrainLives:brain.lived,
   originalNativeDiscovererSelf:brain.disc.self(),
   originalBrainMotorEffects:[0,1,2,3,4,5,6,7].map(a=>brain.disc.effect(a)),
   originalNineAuditoryFeatures:true,
   twoMotorDimensions:true,
   sevenLearnedPhysicalEffectDimensions:true,
   savedCheckpointBytes:fs.statSync(CKPT).size,
   lastSaved:db.lastSaved,
   audioReceived:db.recordings.length,
   audioRepliesGenerated:db.responses.length,
   training,
   busy
 };
}
function py(args,timeout=90_000){
 const z=spawnSync(PYTHON,[path.join(HERE,'audio_codec.py'),...args],
   {cwd:ROOT,encoding:'utf8',timeout,maxBuffer:1_500_000});
 if(z.error)throw Error('Local audio processing failed: '+z.error.message);
 if(z.status!==0)throw Error('Local physical audio sensor / decoder failed: '+
  (z.stderr||z.stdout||'exit '+z.status).slice(-1300));
 return z.stdout.trim();
}
function smallestString(x,max=200){return String(x||'').slice(0,max);}
function insistId(id){
 if(typeof id!=='string'||!/^[a-f0-9]{16}$/.test(id))throw Error('Invalid audio identifier');
 return id;
}
function recordFor(id){
 const entry=db.recordings.find(r=>r.id===insistId(id));
 if(!entry)throw Error('Please upload/record audio first');
 if(!fs.existsSync(entry.perception))throw Error('Uploaded recording is missing from local storage');
 return {...entry,percept:JSON.parse(fs.readFileSync(entry.perception,'utf8'))};
}
function digest(buffer){return crypto.createHash('sha256').update(buffer).digest('hex');}
function random(seed){let x=(seed>>>0)||74117;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};}
function keySet(a,b,ch,value){
 const k=ATLAS+ch+':';
 return [k+'edge:'+a+'>'+b+':current:'+value,
  k+'edge:'+a+'>'+b+':coarse:'+Math.floor(value/3),
  k+'edge:'+a+'>'+b,
  k+'from:'+a+':current:'+value,
  k+'current:'+value];
}
function acousticEdge(originalState,nextState){
 const first=originalState[1]*12+originalState[0],
   second=nextState[1]*12+nextState[0];
 return {from:first,to:second,
  permitted:!!body.seen[first] && !!body.seen[second] &&
    (first===second||body.adjacency[first].some(x=>x.to===second))};
}
function learned7(current,from,to,rand,creativity){
 const result=current.slice(),support=[],deltas=[],graph=brain.constructedPaths.links;
 result[0]=to%12;result[1]=Math.floor(to/12);
 for(let ch=2;ch<CHANNELS;ch++){
  const keys=keySet(from,to,ch,current[ch]);
  let found=null,level=-1;
  for(let i=0;i<keys.length;i++){
   const c=graph.choices(keys[i]).find(x=>x.action===ACTION);
   if(c&&c.total>=[2,2,1,5,8][i]){found=c;level=i;break;}
  }
  let move=0,choiceCount=0;
  if(found){
   choiceCount=found.successors.length;
   let chosen;
   if(creativity<.01||choiceCount<2){
    chosen=found.successors[0]?.to??'delta:0';
   }else{
    // A random sample from the ORIGINAL Brain's own real experienced
    // probabilities. No manually written meow notes/pitches are emitted.
    const temp=.35+creativity*1.75;
    const w=found.successors.map(c=>Math.pow(c.probability,1/temp));
    const sum=w.reduce((s,v)=>s+v,0);
    let p=rand()*sum;
    for(let k=0;k<w.length;k++){
     p-=w[k];if(p<=0){chosen=found.successors[k].to;break;}
    }
    chosen??=found.successors.at(-1).to;
   }
   const match=/^delta:(-?\d+)$/.exec(chosen);
   if(!match)throw Error('Original Brain produced an invalid real acoustic effect');
   move=Number(match[1]);if(move< -11||move>11)throw Error('Native original acoustic effect out of physical bounds');
  }
  result[ch]=Math.max(0,Math.min(11,current[ch]+move));
  support.push({channel:ch,originalNativeGraphLevel:level,nativeSuccessors:choiceCount});
  deltas.push(move);
 }
 return {result,support,deltas};
}
function meanFrame(frames,lo,hi){
 const arr=frames.slice(lo,hi);
 if(!arr.length)throw Error('User sound has no physical measured states');
 return Array.from({length:9},(_,ch)=>arr.reduce((s,f)=>s+f[ch],0)/arr.length);
}
function nearestCell(target,{start=false,origin=null}={}){
 const possible=body.cells.filter(p=>
  (body.majorComponent?.has(p)??true) &&
  (start?body.adjacency[p].length>0 && body.early[p]>0:
     body.terminal[p]>0 && (origin===null||!!body.toWorld(origin,p,1,28))));
 if(!possible.length)return null;
 const scored=possible.map(p=>{
  const f=body.atCell(p);
  let dist=2*Math.abs(f[0]-target[0])+2*Math.abs(f[1]-target[1]);
  // The other seven features determine the initial slice of the original body
  // as well; they are NOT a decorative UI or copied target output.
  for(let ch=2;ch<9;ch++)dist+=.22*Math.abs(f[ch]-target[ch]);
  return {p,dist};
 }).sort((a,b)=>a.dist-b.dist||a.p-b.p);
 return scored[0].p;
}
function chooseHeardRecord(percept){
 if(!percept.records?.length)throw Error('Nothing audible perceived');
 const voiced=percept.records.slice().sort((a,b)=>
    b.sound_energy_mean-a.sound_energy_mean);
 return voiced[0];
}
function conditionedVoice(percept,sha,creativity=0.48){
 const heard=chooseHeardRecord(percept);
 const sequence=heard.frames;
 const beginning=meanFrame(sequence,0,Math.min(12,sequence.length));
 const ending=meanFrame(sequence,Math.max(0,sequence.length-12),sequence.length);
 const start=nearestCell(beginning,{start:true});
 if(start==null)throw Error('No genuinely experienced acoustic body coordinates near the input');
 let wanted=nearestCell(ending,{origin:start});
 if(wanted==null){
  wanted=body.cells.find(p=>body.terminal[p]>0&&!!body.toWorld(start,p,1,28));
 }
 if(wanted==null)throw Error('Original acoustic world cannot reach a real sound state from this recording');
 const prior=db.responses.at(-1)?.sha??'no-prior';
 const signature=sha+':'+prior+':'+db.responses.length;
 const first32=Number.parseInt(crypto.createHash('sha256').update(signature).digest('hex').slice(0,8),16)>>>0;
 const rng=random(first32);
 const livedBefore={lived:brain.lived,episodes:brain.disc.episodes,
    edgeObservations:brain.constructedPaths.links.observations};
 const original=body.dream({seed:first32||17,length:48,start,desired:wanted});
 const first=body.atCell(original.cells[0]);
 const lastHeard=sequence.findLast(f=>f[1]>1)??sequence.at(-1);
 // The first spoken 9D vocal state is ACTUALLY conditioned on the
 // interlocutor's perceived timbre, then moved only by observed effects.
 let bodyState=[first[0],first[1],...lastHeard.slice(2)];
 const generated=[bodyState],effectPaths=[],deltaPaths=[];
 for(let t=1;t<48;t++){
  const from=original.cells[t-1],to=original.cells[t];
  if(from!==to&&!body.adjacency[from].some(x=>x.to===to))
   throw Error('Original Brain attempted to invent an unexperienced sonic world movement');
  const step=learned7(bodyState,from,to,rng,creativity);
  bodyState=step.result;generated.push(bodyState);
  effectPaths.push(step.support);deltaPaths.push(step.deltas);
 }
 if(generated.length!==48 || generated.some(f=>f.length!==9||f.some(n=>n<0||n>11)))
  throw Error('Original native whole acoustic body reply invalid');
 if(brain.lived!==livedBefore.lived||brain.disc.episodes!==livedBefore.episodes||
     brain.constructedPaths.links.observations!==livedBefore.edgeObservations)
  throw Error('Listening illegally retrained the frozen original Braivour Brain');
 const row={
  status:'ORIGINAL_BRAIVOUR_HEARD_AND_ACTED',
  inputAudioSha:sha,
  source:'actual human-provided sound, not assumed to be a cat utterance',
  trainingEpisodesAtReply:brain.disc.episodes,
  originalBrainBody:true,
  directRealNineDimensionalSensoryConditioning:true,
  originalDiscovererSelectedMotorActions:true,
  inputPhysicalSummary:{segments:percept.realClipCount,
    duration_seconds:percept.duration_seconds,
    pitch:heard.sound_pitch_mean,loudness:heard.sound_energy_mean},
  originalNativeBodyStartCell:start,originalNativeBodyGoalCell:wanted,
  nativeMotorActions:original.outputs.length,
  nativeMotorMovements:original.stats.actualBodilySoundMovements,
  nativeSoundGoalsReached:original.stats.genuineSoundGoalsReached,
  originalMotorWorldPaths:original.cells,
  originalOutputSymbols:original.outputs,
  originalNative7dEffectProvenance:effectPaths,
  originalNative7dEffectChanges:deltaPaths,
  originalMotorWorldActionsFollowRealTrainingAcousticGraph:
    original.stats.everyDreamTransitionInNativeActualAudioGraph,
  creativeLevel:creativity,
  semanticTranslationClaim:false,
  naturalFelineVoiceVerified:false,
  renderSeed:first32,frames:generated
 };
 return row;
}
function saveOriginalBrain(){
 if(busy)throw Error('An active original-body training action is still running');
 const tmp=CKPT+'.write';
 const old=body.brain;body.brain=null;
 let bytes;
 try{bytes=brain.save(tmp);}
 finally{body.brain=old;}
 const check=Brain.load(tmp);
 if(!check?.auditoryBody||check.disc.episodes!==brain.disc.episodes||
   check.constructedPaths.links.observations!==brain.constructedPaths.links.observations)
  throw Error('Original Brain checkpoint verification failed; current working checkpoint remains unchanged');
 Object.setPrototypeOf(check.auditoryBody,NativeTemporalAuditoryBody.prototype);
 check.auditoryBody.brain=check;
 const testDream=check.auditoryBody.dream({seed:631911,length:48});
 if(!testDream.stats.everyDreamTransitionInNativeActualAudioGraph)
  throw Error('Restored Brain failed a real native auditory-body dream: refusing to overwrite working checkpoint');
 if(fs.existsSync(BACKUP))fs.rmSync(BACKUP,{force:true});
 if(fs.existsSync(CKPT))fs.copyFileSync(CKPT,BACKUP);
 fs.renameSync(tmp,CKPT);
 db.lastSaved=utc();stateSave();
 return {saved:true,bytes,checkpoint:CKPT,
  originalEpisodes:brain.disc.episodes,
  nativeObservations:brain.constructedPaths.links.observations,
  rollbackCheckpoint:BACKUP};
}
function experienceRealUserAudio(rec){
 const initial={lived:brain.lived,observations:brain.constructedPaths.links.observations,
   episodes:brain.disc.episodes,clips:body.recordingsLived};
 const originals=rec.percept.records;
 const experienced=[];
 for(const item of originals){
  if(item.frames.length!==48)throw Error('Expected original verified 48-frame user audio sensory perception');
  body.absorb({frames:item.frames,name:item.name});
  experienced.push(item);
 }
 body.finishPerception(); // reconstruct real topology from the SAME native Brain learned edges
 const native=brain.constructedPaths.links;
 let physicalPairs=0,unplayablePairs=0,sevenDimNativeObserved=0;
 for(const item of experienced){
  const f=item.frames;
  for(let t=0;t<47;t++){
   const a=f[t][1]*12+f[t][0],b=f[t+1][1]*12+f[t+1][0];
   if(!(a===b||body.adjacency[a].some(x=>x.to===b))){unplayablePairs++;continue;}
   physicalPairs++;
   for(let ch=2;ch<9;ch++){
    const to='delta:'+(f[t+1][ch]-f[t][ch]);
    for(const key of keySet(a,b,ch,f[t][ch])){
     if(!native.observe(key,ACTION,to))
      throw Error('Original native graph could not learn a real auditory action consequence');
     sevenDimNativeObserved++;
    }
   }
  }
 }
 return {initial,originalRealSoundClipsAbsorbed:experienced.length,
  genuineAudioMotorTransitionPairs:physicalPairs,
  physicallyUnsupportedLargerAudioJumps:unplayablePairs,
  originalNativeAuditorySevenDimEffectObservations:sevenDimNativeObserved,
  after:{lived:brain.lived,observations:native.observations,
     episodes:brain.disc.episodes,clips:body.recordingsLived}};
}
function possibleEpisodes(rec){
 const tasks=[];
 for(const r of rec.percept.records){
  let e=body.fromRecording(r,{difficulty:'full'});
  if(!e)e=body.fromRecording(r,{difficulty:'near'});
  if(e)tasks.push(e);
 }
 return tasks;
}
async function startTraining(id,episodes){
 if(busy)throw Error('Another audio operation is in progress');
 const rec=recordFor(id);
 const count=Math.max(1,Math.min(150,Math.trunc(Number(episodes)||25)));
 busy=true;stopTraining=false;
 training={id,started:utc(),requestedGames:count,gamesPlayed:0,
   solved:0,failures:0,status:'absorbing_real_audio',
   recent:[],originalEpisodesBefore:brain.disc.episodes};
 try{
  const observation=experienceRealUserAudio(rec);
  const tasks=possibleEpisodes(rec);
  training.originalSoundLearning=observation;
  training.playableTargetsExtractedFromActualAudio=tasks.length;
  training.status='playing_original_body_games';
  stateSave();
  for(let n=0;n<count;n++){
   if(stopTraining){training.status='stopped_by_user';break;}
   if(!tasks.length){training.status='no_reachable_real_audio_game_goals';break;}
   const task=tasks[n%tasks.length];
   const result=body.train(task);
   training.gamesPlayed++;training.solved+=Number(result.solved);
   training.failures+=Number(!result.solved);
   training.recent.push({game:n+1,solved:result.solved,
     steps:result.steps,shortestRealAudioPath:result.optimal});
   if(training.recent.length>30)training.recent.shift();
   if(n%3===0)await new Promise(resolve=>setImmediate(resolve));
  }
  training.status=training.status==='playing_original_body_games'?'saving':'saving_after_'+training.status;
  busy=false;
  const save=saveOriginalBrain();
  training.checkpointSaved=save.saved;
  training.savedAt=utc();
  training.totalOriginalEpisodesAfter=brain.disc.episodes;
  training.status=training.status.startsWith('saving_after_')?training.status.slice(13):'completed';
  db.trainingRuns.push({...training});
  db.trainingRuns=db.trainingRuns.slice(-100);
  stateSave();
 }catch(e){
  training.status='failed';
  training.error=String(e?.stack||e).slice(0,1200);
  db.trainingRuns.push({...training});
  stateSave();
  console.error('Actual original Brain training error:',e);
 }finally{busy=false;}
}
function respond(res,status,body,extra={}){
 const encoded=JSON.stringify(body);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra});
 res.end(encoded);
}
function requestJson(req,limit=8_000){
 return new Promise((resolve,reject)=>{
  const parts=[];let total=0;
  req.on('data',p=>{
   total+=p.length;
   if(total>limit){reject(Error('Request too large'));req.destroy();return;}
   parts.push(p);
  });
  req.on('end',()=>{
   try{resolve(JSON.parse(Buffer.concat(parts).toString('utf8')));}
   catch{reject(Error('Invalid JSON body'));}
  });
  req.on('error',reject);
 });
}
function requestAudio(req){
 return new Promise((resolve,reject)=>{
  const pieces=[];let total=0;
  req.on('data',p=>{
   total+=p.length;
   if(total>MAX_UPLOAD){reject(Error('Audio exceeds the 12 MB local limit'));req.destroy();return;}
   pieces.push(p);
  });
  req.on('end',()=>resolve(Buffer.concat(pieces)));
  req.on('error',reject);
 });
}
function validOrigin(req){
 const o=req.headers.origin;
 if(!o)return true;
 return o==='http://127.0.0.1:'+PORT||o==='http://localhost:'+PORT;
}
async function serve(req,res){
 try{
  if(!validOrigin(req))return respond(res,403,{error:'Only the local phone web interface may control the Brain'});
  const url=new URL(req.url,'http://127.0.0.1:'+PORT);
  if(req.method==='GET'&&url.pathname==='/'){
   res.writeHead(200,{'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   fs.createReadStream(path.join(HERE,'index.html')).pipe(res);return;
  }
  if(req.method==='GET'&&url.pathname==='/api/status')
   return respond(res,200,{...metric(),recentRecordings:db.recordings.slice(-12).map(r=>({
     id:r.id,created:r.created,seconds:r.seconds,clips:r.clips,shaPrefix:r.sha.slice(0,12)})),
    recentResponses:db.responses.slice(-12).map(x=>({id:x.id,forRecording:x.forRecording,
     audio:x.audio,created:x.created,nativeActions:x.nativeActions,start:x.start,goal:x.goal})),
    lastTrainingRun:db.trainingRuns.at(-1)??null});
  if(req.method==='GET'&&url.pathname.startsWith('/api/output/')){
   const file=decodeURIComponent(url.pathname.slice('/api/output/'.length));
   if(!MEDIA_RE.test(file))return respond(res,400,{error:'Invalid local audio file'});
   const filename=path.join(OUTPUTS,file);
   if(!fs.existsSync(filename))return respond(res,404,{error:'Original Brain did not generate that recording'});
   res.writeHead(200,{'Content-Type':'audio/wav','Content-Disposition':'inline',
     'Cache-Control':'no-store','Content-Length':fs.statSync(filename).size});
   fs.createReadStream(filename).pipe(res);return;
  }
  if(req.method!=='POST')return respond(res,404,{error:'Unknown local Brain operation'});
  if(req.headers['content-type']?.startsWith('application/json')===false &&
      url.pathname!=='/api/upload')return respond(res,415,{error:'Expected JSON'});
  if(url.pathname==='/api/upload'){
   if(busy)return respond(res,409,{error:'Original Brain is training. Please stop or finish first.'});
   busy=true;
   try{
    const buf=await requestAudio(req);
    if(buf.length<600)throw Error('The audio recording is empty or too short');
    const sha=digest(buf),id=sha.slice(0,16);
    let item=db.recordings.find(r=>r.id===id);
    if(!item){
     const file=path.join(INPUTS,id+'.audio');
     fs.writeFileSync(file,buf);
     const perception=path.join(INPUTS,id+'.json');
     py(['sense',file,perception]);
     const sensory=JSON.parse(fs.readFileSync(perception,'utf8'));
     item={id,sha,created:utc(),file,perception,
       seconds:sensory.duration_seconds,clips:sensory.realClipCount};
     db.recordings.push(item);db.recordings=db.recordings.slice(-160);
     stateSave();
    }
    return respond(res,200,{ok:true,recording:{id:item.id,created:item.created,
     duration_seconds:item.seconds,realClips:item.clips,shaPrefix:item.sha.slice(0,12)}});
   }finally{busy=false;}
  }
  if(url.pathname==='/api/reply'){
   if(busy)return respond(res,409,{error:'Original Brain is training'});
   const q=await requestJson(req),rec=recordFor(q.id);
   const c=Math.max(0,Math.min(1,Number(q.creativity??.48)));
   busy=true;
   try{
    const speech=conditionedVoice(rec.percept,rec.sha,c);
    const id=crypto.randomBytes(8).toString('hex');
    const base='braivour_'+id;
    const description=path.join(OUTPUTS,base+'.json');
    const audio=path.join(OUTPUTS,base+'.wav');
    fs.writeFileSync(description,JSON.stringify(speech,null,2));
    const log=py(['render',description,audio]);
    const reply={id,forRecording:rec.id,created:utc(),sha:digest(fs.readFileSync(audio)),
     audio:'/api/output/'+base+'.wav',
     nativeActions:speech.nativeMotorActions,
     start:speech.originalNativeBodyStartCell,goal:speech.originalNativeBodyGoalCell,
     inputPitch:speech.inputPhysicalSummary.pitch,
     inputLoudness:speech.inputPhysicalSummary.loudness,
     originalNativeEffects:speech.originalNative7dEffectProvenance.flat()
      .filter(x=>x.originalNativeGraphLevel>=0).length,
     actualSevenDimensionalFeatures:7,
     nativeWholeAcousticActionWorld:speech.originalMotorWorldActionsFollowRealTrainingAcousticGraph};
    db.responses.push(reply);db.responses=db.responses.slice(-160);
    stateSave();
    console.log('BRAIVOUR_ACTUAL_INPUT_CONDITIONED_VOICE '+JSON.stringify(reply));
    return respond(res,200,{ok:true,reply,note:'Experimental audio, not decoded cat language'});
   }finally{busy=false;}
  }
  if(url.pathname==='/api/train'){
   if(busy)return respond(res,409,{error:'Original Brain is already engaged in an audio operation'});
   const q=await requestJson(req),id=insistId(q.id);
   const r=recordFor(id);
   const games=Math.min(150,Math.max(1,Math.round(Number(q.episodes)||25)));
   // Queue next tick so HTTP returns before actually teaching the ORIGINAL Brain.
   setImmediate(()=>{startTraining(r.id,games).catch(e=>console.error(e));});
   return respond(res,202,{accepted:true,recordingId:id,episodes:games,
    note:'Original saved Brain will genuinely experience this audio, play available target games, then save'});
  }
  if(url.pathname==='/api/stop'){
   stopTraining=true;
   return respond(res,200,{stopRequested:true,training});
  }
  if(url.pathname==='/api/save'){
   const saved=saveOriginalBrain();
   return respond(res,200,saved);
  }
  return respond(res,404,{error:'Unknown local Brain command'});
 }catch(e){
  console.error('Braivour local audio error:',e);
  if(!res.headersSent)respond(res,500,{error:String(e.message||e).slice(0,800)});
  else res.destroy();
 }
}
const server=http.createServer((req,res)=>{serve(req,res).catch(e=>{
 console.error(e);if(!res.headersSent)respond(res,500,{error:String(e.message||e)});
})});
server.listen(PORT,'127.0.0.1',()=>{
 console.log('BRAIVOUR_TERMUX_ORIGINAL_BRAIN_READY '+JSON.stringify({
  url:'http://127.0.0.1:'+PORT,
  originalEpisodes:brain.disc.episodes,
  originalNativeAcousticObservations:brain.constructedPaths.links.observations,
  checkpoint:CKPT,checkpointBytes:fs.statSync(CKPT).size,
  original9DAuditoryBody:true,
  note:'All computation and real audio stay local on this phone.'}));
});
process.on('SIGINT',()=>{
 console.log('BRAIVOUR_TERMUX_SERVER_STOPPED; checkpoint last saved by explicit SAVE or TRAIN');
 server.close(()=>process.exit(0));
});
