import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('actual V17 native server serves original visualizer plus unified shared telemetry and frozen endpoint', {timeout:60000}, async () => {
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v17-unified-http-'));
  const fixture=path.join(tmp,'training.txt'),port=18000+Math.floor(Math.random()*15000);
  fs.writeFileSync(fixture,Array.from({length:13},(_,i)=>'Training paragraph '+i+' has enough symbols to generate real experience across the text and maze worlds.').join('\n\n'));
  const proc=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
    '--workers','1','--arms','stable+many','--worlds','text,maze,transform',
    '--maze-every','100','--every','100000','--chars','4000',
    '--text',fixture,'--out',path.join(tmp,'runs'),'--port',String(port),'--gpu','off','--start'],
    {cwd:v17,stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'1'}});
  let logs='';proc.stdout.on('data',d=>logs+=String(d).slice(-1000));proc.stderr.on('data',d=>logs+=String(d).slice(-1000));
  const base='http://127.0.0.1:'+port;
  try {
    let started=false;
    for(let i=0;i<60;i++){
      if(proc.exitCode!==null)throw Error('V17 exited early: '+logs.slice(-1200));
      try {const r=await fetch(base+'/graphs'); if(r.ok){started=true;break;}}catch{}
      await sleep(250);
    }
    assert.ok(started, 'Native trainer did not start: '+logs.slice(-1000));
    const ui=await fetch(base+'/transcend/torus-aether/ui/index.html?live=1');
    assert.equal(ui.status,200);
    const html=await ui.text();
    assert.match(html,/id="sharedBox"/);assert.match(html,/id="sharedEvalGo"/);
    let snap;
    for(let i=0;i<80;i++){
      const r=await fetch(base+'/graph?w=0');
      if(r.ok){const v=await r.json();if(v.shared){snap=v;break;}}
      await sleep(250);
    }
    assert.ok(snap?.shared,'Shared model status is missing from real V17 graph backend: '+logs.slice(-1200));
    assert.equal(typeof snap.shared.totalObserved,'number');
    // The real HTTP endpoint is ASYNCHRONOUS: POST creates a job and
    // GET /shared-eval-status reports the frozen worker result.
    const ev=await fetch(base+'/shared-eval?w=0',{method:'POST'});
    assert.equal(ev.status,200);
    const accepted=await ev.json();
    assert.ok(Number.isInteger(accepted.id),'A real evaluation job ID is required');
    let response=null;
    for(let i=0;i<80;i++){
      const r=await fetch(base+'/shared-eval-status?id='+accepted.id);
      const current=await r.json();
      if(current.status==='failed'||current.status==='done'){
        response=current;break;
      }
      await sleep(100);
    }
    assert.ok(response,'The real asynchronous evaluation must finish');
    assert.equal(response.status,'failed','GPU-off evaluation must fail closed');
    assert.match(response.error||'',/PyTorch|CUDA|device/i,
      'Without a configured GPU, frozen evaluation must not claim CUDA success');
  } finally {
    proc.kill('SIGTERM');
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
