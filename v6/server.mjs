import http from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createWorld,TOOLS,senseProbes,encodeContext,generateTask,parseGoal} from './engine/world.mjs';
import {CausalNet} from './engine/model.mjs';
import {SPLITS,train,evaluate,predictedPlan,testPlan} from './engine/training.mjs';
import {evaluateHypotheses} from './engine/hypotheses.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),HOST=process.env.HOST||'127.0.0.1';
const PORT=Number(process.env.PORT||3036),check=path.join(root,'data','best-model.json');
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid port');
let model=new CausalNet(17),bestQuality=-Infinity,task=null,evaluation=null,hypothesisEvaluation=null,lastTraining=null,stopRequested=false;
let sceneSeed=88003,world=createWorld(sceneSeed),probes=senseProbes(world),context=encodeContext(probes);
let challenge=generateTask(world,sceneSeed+73),demonstration=null;
try{
 if(existsSync(check)){
  const saved=JSON.parse(await readFile(check,'utf8'));
  model=CausalNet.restore(saved.model);bestQuality=saved.validationQuality??-Infinity;
  lastTraining={restored:true,bestQuality};
 }
}catch(e){console.error('Checkpoint restore failed: '+e.message)}
async function save(){await mkdir(path.dirname(check),{recursive:true});
 await writeFile(check+'.tmp',JSON.stringify({schema:6,model:model.snapshot(),validationQuality:bestQuality}));
 await rename(check+'.tmp',check);
}
const respond=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
async function body(req){
 let data='';for await(const part of req){data+=part;if(data.length>12000)throw Error('Payload too large')}
 return data?JSON.parse(data):{};
}
function int(v,min,max,fallback){const n=Number(v);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback}
function view(){
 const predicted=Object.fromEntries(TOOLS.map(tool=>[tool,model.predict(challenge.start,tool,context)]));
 return {version:'6.0.0-experiment',model:{episodes:model.episodes,steps:model.steps,samples:model.samples,bestQuality:
  Number.isFinite(bestQuality)?bestQuality:null},training:task,evaluation,lastTraining,
  hypothesisEvaluation,
  scene:{seed:sceneSeed,start:challenge.start,goal:challenge.goal,text:challenge.text,
   probes:probes.map(e=>({tool:e.tool,from:e.from,to:e.to})),predicted,
   teacherOnly:world.teacher(), // Not used by model. Human diagnostic only.
   demonstration}};
}
function newScene(seed){
 sceneSeed=seed;world=createWorld(seed);probes=senseProbes(world);context=encodeContext(probes);
 challenge=generateTask(world,seed+73);demonstration=null;
}
async function startTraining(arg){
 if(task?.running)throw Error('Training already running');
 const episodes=int(arg.episodes,1,20000,500),seed=int(arg.seed,1,2147000000,SPLITS.train);
 stopRequested=false;const candidate=CausalNet.restore(model.snapshot());
 task={running:true,done:0,total:episodes,best:null,latest:null,history:[],error:null,
  started:new Date().toISOString()};
 // Nonblocking batches keep the UI responsive and progress visible.
 (async()=>{try{
  const result=await train(candidate,{episodes,seed,validationWorlds:8,validateEvery:Math.max(10,Math.floor(episodes/30)),
   cancel:()=>stopRequested,onProgress:s=>Object.assign(task,{done:s.done,total:s.total,best:s.best,
    latest:s.latest,history:s.history})});
  let promoted=false;
  if(result.bestSnapshot&&result.best.quality>bestQuality){
   model=CausalNet.restore(result.bestSnapshot);bestQuality=result.best.quality;
   await save();promoted=true;
  }
  lastTraining={episodes:result.episodesCompleted,interrupted:result.interrupted,elapsedMs:result.elapsedMs,
   promoted,best:result.best,completed:new Date().toISOString()};
 }catch(e){task.error=String(e.stack||e)}finally{task.running=false;task.completed=new Date().toISOString()}})();
 return {started:true,total:episodes};
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
 '.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{
 try{
  const p=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'&&p==='/api/health')return respond(res,{ok:true,version:'6.0.0-experiment'});
  if(req.method==='GET'&&p==='/api/state')return respond(res,view());
  if(p.startsWith('/api/')){
   if(req.method!=='POST')return respond(res,{error:'Method not allowed'},405);
   const arg=await body(req);
   if(p==='/api/train')return respond(res,await startTraining(arg));
   if(p==='/api/cancel'){stopRequested=true;return respond(res,{requested:true,running:!!task?.running});}
   if(task?.running)return respond(res,{error:'Training active; wait for completion before altering worlds'},409);
   if(p==='/api/new'){
    newScene(int(arg.seed,1,2147000000,sceneSeed+101));return respond(res,view());
   }
   if(p==='/api/evaluate'){
    evaluation=evaluate(model,{seed:int(arg.seed,1,2147000000,SPLITS.test),
     worlds:int(arg.worlds,3,120,30),statesPerTool:7,goalsPerWorld:3,maxSteps:5});
    return respond(res,view());
   }
   if(p==='/api/evaluate-hypotheses'){
    hypothesisEvaluation=evaluateHypotheses({worlds:int(arg.worlds,3,120,30),extra:int(arg.extra,0,24,6),goalsPerWorld:3});
    return respond(res,view());
   }
   if(p==='/api/plan'){
    // The learner's plan sees only its observed context plus text goal.
    const goal=parseGoal(challenge.text);
    const trial=testPlan(world,challenge,(state,tool)=>model.predict(state,tool,context).state);
    demonstration={...trial,model:'trained neural',date:new Date().toISOString()};
    return respond(res,view());
   }
   if(p==='/api/reset'){
    if(arg.confirm!=='RESET V6')return respond(res,{error:'Exact reset confirmation required'},400);
    model=new CausalNet(17);bestQuality=-Infinity;task=null;evaluation=null;hypothesisEvaluation=null;lastTraining=null;
    newScene(sceneSeed+911);if(existsSync(check))await unlink(check);
    return respond(res,view());
   }
   return respond(res,{error:'Not found'},404);
  }
  if(req.method!=='GET')return respond(res,{error:'Method not allowed'},405);
  const target=p==='/'?'index.html':p.slice(1);
  if(!['index.html','app.js','style.css'].includes(target))return respond(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':MIME[path.extname(target)],'Cache-Control':'no-store'});
  createReadStream(path.join(root,'public',target)).pipe(res);
 }catch(e){return respond(res,{error:e.message||String(e)},500)}
});
server.listen(PORT,HOST,()=>console.log('Magic Perspective V6 ready: http://'+HOST+':'+PORT));
