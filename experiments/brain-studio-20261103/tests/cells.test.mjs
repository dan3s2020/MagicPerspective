import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphCellsBrain,CHANNELS,ROUNDS,FEATURES} from '../engine/cells.mjs';
import {makeBrain,restoreBrain,oneEpisode,blindTest,brainStats,DOMAINS} from '../engine/studio.mjs';
import {graphInvariant} from '../engine/abstract-graph.mjs';
import {Vault,detect} from '../engine/vault.mjs';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const fixture=()=>({
 domain:'maze',current:0,goal:2,
 positions:[{x:.1,y:.4},{x:.45,y:.4},{x:.9,y:.4}],
 visited:[2,1,0],walked:[0,1,0],
 observedCells:new Map([[0,0],[1,0],[2,0]]),
 observedLinks:new Map([['0:1',{a:0,b:1,open:true}],
  ['1:2',{a:1,b:2,open:true}]])
});
const actions=[{to:1,action:0,cost:1},{to:2,action:1,cost:2}];
const loss=(p,y)=>-y*Math.log(Math.max(1e-10,p))-(1-y)*Math.log(Math.max(1e-10,1-p));
test('3-round messages and all 8 numerical channels directly control the chosen action',{timeout:10000},()=>{
 const b=new GraphCellsBrain(17),ep=fixture(),r=b.rank(ep,actions);
 assert.equal(r.trace.engine,'GRAPH-CELLS');
 assert.equal(r.trace.participatingCells,3);
 assert.equal(r.trace.rounds,ROUNDS);
 assert.equal(r.trace.cells.length,3);
 assert.ok(r.trace.messages.length>0);
 assert.ok(r.trace.messages.every(x=>x.round>=1&&x.round<=3&&x.strength>=0));
 assert.ok(r.trace.cells.every(x=>x.activations.length===4&&x.activations.every(z=>z.length===CHANNELS)));
 assert.ok(r.trace.cells.every(x=>x.input.length===FEATURES));
 assert.ok(r.candidates.every(x=>x.net.votes.length===CHANNELS*2));
 const before=r.candidates.find(x=>x.action===0).q;
 // Change an observed neighbour cell's feature, not the current/target action:
 // its signal must propagate through actual state-graph connections.
 const changed=fixture();changed.positions[2]={x:.9,y:.76};
 const after=b.rank(changed,actions).candidates.find(x=>x.action===0).q;
 assert.notEqual(before,after,'Neighbouring state did not influence action score');
 const hidden=fixture();hidden.observedLinks.clear();
 assert.ok(b.rank(hidden,actions).trace.messages.length===0,
  'An undiscovered edge was incorrectly used to carry a message');
});
test('analytic gradients agree with finite-difference gradients on the SAME graph',{timeout:10000},()=>{
 const b=new GraphCellsBrain(37),ep=fixture(),options=[{to:1,action:0,cost:1}],goal=.78;
 const ranked=b.rank(ep,options),candidate=ranked.candidates[0];
 const grad=Object.fromEntries(Object.entries(b.parameters).map(([k,v])=>[k,v.map(()=>0)]));
 const info=b.backward({tape:ranked.tape,net:candidate.net,logit:candidate.logit},goal,grad);
 assert.equal(info.cells.length,3);
 assert.ok(info.cells.some(x=>x.gradient>0));
 for(const [key,index] of [['in',0],['message',1],['readCurrent',2],['readTarget',3],
  ['action',0],['cost',0],['self',0]]){
  const original=b.parameters[key][index],eps=1e-5;
  b.parameters[key][index]=original+eps;
  const high=loss(b.rank(ep,options).candidates[0].q,goal);
  b.parameters[key][index]=original-eps;
  const low=loss(b.rank(ep,options).candidates[0].q,goal);
  b.parameters[key][index]=original;
  const numerical=(high-low)/(2*eps),analytic=grad[key][index];
  assert.ok(Math.abs(numerical-analytic)<2e-4,
   key+' '+index+' derivative mismatch '+numerical+' vs '+analytic);
 }
});
test('ONE GraphCellsBrain executes and learns actual actions on maze, network and symbols',{timeout:60000},()=>{
 const model=makeBrain('cells',91);let previous=JSON.stringify(model.snapshot().parameters);
 for(const [i,domain] of DOMAINS.entries()){
  const e=oneEpisode('cells',model,{domain,seed:54000+i*1023,size:11,learn:true,explore:.2});
  assert.ok(graphInvariant(e));
  assert.equal(e.meta.domain,domain);
  assert.ok(e.outcome.steps>0);
  assert.ok(e.frames.length===e.outcome.steps+1,'Every executed action must have a frame');
  assert.ok(e.frames[0].graph.compute?.cells.length>0);
  assert.ok(e.frames[0].graph.compute?.messages);
  const f=e.frames.find(x=>x.graph.actual);
  assert.ok(f.graph.chosen?.contribution?.votes.length>=CHANNELS,
   'An action was not backed by cell votes');
  assert.ok(f.graph.compute.learning?.updatedWeights>0,'Learning trace absent');
  assert.ok(f.graph.compute.cells.some(x=>x.gradient!==null),'No cell gradient recorded');
  assert.ok(e.outcome.learning?.weightDelta>0,'No real parameter update');
  assert.notEqual(JSON.stringify(model.snapshot().parameters),previous);
  previous=JSON.stringify(model.snapshot().parameters);
 }
 assert.equal(model.episodes,3);
 assert.equal(model.steps,3);
 assert.equal(Object.values(model.domainCounts).reduce((s,v)=>s+v,0),3);
});
test('read-only probing does not change weights or hidden state; restore keeps optimizer exact',{timeout:45000},()=>{
 const b=new GraphCellsBrain(57);
 oneEpisode('cells',b,{domain:'maze',seed:121,learn:true,size:9});
 const snap=b.snapshot(),copy=GraphCellsBrain.restore(snap);
 assert.deepEqual(copy.snapshot(),snap);
 const check=JSON.stringify(b.snapshot());
 const a=oneEpisode('cells',b,{domain:'network',seed:11191,learn:false,size:11,explore:0});
 assert.ok(a.frames[0].graph.compute.learning===null);
 assert.equal(JSON.stringify(b.snapshot()),check);
 const r=blindTest('cells',b,{count:3,size:9,seed:11493,domains:DOMAINS});
 assert.deepEqual(Object.keys(r.domains),DOMAINS);
 assert.equal(JSON.stringify(b.snapshot()),check,'Blind evaluation trained the selected brain');
 assert.ok(brainStats('cells',b).weights.W1.length>0);
});
test('new graph-cell checkpoints are selectable alongside old brains without fake weight conversion',{timeout:15000},async()=>{
 const parent=await mkdtemp(path.join(tmpdir(),'cells-vault-'));
 try{
  const vault=new Vault(parent,path.join(parent,'studio')),brain=new GraphCellsBrain(42);
  await vault.setup();
  const id=await vault.saveBrain('cells',brain,'Causal team of graph cells');
  assert.ok((await vault.list()).some(x=>x.id===id&&x.trainable));
  assert.equal(detect({brain:brain.snapshot()}).kind,'cells');
  assert.deepEqual((await vault.load(id)).brain.snapshot(),brain.snapshot());
  const old=makeBrain('universal',42);
  assert.equal(detect({brain:old.snapshot()}).kind,'universal');
  assert.deepEqual(restoreBrain('universal',old.snapshot()).snapshot(),old.snapshot());
 }finally{await rm(parent,{recursive:true,force:true});}
});
