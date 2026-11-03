import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {cp,mkdtemp,mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';

const source=process.cwd(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function startProject(kind,port){
 const temp=await mkdtemp(path.join(tmpdir(),'magic-real-train-'));
 const folder=kind==='v7'?'v7':'experiments/graph-dance-20261103';
 await cp(path.join(source,folder,'engine'),path.join(temp,'engine'),{recursive:true});
 await cp(path.join(source,folder,'public'),path.join(temp,'public'),{recursive:true});
 await cp(path.join(source,folder,'server.mjs'),path.join(temp,'server.mjs'));
 await mkdir(path.join(temp,'data'));
 const child=spawn(process.execPath,['server.mjs'],{cwd:temp,env:{...process.env,
  HOST:'127.0.0.1',PORT:String(port)},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',data=>errors+=String(data));
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<65;i++){
  try{if((await fetch(base+'/api/health')).ok)return {child,temp,base}}catch{}
  await sleep(100);
 }
 child.kill('SIGTERM');await rm(temp,{recursive:true,force:true});
 throw Error('Server did not start: '+errors);
}
async function close(run){
 if(!run)return;
 run.child.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>run.child.once('exit',resolve)),sleep(1000)]);
 await rm(run.temp,{recursive:true,force:true});
}
async function post(base,name,body){
 const res=await fetch(base+'/api/'+name,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 if(!res.ok)throw Error('POST '+name+' '+res.status+' '+await res.text());
 return res.json();
}
async function state(base){return (await (await fetch(base+'/api/state')).json())}
test('original V7 UI can train indefinitely, show real maze frames and stop without reset',{timeout:75000},async()=>{
 const r=await startProject('v7',42036);
 try{
  const html=await (await fetch(r.base+'/')).text();
  for(const id of ['map-organ','map-classic','scrub','step','run','train','cancel','life-curve']){
   assert.ok(html.includes('id="'+id+'"'),'Original UI control lost: '+id);
  }
  assert.ok(html.includes('value="0"'));
  await post(r.base,'train',{episodes:0,size:11});
  let s,sawMaze=false,sawRelief=false,seen=false;
  for(let i=0;i<180;i++){
   s=await state(r.base);
   if(s.task?.preview){
    seen=true;
    const p=s.task.preview;
    assert.equal(p.world.truth.length,121);
    assert.ok(p.organFrames.length);
    assert.ok(p.classicFrames.length);
    sawMaze ||= p.kind==='maze';sawRelief ||= p.kind==='relief';
   }
   if(seen&&s.task?.done>=5)break;
   await sleep(90);
  }
  assert.ok(seen,'No real training episode replay available');
  assert.equal(s.task.unlimited,true);
  assert.equal(s.task.total,null);
  await post(r.base,'cancel',{});
  for(let i=0;i<180;i++){s=await state(r.base);if(!s.task.running)break;await sleep(100);}
  assert.equal(s.task.running,false,'Unlimited training did not stop');
  assert.ok(s.task.done>0);
  assert.ok(s.brain.trainingCursor>=60,'Training worlds were not reserved persistently');
  const live=JSON.parse(await readFile(path.join(r.temp,'data/live-brain.json'),'utf8'));
  assert.ok(live.trainingCursor>=60);
 }finally{await close(r)}
});
test('original Graph Dance UI can train indefinitely, show nodes, animate actual frames and stop',{timeout:75000},async()=>{
 const r=await startProject('graph',42040);
 try{
  const html=await (await fetch(r.base+'/')).text();
  for(const id of ['brain','truth','timeline','journal','auto','train','stop','replay']){
   assert.ok(html.includes('id="'+id+'"'),'Original Graph UI control lost: '+id);
  }
  assert.ok(html.includes('value="0"'));
  await post(r.base,'train',{episodes:0,n:13});
  let s,seen=false;
  for(let i=0;i<180;i++){
   s=await state(r.base);
   if(s.progress?.previewSeed!=null){
    seen=true;const p=s.progress.preview;
    assert.equal(p.info.n,13);
    assert.ok(p.history.length>=2);
    assert.ok(p.evaluator.edges.length>0);
    break;
   }
   await sleep(90);
  }
  assert.equal(seen,true,'No actual graph training episode returned');
  assert.equal(s.progress.unlimited,true);
  assert.equal(s.progress.total,null);
  await post(r.base,'stop',{});
  for(let i=0;i<180;i++){s=await state(r.base);if(!s.progress.running)break;await sleep(100)}
  assert.equal(s.progress.running,false,'Graph training did not stop');
  assert.ok(s.progress.done>0);
  assert.ok(s.model.trainingCursor>=60);
  const saved=JSON.parse(await readFile(path.join(r.temp,'data/live-rule.json'),'utf8'));
  assert.ok(saved.trainingCursor>=60);
 }finally{await close(r)}
});
