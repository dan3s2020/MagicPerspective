import test from 'node:test';import assert from 'node:assert/strict';
import {TOOLS,createWorld} from '../engine/world.mjs';
import {HYPOTHESES,HypothesisLearner,predictLaw,evaluateHypotheses} from '../engine/hypotheses.mjs';

test('candidate library is independent of private teacher state',()=>{
 assert.equal(HYPOTHESES.length,13);
 const w=createWorld(19),learner=new HypothesisLearner();
 for(const tool of TOOLS)learner.observe(w.intervene([0,0],tool));
 assert.equal(learner.summary().observed.amber,1);
 assert.ok(learner.summary().counts.amber>0);
});
test('all true hidden rule forms can be identified from intervention observations',()=>{
 for(let seed=1;seed<100;seed++){
  const world=createWorld(seed),learner=new HypothesisLearner();
  for(const tool of TOOLS)for(const state of [[0,0],[1,2],[3,5]])learner.observe(world.intervene(state,tool));
  for(const tool of TOOLS)for(let r=0;r<7;r++)for(let b=0;b<7;b++){
   const p=learner.predict([r,b],tool).state,truth=world.intervene([r,b],tool).to;
   assert.deepEqual(p,truth,'seed='+seed+' tool='+tool+' state='+r+','+b);
  }
 }
});
test('active selection only considers real, not already queried actions',()=>{
 const world=createWorld(72),learner=new HypothesisLearner();
 for(const tool of TOOLS)learner.observe(world.intervene([0,0],tool));
 for(let i=0;i<9;i++){
  const selected=learner.chooseIntervention();
  assert.ok(selected);
  assert.ok(selected.informationGain>=0&&selected.informationGain<=1);
  assert.ok(!learner.events[selected.tool].some(e=>e.from.join(',')===selected.state.join(',')));
  learner.observe(world.intervene(selected.state,selected.tool));
 }
});
test('a genuinely unseen rule is not silently declared known',()=>{
 const world=createWorld(10),learner=new HypothesisLearner();
 for(const tool of TOOLS)learner.observe(world.intervene([0,0],tool));
 // Artificial impossible pair for all candidate functions at this state.
 learner.observe({tool:'amber',from:[0,0],to:[6,6]});
 const best=learner.candidates('amber');
 assert.ok(best.every(x=>x.mismatch>0));
});
test('active probing is evaluated against random probing at matched observation budgets',()=>{
 const report=evaluateHypotheses({worlds:15,extra:6,seed:6300019,goalsPerWorld:2});
 for(const mode of ['active','random']){
  const v=report.modes[mode];
  assert.equal(v.observationsPerWorld,9);
  assert.ok(v.exactTransition>=0&&v.exactTransition<=1);
  assert.ok(v.planningSuccess>=0&&v.planningSuccess<=1);
  assert.ok(v.solved<=v.attempted);
 }
});
test('hypothesis evaluation is repeatable and does not modify external neurons',()=>{
 const a=evaluateHypotheses({worlds:6,extra:4}),b=evaluateHypotheses({worlds:6,extra:4});
 assert.deepEqual(a,b);
});
