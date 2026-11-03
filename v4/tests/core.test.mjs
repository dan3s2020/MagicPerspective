import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,publicStructure,emptyBelief,sense,absorb,oracle} from '../engine/world.mjs';
import {WorldNet,skeletonDistances,features} from '../engine/model.mjs';
import {Perspective} from '../engine/perspective.mjs';
import {Agent,routeMetrics} from '../engine/agent.mjs';
import {imagine} from '../engine/imagination.mjs';
import {makeBrain,train,evaluate,trainingEpisode} from '../engine/training.mjs';
const sig=x=>JSON.stringify(x);
const brain=()=>makeBrain(17);

test('all three independent world families are seeded, solvable and reproducible',()=>{
 for(const kind of ['maze','braided','graph'])for(let s=1;s<=11;s++){
  const a=makeWorld(s,kind,9),b=makeWorld(s,kind,9);
  assert.equal(sig(a),sig(b));assert.ok(oracle(a).cost>0);
  assert.ok(oracle(a).nodes.length>=2);
 }
});
test('learner public structure excludes hidden open bits and material costs',()=>{
 const world=makeWorld(21,'maze',9),pub=publicStructure(world);
 assert.ok(pub.links.every(e=>Object.keys(e).sort().join(',')==='a,b,id'));
 assert.ok(!('edges' in pub));assert.ok(!('walls' in pub));
 assert.ok(!sig(pub).includes('"open"'));assert.ok(!sig(pub).includes('"cost"'));
});
test('the first local slice reveals only incident edges, not the complete world',()=>{
 const world=makeWorld(15,'maze',9),spec=publicStructure(world),b=emptyBelief(spec);
 const changed=absorb(b,sense(world,world.start));
 const touching=spec.links.filter(e=>e.a===world.start||e.b===world.start);
 assert.equal(changed.length,touching.length);assert.equal(b.status.filter(x=>x!==-1).length,touching.length);
 assert.ok(b.status.some(x=>x===-1));
});
test('teacher and learner with identical public scaffold produce identical initial predictions if hidden edges vary',()=>{
 const a=makeWorld(333,'graph',7),b=structuredClone(a);
 b.edges.forEach((e,i)=>{if(i>10&&e.a!==a.start&&e.b!==a.start)e.open=!e.open;});
 const [m,p]=[new WorldNet(17),new Perspective()];
 const aa=new Agent(a,WorldNet.restore(m.snapshot()),Perspective.restore(p.snapshot()),{online:false});
 const bb=new Agent(b,WorldNet.restore(m.snapshot()),Perspective.restore(p.snapshot()),{online:false});
 // Both have the same local incident evidence; only hidden nonincident edges differ.
 assert.deepEqual(aa.belief.status,bb.belief.status);
 assert.deepEqual(aa.plan.edges,bb.plan.edges);
});
test('initial imagined route starts where organism is and ends at goal',()=>{
 for(const kind of ['maze','braided','graph']){
  const w=makeWorld(99,kind,9),{net,perspective}=brain(),a=new Agent(w,net,perspective);
  assert.equal(a.steps,0);assert.equal(a.plan.nodes[0],w.start);assert.equal(a.plan.nodes.at(-1),w.goal);
  assert.equal(a.plan.edges.length,a.plan.nodes.length-1);
 }
});
test('all imagined consecutive transitions are legal PUBLIC candidate edges and never cross known blocked edges',()=>{
 const w=makeWorld(444,'maze',9),{net,perspective}=brain(),a=new Agent(w,net,perspective);
 for(let t=0;t<30&&!a.finished;t++){
  for(let i=0;i<a.plan.edges.length;i++){
   const e=a.spec.links[a.plan.edges[i]],u=a.plan.nodes[i],v=a.plan.nodes[i+1];
   assert.ok((e.a===u&&e.b===v)||(e.b===u&&e.a===v));
   assert.notEqual(a.belief.status[e.id],0);
  }
  a.step();
 }
});
test('the forward transition model is persistent through snapshot restore',()=>{
 const w=makeWorld(33,'graph',7),{net,perspective}=brain(),a=new Agent(w,net,perspective,{online:false});
 const x=features(a.spec,a.belief,a.position,a.spec.links.find(e=>e.a===a.position||e.b===a.position),skeletonDistances(a.spec),perspective.weights);
 const restored=WorldNet.restore(net.snapshot());assert.deepEqual(restored.forward(x),net.forward(x));
 assert.deepEqual(Perspective.restore(perspective.snapshot()).weights,perspective.weights);
});
test('real sensory feedback modifies shared neural weights and perspective',()=>{
 const w=makeWorld(993,'maze',9),{net,perspective}=brain(),a=new Agent(w,net,perspective);
 const old=sig(net.snapshot());for(let i=0;i<15&&!a.finished;i++)a.step();
 assert.notEqual(sig(net.snapshot()),old);assert.ok(net.sensorUpdates>0);
 assert.ok(perspective.count>0);
});
test('frozen comparator does not modify model or perspective after exploration',()=>{
 const w=makeWorld(62,'braided',9),{net,perspective}=brain(),a=new Agent(w,net,perspective,{online:false});
 const original=sig(net.snapshot()),frame=sig(perspective.snapshot());for(let i=0;i<12&&!a.finished;i++)a.step();
 assert.equal(sig(net.snapshot()),original);assert.equal(sig(perspective.snapshot()),frame);
 assert.ok(a.belief.observed.filter(Boolean).length>1);
});
test('teacher training produces actual learned gradient changes and counts distinct episodes',()=>{
 const {net,perspective}=brain(),before=sig(net.snapshot());
 const result=trainingEpisode(net,perspective,332,'maze',7);
 assert.equal(net.episodes,1);assert.ok(net.teacherUpdates>0);assert.notEqual(sig(net.snapshot()),before);
 assert.ok(result.steps>0);
});
test('multi-world evaluation is deterministic and does not mutate master weights',()=>{
 const {net,perspective}=brain(),original=sig(net.snapshot())+sig(perspective.snapshot());
 const a=evaluate(net,perspective,{count:6,size:7,seed:1400001});
 const b=evaluate(net,perspective,{count:6,size:7,seed:1400001});
 assert.deepEqual(a,b);assert.equal(sig(net.snapshot())+sig(perspective.snapshot()),original);
 for(const mode of ['learned-online','learned-frozen','neutral']){
  assert.equal(a.modes[mode].count,6);assert.ok(a.modes[mode].success>=0&&a.modes[mode].success<=1);
 }
});
test('online/frozen control has identical initial form at step zero',()=>{
 const w=makeWorld(99,'graph',7),{net,perspective}=brain();
 const on=new Agent(structuredClone(w),WorldNet.restore(net.snapshot()),Perspective.restore(perspective.snapshot()),{online:true});
 const off=new Agent(structuredClone(w),WorldNet.restore(net.snapshot()),Perspective.restore(perspective.snapshot()),{online:false});
 assert.deepEqual(on.initial,off.initial);
});
test('validation history and best checkpoint are emitted; source brain training is real',async()=>{
 const {net,perspective}=brain();let progress=0;
 const result=await train(net,perspective,{episodes:12,size:7,seed:3333,validationCount:3,onProgress:v=>{progress=v.done;}});
 assert.equal(net.episodes,12);assert.ok(progress===12);assert.ok(result.bestSnapshot.net.head.policy.length===20);
 assert.ok(result.history.length>=1);
});
test('route-metric denominator cannot call a partial overlap perfect',()=>{
 const a=routeMetrics([1,2],[1,3]);assert.equal(a.f1,.5);
});
test('no full-world truth object enters model or imagination API signatures',()=>{
 const w=makeWorld(32,'maze',9),spec=publicStructure(w),belief=emptyBelief(spec),{net,perspective}=brain();
 absorb(belief,sense(w,w.start));
 const plan=imagine(spec,belief,spec.start,net,perspective);
 const before=plan.nodes.slice();
 // Modifying hidden walls after observation must not change a prediction produced using identical public information.
 w.edges.filter(e=>e.a!==w.start&&e.b!==w.start).forEach(e=>{e.open=!e.open});
 const after=imagine(spec,belief,spec.start,net,perspective).nodes;
 assert.deepEqual(before,after);
});
