// Graph Dance local research server, independent of V1-V7 checkpoint formats.
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createReadStream,existsSync} from 'node:fs';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {makeWorld,oracle} from './engine/world.mjs';
import {importExternalWorld} from './engine/external.mjs';
import {AssociationRule} from './engine/dance.mjs';
import {Episode} from './engine/agent.mjs';
import {train,evaluate,linkBCE} from './engine/training.mjs';
const home=path.dirname(fileURLToPath(import.meta.url));
const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3040);
const bestPath=path.join(home,'data','best-rule.json'),livePath=path.join(home,'data','live-rule.json');
let rule=new AssociationRule(19),best=Infinity,progress=null,assessment=null,cancel=false,notice='',trainingCursor=0;
let options={seed:20261103,n:33,family:'mixed',dance:true,online:true},episode;
let importedWorld=null,importedSummary=null,importedComparison=null;
try{const p=existsSync(livePath)?livePath:existsSync(bestPath)?bestPath:null;
 if(p){const snapshot=JSON.parse(await readFile(p,'utf8'));rule=AssociationRule.restore(snapshot.rule);best=snapshot.best??Infinity;
    trainingCursor=Number.isInteger(snapshot.trainingCursor)&&snapshot.trainingCursor>=0?snapshot.trainingCursor:1000000+rule.episodes;
    notice='Model restaurat din '+path.basename(p);}
}catch(e){notice='Checkpoint incompatibil: '+e.message;console.error(e);}
function buildEpisode(){
 const world=importedWorld||makeWorld(options.seed,options.n,options.family);
 // Importing a task never edits the global training checkpoint during exploration.
 const selectedRule=importedWorld?AssociationRule.restore(rule.snapshot()):rule;
 episode=new Episode(world,selectedRule,{dance:options.dance,online:importedWorld?false:options.online});
}
buildEpisode();
async function save(file){await mkdir(path.dirname(file),{recursive:true});const tmp=file+'.tmp';
 await writeFile(tmp,JSON.stringify({schema:7,rule:rule.snapshot(),best,trainingCursor,at:new Date().toISOString()}));await rename(tmp,file);
}
const integer=(x,min,max,fallback)=>Number.isInteger(Number(x))&&Number(x)>=min&&Number(x)<=max?Number(x):fallback;
const json=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj));};
async function payload(req){let data='';for await(const chunk of req){data+=chunk;if(data.length>180000)throw Error('Request too large');}return data?JSON.parse(data):{};}
const state=()=>({version:'6.0.0-graph-dance',options,
 externalTask:importedSummary,externalComparison:importedComparison,
 episode:progress?.running&&progress.preview?progress.preview:episode.payload(),
 model:{...rule.snapshot(),best,trainingCursor},progress:progress?{...progress,preview:undefined}:null,assessment,notice});
