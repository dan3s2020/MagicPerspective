import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=43036,origin='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function post(endpoint,arg){
 const res=await fetch(origin+'/api/'+endpoint,{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(arg)});
 return {status:res.status,data:await res.json()};
}
test('V6 HTTP server: real train progress, blind test, text goal and isolated reset', {timeout:45000},async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:dir,env:{...process.env,PORT:String(port),HOST:'127.0.0.1'},
  stdio:['ignore','pipe','pipe']});
 let logs='';child.stderr.on('data',data=>logs+=String(data));
 try{
  let ok=false;
  for(let i=0;i<50;i++){try{ok=(await fetch(origin+'/api/health')).ok;if(ok)break}catch{}await sleep(100)}
  assert.ok(ok,'Server startup failed: '+logs);
  const html=await (await fetch(origin+'/')).text();
  assert.ok(html.includes('id="learning"'));
  const s=await (await fetch(origin+'/api/state')).json();
  assert.equal(s.version,'6.0.0-experiment');assert.equal(s.scene.probes.length,9);
  let response=await post('train',{episodes:12});
  assert.equal(response.status,200);assert.equal(response.data.started,true);
  let state;
  for(let i=0;i<180;i++){
   state=await (await fetch(origin+'/api/state')).json();
   if(!state.training?.running)break;
   await sleep(100);
  }
  assert.ok(!state.training.running,'Training did not complete in test budget');
  assert.equal(state.training.error,null);
  // Active checkpoint is selected at the BEST validation episode (e.g. 10), not necessarily episode 12.
  assert.equal(state.lastTraining.episodes,12);
  assert.ok(state.model.episodes>=1&&state.model.episodes<=12);
  assert.ok(state.training.history.length>=1);
  response=await post('evaluate',{worlds:3});
  assert.equal(response.status,200);
  assert.ok(response.data.evaluation.modes.learned);
  response=await post('plan',{});
  assert.equal(response.status,200);
  assert.ok(response.data.scene.demonstration);
  response=await post('new',{seed:1948});assert.equal(response.status,200);
  assert.equal(response.data.scene.seed,1948);
  response=await post('reset',{confirm:'WRONG'});assert.equal(response.status,400);
  response=await post('reset',{confirm:'RESET V6'});assert.equal(response.status,200);
  assert.equal(response.data.model.episodes,0);
 }finally{
  child.kill('SIGTERM');
  await Promise.race([new Promise(r=>child.once('exit',r)),sleep(1000)]);
 }
});
test('UI buttons have real callbacks and progress chart is live',async()=>{
 const h=await readFile(path.join(dir,'public/index.html'),'utf8');
 const j=await readFile(path.join(dir,'public/app.js'),'utf8');
 for(const id of ['train','cancel','evaluate','new','reset','plan']){
  assert.ok(h.includes('id="'+id+'"'),'Missing '+id);
  assert.ok(j.includes("$('"+id+"').onclick"),'Inert control '+id);
 }
 assert.ok(j.includes('setInterval(poll,650)'));
 assert.ok(j.includes('validationExact')&&j.includes('validationPlan'));
});
