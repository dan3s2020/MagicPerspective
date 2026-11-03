import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const serverURL=new URL('../server.mjs',import.meta.url);
async function boot(port,dir){const child=spawn(process.execPath,[serverURL.pathname],{env:{...process.env,PORT:String(port),DATA_DIR:dir},stdio:'ignore'});
 for(let i=0;i<120;i++){
  if(child.exitCode!==null)throw Error('server exited early '+child.exitCode);
  try{const r=await fetch('http://127.0.0.1:'+port+'/api/health');if(r.ok)return child;}catch{}
  await delay(45);
 }child.kill('SIGKILL');throw Error('Server did not boot');}
async function stop(child){if(child.exitCode!==null)return;child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),delay(4000)]);if(child.exitCode===null)child.kill('SIGKILL');}
async function api(port,route,payload){const r=await fetch('http://127.0.0.1:'+port+'/api/'+route,{method:payload?'POST':'GET',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});return {status:r.status,data:await r.json()};}

test('train infinity, pause, atomic save, restart and resume from same weights and counter',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'mp-dyn-'));const port=34800+(process.pid%1000);
 let child;try{child=await boot(port,dir);
  assert.equal((await api(port,'train/reset',{confirm:'NO'})).status,400);
  assert.equal((await api(port,'health')).status,200);
  let s=(await api(port,'train/start',{n:24,throttleMs:1,saveEvery:3})).data;
  let count=0;for(let i=0;i<150;i++){
   await delay(45);s=(await api(port,'state')).data;if(s.trainer.episodes>=4){count=s.trainer.episodes;break;}
  }assert.ok(count>=4,'Infinite training did not advance');
  const streamed=await api(port,'train/live?since=0&limit=3');
  assert.equal(streamed.status,200);
  assert.ok(streamed.data.traces.length>0);
  const frames=streamed.data.traces.at(-1).frames;
  assert.ok(frames.length>1);
  assert.ok(Array.isArray(frames[0].links),'Learner-owned topology in replay');
  assert.ok(Array.isArray(frames[0].truthLinks),'Separate evaluator-only topology in replay');
  assert.ok(Number.isFinite(streamed.data.diagnostics.baselineShapeF1));
  s=(await api(port,'train/pause',{})).data;
  assert.equal(s.trainer.status,'paused');const old=s.trainer.episodes,weights=s.model.parameters;
  assert.ok(old>=4);const disk=JSON.parse(await readFile(path.join(dir,'latest.json'),'utf8'));
  assert.equal(disk.trainer.episodes,old);assert.deepEqual(disk.brain,weights);
  await stop(child);child=await boot(port,dir);
  s=(await api(port,'state')).data;assert.equal(s.trainer.status,'paused');assert.equal(s.trainer.episodes,old);
  assert.deepEqual(s.model.parameters,weights);
  const restoredReplay=await api(port,'train/live?since=0&limit=3');
  assert.ok(restoredReplay.data.traces.length>0,'Saved real episode replay restored');
  s=(await api(port,'train/resume',{n:24,throttleMs:1,saveEvery:3})).data;
  for(let i=0;i<100;i++){await delay(50);s=(await api(port,'state')).data;if(s.trainer.episodes>old+1)break;}
  assert.ok(s.trainer.episodes>old+1);
  s=(await api(port,'train/stop',{})).data;assert.equal(s.trainer.status,'stopped');assert.ok(s.trainer.episodes>old);
  const testResponse=await api(port,'test',{count:6,n:24});assert.equal(testResponse.status,200);
  assert.ok(testResponse.data.lastTest.modes.learned);
  assert.equal((await api(port,'export')).data.brain.schema,2);
  const page=await fetch('http://127.0.0.1:'+port+'/');assert.equal(page.status,200);assert.match(await page.text(),/Dynamic Perspective/);
  const asset=await fetch('http://127.0.0.1:'+port+'/app.js');assert.equal(asset.status,200);
 }finally{if(child)await stop(child);await rm(dir,{recursive:true,force:true});}
},{timeout:35000});
