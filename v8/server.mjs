// MagicPerspective V8 — local server, port 3039, own data/ files. V1–V7 untouched.
// The V6 and V7 brains on this device (../v6/data, ../v7/data) are only READ, to compare them — never written.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {Organism8,restoreAny} from './engine/organism8.mjs';
import {train,evaluate,score,SEEDS,SHOWCASE,imagineOnce,lightSnapshot,KINDS,CUE_KINDS,makeAny,episodeFor} from './engine/training.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3039),host=process.env.HOST||'127.0.0.1';
const bestFile=path.join(root,'data','best-brain.json'),liveFile=path.join(root,'data','live-brain.json');
const oldFiles=v=>['live-brain.json','best-brain.json'].map(f=>path.join(root,'..',v,'data',f));
let org=new Organism8(17),bestScore=-Infinity,task=null,test=null,cancel=false,note=null;const old={v6:null,v7:null};
let life={runs:[],tests:[],milestones:[]};
const cfg={seed:20261103,kind:'relief',size:15,left:'v8'};let world,pair;
try{const f=existsSync(liveFile)?liveFile:existsSync(bestFile)?bestFile:null;
  if(f){const s=JSON.parse(await readFile(f,'utf8'));org=Organism8.restore(s.brain);bestScore=s.bestScore??-Infinity;test=s.test??null;life=s.life??life;note='Creier V8 restaurat';}}
catch(e){console.error(e);note='Checkpoint V8 incompatibil — creier nou';}
async function loadOld(){for(const v of ['v6','v7']){old[v]=null;for(const f of oldFiles(v))if(existsSync(f)){try{const s=JSON.parse(await readFile(f,'utf8'));old[v]=restoreAny(s.brain);break;}catch(e){console.error(v,'brain unreadable:',e.message);}}}}
await loadOld();
const contenders=()=>Object.fromEntries(Object.entries(old).filter(([,b])=>b).map(([v,b])=>[v+'-brain',b]));
if(!life.milestones.some(m=>m.episodes===0)&&org.episodes===0)life.milestones.push({episodes:0,brain:lightSnapshot(org)});
function fresh(){world=makeAny(cfg.seed,cfg.kind,cfg.size);if(cfg.left!=='v8'&&(!old[cfg.left]||world.kind==='network'))cfg.left='v8';
  const left=cfg.left==='v8'?org:restoreAny(old[cfg.left].snapshot());
  pair={organ:episodeFor(world,left,{mode:'organ',online:true}),classic:episodeFor(world,org,{mode:'classic'})};}
fresh();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const json=(res,v,s=200)=>{res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(v));};
async function body(req){let t='';for await(const c of req){t+=c;if(t.length>20000)throw Error('Cerere prea mare');}return t?JSON.parse(t):{};}
const int=(x,a,b,f)=>Number.isInteger(Number(x))&&Number(x)>=a&&Number(x)<=b?Number(x):f;
const odd=x=>{const n=int(x,7,25,cfg.size);if(n%2!==1)throw Error('Mărimea trebuie să fie impară');return n;};
async function atomic(f,o){await mkdir(path.dirname(f),{recursive:true});await writeFile(f+'.tmp',JSON.stringify(o));await rename(f+'.tmp',f);}
const save=f=>atomic(f,{schema:8,brain:org.snapshot(),bestScore,test,life,saved:new Date().toISOString()});
function kinds(){const g=org.grid;return [...g.centroids.map((c,k)=>({slot:k,worlds:g.counts[k],rocky:+(c[0]*2).toFixed(2),meanHeight:+(c[1]*2).toFixed(2),horizon:+c[2].toFixed(2),flatTops:+c[3].toFixed(2)})),{network:true,worlds:org.net.samples}];}
function worldView(w){return w.kind==='network'?{kind:'network',n:w.n,pos:w.pos,links:w.links.map(l=>[l.a,l.b]),open:w.links.map(l=>l.open?1:0),cost:w.links.map(l=>l.cost),start:w.start,goal:w.goal}
  :{kind:w.kind,n:w.n,start:w.start,goal:w.goal,truth:Array.from(w.h,h=>+h.toFixed(2))};}
function state(){return {version:'8.0.0',cfg,old:{v6:old.v6?{episodes:old.v6.episodes}:null,v7:old.v7?{episodes:old.v7.episodes}:null},world:worldView(world),
  organ:pair.organ.light(),classic:pair.classic.light(),brain:{episodes:org.episodes,samples:org.samples},task,test,note};}
const runTest=size=>{const t=evaluate(org,{count:80,size,extra:contenders()});t.date=new Date().toISOString();t.brainEpisodes=org.episodes;
  life.tests.push({date:t.date,episodes:org.episodes,size,...Object.fromEntries(KINDS.map(k=>[k,t.kinds[k]?.organ])),classic:Object.fromEntries(KINDS.map(k=>[k,t.kinds[k]?.classic]))});if(life.tests.length>60)life.tests.shift();return t;};
