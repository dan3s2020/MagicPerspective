import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {playExercise,makeMaze,SEEDS,seedOf} from '../transcend/torus-aether/worlds/exercise.mjs';
test('REAL original Brain.save/load evidence exporter preserves source checkpoint and records true internal sweeps',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'science-frozen-real-'));
  try{
    const source=path.join(dir,'original-brain.v8'),destination=path.join(dir,'new-evidence.json');
    const brain=new Brain({rules:'winner',seed:11});
    for(let i=0;i<160;i++){
      const w=makeMaze(seedOf(SEEDS.train,i),i%2?9:7);
      playExercise(w,brain.disc,()=>{},{record:false});
    }
    assert.ok(brain.disc.attract(2)>.2,'The actual saved Brain must have a learned goal field');
    brain.save(source);
    const sourceBefore=fs.readFileSync(source);
    const script=fileURLToPath(new URL('../research/science/export-native-field.mjs',import.meta.url));
    const args=[script,'--checkpoint',source,'--out',destination,'--count','3','--size','9','--seed','117'];
    const run=spawnSync(process.execPath,args,{encoding:'utf8',timeout:90000,maxBuffer:8*1024*1024});
    assert.equal(run.status,0,'Native checkpoint export failed: '+run.stderr+'\n'+run.stdout);
    const proof=JSON.parse(fs.readFileSync(destination,'utf8'));
    assert.equal(proof.schema,'MagicPerspective-native-field-replay-v1');
    assert.equal(proof.episodes.length,3);assert.equal(proof.summary.matchedOriginal,3);
    assert.ok(proof.episodes.every(e=>e.nativePathIdentical===true&&e.independentMaxAbsError<1e-9));
    assert.ok(proof.episodes.every(e=>e.frames.length>0&&e.frames.at(-1).changed===0));
    assert.deepEqual(fs.readFileSync(source),sourceBefore,'EXACT source checkpoint bytes changed');
    const deny=spawnSync(process.execPath,args,{encoding:'utf8',timeout:90000});
    assert.notEqual(deny.status,0,'Exporter silently overwrote previous evidence');
    console.log('SCIENCE_READONLY_REAL_CHECKPOINT_EXPORT',JSON.stringify({
      originalV8Bytes:sourceBefore.length,evidenceWorlds:proof.episodes.length,
      matchedOriginal:proof.summary.matchedOriginal,
      goalReached:proof.summary.goalReached,
      meanSweeps:proof.summary.meanOriginalSweeps,
      maxIndependentFieldError:proof.summary.maxIndependentFieldError,
      originalUnchanged:true,neverOverwrites:true}));
  }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
