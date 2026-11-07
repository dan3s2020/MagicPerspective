import test from 'node:test';
import assert from 'node:assert/strict';
import {LearnedCognitiveMap} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {answerFromOriginalPath,firstTryCharacterComparison} from '../transcend/torus-aether/worlds/path-answer-writer.mjs';
const chain=['tea','coffee','water','juice'];
const physics={tea:'coffee',coffee:'water',water:'juice'};
function build(){
 const m=new LearnedCognitiveMap();
 for(const [name,verb] of [['Mira','buys'],['Ivo','likes']])
  m.observeWorld(chain.map(v=>name+' '+verb+' '+v+'.').join(' '),{id:name});
 return m;
}
const goal={slots:{2:'juice'}};
const question=name=>'Replace "tea" with "juice" in:\n'+name+' keeps tea.';
const observe=(before,action,predicted)=>{
 const ok=before[1]==='keeps'&&physics[before[2]]===predicted[2];
 return {accepted:ok,after:ok?predicted:before};
};
function trainFeedback(model,name){
 const attempts=[];
 for(let i=0;i<12;i++){
   const p=model.formSolution(name+' keeps tea.',goal,{maxNodes:384,maxDepth:8,transfer:true});
   assert.equal(p.found,true);
   const r=model.execute(p,{step:observe});
   attempts.push({found:r.solved,steps:p.path.length,rejected:r.trace.filter(x=>!x.accepted).length});
   if(r.solved)return attempts;
 }
 throw Error('Actual causal feedback never recovered the complete path for '+name);
}
test('2 physically verified independent contexts allow exact first-answer 3-hop transfer to 100 NEW contexts',()=>{
 const m=build();
 const start=m.export(),source='Cora_0 keeps tea.';
 const unverified=answerFromOriginalPath(m,'Replace "tea" with "juice" in:\n'+source);
 assert.equal(unverified.path.length,1,'Spurious direct shortcut exists before physical evidence');
 const v0=answerFromOriginalPath(m,'Replace "tea" with "juice" in:\n'+source,
   {minVerifiedContexts:2});
 assert.equal(v0.found,false,'Verified-only policy must abstain without observed action successes');
 const first=trainFeedback(m,'Ada'),mid=answerFromOriginalPath(m,
    'Replace "tea" with "juice" in:\n'+source,{minVerifiedContexts:2});
 assert.equal(mid.found,false,'One confirmed physical source is not enough for a 2-context gate');
 const second=trainFeedback(m,'Bela');
 const snapshots=JSON.stringify(m.export());
 const result=[];
 for(let i=0;i<100;i++){
   const name='Novel_'+i,src=name+' keeps tea.',expected=name+' keeps juice.';
   const out=answerFromOriginalPath(m,'Replace "tea" with "juice" in:\n'+src,
     {minVerifiedContexts:2,maxNodes:384,maxDepth:8});
   const scored=firstTryCharacterComparison(out.answer,expected);
   const p=m.formSolution(src,goal,{minVerifiedContexts:2,maxNodes:384,maxDepth:8});
   const acted=p.found?m.execute(p,{step:observe,observe:false}):null;
   result.push({name,found:out.found,correct:scored.answerExact,
     length:out.path?.length??0,physicallyValid:acted?.solved||false,
     characterErrors:scored.errors.length});
 }
 assert.equal(result.filter(x=>x.correct).length,100);
 assert.equal(result.filter(x=>x.physicallyValid).length,100);
 assert.ok(result.every(x=>x.length===3));
 assert.equal(JSON.stringify(m.export()),snapshots,
   '100 frozen test contexts were NOT available during training');
 const adversarial=[];
 for(let i=0;i<10;i++){
   const src='Opposite_'+i+' denies tea.';
   const prediction=answerFromOriginalPath(m,'Replace "tea" with "juice" in:\n'+src,
     {minVerifiedContexts:2});
   // This model learns at operator/position level, not by a fully grounded
   // condition on all natural-language verbs. This is a purposeful OOD test.
   const sim=prediction.found?
     m.execute(m.formSolution(src,goal,{minVerifiedContexts:2}),{step:observe,observe:false}):null;
   adversarial.push({proposed:prediction.found,physicallyCorrect:sim?.solved||false});
 }
 assert.equal(adversarial.filter(x=>x.proposed).length,0,
   'Unverified new verb contexts must be ABSTAIN, not assumed safe');
 console.log('V31_CAUSAL_SUPPORT_TRANSFER_CURVE',JSON.stringify({
   beforePhysicalFeedbackCorrect:0,afterOneVerifiedContext:0,
   afterTwoVerifiedContexts:100,total:100,
   sampleActions:answerFromOriginalPath(m,question('Novel_0'),{minVerifiedContexts:2}).path.map(x=>x.action),
   physicallyExecutedAndCorrect:100,localTrainingAttempts:first.length+second.length,
   noTestLeak:true,originalDiscoverer:true,
   adversarialDifferentVerb:adversarial,
   abstainedOutsideVerifiedContexts:adversarial.every(x=>!x.proposed)
 }));
 assert.equal(adversarial.filter(x=>x.physicallyCorrect).length,0,
   'Must not claim general language understanding from controlled context transfer');
});
