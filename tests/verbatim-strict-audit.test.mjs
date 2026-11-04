import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {auditConformity,auditClause,REPO} from '../scripts/verbatim-strict-audit.mjs';

test('Literal-source audit rejects missing code, non-exact quotes and false verified status',()=>{
 const dir=mkdtempSync(join(tmpdir(),'strict-verbatim-'));
 try{
  writeFileSync(join(dir,'code.js'),'real working source');
  writeFileSync(join(dir,'test.js'),'assertion');
  const valid={id:'clause',source_ref:'m1',exact_source_span:'complete words',
   status:'VERIFIED',code_paths:['code.js'],test_paths:['test.js'],
   measured_result:'Observed executed output on actual environment',
   regression_check:'test.js'};
  const evidence=auditClause(valid,'full original complete words belong here',dir);
  assert.equal(evidence.source_exact,true);
  assert.equal(evidence.independently_verified,true,
   'Proof fields can be complete without claiming all-source compliance');
  const truncated=auditClause(valid,'unrelated original conversation text',dir);
  assert.equal(truncated.source_exact,false);
  assert.ok(truncated.problems.includes('EXACT_SPAN_MISSING'));
  const noTests=auditClause({...valid,test_paths:[]},'complete words',dir);
  assert.ok(noTests.problems.includes('NO_TEST_PATHS'));
  assert.equal(noTests.independently_verified,false);
  const invented=auditClause({...valid,code_paths:['missing/invented.py']},'complete words',dir);
  assert.ok(invented.problems.some(x=>x.includes('CODE_PATH_MISSING')));
 }finally{rmSync(dir,{recursive:true,force:true})}
});
test('Real main-branch conversation is never falsely declared 100% complete',()=>{
 const a=auditConformity();
 assert.equal(a.release_gate,'BLOCKED');
 assert.equal(a.outcome,'NOT_VERIFIED');
 assert.ok(a.source.historic_indexed>=56);
 assert.ok(a.source.historic_unverified>0);
 assert.equal(a.source.full_native_transcript_verified,false);
 assert.ok(a.source.recent_literal_user_messages>=29);
 assert.ok(a.requirements.tracked>=31);
 assert.ok(a.requirements.not_verified.length>0);
 assert.ok(a.requirements.missing_atomic_message_mapping.length>0,
  'Some archived user messages still lack their own atomic requirement map');
 assert.ok(a.scientifically_open.some(x=>x.issue.includes('SHA-256')));
 assert.ok(a.scientifically_open.some(x=>x.issue.includes('text')));
 const key='REQ-V15-STRICT-TORUS-AND-REPO-VERBATIM-COMPLIANCE';
 assert.ok(!a.requirements.incomplete_evidence.some(x=>x.id===key),
  'New strict audit itself must have actual code, existing tests and exact original quote');
});
test('Compliance --gate fails while --json report is successful and machine readable',()=>{
 const cmd=join(REPO,'scripts/verbatim-strict-audit.mjs');
 const report=spawnSync(process.execPath,[cmd,'--json'],{cwd:REPO,encoding:'utf8'});
 assert.equal(report.status,0,report.stderr);
 assert.equal(JSON.parse(report.stdout).release_gate,'BLOCKED');
 const gate=spawnSync(process.execPath,[cmd,'--gate'],{cwd:REPO,encoding:'utf8'});
 assert.equal(gate.status,1,'Full release gate MUST fail until original source and ALL requirements verified');
});