async function launch(input){if(task?.running)throw Error('Antrenarea rulează deja');
  const episodes=int(input.episodes,10,5000,300),size=odd(input.size);cancel=false;task={running:true,done:0,total:episodes,size,history:[],error:null};
  const copy=Organism8.restore(org.snapshot()),start=copy.episodes,captured=[];
  (async()=>{try{const r=await train(copy,{episodes,size,cancel:()=>cancel,onProgress:v=>{task.done=v.done;task.history=v.history;},onMilestone:(e,b)=>captured.push({episodes:e,brain:b})});
      if(r.bestSnapshot){const cand=Organism8.restore(r.bestSnapshot),val=o=>score(evaluate(o,{seed:SEEDS.validation,count:24,size,kinds:CUE_KINDS,modes:['organ']}).modes.organ);
        const s=val(cand),prev=Number.isFinite(bestScore)?val(org):-Infinity;
        if(s>=prev){org=cand;bestScore=s;task.selected='Creier nou ales după validare';}else task.selected='Creierul anterior era mai bun la validare — l-am păstrat';
        for(const m of captured)if(m.episodes<=org.episodes&&!life.milestones.some(x=>x.episodes===m.episodes))life.milestones.push(m);
        life.milestones.sort((a,b)=>a.episodes-b.episodes);
        life.runs.push({date:new Date().toISOString(),from:start,to:copy.episodes,kept:org.episodes,size,history:r.history});if(life.runs.length>40)life.runs.shift();}
      test=runTest(size);cfg.seed+=911;fresh();await save(bestFile);await save(liveFile);
    }catch(e){task.error=String(e.message||e);console.error(e);}finally{task.running=false;}})();
  return {started:true};}
function lifeView(size){const brains=[...life.milestones.map(m=>({label:`după ${m.episodes} lumi`,episodes:m.episodes,brain:restoreAny(m.brain)}))];
  if(!life.milestones.some(m=>m.episodes===org.episodes))brains.push({label:`acum · ${org.episodes} lumi`,episodes:org.episodes,brain:org});
  for(const v of ['v7','v6'])if(old[v])brains.push({label:`creierul tău ${v.toUpperCase()} · ${old[v].episodes} lumi`,episodes:old[v].episodes,brain:old[v],v6:true});
  // One picture is an anecdote: every brain is also scored on 12 fixed worlds of the same kind as the picture.
  const showcase=SHOWCASE.map(sc=>{const w=makeAny(sc.seed,sc.kind,size),bench=Array.from({length:12},(_,k)=>makeAny(7100+k*31,sc.kind,size));
    const view=worldView(w),pics=brains.map(b=>{const one=imagineOnce(b.brain,w);if(one.unsupported)return {label:b.label,episodes:b.episodes,v6:!!b.v6,unsupported:true};
      const r=bench.map(x=>imagineOnce(b.brain,x));return {label:b.label,episodes:b.episodes,v6:!!b.v6,...one,avgError:+(r.reduce((a,x)=>a+x.mapError,0)/r.length).toFixed(3),avgMatch:+(r.reduce((a,x)=>a+x.match,0)/r.length).toFixed(3)};});
    return {...sc,world:view,truthRoute:imagineOnce(null,w).truth,brains:pics};});
  return {size,showcase,kinds:kinds(),runs:life.runs.map(r=>({date:r.date,from:r.from,to:r.to,kept:r.kept,history:r.history.map(h=>({episode:h.episode,match0:h.match0,classic:h.classic.match0}))})),tests:life.tests};}
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://x'),name=url.pathname;
  if(req.method==='GET'&&name==='/api/health')return json(res,{ok:true,version:8});
  if(req.method==='GET'&&name==='/api/state')return json(res,state());
  if(req.method==='GET'&&name==='/api/life'){await loadOld();return json(res,lifeView(odd(url.searchParams.get('size')??cfg.size)));}
  if(req.method==='GET'&&name==='/api/frame'){const ep=pair[url.searchParams.get('side')==='classic'?'classic':'organ'],i=int(url.searchParams.get('i'),0,1e6,0);
    return json(res,ep.frame(Math.min(i,ep.frames.length-1)));}
  if(req.method==='GET'&&name==='/api/export')return json(res,{schema:8,brain:org.snapshot(),bestScore,life});
  if(name.startsWith('/api/')){if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
    const input=await body(req);
    if(name==='/api/cancel'){cancel=true;return json(res,{ok:true});}
    if(name==='/api/train')return json(res,await launch(input));
    if(task?.running)return json(res,{error:'Antrenarea e activă.'},409);
    if(name==='/api/new'){if(KINDS.includes(input.kind))cfg.kind=input.kind;if(['v8','v7','v6'].includes(input.left))cfg.left=input.left;cfg.size=odd(input.size??cfg.size);
      cfg.seed=int(input.seed,1,2147483647,input.same?cfg.seed:cfg.seed+1021);await loadOld();fresh();return json(res,state());}
    if(name==='/api/step'){pair.organ.step();pair.classic.step();if(pair.organ.steps%6===0&&cfg.left==='v8')await save(liveFile);return json(res,state());}
    if(name==='/api/run'){pair.organ.run();pair.classic.run();if(cfg.left==='v8')await save(liveFile);return json(res,state());}
    if(name==='/api/evaluate'){await loadOld();test=runTest(odd(input.size));await save(liveFile);return json(res,state());}
    if(name==='/api/reset'){org=new Organism8(17);bestScore=-Infinity;test=null;life={runs:[],tests:[],milestones:[{episodes:0,brain:lightSnapshot(org)}]};note='Doar creierul V8 a fost resetat';
      for(const f of [bestFile,liveFile])if(existsSync(f))await unlink(f);fresh();return json(res,state());}
    return json(res,{error:'Endpoint inexistent'},404);}
  if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
  const file=name==='/'?'index.html':name.slice(1);if(!['index.html','app.js','style.css','draw.js','life.js'].includes(file))return json(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'Cache-Control':'no-cache'});createReadStream(path.join(root,'public',file)).pipe(res);
}catch(e){console.error(e);json(res,{error:e.message??String(e)},500);}}).listen(port,host,()=>console.log(`MagicPerspective V8 · http://${host}:${port}`));
