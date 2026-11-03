// MagicPerspective V7 — local server, port 3036, own data/ files. V1–V6 untouched.
// The V6 brain on this device (../v6/data) is only READ, to compare it — never written.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir,unlink} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {makeWorld,KINDS} from './engine/world.mjs';
import {Organism7,restoreBrain} from './engine/organ.mjs';
import {Episode} from './engine/agent.mjs';
import {train,evaluate,score,SEEDS,SHOWCASE,imagineOnce,lightSnapshot} from './engine/training.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||3036),host=process.env.HOST||'127.0.0.1';
const bestFile=path.join(root,'data','best-brain.json'),liveFile=path.join(root,'data','live-brain.json');
const v6Files=['live-brain.json','best-brain.json'].map(f=>path.join(root,'..','v6','data',f));
let org=new Organism7(17),bestScore=-Infinity,task=null,test=null,cancel=false,note=null,v6brain=null;
let life={runs:[],tests:[],milestones:[]};let trainingCursor=0;
const cfg={seed:20261103,kind:'relief',size:15,left:'v7'};let world,pair;
try{const f=existsSync(liveFile)?liveFile:existsSync(bestFile)?bestFile:null;
  if(f){const s=JSON.parse(await readFile(f,'utf8'));org=Organism7.restore(s.brain);bestScore=s.bestScore??-Infinity;test=s.test??null;life=s.life??life;
    trainingCursor=Number.isInteger(s.trainingCursor)&&s.trainingCursor>=0?s.trainingCursor:1000000+org.episodes;
    note='Creier V7 restaurat';}}
catch(e){console.error(e);note='Checkpoint V7 incompatibil — creier nou';}
async function loadV6(){for(const f of v6Files)if(existsSync(f)){try{const s=JSON.parse(await readFile(f,'utf8'));v6brain=restoreBrain(s.brain);return;}catch(e){console.error('V6 brain unreadable:',e.message);}}v6brain=null;}
await loadV6();
if(!life.milestones.some(m=>m.episodes===0)&&org.episodes===0)life.milestones.push({episodes:0,brain:lightSnapshot(org)});
const leftBrain=()=>cfg.left==='v6'&&v6brain?v6brain:org;
function fresh(){world=makeWorld(cfg.seed,cfg.kind,cfg.size);
  pair={organ:new Episode(world,cfg.left==='v6'&&v6brain?restoreBrain(v6brain.snapshot()):org,{mode:'organ',online:true}),classic:new Episode(world,org,{mode:'classic'})};}
fresh();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const json=(res,v,s=200)=>{res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(v));};
async function body(req){let t='';for await(const c of req){t+=c;if(t.length>20000)throw Error('Cerere prea mare');}return t?JSON.parse(t):{};}
const int=(x,a,b,f)=>Number.isInteger(Number(x))&&Number(x)>=a&&Number(x)<=b?Number(x):f;
const odd=x=>{const n=int(x,7,25,cfg.size);if(n%2!==1)throw Error('Mărimea trebuie să fie impară');return n;};
async function atomic(f,o){await mkdir(path.dirname(f),{recursive:true});await writeFile(f+'.tmp',JSON.stringify(o));await rename(f+'.tmp',f);}
const save=f=>atomic(f,{schema:7,brain:org.snapshot(),bestScore,test,life,trainingCursor,saved:new Date().toISOString()});
function kinds(){return org.centroids.map((c,k)=>({slot:k,worlds:org.counts[k],rocky:+(c[0]*2).toFixed(2),meanHeight:+(c[1]*2).toFixed(2),horizon:+c[2].toFixed(2),flatTops:+c[3].toFixed(2)}));}
function state(){return {version:'7.0.0',cfg,v6:v6brain?{episodes:v6brain.episodes}:null,world:{kind:world.kind,n:world.n,start:world.start,goal:world.goal,truth:Array.from(world.h,h=>+h.toFixed(2))},
  organ:pair.organ.light(),classic:pair.classic.light(),brain:{episodes:org.episodes,samples:org.samples,trainingCursor},task,test,note};}
const runTest=size=>{const t=evaluate(org,{count:40,size,extra:v6brain?{'v6-brain':v6brain}:{}});t.date=new Date().toISOString();t.brainEpisodes=org.episodes;
  life.tests.push({date:t.date,episodes:org.episodes,size,relief:t.kinds.relief?.organ,maze:t.kinds.maze?.organ,classicRelief:t.kinds.relief?.classic});if(life.tests.length>60)life.tests.shift();return t;};
