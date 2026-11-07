import test from 'node:test';
import assert from 'node:assert/strict';
import {LearnedCognitiveMap} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {observeInstructionTrajectory,inferObservedInstructionGoal,inspectInstructionGoals}
 from '../transcend/torus-aether/worlds/observed-instruction-goals.mjs';
import {answerFromObservedInstructionPath,firstTryCharacterComparison}
 from '../transcend/torus-aether/worlds/path-answer-writer.mjs';

const pairs=[
 ['tea','coffee','Brew the refreshment'],
 ['coffee','water','Dilute the beverage'],
 ['red','blue','Recolor the signal'],
 ['small','large','Enlarge the object'],
 ['north','south','Invert the direction'],
 ['rain','snow','Change the weather'],
 ['cat','dog','Relabel the animal'],
 ['silver','gold','Upgrade the metal'],
 ['old','new','Renew the item'],
 ['quiet','loud','Amplify the sound'],
 ['slow','fast','Accelerate the motion'],
 ['seed','flower','Grow the plant']
];
const seeds=[31,47,73],contexts=['Mira','Ivo','Zara'];
const stages=[0,6,12,18,24];
const schedule=[...pairs.map((_,i)=>[i,0]),...pairs.map((_,i)=>[i,1])];
function experience(model,index,c){
 const [from,to,intent]=pairs[index];
 const prefix=contexts[c]+'_'+index+' '+['buys','finds'][c]+' ';
 const before=prefix+from+'.',after=prefix+to+'.';
 model.observeWorld(before+'\n'+after,{id:'actual-world-'+index+'-'+c});
 const witness=observeInstructionTrajectory(model,{instruction:intent,
  states:[before,after],episodeId:'actual-world-'+index+'-'+c,
  executedTransitionsObserved:true});
 assert.equal(witness.ok,true);
}
function question(index,seed,number){
 const [from,to,intent]=pairs[index];
 const head='Case_'+seed+'_'+index+'_'+number+' keeps ';
 return {source:head+from+'.',reference:head+to+'.',instruction:intent};
}
test('V36 increasing actual lived episodes drives a reproducible frozen path-only first-shot learning curve WITHOUT a target word in any query',()=>{
 const summary=[];
 for(const seed of seeds){
  const model=new LearnedCognitiveMap({maxExamples:256,maxRules:30000});
  const cases=pairs.flatMap((_,index)=>
   Array.from({length:10},(_,i)=>question(index,seed,i)));
  let trained=0;
  for(const stage of stages){
   while(trained<stage){
    const [index,ctx]=schedule[trained++];
    experience(model,index,ctx);
   }
   const before=JSON.stringify(model.export());
   let correct=0,found=0,chars=0;
   const failures=[];
   for(const {source,reference,instruction} of cases){
    assert.equal(instruction.includes(reference),false);
    assert.equal(source.includes(reference),false);
    const out=answerFromObservedInstructionPath(model,{instruction,source},{
     maxNodes:384,maxDepth:6,maxTokens:512});
    if(out.found)found++;
    if(out.answer===reference)correct++;
    const scored=firstTryCharacterComparison(out.answer,reference);
    if(scored.answerExact!== (out.answer===reference))throw Error('Inconsistent frozen scoring');
    chars+=scored.correctCharacters;
    if(out.answer!==reference)failures.push({instruction,reason:out.reason,
     firstWrong:scored.firstMismatch});
    if(out.found){
     assert.equal(out.evidence.destinationTokenAbsentFromInstruction,true);
     assert.equal(out.evidence.independentContexts,2);
     assert.equal(out.source,'Discoverer.shape');
     assert.equal(out.actualWriter,'ORIGINAL_LEARNED_PATH_TERMINAL_STATE_NOT_NEXT_CHARACTER_MODEL');
     assert.equal(out.path.length,1);
     assert.ok(out.path[0].crossWorld,'Must actually use an original learned cross-world rule');
    }
   }
   assert.equal(JSON.stringify(model.export()),before,
    'Frozen evaluation must NEVER update rule memory or leak heldout reference');
   summary.push({seed,stage,correct,total:cases.length,found,
    firstShotExact:correct/cases.length,correctCodepoints:chars,
    failures:failures.slice(0,6)});
   console.log('V36_NO_TARGET_IN_QUESTION_LEARNING_CURVE',
    JSON.stringify({seed,stage,correct,total:cases.length,found,exact:correct/cases.length}));
  }
  const after=LearnedCognitiveMap.restore(model.export());
  const ex=question(0,seed,99);
  assert.equal(answerFromObservedInstructionPath(after,ex).answer,ex.reference);
  assert.equal(after.instructionGoalEpisodes,24);
  const unknown=answerFromObservedInstructionPath(after,{
   instruction:'Invent a new chemical reaction',source:'Unknown_case keeps tea.'});
  assert.equal(unknown.answer,null);
  assert.equal(unknown.reason,'UNSEEN_INSTRUCTION_INTENT');
  const noEffect=answerFromObservedInstructionPath(after,{
   instruction:pairs[0][2],source:'Nobody knows the kiwi.'});
  assert.equal(noEffect.answer,null);
  assert.equal(noEffect.reason,'NO_APPLICABLE_LEARNED_INTENT_EFFECTS');
 }
 const curve=stages.map(stage=>{
  const items=summary.filter(x=>x.stage===stage);
  return {stage,correct:items.reduce((s,x)=>s+x.correct,0),
   total:items.reduce((s,x)=>s+x.total,0),exactRate:items.reduce((s,x)=>s+x.correct,0)/
    items.reduce((s,x)=>s+x.total,0)};
 });
 const expected=[0,0,0,.5,1];
 for(let i=0;i<curve.length;i++)assert.equal(curve[i].exactRate,expected[i]);
 console.log('V36_FROZEN_NO_TARGET_GOAL_INFERENCE_FINAL',JSON.stringify({
  curve,goalInHeldoutQuestion:false,wholeAnswersFromOriginalObservedActions:true,
  unknownSemanticQuestionsStillUnsupported:true}));
});
test('The SAME unseen source has different correct first-shot answers based ONLY on the independently observed task instruction, with ablations',()=>{
 const model=new LearnedCognitiveMap();
 for(const [ctx,verb] of [['Mira','keeps'],['Ivo','finds']]){
  for(const [intent,to] of [['Brew the refreshment','coffee'],['Dilute the beverage','water']]){
   const before=ctx+' '+verb+' tea.',after=ctx+' '+verb+' '+to+'.';
   model.observeWorld(before+'\n'+after,{id:ctx+'-'+intent});
   observeInstructionTrajectory(model,{instruction:intent,
    states:[before,after],episodeId:ctx+'-'+intent,
    executedTransitionsObserved:true});
  }
 }
 const s='A visitor carries tea.';
 const brew=answerFromObservedInstructionPath(model,
  {instruction:'Brew the refreshment',source:s});
 const dilute=answerFromObservedInstructionPath(model,
  {instruction:'Dilute the beverage',source:s});
 assert.equal(brew.answer,'A visitor carries coffee.');
 assert.equal(dilute.answer,'A visitor carries water.');
 assert.notEqual(brew.answer,dilute.answer);
 assert.ok(!'Brew the refreshment'.includes('coffee'));
 assert.ok(!'Dilute the beverage'.includes('water'));
 const checkpoint=LearnedCognitiveMap.restore(model.export());
 assert.equal(answerFromObservedInstructionPath(checkpoint,
  {instruction:'Dilute the beverage',source:s}).answer,dilute.answer);
 const blocked=LearnedCognitiveMap.restore(model.export());
 for(const [k,r] of [...blocked.rules])
  if(r.from==='tea'&&r.to==='coffee')blocked.rules.delete(k);
 assert.equal(answerFromObservedInstructionPath(blocked,
  {instruction:'Brew the refreshment',source:s}).found,false,
  'Deleting actual learned effect must remove path even though question memory retains desired goal');
 const contradiction=LearnedCognitiveMap.restore(model.export());
 observeInstructionTrajectory(contradiction,{instruction:'Brew the refreshment',
  states:['Zara opens tea.','Zara opens water.'],episodeId:'contradiction-one',
  executedTransitionsObserved:true});
 assert.equal(inferObservedInstructionGoal(contradiction,
  {instruction:'Brew the refreshment',source:s}).reason,'CONFLICTING_OBSERVED_INTENT_OUTCOMES');
 console.log('V36_SAME_INPUT_DIFFERENT_OBSERVED_GOALS',JSON.stringify({
  input:s,brew:brew.answer,dilute:dilute.answer,
  sameOriginalBrain:true,ruleAblationRemovedRoute:true,
  contradictoryObservationsProduceAbstention:true}));
});
test('Two independent observed three-state trajectories allow an unseen TWO-action full answer with NO direct answer demonstration',()=>{
 const m=new LearnedCognitiveMap();
 for(const [name,verb,from,to] of [
  ['Mira','buys','tea','coffee'],['Ivo','likes','tea','coffee'],
  ['Zara','finds','coffee','water'],['Leo','keeps','coffee','water']
 ]){
  m.observeWorld(name+' '+verb+' '+from+'.\n'+name+' '+verb+' '+to+'.',
   {id:'learned-action-'+name+'-'+from});
 }
 const instruction='Bring the drink to the final stage';
 observeInstructionTrajectory(m,{instruction,
  states:['Alice carries tea.','Alice carries coffee.','Alice carries water.'],
  episodeId:'two-steps-alice',executedTransitionsObserved:true});
 const start='Visitor keeps tea.',ref='Visitor keeps water.';
 const first=answerFromObservedInstructionPath(m,{instruction,source:start});
 assert.equal(first.found,false);
 assert.equal(first.reason,'INSUFFICIENT_INDEPENDENT_CONTEXTS');
 observeInstructionTrajectory(m,{instruction,
  states:['Bob stores tea.','Bob stores coffee.','Bob stores water.'],
  episodeId:'two-steps-bob',executedTransitionsObserved:true});
 assert.equal(m.examples.has('Visitor\u001fkeeps\u001ftea\u001f.'),false);
 const answer=answerFromObservedInstructionPath(m,{instruction,source:start},
  {maxDepth:8,maxNodes:384,includeAtlas:true});
 assert.equal(answer.answer,ref,JSON.stringify(answer).slice(0,950));
 assert.equal(answer.path.length,2);
 assert.ok(answer.path.some(h=>h.crossWorld),
  'At least one original observed action must transfer from another context');
 assert.ok(answer.path.every(h=>h.support>=1||h.evidence?.length),
  'Every original action must have learned transition evidence');
 // The second hop may legitimately use an ORIGINAL context-matching local
 // rule rather than a projected cross-world rule. Rejecting it would
 // penalize stronger grounded evidence and falsify the true path type.
 assert.deepEqual(answer.evidence.supportedSequence,
  [{from:'tea',to:'coffee'},{from:'coffee',to:'water'}]);
 assert.equal(answer.firstShapeFrozenBeforeAnswer,true);
 assert.equal(answer.referenceAnswerProvided,false);
 assert.ok(answer.fullAtlas.states.length>=3);
 assert.equal(LearnedCognitiveMap.restore(m.export()).instructionGoalMemory.size,1);
 console.log('V36_TWO_HOP_INFERRED_GOAL',JSON.stringify({
  independentTrainingEpisodes:2,firstAttemptBeforeEvidence:first.reason,
  pathLength:answer.path.length,foundAfterMoreExperience:answer.found,
  goalNeverStatedInQuestion:true,expected:ref,actual:answer.answer}));
});
test('Long unseen 1,800-token inputs, genuine Unicode comparison, incomplete/unknown task abstentions and data integrity',()=>{
 const m=new LearnedCognitiveMap();
 experience(m,0,0);experience(m,0,1);
 const original=JSON.stringify(m.export());
 let correct=0,characters=0;
 const lengths=[128,384,512,1024,1800,1800,1800,1800];
 for(let i=0;i<lengths.length;i++){
  const n=lengths[i],loc=(i*107+11)%n;
  const items=Array.from({length:n},(_,j)=>'cuvânt_'+i+'_'+j);
  items[loc]='tea';
  const source=items.join(' ')+'.',reference=items.map(x=>x==='tea'?'coffee':x).join(' ')+'.';
  const out=answerFromObservedInstructionPath(m,{
   instruction:'Brew the refreshment',source
  },{maxTokens:2048,maxDepth:5,maxNodes:128});
  assert.equal(out.answer,reference,'Full-length output came from original replay, NOT saved reference');
  const score=firstTryCharacterComparison(out.answer,reference);
  assert.equal(score.answerExact,true);characters+=score.comparedCharacters;correct++;
 }
 assert.equal(JSON.stringify(m.export()),original);
 const wrong=answerFromObservedInstructionPath(m,{instruction:'Brew the refreshment',
  source:'tea tea'});
 assert.equal(wrong.reason,'AMBIGUOUS_SOURCE_TOKEN_POSITIONS');
 const forbidden=answerFromObservedInstructionPath(m,{instruction:'Solve calculus',
  source:'Cât este integrala?'});
 assert.equal(forbidden.answer,null);
 assert.equal(forbidden.reason,'UNSEEN_INSTRUCTION_INTENT');
 assert.throws(()=>observeInstructionTrajectory(m,{
  instruction:'Make something different',
  states:['a b c.','a z k.'],episodeId:'synthetic-invalid',
  executedTransitionsObserved:true}),/exactly one token/);
 console.log('V36_LONG_NO_TARGET_IN_QUESTION',JSON.stringify({
  exact:correct,total:lengths.length,comparedCharacters:characters,
  maxTokens:1800,originalMemoryUnchangedByEvaluation:true,
  unlearnedSemanticsNeverInvented:true}));
});


