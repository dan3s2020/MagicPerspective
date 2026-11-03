// Brain Studio local orchestrator. Every episode trains a real model or is a real blind test.
// Existing V1–V7 applications and original checkpoint files are never modified.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,rename,writeFile,mkdir} from 'node:fs/promises';
import {existsSync,createReadStream} from 'node:fs';
import {Vault,detect} from './engine/vault.mjs';
import {makeBrain,restoreBrain,oneEpisode,blindTest,brainStats,functionSamples,KINDS,DOMAINS} from './engine/studio.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot=path.resolve(root,'../..');
const data=process.env.DATA_DIR?path.resolve(process.env.DATA_DIR):path.join(root,'data');
const vault=new Vault(repositoryRoot,data);
const activeFile=path.join(data,'active.json'),host=process.env.HOST||'127.0.0.1';
const port=Number(process.env.PORT||3044);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid port');
await vault.setup();
let kind='universal',brain=makeBrain(kind,19),selection='unsaved',readOnlyArchive=null;
let history=[],last=null,preview=null,lastTest=null,validation=null,bestFitness=Infinity,
 traceSequence=0,traces=[],previewOrigin=null,
 notes='Creier partajat inițializat.',revision=0;
let run={status:'stopped',unlimited:false,done:0,target:0,domains:DOMAINS.slice(),size:11,
 autosaveEvery:10,previewEvery:2,delayMs:40,seedCursor:1000000,reservedUntil:1000000,started:null,error:null,savedAt:null};
let startAt=Date.now(),last25=[],recentOutcomes=[],training=null,writeTail=Promise.resolve(),shuttingDown=false;
const bounded=(v,lo,hi,otherwise)=>Number.isInteger(Number(v))&&Number(v)>=lo&&Number(v)<=hi?Number(v):otherwise;
const chosenDomains=raw=>Array.isArray(raw)&&raw.every(x=>DOMAINS.includes(x))&&raw.length?
 [...new Set(raw)]:DOMAINS.slice();
const sampleWeights=()=>{if(!brain)return [];
 const w=brainStats(kind,brain).weights;return Object.values(w).flatMap(x=>x||[]).slice(0,512);}
const weightDistance=(a,b)=>Math.sqrt(a.reduce((sum,n,i)=>sum+(n-(b[i]??n))**2,0));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pauseTick=()=>new Promise(resolve=>setImmediate(resolve));
const copyState=()=>{
 const model=brain?brainStats(kind,brain):null;
 const now=Date.now(),done=run.done,dt=(now-startAt)/1000,rolling=last25.length?
  last25.reduce((a,b)=>a+b,0)/last25.length:null;
 return {version:'brain-studio-1',selected:selection,kind,trainable:!!brain,
  notes,model,run:{...run},timing:{elapsedSeconds:+dt.toFixed(2),
   episodesPerSecond:rolling?+(1000/rolling).toFixed(3):0,
   millisecondsPerEpisode:rolling?+rolling.toFixed(1):null},
  history:history.slice(-240),last,preview,previewOrigin,traceSequence,lastTest,validation,
  bestFitness:Number.isFinite(bestFitness)?bestFitness:null,
  functionCurve:brain?functionSamples(kind,brain,{domain:run.domains[0]}):[],
  weightsDelta:history.at(-1)?.weightDelta??0,revision};
};
async function atomic(file,object){
 const tmp=file+'.tmp';await mkdir(path.dirname(file),{recursive:true});
 await writeFile(tmp,JSON.stringify(object),'utf8');await rename(tmp,file);
}
function save(){
 run.savedAt=new Date().toISOString();
 const snapshot={schema:'studio-1',kind,selection,
  snapshot:brain?.snapshot()||readOnlyArchive,
  history:history.slice(-300),recentOutcomes:recentOutcomes.slice(-100),notes,
  run:{...run,status:'paused'},lastTest,validation,bestFitness,revision};
 writeTail=writeTail.catch(e=>console.error('Previous checkpoint failed',e))
  .then(()=>atomic(activeFile,snapshot));
 return writeTail;
}
if(existsSync(activeFile)){
 try{
  const stored=JSON.parse(await readFile(activeFile,'utf8'));
  const restored=detect(stored.snapshot);
  kind=stored.kind;
  if(kind==='archive'){brain=null;readOnlyArchive=restored.snapshot;selection=stored.selection||'archive';}
  else{
   if(kind!==restored.kind||!KINDS.includes(kind))throw Error('Active brain schema mismatch');
   brain=restoreBrain(kind,restored.snapshot);selection=stored.selection||'autosaved';
  }
  history=Array.isArray(stored.history)?stored.history.slice(-300):[];
  recentOutcomes=Array.isArray(stored.recentOutcomes)?stored.recentOutcomes.slice(-100):[];
  lastTest=stored.lastTest||null;validation=stored.validation||null;
  bestFitness=Number.isFinite(stored.bestFitness)?stored.bestFitness:Infinity;
  notes='Creier restaurat din checkpoint local.';
  run={...run,...stored.run,status:'paused',error:null};
  // After any process restart, abandon the unused remainder of the reserved
  // seed block. If Android killed Termux between autosaves, no old seed is replayed.
  run.seedCursor=Math.max(run.seedCursor||0,run.reservedUntil||0);
  run.reservedUntil=run.seedCursor;
 }catch(e){notes='Checkpoint anterior incompatibil (nu este șters): '+e.message;
  console.error(notes);brain=makeBrain('universal',19);kind='universal';selection='unsaved';}
}
function allowTraining(domain){if(kind==='universal')return DOMAINS.includes(domain);
 if(kind==='v7'||kind==='v6')return domain==='maze'||domain==='relief';
 if(kind==='causal')return domain==='text';return domain==='network';}
