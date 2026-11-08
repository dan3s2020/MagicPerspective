import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeGraph,nativeXD,topology,graphSpectrum,coordinateDimensions,causalTrace,mazeShape,DynamicsTracker} from '../public/science-core.mjs';
const sample={w:1,nodes:[['s:65','sym','A',1],['s:66','sym','B',2],['s:67','sym','C',3],['s:68','sym','D',4]],edges:[['s:65','s:66','',1],['s:66','s:67','',1],['s:67','s:68','',1],['s:68','s:65','',1]],U:[[65,[0.1,.2,.3,.4,.5]],[66,[.2,.3,.4,.5,.6]],[67,[.3,.4,.5,.6,.7]],[68,[.4,.5,.6,.7,.8]]],flow:[['s:65','s:66']],shared:{training:{step:1,trace:{before:[0,0],predicted:[1,3],observed:[1,2]}}}};
test('actual native symbol U keys resolve into displayed s:byte IDs',()=>{
  const g=nativeGraph(sample);assert.equal(g.totalNodes,4);assert.equal(g.coordsCount,4);
  assert.deepEqual(g.xyz[0],[.1,.2,.3,.4,.5]);
});
test('cycle rank is graph topology, NOT certified Hopf linking',()=>{
  const t=topology(nativeGraph(sample));assert.equal(t.rank,1);assert.equal(t.components,1);assert.equal(t.cycles.length,1);
  assert.match(t.interpretation,/not Hopf/);
});
test('unweighted graph-Laplacian spectrum matches path-3 exact [0,1,3]',()=>{
  const g=nativeGraph({...sample,edges:[['s:65','s:66'],['s:66','s:67']]});
  const {values}=graphSpectrum(g,3);assert.equal(values.length,3);
  for(let i=0;i<3;i++)assert.ok(Math.abs(values[i]-[0,1,3][i])<1e-7);
});
test('coordinates are measured from source graph and not randomized for science',()=>{
  const v=coordinateDimensions(nativeGraph(sample));assert.equal(v.d,5);assert.ok(v.effective>0);assert.equal(v.periodic,true);
});
test('causal error uses only real predicted and observed arrays',()=>{
  assert.equal(causalTrace(sample).rmse,Math.sqrt(.5));assert.equal(causalTrace({}),null);
});
test('dynamics does not treat identical polling snapshots as oscillations',()=>{
  const tracker=new DynamicsTracker();assert.equal(tracker.push(nativeGraph(sample),1),true);
  assert.equal(tracker.push(nativeGraph(sample),2),false);assert.equal(tracker.history.length,1);
  const changed={...sample,nodes:sample.nodes.map((r,i)=>i===0?[...r.slice(0,3),5]:r)};
  assert.equal(tracker.push(nativeGraph(changed),3),true);assert.equal(tracker.history.length,2);
});
test('original frozen maze planned and executed routes remain separately sourced',()=>{
  const m=mazeShape({n:3,start:0,goal:8,wall:Array(9).fill(0),path:[0,1,2,5,8],shapes:[[1,1,2,2]],solved:true,first:1});
  assert.deepEqual(m.planned,[0,1,2,5,8]);assert.deepEqual(m.path,[0,1,2,5,8]);
  assert.equal(mazeShape({n:3,start:0,path:[0,1]}).planned,null);
});
test('native xD witness maps actual pre-action route against executed consequences',()=>{
  // Strict schema fixture for adapter; separate original-module integration suite runs real xD worlds.
  const vertices=Array.from({length:128},(_,mask)=>({id:'v'+mask,mask,
    coordinates:Array.from({length:7},(_,a)=>8*(a+1)).filter((_,a)=>(mask&(1<<a))!==0),wall:false}));
  const links=Array.from({length:127},(_,i)=>({from:'v'+i,to:'v'+(i+1),axis:8}));
  const route=['v0','v1','v3','v7','v15','v31','v63','v127'];
  const frames=route.slice(1).map((v,i)=>({step:i,from:route[i],action:'act:'+i,predictedAfter:v,observedAfter:v,correct:true}));
  const x=nativeXD({xdAtlas:{last:{atlas:{fullWorld:{vertices,links,start:'v0',ambientDimensions:2048,
    activeRank:7,finiteStateCount:128,completeFullHypercube:false},initialPredictedSolution:route,pathLength:7,
    evaluatorPhysicalShortestPath:7},execution:{solved:true,correct:7,attempted:7,frames}}}});
  assert.equal(x.dimensions,2048);assert.equal(x.activeRank,7);assert.equal(x.finiteStates,128);
  assert.equal(x.graph.nodes.length,128);assert.deepEqual(x.predicted,route);assert.deepEqual(x.observed,route);
  assert.equal(x.solved,true);
});
test('absence of original measurements produces null and no invented particle results',()=>{
  assert.equal(nativeGraph(null),null);assert.equal(mazeShape(null),null);assert.equal(nativeXD({}),null);
  assert.equal(coordinateDimensions(nativeGraph({nodes:[['x']],edges:[]})),null);
});
