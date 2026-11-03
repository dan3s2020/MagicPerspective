import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=43044,base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function post(route,body){
 const r=await fetch(base+'/api/'+route,{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 return {status:r.status,body:await r.json()};
}
async function state(){return (await (await fetch(base+'/api/state')).json())}
async function awaitStop(limit=12000){
 const start=Date.now();
 while(Date.now()-start<limit){
  const s=await state();if(s.run.status!=='running')return s;
  await sleep(75);
 }
 throw Error('Timed out waiting for trainer');
}
test('real HTTP training, checkpoint library, reload, blind tests and live graph payload; original UI files still exist',{timeout:95000},async()=>{
 const home=await mkdtemp(path.join(tmpdir(),'magic-brain-studio-'));
 let child=null;
 const start=async()=>{
  child=spawn(process.execPath,['server.mjs'],{cwd,
   env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:home},
   stdio:['ignore','pipe','pipe']});
  let errors='';child.stderr.on('data',chunk=>errors+=String(chunk));
  for(let i=0;i<100;i++){
   try{if((await fetch(base+'/api/health')).ok)return}catch{}
   await sleep(75);
  }
  throw Error('Server failed to start: '+errors);
 };
 const stop=async()=>{
  if(!child)return;const p=child;child=null;p.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>p.once('exit',resolve)),sleep(3000)]);
 };
 try{
  await start();
  let r=await fetch(base+'/');assert.equal(r.status,200);
  const html=await r.text();
  for(const control of ['brain-list','create','save','import','export','start','pause','resume','stop',
   'test','learner-canvas','truth-canvas','function-canvas','neural-canvas','learning-canvas']){
   assert.ok(html.includes('id="'+control+'"'),'Missing UI control '+control);
  }
  let s=await state();
  assert.equal(s.kind,'universal');assert.equal(s.model.episodes,0);
  assert.equal(s.functionCurve.length,41);
  r=await post('start',{episodes:7,domains:['maze','network','text'],delayMs:0,
   autosaveEvery:2,previewEvery:1,size:11,resetRun:true});
  assert.equal(r.status,200);assert.equal(r.body.started,true);
  s=await awaitStop();
  assert.equal(s.model.episodes,7);
  assert.equal(s.model.updates,7);
  assert.equal(s.run.done,7);
  assert.ok(s.preview.frames.length>0);
  assert.ok(s.preview.meta.positions.length>0);
  assert.ok(s.history.length>0);
  assert.ok(Number.isFinite(s.timing.elapsedSeconds));
  r=await post('brains/save',{label:'My seven-episode brain'});
  assert.equal(r.status,200);
  assert.ok(r.body.id.startsWith('saved:'));
  const selectedId=r.body.id;
  const before=s.model.weights.W1;
  await stop();await start();
  s=await state();
  assert.equal(s.model.episodes,7,'Last autosave not restored');
  assert.deepEqual(s.model.weights.W1,before);
  r=await post('brains/select',{id:selectedId});
  assert.equal(r.status,200);
  assert.equal(r.body.model.episodes,7);
  r=await post('brains/new',{kind:'graph'});assert.equal(r.status,200);
  assert.equal(r.body.kind,'graph');
  r=await post('start',{episodes:5,domains:['network'],size:11,delayMs:0,
   autosaveEvery:2,previewEvery:1,resetRun:true});
  assert.equal(r.status,200);
  s=await awaitStop();
  assert.equal(s.model.episodes,5);
  assert.equal(s.preview.meta.domain,'network');
  const list=await (await fetch(base+'/api/brains')).json();
  assert.ok(list.brains.some(b=>b.id===selectedId));
  r=await post('brains/select',{id:selectedId});assert.equal(r.status,200);
  r=await post('test',{count:3,size:11,domains:['maze','network','text']});
  assert.equal(r.status,200);
  assert.ok(r.body.lastTest.domains.network);
  const snapshot=await (await fetch(base+'/api/export')).json();
  assert.equal(snapshot.brain.schema,1);
  r=await post('brains/import',{content:JSON.stringify(snapshot),label:'Imported Universal'});
  assert.equal(r.status,200);
  assert.ok(r.body.id.startsWith('saved:'));
  r=await post('start',{episodes:0,unlimited:true,size:11,delayMs:40,
    autosaveEvery:2,previewEvery:1,domains:['maze','network','text']});
  assert.equal(r.status,200);
  await sleep(240);
  r=await post('pause',{});assert.equal(r.status,200);
  assert.equal(r.body.run.status,'paused');
  assert.ok(r.body.run.done>0);
  const active=JSON.parse(await readFile(path.join(home,'active.json'),'utf8'));
  assert.equal(active.snapshot.schema,1);
 }finally{await stop();await rm(home,{recursive:true,force:true})}
});
