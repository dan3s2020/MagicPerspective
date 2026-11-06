// Real V17 text corpus -> original Brain -> text state/action world ->
// saved causal sidecar. No synthetic training data inserted by evaluator.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once('error',reject);
 s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('original V17 actually devours real TXT paragraph paths into the saved causal text world', {timeout:80000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'mp-text-path-ingest-'));
 const corpus=path.join(home,'real-corpus.txt'),out=path.join(home,'save');
 const ps=[
  'Q: Where can I move in the maze?\nA: The hallway joins the north passage to the exit.',
  'Q: What changes if the door opens?\nA: A new possible route appears between two rooms.',
  'Q: What does the transformation do?\nA: It moves the state into a new arrangement.',
  'The organism observes how the hallway joins another position. It remembers the available paths and tests a new local action.',
  'It learns which action changed the observation and which remained blocked. It can now choose a different path from the same starting state.',
  'Q: Where is the solution shape?\nA: It is the path through observed transformations toward a goal.'
 ];
 fs.writeFileSync(corpus,ps.join('\n\n'),'utf8');
 const listen=await port(),script='transcend/torus-aether/devour/devour.mjs';
 const child=spawn(process.execPath,[script,'--workers','1','--arms','stable+many','--worlds','text',
  '--gpu','off','--text',corpus,'--out',out,'--port',String(listen),'--start','--mem','1',
  '--every','50000','--maze-every','4000'],{cwd:root,detached:true,stdio:['ignore','pipe','pipe']});
 let logs='';for(const s of [child.stdout,child.stderr])s.on('data',x=>logs=(logs+String(x)).slice(-6000));
 try{
  const sidecar=path.join(out,'brains','brain-0-stable+many.v8.causal.json');
  let saved=null;
  for(let i=0;i<360;i++){
   if(fs.existsSync(sidecar)){
    try{const data=JSON.parse(fs.readFileSync(sidecar,'utf8'));
      if(data.paths?.rows>0&&data.causal?.episodes>0){saved=data;break;}
    }catch{}
   }
   if(child.exitCode!==null)break;
   await sleep(150);
  }
  assert.ok(saved,'Real text never produced observed world transitions: '+logs);
  assert.ok(saved.paths.rows>=5,'Plain TXT paragraphs were not treated as actual observed training transitions');
  assert.ok(saved.causal.episodes>=5);
  assert.ok(saved.paths.edges.length>0,'No state-transition edges learned from text');
  assert.ok(saved.causal.dynamics.observations>0,'No physical text action experiments observed');
  const r=await fetch('http://127.0.0.1:'+listen+'/graphs');
  assert.ok(r.ok);
  const graph=await r.json();
  assert.ok(graph.graphs?.[0]?.chars>0);
 }finally{
  try{process.kill(-child.pid,'SIGTERM');}catch{try{child.kill('SIGTERM');}catch{}}
  await sleep(200);
  fs.rmSync(home,{recursive:true,force:true});
 }
});
