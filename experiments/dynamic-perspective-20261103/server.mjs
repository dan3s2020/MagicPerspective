// Dynamic Perspective Laboratory: persistent training independent of the browser.
import http from 'node:http';
import {readFile,writeFile,rename,copyFile,mkdir} from 'node:fs/promises';
import {existsSync,createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MessageBrain,Collective} from './engine/brain.mjs';
import {makeWorld,FAMILIES,oracle} from './engine/world.mjs';
import {trainEpisode,evaluate,costMAE} from './engine/experiment.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3043);
const dir=process.env.DATA_DIR?path.resolve(process.env.DATA_DIR):path.join(root,'data');
const latest=path.join(dir,'latest.json'),best=path.join(dir,'best.json');
let brain=new MessageBrain(20261103),world=makeWorld(191911,33,'clusters');
let session=new Collective(world,MessageBrain.restore(brain.snapshot()));
let lastTest=null,bestCost=Infinity;
// Volatile last completed training episodes, for faithful UI replay only (not neural inputs).
let lastTrainingEpisodes=[];
const untrainedReference=new MessageBrain(20261103);
let baselineCostError=null,heldoutCostError=null;
const validationSeed=880000;
function diagnostics(){
 baselineCostError ??= costMAE(untrainedReference,{seed:validationSeed,n:33,count:12});
 heldoutCostError ??= costMAE(brain,{seed:validationSeed,n:33,count:12});
 return {baselineCostMAE:baselineCostError,heldoutCostMAE:heldoutCostError,
  reductionPct:baselineCostError>0?+(100*(baselineCostError-heldoutCostError)/baselineCostError).toFixed(2):null,
  validatedAt:trainer.validation?.episode??null,
  learnedCost:trainer.validation?.learned?.cost??null,
  bellmanCost:trainer.validation?.bellman?.cost??null,
  learnedF1:trainer.validation?.learned?.firstF1??null,
  bellmanF1:trainer.validation?.bellman?.firstF1??null};
}
let trainer={status:'stopped',episodes:0,updates:0,loss:0,history:[],validation:null,
 throttleMs:30,saveEvery:10,n:33,seed:130000,notes:'Pregătit.',savedAt:null,revision:0};
let running=null,writeQueue=Promise.resolve(),evalBusy=false,closing=false;
const trimmed=()=>({...trainer,history:trainer.history.slice(-180)});
async function atomic(file,o){await mkdir(dir,{recursive:true});const tmp=file+'.tmp';await writeFile(tmp,JSON.stringify(o),'utf8');await rename(tmp,file);}
function save(){trainer.savedAt=new Date().toISOString();trainer.revision++;
 const snap={schema:3,brain:brain.snapshot(),trainer:trimmed(),lastTest,bestCost};
 writeQueue=writeQueue.catch(()=>{}).then(async()=>{
  try{if(existsSync(latest))await copyFile(latest,latest+'.bak');}catch{}
  await atomic(latest,snap);
 });return writeQueue;
}
for(const file of [latest,latest+'.bak']){if(!existsSync(file))continue;try{
 const s=JSON.parse(await readFile(file,'utf8'));if(s.schema!==3)throw Error('Unknown schema');
 brain=MessageBrain.restore(s.brain);trainer={...trainer,...s.trainer,status:'paused',notes:'Checkpoint restaurat. Apasă Continuă pentru antrenare.'};
 lastTest=s.lastTest??null;bestCost=Number.isFinite(s.bestCost)?s.bestCost:Infinity;break;
}catch(e){console.warn('Could not restore',file,e.message);trainer.notes='Eroare checkpoint: '+e.message;}}
function createWorld(family=world.family,n=world.n,seed=(world.seed+101)>>>0){
 world=makeWorld(seed,n,family);session=new Collective(world,MessageBrain.restore(brain.snapshot()));
 session.exchange(world.n*2);session.initialShape=session.shape();
}
createWorld();
const state=()=>({version:'dynamic-perspective-1',trainer:trimmed(),diagnostics:diagnostics(),model:{
  costUpdates:brain.costUpdates,ruleUpdates:brain.ruleUpdates,parameters:brain.snapshot(),
  costMAE:brain.costUpdates?brain.costLoss/brain.costUpdates:null,
  messageMAE:brain.ruleUpdates?brain.ruleLoss/brain.ruleUpdates:null,
  bestValidation:Number.isFinite(bestCost)?bestCost:null
 },session:session.payload({truth:true}),lastTest,server:{port,host}});
const bounded=(x,a,b,def)=>Number.isInteger(Number(x))&&Number(x)>=a&&Number(x)<=b?Number(x):def;
const send=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>24000)throw Error('Body too large');}return raw?JSON.parse(raw):{};}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function trainingLoop(){if(running)return running;
 running=(async()=>{try{
  while(trainer.status==='running'&&!closing){
   const progress=trainEpisode(brain,trainer.episodes,{n:trainer.n,seed:trainer.seed,trace:true});
   if(progress.live){lastTrainingEpisodes.push(progress.live);if(lastTrainingEpisodes.length>5)lastTrainingEpisodes.shift();}
   trainer.episodes++;trainer.updates=brain.ruleUpdates+brain.costUpdates;trainer.loss=progress.ruleMAE;
   if(trainer.episodes%5===0){heldoutCostError=costMAE(brain,{seed:validationSeed,n:33,count:12});
    trainer.history.push({episode:trainer.episodes,costMAE:+progress.costMAE.toFixed(3),ruleMAE:+progress.ruleMAE.toFixed(3),heldoutMAE:heldoutCostError,
     firstF1:+(progress.live?.initialF1??0).toFixed(3),solved:progress.solved?1:0});
    if(trainer.history.length>240)trainer.history.shift();}
   if(trainer.episodes%Math.max(20,trainer.saveEvery*4)===0){
    const v=evaluate(brain,{count:6,n:trainer.n,seed:7800000,modes:['learned','bellman']});
    trainer.validation={episode:trainer.episodes,learned:v.modes.learned,bellman:v.modes.bellman};
    if(v.modes.learned.cost<bestCost){bestCost=v.modes.learned.cost;
     await atomic(best,{schema:3,brain:brain.snapshot(),episode:trainer.episodes,validationCost:bestCost});}
   }
   if(trainer.episodes%trainer.saveEvery===0)await save();
   await sleep(trainer.throttleMs);
  }
 }catch(e){trainer.status='paused';trainer.notes='Antrenarea s-a oprit la eroare: '+e.message;console.error(e);}finally{
  try{await save();}catch(e){console.error('Checkpoint save failure',e);trainer.notes='SAVE FAILED: '+e.message;}
  running=null;
 }})();return running;}