function nextDomain(index){
 const available=kind==='universal'?run.domains:
  kind==='v7'||kind==='v6'?['maze','relief']:
  kind==='causal'?['text']:['network'];
 return available[index%available.length];
}
function trial(){
 if(!brain)throw Error('No compatible brain selected');
 const seed=((33000001+Math.imul(run.seedCursor++,7919))>>>0);
 const domain=nextDomain(run.done);
 const before=sampleWeights();
 const t0=performance.now();
 const output=oneEpisode(kind,brain,{domain,seed,size:run.size,learn:true,
  explore:Math.max(.06,.24*Math.exp(-.0003*(brain.episodes||0)))});
 const elapsed=performance.now()-t0;
 last25.push(elapsed);if(last25.length>25)last25.shift();
 const delta=weightDistance(before,sampleWeights());
 run.done++;revision++;
 recentOutcomes.push(output.outcome.solved?1:0);if(recentOutcomes.length>100)recentOutcomes.shift();
 last={episode:brain.episodes,domain,seed,outcome:output.outcome,
  elapsedMs:+elapsed.toFixed(2),weightDelta:+delta.toFixed(6)};
 if(run.done===1||run.done%run.previewEvery===0){
  preview={meta:output.meta,outcome:output.outcome,frames:output.frames.slice(-90),
   lastInput:output.lastInput,episode:brain.episodes};
  previewOrigin='training';
  const item={id:++traceSequence,kind,episode:brain.episodes,
   preview};
  traces.push(item);if(traces.length>32)traces.shift();
 }
 if(run.done===1||run.done%5===0){
  const recent=recentOutcomes;
  history.push({episode:brain.episodes,runEpisode:run.done,at:new Date().toISOString(),domain,
   success:+mean(recent).toFixed(4),
   loss:output.outcome.loss,weightDelta:+delta.toFixed(6),
   millisecondsPerEpisode:+elapsed.toFixed(2),
   episodesPerSecond:elapsed>0?+(1000/elapsed).toFixed(3):null,outcome:output.outcome});
  if(history.length>300)history.shift();
 }
 return output;
}
function mean(values){return values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)}
async function execute(){
 if(training)return training;
 training=(async()=>{
  try{
   while(run.status==='running'&&!shuttingDown){
    if(!run.unlimited&&run.done>=run.target){run.status='stopped';notes='Training complet';break;}
    if(run.seedCursor>=run.reservedUntil){
     run.reservedUntil=run.seedCursor+1000;
     await save(); // Reserve 1000 future world seeds before executing them.
    }
    trial();
    if(run.done%run.autosaveEvery===0)await save();
    if(run.done%Math.max(20,run.autosaveEvery*2)===0){
     try{
      // Validation uses a FIXED seed family, distinct from the user-invoked blind test.
      // This selects a best checkpoint without ever replacing the active working brain.
      const domains=kind==='universal'?run.domains:undefined;
      validation=blindTest(kind,brain,{count:3,size:run.size,seed:811001,domains});
      const rows=Object.values(validation.domains);
      const fitness=rows.reduce((sum,r)=>{
       if(r.metric==='costMAE')return sum+r.meanCost;
       return sum+4*(1-(r.success??0))+Math.max(0,r.meanCost||0)/Math.max(10,run.size*15);
      },0);
      if(fitness<bestFitness-1e-7){
       bestFitness=fitness;
       await vault.atomic(path.join(data,'best.json'),{schema:'studio-1',kind,
        snapshot:brain.snapshot(),savedAt:new Date().toISOString(),
        validationFitness:fitness,label:'STUDIO · BEST VALIDATION'});
       notes='Best actualizat după validare: '+fitness.toFixed(5);
      }
     }catch(e){notes='Test incomplet: '+e.message;console.error(e);}
    }
    await pauseTick();if(run.delayMs)await sleep(run.delayMs);
   }
  }catch(e){run.status='paused';run.error=String(e.stack||e);notes='Training oprit la eroare';console.error(e);}
  finally{
   if(run.status==='running')run.status='paused';
   try{await save();}catch(e){run.error='SAVE FAILED: '+e.message;console.error(e)}
   training=null;
  }
 })();
 return training;
}
function start(input={}){
 if(!brain)throw Error('This archived brain cannot be trained with the available engines');
 if(run.status==='running')throw Error('Training already running');
 if(input.resetRun===true){run.done=0;last25=[];startAt=Date.now();}
 const domains=chosenDomains(input.domains);
 if(kind!=='universal'&&domains.length===1&&!allowTraining(domains[0]))
  throw Error('Selected brain is incompatible with the requested domain');
 run={...run,status:'running',unlimited:input.episodes===0||input.unlimited===true,
  target:bounded(input.episodes,1,100000000,1000),domains,
  size:bounded(input.size,9,19,run.size),
  autosaveEvery:bounded(input.autosaveEvery,2,100,run.autosaveEvery),
  previewEvery:bounded(input.previewEvery,1,20,run.previewEvery),
  delayMs:bounded(input.delayMs,0,500,run.delayMs),
  error:null,started:new Date().toISOString()};
 if(run.unlimited)run.target=null;
 notes='Antrenare reală pe server. Browserul este doar vizualizare.';
 void execute();return {started:true,kind,unlimited:run.unlimited};
}
async function stop(status='paused'){
 if(run.status==='running')run.status=status;
 if(training)await training;else await save();
 return copyState();
}
const send=(res,obj,status=200)=>{
 const text=JSON.stringify(obj);
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(text);
};
async function readBody(req){
 let raw='';for await(const part of req){raw+=part;if(raw.length>14*1024*1024)throw Error('Payload exceeds 14MB');}
 return raw?JSON.parse(raw):{};
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const endpoint=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'&&endpoint==='/api/health')
   return send(res,{ok:true,port,kind,status:run.status,episodes:brain?.episodes||0});
  if(req.method==='GET'&&endpoint==='/api/state')return send(res,copyState());
  if(req.method==='GET'&&endpoint==='/api/brains')return send(res,{brains:await vault.list(),selected:selection});
  if(req.method==='GET'&&endpoint==='/api/traces'){
   const after=bounded(new URL(req.url,'http://localhost').searchParams.get('after'),0,2147483647,0);
   const oldest=traces[0]?.id??traceSequence+1;
   const pending=traces.filter(t=>t.id>after);
   return send(res,{status:run.status,sequence:traceSequence,
    dropped:Math.max(0,oldest-after-1),
    traces:pending.slice(0,8),
    hasMore:pending.length>8});
  }
  if(req.method==='GET'&&endpoint==='/api/export'){
   res.setHeader('Content-Disposition','attachment; filename="brain-studio-checkpoint.json"');
   return send(res,{schema:'studio-1',kind,selection,brain:brain?.snapshot()||readOnlyArchive,
    history,created:new Date().toISOString()});
  }
  if(endpoint.startsWith('/api/')){
   if(req.method!=='POST')return send(res,{error:'Method not allowed'},405);
   const input=await readBody(req);
   if(endpoint==='/api/pause')return send(res,await stop('paused'));
   if(endpoint==='/api/stop')return send(res,await stop('stopped'));
   if(endpoint==='/api/start')return send(res,start(input));
   if(endpoint==='/api/probe'){
    if(run.status==='running')return send(res,{error:'Pause training before inspection'},409);
    if(!brain)throw Error('Select a compatible brain');
    const copy=restoreBrain(kind,brain.snapshot());
    const domain=kind==='universal'?
     (DOMAINS.includes(input.domain)?input.domain:'maze'):
     kind==='causal'?'text':(kind==='v6'||kind==='v7')?'maze':'network';
    const seed=bounded(input.seed,1,2147483646,471993);
    const episode=oneEpisode(kind,copy,{domain,seed,size:bounded(input.size,9,19,run.size),
     learn:kind==='dynamic',explore:0});
    preview={meta:episode.meta,outcome:episode.outcome,
     frames:episode.frames.slice(-90),lastInput:episode.lastInput,episode:brain.episodes};
    previewOrigin=kind==='dynamic'?'inspecție cu adaptare pe COPIE':'inspecție fără antrenare';
    revision++;
    return send(res,copyState());
   }
   if(endpoint==='/api/resume')return send(res,start({...input,resetRun:false}));
   if(run.status==='running')return send(res,{error:'Pause training before selecting, saving, importing, or resetting'},409);
   if(endpoint==='/api/brains/select'){
    if(typeof input.id!=='string')throw Error('Brain ID required');
    await save();
    if(brain)await vault.saveBrain(kind,brain,'Autosave înainte de selectare · '+kind+' · '+brain.episodes+' ep');
    const loaded=await vault.load(input.id);
    kind=loaded.kind;brain=loaded.brain||null;readOnlyArchive=brain?null:loaded.snapshot;
    selection=input.id;history=[];recentOutcomes=[];last=null;preview=null;previewOrigin=null;
    traces=[];traceSequence=0;lastTest=null;
    validation=null;bestFitness=Infinity;
    run={...run,status:'paused',done:0,target:0,error:null};revision++;
    notes=loaded.trainable?'Creier original încărcat ca o copie în Studio. Fișierul sursă rămâne intact.':
     'Arhivă selectată: arhitectura nu are adaptor de antrenare. Disponibilă pentru inspecție/export.';
    await save();return send(res,copyState());
   }
   if(endpoint==='/api/brains/new'){
    if(!KINDS.includes(input.kind))throw Error('Unknown brain type');
    await save();
    if(brain)await vault.saveBrain(kind,brain,'Autosave înainte de creier nou · '+kind+' · '+brain.episodes+' ep');
    kind=input.kind;brain=makeBrain(kind,bounded(input.seed,1,2147483646,19));
    selection='new:'+kind;readOnlyArchive=null;history=[];recentOutcomes=[];last=null;preview=null;previewOrigin=null;
    traces=[];traceSequence=0;lastTest=null;
    validation=null;bestFitness=Infinity;
    run={...run,status:'paused',done:0,target:0,error:null};notes='Creier nou';revision++;
    await save();return send(res,copyState());
   }
   if(endpoint==='/api/brains/save'){
    if(!brain)throw Error('Archived checkpoint cannot be trained or saved as a trainable brain');
    const id=await vault.saveBrain(kind,brain,input.label);notes='Salvat în biblioteca Studio: '+id;
    await save();return send(res,{id,brains:await vault.list()});
   }
   if(endpoint==='/api/brains/import'){
    const id=await vault.import(input.content,input.label);return send(res,{id,brains:await vault.list()});
   }
   if(endpoint==='/api/test'){
    if(!brain)throw Error('No trainable brain selected');
    lastTest=blindTest(kind,brain,{count:bounded(input.count,3,50,12),
     size:bounded(input.size,9,19,run.size),domains:chosenDomains(input.domains)});
    await save();return send(res,copyState());
   }
   if(endpoint==='/api/settings'){
    run.autosaveEvery=bounded(input.autosaveEvery,2,100,run.autosaveEvery);
    run.previewEvery=bounded(input.previewEvery,1,20,run.previewEvery);
    run.delayMs=bounded(input.delayMs,0,500,run.delayMs);
    await save();return send(res,copyState());
   }
   return send(res,{error:'Not found'},404);
  }
  if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
  const file=endpoint==='/'?'index.html':endpoint.slice(1);
  if(!['index.html','app.js','graph-render.js','style.css'].includes(file))return send(res,{error:'Not found'},404);
  const absolute=path.join(root,'public',file);
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'Cache-Control':'no-cache',
   'X-Content-Type-Options':'nosniff'});
  createReadStream(absolute).pipe(res);
 }catch(e){console.error('HTTP',e);send(res,{error:String(e.message||e)},400);}
});
server.on('error',error=>{
 if(error.code==='EADDRINUSE'){
  console.error('Brain Studio: port '+port+' deja ocupat la '+host+'.');
  console.error('Oprește serverul vechi din Termux cu Ctrl+C pentru a salva checkpointul,');
  console.error('apoi repornește. Nu rula două instanțe pe aceleași date.');
  process.exitCode=98;
  return;
 }
 console.error('Brain Studio: eroare la pornirea serverului:',error);
 process.exitCode=1;
});
server.listen(port,host,()=>console.log('MagicPerspective Brain Studio http://'+host+':'+port));
async function shutdown(){
 shuttingDown=true;run.status='paused';
 try{if(training)await training;else await save()}catch(e){console.error('Shutdown save failed',e)}
 server.close(()=>process.exit(0));
}
process.on('SIGTERM',()=>void shutdown());
process.on('SIGINT',()=>void shutdown());
