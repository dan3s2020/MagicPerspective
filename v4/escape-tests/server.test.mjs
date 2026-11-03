import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=40334,base='http://127.0.0.1:'+PORT;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function post(route,body){
 const response=await fetch(base+'/api/'+route,{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const json=await response.json();return {status:response.status,json};
}
test('standalone Escape server has functional full flow and isolated reset', {timeout:30000},async()=>{
 const child=spawn(process.execPath,['escape-server.mjs'],{
  cwd:root,env:{...process.env,HOST:'127.0.0.1',PORT:String(PORT)},stdio:['ignore','pipe','pipe']
 });
 let logs='';child.stderr.on('data',data=>{logs+=String(data)});
 try{
  let ready=false;
  for(let k=0;k<50;k++){
   try{const response=await fetch(base+'/api/health');ready=response.ok;if(ready)break}catch{}
   await sleep(100);
  }
  assert.ok(ready,'Server failed to start: '+logs);
  let r=await fetch(base+'/');assert.equal(r.status,200);
  const html=await r.text();assert.ok(html.includes('id="truth"'));
  r=await fetch(base+'/app.js');assert.equal(r.status,200);
  let state=(await (await fetch(base+'/api/state')).json());
  assert.equal(state.projection.observed.length,0);
  for(const view of ['front','side','top']){
   const got=await post('view',{view});assert.equal(got.status,200);
  }
  state=(await (await fetch(base+'/api/state')).json());
  assert.equal(state.projection.observed.length,3);
  assert.equal(state.projection.learned.scenes>=1,true);
  let result=await post('train',{scenes:40});assert.equal(result.status,200);
  assert.ok(result.json.projection.learned.scenes>=40);
  result=await post('evaluate',{count:15,ruleWorlds:12});
  assert.equal(result.status,200);assert.ok(result.json.evaluation.projection.accuracy>.9);
  result=await post('rule',{action:'amber'});assert.equal(result.status,200);
  assert.equal(result.json.rules.events.length,1);
  result=await post('plan-rule',{goal:9});assert.equal(result.status,200);
  assert.ok(result.json.rules.plan);
  result=await post('chemistry',{inventory:{water:4},goal:'ethanol'});
  assert.equal(result.status,200);assert.equal(result.json.chemistry.possible,false);
  result=await post('chemistry',{inventory:{glucose:1,water:1},goal:'ethanol'});
  assert.equal(result.status,200);assert.equal(result.json.chemistry.possible,true);
  result=await post('reset',{confirm:'bad'});assert.equal(result.status,400);
  result=await post('reset',{confirm:'RESET ESCAPE'});assert.equal(result.status,200);
  assert.equal(result.json.projection.learned.scenes,0);
 }finally{child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(1000)])}
});
