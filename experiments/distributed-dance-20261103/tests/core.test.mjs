import test from 'node:test';import assert from 'node:assert/strict';
import {makeWorld,localView,oracle,KINDS,publicInfo} from '../engine/world.mjs';
import {CostRule,Collective} from '../engine/brain.mjs';
import {evaluate,trainEpisode} from '../engine/experiment.mjs';
import {readFile} from 'node:fs/promises';

test('all three graph families are connected and produce reproducible worlds',()=>{
 for(const kind of KINDS)for(const n of [21,33,49]){
  const a=makeWorld(1617,n,kind),b=makeWorld(1617,n,kind);
  assert.deepEqual(a,b);assert.ok(oracle(a).route.length>=2);
  assert.ok(a.links.length>=n-1);assert.equal(a.coords.length,n);
 }
});
test('node local view does not contain global graph, full costs or oracle solution',()=>{
 const w=makeWorld(999,33,'mixed');for(let id=0;id<33;id++){
  const view=localView(w,id);
  assert.equal(view.node,id);assert.ok(!('world' in view)&&!('oracle' in view));
  assert.ok(view.links.every(l=>Number.isFinite(l.sensor)&&!('cost' in l)&&!('open' in l)));
  assert.ok(view.links.every(l=>w.links.some(e=>(e.a===id&&e.b===l.to)||(e.b===id&&e.a===l.to))));
 }
 assert.ok(!('links' in publicInfo(w)));
});
test('after enough local message exchanges, the global route is connected without oracle information',()=>{
 for(let seed=1;seed<=12;seed++){
  const w=makeWorld(seed*1021,33,KINDS[seed%3]);const c=new Collective(w,new CostRule(42));
  for(let r=0;r<c.messageRounds;r++)c.exchange();const shape=c.shape();
  assert.equal(shape.connected,true);assert.equal(shape.nodes[0],w.start);assert.equal(shape.nodes.at(-1),w.goal);
  for(let i=1;i<shape.nodes.length;i++){
   const a=shape.nodes[i-1],b=shape.nodes[i];assert.ok(c.nodes[a].links.some(l=>l.to===b));
  }
 }
});
test('message-free control cannot derive a globally connected value route',()=>{
 const w=makeWorld(505,33,'hierarchical');const c=new Collective(w,new CostRule(42),{mode:'off'});
 for(let i=0;i<100;i++)c.exchange();assert.equal(c.shape().connected,false);
 assert.ok(c.nodes.filter(n=>Number.isFinite(n.value)).length===1);
});
test('learned rule predicts unseen physical costs better after local experience',()=>{
 const model=new CostRule(201);const data=Array.from({length:14},(_,i)=>makeWorld(770000+i*7019,33,KINDS[i%3]));
 const mae=()=>{let err=0,n=0;for(const w of data)for(const link of w.links){err+=Math.abs(model.predict(link.sensor)-link.cost);n++;}return err/n;};
 const before=mae();for(let k=0;k<220;k++)trainEpisode(model,k,{n:33});const after=mae();
 assert.ok(after<before*.6,`expected improvement: ${before} => ${after}`);
 assert.ok(model.updates>100);
});
test('message passing outperforms disabled and shuffled negative controls on independent network seeds',()=>{
 const r=evaluate(new CostRule(81),{n:33,count:18,seed:1940505});
 assert.ok(r.modes.real.cost<r.modes.off.cost,JSON.stringify(r.modes));
 assert.ok(r.modes.real.cost<r.modes.shuffled.cost,JSON.stringify(r.modes));
 assert.ok(r.modes.real.f1>r.modes.off.f1);
});
test('training and all controls are replayable and do not mutate the evaluation checkpoint',()=>{
 const r=new CostRule(87);for(let i=0;i<20;i++)trainEpisode(r,i);
 const snapshot=r.snapshot(),a=evaluate(r,{n:21,count:9,seed:78787}),b=evaluate(r,{n:21,count:9,seed:78787});
 assert.deepEqual(a,b);assert.deepEqual(snapshot,r.snapshot());assert.deepEqual(CostRule.restore(snapshot).snapshot(),snapshot);
});
test('the source UI includes the full infinite/pause/save/resume protocol',async()=>{
 const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 const src=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const server=await readFile(new URL('../server.mjs',import.meta.url),'utf8');
 for(const id of ['trainStart','trainPause','trainResume','trainStop','saveNow','exportLink','truthGraph','danceGraph','frameSlider','blindTest'])assert.ok(html.includes(`id="${id}"`),id);
 for(const endpoint of ['/api/train/start','/api/train/resume','/api/train/pause','/api/train/stop','/api/save','/api/export'])assert.ok(server.includes(endpoint),endpoint);
 assert.ok(src.includes("'train/pause'"));assert.ok(src.includes("'train/resume'"));
});
