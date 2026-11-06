// Exercise the actual V17 server and Python text engine with tiny bounded batches.
// NumPy intentionally verifies the protocol on CI; the user's NVIDIA CUDA remains hardware-specific.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('auto-start trains the first bounded text batch and populates the original living graph', {timeout:120000}, async () => {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v17-gpu-text-start-'));
  const fixture=path.join(dir,'training.txt'),port=30000+Math.floor(Math.random()*15000);
  fs.writeFileSync(fixture,Array.from({length:13},(_,i)=>
    'Training paragraph '+i+' contains symbols and repeated words, enabling observable CUDA-style text-card alignment.').join('\n\n'));
  const args=['transcend/torus-aether/devour/devour.mjs','--workers','1','--arms','stable+many',
    '--worlds','text,maze,transform','--maze-every','999999','--every','60000','--chars','400',
    '--text',fixture,'--out',path.join(dir,'runs'),'--port',String(port),
    '--gpu','numpy','--gpu-worlds','2','--gpu-text-batch','2','--start'];
  const proc=spawn(process.execPath,args,{cwd:v17,stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
  let logs='';for(const stream of [proc.stdout,proc.stderr])stream.on('data',d=>{logs=(logs+String(d)).slice(-16000);});
  const base='http://127.0.0.1:'+port;
  try{
    let graph=null;const deadline=Date.now()+95000;
    while(Date.now()<deadline){
      if(proc.exitCode!==null)throw Error('V17 unexpectedly exited: '+logs.slice(-1800));
      try{
        const a=await fetch(base+'/graphs'),b=await fetch(base+'/graph?w=0');
        if(a.ok&&b.ok){
          const info=await a.json(),snap=await b.json();
          assert.equal(info.gpu.textBatch,2,'explicit text batch must be independent of GPU maze worlds');
          if(snap.chars>0&&snap.lived>0&&snap.nodes?.length&&snap.gpu?.text?.batch===2){graph=snap;break;}
        }
      }catch(e){if(e?.code==='ERR_ASSERTION')throw e;}
      await sleep(450);
    }
    assert.ok(graph,'No committed GPU text batch or visible graph after auto-start: '+logs.slice(-3000));
    assert.ok(graph.lived>0);
    assert.ok(graph.gpu.text.cardMs>=0);
    const ui=await fetch(base+'/transcend/torus-aether/ui/index.html?live=1');
    assert.equal(ui.status,200);
    assert.match(await ui.text(),/id="gpuTextBatch"/);
  }finally{
    proc.kill('SIGTERM');
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
