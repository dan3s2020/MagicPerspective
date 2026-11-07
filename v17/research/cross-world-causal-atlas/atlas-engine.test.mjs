import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTIONS,STATES,CausalAtlas4D} from './atlas-engine.mjs';
import {evidence,world,benchmark,learningCurve,shiftedPhysicsDiagnostic,fullResearch} from './atlas-benchmark.mjs';

const runs=[17,29,47].map(seed=>benchmark({seed,worlds:96}));
test('all 288 new 4D mazes are solved by FIRST complete planned route with known full map and learned cross-world transitions',()=>{
  assert.equal(runs.reduce((n,x)=>n+x.results.full,0),288);
  assert.equal(runs.reduce((n,x)=>n+x.results.optimal,0),288);
  assert.ok(runs.every(x=>x.results.holdoutNeverTrains));
  assert.ok(runs.every(x=>x.results.conditionalRules.length===6));
});
test('complete atlas exposes ALL 256 states * 8 actions, direct versus inferred links and evidence provenance',()=>{
  for(const run of runs){const graph=run.atlas.completeAtlas();
    assert.equal(graph.states,256);assert.equal(graph.edges.length,2048);
    assert.equal(graph.observedExact+graph.inferred,2048);
    assert.ok(graph.observedExact>=1350&&graph.observedExact<=1500);
    assert.ok(graph.inferred>500);
    assert.ok(graph.edges.every(e=>e.known&&e.modelEvidenceCount>0&&e.modelWorlds.length>1));
    assert.ok(graph.edges.filter(e=>e.source==='directly-observed').every(e=>e.evidenceIds.length>0));
    assert.ok(graph.edges.filter(e=>e.source==='inferred-from-other-worlds').every(e=>e.evidenceIds.length===0));
  }
});
test('fragmentation matters: static movement and single-source-world ablations fail measurably',()=>{
  assert.equal(runs.reduce((n,x)=>n+x.results.oneWorld,0),0);
  assert.equal(runs.reduce((n,x)=>n+x.results.fixed,0),12);
  assert.equal(runs.reduce((n,x)=>n+x.results.rank2,0),2);
});
test('real previously unobserved conditional rule change identifies exactly 256 incorrect links and their causal source',()=>{
  const altered=shiftedPhysicsDiagnostic({seed:17});
  assert.equal(altered.total,2048);assert.equal(altered.wrong,256);
  assert.equal(altered.wrongByAction.fold,256);
  for(const a of ACTIONS.filter(x=>x!=='fold'))assert.equal(altered.wrongByAction[a],0);
  assert.ok(altered.examples.every(x=>x.why==='context-dependent-rule-changed-in-new-world'));
});
test('cross-world observations preserve provenance, model and full-graph predictions across checkpoint restoration',()=>{
  const base=runs[0],snapshot=base.atlas.snapshot();
  assert.equal(snapshot.events.length,2432);
  assert.equal(new Set(snapshot.events.map(x=>x.world)).size,32);
  const clone=CausalAtlas4D.restore(JSON.parse(JSON.stringify(snapshot)));
  assert.deepEqual(clone.completeAtlas(),base.atlas.completeAtlas());
  const w=world(97123);assert.deepEqual(clone.route(w.start,w.goal,w.passable),base.atlas.route(w.start,w.goal,w.passable));
  assert.equal(clone.events.length,2432);
});
test('training noise is tolerated but the model still has actual nonzero errors on observations',()=>{
  const noisy=[17,29,47].map(seed=>benchmark({seed,worlds:96,corrupt:.15}));
  assert.equal(noisy.reduce((n,x)=>n+x.results.full,0),288);
  assert.ok(noisy.every(x=>x.results.atlas.transforms.some(a=>a.errors>0)));
});
test('insufficient training abstains on uncovered action and records frontier instead of inventing a path',()=>{
  const obs=evidence(17),a=new CausalAtlas4D();for(const x of obs.byWorld[31])a.observe(x);a.fit();
  assert.ok(ACTIONS.some(action=>!a.model.get(action).ready));
  const w=world(77443),result=a.route(w.start,w.goal,w.passable);
  assert.ok(!result.found);assert.ok(result.frontier.some(f=>f.reason==='action-never-observed'));
  assert.throws(()=>a.completeAtlas(),/some actions unobserved/);
});
test('measured learning curve is recorded without inventing the previous purported learning threshold',()=>{
  const c=[17,29,47].map(seed=>learningCurve({seed,worlds:96}));
  assert.ok(c.every(curve=>curve.length===10));
  assert.ok(c.every(curve=>curve.at(-1).correct===96));
  assert.ok(c.every(curve=>curve[0].correct<=96));
  console.log('MEASURED_PREFIX_CURVE',JSON.stringify(c.map((curve,i)=>({seed:[17,29,47][i],values:curve.map(x=>[x.observations,x.correct])}))));
});
test('all 288 individual first-action full plans and all 2048 edges can be exported and reconstructed',()=>{
  const {metrics,graph,trainingEvidence}=fullResearch();
  assert.equal(metrics.runs.flatMap(x=>x.worldTraces).length,288);
  assert.equal(graph.edges.length,2048);
  assert.equal(trainingEvidence.length,32);
  assert.ok(trainingEvidence.every(s=>s.length>1000));
  assert.equal(metrics.physicsShift.wrong,256);
  assert.deepEqual(metrics.aggregate,{worlds:288,full:288,optimal:288,fixed:12,oneWorld:0,rank2:2});
  console.log('MEASURED_ATLAS_288',JSON.stringify({aggregate:metrics.aggregate,direct:graph.observedExact,inferred:graph.inferred,wrongUnderRuleShift:256}));
});
