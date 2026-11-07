// Acceptance: ACTUAL original V17 training server, not a demo API.
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
async function read(url){
 const r=await fetch(url,{cache:'no-store'});
 assert.equal(r.status,200,'HTTP '+r.status+' for '+url);
 return r.json();
}
test('Original native V17 live panel has correctly synchronized CPU/CUDA counters, real chronology, full observatory, and nonblocking shared eval', {timeout:110000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'magic-observatory-'));
 const corpus=path.join(tmp,'observations.txt'),out=path.join(tmp,'runtime');
 const paragraphs=Array.from({length:110},(_,i)=>[
   'She is happy.','She is tired.','He is tired.','He is calm.',
   'The explorer moves. The door opens. The explorer moves again.',
   'The path changed after the new observation. The organism checks its prediction.'
 ][i%6]);
 fs.writeFileSync(corpus,paragraphs.join('\n\n')+'\n','utf8');
 const port=await getPort(),host='http://127.0.0.1:'+port;
 const proc=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
   '--workers','1','--arms','stable+many','--worlds','text',
   '--gpu','off','--text',corpus,'--out',out,'--port',String(port),
   '--every','20000','--mem','2'],{
     cwd:v17,detached:true,stdio:['ignore','pipe','pipe']
   });
 let logs='';
 for(const stream of [proc.stdout,proc.stderr])
   stream.on('data',b=>logs=(logs+String(b)).slice(-6000));
 try{
  let ready=false;
  for(let i=0;i<130;i++){
    try{const r=await fetch(host+'/graphs');if(r.ok){ready=true;break;}}catch{}
    if(proc.exitCode!==null)break;
    await sleep(90);
  }
  assert.ok(ready,'Native V17 server failed to start: '+logs);
  const html=await(await fetch(host+'/transcend/torus-aether/ui/index.html?live=1')).text();
  for(const name of ['tabTrain','tabEval','tabObserve','observePane','obsCanvas',
      'obsCanvasAux','obsStats','obsHealth','obsDetails','observedTransformBox',
      'sharedEvalGo','constructedBox','agentNoiseBox'])
    assert.ok(html.includes('id="'+name+'"'),'Missing native UI control '+name);
  const obsJs=await fetch(host+'/transcend/torus-aether/ui/observatory.js');
  assert.equal(obsJs.status,200,'Actual observatory module not served by original server');
  const observable=await obsJs.text();
  assert.match(observable,/class Observatory/);
  assert.match(observable,/spectrum/);
  let initial=null;
  for(let i=0;i<120;i++){
    const v=await read(host+'/graphs');
    if(v.graphs[0]?.snapshotAt>0){initial=v;break;}
    await sleep(90);
  }
  assert.ok(initial,'Original paused worker never published its FIRST real snapshot: '+logs);
  assert.equal(initial.graphs[0].w,0);
  let graph=await read(host+'/graph?w=0');
  assert.ok(Array.isArray(graph.nodes));
  assert.equal(initial.graphs[0].chars,graph.chars);
  // A real shared CUDA evaluation on a CPU-only organism should fail with
  // EXPLICIT evidence, without hanging a browser POST for 180 seconds.
  const start=Date.now();
  const job=await fetch(host+'/shared-eval?w=0',{method:'POST',cache:'no-store'});
  assert.equal(job.status,200);
  const ack=await job.json();
  assert.ok(Number.isInteger(ack.id),'Evaluation must return actual job identifier');
  assert.ok(Date.now()-start<5000,'Eval POST blocked instead of acknowledging job');
  let status=null;
  for(let i=0;i<60;i++){
    status=await read(host+'/shared-eval-status?id='+ack.id);
    if(status.status!=='running')break;
    await sleep(100);
  }
  assert.equal(status.status,'failed','GPU-off model evaluation must not be misreported as passing');
  assert.match(status.error,/PyTorch device|CUDA|GPU|Shared head/);
  // Training runs only after explicit user start, preserving old controls.
  assert.ok((await read(host+'/graphs')).graphs[0].chars===0);
  const go=await fetch(host+'/control?do=start&w=0',{method:'POST'});
  assert.equal(go.status,200);
  let live=null;
  for(let i=0;i<250;i++){
    live=(await read(host+'/graphs')).graphs[0];
    if(live.chars>60&&live.snapshotAt>initial.graphs[0].snapshotAt)break;
    await sleep(120);
  }
  assert.ok(live.chars>60,'Text never trained in original worker: '+logs);
  assert.ok(live.snapshotAt>initial.graphs[0].snapshotAt,'GPU/CPU snapshot stopped updating');
  const t=await read(host+'/telemetry?w=0');
  assert.equal(t.w,0);
  assert.ok(t.points.length>=2,'No real trajectory samples in telemetry');
  for(let i=1;i<t.points.length;i++)
    assert.ok(t.points[i].at>=t.points[i-1].at,'Time was not monotonic');
  assert.ok(t.points.some(x=>x.chars>0),'Telemetry values are not grounded in actual corpus training');
  assert.ok(t.points.some(x=>x.nodes>0),'No actual graph nodes counted');
  assert.ok((await read(host+'/graph?w=0')).chars>=t.points.at(-1).chars,
    'Snapshot counter must never decrease behind recorded telemetry');
  const final=await read(host+'/graphs');
  assert.ok(final.graphs[0].chars>=t.points.at(-1).chars,
    'Graph card counter must never decrease behind recorded telemetry');
  assert.ok(final.graphs[0].lived>=0);
  assert.ok(final.graphs[0].nodeCount>0);
  assert.ok(final.graphs[0].edgeCount>=0);
  const later=await read(host+'/telemetry?w=0&after='+t.points.at(-1).at);
  assert.ok(later.points.every(x=>x.at>t.points.at(-1).at));
  assert.ok(Array.isArray(t.observedTransformations?.topOperators));
  const p=await fetch(host+'/control?do=pause&w=0',{method:'POST'});
  assert.equal(p.status,200);
  let paused=(await read(host+'/graphs')).graphs[0];
  // A small real corpus can finish while a control request is in flight.
  // Distinguish a clean final worker report from an unexplained worker exit;
  // never label a crash as a successful training completion.
  for(let i=0;i<20&&paused.status==='oprit'&&!paused.final;i++){
    await sleep(100);
    paused=(await read(host+'/graphs')).graphs[0];
  }
  assert.ok(['pauză','gata'].includes(paused.status) ||
    (paused.status==='oprit'&&paused.final===true),
    'Worker neither paused nor published an authenticated final snapshot: '+
    JSON.stringify({status:paused.status,final:paused.final,chars:paused.chars}));
  assert.ok(paused.chars>=live.chars);
  console.log('REAL_V17_OBSERVABILITY '+JSON.stringify({
    trainingChars:paused.chars,graphEvents:paused.lived,
    snapshots:t.points.length,operators:t.observedTransformations.learnedOperators,
    frozenEvalWhenGpuOff:status.status,
    originalUI:true,nonblockingEval:true}));
 }finally{
  try{process.kill(-proc.pid,'SIGTERM');}catch{try{proc.kill('SIGTERM');}catch{}}
  await sleep(300);
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