// Continuous training runs real complete episodes until explicit Cancel.
// Batch checkpoints, bounded UI history and a durable seed cursor avoid a fake demo
// or accidental replay of the same worlds after a rejected checkpoint/restart.
const frameSample=(frames,max=48)=>{
 const jump=Math.max(1,Math.ceil(frames.length/max));
 return frames.filter((_,i)=>i%jump===0||i===frames.length-1).slice(-max);
};
function previewEpisode(ep){
 // Replays actual completed episodes from the training organism and a matched
 // no-organ control. Both use the SAME world; the truth map is human-only.
 const classic=new Episode(ep.world,org,{mode:'classic',online:false,record:true,imagine:0});
 classic.run();
 return {
  id:ep.world.seed,kind:ep.world.kind,
  world:{kind:ep.world.kind,n:ep.world.n,start:ep.world.start,
   goal:ep.world.goal,truth:Array.from(ep.world.h,h=>+h.toFixed(3))},
  organFrames:frameSample(ep.frames),
  classicFrames:frameSample(classic.frames),
  summary:ep.summary()
 };
}
async function launchUnlimited(input){
 const size=odd(input.size);cancel=false;
 task={running:true,unlimited:true,done:0,total:null,size,history:[],
  error:null,selected:'',preview:null,started:new Date().toISOString()};
 const work=Organism7.restore(org.snapshot());
 (async()=>{let round=0;
  try{
   while(!cancel){
    const batch=60,seedOffset=trainingCursor,old=work.episodes;
    // Reserve BEFORE running; even interrupted batches never reuse seeds.
    trainingCursor+=batch;await save(liveFile);
    const captured=[],previousDone=task.done;
    const r=await train(work,{episodes:batch,size,seedOffset,previewEvery:10,
     cancel:()=>cancel,
     onEpisode:ep=>{task.preview=previewEpisode(ep);},
     onMilestone:(e,b)=>captured.push({episodes:e,brain:b}),
     onProgress:x=>{
      task.done=previousDone+x.done;
      task.last=x.latest;
      task.history=[...task.history,{...x.latest,round}].slice(-75);
     }});
    task.done=previousDone+work.episodes-old;
    const candidate=r.bestSnapshot?Organism7.restore(r.bestSnapshot):null;
    if(candidate){
     const val=o=>score(evaluate(o,{seed:SEEDS.validation,count:24,size,kind:'relief',modes:['organ']}).modes.organ);
     const next=val(candidate),previous=Number.isFinite(bestScore)?val(org):-Infinity;
     if(next>=previous){
      org=candidate;bestScore=next;task.selected='Checkpoint îmbunătățit după validare';
      await save(bestFile);
     }else task.selected='Checkpoint anterior păstrat; antrenarea continuă';
     for(const m of captured)if(m.episodes<=org.episodes&&!life.milestones.some(x=>x.episodes===m.episodes))
      life.milestones.push(m);
     life.milestones.sort((a,b)=>a.episodes-b.episodes);
     life.runs.push({date:new Date().toISOString(),from:old,to:work.episodes,
      kept:org.episodes,size,history:r.history});
     if(life.runs.length>40)life.runs.shift();
    }
    round++;
    await save(liveFile); // Periodic durable progress, not only at termination
    if(!r.cancelled&&work.episodes===old)throw Error('Training batch did not advance');
   }
   test=runTest(size);cfg.seed+=911;fresh();await save(liveFile);
  }catch(e){task.error=String(e.stack||e);console.error(e);}
  finally{task.running=false;task.completed=new Date().toISOString();}
 })();
 return {started:true,unlimited:true};
}
async function launch(input){if(task?.running)throw Error('Antrenarea rulează deja');
  if(input.episodes===0||input.continuous===true)return launchUnlimited(input);
  const episodes=int(input.episodes,10,5000,300),size=odd(input.size);cancel=false;task={running:true,done:0,total:episodes,size,history:[],error:null};
  const copy=Organism7.restore(org.snapshot()),start=copy.episodes,captured=[];
  (async()=>{try{const r=await train(copy,{episodes,size,cancel:()=>cancel,onProgress:v=>{task.done=v.done;task.history=v.history;},onMilestone:(e,b)=>captured.push({episodes:e,brain:b})});
      if(r.bestSnapshot){const cand=Organism7.restore(r.bestSnapshot),val=o=>score(evaluate(o,{seed:SEEDS.validation,count:24,size,kind:'relief',modes:['organ']}).modes.organ);
        const s=val(cand),prev=Number.isFinite(bestScore)?val(org):-Infinity;
        if(s>=prev){org=cand;bestScore=s;task.selected='Creier nou ales după validare';}else task.selected='Creierul anterior era mai bun la validare — l-am păstrat';
        for(const m of captured)if(m.episodes<=org.episodes&&!life.milestones.some(x=>x.episodes===m.episodes))life.milestones.push(m);
        life.milestones.sort((a,b)=>a.episodes-b.episodes);
        life.runs.push({date:new Date().toISOString(),from:start,to:copy.episodes,kept:org.episodes,size,history:r.history});if(life.runs.length>40)life.runs.shift();}
      test=runTest(size);cfg.seed+=911;fresh();await save(bestFile);await save(liveFile);
    }catch(e){task.error=String(e.message||e);console.error(e);}finally{task.running=false;}})();
  return {started:true};}
