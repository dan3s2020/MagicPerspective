// MagicPerspective V5 local server. Isolated from V1–V4: own port (3034), own data/ files.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {makeWorld} from './engine/world.mjs';
import {Organ} from './engine/organ.mjs';
import {Episode,MODES} from './engine/agent.mjs';
import {train,evaluate,score,SEEDS} from './engine/training.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3034),host=process.env.HOST||'127.0.0.1';
const bestFile=path.join(root,'data','best-organ.json'),liveFile=path.join(root,'data','live-organ.json');
let organ=new Organ(17),bestScore=-Infinity,notes=null,task=null,testResult=null,cancel=false;
let world={seed:20261103,kind:'maze',size:9,mode:'organ-online'},episode;
try{const file=existsSync(liveFile)?liveFile:existsSync(bestFile)?bestFile:null;
  if(file){const saved=JSON.parse(await readFile(file,'utf8'));organ=Organ.restore(saved.organ);bestScore=saved.bestScore??-Infinity;testResult=saved.testResult??null;notes='Creier restaurat din '+path.basename(file);}
}catch(e){console.error('Checkpoint error:',e);notes='Checkpoint incompatibil, pornesc cu un organ nou: '+e.message;}
function organFor(mode){return mode==='organ-untrained'?new Organ(organ.seed):mode==='organ-frozen'?Organ.restore(organ.snapshot()):organ;}
function newEpisode(){episode=new Episode(makeWorld(world.seed,world.kind,world.size),organFor(world.mode),{online:world.mode!=='organ-frozen',mode:world.mode==='classic'?'classic':'organ'});}
newEpisode();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
function json(res,value,status=200){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}
async function body(req){let t='';for await(const c of req){t+=c;if(t.length>20000)throw Error('Request too large');}return t?JSON.parse(t):{};}
const int=(x,min,max,f)=>Number.isInteger(Number(x))&&Number(x)>=min&&Number(x)<=max?Number(x):f;
const oddSize=x=>{const n=int(x,5,17,world.size);if(n%2!==1)throw Error('Mărimea trebuie să fie impară (5–17)');return n;};
async function atomic(file,obj){await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify(obj));await rename(file+'.tmp',file);}
const save=file=>atomic(file,{schema:5,organ:organ.snapshot(),bestScore,testResult,saved:new Date().toISOString()});
function state(){return {version:'5.0.0-research',world,episode:episode.payload(),modes:MODES,
  model:{episodes:organ.episodes,shapeUpdates:organ.shape.updates,passUpdates:organ.pass.updates,bestScore:Number.isFinite(bestScore)?bestScore:null},task,testResult,notes};}
async function launchTraining(input){if(task?.running)throw Error('Antrenarea rulează deja');
  const episodes=int(input.episodes,10,20000,300),size=oddSize(input.size);cancel=false;
  task={running:true,done:0,total:episodes,size,history:[],best:null,error:null};
  const copy=Organ.restore(organ.snapshot());
  (async()=>{try{
    const r=await train(copy,{episodes,size,cancel:()=>cancel,onProgress:v=>{task.done=v.done;task.best=v.best;task.history=v.history;}});
    if(r.bestSnapshot){const candidate=Organ.restore(r.bestSnapshot),val=evaluate(candidate,{seed:SEEDS.validation,count:15,size,modes:['organ-frozen']}).modes['organ-frozen'],s=score(val);
      // Keep the previous brain if the new one is not better on the SAME validation worlds.
      const prev=Number.isFinite(bestScore)?score(evaluate(organ,{seed:SEEDS.validation,count:15,size,modes:['organ-frozen']}).modes['organ-frozen']):-Infinity;
      if(s>=prev){organ=candidate;bestScore=s;task.selected=`Checkpoint nou ales (scor validare ${s.toFixed(3)})`;await save(bestFile);}
      else task.selected=`Am păstrat creierul anterior (validare ${prev.toFixed(3)} > ${s.toFixed(3)})`;}
    testResult=evaluate(organ,{seed:SEEDS.test,count:30,size});
    world.seed+=911;newEpisode();await save(liveFile);
  }catch(e){task.error=String(e.message||e);console.error(e);}finally{task.running=false;task.cancelled=cancel;}})();
  return {started:true,episodes};}
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://localhost'),name=url.pathname;
  if(req.method==='GET'&&name==='/api/health')return json(res,{ok:true,version:5});
  if(req.method==='GET'&&name==='/api/state')return json(res,state());
  if(req.method==='GET'&&name==='/api/frame'){const f=episode.frame(int(url.searchParams.get('i'),0,1e6,0));return f?json(res,f):json(res,{error:'Pas inexistent'},404);}
  if(req.method==='GET'&&name==='/api/export')return json(res,{schema:5,organ:organ.snapshot(),bestScore});
  if(name.startsWith('/api/')){
    if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
    const input=await body(req);
    if(name==='/api/cancel'){cancel=true;return json(res,{requested:true});}
    if(name==='/api/train')return json(res,await launchTraining(input));
    if(task?.running)return json(res,{error:'Antrenarea este activă. Explorarea e blocată până la final.'},409);
    if(name==='/api/new'){world.size=oddSize(input.size??world.size);if(['maze','braided','graph'].includes(input.kind))world.kind=input.kind;
      if(MODES.includes(input.mode))world.mode=input.mode;world.seed=int(input.seed,1,2147483647,world.seed+1021);newEpisode();return json(res,state());}
    if(name==='/api/replay'){if(MODES.includes(input.mode))world.mode=input.mode;newEpisode();return json(res,state());}
    if(name==='/api/step'){const event=episode.step();if(episode.online&&world.mode==='organ-online'&&episode.steps%5===0)await save(liveFile);return json(res,{...state(),event});}
    if(name==='/api/run'){episode.run();if(world.mode==='organ-online')await save(liveFile);return json(res,state());}
    if(name==='/api/evaluate'){testResult=evaluate(organ,{seed:int(input.seed,1,2147483647,SEEDS.test),count:int(input.count,3,120,30),size:oddSize(input.size)});await save(liveFile);return json(res,state());}
    if(name==='/api/reset'){organ=new Organ(17);bestScore=-Infinity;testResult=null;notes='Doar creierul V5 a fost resetat';
      for(const f of [bestFile,liveFile])if(existsSync(f))await unlink(f);newEpisode();return json(res,state());}
    return json(res,{error:'Endpoint inexistent'},404);
  }
  if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
  const file=name==='/'?'index.html':name.slice(1);
  if(!['index.html','app.js','style.css','render.js'].includes(file))return json(res,{error:'Not found'},404);
  const full=path.join(root,'public',file);res.writeHead(200,{'Content-Type':MIME[path.extname(full)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});createReadStream(full).pipe(res);
}catch(e){console.error(e);json(res,{error:e.message??String(e)},500);}});
server.listen(port,host,()=>console.log(`MagicPerspective V5 · http://${host}:${port}`));
