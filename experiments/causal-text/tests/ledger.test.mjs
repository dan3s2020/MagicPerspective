import test from 'node:test';import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp,mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CausalNet} from '../engine/model.mjs';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=43038,base='http://127.0.0.1:'+PORT;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function launch(dir){
 const child=spawn(process.execPath,['server.mjs'],{cwd:dir,
  env:{...process.env,HOST:'127.0.0.1',PORT:String(PORT)},stdio:['ignore','pipe','pipe']});
 let error='';child.stderr.on('data',x=>error+=String(x));
 for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health')).ok)return child}catch{}await sleep(70)}
 child.kill('SIGTERM');throw Error('Server did not start '+error);
}
async function stop(child){
 if(child.exitCode!==null)return;
 child.kill('SIGTERM');await Promise.race([new Promise(resolve=>child.once('exit',resolve)),sleep(1000)]);
}
async function post(route,payload){
 const res=await fetch(base+'/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify(payload)});
 return {code:res.status,data:await res.json()};
}
async function state(){return (await (await fetch(base+'/api/state')).json())}
async function finished(){
 for(let i=0;i<160;i++){const s=await state();if(!s.training?.running)return s;await sleep(100)}
 throw Error('Training did not finish');
}
test('legacy checkpoint survives upgrade; ledger survives restart and training-world reservations never repeat', {timeout:60000},async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'magic-causal-ledger-'));
 let child=null;
 try{
  for(const name of ['engine','public'])await cp(path.join(source,name),path.join(dir,name),{recursive:true});
  await cp(path.join(source,'server.mjs'),path.join(dir,'server.mjs'));
  await writeFile(path.join(dir,'package.json'),JSON.stringify({type:'module'}));
  await mkdir(path.join(dir,'data'));
  const legacy=new CausalNet(17);legacy.episodes=3818;legacy.steps=3818;legacy.samples=57270;
  const legacyText=JSON.stringify({schema:6,model:legacy.snapshot(),validationQuality:0.125});
  const checkpoint=path.join(dir,'data','best-model.json');
  await writeFile(checkpoint,legacyText);
  child=await launch(dir);
  let s=await state();
  assert.equal(s.model.episodes,3818);
  assert.equal(s.ledger.legacyHistoryUnknown,true);
  assert.equal(s.ledger.legacyCheckpointEpisodes,3818);
  const startIdx=s.ledger.nextWorldIndex;
  assert.ok(startIdx>=1000000);
  assert.equal(await readFile(checkpoint,'utf8'),legacyText,'Startup overwrote legacy checkpoint');
  let r=await post('train',{episodes:17});
  assert.equal(r.code,200);
  s=await finished();assert.equal(s.training.error,null);
  assert.equal(s.ledger.completedEpisodes,17);
  assert.equal(s.ledger.nextWorldIndex,startIdx+17);
  assert.equal(s.ledger.observedExamples,17*15);
  assert.ok(s.ledger.inferredExamples>0);
  const firstSeed=s.lastTraining.trainingSeed;
  await stop(child);child=null;
  child=await launch(dir);
  s=await state();
  assert.equal(s.ledger.completedEpisodes,17);
  assert.equal(s.ledger.nextWorldIndex,startIdx+17);
  assert.equal(s.model.episodes,3818,'Previous selected checkpoint must survive failed retraining');
  r=await post('train',{episodes:9});assert.equal(r.code,200);
  s=await finished();assert.equal(s.training.error,null);
  assert.notEqual(s.lastTraining.trainingSeed,firstSeed);
  assert.equal(s.ledger.completedEpisodes,26);
  assert.equal(s.ledger.nextWorldIndex,startIdx+26);
  assert.equal(s.ledger.observedExamples,26*15);
  // Check that a fresh restart does not silently reset the seed cursor.
  await stop(child);child=null;
  child=await launch(dir);
  s=await state();
  assert.equal(s.ledger.nextWorldIndex,startIdx+26);
  assert.equal(s.ledger.completedRuns,2);
 }finally{
  if(child)await stop(child);
  await rm(dir,{force:true,recursive:true});
 }
});
