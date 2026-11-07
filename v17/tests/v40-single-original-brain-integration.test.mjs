// Original V34 single persistent Brain.v8, with preserved native Discoverer.
// V36 goal inference and V39 human-text evidence weights are trained/evaluated
// in the SAME Brain; no new master LLM and no invented semantic physics.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {KIND,playExercise} from '../transcend/torus-aether/worlds/exercise.mjs';
import {makeMaze,seedOf,SEEDS} from '../transcend/torus-aether/worlds/labyrinth.mjs';
import {V40OriginalBrainEvidence} from '../research/text-hypermaze/v40-original-brain-evidence.mjs';

function nativeBrain(){
 const b=new Brain({rules:{depth:1,off:['R2','R4'],budEvery:100,
   empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<60;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,501+i*23),[7,9,11][i%3]),b.disc);
  if(i>=25&&b.disc.attract(KIND.target)>.2&&
     b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
const lessons=[
 {question:'Which city was Ada born in?',context:'Ada was born in Lisbon. She moved to Oslo.',
  answer:'Lisbon',answerStart:16},
 {question:'Who founded the institute?',context:'Mira founded the institute in 1998.',
  answer:'Mira',answerStart:0},
 {question:'Which city hosted the meeting?',context:'The meeting was hosted in Rome yesterday.',
  answer:'Rome',answerStart:26},
 {question:'In which year was the lab established?',context:'The lab was established in 2018.',
  answer:'2018',answerStart:27}
];
test('V40 original Brain genuinely owns witnessed goal and human QA evidence across save/restore; no instruction target in heldout',()=>{
 const brain=nativeBrain(),unified=new V40OriginalBrainEvidence(brain);
 const unknown=unified.answer({kind:'instruction-goal',
   instruction:'Brew the refreshment',source:'Ada keeps tea.'});
 assert.equal(unknown.found,false);
 assert.equal(unknown.reason,'UNSEEN_INSTRUCTION_INTENT');
 const sources=[
  {states:['Mira buys tea.','Mira buys coffee.'],episodeId:'witness-1'},
  {states:['Ivo likes tea.','Ivo likes coffee.'],episodeId:'witness-2'}
 ];
 for(const item of sources){
  unified.observeTextWorld(item.states.join(' '),item.episodeId);
  const result=unified.observeInstructionEpisode({
   instruction:'Brew the refreshment',...item,executedTransitionsObserved:true});
  assert.equal(result.ok,true);
 }
 const observed=unified.answer({kind:'instruction-goal',
   instruction:'Brew the refreshment',source:'Ada keeps tea.'});
 assert.equal(observed.found,true,JSON.stringify(observed));
 assert.equal(observed.answer,'Ada keeps coffee.');
 assert.equal(observed.goalPredicate?.slots?.[2],'coffee');
 assert.equal(observed.userSpecifiedDestinationToken,false);
 assert.equal(observed.source,'Discoverer.shape');
 assert.equal(observed.path.length,1);
 const qatraining=unified.trainHumanQA(lessons,{epochs:4,snapshotEvery:4,burnIn:0});
 assert.ok(qatraining.accepted>0,'Real supervised source spans must be learned');
 const extractive=unified.answer({kind:'human-extractive',
   question:'Which city hosted the meeting?',
   context:'The meeting was hosted in Rome yesterday.',weightMode:'average'});
 assert.equal(extractive.found,true,JSON.stringify(extractive));
 assert.equal(extractive.originalMotor,'Discoverer.shapeGraph');
 assert.equal(extractive.predicted,extractive.extraction&&
    'The meeting was hosted in Rome yesterday.'.slice(extractive.extraction.start,extractive.extraction.end));
 const before=unified.report();
 assert.ok(before.learnedHumanQAFeatures>0);
 assert.equal(before.instructionTaskEpisodes,2);
 assert.equal(before.originalMazeEpisodes>0,true);
 const frozenA=JSON.stringify(unified.map.export()),weights=unified.qa.memory.updates;
 const heldout=unified.answer({kind:'instruction-goal',
    instruction:'Brew the refreshment',source:'Newcomer keeps tea.'});
 assert.equal(heldout.answer,'Newcomer keeps coffee.');
 assert.equal(JSON.stringify(unified.map.export()),frozenA);
 assert.equal(unified.qa.memory.updates,weights);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v40-original-'));
 try{
  const checkpoint=path.join(dir,'brain.v8'),size=brain.save(checkpoint);
  assert.ok(size>2000);
  const loaded=Brain.load(checkpoint),again=new V40OriginalBrainEvidence(loaded);
  assert.equal(again.answer({kind:'instruction-goal',
     instruction:'Brew the refreshment',source:'Ada keeps tea.'}).answer,observed.answer);
  const qarestored=again.answer({kind:'human-extractive',
   question:'Which city hosted the meeting?',
   context:'The meeting was hosted in Rome yesterday.',weightMode:'average'});
  assert.deepEqual(qarestored.initialShape,extractive.initialShape);
  assert.equal(qarestored.predicted,extractive.predicted);
  assert.equal(again.qa.memory.averagedWeights.size,unified.qa.memory.averagedWeights.size);
  assert.equal(again.report().originalMazeEpisodes,before.originalMazeEpisodes);
  const refused=again.answer({kind:'instruction-goal',
   instruction:'Completely unwitnessed magic',
   source:'Ada keeps tea.'});
  assert.equal(refused.found,false);
  assert.equal(again.answer({kind:'arbitrary-semantic-question',question:'What is life?'}).found,false);
  console.log('V40_SINGLE_ORIGINAL_BRAIN_PROOF',JSON.stringify({
   checkpointBytes:size,realMazeExperiences:before.originalMazeEpisodes,
   witnessedTaskEpisodes:2,humanQALearnedFeatures:before.learnedHumanQAFeatures,
   singleSavedBrain:true,restoredInstructionAnswer:observed.answer,
   restoredHumanAnswer:extractive.predicted,
   bothOriginalShapeTypes:['Discoverer.shape','Discoverer.shapeGraph'],
   unknownQuestionRefused:true,genuineOpenDomainSemanticQAProved:false}));
 }finally{fs.rmSync(dir,{force:true,recursive:true});}
});
