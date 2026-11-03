import http from 'node:http';
import {readFile,writeFile,mkdir,rename} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {newBrains,train,evaluate} from './engine/training.mjs';
import {PerspectiveNet,CausalModel} from './engine/model.mjs';
import {Organism} from './engine/organism.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const HOST=process.env.HOST||'127.0.0.1',PORT=Number(process.env.PORT||3032);
const weightsFile=path.join(root,'data','best-checkpoint.json');
const liveFile=path.join(root,'data','live-checkpoint.json');
let {model,causal}=newBrains(),episode,seed=13841,task=null,cancelTraining=false,evalResult=null,runInfo=null;
let bestValidation=Infinity,bestSnapshot=null;
try{
 if(existsSync(weightsFile)){
  const data=JSON.parse(await readFile(weightsFile,'utf8'));
  model=PerspectiveNet.restore(data.model);causal=CausalModel.restore(data.causal);
  bestSnapshot={model:model.snapshot(),causal:causal.snapshot()};bestValidation=data.validationBCE;
  runInfo={restored:true,checkpoint:data.info};
 }
 if(existsSync(liveFile)){
  const data=JSON.parse(await readFile(liveFile,'utf8'));
  model=PerspectiveNet.restore(data.model);causal=CausalModel.restore(data.causal);
  runInfo={...runInfo,restoredLive:true,liveSaved:data.saved};
 }
}catch(error){console.error('Could not restore checkpoint:',error)}
episode=new Organism(seed,model,causal,11,'branched');
function response(res,obj,status=200){const body=JSON.stringify(obj);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body)}
async function input(req){let txt='';for await(const b of req){txt+=b;if(txt.length>12000)throw Error('Request too large')}return txt?JSON.parse(txt):{}}
function state(){return {version:'3.0.0-experimental',episode:episode.payload(),model:{episodes:model.episodes,updates:model.updates,
 neuralParams:model.w1.length+model.b1.length+model.w2.length+model.obsW.length+model.effW.length+3,causalSamples:causal.samples,
 neuralOnlineUpdates:model.onlineUpdates,wallSamples:model.wallSamples,effortSamples:model.effortSamples,
 meanWallError:model.wallSamples?model.wallErrorTotal/model.wallSamples:null,
 causalWeights:Array.from(causal.w),averageCausalError:causal.samples?causal.errorSum/causal.samples:null,
 bestValidation:Number.isFinite(bestValidation)?bestValidation:null},task,evalResult,runInfo};}
