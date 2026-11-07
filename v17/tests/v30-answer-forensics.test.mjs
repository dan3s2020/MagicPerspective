import test from 'node:test';
import assert from 'node:assert/strict';
import {answerForensics} from '../transcend/torus-aether/devour/atlas-answer-forensics.mjs';
const ex=s=>[...Buffer.from(s,'latin1')];
const a=ex('Q: Name?\nA: cat\n\n'),b=ex('Q: Animal plural?\nA: dogs\n\n');
const boundary=x=>x.indexOf(10)+3;
test('strict frozen answer characters: first mismatch, all errors and exact whole-answer metrics, independently of field path',()=>{
 const src=[b,a],result={heldoutAnswerComplete:true,strictFullAnswer:true,
  exercises:[
    {a0:boundary(a),shape:'cap\n\n',firstAnswerExact:false},
    {a0:boundary(b),shape:'dogs\n\n',firstAnswerExact:true}
  ]};
 const original=JSON.stringify(src),r=answerForensics(result,src,{worker:0});
 assert.equal(r.length,2);
 assert.equal(r[0].questionPrefix,'Q: Name?\nA:');
 assert.equal(r[0].predictedAnswer,'cap');
 assert.equal(r[0].expectedAnswer,'cat');
 assert.equal(r[0].answerExact,false);
 assert.equal(r[0].firstMismatch,2);
 assert.deepEqual(r[0].differences,[{index:2,predicted:'p',expected:'t',kind:'SUBSTITUTION'}]);
 assert.equal(r[1].answerExact,true);
 assert.equal(r[1].scoringConsistent,true);
 assert.equal(r[0].causallyDrivenByDiscovererPath,false);
 assert.match(r[0].blockedByDesign,/NO_CAUSAL_BRIDGE/);
 assert.equal(JSON.stringify(src),original,'Frozen post-hoc analysis cannot alter source corpus');
 console.log('V30_CHAR_FORENSICS',JSON.stringify({correctFullAnswers:1,total:2,firstMismatch:2,
   noFalseHypermazeAttribution:true}));
});
test('missing and extra generated characters are distinct; nothing silently omitted',()=>{
 const src=[ex('Q: x\nA: abc\n\n')],row={heldoutAnswerComplete:true,strictFullAnswer:true,
  exercises:[{a0:6,shape:'ab',firstAnswerExact:false}]};
 const r=answerForensics(row,src);
 assert.equal(r[0].expectedAnswer,'abc');
 assert.deepEqual(r[0].differences,[{index:2,predicted:null,expected:'c',kind:'MISSING_OUTPUT_CHARACTER'}]);
 const extra=answerForensics({...row,exercises:[{a0:6,shape:'abcd',firstAnswerExact:false}]},src);
 assert.deepEqual(extra[0].differences,[{index:3,predicted:'d',expected:null,kind:'EXTRA_OUTPUT_CHARACTER'}]);
});
test('a partially evaluated or non-heldout exercise cannot be mislabeled as strict',()=>{
 const src=[a],r={heldoutAnswerComplete:false,strictFullAnswer:true,exercises:[{a0:10,shape:'cat'}]};
 assert.throws(()=>answerForensics(r,src),/Only genuine complete frozen heldout answers/);
});
