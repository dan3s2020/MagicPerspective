import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedExperience} from './experience.mjs';
test('one experience queue accepts real observations from three domains', () => {
  const x = new SharedExperience({capacity: 8});
  x.observeMaze([1, 3, 2], [1, 2, 3], 5, 7);
  x.observeTransform([7, 8, 9], [7, 9, 8], 2, 3);
  x.observeText({before: ['a'], after: ['a', 'b'], action: {tool: 3, token: 'b'}}, 'question');
  const a = x.take(5);
  assert.equal(a.length, 3); assert.deepEqual(a.map(s => s.domain), ['maze', 'transform', 'text']);
  assert.deepEqual(x.status().domains, {maze: 1, transform: 1, text: 1, selfcode: 0});
  assert.equal(x.status().queued, 0);
});
test('the same queue accepts a real code-world observation with no privileged source rules', () => {
  const x=new SharedExperience({capacity:8});
  const before='function f(){return 1}',after='function f(){return 2}';
  x.observe({domain:'selfcode',before,after,action:'portal-jump',context:'source:one'});
  assert.deepEqual(x.status().domains,{maze:0,transform:0,text:0,selfcode:1});
  assert.deepEqual(x.take(1)[0],{domain:'selfcode',before,after,action:'portal-jump',context:'source:one'});
});
test('isolated queue bounds; input arrays are copied; errors visible', () => {
  const q = new SharedExperience({capacity: 8}); const src = [2, 3];
  q.observeMaze(src, [3, 2], 0, 7); src[0] = 9;
  for (let i = 0; i < 15; i++) q.observeMaze([i], [i + 1], i, 7);
  assert.equal(q.take(100).length, 8);
  assert.throws(() => q.observe({domain: 'other', before: [], after: [], action: 0}));
});
test('never carries an oracle or held-out reference into the GPU samples', () => {
  const q = new SharedExperience();
  const event = {domain: 'maze', before: [1, 2], after: [2, 1], action: 3,
    optimal: 1, solution: [9, 9], reward: 100, reference: 'secret'};
  q.observe(event);
  const s = q.take()[0];
  assert.deepEqual(Object.keys(s).sort(), ['action', 'after', 'before', 'context', 'domain']);
});
