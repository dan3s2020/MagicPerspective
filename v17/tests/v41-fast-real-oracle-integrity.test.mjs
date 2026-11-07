import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../../',import.meta.url));
const file='v17/transcend/torus-aether/gpu/text_gpu.py';
const original='c3247481fea58b89f6792f4d914f9e11a11af9cd';
test('CUDA regression oracle MUST be independent pre-Fast original, not same HEAD candidate',()=>{
  const reference=execFileSync('git',['-C',root,'show',original+':'+file],{encoding:'utf8'});
  const candidate=readFileSync(path.join(root,file),'utf8');
  const verifier=readFileSync(path.join(root,'v17/tests/text_gpu_cuda_residency_test.py'),'utf8');
  assert.notEqual(reference,candidate,'A test cannot prove regression parity by comparing a file to itself');
  assert.match(verifier,/c3247481fea58b89f6792f4d914f9e11a11af9cd/);
  assert.doesNotMatch(verifier,/"HEAD:v17\/transcend\/torus-aether\/gpu\/text_gpu\.py"/);
  assert.match(verifier,/assertNotEqual\(source, actual/);
  console.log('V41_FAST_ORACLE_INTEGRITY',JSON.stringify({
    originalCommit:original,
    actualReferenceDifferent:true,
    hardwareCUDARequiredForFinalNumericParity:true
  }));
});
