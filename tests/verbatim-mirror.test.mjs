import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMirror} from '../scripts/verbatim-mirror-gate.mjs';
test('recoverable recent user messages have stable order and identical on-disk texts',()=>{
 const a=auditMirror();
 assert.equal(a.integrity,'PASS',a.problems.join('; '));
 assert.equal(a.messages,12);
});
test('version mirror cannot certify missing full conversation',()=>{
 const a=auditMirror();
 assert.equal(a.gate,'BLOCKED');
 assert.ok(a.requirements>=9);
 assert.ok(a.versions>=9);
});
