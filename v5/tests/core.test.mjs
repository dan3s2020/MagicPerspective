import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWorld,publicStructure,emptyBelief,sense,absorb,oracle,windowNodes} from '../engine/world.mjs';
import {Organ,PASS_INPUTS,SHAPE_INPUTS,twinsOf,passFeatures,contextOf} from '../engine/organ.mjs';
import {MLP} from '../engine/nn.mjs';
import {Episode,routeF1,cloudBCE,MODES} from '../engine/agent.mjs';
import {trainingEpisode,evaluate,train,SEEDS} from '../engine/training.mjs';
const FAMILIES=['maze','braided','graph'];
const sig=x=>JSON.stringify(x);

test('worlds are seeded, reproducible and solvable in all three families',()=>{
  for(const k of FAMILIES)for(let s=1;s<=8;s++){const a=makeWorld(s,k,9);assert.equal(sig(a),sig(makeWorld(s,k,9)));assert.ok(Number.isFinite(oracle(a).cost));}
});
test('public structure hides passability and costs',()=>{
  const pub=publicStructure(makeWorld(5,'maze',9));assert.ok(pub.links.every(e=>Object.keys(e).sort().join()==='a,b,id'));assert.ok(!sig(pub).includes('"open"'));
});
test('grid perception is a 3x3 window: only relations inside it are revealed',()=>{
  const w=makeWorld(15,'maze',9),spec=publicStructure(w),b=emptyBelief(spec);absorb(b,sense(w,w.start));
  const win=new Set(windowNodes(w,w.start));assert.equal(win.size,9);
  spec.links.forEach((e,i)=>assert.equal(b.status[i]!==-1,win.has(e.a)&&win.has(e.b)));
  assert.equal(b.observed.filter(Boolean).length,9);
});
test('network perception is the node plus its scaffold neighbours',()=>{
  const w=makeWorld(4,'graph',9),win=windowNodes(w,w.start),nb=new Set([w.start]);
  for(const e of w.edges){if(e.a===w.start)nb.add(e.b);if(e.b===w.start)nb.add(e.a);}assert.deepEqual(new Set(win),nb);
});
test('the organ never sees hidden truth: two worlds with identical local evidence give identical shape predictions',()=>{
  const a=makeWorld(333,'graph',9),b=structuredClone(a),win=new Set(windowNodes(a,a.start));
  b.edges.forEach(e=>{if(!(win.has(e.a)&&win.has(e.b)))e.open=!e.open;});
  const o=new Organ(3),ea=new Episode(a,Organ.restore(o.snapshot()),{online:false}),eb=new Episode(b,Organ.restore(o.snapshot()),{online:false});
  assert.deepEqual(ea.belief.status,eb.belief.status);assert.deepEqual(Array.from(ea.perception.q),Array.from(eb.perception.q));assert.deepEqual(ea.perception.route,eb.perception.route);
});
test('the whole shape exists before the first action and the route is connected start→goal',()=>{
  for(const k of FAMILIES){const w=makeWorld(77,k,9),ep=new Episode(w,new Organ(5),{online:false});
    assert.equal(ep.steps,0);const r=ep.perception.route;assert.equal(r.nodes[0],w.start);assert.equal(r.nodes.at(-1),w.goal);
    for(let i=0;i<r.edges.length;i++){const l=ep.spec.links[r.edges[i]];assert.ok((l.a===r.nodes[i]&&l.b===r.nodes[i+1])||(l.b===r.nodes[i]&&l.a===r.nodes[i+1]));}
    assert.ok(ep.perception.q.every(v=>v>=0&&v<=1));}
});
test('the decoded route never crosses a relation the organism already saw closed',()=>{
  const w=makeWorld(9,'maze',9),ep=new Episode(w,new Organ(1),{online:false});
  for(let t=0;t<30&&!ep.finished;t++){for(const id of ep.perception.route.edges)assert.notEqual(ep.belief.status[id],0);ep.step();}
});
test('slice analogy features exist on lattices and are empty on irregular networks',()=>{
  const g=twinsOf(publicStructure(makeWorld(3,'graph',9))),m=twinsOf(publicStructure(makeWorld(3,'maze',9)));
  assert.equal(g.ring1.flat().length+g.ring2.flat().length,0);assert.ok(m.ring2.flat().length>100);
  const w=makeWorld(3,'maze',9),spec=publicStructure(w),b=emptyBelief(spec);absorb(b,sense(w,w.start));
  assert.equal(passFeatures(spec,b,contextOf(spec,b),spec.links[0]).length,PASS_INPUTS);
});
test('MLP learns a separable rule and survives snapshot/restore exactly',()=>{
  const n=new MLP(3,8,4,{lr:.05}),data=Array.from({length:40},(_,i)=>{const x=[1,(i%2),((i>>1)%2)];return {x,y:x[1]}});
  const first=n.trainBatch(data);for(let i=0;i<200;i++)n.trainBatch(data);assert.ok(n.trainBatch(data)<first*.3);
  const r=MLP.restore(JSON.parse(JSON.stringify(n.snapshot())));assert.equal(r.forward([1,1,0]),n.forward([1,1,0]));
});
test('pass organ learns ONLY from what the window reveals (self-supervised, no teacher) and only when online',()=>{
  const w=makeWorld(12,'maze',9),o=new Organ(2),ep=new Episode(w,o,{online:true});ep.run(20);
  assert.ok(o.pass.updates>0);assert.equal(o.shape.updates,0);
  const f=new Organ(2),before=sig(f.snapshot()),ef=new Episode(makeWorld(12,'maze',9),f,{online:false});ef.run(20);assert.equal(sig(f.snapshot()),before);
});
test('resistance is recorded when the world contradicts relations of the predicted shape',()=>{
  let total=0;for(let s=1;s<=10;s++){const ep=new Episode(makeWorld(s,'maze',9),new Organ(1),{online:false,mode:'classic'});ep.run();total+=ep.resistance;assert.ok(ep.finished);}
  assert.ok(total>0);
});
test('shape metrics are well defined',()=>{
  assert.equal(routeF1([1,2,3],[1,2,3]),1);assert.equal(routeF1([1],[2]),0);
  const belief={status:[1,-1,0,-1]};assert.ok(cloudBCE([.98,.02,0,.02],belief,[0])<.05);assert.ok(cloudBCE([.02,.98,0,.98],belief,[0])>3);
});
test('classic control has no cloud: its shape is one hard line',()=>{
  const ep=new Episode(makeWorld(8,'braided',9),new Organ(1),{online:false,mode:'classic'});
  assert.ok(ep.perception.q.every(v=>v===0||v===1));assert.equal(ep.perception.q.reduce((a,b)=>a+b,0),ep.perception.route.edges.length);
});
test('training uses the teacher only as a target; evaluation never mutates the organ it is given',()=>{
  const o=new Organ(7);trainingEpisode(o,123,'maze',7);assert.ok(o.shape.updates>0);assert.equal(o.episodes,1);
  const before=sig(o.snapshot());evaluate(o,{count:3,size:7});assert.equal(sig(o.snapshot()),before);
});
test('blind test runs all four controls on the same worlds and is deterministic',()=>{
  const o=new Organ(7),a=evaluate(o,{count:6,size:7}),b=evaluate(o,{count:6,size:7});
  assert.deepEqual(Object.keys(a.modes),MODES);assert.equal(sig(a),sig(b));for(const m of Object.values(a.modes))assert.equal(m.success,1);
});
test('validation, training and test seeds are disjoint',()=>{const s=Object.values(SEEDS);assert.equal(new Set(s).size,s.length);});
test('checkpoint round-trip keeps predictions identical; wrong schema is rejected',()=>{
  const o=new Organ(9);trainingEpisode(o,5,'braided',7);const r=Organ.restore(JSON.parse(JSON.stringify(o.snapshot())));
  const w=makeWorld(44,'maze',9);assert.deepEqual(Array.from(new Episode(w,o,{online:false}).perception.q),Array.from(new Episode(makeWorld(44,'maze',9),r,{online:false}).perception.q));
  assert.throws(()=>Organ.restore({schema:4}));assert.equal(SHAPE_INPUTS,16);
});
test('short training makes the shape cloud better than the untrained organ on unseen worlds',async()=>{
  const o=new Organ(17),r=await train(o,{episodes:60,size:7,validationCount:6});
  const t=evaluate(Organ.restore(r.bestSnapshot),{count:15,size:7,modes:['organ-frozen','organ-untrained']});
  assert.ok(t.modes['organ-frozen'].bce_0<t.modes['organ-untrained'].bce_0,'trained cloud error must be lower');
  assert.ok(t.modes['organ-frozen'].ece_0<t.modes['organ-untrained'].ece_0,'trained cloud must be better calibrated');
});
test('frame history keeps the full step-0 shape and every later frame for replay',()=>{
  const ep=new Episode(makeWorld(31,'maze',9),new Organ(1),{online:false});ep.run(5);
  assert.equal(ep.frames.length,ep.steps+1);assert.equal(ep.frame(0).step,0);assert.equal(ep.frame(0).q.length,ep.spec.links.length);
  assert.deepEqual(ep.payload().initial.route,ep.frames[0].route);
});
