import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {fileURLToPath} from 'node:url';
import {Brain} from '../devour/brain.mjs';
import {BodyPerspectiveMemory} from './body-memory.mjs';
const dir=path.dirname(fileURLToPath(import.meta.url));

test('original V17 graph, real native training/eval controls and new tabs coexist',()=>{
 const html=fs.readFileSync(path.join(dir,'../ui/index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'../ui/app.js'),'utf8');
 const studio=fs.readFileSync(path.join(dir,'../ui/perspective-studio.js'),'utf8');
 const evalWorker=fs.readFileSync(path.join(dir,'../devour/eval-worker.mjs'),'utf8');
 const trainer=fs.readFileSync(path.join(dir,'../devour/worker.mjs'),'utf8');
 for(const id of ['g','tabTrain','tabEval','liveList','allStart','allPause','allSave','gpuDev',
   'sharedCv','sharedEvalGo','evalPane','mazeCv','tabPS','tabMetrics','tabTransfer',
   'psGlobal','psLocal','psStep','psCompare','mAccuracyCv','mLossCv','trEval']){
  assert.match(html,new RegExp('id="'+id+'"'),'Missing native or new UI element: '+id);
 }
 assert.match(html,/type="module" src="app\.js"/);
 assert.match(html,/type="module" src="perspective-studio\.js"/);
 assert.match(app,/bootLive/);
 assert.match(app,/renderShared/);
 assert.match(studio,/\/eval/);
 assert.match(studio,/kind:'perspective'/);
 assert.match(studio,/\/shared-eval/);
 assert.match(evalWorker,/evaluateBodyPerspective/);
 assert.match(trainer,/bodyPerspective\.observe\(item/);
 assert.match(trainer,/saveBodyPerspective/);
});
test('original V17 frozen eval-worker loads an independent body-memory sidecar and returns real matched maze evidence',
 {timeout:70000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'mp-body-eval-'));
 const file=path.join(tmp,'brain.v8');
 const brain=new Brain({rules:{depth:1,off:['R2','R4'],budEvery:100,empty:true,maxWires:32,fold:false},c:{margin:.05,window:400,many:12},seed:7});
 const memory=new BodyPerspectiveMemory();
 // Sidecar remains independent of original Brain.save serialization.
 brain.save(file);fs.writeFileSync(file+'.body-perspective.json',JSON.stringify(memory.export()));
 const worker=new Worker(new URL('../devour/eval-worker.mjs',import.meta.url),{workerData:{saveFile:file}});
 try{
  const result=await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Frozen V17 eval-worker timeout')),60000);
   worker.on('message',m=>{
    if(m.type==='loaded')worker.postMessage({id:32,kind:'perspective',opts:{sizes:[7],per:1,seed:11,maxTrace:40}});
    else if(m.type==='result'&&m.id===32){clearTimeout(timer);resolve(m);}
   });
   worker.once('error',e=>{clearTimeout(timer);reject(e);});
  });
  assert.equal(result.error,undefined,JSON.stringify(result));
  assert.equal(result.frozen,true);
  assert.equal(result.summary.native.count,1);
  assert.equal(result.summary.body.count,1);
  assert.equal(result.summary.totalGlobalReads,1);
  assert.equal(result.cases[0].locality.afterFirstFullMapRead,false);
  assert.deepEqual(JSON.parse(fs.readFileSync(file+'.body-perspective.json','utf8')),memory.export(),'Exam must never modify saved training');
 }finally{await worker.terminate();fs.rmSync(tmp,{recursive:true,force:true});}
});
