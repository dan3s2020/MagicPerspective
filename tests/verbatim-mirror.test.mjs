import test from 'node:test';
import assert from 'node:assert/strict';
import {auditMirror} from '../scripts/verbatim-mirror-gate.mjs';
test('recoverable recent user messages have stable order and identical on-disk texts',()=>{
 const a=auditMirror();
 assert.equal(a.integrity,'PASS',a.problems.join('; '));
 assert.equal(a.messages,15);
});
test('version mirror cannot certify missing full conversation',()=>{
 const a=auditMirror();
 assert.equal(a.gate,'BLOCKED');
 assert.ok(a.requirements>=12);
 assert.ok(a.versions>=9);
});
