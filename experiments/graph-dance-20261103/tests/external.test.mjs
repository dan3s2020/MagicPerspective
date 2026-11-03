import test from 'node:test';
import assert from 'node:assert/strict';
import {importExternalWorld} from '../engine/external.mjs';
import {oracle,sense,act,makeWorld} from '../engine/world.mjs';
import {AssociationRule} from '../engine/dance.mjs';
import {Episode} from '../engine/agent.mjs';

const sample=()=>({schema:1,name:'Real graph supplied by user',
 nodes:[{id:'START',x:.1,y:.2},{id:'B',x:.3,y:.2},{id:'C',x:.65,y:.3},{id:'FINISH',x:.9,y:.8}],
 start:'START',goal:'FINISH',
 edges:[
 {from:'START',to:'B',cost:1},{from:'B',to:'C',cost:1},{from:'C',to:'FINISH',cost:1},
 {from:'START',to:'FINISH',cost:10},{from:'B',to:'FINISH',cost:2,open:false}
 ]});
test('imported graph represents supplied task, not a generated maze/network',()=>{
 const {world,summary}=importExternalWorld(sample());
 assert.equal(world.family,'external');
 assert.equal(summary.name,'Real graph supplied by user');
 assert.equal(summary.nodeCount,4);
 assert.equal(summary.edgeCount,5);
 assert.equal(summary.start,'START');
 assert.equal(summary.goal,'FINISH');
 assert.equal(summary.reachable,true);
 assert.deepEqual(oracle(world).nodes,[0,1,2,3]);
 assert.equal(oracle(world).cost,3);
 // A node can sense its incident links; it cannot see remote C-FINISH.
 const local=sense(world,0);
 assert.equal(local.node,0);
 assert.equal(local.links.length,2);
 assert.ok(!local.links.some(x=>x.to===2));
 assert.equal(act(world,0,3).cost,10);
 assert.equal(act(world,1,3).type,'blocked');
});
test('arbitrary task runs in existing Graph Dance engine without writing trained model',()=>{
 const {world}=importExternalWorld(sample()),shared=new AssociationRule(19);
 const before=JSON.stringify(shared.snapshot());
 const ep=new Episode(world,AssociationRule.restore(shared.snapshot()),{online:false,dance:true});
 ep.run();
 assert.ok(ep.history.length>=2);
 assert.ok(ep.history[0].phase.length===world.n);
 assert.deepEqual(shared.snapshot(),JSON.parse(before));
 const last=ep.summary();
 assert.ok(typeof last.solved==='boolean');
 assert.ok(last.associations>=0);
});
test('unreachable real graph reports unreachable explicitly',()=>{
 const s=sample();
 s.edges=s.edges.map(e=>({...e,open:e.from==='START'&&e.to==='B'}));
 const {world,summary}=importExternalWorld(s);
 assert.equal(summary.reachable,false);
 assert.equal(summary.optimalCost,null);
 assert.equal(oracle(world).nodes.length,0);
});
test('external task import rejects unsafe or inconsistent topologies',()=>{
 const cases=[
  s=>{s.schema=2},
  s=>{s.nodes[1].id='START'},
  s=>{s.nodes.push({id:'A',x:2,y:1})},
  s=>{s.edges[0].cost=-1},
  s=>{s.edges[0].cost=NaN},
  s=>{s.edges[0].cost=Infinity},
  s=>{s.edges.push({...s.edges[0]})},
  s=>{s.edges[0].to='GHOST'},
  s=>{s.edges[0].to='START'},
  s=>{s.edges[0].open='yes'},
  s=>{s.goal='START'},
  s=>{s.nodes=[]},
  s=>{s.edges=[]}
 ];
 for(const mutate of cases){
  const s=sample();mutate(s);
  assert.throws(()=>importExternalWorld(s),JSON.stringify(s));
 }
});
test('original built-in generator remains deterministic and unaffected',()=>{
 const x=makeWorld(891,33,'mixed');
 const y=makeWorld(891,33,'mixed');
 assert.deepEqual(x,y);
 assert.equal(x.family,'mixed');
 assert.equal(oracle(x).nodes.at(0),x.start);
});
