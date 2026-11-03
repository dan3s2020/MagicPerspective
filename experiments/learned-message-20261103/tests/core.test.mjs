import test from 'node:test';import assert from 'node:assert/strict';
import {makeWorld,localView,oracle,KINDS,publicInfo} from '../engine/world.mjs';
import {CostRule,Collective} from '../engine/brain.mjs';
import {evaluate,trainEpisode,optimizeMessages} from '../engine/experiment.mjs';
import {readFile} from 'node:fs/promises';

test('three world generators remain deterministic and connected',()=>{
 for(const kind of KINDS)for(const n of [21,33,49]){
  const w=makeWorld(1617,n,kind);assert.deepEqual(w,makeWorld(1617,n,kind));
  assert.ok(oracle(w).route.length>=2);assert.ok(w.links.length>=n-1);
 }
});
test('a node knows only incident edges, never true cost or complete graph',()=>{
 const w=makeWorld(999,33,'mixed');for(let i=0;i<w.n;i++){
  const view=localView(w,i);assert.ok(!('world'in view)&&!('oracle'in view));
  assert.ok(view.links.every(e=>!('cost'in e)&&!('open'in e)));
 }assert.ok(!('links'in publicInfo(w)));
});
test('learned and fixed Bellman both produce connected valid routes without oracle',()=>{
 for(let seed=1;seed<=9;seed++){
  const w=makeWorld(seed*1021,33,KINDS[seed%3]);
  for(const mode of ['learned','bellman']){
   const c=new Collective(w,new CostRule(42),{mode});
   c.actualWorld=null; // exchange must never inspect hidden world.
   for(let r=0;r<c.messageRounds;r++)c.exchange();
   const shape=c.shape();assert.equal(shape.connected,true,mode+' '+seed);
   for(let i=1;i<shape.nodes.length;i++)assert.ok(c.nodes[shape.nodes[i-1]].links.some(l=>l.to===shape.nodes[i]));
  }
 }
});
test('disabled communication does not hallucinate a complete route',()=>{
 const w=makeWorld(505,33,'hierarchical'),c=new Collective(w,new CostRule(42),{mode:'off'});
 for(let i=0;i<80;i++)c.exchange();assert.equal(c.shape().connected,false);
 assert.equal(c.nodes.filter(n=>Number.isFinite(n.value)).length,1);
});
test('the message update is trainable from executed trajectories, independently of the oracle',()=>{
 const r=new CostRule(201),before=r.snapshot(),w=makeWorld(19112,33,'mixed');
 const e=new Collective(w,r,{mode:'learned'});e.run(w.n*6,{learn:true});
 const observed=e.observedReturns();assert.ok(e.finished&&observed.size>=3);
 const a=optimizeMessages(r,w,observed,5);
 assert.equal(a.updated,true);assert.equal(r.messageUpdates,1);
 assert.notDeepEqual(r.messageW,before.messageW);
 assert.ok(r.messageW.every(Number.isFinite));
});
test('training changes both cost predictor and message aggregation parameters',()=>{
 const r=new CostRule(88),start=r.snapshot();for(let i=0;i<80;i++)trainEpisode(r,i,{n:33});
 assert.ok(r.updates>0&&r.messageUpdates>60);
 assert.notDeepEqual(r.w,start.w);assert.notDeepEqual(r.messageW,start.messageW);
 const copied=CostRule.restore(r.snapshot());assert.deepEqual(copied.snapshot(),r.snapshot());
});
test('trained message rule improves held-out first-shape F1 versus its initialization on fixed example',()=>{
 const r=new CostRule(88),before=evaluate(r,{count:18,n:33,seed:930007}).modes.learned;
 for(let i=0;i<120;i++)trainEpisode(r,i,{n:33});
 const after=evaluate(r,{count:18,n:33,seed:930007}).modes.learned;
 assert.ok(after.f1>before.f1,`F1 ${before.f1} -> ${after.f1}`);
});
test('control comparisons are paired, deterministic and checkpoint immutable',()=>{
 const r=new CostRule(81);for(let i=0;i<30;i++)trainEpisode(r,i);
 const snapshot=r.snapshot(),a=evaluate(r,{n:21,count:12,seed:1940505});
 const b=evaluate(r,{n:21,count:12,seed:1940505});
 assert.deepEqual(a,b);assert.deepEqual(snapshot,r.snapshot());
 assert.ok(a.modes.learned.cost<a.modes.off.cost);
 assert.ok(a.modes.bellman.cost<a.modes.shuffled.cost);
 assert.ok(a.modes.untrained&&a.modes.bellman);
});
test('browser exposes continuous training, safe controls, snapshots and both graph views',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const src=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 for(const id of ['trainStart','trainPause','trainResume','trainStop','saveNow','exportLink','truthGraph','danceGraph','frameSlider','blindTest','worldMode','messageUpdates','messageTemp'])assert.ok(html.includes('id="'+id+'"'),id);
 for(const route of ['/api/train/start','/api/train/resume','/api/train/pause','/api/train/stop','/api/save','/api/export'])assert.ok(server.includes(route),route);
 assert.ok(src.includes("'train/pause'"));assert.ok(src.includes("'train/resume'"));
});