function start(config){if(trainer.status==='running')return;
 trainer.n=bounded(config.n,16,80,trainer.n);trainer.saveEvery=bounded(config.saveEvery,2,200,trainer.saveEvery);
 trainer.throttleMs=bounded(config.throttleMs,0,1000,trainer.throttleMs);
 trainer.status='running';trainer.notes='Antrenare ∞ activă în Termux, independent de browser.';
 void trainingLoop();}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const allowed=new Set(['index.html','app.js','style.css']);
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),route=url.pathname;
 if(req.method==='GET'&&route==='/api/health')return send(res,{ok:true,training:trainer.status,episodes:trainer.episodes});
 if(req.method==='GET'&&route==='/api/state')return send(res,state());
 if(req.method==='GET'&&route==='/api/train/live')return send(res,{status:trainer.status,episodes:trainer.episodes,traces:lastTrainingEpisodes,diagnostics:diagnostics(),validation:trainer.validation});
 if(req.method==='GET'&&route==='/api/export'){
  res.setHeader('Content-Disposition','attachment; filename="magicperspective-dynamic-checkpoint.json"');
  return send(res,{schema:3,brain:brain.snapshot(),trainer:trimmed(),lastTest,bestCost});
 }
 if(route.startsWith('/api/')){
  if(req.method!=='POST')return send(res,{error:'Method not allowed'},405);
  const b=await body(req);
  if(route==='/api/train/start'||route==='/api/train/resume'){
   if(evalBusy)return send(res,{error:'Evaluation active'},409);
   start(b);return send(res,state());}
  if(route==='/api/train/pause'||route==='/api/train/stop'){
   trainer.status=route.endsWith('pause')?'paused':'stopped';trainer.notes='Modelul este păstrat.';
   if(running)await running;else await save();return send(res,state());}
  if(route==='/api/save'){await save();return send(res,state());}
  if(route==='/api/new'){
   const family=FAMILIES.includes(b.family)?b.family:world.family,n=bounded(b.n,16,80,world.n),seed=bounded(b.seed,1,2147483646,world.seed+107);
   createWorld(family,n,seed);return send(res,state());}
  if(route==='/api/round'){
   session.exchange(bounded(b.rounds,1,300,1));return send(res,state());}
  if(route==='/api/intervene'){const event=session.intervention();return send(res,{...state(),event});}
  if(route==='/api/step'){
   const event=session.action({evolveEvery:1});return send(res,{...state(),event});}
  if(route==='/api/navigate'){
   session.run({dynamic:true,maxMoves:bounded(b.maxMoves,1,500,world.n*5),learn:false});return send(res,state());}
  if(route==='/api/test'){
   if(evalBusy)return send(res,{error:'Evaluation active'},409);
   evalBusy=true;try{const frozen=MessageBrain.restore(brain.snapshot());
    lastTest=evaluate(frozen,{count:bounded(b.count,3,70,18),n:bounded(b.n,16,80,trainer.n),seed:bounded(b.seed,1,2147483646,9300000)});
    await save();return send(res,state());}finally{evalBusy=false;}}
  if(route==='/api/train/reset'){
   if(b.confirm!=='RESET_TRAINING')return send(res,{error:'Explicit reset confirmation required'},400);
   if(trainer.status==='running')return send(res,{error:'Pause training first'},409);
   brain=new MessageBrain(20261103);bestCost=Infinity;lastTest=null;lastTrainingEpisodes=[];heldoutCostError=null;
   trainer={...trainer,status:'stopped',episodes:0,updates:0,loss:0,history:[],validation:null,notes:'Reset explicit. Old experiments untouched.'};
   await save();createWorld();return send(res,state());}
  return send(res,{error:'Unknown endpoint'},404);
 }
 if(req.method!=='GET')return send(res,{error:'Method not allowed'},405);
 const file=route==='/'?'index.html':route.slice(1);if(!allowed.has(file))return send(res,{error:'Not found'},404);
 const full=path.join(root,'public',file);res.writeHead(200,{'Content-Type':types[path.extname(full)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
 createReadStream(full).pipe(res);
 }catch(e){console.error('Request',e);send(res,{error:e.message||String(e)},500);}});
server.listen(port,host,()=>console.log(`MagicPerspective Dynamic Perspective http://${host}:${port}`));
async function shutdown(){if(closing)return;closing=true;trainer.status='paused';try{if(running)await running;else await save();}catch(e){console.error(e);}server.close(()=>process.exit(0));}
process.on('SIGINT',()=>{void shutdown()});process.on('SIGTERM',()=>{void shutdown()});
