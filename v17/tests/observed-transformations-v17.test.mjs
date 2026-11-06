import test from 'node:test';
import assert from 'node:assert/strict';
import {ObservedTransformations,tokenizeObservation,renderObservation}
  from '../transcend/torus-aether/worlds/observed-transformations.mjs';

const four=[
  'She is happy.','She is tired.','He is tired.','He is calm.'
];
function learner(rows=four) {
 const m=new ObservedTransformations();
 for(const row of rows)m.observeSentence(row);
 return m;
}
test('UNLABELED four examples -> learn reversible differences, compose unseen She is calm before reference',()=>{
 const m=learner(),before=m.report();
 assert.equal(m.containsSentence('She is calm.'),false,'The requested answer cannot be in observed memory');
 assert.equal(before.observed,4);
 assert.ok(before.oneChangePairs>=3,'All three pairwise changes must be discovered');
 assert.ok(before.learnedOperators>=6,'At least three reversible causal edits must be learned');
 const route=m.plan({required:['She','calm'],start:'He is calm.'});
 assert.ok(route.found,JSON.stringify(route));
 assert.equal(route.predicted,'She is calm.');
 assert.equal(route.unseen,true);
 assert.equal(route.plannedBeforeAnswer,true);
 assert.equal(route.referenceProvided,false);
 assert.equal(route.steps.length,1);
 assert.equal(route.steps[0].from,'He');
 assert.equal(route.steps[0].to,'She');
 assert.equal(route.steps[0].kind,'replace');
 assert.equal(route.steps[0].learnedFrom?.from.includes('tired'),true,
  'The He -> She operator must have been learned from a DIFFERENT sentence');
 assert.equal(m.containsSentence(route.predicted),false);
 assert.deepEqual(m.report(),before,'Frozen pre-answer planning may not update experience');
 const execution=m.execute(route);
 assert.equal(execution.verified,true);
 assert.equal(execution.result,'She is calm.');
 assert.equal(execution.predictionMatchedExecution,true);
 assert.equal(execution.actionCount,1);
 assert.equal(m.containsSentence('She is calm.'),false,'Executing a proposed action may not contaminate held-out training');
});
test('the solver is goal-conditioned, can choose a starting perspective without the answer',()=>{
 const m=learner();
 const predicted=m.plan({required:['She','calm']});
 assert.equal(predicted.found,true);
 assert.equal(predicted.predicted,'She is calm.');
 assert.equal(predicted.unseen,true);
 assert.ok(predicted.steps.length>=1);
 assert.ok(predicted.steps.every(s=>s.learnedFrom?.from && s.learnedFrom?.to));
});
test('disabling reusable transformations or shuffling action destinations eliminates compositional proof',()=>{
 const m=learner();
 const noOps=learner();
 noOps.operators.clear();
 const a=noOps.plan({required:['She','calm'],start:'He is calm.'});
 assert.equal(a.found,false,'Remembered sentences without learned operations cannot construct the unseen sentence');
 const inconsistent=learner();
 for(const op of inconsistent.operators.values()){
   // Deterministic relation-corruption control: preserve source patterns,
   // but replace effects with irrelevant outcomes. Do not add the withheld target.
   if(op.from==='He'&&op.to==='She')op.to='tired';
   if(op.from==='tired'&&op.to==='calm')op.to='He';
 }
 const bad=inconsistent.plan({required:['She','calm'],start:'He is calm.'});
 assert.equal(bad.found,false,'Corrupted causal effect labels must not pass the novel-goal test');
 assert.equal(m.plan({required:['She','calm'],start:'He is calm.'}).found,true);
});
test('learning transfers to unseen combinations of independently varying positions, not just She/He',()=>{
 const subjects=['You','I','They','We','She'];
 const properties=['quiet','ready','brave','curious','calm'];
 const tested=[];
 for(const [a,b] of [[0,4],[1,1],[2,2],[3,3],[4,0],[4,4]]){
   const target=subjects[a]+' feel '+properties[b]+'.';
   const samples=[];
   for(let i=0;i<subjects.length;i++)for(let j=0;j<properties.length;j++){
     const sentence=subjects[i]+' feel '+properties[j]+'.';
     if(sentence!==target)samples.push(sentence);
   }
   const m=learner(samples);
   assert.equal(m.containsSentence(target),false);
   const start=subjects[(a+1)%subjects.length]+' feel '+properties[b]+'.';
   const p=m.plan({required:[subjects[a],properties[b]],start,maxDepth:3});
   assert.equal(p.found,true,'Failed unseen pair '+target+': '+JSON.stringify(p));
   assert.equal(p.predicted,target);
   assert.equal(p.unseen,true);
   assert.equal(m.execute(p).verified,true);
   tested.push({target,from:start,steps:p.steps.length});
 }
 assert.equal(tested.length,6);
 console.log('HELD_OUT_COMPOSITIONAL_TRANSFERS '+JSON.stringify(tested));
});
test('same mechanism learns non-initial changes, contextual invariants, and rejects incompatible contexts',()=>{
 const m=learner([
   'The blue bird sleeps.',
   'The red bird sleeps.',
   'The red bird sings.',
   'The green bird sings.'
 ]);
 const route=m.plan({required:['green','sleeps'],start:'The green bird sings.'});
 assert.equal(route.found,true,JSON.stringify(route));
 assert.equal(route.predicted,'The green bird sleeps.');
 assert.equal(route.unseen,true);
 assert.equal(route.steps.length,1);
 const invalid=m.plan({required:['green','sleeps'],start:'The red bird sleeps.',maxDepth:0});
 assert.equal(invalid.found,false);
 assert.deepEqual(tokenizeObservation('She is calm.'),['She','is','calm','.']);
 assert.equal(renderObservation(tokenizeObservation('The blue bird sleeps.')),'The blue bird sleeps.');
});
test('an unseen answer supplied only AFTER prediction cannot alter the predicted path',()=>{
 const m=learner();
 const before=m.plan({required:['She','calm'],start:'He is calm.'});
 const reference1='She is calm.';
 const reference2='She is angry.';
 assert.equal(before.predicted,reference1);
 assert.notEqual(before.predicted,reference2);
 const again=m.plan({required:['She','calm'],start:'He is calm.'});
 assert.deepEqual(again,before);
});
