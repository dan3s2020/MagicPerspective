import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdtempSync,rmSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validateWorldSource} from '../transcend/torus-aether/devour/world-source.mjs';

test('new worlds MUST match the source configured when the trainer started',()=>{
 const none={kind:'none'};
 assert.equal(validateWorldSource(['maptext'],none),true);
 assert.equal(validateWorldSource(['maze','transform','code','maptext'],none),true);
 assert.throws(()=>validateWorldSource(['text'],none),/without a text dataset/);
 assert.throws(()=>validateWorldSource(['maptext','text'],none),/without a text dataset/);
 assert.throws(()=>validateWorldSource([],none),/at least one world/);
 assert.throws(()=>validateWorldSource(['unknown'],none),/Unknown world/);
 assert.throws(()=>validateWorldSource(['text'],{kind:'text'}),/without a text dataset/);
 assert.throws(()=>validateWorldSource(['text'],{kind:'text',files:[],heldSet:[]}),/without a text dataset/);
 assert.equal(validateWorldSource(['text','maptext'],{kind:'text',files:['/tmp/corpus.txt'],heldSet:[]}),true);
 assert.equal(validateWorldSource(['text','maze'],{kind:'parquet',root:'/tmp/parquet'}),true);
 assert.throws(()=>validateWorldSource(['text'],{kind:'parquet',root:''}),/without a text dataset/);
});

async function freePort(){
 return await new Promise((resolve,reject)=>{
  const server=createServer();
  server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{
   const value=server.address().port;server.close(err=>err?reject(err):resolve(value));
  });
 });
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('REAL maptext server rejects incompatible text graph; original brain and new maptext graph survive', {timeout:22000},async t=>{
 const port=await freePort(),out=mkdtempSync(path.join(os.tmpdir(),'mp-maptext-contract-'));
 const filename=fileURLToPath(new URL('../transcend/torus-aether/devour/devour.mjs',import.meta.url));
 const child=spawn(process.execPath,[filename,
  '--workers','1','--arms','stable+many','--worlds','maptext','--out',out,
  '--port',String(port),'--gpu','off','--start'],{
    env:{...process.env,MP_NO_BROWSER:'1'},stdio:['ignore','pipe','pipe']});
 let logs='';child.stdout.on('data',data=>logs+=data.toString().slice(0,5000));
 child.stderr.on('data',data=>logs+=data.toString().slice(0,5000));
 const url='http://127.0.0.1:'+port;
 try{
  let first;
  const start=Date.now();
  while(Date.now()-start<12000){
   if(child.exitCode!==null)throw Error('Trainer exited before ready: '+logs.slice(-1500));
   try{
    const r=await fetch(url+'/graphs',{signal:AbortSignal.timeout(1000)});
    if(r.ok){first=await r.json();break;}
   }catch{}
   await delay(150);
  }
  assert.ok(first,'Native trainer did not start: '+logs.slice(-1500));
  assert.equal(first.graphs.length,1);
  assert.deepEqual(first.graphs[0].worlds,['maptext']);

  const bad=await fetch(url+'/add?arm=stable%2Bmany&worlds=text',{method:'POST'});
  assert.equal(bad.status,400);
  const error=await bad.json();
  assert.equal(error.ok,false);
  assert.match(error.error,/without a text dataset/);
  const after=await (await fetch(url+'/graphs')).json();
  assert.equal(after.graphs.length,1,'A broken #1 must NEVER be created');
  assert.deepEqual(after.graphs[0].worlds,['maptext']);
  assert.notEqual(after.graphs[0].status,'eroare');

  const impossibleMixed=await fetch(url+'/add?arm=stable%2Bmany&worlds=maptext%2Ctext',{method:'POST'});
  assert.equal(impossibleMixed.status,400);
  assert.equal((await (await fetch(url+'/graphs')).json()).graphs.length,1);

  // This MUST continue to work: second map-only brain uses the same source = none.
  const valid=await fetch(url+'/add?arm=stable%2Bmany&worlds=maptext',{method:'POST'});
  assert.equal(valid.status,200);
  assert.equal((await valid.json()).ok,true);
  const graphs=await (await fetch(url+'/graphs')).json();
  assert.equal(graphs.graphs.length,2);
  assert.deepEqual(graphs.graphs[1].worlds,['maptext']);

  const evalRequest=await fetch(url+'/maptext-audit?w=0&count=4&seed=99');
  assert.equal(evalRequest.status,200);
  const ev=await evalRequest.json();
  assert.equal(ev.mode,'REFERENCE_ALGORITHM_ONLY');
  assert.equal(ev.learnedNavigationAccuracy,null);
  assert.equal(ev.count,4);

  const badGpu=await fetch(url+'/gpu?device=cuda%3A0',{method:'POST'});
  assert.equal(badGpu.status,409,'Do not start PyTorch when every worker is map-only');
  t.diagnostic('No broken text worker; #0 and #1 map-only worker valid; frozen reference audit works.');
 } finally {
  if(child.exitCode===null){
   const exited=new Promise(resolve=>child.once('exit',resolve));
   child.kill('SIGTERM');
   await Promise.race([exited,delay(2500)]);
   if(child.exitCode===null)child.kill('SIGKILL');
  }
  rmSync(out,{recursive:true,force:true});
 }
});
