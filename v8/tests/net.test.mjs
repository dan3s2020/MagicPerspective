import test from 'node:test';
import assert from 'node:assert/strict';
import {makeNetwork,publicNetwork,netSense,netTruthRoute,bandsBeyond,netNodes} from '../engine/net.mjs';
import {NetOrgan,netMemory,netRemember,dance,NET_FEATURES,netFeatures} from '../engine/netorgan.mjs';
import {NetEpisode} from '../engine/netagent.mjs';
import {Organism8,restoreAny} from '../engine/organism8.mjs';
import {Organism7} from '../engine/organ.mjs';
import {evaluate,imagineOnce,makeAny,liveEpisode} from '../engine/training.mjs';
const sig=x=>JSON.stringify(x);
test('networks are seeded, reproducible, solvable; the public view hides open/cost',()=>{
  for(let s=1;s<=8;s++){const w=makeNetwork(s,15);assert.equal(w.n,netNodes(15));assert.equal(sig(w),sig(makeNetwork(s,15)));assert.ok(Number.isFinite(netTruthRoute(w).cost));
    const pub=JSON.stringify(publicNetwork(w));assert.ok(!pub.includes('"open"')&&!pub.includes('"cost"'));}});
test('a node sees its own links exactly and, for EACH of its links, a horizon of 3 bands × 4 readings',()=>{
  const w=makeNetwork(3,15),o=netSense(w,w.start);assert.equal(o.window.length,w.adj[w.start].length);assert.equal(o.horizon.length,w.adj[w.start].length);
  for(const d of o.horizon){assert.equal(d.bands.length,3);for(const b of d.bands){assert.equal(b.length,4);assert.ok(b.every(x=>x>=0&&x<=1));}}
  for(const x of o.window)assert.equal(x.open,w.links[x.id].open?1:0);});
test('directions never look back through the node itself',()=>{const w=makeNetwork(5,15),v=w.start;
  for(const {to,id} of w.adj[v]){const bands=bandsBeyond(w.adj,v,to);assert.ok(!bands.flat().includes(id));}});
test('the organ never receives the true network: same local evidence → same imagination',()=>{
  const a=makeNetwork(7,15),b=structuredClone(a);const near=new Set(a.adj[a.start].map(x=>x.id));
  // change a link far away that no horizon band of the start can see
  const seenBands=new Set(a.adj[a.start].flatMap(({to})=>bandsBeyond(a.adj,a.start,to).flat()));
  const far=b.links.find(l=>!near.has(l.id)&&!seenBands.has(l.id));if(!far)return;far.open=!far.open;
  const o=new NetOrgan(3),ma=netMemory(publicNetwork(a)),mb=netMemory(publicNetwork(b));netRemember(ma,netSense(a,a.start));netRemember(mb,netSense(b,b.start));
  // goal wave readings may differ because true distances changed; compare only when they did not
  if(sig(netSense(a,a.start))!==sig(netSense(b,b.start)))return;
  assert.deepEqual(Array.from(o.perceive(ma,a.start,{imagine:0}).p),Array.from(o.perceive(mb,b.start,{imagine:0}).p));});
test('the dance: the goal stays at phase 0, its wave starts from what nodes perceived and spreads only through believed links',()=>{
  const w=makeNetwork(9,15),m=netMemory(publicNetwork(w));netRemember(m,netSense(w,w.start));const coh=dance(m,10,null);
  assert.equal(m.theta[w.goal],0);assert.equal(m.amp[w.goal],1);assert.ok(coh>=-1&&coh<=1);assert.ok(m.amp.every(a=>a>=0&&a<=1));
  const m2=netMemory(publicNetwork(w));netRemember(m2,netSense(w,w.start));dance(m2,10,new Float64Array(w.links.length));
  for(let i=0;i<w.n;i++)if(i!==w.goal)assert.ok(m2.amp[i]<=m.amp[i]+1e-9);});
test('the route is predicted before the first step, follows links, and the episode reaches the goal',()=>{
  for(let s=1;s<=6;s++){const w=makeNetwork(s,11),ep=new NetEpisode(w,new NetOrgan(1));const r=ep.p.route;assert.equal(r[0],w.start);assert.equal(r.at(-1),w.goal);
    for(let i=1;i<r.length;i++)assert.ok(w.adj[r[i-1]].some(x=>x.to===r[i]));ep.run();assert.ok(ep.finished);
    for(let i=1;i<ep.walked.length;i++){const e=w.adj[ep.walked[i-1]].find(x=>x.to===ep.walked[i]);assert.ok(w.links[e.id].open);}}});
test('the network organ learns only from links revealed at visited nodes, and only when online',()=>{
  const o=new NetOrgan(4),ep=new NetEpisode(makeNetwork(12,15),o,{record:false});ep.run(8);assert.ok(o.pass.updates>0);
  const f=new NetOrgan(4),before=sig(f.snapshot());new NetEpisode(makeNetwork(12,15),f,{online:false,record:false}).run(8);assert.equal(sig(f.snapshot()),before);
  const m=netMemory(publicNetwork(makeNetwork(2,15)));assert.equal(netFeatures(m,0,[.5,.3]).length,NET_FEATURES);});
test('V8 brain round-trip; older brains are skipped on networks, never broken',()=>{
  const o=new Organism8(5);liveEpisode(o,1,'network',11);liveEpisode(o,2,'relief',11);const r=restoreAny(JSON.parse(JSON.stringify(o.snapshot())));
  const w=makeNetwork(4,15);assert.deepEqual(imagineOnce(o,w).imagined,imagineOnce(r,w).imagined);
  assert.ok(imagineOnce(new Organism7(2),w).unsupported);
  const t=evaluate(o,{count:8,size:11,extra:{'v7-brain':new Organism7(2)}});assert.ok(t.kinds.network.organ);assert.ok(!t.kinds.network['v7-brain']);assert.ok(t.kinds.relief['v7-brain']);});
test('braided mazes have loops: more open cells than the perfect maze with the same seed',()=>{
  for(let s=1;s<=5;s++){const a=makeAny(s,'maze',15),b=makeAny(s,'braided',15);assert.ok(b.h.filter(h=>h===0).length>=a.h.filter(h=>h===0).length);}});
