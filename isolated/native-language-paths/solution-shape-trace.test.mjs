// Regression fixtures are tests ONLY; user-facing training never substitutes these for OpenThoughts.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';
import {ObservedQAAtlas} from './atlas.mjs';
import {captureSolutionShape} from './solution-shape-trace.mjs';
import {LiveResearch} from './live-research.mjs';
const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
const ready=()=>{const b=new Brain({rules,c:{margin:.05,window:400},seed:11});
  for(let i=0;i<36;i++)b.playMaze(false);
  assert.ok(b.disc.attract(KIND.target)>.2);
  return b;
};
test('native V17 initial shape, actual cursor moves and every replanning frame are grounded in observed graph',()=>{
  const brain=ready(),atlas=new ObservedQAAtlas();
  atlas.observe('Where is the archive?','The archive is inside the city library. Go to its second floor.',13);
  atlas.observe('Where is the city library?','Near the central square. Use the main entrance.',14);
  const graph=atlas.build('Tell me where the archive is located',{candidates:8});
  const T=captureSolutionShape(graph,brain.disc,{actorPolicy:'native'});
  assert.equal(T.factualLimits.inventedEdges,false);
  assert.equal(T.factualLimits.nextCharacterGeneratorActions,false);
  assert.equal(T.frames.length,T.executed.length);
  assert.equal(T.frames[0].index,0);
  assert.equal(T.frames[0].actual,null);
  assert.deepEqual(T.frames[0].globalShape,T.initial.shape);
  assert.ok(T.nodes.length>1);
  assert.ok(T.nodes.every(n=>n.dimension&&typeof n.dimension.branching==='number'));
  assert.equal(T.summary.recomputations,T.frames.length);
  assert.equal(T.summary.steps,T.frames.length-1);
  assert.equal(T.summary.reachedStoredTrainingTarget,true);
  for(let i=1;i<T.frames.length;i++){
    const f=T.frames[i],prev=T.frames[i-1];
    assert.equal(f.from,prev.at);
    assert.equal(f.actual,f.at);
    assert.equal(graph.adj[f.from][f.action],f.actual,'actor may ONLY move on a real graph edge');
    assert.equal(f.forecastError,Number(f.actual!==f.predictedNext));
    assert.equal(f.shape[0],f.at);
    assert.equal(f.field.length,graph.nodes.length);
  }
});
test('successor actor traverses ONLY observed edges; divergences are counted, not manufactured',()=>{
  const brain=ready(),g={nodes:[
    {kind:KIND.self,label:'entry'},{kind:KIND.floor,label:'left'},
    {kind:KIND.floor,label:'right'},{kind:KIND.floor,label:'branch'},
    {kind:KIND.target,label:'observed training answer'}
  ],adj:[[1,2],[4],[3],[4],[]]};
  const baseline=captureSolutionShape(g,brain.disc,{actorPolicy:'native'});
  const sr=captureSolutionShape(g,brain.disc,{actorPolicy:'successor'});
  assert.equal(baseline.summary.reachedStoredTrainingTarget,true);
  assert.equal(sr.summary.reachedStoredTrainingTarget,true);
  assert.equal(sr.summary.exactShortestPaths,'1');
  assert.equal(sr.summary.divergencesFromRecomputedLocalPrediction,
    sr.frames.slice(1).filter(f=>f.forecastError).length);
  assert.ok(sr.alternatives.every(a=>a.path.every((node,j)=>j===0||g.adj[a.path[j-1]].includes(node))));
});
test('empty unobserved text graph has exactly zero actions and no fabricated target',()=>{
  const brain=ready(),atlas=new ObservedQAAtlas();
  const g=atlas.build('unobserved user text');
  const T=captureSolutionShape(g,brain.disc);
  assert.equal(T.frames.length,1);
  assert.deepEqual(T.executed,[0]);
  assert.equal(T.summary.steps,0);
  assert.equal(T.initial.shortestPathCount,'0');
  assert.equal(T.summary.reachedStoredTrainingTarget,false);
  assert.equal(T.summary.stopReason,'no-available-rising-edge');
});
test('real OnlineResearch captures 2 independent grounded policy traces before observing current answer',()=>{
  const brain=ready(),research=new LiveResearch({maxEntries:32,characterLimit:80});
  research.experience({index:7,question:'Where is the library?',answer:'Inside the city center.',characters:48},brain);
  assert.ok(research.last.navigation.native);
  assert.equal(research.last.navigation.native.summary.steps,0);
  research.experience({index:8,question:'Where is the library located?',answer:'Near the central square.',characters:49},brain);
  const n=research.last.navigation;
  assert.ok(n.native.frames.length>1);
  assert.ok(n.successor.frames.length>1);
  assert.deepEqual(n.native.edges,n.successor.edges);
  assert.ok(research.last.navigation.native.nodes.every(n=>n.source!==8));
  const frozen=research.evaluateHeldout([{index:99,prompt:'Where is the library located?',answer:'Near the central square.'}],brain);
  assert.equal(frozen.samples,1);
  assert.ok(research.atlas.examples.every(n=>n.sourceIndex!==99));
});
