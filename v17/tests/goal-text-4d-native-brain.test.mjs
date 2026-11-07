import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {ACTIONS,TextWorldNavigator,move,SOURCES,dec}
 from '../transcend/torus-aether/worlds/goal-text-navigator.mjs';
import {physics,perform,train,world,benchmark}
 from '../research/text-hypermaze/grounded-4d-benchmark.mjs';

const observations=[17,29,47].map(seed=>benchmark({seed,count:64}));
const sum=key=>observations.reduce((n,r)=>n+r[key],0);

test('TRUE trained action effects + learned text predicate, heldout wording never observed in training',()=>{
 const agent=train(17);
 assert.equal(agent.transitions,640);
 assert.equal(agent.claims,8000);
 assert.equal(agent.reliabilitySeen,8000);
 assert.ok(agent.trust('ledger')>agent.trust('dream'));
 assert.ok(agent.trust('dream')>agent.trust('rumor'));
 for(let i=0;i<ACTIONS.length;i++) {
  assert.deepEqual(agent.effect(ACTIONS[i]),physics[i].map(d=>(d+4)%4));
 }
 const w=world(938),fingerprint=agent.frozenFingerprint();
 const p=agent.predictShape(w.document,w.start,w.goal);
 assert.equal(w.document.length>100000,true);
 assert.equal(p.observations,768);
 assert.equal(p.preAction,true);
 assert.equal(p.shape.length,w.oracle.length);
 assert.equal(agent.execute(w,p,{physics:perform}).solved,true);
 assert.equal(agent.frozenFingerprint(),fingerprint);
});
test('learned 4D axes, not just labels: do 192 unseen long-document first routes work?',()=>{
 assert.equal(sum('correctInitial'),192);
 assert.equal(sum('optimal'),192);
 assert.equal(sum('rank2'),0);
 assert.ok(sum('documents')>20_000_000);
 assert.equal(sum('facts'),192*256*3);
 assert.ok(observations.every(x=>x.learned===8&&x.frozen));
 console.log('NATIVE_4D_TEXT_GROUNDING',JSON.stringify({
  unseen:192,firstOptimal:sum('optimal'),ablatedAxes:sum('rank2'),
  documentsChars:sum('documents')}));
});
test('unpredictable environmental noise requires genuine feedback, not clairvoyance',()=>{
 assert.equal(sum('slippedFixed'),35);
 assert.ok(sum('slippedRepair')>=190&&sum('slippedRepair')<=192,
  'Measured 25% stochastic action failures must be explicitly reported, not assumed perfect');
 console.log('ACTUAL_NATIVE_CHANCE_FEEDBACK',JSON.stringify({fixed:sum('slippedFixed'),repaired:sum('slippedRepair')}));
 assert.ok(sum('slippedRepair')>sum('slippedFixed'));
});
test('prior knowledge fails when source reliability or unknown vocabulary changes',()=>{
 assert.equal(sum('distributionShift'),65);
 assert.equal(sum('outOfVocabulary'),0);
});
test('original V17 Brain trains this SAME model with lived observations; original CUDA and maze models remain',()=>{
 const brain=new Brain({rules:'winner',seed:19});
 const R=world(201),frozenBefore=brain.chars;
 const all=train(19,{agent:brain.textGoal});
 assert.equal(all,brain.textGoal);
 assert.equal(brain.textGoal.transitions,640);
 const prediction=brain.predictTextWorldShape(R.document,R.start,R.goal,{seed:19});
 assert.equal(prediction.preAction,true);
 assert.equal(prediction.frozen,true);
 assert.ok(prediction.actionsLearned>0&&prediction.lexicalExamples>0);
 assert.equal(prediction.shape.length,R.oracle.length);
 assert.equal(brain.textGoal.execute(R,prediction,{physics:perform}).solved,true);
 assert.equal(brain.chars,frozenBefore,'Native original text counters must not be faked');
 assert.ok(brain.align===undefined||typeof brain.align.write==='function');
 assert.equal(typeof brain.learnTextGPU,'function');
 assert.equal(typeof brain.testMazes,'function');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'magic-original-native-text4d-'));
 try {
  const checkpoint=path.join(root,'brain.v8');
  const before=brain.textGoal.frozenFingerprint();
  brain.save(checkpoint);
  const restored=Brain.load(checkpoint);
  assert.equal(restored.textGoal.frozenFingerprint(),before);
  assert.equal(typeof restored.textGoal.predictShape,'function');
  assert.equal(typeof restored.textGoal.predicates.predict,'function');
  assert.deepEqual(restored.predictTextWorldShape(R.document,R.start,R.goal).initialActions,
   brain.predictTextWorldShape(R.document,R.start,R.goal).initialActions);
  assert.equal(restored.textGoal.execute(R,restored.predictTextWorldShape(R.document,R.start,R.goal),
   {physics:perform}).solved,true);
  console.log('V17_NATIVE_BRAIN_CHECKPOINT_4D',JSON.stringify({
   nativeBytes:fs.statSync(checkpoint).size,trainedActions:restored.textGoal.transitions,
   trainedClaims:restored.textGoal.claims,heldoutGoalActions:prediction.initialActions,
   preservedExistingTextGPU:typeof restored.learnTextGPU==='function'}));
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('learned map and route do NOT know hidden world physics: pure model requests external world to execute',()=>{
 const agent=train(29),w=world(1013),plan=agent.predictShape(w.document,w.start,w.goal);
 assert.throws(()=>agent.execute(w,plan),/Physical world step function required/);
 const persisted=TextWorldNavigator.restore(agent.snapshot());
 assert.equal(persisted.frozenFingerprint(),agent.frozenFingerprint());
 assert.deepEqual(persisted.predictShape(w.document,w.start,w.goal).initialActions,plan.initialActions);
});
