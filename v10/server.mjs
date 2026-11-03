// MagicPerspective V10 — local server, port 3046, own data/ files. Built from SPEC.md (the verbatim conversation) only.
import http from 'node:http';
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {createReadStream,existsSync} from 'node:fs';
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {ShapeOrgan} from './engine/organ.mjs';
import {makeMaze,makeDynamicMaze,RNG} from './engine/maze.mjs';
import {episode,episodeG,makeWorldOf,train,trainG,evaluate,evaluateG,evaluateDynamic,SEEDS} from './engine/train.mjs';
const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||3046),host=process.env.HOST||'127.0.0.1';
const file=path.join(root,'data','brain.json');
let organ=new ShapeOrgan({seed:7}),control=new ShapeOrgan({seed:7}),untrained=new ShapeOrgan({seed:8}),history=[],tests=[],task=null,cancel=false,note=null;
const life={maze:0,graph:0,sat:0,control:{maze:0,graph:0,sat:0}};
try{if(existsSync(file)){const s=JSON.parse(await readFile(file,'utf8'));organ=ShapeOrgan.restore(s.organ);control=ShapeOrgan.restore(s.control);history=s.history||[];tests=s.tests||[];Object.assign(life,s.life||{});note='Creier V10 restaurat';}}
catch(e){console.error(e);note='Checkpoint V10 incompatibil — creier nou';}
const save=async()=>{for(const t of tests)delete t.frames;await mkdir(path.dirname(file),{recursive:true});await writeFile(file+'.tmp',JSON.stringify({schema:'v10',organ:organ.snapshot(),control:control.snapshot(),history,tests,life}));await rename(file+'.tmp',file);};
const cfg={kind:'maze',size:9,seed:4242,who:'organ'};let world=null,run=null;
const netFor=who=>who==='control'?control:who==='untrained'?untrained:organ,modeFor=who=>who==='control'?'next-step':who==='classic'?'classic':who==='line'?'line':'organ';
function fresh(){world=cfg.kind==='maze'?makeMaze(cfg.seed,cfg.size):cfg.kind==='dynamic'?makeDynamicMaze(cfg.seed,cfg.size):makeWorldOf(cfg.kind,cfg.seed);
  run=cfg.kind==='maze'||cfg.kind==='dynamic'?episode(world,netFor(cfg.who),{mode:modeFor(cfg.who),record:true}):episodeG(world,netFor(cfg.who),{mode:modeFor(cfg.who),record:true});}
fresh();
const worldView=()=>cfg.kind==='maze'||cfg.kind==='dynamic'?{kind:'maze',dynamic:cfg.kind==='dynamic',n:world.n,wall:Array.from(world.wall),start:world.start,goal:world.goal}
  :cfg.kind==='graph'?{kind:'graph',N:world.N,forbid:Array.from(world.forbid),ops:world.ops.map(o=>o.name),start:world.start,goals:world.goals}
  :{kind:'sat',N:world.N,v:world.v,viol:Array.from(world.viol),clauses:world.clauses.length,start:world.start,goals:world.goals};
const state=()=>({version:'10.0.0',cfg,note,world:worldView(),run:{worldChanges:run.worldChanges??0,seenExternal:run.seenExternal??0,solved:run.solved,steps:run.steps,optimal:run.optimal,ratio:run.ratio,resistance:run.resistance,frames:run.frames.length,
  curve:run.frames.map(f=>({step:f.step,bce:f.bce,f1:f.f1,resistance:f.resistance}))},life,organUpdates:organ.updates,task,history:history.slice(-200),tests:tests.slice(-20)});
// The decisive tests (SPEC D1–D7): every organism on the same unseen worlds.
function decisive(){const t={date:new Date().toISOString(),life:{...life}};
  t.maze=evaluate(organ,{count:36,sizes:[7,9,11],nextStep:control,untrained});t.mazeBig=evaluate(organ,{seed:SEEDS.test+5,count:12,sizes:[13],nextStep:control,untrained});
  t.graph=evaluateG(organ,{kind:'graph',count:30,nextStep:control,untrained});t.sat=evaluateG(organ,{kind:'sat',count:30,nextStep:control,untrained});t.dynamic=evaluateDynamic(organ,{});return t;}
