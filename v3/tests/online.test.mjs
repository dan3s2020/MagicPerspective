import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveNet,CausalModel,features,routeFromBelief} from '../engine/model.mjs';
import {Organism} from '../engine/organism.mjs';
import {makeWorld,blankBelief,observe} from '../engine/world.mjs';
import {evaluate} from '../engine/training.mjs';

test('neural shared representation really learns from a world observation',()=>{
 const net=new PerspectiveNet(34),w=makeWorld(23,11),belief=blankBelief(11);
 observe(w,w.start,belief);
 const unknown=belief.walls.findIndex(v=>v===-1);
 const oldOutput=net.predict(belief,11,w.start,w.goal);
 const before=net.snapshot();
 const x=features(belief,11,w.start,w.goal,unknown);
 const result=net.adapt(x,'wall',0);
 assert.ok(result.error>0);
 assert.notDeepEqual(net.snapshot().w1,before.w1);
 assert.notDeepEqual(net.predict(belief,11,w.start,w.goal),oldOutput);
 assert.equal(net.onlineUpdates,1);
});
test('neural outcome correction occurs online without teacher path labels',()=>{
 const net=new PerspectiveNet(34),c=new CausalModel(),o=new Organism(15,net,c,11,'branched');
 const initial=o.initial.bce,startWeights=net.snapshot(),action=o.act();
 assert.notEqual(action.type,'invalid');assert.equal(o.initial.bce,initial);
 assert.ok(net.onlineUpdates>0);
 assert.ok(action.neuralCorrection>0);
 assert.notDeepEqual(net.snapshot().w1,startWeights.w1);
 assert.ok(o.anchoredMetrics.bce>=0);
});
test('frozen neural control retains encoder weights but receives equal causal learning',()=>{
 const net=new PerspectiveNet(34),c=new CausalModel(),o=new Organism(15,net,c,11,'branched','shape',false);
 const snap=JSON.stringify(net.snapshot()),originalCausal=c.samples;
 const action=o.act();assert.equal(action.type,'moved');assert.equal(o.initial.bce,o.initial.bce);
 assert.equal(JSON.stringify(net.snapshot()),snap);
 assert.ok(c.samples>originalCausal);
 assert.equal(action.neuralCorrection,0);
});
test('perceived 3x3 changes can never expose unseen wall labels to neural updater',()=>{
 const net=new PerspectiveNet(34),c=new CausalModel(),o=new Organism(17,net,c,11,'branched');
 let before=o.belief.walls.filter(x=>x>=0).length;
 const ev=o.act();let after=o.belief.walls.filter(x=>x>=0).length;
 assert.equal(after-before,ev.newCells);
 assert.equal(ev.newlyObserved,ev.newCells);
 assert.equal(net.wallSamples,ev.newCells);
});
test('evaluation clones neural models; navigation with online updates does not mutate persistent checkpoint',()=>{
 const net=new PerspectiveNet(34),c=new CausalModel(),before=JSON.stringify(net.snapshot()),causal=JSON.stringify(c.snapshot());
 const a=evaluate(net,{seed:990031,count:9,n:7,navigation:true,causal:c});
 assert.ok(a.navigation.shape);assert.ok(a.navigation.frozenShape);
 assert.equal(JSON.stringify(net.snapshot()),before);
 assert.equal(JSON.stringify(c.snapshot()),causal);
});
test('online adaptation remains deterministic across equal seeds and frozen checkpoints',()=>{
 const one=new Organism(229,new PerspectiveNet(17),new CausalModel(),11,'rooms');
 const two=new Organism(229,new PerspectiveNet(17),new CausalModel(),11,'rooms');
 for(let i=0;i<12&&!one.finished;i++){
   assert.deepEqual(one.act(),two.act());
   assert.deepEqual(one.prob,two.prob);
 }
});
test('restoring V3 stores both learned heads and the shared neural encoder',()=>{
 const n=new PerspectiveNet(77);const b=blankBelief(7);
 const x=features(b,7,8,40,25);n.adapt(x,'wall',1);n.adapt(x,'effort',3.4);
 const restored=PerspectiveNet.restore(n.snapshot());assert.deepEqual(restored.snapshot(),n.snapshot());
 assert.deepEqual(n.forward(x),restored.forward(x));
});
test('frozen-control and online model receive equal action feedback without hidden map',()=>{
 const net=new PerspectiveNet(19),causal=new CausalModel();
 const on=new Organism(827,PerspectiveNet.restore(net.snapshot()),CausalModel.restore(causal.snapshot()),9,'braided','shape',true);
 const off=new Organism(827,PerspectiveNet.restore(net.snapshot()),CausalModel.restore(causal.snapshot()),9,'braided','shape',false);
 for(let step=0;step<5;step++){
  const chosen=on.route[1];assert.ok(chosen!==undefined);
  // Force same exploratory actions: both arms observe exactly the same tiles.
  assert.equal(on.act(chosen).type,off.act(chosen).type);
  assert.deepEqual(on.belief,off.belief);
 }
 assert.deepEqual(on.causal.snapshot(),off.causal.snapshot());
 assert.notDeepEqual(on.net.snapshot().w1,off.net.snapshot().w1);
});
test('soft wall-risk weights may change route without fabricating walls',()=>{
 const n=7,start=8,goal=40,belief=blankBelief(n),p=new Array(n*n).fill(.5),causal=new CausalModel();
 const route=routeFromBelief(belief,n,start,goal,p,causal,'shape');
 const risky=new Array(n*n).fill(0.01);
 for(const pos of route.slice(1,-1))risky[pos]=.99;
 const detour=routeFromBelief(belief,n,start,goal,p,causal,'shape',risky);
 assert.ok(route.length&&detour.length);assert.notDeepEqual(route,detour);
 assert.ok(detour.every(cell=>belief.walls[cell]!==1));
});
