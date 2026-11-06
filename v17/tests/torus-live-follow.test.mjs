import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseVisibleGraph} from '../transcend/torus-aether/ui/live-follow.mjs';

test('automatically selects training brain #1 when default #0 has no experience', () => {
  const graphs = [{w:0,status:'oprit',chars:0}, {w:1,status:'antrenează',chars:62100}];
  assert.equal(chooseVisibleGraph(graphs,0),1);
  assert.equal(chooseVisibleGraph(graphs,0,true),0,'explicit graph selection is respected');
});
test('does not steal active graph focus and handles the missing original graph', () => {
  const graphs=[{w:0,status:'antrenează',chars:110},{w:1,status:'antrenează',chars:62100}];
  assert.equal(chooseVisibleGraph(graphs,0),0);
  assert.equal(chooseVisibleGraph(graphs,1,true),1);
  assert.equal(chooseVisibleGraph([{w:1,status:'antrenează',chars:1}],0),1);
});
test('no fabricated graph when the trainer has not started', () => {
  assert.equal(chooseVisibleGraph([],0),0);
  assert.equal(chooseVisibleGraph([{w:0,status:'pauză',chars:123}],0),0);
});
