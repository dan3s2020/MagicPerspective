import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const cli = new URL('../transcend/torus-aether/language-paths/train-text.mjs',import.meta.url);
const dataset = new URL('../transcend/torus-aether/language-paths/examples.jsonl',import.meta.url);

function run(...args) {
  const p=spawnSync(process.execPath,[cli.pathname,...args],{encoding:'utf8'});
  if(p.error)throw p.error;
  return p;
}

test('Termux CLI trains rules on paired text and saves learnable transformations',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'magic-language-'));
  try {
    const model=path.join(dir,'rules.json');
    const tr=run('train',dataset.pathname,model);
    assert.equal(tr.status,0,tr.stderr);
    const m=JSON.parse(fs.readFileSync(model,'utf8'));
    assert.equal(m.trainingRows,10);
    assert.equal(m.learnedFamilies,2);
    assert.equal(m.rules.length,2);
    const ev=run('eval',dataset.pathname,model);
    assert.equal(ev.status,0,ev.stderr);
    const metrics=JSON.parse(ev.stdout);
    assert.equal(metrics.unseenRows,50);
    assert.equal(metrics.correct,50);
    const pa=run('path',model,'farmer pushes shield','if farmer pushes then shield moves');
    assert.equal(pa.status,0,pa.stderr);
    const result=JSON.parse(pa.stdout);
    assert.deepEqual(result.rules,[0,1]);
    assert.deepEqual(result.states,['farmer pushes shield','shield is pushed by farmer','if farmer pushes then shield moves']);
    const no=run('path',model,'farmer lifts shield','if farmer lifts then shield moves');
    assert.equal(no.status,2,no.stderr);
    assert.equal(JSON.parse(no.stdout).solved,false);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