// Infinite is a STOP-CONTROLLED LOOP, not an arbitrarily large finite demo.
async function startUnlimited(input){
 const n=integer(input.n,13,65,options.n);cancel=false;
 progress={running:true,unlimited:true,done:0,total:null,history:[],error:null,
   best:null,selected:null,preview:null,previewSeed:null};
 const working=AssociationRule.restore(rule.snapshot());
 (async()=>{try{
  while(!cancel){
   const batch=60,offset=trainingCursor,previousDone=progress.done;
   trainingCursor+=batch;await save(livePath); // reserve worlds before sampling
   const result=await train(working,{n,episodes:batch,seedOffset:offset,
     cancel:()=>cancel,
     onEpisode:e=>{
       const payload=e.payload();
       // Send sampled REAL frames once per response, not twice via progress + episode.
       const jump=Math.max(1,Math.ceil(payload.history.length/70));
       payload.history=payload.history.filter((_,i)=>i%jump===0||i===payload.history.length-1).slice(-70);
       progress.preview=payload;progress.previewSeed=e.world.seed;
     },
     onProgress:x=>{
       progress.done=previousDone+x.done;
       progress.history=[...progress.history,x.latest].slice(-80);
       progress.best=x.best;
     }});
   progress.done=previousDone+result.done;
   const candidate=AssociationRule.restore(result.checkpoint),
     current=linkBCE(rule,{seed:800008,count:9,n}).balanced,
     next=linkBCE(candidate,{seed:800008,count:9,n}).balanced;
   if(next<current){rule=candidate;best=next;
     progress.selected='Checkpoint nou · eroare BCE '+next.toFixed(4);await save(bestPath);}
   else progress.selected='Checkpoint anterior păstrat · organismul continuă';
   await save(livePath);
   if(!result.done&&!cancel)throw Error('No world processed in training batch');
  }
  assessment=evaluate(rule,{count:12,n,seed:990000});
  options.seed+=911;buildEpisode();notice='Antrenare nelimitată oprită; checkpoint păstrat.';
  await save(livePath);
 }catch(err){progress.error=String(err.stack||err);console.error(err);}
 finally{progress.running=false;progress.stopped=true;progress.completed=new Date().toISOString();}
 })();
 return {started:true,unlimited:true,n};
}
async function startTraining(input){if(progress?.running)throw Error('Training is already running');
 if(input.episodes===0||input.continuous===true)return startUnlimited(input);
 const n=integer(input.n,13,65,options.n),episodes=integer(input.episodes,1,10000,200);cancel=false;
 progress={running:true,done:0,total:episodes,history:[],error:null,best:null,selected:null};
 const temporary=AssociationRule.restore(rule.snapshot());
 (async()=>{try{
   const result=await train(temporary,{n,episodes,cancel:()=>cancel,onProgress:x=>{progress.done=x.done;progress.history=x.history;progress.best=x.best;}});
   const candidate=AssociationRule.restore(result.checkpoint),current=linkBCE(rule,{seed:800008,count:9,n}).balanced;
   const score=linkBCE(candidate,{seed:800008,count:9,n}).balanced;
   if(score<current){rule=candidate;best=score;progress.selected='New checkpoint selected: held-out link BCE '+score.toFixed(4);await save(bestPath);}
   else progress.selected='Previous checkpoint retained ('+current.toFixed(4)+' vs '+score.toFixed(4)+')';
   assessment=evaluate(rule,{count:12,n,seed:990000});
   // A selected checkpoint must actually power the ACTIVE organism, not just the UI model counter.
   // Start a clean, new local-observation episode. Training truth remains sealed.
   options.seed+=911;buildEpisode();
   notice='Training încheiat; organism nou creat cu checkpointul selectat.';
   await save(livePath);
  }catch(err){progress.error=err.message;console.error(err);}
  finally{progress.running=false;progress.cancelled=cancel;}})();
 return {started:true,episodes,n};
}
const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const server=http.createServer(async(req,res)=>{try{
 const pathname=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&pathname==='/api/state')return json(res,state());
 if(req.method==='GET'&&pathname==='/api/health')return json(res,{ok:true,version:"graph-dance"});
 if(pathname.startsWith('/api/')){
  if(req.method!=='POST')return json(res,{error:'POST required'},405);
  const input=await payload(req);
  if(pathname==='/api/stop'){cancel=true;return json(res,{requested:true});}
  if(pathname==='/api/train')return json(res,await startTraining(input));
  if(progress?.running)return json(res,{error:'Training is active'},409);
  if(pathname==='/api/task/import'){
   const parsed=importExternalWorld(input.problem);
   importedWorld=parsed.world;importedSummary=parsed.summary;importedComparison=null;
   buildEpisode();notice='Problemă externă activă: '+importedSummary.name;
   return json(res,state());
  }
  if(pathname==='/api/task/compare'){
   if(!importedWorld)return json(res,{error:'Import a task first'},400);
   const shortest=oracle(importedWorld);
   if(!Number.isFinite(shortest.cost)){
    importedComparison={reachable:false,modes:{},reason:'Nu există traseu valid între start și țintă'};
    return json(res,state());
   }
   const methods=[
    {id:'dance-frozen',trained:true,dance:true},
    {id:'no-dance-frozen',trained:true,dance:false},
    {id:'untrained',trained:false,dance:true}
   ];
   const modes={};
   for(const method of methods){
    const candidate=method.trained?AssociationRule.restore(rule.snapshot()):new AssociationRule(rule.seed);
    const run=new Episode(importedWorld,candidate,{dance:method.dance,online:false});
    run.run();
    const result=run.summary();
    modes[method.id]={solved:result.solved,steps:result.steps,cost:result.cost,
     penalizedCost:result.penalizedCost,initialF1:result.initialF1,
     optimalCost:shortest.cost,excessCost:result.solved?result.cost-shortest.cost:null,
     exploredPairs:result.discovered,learnedUpdates:0};
   }
   importedComparison={reachable:true,optimalCost:shortest.cost,
    graph:importedSummary.name,modes};
   return json(res,state());
  }
  if(pathname==='/api/new'){
   importedWorld=null;importedSummary=null;importedComparison=null;
   options={seed:integer(input.seed,1,2147483647,options.seed+7919),n:integer(input.n,13,65,options.n),
    family:['local','hierarchical','mixed'].includes(input.family)?input.family:options.family,
    dance:input.dance!==false,online:input.online!==false};
   buildEpisode();return json(res,state());
  }
  if(pathname==='/api/step'){const event=episode.step();if(options.online&&episode.steps%12===0)await save(livePath);return json(res,{...state(),event});}
  if(pathname==='/api/run'){episode.run(Math.min(episode.limit,integer(input.steps,1,600,200)));if(options.online)await save(livePath);return json(res,state());}
  if(pathname==='/api/test'){assessment=evaluate(rule,{count:integer(input.count,3,120,12),n:integer(input.n,13,65,options.n),seed:990000});return json(res,state());}
  if(pathname==='/api/reset'){
   if(input.confirm!=='RESET-GRAPH-DANCE')return json(res,{error:'Reset requires explicit confirmation'},400);
   rule=new AssociationRule(19);best=Infinity;assessment=null;for(const p of [bestPath,livePath])if(existsSync(p))await unlink(p);
   buildEpisode();notice='Only the Graph Dance association rule has been reset';return json(res,state());}
  return json(res,{error:'Unknown endpoint'},404);
 }
 if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
 const file=pathname==='/'?'index.html':pathname.slice(1);
 if(!['index.html','app.js','style.css'].includes(file))return json(res,{error:'File not found'},404);
 const full=path.join(home,'public',file);res.writeHead(200,{'Content-Type':type[path.extname(full)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
 createReadStream(full).pipe(res);
}catch(err){console.error(err);json(res,{error:err.message||String(err)},500);}});
server.listen(port,host,()=>console.log('MagicPerspective Graph Dance Experiment · http://'+host+':'+port));
