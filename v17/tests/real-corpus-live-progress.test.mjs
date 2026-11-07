// Acceptance: run the ORIGINAL V17 HTTP server on a finite real text file,
// not a fake response. Check exact per-worker training denominator and truthful
// stream state with CUDA disabled; predicted CUDA text is tested separately.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const getPort=()=>new Promise((resolve,reject)=>{
  const s=net.createServer();
  s.once('error',reject);
  s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});

test('real V17 live REST: dataset fraction, exercise rate, phase and no fabricated GPU sample', {timeout:90000},async()=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v17-real-text-stream-'));
  const corpus=path.join(tmp,'real-paragraphs.txt'),out=path.join(tmp,'runtime');
  const paragraphs=Array.from({length:30},(_,i)=>
    'Q: In the real observed training paragraph '+i+', what was read? '+
    'A: The original V17 organism reads actual words, then observes their continuation.');
  fs.writeFileSync(corpus,paragraphs.join('\n\n')+'\n','utf8');
  const port=await getPort(),host='http://127.0.0.1:'+port;
  const proc=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
    '--workers','1','--arms','stable+many','--worlds','text',
    '--gpu','off','--text',corpus,'--out',out,'--port',String(port),
    '--every','5000000','--mem','2'],{cwd:v17,detached:true,stdio:['ignore','pipe','pipe']});
  let logs='';
  for(const stream of [proc.stdout,proc.stderr])
    stream.on('data',b=>logs=(logs+String(b)).slice(-5500));
  const read=async p=>{
    const r=await fetch(host+p,{cache:'no-store'});
    assert.equal(r.status,200,p);return r.json();
  };
  try{
    let ready=false;
    for(let i=0;i<130;i++){
      try{const r=await fetch(host+'/graphs');if(r.ok){ready=true;break;}}catch{}
      if(proc.exitCode!==null)break;
      await sleep(100);
    }
    assert.ok(ready,'Real native HTTP worker never started: '+logs);
    const first=(await read('/graphs')).graphs[0];
    assert.equal(first.progress.total,27,'30 actual paragraphs minus 3 real held-out');
    assert.equal(first.progress.datasetRows,30);
    assert.equal(first.progress.heldRows,3);
    assert.equal(first.progress.done,0);
    const page=await(await fetch(host+'/transcend/torus-aether/ui/index.html?live=1')).text();
    for(const id of ['realTextLivePane','realTextDatasetProgress','realTextStats',
      'realTextPhase','realTextRecent','textMazeBox','mazeCv','transCv','tabObserve'])
      assert.ok(page.includes('id="'+id+'"'),'New panel must preserve original V17 controls: '+id);
    const stream=await read('/text-stream?w=0');
    assert.equal(stream.sequence,0);
    assert.ok(Array.isArray(stream.events));
    assert.equal(stream.events.length,0,'Do not invent CUDA next-character predictions on a CPU worker');
    assert.ok(typeof stream.phase==='string');
    const go=await fetch(host+'/control?do=start&w=0',{method:'POST'});
    assert.equal(go.status,200);
    let latest=null;
    for(let i=0;i<180;i++){
      const response=await read('/graphs');
      latest=response.graphs[0];
      if(latest.progress.done>0)break;
      await sleep(120);
    }
    assert.ok(latest.progress.done>0,'Real native exercise counter never increased: '+logs);
    assert.ok(latest.progress.percent>0&&latest.progress.percent<=100);
    assert.ok(latest.progress.done<=latest.progress.total);
    assert.ok(latest.progress.exercisesPerSec===null||
      (Number.isFinite(latest.progress.exercisesPerSec)&&latest.progress.exercisesPerSec>=0));
    assert.ok(Number.isFinite(latest.progress.phaseAt));
    console.log('REAL_V17_TEXT_DATASET_LIVE_PROGRESS',JSON.stringify({
      total:latest.progress.total,committed:latest.progress.done,
      fraction:latest.progress.percent,status:latest.status,phase:latest.progress.phase}));
  }finally{
    try{process.kill(-proc.pid,'SIGTERM');}catch{try{proc.kill('SIGTERM');}catch{}}
    await sleep(350);
    fs.rmSync(tmp,{recursive:true,force:true});
  }
});
