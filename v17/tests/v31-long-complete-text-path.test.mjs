import test from 'node:test';
import assert from 'node:assert/strict';
import {LearnedCognitiveMap,tokenizeWorld} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';
import {answerFromOriginalPath,parseExplicitRewriteQuestion,firstTryCharacterComparison} from
 '../transcend/torus-aether/worlds/path-answer-writer.mjs';

const train=()=>{
 const m=new LearnedCognitiveMap();
 m.observeWorld('Mira buys tea. Mira buys coffee.',{id:'world-1'});
 m.observeWorld('Ivo likes tea. Ivo likes coffee.',{id:'world-2'});
 return m;
};
const Q=(from,to,text)=>'Replace "'+from+'" with "'+to+'" in:\n'+text;
function make(n,where,label){
 const words=Array.from({length:n},(_,i)=>'piece_'+label+'_'+i);
 words[where]='tea';
 return {source:words.join(' ')+'.',expected:words.map(x=>x==='tea'?'coffee':x).join(' ')+'.'};
}
test('long complete text state: exact first answer is generated from a learned path at arbitrary character positions',()=>{
 const model=train(),original=JSON.stringify(model.export());
 let correct=0,letters=0;
 for(let i=0;i<32;i++){
   const n=[16,64,128,256,384,512,800,1000,1800][i%9];
   const at=(i*137+7)%n;
   const {source,expected}=make(n,at,i);
   const parsed=parseExplicitRewriteQuestion(Q('tea','coffee',source),{maxTokens:2048});
   assert.equal(parsed.ok,true);
   const result=answerFromOriginalPath(model,Q('tea','coffee',source),{
     maxDepth:5,maxNodes:384,maxTokens:2048
   });
   assert.equal(result.found,true);
   assert.equal(result.source,'Discoverer.shape');
   assert.equal(result.actualWriter,'PATH_TERMINAL_STATE_READOUT_NOT_LEGACY_ALIGNING_GRAPH');
   assert.equal(result.path.length,1);
   assert.equal(result.path[0].crossWorld,true);
   assert.ok(result.path[0].support>=2);
   assert.ok(result.path[0].provenance.length>=2,'Real evidence from two independently observed contexts');
   assert.equal(result.inputTokenCount,n+1);
   const chars=firstTryCharacterComparison(result.answer,expected);
   assert.equal(chars.answerExact,true,'No copied teacher answer; rendered native full path');
   letters+=chars.comparedCharacters;
   correct++;
 }
 assert.equal(JSON.stringify(model.export()),original,'Inference must not write back withheld answers');
 console.log('V31_LONG_FULL_TEXT',JSON.stringify({correct,total:32,
   charactersCompared:letters,tokenLengths:[16,64,128,256,384,512,800,1000,1800],
   noRetinaSegmentation:true,maxTokens:2048,method:'Discoverer.shape',
   baseline96TokenDefaultChanged:false}));
});
test('original 96-token planner default is not silently changed; longer inputs require explicit budget',()=>{
 const model=train(),{source}=make(200,42,9),q=Q('tea','coffee',source);
 assert.throws(()=>model.formSolution(source,{slots:{42:'coffee'}}),
   /Invalid cognitive planning limits/);
 const longer=answerFromOriginalPath(model,q,{maxTokens:512,maxDepth:6});
 assert.equal(longer.found,true);
 assert.equal(longer.inputTokenCount,201);
 const tooLong=make(2050,20,9),r=answerFromOriginalPath(model,Q('tea','coffee',tooLong.source),{maxTokens:2048});
 assert.equal(r.found,false);
 assert.match(r.reason,/DESIGN_WALL_MAX_TOKENS/);
 console.log('V31_EXPLICIT_DESIGN_LIMIT',JSON.stringify({
  originalDefault96Preserved:true,explicit201TokensPassed:true,longText2051TokensBlocked:true}));
});
test('unknown transformation, missing question grammar, and disabled path do not output goal text',()=>{
 const m=train();
 const unsupported=answerFromOriginalPath(m,Q('tea','unseen_destination','Ada keeps tea.'));
 assert.equal(unsupported.found,false);
 assert.equal(unsupported.answer,null);
 const unknown=answerFromOriginalPath(m,'Tell me what Ada thinks.');
 assert.equal(unknown.found,false);
 assert.equal(unknown.reason,'UNSUPPORTED_INSTRUCTION_GRAMMAR');
 const original=answerFromOriginalPath(m,Q('tea','coffee','Ada keeps tea.'));
 assert.equal(original.found,true);
 const rules=[...m.rules.entries()].filter(([,r])=>r.from==='tea'&&r.to==='coffee');
 assert.ok(rules.length);
 for(const [id] of rules)m.rules.delete(id);
 const removed=answerFromOriginalPath(m,Q('tea','coffee','Ada keeps tea.'));
 assert.equal(removed.found,false);
 assert.equal(removed.answer,null);
 console.log('V31_NO_SHORTCUT_PROOF',JSON.stringify({
   unknownGoalProducesAnswer:false,unsupportedLanguageProducesAnswer:false,
   removalOfPathStopsWriter:true}));
});
