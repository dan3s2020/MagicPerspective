// Isolated learned-message experiment: continuous training and atomic checkpointing.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import {existsSync,createReadStream} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {makeWorld,oracle,KINDS} from './engine/world.mjs';
import {CostRule,Collective} from './engine/brain.mjs';
import {evaluate,trainEpisode} from './engine/experiment.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3042);
const data=process.env.DATA_DIR?path.resolve(process.env.DATA_DIR):path.join(root,'data'),checkpoint=path.join(data,'latest.json'),bestfile=path.join(data,'best.json');
const seedBase=1300000;
let rule=new CostRule(20261103),sessionWorld=makeWorld(191911,33,'mixed');
let session=new Collective(sessionWorld,CostRule.restore(rule.snapshot()),{mode:'learned'});
let lastTest=null,bestCost=Infinity,trainer={status:'idle',episodes:0,loss:0,history:[],lastSaved:null,lastValidation:null,
  throttleMs:25,saveEvery:10,seed:seedBase,n:33,notes:'',startedAt:null,revision:1};
let trainingPromise=null,validationBusy=false,writeQueue=Promise.resolve();
const compact=t=>({status:t.status,episodes:t.episodes,loss:t.loss,history:t.history.slice(-140),lastSaved:t.lastSaved,
  lastValidation:t.lastValidation,throttleMs:t.throttleMs,saveEvery:t.saveEvery,n:t.n,notes:t.notes,startedAt:t.startedAt,revision:t.revision});
async function atomicWrite(file,obj){await mkdir(data,{recursive:true});const temp=file+'.tmp';await writeFile(temp,JSON.stringify(obj),'utf8');await rename(temp,file);}
function save(){
  // Serialize all saves, snapshotting state at request time so older writes cannot overwrite newer ones.
  trainer.lastSaved=new Date().toISOString();trainer.revision++;
  const snapshot={schema:2,rule:rule.snapshot(),trainer:compact(trainer),lastTest};
  writeQueue=writeQueue.catch(()=>{}).then(async()=>{
    const previous=checkpoint+'.bak';try{if(existsSync(checkpoint))await copyFile(checkpoint,previous);}catch{}
    await atomicWrite(checkpoint,snapshot);
  });
  return writeQueue;
}
// Read newest valid checkpoint; if an interrupted write corrupted latest, use last backup.
let restored=false;
for(const candidate of [checkpoint,checkpoint+'.bak']){
 if(!existsSync(candidate))continue;
 try{
  const content=JSON.parse(await readFile(candidate,'utf8'));
  if(content.schema!==2)throw Error('Unexpected checkpoint schema');
  rule=CostRule.restore(content.rule);
  trainer={...trainer,...content.trainer,status:'paused',notes:
   'Checkpoint restaurat'+(candidate.endsWith('.bak')?' din backup':'')+'. Apasă Continuă pentru reluare.'};
  lastTest=content.lastTest??null;restored=true;break;
 }catch(e){console.error('Skipping unusable checkpoint:',candidate,e.message);}
}
try{
 if(existsSync(bestfile)){
  const c=JSON.parse(await readFile(bestfile,'utf8'));
  if(c.schema===2&&Number.isFinite(c.validationCost))bestCost=c.validationCost;
 }
}catch(e){console.error('Best-checkpoint summary invalid:',e.message);}
if(!restored&&(existsSync(checkpoint)||existsSync(checkpoint+'.bak')))
 trainer.notes='Checkpoint not restored: both latest and backup are invalid. No data overwritten automatically.';
