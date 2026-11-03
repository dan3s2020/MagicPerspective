import test from 'node:test';import assert from 'node:assert/strict';
import {makeWorld,localView,publicInfo,oracle,evolve,fingerprint,FAMILIES} from '../engine/world.mjs';
import {Collective,MessageBrain} from '../engine/brain.mjs';
import {evaluate,trainEpisode,costMAE} from '../engine/experiment.mjs';

test('three graph families and sealed local observation',()=>{
 for(const family of FAMILIES){const w=makeWorld(71,33,family),view=localView(w,w.start),publicData=publicInfo(w);
  assert.equal(w.family,family);assert.ok(oracle(w).route.length>1);
  assert.ok(!JSON.stringify(view).includes('actual'));
  assert.ok(!JSON.stringify(view).includes('base'));
  assert.ok(!JSON.stringify(publicData).includes('links'));
  assert.ok(view.links.every(x=>!('cost' in x)));
 }
});
test('world mutations are real, connected and deterministically reproducible',()=>{
 const a=makeWorld(1001,33,'dense'),b=makeWorld(1001,33,'dense');
 assert.equal(fingerprint(a),fingerprint(b));for(let i=1;i<=7;i++){
  const event=evolve(a,i),other=evolve(b,i);assert.deepEqual(event,other);
  assert.ok(event.endpoints.length>0);assert.ok(oracle(a).route.length>1);
 }
 assert.equal(fingerprint(a),fingerprint(b));
});
test('message pass uses no environment and produces initial hypothesis before movement',()=>{
 const w=makeWorld(14,33,'clusters'),c=new Collective(w,new MessageBrain(9));
 c.environment=null;const shape=c.exchange(33*2);
 assert.equal(c.steps,0);assert.equal(c.current,w.start);assert.ok(shape.nodes[0]===w.start);
 assert.equal(shape.connected,true);
 assert.ok(c.nodes.some(x=>Number.isFinite(x.value)));
});
test('learned message transformation and cost parameters really update from observed trajectories',()=>{
 const b=new MessageBrain(44),before=b.snapshot();
 for(let i=0;i<25;i++)trainEpisode(b,i,{n:33,seed:234444});
 const after=b.snapshot();assert.ok(b.costUpdates>10);assert.ok(b.ruleUpdates>1);
 assert.notDeepEqual(before.cost,after.cost);
 assert.ok(before.score.some((x,i)=>Math.abs(x-after.score[i])>1e-9)||before.gate.some((x,i)=>Math.abs(x-after.gate[i])>1e-9)||Math.abs(before.bias-after.bias)>1e-9);
 assert.deepEqual(MessageBrain.restore(after).snapshot(),after);
});
test('cost prediction generalizes to held-out observations for fixed test seed',()=>{
 const brain=new MessageBrain(15),before=costMAE(brain,{count:8,n:33});
 for(let i=0;i<100;i++)trainEpisode(brain,i,{n:33,seed:66777});
 const after=costMAE(brain,{count:8,n:33});assert.ok(after<before,`${after} not less than ${before}`);
});
test('blind evaluation contains controls, is deterministic and cannot change model',()=>{
 const brain=new MessageBrain(88),snap=JSON.stringify(brain.snapshot());
 const x=evaluate(brain,{count:9,n:33,seed:9988}),y=evaluate(brain,{count:9,n:33,seed:9988});
 assert.deepEqual(x,y);assert.deepEqual(Object.keys(x.modes),['learned','bellman','off','shuffled','untrained']);
 assert.equal(JSON.stringify(brain.snapshot()),snap);
 for(const mode of Object.values(x.modes)){
  assert.ok(mode.cost>=0);assert.ok(mode.success>=0&&mode.success<=1);assert.ok(mode.firstF1>=0&&mode.firstF1<=1);
 }
});
test('dynamic feedback modifies only locally observed links and sealed evaluation is separate',()=>{
 const w=makeWorld(119,33,'bridges'),c=new Collective(w,new MessageBrain());
 c.exchange(w.n*2);const before=JSON.stringify(c.payload({truth:false}));
 assert.ok(!before.includes('evaluator'));let changes=0;
 for(let i=0;i<6&&!c.solved;i++){
  const e=c.action({evolveEvery:1});if(e.changed)changes+=e.changed;
 }
 assert.ok(changes>=1,'dynamic mutations did not occur');
 assert.ok(c.frames.some(f=>f.type==='action'));
 assert.ok(c.payload({truth:true}).evaluator.links.length>0);
});
test('all controls get same world seed but their signals differ',()=>{
 const brain=new MessageBrain(3),w=makeWorld(404,33,'clusters');
 const on=new Collective(w,MessageBrain.restore(brain.snapshot()),{mode:'learned'}),off=new Collective(w,MessageBrain.restore(brain.snapshot()),{mode:'off'});
 on.exchange(66);off.exchange(66);assert.ok(on.shape().connected);assert.ok(!off.shape().connected);
});
test('deliberate hidden-edge intervention forces local reorganization without teacher path',()=>{
 let found=false;
 for(let seed=10;seed<180;seed++){
  const w=makeWorld(seed,33,'dense'),c=new Collective(w,new MessageBrain(4));
  c.exchange(66);const before=c.shape();
  const candidates=before.nodes.slice(1).filter((v,i)=>w.links.some(e=>!e.tree&&e.open&&((e.a===before.nodes[i]&&e.b===v)||(e.b===before.nodes[i]&&e.a===v))));
  if(!candidates.length)continue;
  const original=c.payload({truth:false});assert.ok(!('evaluator' in original));
  const event=c.intervention(),after=c.shape();assert.equal(event.change,'closed');
  assert.ok(!w.links.find(e=>e.id===event.edge).open);assert.equal(after.connected,true);
  assert.notDeepEqual(before.nodes,after.nodes);found=true;break;
 }
 assert.ok(found,'No test fixture with a removable route edge found');
});