async function launch({plan='curriculum',episodes=300}){if(task?.running)throw Error('Antrenarea rulează deja');cancel=false;
  // Curriculum (message 55): simple → hard. After the first mazes the worlds are interleaved, so the same organism keeps living
  // in all of them and does not forget the old world while it learns the new one (measured in scripts-transfer.mjs).
  const steps=[];if(plan==='curriculum'){steps.push(['maze',[7],Math.round(episodes*.4)]);const rest=episodes-steps[0][2];
    for(let k=0;k<rest;k+=20)steps.push(['maze',[7,9],8],['graph',null,6],['sat',null,6]);}else steps.push([plan,plan==='maze'?[7,9]:null,episodes]);
  task={running:true,plan,total:steps.reduce((a,x)=>a+x[2],0),done:0,phase:null,error:null};let k=0;
  (async()=>{try{for(const [kind,sizes,E] of steps){if(cancel)break;task.phase=kind+(sizes?' '+sizes.join('/'):'');const sd=SEEDS.train+(life[kind]+1)*104729;
      const prog=h=>history.push({kind,lifeEpisodes:life[kind]+h.episode,...h});
      if(kind==='maze'){await train(organ,{episodes:E,sizes,seed:sd,onProgress:prog,every:E>=25?25:1e9});await train(control,{episodes:E,sizes,seed:sd,mode:'next-step',every:1e9});}
      else{await trainG(organ,{kind,episodes:E,seed:sd+11,every:1e9});await trainG(control,{kind,episodes:E,seed:sd+11,mode:'next-step',every:1e9});}
      life[kind]+=E;life.control[kind]+=E;task.done+=E;
      if(++k%6===0||k===steps.length){for(const kd of ['graph','sat'])history.push({kind:kd,lifeEpisodes:life[kd],...evaluateG(organ,{kind:kd,seed:SEEDS.validation,count:10,modes:['organ']}).organ});
        history.push({kind:'maze',lifeEpisodes:life.maze,...evaluate(organ,{seed:SEEDS.validation,count:12,sizes:[7,9],modes:['organ']}).organ});await save();}}
    task.phase='test';tests.push(decisive());await save();cfg.seed+=17;fresh();}
  catch(e){task.error=String(e.message||e);console.error(e);}finally{task.running=false;task.done=task.total;}})();return {started:true};}
function gallery(){const out=[];for(let i=0;i<6;i++){const w=makeMaze(5100000+i*7919,cfg.kind==='maze'?cfg.size:9),e=episode(w,organ,{record:true});
  out.push({n:w.n,wall:Array.from(w.wall),start:w.start,goal:w.goal,frame:e.frames[0]});}return out;}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
const json=(res,v,s=200)=>{res.writeHead(s,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(v));};
async function body(req){let t='';for await(const c of req){t+=c;if(t.length>20000)throw Error('Cerere prea mare');}return t?JSON.parse(t):{};}
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://x'),name=url.pathname;
  if(req.method==='GET'&&name==='/api/state')return json(res,state());
  if(req.method==='GET'&&name==='/api/frame'){const i=Math.max(0,Math.min(run.frames.length-1,Number(url.searchParams.get('i'))||0));return json(res,run.frames[i]);}
  if(req.method==='GET'&&name==='/api/gallery')return json(res,gallery());
  if(req.method==='GET'&&name==='/api/export')return json(res,{schema:'v10',organ:organ.snapshot(),control:control.snapshot(),history,tests,life});
  if(name.startsWith('/api/')){if(req.method!=='POST')return json(res,{error:'Method not allowed'},405);const input=await body(req);
    if(name==='/api/cancel'){cancel=true;return json(res,{ok:true});}
    if(name==='/api/train')return json(res,await launch({plan:['curriculum','maze','graph','sat'].includes(input.plan)?input.plan:'curriculum',episodes:Math.max(20,Math.min(20000,Number(input.episodes)||300))}));
    if(task?.running)return json(res,{error:'Antrenarea e activă.'},409);
    if(name==='/api/new'){if(['maze','dynamic','graph','sat'].includes(input.kind))cfg.kind=input.kind;if([7,9,11,13].includes(Number(input.size)))cfg.size=Number(input.size);
      if(['organ','control','untrained','classic','line'].includes(input.who))cfg.who=input.who;if(input.same!==true)cfg.seed+=1021;fresh();return json(res,state());}
    if(name==='/api/test'){tests.push(decisive());await save();return json(res,state());}
    return json(res,{error:'Endpoint inexistent'},404);}
  const f=name==='/'?'index.html':name.slice(1);if(!['index.html','app.js','style.css'].includes(f))return json(res,{error:'Not found'},404);
  res.writeHead(200,{'Content-Type':MIME[path.extname(f)],'Cache-Control':'no-cache'});createReadStream(path.join(root,'public',f)).pipe(res);
}catch(e){console.error(e);json(res,{error:e.message??String(e)},500);}}).listen(port,host,()=>console.log(`MagicPerspective V10 · http://${host}:${port}`));
