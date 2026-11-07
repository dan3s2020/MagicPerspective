import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {run} from '../research/text-hypermaze/START_V40_REAL_HUMAN_QA.mjs';

test('V40 real 9000-human QA launcher blocks all overwrite/missing-source errors before network training',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v40-real-guard-'));
 try{
  const source=path.join(dir,'original-brain.v8'),
   destination=path.join(dir,'new-protected-brain.v8'),
   missing=path.join(dir,'nonexistent.v8');
  const brain=new Brain({rules:{depth:1,off:['R2','R4'],
   budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
  brain.save(source);
  const protectedBytes=fs.readFileSync(source);
  await assert.rejects(()=>run(['--original-brain',source,'--out',source]),
    /Output already exists or points to ORIGINAL Brain/);
  await assert.rejects(()=>run(['--original-brain',missing,'--out',destination]),
    /Original real trained Brain checkpoint not found/);
  fs.writeFileSync(destination,'no-overwrite-sentinel');
  await assert.rejects(()=>run(['--original-brain',source,'--out',destination]),
    /Output already exists or points to ORIGINAL Brain/);
  assert.equal(fs.readFileSync(destination,'utf8'),'no-overwrite-sentinel');
  assert.deepEqual(fs.readFileSync(source),protectedBytes);
  assert.equal(fs.existsSync(destination+'.atlas.jsonl'),false);
  console.log('V40_REAL_TRAINING_GUARD_PASS',JSON.stringify({
    sourceCheckpointUnchanged:true,
    overwrittenCheckpoints:0,
    missingSourceRejected:true,
    existingDestinationRejected:true,
    actualSQuADDownloadStarted:false
  }));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
