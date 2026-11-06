import test from 'node:test';
import assert from 'node:assert/strict';
import {AligningGraph} from '../../v17/transcend/torus-aether/align.mjs';
import {repeatedWindowFraction} from './repetition.mjs';

test('original V17 aligned output is unchanged when optional penalty is omitted',()=>{
  const a=new AligningGraph();
  a.proposals=()=>[];
  a.distribution=()=>new Map([[65,.51],[66,.49]]);
  const prompt=Array(36).fill(65);
  const old=a.write(prompt,{max:80,T:0});
  const explicitZero=a.write(prompt,{max:80,T:0,loopPenalty:0,loopWindow:8});
  assert.deepEqual(old,explicitZero);
  assert.deepEqual(new Set(old),new Set([65]));
});
test('optional repeated-window resistance changes an actual V17 output decision without a substitute model',()=>{
  const a=new AligningGraph();
  a.proposals=()=>[];
  a.distribution=()=>new Map([[65,.51],[66,.49]]);
  const prompt=Array(36).fill(65);
  const old=a.write(prompt,{max:80,T:0});
  const guarded=a.write(prompt,{max:80,T:0,loopPenalty:10,loopWindow:8});
  assert.equal(old.length,guarded.length);
  assert.ok(guarded.includes(66));
  assert.ok(repeatedWindowFraction(String.fromCharCode(...guarded),8)<
    repeatedWindowFraction(String.fromCharCode(...old),8));
});
test('repetition diagnostic measures repeated windows, not numerical frequencies',()=>{
  const phrase='the number of shortest paths from ';
  assert.ok(repeatedWindowFraction(phrase.repeat(5),16)>.5);
  assert.equal(repeatedWindowFraction('abcdefghijklmnop',16),0);
  assert.equal(repeatedWindowFraction('',16),0);
});
