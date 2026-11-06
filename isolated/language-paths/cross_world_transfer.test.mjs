import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechWorld,UTTERANCES,TRAIN_WORDS,TEST_WORDS,same} from './engine.mjs';
import {SpatialTrack,learnSource,calibrateLanguage,transferredModel,naiveUnalignedModel,oneShotTargetPrior,evaluateTransfer} from './cross_world_transfer.mjs';

test('spatial world gives 2D coordinates and hides its action physics',()=>{
 const s=new SpatialTrack(11),o=s.reset(['a','b','c','d','e']);
 assert.deepEqual(o.positions.map(p=>[p.x,p.y]),[[0,0],[1,0],[0,1],[1,1],[0,2]]);
 assert.deepEqual(Object.keys(o).sort(),['buttons','positions','tiles']);
 assert.equal('#buttonPhysics' in s,false);
});
test('source learns actions by physical interventions, no solution path given',()=>{
 const l=learnSource(11);
 assert.equal(l.events.length,48);assert.equal(l.atlas.ready(),true);
 assert.equal(l.sourceRules.length,6);
 assert.ok(l.sourceRules.every(r=>r.rule&&r.seen===8));
});
test('the SAME learned source action atlas transfers by a one-probe-per-action correspondence',()=>{
 for(const seed of [29,53,97]){
  const l=learnSource(11),target=new SpeechWorld(seed),c=calibrateLanguage(l.atlas,target),model=transferredModel(l.atlas,c.mapping);
  assert.ok(model.ready());assert.equal(c.evidence.length,6);assert.ok(c.evidence.every(e=>e.sourceCandidates===1));
  for(const n of [6,7,8]){
   const s=TEST_WORDS.slice(0,n);
   for(const u of UTTERANCES){target.reset(s,s);const truth=target.step(u).after;
    assert.deepEqual(model.predict(s,u),truth,`seed=${seed}, n=${n}, action=${u}`);
    const previous=model.predecessor(truth,u);assert.deepEqual(previous,s,'learned inverse projection must recover start');
   }
  }
 }
});
test('equivariance: renaming unseen words commutes with a learned transformation',()=>{
 const source=learnSource(11).atlas,target=new SpeechWorld(53),c=calibrateLanguage(source,target),m=transferredModel(source,c.mapping);
 const a=TEST_WORDS.slice(0,7),b=TEST_WORDS.slice(7,14);const replace=new Map(a.map((v,i)=>[v,b[i]]));
 for(const action of UTTERANCES){
  const lifted=m.predict(a,action).map(x=>replace.get(x));const projected=m.predict(b,action);
  assert.deepEqual(lifted,projected);
  target.reset(a,a);assert.deepEqual(m.predict(a,action),target.step(action).after);
 }
});
test('negative control: correspondence is necessary; same labels alone do not align physics',()=>{
 const source=learnSource(11).atlas,target=new SpeechWorld(53),m=naiveUnalignedModel(source);let disagreements=0;
 for(const action of UTTERANCES){const s=TEST_WORDS.slice(0,7);target.reset(s,s);
  if(!same(m.predict(s,action),target.step(action).after))disagreements++;
 }
 assert.ok(disagreements>=2);
});
test('no target solution paths or overlap with source vocabulary; all held-out predictions verified',()=>{
 assert.equal(TRAIN_WORDS.some(w=>TEST_WORDS.includes(w)),false);
 const r=evaluateTransfer({sourceSeed:11,targetSeeds:[29,53,97],tasksPerWorld:6,n:7,hops:8});
 assert.equal(r.summary.heldoutTasks,18);assert.equal(r.summary.solved,18);
 assert.equal(r.summary.exactPredictions,18);assert.equal(r.summary.probes,18);assert.equal(r.summary.probesMatched,18);
 assert.equal(r.summary.targetSourceTokenOverlap,false);
 assert.ok(r.summary.naiveUnalignedProbesMatched<r.summary.probesMatched);
 assert.equal(r.summary.directOneShotPriorProbesMatched,18,'fair prior baseline also solves this easy restricted domain');
 assert.equal(r.design.solutionDemonstrations,0);
 assert.ok(r.rows.every(x=>x.predictedBeforeAction));
});

test('fair control: a fixed grammar can infer target rules directly from the SAME six interventions',()=>{
 const w=new SpeechWorld(31),m=oneShotTargetPrior(w);
 for(const u of UTTERANCES){const tokens=TEST_WORDS.slice(0,7);w.reset(tokens,tokens);
   assert.deepEqual(m.predict(tokens,u),w.step(u).after);}
});
