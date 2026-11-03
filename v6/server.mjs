// MagicPerspective V6 — local server, port 3035, own data/ files. V1–V5 untouched.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {makeWorld,KINDS} from './engine/world.mjs';
import {Organism} from './engine/organ.mjs';
import {Episode} from './engine/agent.mjs';
import {train,evaluate,score,SEEDS} from './engine/training.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3035),host=process.env.HOST||'127.0.0.1';
const bestFile=path.join(root,'data','best-brain.json'),liveFile=path.join(root,'data','live-brain.json');
let org=new Organism(17),bestScore=-Infinity,task=null,test=null,cancel=false,note=null;
const cfg={seed:20261103,kind:'relief',size:15};let world,pair;
try{const f=existsSync(liveFile)?liveFile:existsSync(bestFile)?bestFile:null;
  if(f){const s=JSON.parse(await readFile(f,'utf8'));org=Organism.restore(s.brain);bestScore=s.bestScore??-Infinity;test=s.test??null;note='Creier restaurat';}}
catch(e){console.error(e);note='Checkpoint incompatibil — creier nou';}
function fresh(){world=makeWorld(cfg.seed,cfg.kind,cfg.size);
  pair={organ:new Episode(world,org,{mode:'organ',online:true}),classic:new Episode(world,org,{mode:'classic'})};}
fresh();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const json=(res,v,s=200)=>{res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(v));};
async function body(req){let t='';for await(const c of req){t+=c;if(t.length>20000)throw Error('Cerere prea mare');}return t?JSON.parse(t):{};}
const int=(x,a,b,f)=>Number.isInteger(Number(x))&&Number(x)>=a&&Number(x)<=b?Number(x):f;
const odd=x=>{const n=int(x,7,25,cfg.size);if(n%2!==1)throw Error('Mărimea trebuie să fie impară');return n;};
async function atomic(f,o){await mkdir(path.dirname(f),{recursive:true});await writeFile(f+'.tmp',JSON.stringify(o));await rename(f+'.tmp',f);}
const save=f=>atomic(f,{schema:6,brain:org.snapshot(),bestScore,test,saved:new Date().toISOString()});
function state(){return {version:'6.0.0',cfg,world:{kind:world.kind,n:world.n,start:world.start,goal:world.goal,truth:Array.from(world.h,h=>+h.toFixed(2))},
  organ:pair.organ.light(),classic:pair.classic.light(),brain:{episodes:org.episodes,samples:org.samples},task,test,note};}
async function launch(input){if(task?.running)throw Error('Antrenarea rulează deja');
  const episodes=int(input.episodes,10,5000,300),size=odd(input.size);cancel=false;task={running:true,done:0,total:episodes,size,history:[],error:null};
  const copy=Organism.restore(org.snapshot());
  (async()=>{try{const r=await train(copy,{episodes,size,cancel:()=>cancel,onProgress:v=>{task.done=v.done;task.history=v.history;}});
      if(r.bestSnapshot){const cand=Organism.restore(r.bestSnapshot),val=o=>score(evaluate(o,{seed:SEEDS.validation,count:10,size,kind:'relief',modes:['organ']}).modes.organ);
        const s=val(cand),prev=Number.isFinite(bestScore)?val(org):-Infinity;
        if(s>=prev){org=cand;bestScore=s;task.selected='Creier nou ales după validare';await save(bestFile);}else task.selected='Creierul anterior era mai bun la validare — l-am păstrat';}
      test=evaluate(org,{count:40,size});cfg.seed+=911;fresh();await save(liveFile);
    }catch(e){task.error=String(e.message||e);console.error(e);}finally{task.running=false;}})();
  return {started:true};}
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://x'),name=url.pathname;
  if(req.method==='GET'&&name==='/api/health')return json(res,{ok:true,version:6});
  if(req.method==='GET'&&name==='/api/state')return json(res,state());
  if(req.method==='GET'&&name==='/api/frame'){const ep=pair[url.searchParams.get('side')==='classic'?'classic':'organ'],i=int(url.searchParams.get('i'),0,1e6,0);
    return json(res,ep.frame(Math.min(i,ep.frames.length-1)));}
  if(req.method==='GET'&&name==='/api/export')return json(res,{schema:6,brain:org.snapshot(),bestScore});
  if(name.startsWith('/api/')){if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
    const input=await body(req);
    if(name==='/api/cancel'){cancel=true;return json(res,{ok:true});}
    if(name==='/api/train')return json(res,await launch(input));
    if(task?.running)return json(res,{error:'Antrenarea e activă.'},409);
    if(name==='/api/new'){if(KINDS.includes(input.kind))cfg.kind=input.kind;cfg.size=odd(input.size??cfg.size);cfg.seed=int(input.seed,1,2147483647,cfg.seed+1021);fresh();return json(res,state());}
    if(name==='/api/step'){pair.organ.step();pair.classic.step();if(pair.organ.steps%6===0)await save(liveFile);return json(res,state());}
    if(name==='/api/run'){pair.organ.run();pair.classic.run();await save(liveFile);return json(res,state());}
    if(name==='/api/evaluate'){test=evaluate(org,{count:int(input.count,6,200,40),size:odd(input.size)});await save(liveFile);return json(res,state());}
    if(name==='/api/reset'){org=new Organism(17);bestScore=-Infinity;test=null;note='Doar creierul V6 a fost resetat';for(const f of [bestFile,liveFile])if(existsSync(f))await unlink(f);fresh();return json(res,state());}
    return json(res,{error:'Endpoint inexistent'},404);}
  if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
  const file=name==='/'?'index.html':name.slice(1);if(!['index.html','app.js','style.css','draw.js'].includes(file))return json(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'Cache-Control':'no-cache'});createReadStream(path.join(root,'public',file)).pipe(res);
}catch(e){console.error(e);json(res,{error:e.message??String(e)},500);}}).listen(port,host,()=>console.log(`MagicPerspective V6 · http://${host}:${port}`));
