import test from 'node:test';
import assert from 'node:assert/strict';
import {audit} from '../scripts/verbatim-gate.mjs';
test('every recoverable message is indexed without changing the archived blob',()=>{
  const r=audit();
  assert.equal(r.indexed,56);
  assert.equal(r.lastArchived,56);
  assert.equal(r.sourceMatches,true);
});
test('missing transcript and clause-level acceptance proof MUST block full-engine claims',()=>{
  const r=audit();
  assert.equal(r.status,'VERBATIM_INCOMPLETE');
  assert.equal(r.gate,'BLOCKED');
  assert.equal(r.verified,0);
  assert.ok(r.errors.some(x=>x.includes('NOT certified')));
});
