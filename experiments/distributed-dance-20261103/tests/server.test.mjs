import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {spawn} from 'node:child_process';
import {setTimeout as sleep} from 'node:timers/promises';
const serverPath=new URL('../server.mjs',import.meta.url).pathname;
async function waitFor(url,limit=8000){const start=Date.now();while(Date.now()-start<limit){try{const x=await fetch(url);if(x.ok)return x.json();}catch{}await sleep(60);}throw Error('Server did not become ready');}
const request=async(root,route,body)=>{const result=await fetch(root+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await result.json();if(!result.ok)throw Error(data.error);return data;};
const launch=(port,dir)=>spawn(process.execPath,[serverPath],{env:{...process.env,DATA_DIR:dir,PORT:String(port),HOST:'127.0.0.1'},stdio:['ignore','pipe','pipe']});
const kill=async child=>{if(child.exitCode===null){child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(2000)]);} };
test('infinite training can pause, persist on disk, restart and resume without losing state', {timeout:35000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'mp-dance-'));const port=32000+Math.floor(Math.random()*1500),root=`http://127.0.0.1:${port}`;
 let a=launch(port,dir),b;
 try{
  await waitFor(root+'/api/health');
  let s=await request(root,'/api/train/start',{n:21,saveEvery:2,throttleMs:0});
  assert.equal(s.trainer.status,'running');
  const start=Date.now();
  do{await sleep(80);s=await request(root,'/api/state');}while(s.trainer.episodes<5&&Date.now()-start<9000);
  assert.ok(s.trainer.episodes>=5,'training did not advance');
  s=await request(root,'/api/train/pause',{});assert.equal(s.trainer.status,'paused');
  const frozenCount=s.trainer.episodes;
  await sleep(120);s=await request(root,'/api/state');assert.equal(s.trainer.episodes,frozenCount);
  const saved=JSON.parse(await readFile(path.join(dir,'latest.json'),'utf8'));
  assert.equal(saved.trainer.episodes,frozenCount);assert.ok(saved.rule.updates>0);
  await kill(a);
  b=launch(port,dir);await waitFor(root+'/api/health');s=await request(root,'/api/state');
  assert.equal(s.trainer.episodes,frozenCount);assert.equal(s.trainer.status,'paused');
  await request(root,'/api/train/resume',{n:21,saveEvery:2,throttleMs:0});
  const resumedAt=Date.now();do{await sleep(80);s=await request(root,'/api/state');}while(s.trainer.episodes<=frozenCount&&Date.now()-resumedAt<9000);
  assert.ok(s.trainer.episodes>frozenCount);
  s=await request(root,'/api/train/stop',{});assert.equal(s.trainer.status,'stopped');
  const cp=await request(root,'/api/export');assert.ok(cp.rule.updates>0);
  const result=await request(root,'/api/test',{count:6,n:21});assert.ok(result.lastTest.modes.real);
 }finally{await kill(a);if(b)await kill(b);await rm(dir,{recursive:true,force:true});}
});