test('Compositional unseen instruction wording: prior phrasing-only fails, two supported phrase surfaces unlock NEW arrangements; ambiguity, negation and unknown synonyms are rejected',()=>{
 const m=new LearnedCognitiveMap();
 const effects=[
  {to:'coffee',phrases:['Brew this drink','Please brew the refreshment']},
  {to:'water',phrases:['Dilute this drink','Please dilute the refreshment']}
 ];
 const contexts=['Mira buys ','Ivo finds '];
 function live(variant){
  for(const effect of effects)for(let j=0;j<contexts.length;j++){
   const before=contexts[j]+'tea.',after=contexts[j]+effect.to+'.';
   m.observeWorld(before+'\n'+after,
    {id:'training-'+variant+'-'+effect.to+'-'+j});
   const witnessed=observeInstructionTrajectory(m,{
    instruction:effect.phrases[variant],states:[before,after],
    episodeId:'training-'+variant+'-'+effect.to+'-'+j,
    executedTransitionsObserved:true});
   assert.equal(witnessed.ok,true);
  }
 }
 const corpusSnapshot=()=>JSON.stringify(m.export());
 const source='Never_seen keeps tea.';
 const targetFree={
  brew:'Brew the drink',
  dilute:'Dilute the refreshment'
 };
 const ask=(instruction,sourceText=source)=>answerFromObservedInstructionPath(m,{
  instruction,source:sourceText},{allowComposedInstructions:true});
 live(0);
 const firstBrew=ask(targetFree.brew);
 assert.equal(firstBrew.found,false);
 assert.equal(firstBrew.reason,'NO_TWO_WITNESSED_INSTRUCTION_PHRASINGS');
 live(1);
 const before=corpusSnapshot();
 const samples=[];
 for(const seed of [31,47,73]){
  for(let i=0;i<20;i++){
   const s='Unseen_'+seed+'_'+i+' keeps tea.';
   samples.push({source:s,instruction:targetFree.brew,
    reference:'Unseen_'+seed+'_'+i+' keeps coffee.'});
   samples.push({source:s,instruction:targetFree.dilute,
    reference:'Unseen_'+seed+'_'+i+' keeps water.'});
  }
 }
 let full=0;
 for(const sample of samples){
  const p=ask(sample.instruction,sample.source);
  assert.equal(p.answer,sample.reference,JSON.stringify(p).slice(0,1000));
  assert.ok(p.evidence.unobservedInstructionPhrase===true);
  assert.equal(p.evidence.recognitionMechanism,
   'COMPOSITION_OF_PREVIOUSLY_WITNESSED_INSTRUCTION_WORDS');
  assert.equal(p.referenceAnswerProvided,false);
  assert.ok(p.path.length===1&&p.path[0].crossWorld);
  full++;
 }
 assert.equal(full,120);
 assert.equal(corpusSnapshot(),before,'Observed memory MUST remain frozen across withheld instructions');
 const a=ask('Brew dilute the drink');
 assert.equal(a.found,false);assert.equal(a.reason,'AMBIGUOUS_COMPOSED_GOAL_AXES');
 const negated=ask('Do not brew this drink');
 assert.equal(negated.found,false);
 assert.equal(negated.reason,'UNKNOWN_INSTRUCTION_WORDS');
 const notLearned=ask('Please ferment this drink');
 assert.equal(notLearned.found,false);
 assert.equal(notLearned.reason,'UNKNOWN_INSTRUCTION_WORDS');
 const unknownContent=ask('Brew a drink');
 assert.equal(unknownContent.found,false);
 assert.equal(unknownContent.reason,'UNKNOWN_INSTRUCTION_WORDS');
 const restored=LearnedCognitiveMap.restore(m.export());
 const afterRestore=answerFromObservedInstructionPath(restored,{
  instruction:targetFree.brew,source},{allowComposedInstructions:true});
 assert.equal(afterRestore.answer,'Never_seen keeps coffee.');
 // Original words at ALL training surfaces remain in evidence; the exact
 // unseen phrasing is never stored in memory as a teacher example.
 assert.equal([...m.instructionGoalMemory.keys()].includes('brew the drink'),false);
 // Learned motor remains causally necessary despite identifying the goal.
 const ablated=LearnedCognitiveMap.restore(m.export());
 for(const [key,rule] of [...ablated.rules])
  if(rule.from==='tea'&&rule.to==='coffee')ablated.rules.delete(key);
 assert.equal(answerFromObservedInstructionPath(ablated,{
  instruction:targetFree.brew,source},{allowComposedInstructions:true}).found,false);
 console.log('V36_COMPOSED_UNSEEN_INSTRUCTION_WORDS',JSON.stringify({
  beforeTwoPhrasingsFound:firstBrew.found,
  observedTaskPhrasings:4,observedEpisodeWitnesses:8,
  heldoutUnseenQuestionWordingExact:full,total:samples.length,
  distinctGoalsOnSameSource:2,
  removedOriginalActionBreaksAbility:true,
  unknownContentAndNegationCorrectlyAbstain:true,
  unchangedOriginalDiscoverer:true,
  commonWordsOnlyNoGeneralSynonymUnderstanding:true
 }));
});
