import test from 'node:test';
import assert from 'node:assert/strict';
import {SelfCodeWorld} from '../transcend/torus-aether/worlds/self-code.mjs';
import {analyzeSelfCodeGraph,difference,printableReport} from '../transcend/torus-aether/worlds/self-code-metrics.mjs';

function mockedBrain(seed=71){
 let n=seed>>>0;const nodes=new Map(),events=[];
 const trace={
  node(id,type,label){nodes.set(id,{id,type,label});},
  setEdge(){},
  fire(id){assert.ok(nodes.has(id),'fires only real graph nodes');}
 };
 return {seed,trace,events,live(){},observeShared(e){events.push(e);},
  rand(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;}};
}

test('the audit is frozen, exposes unseen input and novel parameter scores without training',()=>{
 const b=mockedBrain(),w=new SelfCodeWorld(b);
 for(let i=0;i<150;i++)w.step();
 const before=JSON.stringify(b.selfCode),a=w.auditKnowledge();
 const again=w.auditKnowledge(),after=JSON.stringify(b.selfCode);
 assert.equal(after,before,'read-only audit must not change learning state');
 assert.deepEqual(a,again);
 assert.equal(a.heldoutInputs.total,48);
 assert.equal(a.newParameterValues.total,64);
 assert.equal(a.permutedGeneLabels.total,48);
 for(const x of [a.heldoutInputs,a.newParameterValues,a.permutedGeneLabels])
  assert.ok(x.accuracy>=0&&x.accuracy<=1);
 assert.ok(a.trainingExamples>0);
});
test('a live worker snapshot is measurable without touching the server',()=>{
 const b=mockedBrain(),w=new SelfCodeWorld(b);for(let i=0;i<96;i++)w.step();
 const graph={lived:10000,accC:.7,accF:.83,accAlign:.95,
  nodes:[['o:self','self','eu'],['code:gene:x','code','x'],['code:lock','lock','closed']],
  edges:[['code:gene:x','code:lock','portal',1]],selfCode:w.status()};
 const report=analyzeSelfCodeGraph(graph,0);
 assert.equal(report.code.episodes,96);
 assert.equal(report.code.unseenInputs.n,48);
 assert.equal(report.code.newParameters.n,64);
 assert.equal(report.code.shuffledLabels.n,48);
 assert.match(printableReport(report),/INTRARI NEVAZUTE|intrari NEVAZUTE|intrari NEVĂZUTE/i);
 assert.equal(report.graphRecentAligned,.95);
});
test('safely reports older live worker without new audit fields',()=>{
 const graph={nodes:[['o:self','self','eu']],edges:[],
  selfCode:{episodes:8,unlocked:false,portalCost:8,lockAccuracy:0,baseline:0,portals:[],codeEdits:[]}};
 const result=analyzeSelfCodeGraph(graph,0);
 assert.equal(result.code.unseenInputs,null);
 assert.match(printableReport(result),/EVALUARE EXTINSA/);
});
test('progress comparison detects training speed and avoids false gain after reset',()=>{
 const a={utc:'2026-11-06T08:00:00.000Z',worker:0,code:{episodes:100,portals:80,editCount:0,lockOpen:false}};
 const b={utc:'2026-11-06T08:01:00.000Z',worker:0,code:{episodes:340,portals:315,editCount:1,lockOpen:true}};
 const diff=difference(a,b);assert.equal(diff.codeEpisodes,240);
 assert.equal(diff.episodesPerSecond,4);
 assert.equal(diff.changedLock,true);
 assert.equal(difference(b,a).reset,true);
});