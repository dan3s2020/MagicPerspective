import test from 'node:test';
import assert from 'node:assert/strict';
import {SpeechWorld,DiscoveredEffects,explore,plan,execute,oracleDistance,trajectoryGraph,UTTERANCES,TRAIN_WORDS,TEST_WORDS,same,randomBaseline} from './engine.mjs';
import {runBenchmark} from './benchmark.mjs';
test('no overlap between training and unseen vocabulary',()=>assert.equal(TRAIN_WORDS.filter(x=>TEST_WORDS.includes(x)).length,0));
test('world observations expose states and utterances, not hidden operation IDs',()=>{
 const w=new SpeechWorld(17),s=['a','b','c','d'];const obs=w.reset(s,s);
 assert.deepEqual(Object.keys(obs).sort(),['goal','solved','steps','utterances','words']);
 const outcome=w.step(UTTERANCES[0]);assert.equal(outcome.before.join(' '),s.join(' '));
 assert.equal(outcome.after.length,s.length);
});
test('learner discovers action effects purely from before/after observations',()=>{
 for(const seed of [1,11,97]){const w=new SpeechWorld(seed),m=new DiscoveredEffects();const events=explore(w,m,{seed:seed+50,rounds:3});
  assert.equal(events.length,36);assert.equal(m.ready(),true);
  for(const u of UTTERANCES){const h=m.hypothesis(u);assert.ok(h.rule);assert.equal(h.seen,6);assert.equal(h.confidence,1);}
  const s=['x','y','z','q','r','t','v'];for(const u of UTTERANCES){w.reset(s,s);assert.deepEqual(m.predict(s,u),w.step(u).after);}
 }
});
test('learner does not reach a goal merely by reading it; it generates a valid descending action path',()=>{
 const w=new SpeechWorld(41),m=new DiscoveredEffects();explore(w,m,{seed:45});
 const {start,goal}=w.makeChallenge(89091,7,9),p=plan(start,goal,m),run=execute(w,start,goal,p);
 assert.equal(p.found,true);assert.equal(run.solved,true);assert.equal(run.modelMatches,true);
 assert.equal(p.steps.length,oracleDistance(w,start,goal));
 assert.ok(p.steps.every(s=>s.distanceAfter===s.distanceBefore-1));
 assert.ok(p.steps.every(s=>UTTERANCES.includes(s.utterance)));
 const graph=trajectoryGraph(p);assert.ok(graph.nodes.length>=p.steps.length+1);assert.equal(graph.dimensions,12);
});
test('fixed action knowledge extrapolates to unseen length and unseen tokens',()=>{
 const w=new SpeechWorld(3),m=new DiscoveredEffects();explore(w,m,{rounds:3});
 for(const n of [6,7,8]){const s=TEST_WORDS.slice(0,n);for(const u of UTTERANCES){w.reset(s,s);assert.deepEqual(m.predict(s,u),w.step(u).after);}}
 const saved=DiscoveredEffects.restore(m.export());assert.deepEqual(saved.report(),m.report());
});
test('negative control: changing the worlds action physics changes predictions',()=>{
 const a=new SpeechWorld(7),b=new SpeechWorld(8),m=new DiscoveredEffects();explore(a,m);
 const s=TEST_WORDS.slice(0,7),diff=UTTERANCES.filter(u=>{b.reset(s,s);return !same(m.predict(s,u),b.step(u).after)});
 assert.ok(diff.length>=3,'Should detect a world with changed utterance effects');
});
test('cross-seed heldout bench outperforms uninformed random actions, without an oracle inside the planner',()=>{
 const r=runBenchmark({seeds:[11,29,53],tasks:6,n:7,rounds:3,oracleSamples:2});
 assert.equal(r.summary.tested,18);assert.ok(r.summary.plannerSuccess>=.94,r.summary.plannerSuccess);
 assert.ok(r.summary.plannerSuccess>r.summary.randomSuccess+.45);
 assert.equal(r.summary.optimalMatches,r.summary.oracleSampleCount);
 assert.equal(r.summary.predictionConsistency,1);
 assert.equal(r.failures.length,0);
});
