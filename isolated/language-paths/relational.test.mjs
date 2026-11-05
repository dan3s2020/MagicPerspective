import test from 'node:test';import assert from 'node:assert/strict';
import {FactWorld,FactEffects,exploreFacts,planFacts,executeFacts,oracleFacts,benchmarkFacts,FACT_UTTERANCES,phrase} from './relational.mjs';
import {same} from './engine.mjs';
test('learner sees only language propositions, goal, utterances and observations',()=>{const w=new FactWorld(11);const o=w.reset([0,0,0,0,0,0],[1,1,1,1,1,1]);assert.deepEqual(Object.keys(o).sort(),['facts','goal','solved','steps','utterances','values']);assert.equal(o.facts.length,6);assert.equal(o.utterances.length,7);});
test('causal effects are induced from half of the combinatorial input space',()=>{
 for(const seed of [11,29,53]){const w=new FactWorld(seed),m=new FactEffects(),obs=exploreFacts(w,m);assert.equal(obs.length,224);assert.equal(m.ready(),true);
  for(let i=0;i<64;i++)for(const u of FACT_UTTERANCES){const s=Array.from({length:6},(_,b)=>(i>>b)&1);w.reset(s,s);assert.deepEqual(m.predict(s,u),w.step(u).after,`seed=${seed} state=${i} utterance=${u}`);}
  assert.deepEqual(FactEffects.restore(m.export()).report(),m.report());
 }
});
test('relational world finds strictly descending causal paths for withheld parity states',()=>{
 const w=new FactWorld(11),m=new FactEffects();exploreFacts(w,m);
 for(let i=0;i<15;i++){const {start,goal}=w.makeChallenge(100+i*15,12),p=planFacts(start,goal,m),ex=executeFacts(w,start,goal,p);
  assert.ok(p.found);assert.ok(ex.solved);assert.ok(ex.modelMatches);assert.equal(ex.steps,oracleFacts(w,start,goal));
  assert.ok(p.steps.every(s=>s.distanceAfter===s.distanceBefore-1));}
});
test('relational heldout benchmark beats greedy and random with no path oracle during learning',()=>{
 const r=benchmarkFacts({seeds:[11,29,53],tasks:20,hops:12});assert.equal(r.summary.tested,60);
 assert.equal(r.summary.plannerSuccess,1);assert.equal(r.summary.optimalMatches,60);assert.equal(r.summary.predictionConsistency,1);
 assert.ok(r.summary.plannerSuccess>r.summary.randomSuccess);
});
