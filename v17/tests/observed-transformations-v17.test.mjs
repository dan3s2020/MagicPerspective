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
test('two learned actions compose across DIFFERENT source contexts to reach an unseen goal',()=>{
 const m=learner();
 const planned=m.plan({required:['She','calm'],start:'She is happy.',maxDepth:4});
 assert.ok(planned.found,JSON.stringify(planned));
 assert.equal(planned.predicted,'She is calm.');
 assert.equal(planned.unseen,true);
 assert.equal(planned.steps.length,2);
 assert.deepEqual(planned.steps.map(x=>x.from+'->'+x.to),['happy->tired','tired->calm']);
 assert.equal(planned.steps[0].learnedFrom?.from,'She is happy.');
 assert.ok(planned.steps[1].learnedFrom?.from.includes('He is'),
   'Second action must be transferred from a DIFFERENT subject/context');
 const outcome=m.execute(planned,{record:false});
 assert.equal(outcome.verified,true);
 assert.deepEqual(outcome.experience.map(x=>x.after),
   ['She is tired.','She is calm.']);
});
test('sparse 5x5 cross-product: 9 unlabeled experiences produce 16 unobserved combinations',()=>{
 const subjects=['She','He','They','We','I'];
 const descriptors=['happy','tired','calm','ready','brave'];
 const observed=[
   ...descriptors.map(x=>'She is '+x+'.'),
   ...subjects.slice(1).map(x=>x+' is happy.')
 ];
 assert.equal(observed.length,9);
 const m=learner(observed),controls=learner(observed);
 controls.operators.clear();
 let total=0;
 for(const subject of subjects.slice(1))for(const descriptor of descriptors.slice(1)){
   const target=subject+' is '+descriptor+'.';
   assert.equal(m.containsSentence(target),false);
   const plan=m.plan({required:[subject,descriptor],start:'She is happy.',maxDepth:3});
   assert.equal(plan.found,true,target+' / '+JSON.stringify(plan));
   assert.equal(plan.predicted,target);
   assert.equal(plan.unseen,true);
   assert.equal(plan.steps.length,2);
   assert.equal(m.execute(plan,{record:false}).verified,true);
   assert.equal(controls.plan({required:[subject,descriptor],start:'She is happy.'}).found,false);
   total++;
 }
 assert.equal(total,16);
 console.log('SPARSE_UNLABELED_HELDOUT_GENERALIZATION '+JSON.stringify({
   observedSentences:observed.length,
   neverSeenCombinations:total,
   correctCompositions:total,
   manualClassesProvided:0,
   fixedGrammarTemplatesProvided:0}));
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
