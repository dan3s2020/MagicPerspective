// POSIX/Termux-compatible V17 launch check. Uses real native Node brain and HTTP UI.
import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const v17 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(v17, 'RUN_TERMUX_V17.sh');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('POSIX Termux launcher provides help and refuses missing text input', () => {
  const help = spawnSync('sh', [script, '--help'], {cwd:v17, encoding:'utf8'});
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /--text/);
  assert.match(help.stdout, /NO CUDA/);
  const missing = spawnSync('sh', [script, '--text', '/no/such/termux-corpus.txt'], {cwd:v17, encoding:'utf8'});
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /Text file missing/);
});

test('native Termux CPU launch serves the original UI; Start trains in same brain', {timeout:120000}, async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-termux-smoke-'));
  const fixture = path.join(tmp, 'corpus.txt'), out = path.join(tmp, 'runtime');
  fs.writeFileSync(fixture, Array.from({length:30}, (_,i)=>
    'Training exercise '+i+' transforms an observed token sequence and repeats a measurable symbolic relation.').join('\n\n'));
  const port=25000+Math.floor(Math.random()*11000);
  const proc = spawn('sh', [script, '--text',fixture,'--worlds','text,maze,transform',
    '--out',out,'--port',String(port),'--mem','0.65','--every','10000',
    '--maze-every','700','--chars','1500','--paused'],
    {cwd:v17, env:{...process.env, PREFIX:'/data/data/com.termux/files/usr'},
      detached: true, stdio:['ignore','pipe','pipe']});
  let logs = '';
  for (const stream of [proc.stdout, proc.stderr]) stream.on('data', d=> {logs=(logs+String(d)).slice(-10000);});
  const base = 'http://127.0.0.1:'+port;
  try {
    let ready=false;
    for(let i=0;i<100;i++){
      if(proc.exitCode!==null) throw Error('Native Termux launcher exited: '+logs);
      try{
        const r=await fetch(base+'/graphs');
        if(r.ok){
          const j=await r.json();
          assert.equal(j.gpu.device,'off');
          assert.deepEqual(j.worlds,['text','maze','transform']);
          ready=true;break;
        }
      }catch(e){if(e.name==='AssertionError')throw e;}
      await sleep(200);
    }
    assert.ok(ready,'No original V17 server: '+logs);
    const ui=await fetch(base+'/transcend/torus-aether/ui/index.html?live=1');
    assert.equal(ui.status,200);
    const html = await ui.text();
    assert.match(html,/sharedBox/);
    assert.match(html,/agentNoiseBox/);
    const start=await fetch(base+'/control?do=start&w=0',{method:'POST'});
    assert.equal((await start.json()).ok,true);
    let trained=false;
    for(let i=0;i<120;i++){
      if(proc.exitCode!==null)throw Error('Native Termux trainer exited: '+logs);
      const r=await fetch(base+'/graph?w=0');
      if(r.ok){const j=await r.json();if(j.chars>0&&j.lived>0&&j.shared&&j.endogenousNoise?.decisions>0){trained=true;break;}}
      await sleep(250);
    }
    assert.ok(trained,'No real CPU learning or endogenous noise decisions in native V17: '+logs);
  }finally{
    // Kill the *whole* POSIX process group: the shell starts a child Node
    // server, which otherwise survives killing only the shell and pins CI.
    try { process.kill(-proc.pid, 'SIGTERM'); } catch { try { proc.kill('SIGTERM'); } catch {} }
    await sleep(250);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
