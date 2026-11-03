import http from 'node:http';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {makeWorld} from './engine/world.mjs';
import {Agent} from './engine/agent.mjs';
import {makeBrain,train,evaluate} from './engine/training.mjs';
import {WorldNet} from './engine/model.mjs';
import {Perspective} from './engine/perspective.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3033),host=process.env.HOST||'127.0.0.1';
const bestFile=path.join(root,'data','best-brain.json'),liveFile=path.join(root,'data','live-brain.json');
let {net,perspective}=makeBrain(),episode,seed=20261103,kind='maze',size=9,online=true,task=null,testResult=null,notes=null,bestScore=-Infinity;
try{
 const file=existsSync(liveFile)?liveFile:existsSync(bestFile)?bestFile:null;
 if(file){const restored=JSON.parse(await readFile(file,'utf8'));net=WorldNet.restore(restored.net);perspective=Perspective.restore(restored.perspective);bestScore=restored.bestScore??-Infinity;notes='Restored '+path.basename(file);}
}catch(error){console.error('Checkpoint error:',error);notes='Could not restore checkpoint: '+error.message;}
episode=new Agent(makeWorld(seed,kind,size),net,perspective,{online});
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function json(res,value,status=200){const body=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);}
async function body(req){let txt='';for await(const c of req){txt+=c;if(txt.length>20000)throw Error('Request too large');}return txt?JSON.parse(txt):{};}
const int=(x,min,max,f)=>Number.isInteger(Number(x))&&Number(x)>=min&&Number(x)<=max?Number(x):f;
async function atomic(filename,obj){await mkdir(path.dirname(filename),{recursive:true});const temp=filename+'.tmp';await writeFile(temp,JSON.stringify(obj));await rename(temp,filename);}
async function save(which){await atomic(which,{schema:4,net:net.snapshot(),perspective:perspective.snapshot(),bestScore,saved:new Date().toISOString()});}
function state(){return {version:'4.0.0-research',episode:episode.payload(),model:{episodes:net.episodes,updates:net.updates,teacherUpdates:net.teacherUpdates,sensorUpdates:net.sensorUpdates,actionUpdates:net.actionUpdates,perspectiveComparisons:perspective.count},task,testResult,notes};}
let cancel=false;
async function launchTraining(input){if(task?.running)throw Error('Training is already running');
 const episodes=int(input.episodes,10,20000,200),s=int(input.size,5,17,9);if(s%2!==1)throw Error('Odd size required');
 cancel=false;testResult=null;task={running:true,done:0,total:episodes,history:[],best:null,error:null};
 const copyNet=WorldNet.restore(net.snapshot()),copyPerspective=Perspective.restore(perspective.snapshot());
 (async()=>{try{
  const result=await train(copyNet,copyPerspective,{episodes,size:s,validationCount:6,cancel:()=>cancel,
   onProgress:v=>{task.done=v.done;task.best=v.best;task.history=v.history;}});
  if(result.bestSnapshot){
   const improved=result.best.score>bestScore;
   if(improved){net=WorldNet.restore(result.bestSnapshot.net);perspective=Perspective.restore(result.bestSnapshot.perspective);bestScore=result.best.score;await save(bestFile);}
   task.selected=improved?'new best validation checkpoint':'retained previous checkpoint';
  }
  episode=new Agent(makeWorld(seed+=911,kind,size),net,perspective,{online});
  testResult=evaluate(net,perspective,{seed:4040500,count:12,size:s});
  await save(liveFile);task.done=result.history.at(-1)?.episode??0;task.finished=new Date().toISOString();
 }catch(e){task.error=String(e.stack||e);console.error('Training error:',e)}finally{task.running=false;task.cancelled=cancel;}})();
 return {started:true,episodes};
}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost'),name=url.pathname;
 if(req.method==='GET'&&name==='/api/health')return json(res,{ok:true,version:4});
 if(req.method==='GET'&&name==='/api/state')return json(res,state());
 if(req.method==='GET'&&name==='/api/export')return json(res,{net:net.snapshot(),perspective:perspective.snapshot(),bestScore});
 if(name.startsWith('/api/')){
  if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
  const input=await body(req);
  if(name==='/api/cancel'){cancel=true;return json(res,{requested:true});}
  if(name==='/api/train')return json(res,await launchTraining(input));
  if(task?.running)return json(res,{error:'Training is active. Exploration is locked.'},409);
  if(name==='/api/new'){
   size=int(input.size,5,17,size);if(size%2!==1)throw Error('Odd world size required');
   kind=['maze','braided','graph'].includes(input.kind)?input.kind:kind;
   online=input.online!==false;seed=int(input.seed,1,2147483647,seed+1021);
   episode=new Agent(makeWorld(seed,kind,size),net,perspective,{online});return json(res,state());
  }
  if(name==='/api/step'){
   const event=episode.step(input.edge===undefined?undefined:Number(input.edge));
   if(event.type==='invalid')return json(res,{error:'Invalid action for this position'},400);
   if(episode.online&&episode.steps%4===0)await save(liveFile);
   return json(res,{...state(),event});
  }
  if(name==='/api/evaluate'){
   testResult=evaluate(net,perspective,{seed:int(input.seed,1,2147483647,4040500),count:int(input.count,3,60,12),size:int(input.size,5,17,size)});
   return json(res,state());
  }
  if(name==='/api/reset'){
   ({net,perspective}=makeBrain());bestScore=-Infinity;testResult=null;notes='Only V4 brain was reset';
   for(const file of [bestFile,liveFile])if(existsSync(file))await unlink(file);
   episode=new Agent(makeWorld(seed+=41,kind,size),net,perspective,{online});return json(res,state());
  }
  return json(res,{error:'Endpoint not found'},404);
 }
 if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
 const file=name==='/'?'index.html':name.slice(1);
 if(!['index.html','app.js','style.css'].includes(file))return json(res,{error:'Not found'},404);
 const full=path.join(root,'public',file);res.writeHead(200,{'Content-Type':MIME[path.extname(full)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
 createReadStream(full).pipe(res);
 }catch(error){console.error(error);return json(res,{error:error.message??String(error)},500)}});
server.listen(port,host,()=>console.log(`MagicPerspective V4 · http://${host}:${port}`));