function lifeView(size){const brains=[...life.milestones.map(m=>({label:`după ${m.episodes} terenuri`,episodes:m.episodes,brain:restoreBrain(m.brain)}))];
  if(!life.milestones.some(m=>m.episodes===org.episodes))brains.push({label:`acum · ${org.episodes} terenuri`,episodes:org.episodes,brain:org});
  if(v6brain)brains.push({label:`creierul tău V6 · ${v6brain.episodes} terenuri`,episodes:v6brain.episodes,brain:v6brain,v6:true});
  // One picture is an anecdote: every brain is also scored on 12 fixed relief terrains, same for all.
  const bench=Array.from({length:12},(_,k)=>makeWorld(7100+k*31,'relief',size));
  const averages=brains.map(b=>{const r=bench.map(w=>imagineOnce(b.brain,w));return {label:b.label,episodes:b.episodes,v6:!!b.v6,
    mapError:+(r.reduce((a,x)=>a+x.mapError,0)/r.length).toFixed(3),match:+(r.reduce((a,x)=>a+x.match,0)/r.length).toFixed(3)};});
  const showcase=SHOWCASE.map(s=>{const w=makeWorld(s.seed,s.kind,size);
    return {...s,n:w.n,start:w.start,goal:w.goal,truth:Array.from(w.h,h=>+h.toFixed(2)),truthRoute:imagineOnce(null,w).truth,
      brains:brains.map(b=>({label:b.label,episodes:b.episodes,v6:!!b.v6,...imagineOnce(b.brain,w)}))};});
  return {size,showcase,averages,kinds:kinds(),runs:life.runs.map(r=>({date:r.date,from:r.from,to:r.to,kept:r.kept,history:r.history.map(h=>({episode:h.episode,match0:h.match0,classic:h.classic.match0}))})),tests:life.tests};}
http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://x'),name=url.pathname;
  if(req.method==='GET'&&name==='/api/health')return json(res,{ok:true,version:7});
  if(req.method==='GET'&&name==='/api/state')return json(res,state());
  if(req.method==='GET'&&name==='/api/life'){await loadV6();return json(res,lifeView(odd(url.searchParams.get('size')??cfg.size)));}
  if(req.method==='GET'&&name==='/api/frame'){const ep=pair[url.searchParams.get('side')==='classic'?'classic':'organ'],i=int(url.searchParams.get('i'),0,1e6,0);
    return json(res,ep.frame(Math.min(i,ep.frames.length-1)));}
  if(req.method==='GET'&&name==='/api/export')return json(res,{schema:7,brain:org.snapshot(),bestScore,life});
  if(name.startsWith('/api/')){if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);
    const input=await body(req);
    if(name==='/api/cancel'){cancel=true;return json(res,{ok:true});}
    if(name==='/api/train')return json(res,await launch(input));
    if(task?.running)return json(res,{error:'Antrenarea e activă.'},409);
    if(name==='/api/new'){if(KINDS.includes(input.kind))cfg.kind=input.kind;if(['v7','v6'].includes(input.left))cfg.left=input.left;cfg.size=odd(input.size??cfg.size);
      cfg.seed=int(input.seed,1,2147483647,input.same?cfg.seed:cfg.seed+1021);await loadV6();fresh();return json(res,state());}
    if(name==='/api/step'){pair.organ.step();pair.classic.step();if(pair.organ.steps%6===0&&cfg.left==='v7')await save(liveFile);return json(res,state());}
    if(name==='/api/run'){pair.organ.run();pair.classic.run();if(cfg.left==='v7')await save(liveFile);return json(res,state());}
    if(name==='/api/evaluate'){await loadV6();test=runTest(odd(input.size));await save(liveFile);return json(res,state());}
    if(name==='/api/reset'){org=new Organism7(17);bestScore=-Infinity;test=null;life={runs:[],tests:[],milestones:[{episodes:0,brain:lightSnapshot(org)}]};note='Doar creierul V7 a fost resetat';
      for(const f of [bestFile,liveFile])if(existsSync(f))await unlink(f);fresh();return json(res,state());}
    return json(res,{error:'Endpoint inexistent'},404);}
  if(req.method!=='GET')return json(res,{error:'Method not allowed'},405);
  const file=name==='/'?'index.html':name.slice(1);if(!['index.html','app.js','style.css','draw.js','life.js'].includes(file))return json(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':MIME[path.extname(file)],'Cache-Control':'no-cache'});createReadStream(path.join(root,'public',file)).pipe(res);
}catch(e){console.error(e);json(res,{error:e.message??String(e)},500);}}).listen(port,host,()=>console.log(`MagicPerspective V7 · http://${host}:${port}`));
