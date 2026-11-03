import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,cp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PerspectiveNet,CausalModel,features} from '../../v3/engine/model.mjs';
import {blankBelief} from '../../v3/engine/world.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const port=40336,base='http://127.0.0.1:'+port;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('V3 failed validation keeps an existing online brain instead of rolling back to older best', {timeout:40000},async()=>{
 const temp=await mkdtemp(path.join(tmpdir(),'magic-v3-'));
 // Isolated copied server; never touch a user's real v3/data checkpoints.
 const original=path.join(root,'v3');
 await cp(path.join(original,'engine'),path.join(temp,'engine'),{recursive:true});
 await cp(path.join(original,'public'),path.join(temp,'public'),{recursive:true});
 await cp(path.join(original,'server.mjs'),path.join(temp,'server.mjs'));
 await writeFile(path.join(temp,'package.json'),JSON.stringify({type:'module'}));
 await mkdir(path.join(temp,'data'));
 const causal=new CausalModel(),oldBest=new PerspectiveNet(17),live=new PerspectiveNet(17);
 const x=features(blankBelief(7),7,8,40,18);
 live.adapt(x,'wall',1);
 const oldCount=live.onlineUpdates;
 await writeFile(path.join(temp,'data','best-checkpoint.json'),JSON.stringify({
  schema:3,model:oldBest.snapshot(),causal:causal.snapshot(),validationBCE:0,
  info:{test:true}
 }));
 await writeFile(path.join(temp,'data','live-checkpoint.json'),JSON.stringify({
  schema:3,model:live.snapshot(),causal:causal.snapshot(),saved:'test'
 }));
 let stderr='';
 const child=spawn(process.execPath,['server.mjs'],{cwd:temp,
  env:{...process.env,HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
 child.stderr.on('data',b=>{stderr+=String(b)});
 try{
  let ok=false;for(let i=0;i<50;i++){try{ok=(await fetch(base+'/api/health')).ok;if(ok)break}catch{}await sleep(100)}
  assert.ok(ok,'V3 failed to start: '+stderr);
  const before=await (await fetch(base+'/api/state')).json();
  assert.equal(before.model.neuralOnlineUpdates,oldCount);
  assert.equal(before.runInfo.restoredLive,true);
  let response=await fetch(base+'/api/train',{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify({episodes:1,n:7,lr:.0001,seed:123456})});
  assert.equal(response.status,200);
  let after=null;
  for(let i=0;i<100;i++){
   after=await (await fetch(base+'/api/state')).json();
   if(after.task?.completed)break;
   await sleep(100);
  }
  assert.ok(after?.task?.completed,'V3 training failed to complete');
  assert.equal(after.task.error,null);
  assert.equal(after.runInfo.promoted,false);
  assert.equal(after.runInfo.livePreserved,true);
  assert.equal(after.model.neuralOnlineUpdates,oldCount);
 }finally{
  child.kill('SIGTERM');
  await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(1000)]);
  await rm(temp,{recursive:true,force:true});
 }
});
