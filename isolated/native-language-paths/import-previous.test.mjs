import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
import {ObservedQAAtlas} from './atlas.mjs';
import {LiveResearch} from './live-research.mjs';

test('non-destructive migration preserves existing V17 Brain and source original files',{timeout:25000},()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v17-import-unit-'));
  const old=path.join(root,'previous'),dst=path.join(root,'new');
  fs.mkdirSync(old,{recursive:true});
  const rules={depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false};
  const brain=new Brain({rules,c:{margin:.05,window:400},seed:11});
  for(let i=0;i<20;i++)brain.playMaze(false);
  const input='Q: Where is the archive?\nA: In the library.\n\n';
  brain.beginExercise();
  for(const y of input)brain.live(y.charCodeAt(0));
  brain.chars=input.length;
  brain.save(path.join(old,'brain.v8'));
  const atlas=new ObservedQAAtlas();
  atlas.observe('Where is the archive?','In the library.',0);
  fs.writeFileSync(path.join(old,'atlas.json'),JSON.stringify(atlas.snapshot()));
  fs.writeFileSync(path.join(old,'progress.json'),JSON.stringify({
    source:{root:'test fixture'},nextRow:1,trainingChars:input.length,examples:1,mazeEpisodes:20
  }));
  const previous=fs.readFileSync(path.join(old,'brain.v8'));
  try{
    const program=new URL('./import-previous.mjs',import.meta.url).pathname;
    const p=spawnSync(process.execPath,[program,'--source',old,'--destination',dst],{encoding:'utf8'});
    assert.equal(p.status,0,p.stdout+'\n'+p.stderr);
    assert.deepEqual(fs.readFileSync(path.join(old,'brain.v8')),previous,'source original is unchanged');
    const out=path.join(dst,'brains','brain-0-stable+many.v8');
    const copy=Brain.load(out);
    assert.equal(copy.chars,input.length);
    assert.equal(copy.exercises,1);
    assert.equal(copy.mazes.played,brain.mazes.played);
    const a=LiveResearch.restore(JSON.parse(fs.readFileSync(out+'.research.json','utf8')));
    assert.equal(a.observed,1);
    assert.equal(a.attempts,0,'do not invent prequential scores for old training');
    assert.equal(a.atlas.examples[0].sourceIndex,0);
    const again=spawnSync(process.execPath,[program,'--source',old,'--destination',dst],{encoding:'utf8'});
    assert.notEqual(again.status,0,'a second import must NOT overwrite the first');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
