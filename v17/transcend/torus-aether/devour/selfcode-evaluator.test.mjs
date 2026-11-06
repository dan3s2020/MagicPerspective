import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Worker} from 'node:worker_threads';
const dir=path.dirname(fileURLToPath(import.meta.url));
const source=path.resolve(dir,'../../epistemic-text/engine.mjs');
function launch(){
 const worker=new Worker(new URL('./selfcode-evaluator.mjs',import.meta.url),{workerData:{source,seed:19,sandbox:fs.mkdtempSync(path.join(os.tmpdir(),'mp-native-eval-'))}});
 const invoke=payload=>new Promise((ok,no)=>{const timer=setTimeout(()=>no(Error('Evaluator timed out')),30000);
  worker.once('message',x=>{clearTimeout(timer);ok(x)});worker.postMessage(payload)});
 return {worker,invoke};
}
test('real source effect is measured in separate worker; original is immutable',async()=>{
 const a=launch(),orig=fs.readFileSync(source,'utf8');
 try{const p=await a.invoke({kind:'probe',slot:'perspective-period',value:14,index:1});
  assert.equal(p.kind,'probe');assert.ok(Number.isFinite(p.delta));assert.ok(Number.isFinite(p.before));
  assert.equal(fs.readFileSync(source,'utf8'),orig);
 }finally{await a.worker.terminate()}
});
test('blind lock with untrained model stays locked; no hidden answers are transmitted',async()=>{
 const a=launch();try{
 const result=await a.invoke({kind:'lock',probes:[],index:1});
 assert.equal(result.kind,'lock');assert.equal(result.unlocked,false);
 assert.equal(result.attempts,8);assert.ok(result.baseline>=0&&result.baseline<=1);
 assert.ok(!Object.hasOwn(result,'seed'));assert.ok(!Object.hasOwn(result,'secretSeed'));
 assert.ok(!Object.hasOwn(result,'examples'));
 }finally{await a.worker.terminate()}
});
