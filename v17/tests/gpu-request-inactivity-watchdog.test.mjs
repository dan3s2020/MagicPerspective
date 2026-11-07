import test from "node:test";
import assert from "node:assert/strict";
import {GpuWorlds} from "../transcend/torus-aether/gpu/client.mjs";

function fakeGpu(stallMs=1000){
 const gpu=Object.create(GpuWorlds.prototype);
 gpu.wait=new Map();gpu.id=0;gpu.dead=false;gpu.error=null;
 gpu.settings={stallMs};gpu.sent=[];gpu.killed=false;
 gpu.p={stdin:{write:text=>gpu.sent.push(JSON.parse(text))}};
 gpu.close=()=>{gpu.killed=true;};
 return gpu;
}

test("valid GPU work stays alive when real progress is returned, and cleans timers",async()=>{
 const gpu=fakeGpu(),progress=[];
 const work=gpu.call({cmd:"text_learn",exercises:[[65,66,67]]},
   {stallMs:1000,onProgress:part=>progress.push(part.done)});
 assert.equal(gpu.sent.length,1);
 const id=gpu.sent[0].id;
 const waiter=gpu.wait.get(id);
 waiter.onProgress({done:1,total:2,type:"progress"});
 waiter.onProgress({done:2,total:2,type:"progress"});
 waiter.resolve({hits:3,seen:3});
 assert.deepEqual(await work,{hits:3,seen:3});
 assert.deepEqual(progress,[1,2]);
 assert.equal(gpu.killed,false);
 gpu.wait.delete(id);
});
test("silent GPU Python requests cannot hang forever or mark a batch as committed",{
 timeout:5000},async()=>{
 const gpu=fakeGpu(1000);
 const started=Date.now();
 const promise=gpu.call({cmd:"text_learn",exercises:[[65,66,67]]},{stallMs:1000});
 await assert.rejects(promise,/had no progress for 1 seconds.*original Brain checkpoint is unchanged/);
 assert.ok(Date.now()-started>=900);
 assert.equal(gpu.killed,true);
 assert.equal(gpu.dead,true);
 assert.equal(gpu.wait.size,0);
 console.log("V17_GPU_NO_INFINITE_BLOCK",JSON.stringify({
  failedExplicitlyAfterSeconds:1,batchCommitted:false,checkpointUntouched:true,
  noCPUFallback:true}));
});
