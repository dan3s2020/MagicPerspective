import http from 'node:http';
import {createReadStream,existsSync} from 'node:fs';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createWorld,TOOLS,senseProbes,encodeContext,generateTask,parseGoal} from './engine/world.mjs';
import {CausalNet} from './engine/model.mjs';
import {SPLITS,train,evaluate,predictedPlan,testPlan} from './engine/training.mjs';
import {evaluateHypotheses} from './engine/hypotheses.mjs';
import {makeBelief,hybridPrediction} from './engine/hybrid.mjs';
import {evaluateHybrid} from './engine/comparison.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),HOST=process.env.HOST||'127.0.0.1';
const PORT=Number(process.env.PORT||3036),check=path.join(root,'data','best-model.json'),
 ledgerFile=path.join(root,'data','training-ledger.json');
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid port');
let model=new CausalNet(17),bestQuality=-Infinity,task=null,evaluation=null,hybridEvaluation=null,
 hypothesisEvaluation=null,lastTraining=null,stopRequested=false;
const freshLedger=()=>({schema:1,nextWorldIndex:0,completedEpisodes:0,runsStarted:0,
 completedRuns:0,observedExamples:0,inferredExamples:0,legacyCheckpointEpisodes:0,
 legacyHistoryUnknown:false,lastSeed:null});
let ledger=freshLedger(),hadCheckpoint=false;
let sceneSeed=88003,world=createWorld(sceneSeed),probes=senseProbes(world),context=encodeContext(probes);
let challenge=generateTask(world,sceneSeed+73),demonstration=null;
try{
 if(existsSync(check)){
  const saved=JSON.parse(await readFile(check,'utf8'));
  model=CausalNet.restore(saved.model);bestQuality=saved.validationQuality??-Infinity;
  hadCheckpoint=true;
  lastTraining={restored:true,bestQuality};
 }
}catch(e){console.error('Checkpoint restore failed: '+e.message)}
try{
 if(existsSync(ledgerFile)){
  const saved=JSON.parse(await readFile(ledgerFile,'utf8'));
  if(saved?.schema!==1||!Number.isInteger(saved.nextWorldIndex)||saved.nextWorldIndex<0||
   !Number.isInteger(saved.completedEpisodes)||saved.completedEpisodes<0)throw Error('Invalid ledger schema');
  ledger={...freshLedger(),...saved};
 }else if(hadCheckpoint){
  // Legacy runs did not keep a historical ledger. Never invent their lost counts.
  // Start in a distant deterministic seed region to avoid reusing the old default runs.
  ledger={...freshLedger(),nextWorldIndex:1000000+model.episodes,
   legacyCheckpointEpisodes:model.episodes,legacyHistoryUnknown:true};
 }
}catch(e){throw Error('Training ledger load failed; refusing to reuse seeds: '+e.message)}
async function saveLedger(){
 await mkdir(path.dirname(ledgerFile),{recursive:true});
 await writeFile(ledgerFile+'.tmp',JSON.stringify(ledger));
 await rename(ledgerFile+'.tmp',ledgerFile);
}
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
  Number.isFinite(bestQuality)?bestQuality:null},training:task,evaluation,hybridEvaluation,
  ledger:{...ledger},lastTraining,
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
 const episodes=int(arg.episodes,1,20000,500);
 if(ledger.nextWorldIndex>500000000-episodes)throw Error('Training seed index exhausted; rotate training namespace');
 // Reserve distinct world indices BEFORE starting. Even a crash/cancel will not
 // repeat a previously allocated training world on the next run.
 const seed=((SPLITS.train>>>0)+Math.imul(ledger.nextWorldIndex,7919))>>>0;
 const firstIndex=ledger.nextWorldIndex;
 ledger.nextWorldIndex+=episodes;ledger.runsStarted++;ledger.lastSeed=seed;
 stopRequested=false;const candidate=CausalNet.restore(model.snapshot());
 const startEpisodes=candidate.episodes;
 task={running:true,done:0,total:episodes,seed,firstIndex,best:null,latest:null,
  history:[],error:null,started:new Date().toISOString()};
 try{await saveLedger()}catch(e){task.running=false;throw e}
 // Nonblocking batches keep the UI responsive and progress visible.
 (async()=>{try{
  const result=await train(candidate,{episodes,seed,validationWorlds:8,validateEvery:Math.max(10,Math.floor(episodes/30)),
   cancel:()=>stopRequested,onProgress:s=>Object.assign(task,{done:s.done,total:s.total,best:s.best,
    latest:s.latest,history:s.history})});
  const completed=result.episodesCompleted-startEpisodes;
  ledger.completedEpisodes+=completed;
  ledger.observedExamples+=result.measuredExamples;
  ledger.inferredExamples+=result.inferredExamples;
  ledger.completedRuns++;
  let promoted=false;
  if(result.bestSnapshot&&result.best.quality>bestQuality){
   model=CausalNet.restore(result.bestSnapshot);bestQuality=result.best.quality;
   await save();promoted=true;
  }
  await saveLedger();
  lastTraining={episodes:completed,interrupted:result.interrupted,elapsedMs:result.elapsedMs,
   trainingSeed:seed,firstIndex,measuredExamples:result.measuredExamples,
   inferredExamples:result.inferredExamples,promoted,best:result.best,
   completed:new Date().toISOString()};
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
    const worlds=int(arg.worlds,3,120,30);
    evaluation=evaluate(model,{seed:int(arg.seed,1,2147000000,SPLITS.test),
     worlds,statesPerTool:7,goalsPerWorld:3,maxSteps:5});
    // Distinct seed, no test-label reuse in either learner.
    hybridEvaluation=evaluateHybrid(model,{seed:6400021,worlds,extra:2,goalsPerWorld:3});
    return respond(res,view());
   }
   if(p==='/api/evaluate-hypotheses'){
    hypothesisEvaluation=evaluateHypotheses({worlds:int(arg.worlds,3,120,30),extra:int(arg.extra,0,24,6),goalsPerWorld:3});
    return respond(res,view());
   }
   if(p==='/api/plan'){
    // The learner's plan sees only its observed context plus text goal.
    const goal=parseGoal(challenge.text);
    const neural=testPlan(world,challenge,(state,tool)=>model.predict(state,tool,context).state);
    const organ=makeBelief(probes);
    const hybrid=testPlan(world,challenge,(state,tool)=>hybridPrediction(model,organ,state,tool,context).state);
    demonstration={...neural,neural,hybrid,model:'neural and causal hybrid',date:new Date().toISOString()};
    return respond(res,view());
   }
   if(p==='/api/reset'){
    if(arg.confirm!=='RESET V6')return respond(res,{error:'Exact reset confirmation required'},400);
    model=new CausalNet(17);bestQuality=-Infinity;task=null;evaluation=null;hybridEvaluation=null;
    hypothesisEvaluation=null;lastTraining=null;ledger=freshLedger();
    newScene(sceneSeed+911);if(existsSync(check))await unlink(check);
    if(existsSync(ledgerFile))await unlink(ledgerFile);
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