function newSession(kind=sessionWorld.kind,n=sessionWorld.n,seed=sessionWorld.seed+101,mode='learned'){
  sessionWorld=makeWorld(seed,n,kind);session=new Collective(sessionWorld,CostRule.restore(rule.snapshot()),{mode});
  for(let i=0;i<session.messageRounds;i++)session.exchange();session.sample('ready');
}
newSession();
function state({includeHistory=false}={}){
 const epi=session.payload({truth:true});epi.evaluator.oracle=oracle(sessionWorld).route;
 if(!includeHistory)epi.history=epi.history.slice(-95);
 return {version:'learned-message-v1',trainer:compact(trainer),model:{weights:rule.w,messageWeights:rule.messageW,messageUpdates:rule.messageUpdates,messageLoss:rule.messageUpdates?rule.messageLoss/rule.messageUpdates:null,updates:rule.updates,trainingMAE:rule.updates?rule.loss/rule.updates:null,bestValidationCost:Number.isFinite(bestCost)?bestCost:null},
  session:epi,lastTest,server:{host,port}};
}
const textJSON=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
async function getBody(req){let s='';for await (const c of req){s+=c;if(s.length>14000)throw Error('Request body too large');}return s?JSON.parse(s):{};}
const bounded=(x,min,max,f)=>Number.isInteger(Number(x))&&Number(x)>=min&&Number(x)<=max?Number(x):f;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// The training loop is not tied to a browser session. It runs until manually paused/stopped.
async function trainingLoop(){
 if(trainingPromise)return trainingPromise;
 trainingPromise=(async()=>{
  try{
   while(trainer.status==='running'){
    const event=trainEpisode(rule,trainer.episodes,{n:trainer.n,seed:trainer.seed});
    trainer.episodes++;trainer.loss=event.messageLoss??event.meanAbsoluteError;
    if(trainer.episodes%5===0){trainer.history.push({episode:trainer.episodes,loss:+trainer.loss.toFixed(4),updates:rule.updates,messageUpdates:rule.messageUpdates,solved:event.solved});if(trainer.history.length>250)trainer.history.shift();}
    if(trainer.episodes%Math.max(10,trainer.saveEvery*3)===0){
      const validation=evaluate(rule,{seed:6700000,n:trainer.n,count:6,modes:['learned','bellman','off']});
      trainer.lastValidation={episode:trainer.episodes,learned:validation.modes.learned,bellman:validation.modes.bellman,off:validation.modes.off};
      if(validation.modes.learned.cost<bestCost){bestCost=validation.modes.learned.cost;
        await atomicWrite(bestfile,{schema:2,rule:rule.snapshot(),validationCost:bestCost,episodes:trainer.episodes,date:new Date().toISOString()});}
    }
    if(trainer.episodes%trainer.saveEvery===0)await save();
    // Yield to mobile HTTP requests. Adjustable throttle avoids perpetual 100% CPU usage.
    await delay(trainer.throttleMs);
   }
  }catch(e){trainer.status='paused';trainer.notes='Training paused after error: '+(e.message||String(e));console.error('Training error:',e);}
  finally{try{await save();}catch(e){console.error('Final checkpoint save failed:',e);trainer.notes='Checkpoint error: '+e.message;}trainingPromise=null;
    if(trainer.status==='running')setImmediate(()=>{void trainingLoop();});}
 })();return trainingPromise;
}
function startTraining(){if(trainer.status==='running')return;
 trainer.status='running';trainer.startedAt=new Date().toISOString();trainer.notes='Antrenare continuă; checkpoint automat activ.';
 void trainingLoop();}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const allowed=new Set(['index.html','app.js','style.css']);
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost'),route=url.pathname;
  if(req.method==='GET'&&route==='/api/health')return textJSON(res,{ok:true,training:trainer.status});
  if(req.method==='GET'&&route==='/api/state')return textJSON(res,state());
  if(req.method==='GET'&&route==='/api/export'){
   res.setHeader('Content-Disposition','attachment; filename="learned-messages-checkpoint.json"');
   return textJSON(res,{schema:2,rule:rule.snapshot(),trainer:compact(trainer),lastTest});
  }
  if(route.startsWith('/api/')){
   if(req.method!=='POST')return textJSON(res,{error:'Method not allowed'},405);
   const input=await getBody(req);
   if(route==='/api/train/start'||route==='/api/train/resume'){
    if(!validationBusy){trainer.n=bounded(input.n,12,96,trainer.n);trainer.throttleMs=bounded(input.throttleMs,0,1000,trainer.throttleMs);
     trainer.saveEvery=bounded(input.saveEvery,2,100,trainer.saveEvery);startTraining();}
    else return textJSON(res,{error:'Wait for evaluation to finish'},409);
    return textJSON(res,state());}
   if(route==='/api/train/pause'||route==='/api/train/stop'){
    trainer.status=route.endsWith('pause')?'paused':'stopped';trainer.notes=route.endsWith('pause')?'Pauză solicitată. Se salvează după episodul curent.':'Antrenarea oprită, progres păstrat.';
    if(trainingPromise)await trainingPromise;else await save();return textJSON(res,state());}
   if(route==='/api/save'){await save();return textJSON(res,state());}
   if(route==='/api/new'){
    const k=KINDS.includes(input.kind)?input.kind:sessionWorld.kind,n=bounded(input.n,12,96,sessionWorld.n),seed=bounded(input.seed,1,2147483647,sessionWorld.seed+991);
    const mode=['learned','bellman','off','shuffled'].includes(input.mode)?input.mode:'learned';newSession(k,n,seed,mode);return textJSON(res,state());}
   if(route==='/api/round'){for(let i=0;i<bounded(input.rounds,1,96,1);i++)session.exchange();return textJSON(res,state());}
   if(route==='/api/step'){const event=session.step();return textJSON(res,{...state(),event});}
   if(route==='/api/run'){session.run(bounded(input.maxMoves,1,500,sessionWorld.n*5),{learn:false});return textJSON(res,state());}
   if(route==='/api/test'){
    if(validationBusy)return textJSON(res,{error:'A test is already running'},409);
    validationBusy=true;try{const frozen=CostRule.restore(rule.snapshot());lastTest=evaluate(frozen,{count:bounded(input.count,3,60,15),n:bounded(input.n,12,96,trainer.n),seed:bounded(input.seed,1,2147483647,8700000)});await save();return textJSON(res,state());}
    finally{validationBusy=false;}}
   if(route==='/api/train/reset'){
     if(input.confirm!=='RESET_TRAINING')return textJSON(res,{error:'Explicit confirmation required'},400);
     if(trainer.status==='running')return textJSON(res,{error:'Pause before reset'},409);
     rule=new CostRule(20261103);bestCost=Infinity;lastTest=null;trainer={...trainer,status:'stopped',episodes:0,loss:0,history:[],lastValidation:null,notes:'Reset explicit only; older experiments unaffected.'};await save();newSession();return textJSON(res,state());
   }
   return textJSON(res,{error:'Unknown API endpoint'},404);
  }
  if(req.method!=='GET')return textJSON(res,{error:'Method not allowed'},405);
  const file=route==='/'?'index.html':route.slice(1);if(!allowed.has(file))return textJSON(res,{error:'Not found'},404);
  const full=path.join(root,'public',file);res.writeHead(200,{'Content-Type':MIME[path.extname(full)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});createReadStream(full).pipe(res);
 }catch(e){console.error('Request:',e);return textJSON(res,{error:e.message||String(e)},500);}
});
server.listen(port,host,()=>console.log(`MagicPerspective · Learned Message Rules · http://${host}:${port}`));

let shuttingDown=false;
async function shutdown(signal){
 if(shuttingDown)return;shuttingDown=true;trainer.status='paused';trainer.notes='Server stopped ('+signal+'); checkpoint restored paused on restart.';
 try{if(trainingPromise)await trainingPromise;else await save();await writeQueue;}
 catch(error){console.error('Checkpoint during shutdown:',error);process.exitCode=1;}
 finally{server.close(()=>process.exit(process.exitCode||0));setTimeout(()=>process.exit(process.exitCode||0),1200).unref();}
}
process.on('SIGINT',()=>{void shutdown('SIGINT');});
process.on('SIGTERM',()=>{void shutdown('SIGTERM');});
