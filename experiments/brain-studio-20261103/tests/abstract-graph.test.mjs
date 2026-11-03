import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedBrain,makeBrain,oneEpisode,restoreBrain} from '../engine/studio.mjs';
import {graphInvariant} from '../engine/abstract-graph.mjs';
import {makeWorld as terrainWorld,truthRoute} from '../../../v7/engine/world.mjs';
import {makeWorld as graphWorld,oracle as graphOracle} from '../../graph-dance-20261103/engine/world.mjs';
import {createWorld as textWorld,generateTask,shortestOracle} from '../../causal-text/engine/world.mjs';

const cases=[['maze',43310],['network',43311],['text',43312]];
test('same universal brain exposes a real state graph for each domain without any oracle-derived learner edge',{timeout:40000},()=>{
 const model=new SharedBrain(17),snap=JSON.stringify(model.snapshot());
 for(const [domain,seed] of cases){
  const result=oneEpisode('universal',model,{domain,seed,size:11,learn:false,explore:0});
  assert.ok(graphInvariant(result),domain);
  const {meta,frames,outcome}=result,a=meta.abstract;
  assert.equal(a.domain,domain);
  assert.ok(a.nodes.length>0&&a.edges.length>0);
  assert.ok(frames.length>=2);
  assert.ok(frames[0].graph.candidates.length>0,'Real Q values missing in '+domain);
  assert.ok(frames[0].graph.candidates.every(c=>Number.isFinite(c.q)&&Number.isFinite(c.utility)));
  assert.ok(frames.some(f=>f.graph.actual?.from!=null),'No real action in '+domain);
  assert.equal(a.solution.path[0],meta.start,'Oracle start differs '+domain);
  if(a.solution.reachable)assert.equal(a.solution.path.at(-1),meta.goal);
  for(const f of frames){
   assert.ok(Array.isArray(f.graph.observedNodes));
   assert.ok(Array.isArray(f.graph.predictedPath));
   const scores=f.graph.candidates.map(c=>c.utility);
   for(let i=1;i<scores.length;i++)assert.ok(scores[i-1]>=scores[i]-1e-8);
   if(f.graph.actual)assert.ok(Number.isInteger(f.graph.actual.to));
  }
  if(domain==='maze'){
   const world=terrainWorld(seed,'maze',11);
   assert.deepEqual(a.solution.path,truthRoute(world).cells);
   assert.ok(frames[0].graph.observedNodes.length<world.n*world.n,
    'Initial learner frame illegally reveals all maze cells');
   for(const f of frames)for(const e of f.graph.observedEdges){
    assert.ok(world.h[e.a]<=.82&&world.h[e.b]<=.82,'Invented passable edge');
    assert.ok(f.graph.observedNodes.includes(e.a)&&f.graph.observedNodes.includes(e.b),
      'Edge leaked unobserved cells');
   }
  }else if(domain==='network'){
   const world=graphWorld(seed,25,['local','hierarchical','mixed'][seed%3]);
   assert.deepEqual(a.solution.path,graphOracle(world).nodes);
   const truth=new Set(world.edges.filter(e=>e.open).map(e=>[Math.min(e.a,e.b),Math.max(e.a,e.b)].join(':')));
   for(const f of frames)for(const e of f.graph.observedEdges)if(e.open!==false){
    assert.ok(truth.has([Math.min(e.a,e.b),Math.max(e.a,e.b)].join(':')));
   }
  }else{
   const world=textWorld(seed),task=generateTask(world,seed+77,{minSteps:2,maxSteps:5});
   assert.deepEqual(a.solution.actions,shortestOracle(world,task.start,task.goal,14)||[]);
   for(const f of frames)for(const e of f.graph.observedEdges){
    assert.ok(e.action,'Text transformation edge must expose its measured action');
    const from=[Math.floor(e.a/7),e.a%7],actual=world.intervene(from,e.action).to;
    assert.equal(e.b,actual[0]*7+actual[1]);
   }
   assert.ok(frames[0].graph.candidates.some(c=>c.to===null),
    'Unobserved symbolic destinations should remain unknown in learner');
  }
  assert.ok(outcome.steps>0);
 }
 assert.equal(JSON.stringify(model.snapshot()),snap,'Frozen graph inspection mutated weights');
});
test('all supported native model traces share the same evaluator-separated graph contract',{timeout:60000},()=>{
 for(const [i,kind] of ['v6','v7','graph','dynamic','causal'].entries()){
  const brain=makeBrain(kind,19+i);
  const episode=oneEpisode(kind,brain,{seed:5501+i,size:11,learn:true});
  assert.ok(graphInvariant(episode),kind+' failed canonical graph');
  assert.ok(episode.meta.abstract.nodes.length>=20);
  assert.ok(episode.frames.length>=1);
  assert.ok(episode.meta.abstract.solution.path.length>=0);
  assert.ok(episode.frames.every(f=>f.graph.observedEdges.every(e=>e.open!==false||kind==='graph')));
 }
});
test('graph gives one-step model decisions separately from true action and reference solution',{timeout:30000},()=>{
 const model=new SharedBrain(37),e=oneEpisode('universal',model,{seed:72343,domain:'network',size:11,learn:false,explore:0});
 const first=e.frames.find(f=>f.graph.actual);
 assert.ok(first);
 assert.equal(first.graph.chosen.action,first.graph.candidates[0].action,
  'Frozen exploitation must choose top Q candidate');
 assert.equal(first.graph.actual.from,first.current);
 assert.notStrictEqual(first.graph,e.meta.abstract,'Evaluator graph leaked as learner graph object');
});
