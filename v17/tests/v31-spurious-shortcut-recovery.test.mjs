// Adversarial test of the ORIGINAL cognitive inference: observed contrasts
// can induce a direct shortcut that is not causally executable.
// The original action-observation feedback must teach the actual wall.
import test from 'node:test';
import assert from 'node:assert/strict';
import {LearnedCognitiveMap} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {answerFromOriginalPath} from '../transcend/torus-aether/worlds/path-answer-writer.mjs';

const chain=['tea','coffee','water','juice'];
const physical={tea:'coffee',coffee:'water',water:'juice'};
const question=(name)=>'Replace "tea" with "juice" in:\n'+name+' keeps tea.';
function model(){
 const m=new LearnedCognitiveMap();
 for(const [name,verb] of [['Mira','buys'],['Ivo','likes']]){
   const states=chain.map(word=>name+' '+verb+' '+word+'.');
   m.observeWorld(states.join(' '),{id:name});
 }
 return m;
}
function actualStep(before,action,predicted){
  const old=before[2],next=predicted[2],accepted=physical[old]===next;
  return {accepted,after:accepted?predicted:before};
}
test('spurious cross-world one-hop shortcuts fail physically; original organism replans using recorded walls',()=>{
 const m=model();
 const first=answerFromOriginalPath(m,question('Ada'));
 assert.equal(first.found,true);
 assert.equal(first.path.length,1,'Unverified direct contrast will look attractive before its action is tested');
 const efforts=[];let solved=false;
 for(let k=0;k<12;k++){
   const plan=m.formSolution('Ada keeps tea.',{slots:{2:'juice'}},
     {seed:74129,maxNodes:384,maxDepth:8,transfer:true});
   assert.equal(plan.found,true,'The full learned graph still has a path');
   const actual=m.execute(plan,{step:actualStep});
   efforts.push({attempt:k+1,planned:plan.path.length,solved:actual.solved,
     trace:actual.trace.map(e=>({action:e.action,from:e.from[2],to:e.predicted[2],accepted:e.accepted}))});
   if(actual.solved){solved=true;break;}
 }
 assert.equal(solved,true);
 assert.equal(efforts.at(-1).planned,3,'After rejecting impossible shortcuts, original 3-hop route must remain');
 const frozen=JSON.stringify(m.export());
 const answer=answerFromOriginalPath(m,question('Ada'));
 assert.equal(answer.answer,'Ada keeps juice.');
 assert.equal(answer.path.length,3);
 assert.equal(JSON.stringify(m.export()),frozen,'Frozen first answer must not learn the answer text');
 // A different context is NOT physically verified merely because Ada was.
 const other=answerFromOriginalPath(m,question('Bela'));
 assert.equal(other.found,true);
 assert.equal(other.path.length,1,'Current implementation has no universal causal shortcut-blocking evidence');
 console.log('V31_CAUSAL_SHORTCUT_DIAGNOSIS',JSON.stringify({
   initiallyIncorrectShortestRoute:1,attemptsUntilLocalRecovery:efforts.length,
   finalCorrectPathSteps:3,locallyRecovered:true,
   newContextStillUsesFalseShortcut:true,attempts:efforts
 }));
});
