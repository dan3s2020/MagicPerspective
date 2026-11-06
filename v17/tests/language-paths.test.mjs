import test from 'node:test';
import assert from 'node:assert/strict';
import {induceTransformation,applyTransformation,discoverPath} from '../transcend/torus-aether/language-paths/engine.mjs';

const samples=[['mage','stone'],['thief','gate'],['sage','door'],['ranger','crate']];
const pairs=samples.map(([a,b])=>({before:a+' pushes '+b,after:b+' is pushed by '+a}));
const pairs2=samples.map(([a,b])=>({before:b+' is pushed by '+a,after:'if '+a+' pushes then '+b+' moves'}));

test('learns token-role repositioning on held-out vocabulary',()=>{
  const r=induceTransformation(pairs);
  assert.equal(applyTransformation(r,'farmer pushes shield'),'shield is pushed by farmer');
  assert.equal(applyTransformation(r,'farmer opens shield'),null);
  assert.equal(applyTransformation(r,'farmer pushes shield now'),null);
});

test('discovers a two-edge path through sentence worlds',()=>{
  const rules=[induceTransformation(pairs),induceTransformation(pairs2)];
  const result=discoverPath('farmer pushes shield',rules,s=>s.startsWith('if ')&&s.includes(' then '));
  assert.equal(result.solved,true);
  assert.deepEqual(result.states,['farmer pushes shield','shield is pushed by farmer','if farmer pushes then shield moves']);
  assert.deepEqual(result.rules,[0,1]);
});

test('does not invent an ambiguous rewrite from impossible demonstrations',()=>{
  assert.throws(()=>induceTransformation([
    {before:'a lifts b',after:'x and y'},
    {before:'c lifts d',after:'z and w'},
    {before:'e lifts f',after:'p and q'},
  ]),/not uniquely explained/);
});

test('reports no path if its learned transformations cannot operate',()=>{
  const result=discoverPath('farmer opens shield',[induceTransformation(pairs)],s=>s.startsWith('if '));
  assert.equal(result.solved,false);
  assert.equal(result.reason,'no reachable transformation');
});
