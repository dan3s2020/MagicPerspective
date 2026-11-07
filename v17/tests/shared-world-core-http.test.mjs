// Integration fixture tests ORIGINAL V17 worker, no stub brain or fabricated
// hyperdimensional maze. This is NOT a language accuracy benchmark.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const port=()=>new Promise((resolve,reject)=>{
  const server=net.createServer();server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});
});
test('original V17 real text,maze,transform worker shares compact action effect memory and displays frozen A/B in existing UI',
  {timeout:105000},async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'v17-shared-world-live-')),
    src=path.join(home,'corpus.txt'),out=path.join(home,'run'),p=await port();
  fs.writeFileSync(src,[
    'She is happy.','She is tired.','He is tired.','He is calm.'
  ].join('\n\n')+'\n','utf8');
  assert.equal(fs.readFileSync(src,'utf8').includes('She is calm.'),false);
  const host='http://127.0.0.1:'+p;
  const proc=spawn(process.execPath,[
    'transcend/torus-aether/devour/devour.mjs',
    '--workers','1','--arms','stable+many','--worlds','text,maze,transform',
    '--maze-every','250','--gpu','off','--text',src,
    '--out',out,'--port',String(p),'--start','--mem','1',
    '--every','1000','--unified-world'
  ],{cwd:v17,detached:true,stdio:['ignore','pipe','pipe']});
  let logs='';for(const stream of [proc.stdout,proc.stderr])
    stream.on('data',chunk=>logs=(logs+String(chunk)).slice(-13000));
  try{
    let status=null;
    for(let i=0;i<280;i++){
      try{
        const rs=await fetch(host+'/graphs');
        if(rs.ok){
          status=(await rs.json()).graphs[0];
          if(status?.worldCore?.observed.text>=4&&status?.worldCore?.observed.maze>0)break;
        }
      }catch{}
      await wait(120);
    }
    assert.ok(status?.worldCore?.observed.text>=4,
      'Original worker did not train real text edits through same Brain: '+JSON.stringify(status)+' / '+logs);
    assert.ok(status.worldCore.observed.maze>0,
      'Original maze actions did not update same shared graph');
    assert.ok(status.worldCore.rules.some(x=>x.id==='action:move'));
    assert.ok(status.worldCore.rules.some(x=>x.id==='action:replace'));
    assert.ok(status.worldCore.structuralNodes<20);
    assert.equal(status.worldCore.rawPhraseNodes,0);
    const request=async unified=>{
      const url=host+'/language-maze?w=0&start='+encodeURIComponent('She is happy.')+
        '&required='+encodeURIComponent('She,calm')+
        '&local=on&compare=1&unified='+(unified?'on':'off');
      const r=await fetch(url,{method:'POST'});
      assert.ok(r.ok,'/language-maze HTTP failed: '+r.status);return r.json();
    };
    const actual=await request(true);
    assert.ok(!actual.error,JSON.stringify(actual));
    assert.equal(actual.found,true);
    assert.equal(actual.predicted,'She is calm.');
    assert.equal(actual.sharedWorldUsed,true);
    assert.equal(actual.unseen,true);
    assert.equal(actual.comparison?.actuallyCompared,true);
    assert.equal(actual.comparison?.sameStartAndGoal,true);
    assert.equal(actual.comparison?.withShared?.found,true);
    assert.equal(actual.comparison?.withoutShared?.found,true);
    assert.equal(actual.body.semanticValidation,false);
    const baseline=await request(false);
    assert.equal(baseline.sharedWorldUsed,false);
    assert.equal(baseline.found,true);
    const q=await request(true);
    assert.equal(q.predicted,actual.predicted);
    const ui=await(await fetch(host+'/transcend/torus-aether/ui/index.html?live=1')).text();
    for(const id of ['languageMazePane','languageMazeCv','tabTrain','tabLanguageMaze',
       'languageMazeSharedCanvas','languageMazeUnified','languageMazeCompare',
       'languageMazeSharedAblation'])
      assert.ok(ui.includes('id="'+id+'"'),'Original existing GUI lost #'+id);
    const module=await fetch(host+'/transcend/torus-aether/ui/shared-world-view.mjs');
    assert.equal(module.status,200);
    assert.match(await module.text(),/drawSharedWorldCore/);
    const checkpoint=path.join(out,'brains','brain-0-stable+many.v8');
    for(let i=0;i<100&&!fs.existsSync(checkpoint);i++)await wait(120);
    assert.ok(fs.existsSync(checkpoint),'Original real V17 checkpoint absent');
    const restored=Brain.load(checkpoint);
    assert.equal(restored.unifiedEnabled,true);
    assert.ok(restored.worldCore.updates>=status.worldCore.updates);
    assert.strictEqual(restored.constructedPaths.worldCore,restored.worldCore);
    assert.equal(restored.observedTransformations.containsSentence('She is calm.'),false);
  }finally{
    try{process.kill(-proc.pid,'SIGTERM');}catch{try{proc.kill('SIGTERM');}catch{}}
    await wait(150);fs.rmSync(home,{recursive:true,force:true});
  }
});