async function saveBest(info){await mkdir(path.dirname(weightsFile),{recursive:true});
 const file={schema:3,model:bestSnapshot.model,causal:bestSnapshot.causal,validationBCE:bestValidation,info};
 await writeFile(weightsFile+'.tmp',JSON.stringify(file));await rename(weightsFile+'.tmp',weightsFile);
}
async function saveLive(){
 await mkdir(path.dirname(liveFile),{recursive:true});
 const file={schema:3,model:model.snapshot(),causal:causal.snapshot(),saved:new Date().toISOString()};
 await writeFile(liveFile+'.tmp',JSON.stringify(file));await rename(liveFile+'.tmp',liveFile);
}
function intArg(v,min,max,fallback){const a=Number(v);return Number.isInteger(a)&&a>=min&&a<=max?a:fallback}
async function startTraining(req){if(task?.running)throw Error('Training already active');
 const count=intArg(req.episodes,1,50000,600),n=intArg(req.n,7,21,11),lr=Number(req.lr||.008);
 if(n%2!==1||!Number.isFinite(lr)||lr<.0001||lr>.025)throw Error('Invalid size or learning rate');
 const trainSeed=intArg(req.seed,1,2147483647,20261103),initCount=model.episodes;
 cancelTraining=false;evalResult=null;
 task={running:true,total:count,done:0,loss:null,best:null,history:[],cancelled:false,error:null};
 (async()=>{try{
  // Train a copy: the live online brain is preserved if a candidate fails validation.
  const candidateModel=PerspectiveNet.restore(model.snapshot());
  const candidateCausal=CausalModel.restore(causal.snapshot());
  const result=await train(candidateModel,candidateCausal,{episodes:count,n,lr,seed:trainSeed,
   interval:Math.max(10,Math.floor(count/30)),validateCount:30,cancel:()=>cancelTraining,
   onProgress:x=>{task.done=x.done;task.loss=x.latest.trainLoss;task.best=x.best;task.history=x.history;}});
  task.cancelled=result.interrupted;
  let promoted=false;
  if(result.bestSnapshot&&result.best.heldoutBCE<bestValidation){
   bestValidation=result.best.heldoutBCE;bestSnapshot=result.bestSnapshot;
   await saveBest({seed:trainSeed,n,learningRate:lr,episodes:result.best.episode,
    trainedTotal:initCount+result.best.episode,created:new Date().toISOString()});
   // A newly validated candidate is derived from the current online model.
   model=PerspectiveNet.restore(bestSnapshot.model);
   causal=CausalModel.restore(bestSnapshot.causal);
   promoted=true;
  }
  // Failed candidates never roll back active online learning to an older checkpoint.
  evalResult=evaluate(model,{seed:990031,count:42,n,navigation:true,causal});
  episode=new Organism((seed+=991),model,causal,n,'branched');await saveLive();
  runInfo={trained:result.trained,elapsedMs:result.elapsedMs,promoted,
   livePreserved:!promoted,lastTraining:{count,seed:trainSeed,n},
   finalEvaluation:evalResult};
 }catch(e){task.error=String(e.stack||e)}finally{task.running=false;task.completed=new Date().toISOString()}})();
 return {started:true,count,seed:trainSeed};
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(pathname==='/api/health'&&req.method==='GET')return response(res,{ok:true,version:'3.0.0-experimental'});
 if(pathname==='/api/state'&&req.method==='GET')return response(res,state());
 if(pathname.startsWith('/api/')){
  if(req.method!=='POST')return response(res,{error:'Method not allowed'},405);
  const arg=await input(req);
  if(pathname==='/api/train')return response(res,await startTraining(arg));
  if(pathname==='/api/cancel'){cancelTraining=true;return response(res,{requested:true});}
  if(task?.running)return response(res,{error:'Training running; exploration locked'},409);
  if(pathname==='/api/new'){
   seed=intArg(arg.seed,1,2147483647,seed+1087);
   const n=intArg(arg.n,7,21,11),family=String(arg.family||'branched');
   episode=new Organism(seed,model,causal,n,family,'shape',arg.online!==false);return response(res,state());
  }
  if(pathname==='/api/step'){const action=episode.act(arg.next===undefined?undefined:Number(arg.next));if(episode.online&&action.event!=='invalid'&&action.event!=='no-route'&&action.event!=='finished')await saveLive();return response(res,{action,...state()})}
  if(pathname==='/api/evaluate'){
   const n=intArg(arg.n,7,21,11),count=intArg(arg.count,6,120,36);
   evalResult=evaluate(model,{seed:990031,count,n,navigation:true,causal});return response(res,state());
  }
  if(pathname==='/api/reset'){
   model=new PerspectiveNet(17);causal=new CausalModel();bestSnapshot=null;bestValidation=Infinity;evalResult=null;
   const {unlink}=await import('node:fs/promises');if(existsSync(weightsFile))await unlink(weightsFile);if(existsSync(liveFile))await unlink(liveFile);
   episode=new Organism((seed+=33),model,causal,11,'branched');return response(res,state());
  }
  return response(res,{error:'API endpoint not found'},404);
 }
 if(req.method!=='GET')return response(res,{error:'Method not allowed'},405);
 const f=pathname==='/'?'index.html':pathname.slice(1);
 if(!['index.html','app.js','style.css'].includes(f))return response(res,{error:'Not found'},404);
 const filename=path.join(root,'public',f);res.writeHead(200,{'Content-Type':MIME[path.extname(filename)],'Cache-Control':'no-cache'});createReadStream(filename).pipe(res);
 }catch(e){response(res,{error:String(e.message||e)},500)}});
server.listen(PORT,HOST,()=>console.log(`MagicPerspective V3 ready at http://${HOST}:${PORT}`));
