// NO demo server: launch original V17 trainer, actually ingest four unlabeled
// short TXT sentences, then ask the saved ORIGINAL Brain to derive an unseen
// goal by composing its observed state/action differences.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Brain} from '../transcend/torus-aether/devour/brain.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const getPort=()=>new Promise((resolve,reject)=>{
 const srv=net.createServer();srv.once('error',reject);
 srv.listen(0,'127.0.0.1',()=>{const p=srv.address().port;srv.close(()=>resolve(p));});
});
test('real V17 corpus -> same Brain -> unlabeled edits -> unseen full goal -> frozen effect verification -> saved checkpoint', {timeout:100000},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mp-v17-observed-edits-'));
 const corpus=path.join(temp,'observed.txt');
 const out=path.join(temp,'out');
 const words=['She is happy.','She is tired.','He is tired.','He is calm.'];
 fs.writeFileSync(corpus,words.join('\n\n')+'\n','utf8');
 assert.equal(fs.readFileSync(corpus,'utf8').includes('She is calm.'),false,
   'The target sentence must be genuinely withheld from the text corpus');
 const port=await getPort();
 const child=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
   '--workers','1','--arms','stable+many','--worlds','text','--gpu','off',
   '--text',corpus,'--out',out,'--port',String(port),'--start','--mem','1',
   '--every','50000','--maze-every','50000'],{
    cwd:root,detached:true,stdio:['ignore','pipe','pipe']
   });
 let logs='';
 for(const stream of [child.stdout,child.stderr])
   stream.on('data',s=>{logs=(logs+String(s)).slice(-9000);});
 const base='http://127.0.0.1:'+port;
 try{
  let started=false;
  for(let i=0;i<100;i++){
   try{const r=await fetch(base+'/graphs');if(r.ok){started=true;break;}}catch{}
   await sleep(90);
  }
  assert.ok(started,'Original server never became available: '+logs);
  const originalUI=await(await fetch(base+'/transcend/torus-aether/ui/index.html?live=1')).text();
  assert.match(originalUI,/id="observedTransformBox"/);
  assert.match(originalUI,/id="constructedBox"/);
  assert.match(originalUI,/id="agentNoiseBox"/);
  let learned=null,lastStatus=null;
  for(let i=0;i<210;i++){
   try{
    const r=await fetch(base+'/graphs');
    if(r.ok){
     const g=(await r.json()).graphs?.[0];
     lastStatus={status:g?.status,error:g?.error,chars:g?.chars,
       observed:g?.observedTransformations,pipeline:g?.observedPipeline,source:g?.worlds};
     if(g?.observedTransformations?.observed>=4&&g.observedTransformations.learnedOperators>=6){
      learned=g;break;
     }
    }
   }catch{}
   await sleep(120);
  }
  assert.ok(learned,'Four real unlabeled short sentences never produced reusable edits: '+
    JSON.stringify(lastStatus)+'; console='+logs);
  const url=base+'/composition-plan?w=0&required='+encodeURIComponent('She,calm')+
    '&start='+encodeURIComponent('He is calm.');
  const response=await fetch(url,{method:'POST'});
  assert.equal(response.status,200,'Original V17 composition endpoint not reachable');
  const result=await response.json();
  assert.ok(!result.error,'Original Brain planning error: '+JSON.stringify(result));
  assert.equal(result.found,true,JSON.stringify(result));
  assert.equal(result.predicted,'She is calm.');
  assert.equal(result.unseen,true);
  assert.equal(result.referenceProvided,false);
  assert.equal(result.plannedBeforeAnswer,true);
  assert.equal(result.verifiedByObservedEffect,true);
  assert.equal(result.frozen,true);
  assert.equal(result.steps.length,1);
  assert.equal(result.execution.result,'She is calm.');
  assert.match(JSON.stringify(result.steps),/tired/,'Edit origin must be another observed context');
  const graph=await(await fetch(base+'/graph?w=0')).json();
  assert.ok(graph.nodes.some(n=>n[0]==='o:diff-world'),
    'The living native V17 graph must own the learned transformation mechanism');
  const file=path.join(out,'brains','brain-0-stable+many.v8');
  let saved=false;
  for(let i=0;i<100;i++){
   if(fs.existsSync(file)&&fs.statSync(file).size>0){saved=true;break;}
   await sleep(75);
  }
  assert.ok(saved,'Original Brain .v8 checkpoint not persisted: '+logs);
  const recovered=Brain.load(file);
  assert.equal(recovered.observedTransformations.containsSentence('She is calm.'),false);
  const fromSaved=recovered.planObservedTransformation({required:['She','calm'],start:'He is calm.'});
  assert.equal(fromSaved.predicted,'She is calm.');
  assert.equal(fromSaved.execution.verified,true);
  assert.equal(recovered.observedTransformations.report().learnedOperators>=6,true);
  const before=recovered.observedTransformations.report();
  recovered.planObservedTransformation({required:['She','calm'],start:'He is calm.'});
  assert.deepEqual(recovered.observedTransformations.report(),before,
    'Frozen evaluator must never teach with the heldout answer');
  console.log('REAL_V17_UNSEEN_SHE_IS_CALM '+JSON.stringify({
    observed:learned.observedTransformations.observed,
    operators:learned.observedTransformations.learnedOperators,
    actualPrediction:result.predicted,
    observedTrainingContainsAnswer:false,
    steps:result.steps.map(x=>({kind:x.kind,from:x.from,to:x.to,evidence:x.learnedFrom})),
    verified:result.verifiedByObservedEffect,frozen:result.frozen,
    nativeV8Checkpoint:true
  }));
 }finally{
  try{process.kill(-child.pid,'SIGTERM');}catch{try{child.kill('SIGTERM');}catch{}}
  await sleep(250);fs.rmSync(temp,{recursive:true,force:true});
 }
});
