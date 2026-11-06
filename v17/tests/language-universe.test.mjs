import test from 'node:test';
import assert from 'node:assert/strict';
import {TextPerspectives,tokenize} from '../transcend/torus-aether/language-universe/perspectives.mjs';

test('unicode language retina sees words and punctuation',()=>{
  assert.deepEqual(tokenize('Pârghia deschide ușa.'),['Pârghia','deschide','ușa','.']);
});
test('perspective scales and paths are learned from repeated raw text',()=>{
  const p=new TextPerspectives();
  for(let i=0;i<15;i++)p.observe('The magician opens a gate. The traveler enters the gate.');
  assert.equal(p.report().observedTokens,180);
  assert.ok(p.report().states>10);
  const path=p.navigate('The magician',{steps:8});
  assert.deepEqual(path.path.map(x=>x.token),['opens','a','gate','.']);
  assert.ok(path.path.some(x=>x.perspective>=2));
  assert.ok(path.path.at(-1).attraction>path.path[0].attraction);
});
test('frozen heldout evaluation never inserts the observed words',()=>{
  const p=new TextPerspectives();for(let i=0;i<20;i++)p.observe('stone is moved by mage.');
  const before=JSON.stringify(p.serialize());
  const r=p.evaluate('stone is moved by mage.',{useField:true});
  assert.ok(r.accuracy>=.8);
  assert.equal(JSON.stringify(p.serialize()),before);
});
test('serialized representation retains the same learned path and trust',()=>{
  const p=new TextPerspectives();for(let i=0;i<25;i++)p.observe('a gate opens when a lever is pulled.');
  const q=TextPerspectives.restore(JSON.parse(JSON.stringify(p.serialize())));
  assert.deepEqual(q.report(),p.report());
  assert.deepEqual(q.navigate('a gate').continuation,p.navigate('a gate').continuation);
});
test('limited state budget is counted honestly and still gives safe fallbacks',()=>{
  const p=new TextPerspectives({maxStates:6});p.observe('one two three four five six seven eight nine ten');
  assert.ok(p.report().blockedStates>0);
  const result=p.navigate('unseen token',{steps:3});
  assert.ok(Array.isArray(result.path));
});
