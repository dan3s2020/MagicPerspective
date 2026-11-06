import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const server=path.resolve(dirname,'../devour/devour.mjs');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){
 const sock=net.createServer();
 await new Promise((resolve,reject)=>sock.once('error',reject).listen(0,'127.0.0.1',resolve));
 const port=sock.address().port;
 await new Promise(resolve=>sock.close(resolve));
 return port;
}
test('an ORIGINAL V17 text worker emits independent backend heartbeat on a real HTTP endpoint',
 {timeout:45000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mp-live-telemetry-'));
 const textFile=path.join(tmp,'world.txt'),out=path.join(tmp,'checkpoints');
 // Real original V17 CPU training, with enough paragraphs to keep the worker alive.
 const paragraphs=Array.from({length:120},(_,i)=>'Q: Which sequence is repeated in observed world '+i+'? A: alpha beta gamma delta '+('X'.repeat(180))+' and omega.');
 fs.writeFileSync(textFile,paragraphs.join('\n\n'));
 const port=await freePort();
 const child=spawn(process.execPath,[server,'--workers','1','--arms','stable+many',
  '--text',textFile,'--out',out,'--port',String(port),'--gpu','off',
  '--worlds','text','--every','200000','--start'],{
   cwd:path.resolve(dirname,'../../..'),stdio:['ignore','pipe','pipe']
  });
 let logs='';
 for(const pipe of [child.stdout,child.stderr])pipe.on('data',d=>{logs=(logs+d.toString()).slice(-30000);});
 try{
  let sample=null;
  for(let i=0;i<90;i++){
   if(child.exitCode!==null)throw Error('V17 native server exited '+child.exitCode+' '+logs.slice(-2000));
   await delay(250);
   try{
    const r=await fetch('http://127.0.0.1:'+port+'/telemetry?w=0');
    if(!r.ok)continue;
    const data=await r.json();
    if(data.available&&data.telemetry){sample=data;break;}
   }catch{}
  }
  assert.ok(sample,'No real original V17 telemetry after 22.5s; '+logs.slice(-2000));
  const t=sample.telemetry;
  assert.equal(t.type,'telemetry');
  assert.equal(t.w,0);
  assert.ok(t.observedAt>0);
  assert.ok(t.phase&&typeof t.phase.phase==='string');
  assert.equal(t.gpuDevice,'off');
  assert.ok(Number.isFinite(t.chars));
  assert.ok(Number.isFinite(t.textCharsPerSecond));
  assert.ok(Number.isFinite(t.heapMB));
  // Existing native API contract stays functional.
  const r=await fetch('http://127.0.0.1:'+port+'/graphs');
  assert.equal(r.status,200);
  const graphs=await r.json();
  assert.equal(graphs.graphs[0].w,0);
  assert.equal(graphs.graphs[0].progress.type,'telemetry');
 }finally{
  child.kill('SIGTERM');
  await delay(350);
  if(child.exitCode===null)child.kill('SIGKILL');
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
