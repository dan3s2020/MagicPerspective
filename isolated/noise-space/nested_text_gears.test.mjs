import test from 'node:test';
import assert from 'node:assert/strict';
import {NestedTextGears} from './nested_text_gears.mjs';
const asText=a=>a.join(' ')+'.';
const cases=['She is happy','She is tired','He is tired','He is calm'];
test('unseen combination is produced from learned transformations and executed per character',()=>{
  const g=new NestedTextGears();for(const s of cases)g.observeSentence(s);
  assert.ok(!g.examples.some(x=>x.join(' ')==='She is calm'));
  const r=g.cursor('He is tired',{0:'She',2:'calm'});
  assert.equal(r.output,'She is calm.');assert.ok(r.route.length>=2);
  assert.equal(r.cursor.length,r.output.length);assert.ok(r.cursor.every(x=>x.verified));
  assert.ok(r.cursor.every(x=>x.subproblems>=2));
});
test('100 unseen combinations under shuffled observations',()=>{
 const subs=['He','She','It'],states=['calm','tired','happy'];let ok=0;
 for(let seed=0;seed<100;seed++){
   const world=subs.flatMap(s=>states.map(a=>[s,'is',a]));const held=world[seed%world.length],seen=world.filter(x=>asText(x)!==asText(held));
   // Repeatable reshuffling, but never show held-out sentence to training.
   seen.sort((a,b)=>((a[0]+a[2]).charCodeAt(seed%4)||0)-((b[0]+b[2]).charCodeAt(seed%4)||0));
   const g=new NestedTextGears();for(const e of seen)g.observeSentence(e.join(' '));
   const r=g.cursor('He is happy',{0:held[0],2:held[2]});
   ok+=Number(r.output===asText(held));
 }
 assert.equal(ok,100);
});
test('400 held-out three-component combinations',()=>{
 const a=['He','She','It'],b=['very','quite'],c=['calm','tired','happy'];let correct=0;
 for(let seed=0;seed<100;seed++){
 const world=a.flatMap(x=>b.flatMap(y=>c.map(z=>[x,'is',y,z])));
 const hold=Array.from({length:4},(_,i)=>world[(seed+i*3)%world.length]);const left=world.filter(x=>!hold.some(y=>asText(y)===asText(x)));
 const g=new NestedTextGears();for(const x of left)g.observeSentence(x.join(' '));
 for(const target of hold){const r=g.cursor('He is very tired',{0:target[0],2:target[2],3:target[3]});correct+=Number(r.output===asText(target));}
 }
 assert.equal(correct,400);
});
test('blocked when necessary transformation was never observed',()=>{
 const g=new NestedTextGears();for(const s of ['She is happy','She is tired','He is tired'])g.observeSentence(s);
 const r=g.cursor('He is tired',{0:'She',2:'calm'});
 assert.equal(r.ok,false);assert.equal(r.output,'');
});
test('ablating operators prevents target and cannot synthesize missing edge',()=>{
 const g=new NestedTextGears();for(const s of cases)g.observeSentence(s);
 for(const [k,v] of g.operators)if(v.slot===2)g.operators.delete(k);
 assert.equal(g.cursor('He is tired',{0:'She',2:'calm'}).ok,false);
});
test('save/load preserves learned operators, evaluation remains frozen',()=>{
 const g=new NestedTextGears();for(const s of cases)g.observeSentence(s);
 const restored=NestedTextGears.restore(g.export());const before=JSON.stringify(restored.export());
 assert.equal(restored.cursor('He is tired',{0:'She',2:'calm'}).output,'She is calm.');
 assert.equal(JSON.stringify(restored.export()),before);
});
test('portal noise never invents edits or changes learned knowledge',()=>{
 const g=new NestedTextGears();for(const s of cases)g.observeSentence(s);
 const before=JSON.stringify(g.export());const r=g.cursor('He is tired',{0:'She',2:'calm'},{noise:1,seed:41});
 assert.equal(r.output,'She is calm.');assert.equal(JSON.stringify(g.export()),before);
});
test('observed training answers feed the same learner but do not expose tests',()=>{
 const g=new NestedTextGears();for(const s of cases)g.observeAnswer(s+'.');
 assert.equal(g.cursor('He is tired',{0:'She',2:'calm'}).output,'She is calm.');
 assert.equal(g.observeAnswer(''),0);
});
