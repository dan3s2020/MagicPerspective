import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {GpuWorlds} from "../transcend/torus-aether/gpu/client.mjs";

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const testWithFakeGPU=async(task)=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v17-gpu-watchdog-"));
 const stub=path.join(dir,"fake-gpu");
 // CI Linux fake Python executable, independent of actual PyTorch/NVIDIA.
 // It receives the same newline-delimited JSON RPC commands as worlds_gpu.py.
 const program=String.raw`#!/usr/bin/env node
let buf="";
process.stdin.setEncoding("utf8");
process.stdin.on("data",data=>{
 buf+=data;
 let at;
 while((at=buf.indexOf("\n"))>=0){
  const line=buf.slice(0,at);buf=buf.slice(at+1);
  const m=JSON.parse(line);
  const send=r=>process.stdout.write(JSON.stringify({id:m.id,...r})+"\n");
  if(m.cmd==="init"){
    if(process.env.STUB_HANG_INIT==="1")continue;
    send({device:"fake:0",initialized:true});
  }else if(m.cmd==="never-answer"){
    // The original client used to await this forever.
  }else if(m.cmd==="real-progress"){
    let i=0;
    const t=setInterval(()=>{
      i++;
      send({type:"progress",done:i,total:5,phase:"tensor batch"});
      if(i===5){clearInterval(t);send({done:5,ok:true});}
    },280);
  }else if(m.cmd==="progress-with-no-end"){
    let i=0;
    setInterval(()=>send({type:"progress",done:++i,total:1e12,phase:"gpu loop"}),100);
  }else send({ok:true});
 }
});
`;
 fs.writeFileSync(stub,program,{mode:0o755});
 fs.chmodSync(stub,0o755);
 const old=process.env.OCTOPUS_PY;
 process.env.OCTOPUS_PY=stub;
 let gpu=null;
 try{
   const make=(options={})=>gpu=new GpuWorlds({device:"fake:0",util:100},options);
   return await task({make,kill:()=>gpu?.close("test complete")});
 }finally{
   gpu?.close("test teardown");
   if(old===undefined)delete process.env.OCTOPUS_PY;
   else process.env.OCTOPUS_PY=old;
   fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 }
};
test("silent Python GPU RPC fails after bound, rejects pending promise and kills stub instead of an infinite freeze",{
 timeout:20000
},async()=>{
 await testWithFakeGPU(async({make})=>{
   const gpu=make({idleTimeoutMs:1100,hardTimeoutMs:4000,initTimeoutMs:3000});
   await gpu.ready;
   const t0=Date.now();
   await assert.rejects(gpu.call({cmd:"never-answer"}),/GPU RPC idle timeout: never-answer/);
   assert.ok(Date.now()-t0>=1000);
   assert.ok(Date.now()-t0<3200);
   assert.equal(gpu.dead,true);
   assert.equal(gpu.wait.size,0);
   assert.equal(gpu.activeCommand,null);
   await assert.rejects(gpu.call({cmd:"real-progress"}),/GPU process is not running/);
 });
});
test("real GPU progress messages refresh idle budget while preserving live per-phase telemetry",{
 timeout:20000
},async()=>{
 await testWithFakeGPU(async({make})=>{
   const gpu=make({idleTimeoutMs:1100,hardTimeoutMs:5000,initTimeoutMs:3000});
   await gpu.ready;
   const progress=[];
   const result=await gpu.call({cmd:"real-progress"},
     {onProgress:m=>progress.push([m.phase,m.done])});
   assert.equal(result.ok,true);
   assert.equal(progress.length,5);
   assert.ok(gpu.lastGpuProgressAt>0);
   assert.equal(gpu.wait.size,0);
   assert.equal(gpu.activeCommand,null);
 });
});
test("even continuous GPU progress cannot hide a true hard wall-clock stall",{
 timeout:20000
},async()=>{
 await testWithFakeGPU(async({make})=>{
   const gpu=make({idleTimeoutMs:1100,hardTimeoutMs:1900,initTimeoutMs:3000});
   await gpu.ready;
   const t0=Date.now();
   await assert.rejects(gpu.call({cmd:"progress-with-no-end"}),
     /GPU RPC hard timeout: progress-with-no-end/);
   assert.ok(Date.now()-t0>=1700);
   assert.ok(Date.now()-t0<3400);
   assert.equal(gpu.dead,true);
   assert.equal(gpu.wait.size,0);
 });
});
test("normal GPU calls and failed initialization retain strict no-fallback error semantics",{
 timeout:20000
},async()=>{
 await testWithFakeGPU(async({make})=>{
   const gpu=make({idleTimeoutMs:1100,hardTimeoutMs:3000,initTimeoutMs:3000});
   await gpu.ready;
   const answer=await gpu.call({cmd:"quick"});
   assert.equal(answer.ok,true);
   assert.equal(gpu.dead,false);
 });
 await testWithFakeGPU(async({make})=>{
   process.env.STUB_HANG_INIT="1";
   try{
    const gpu=make({idleTimeoutMs:1100,hardTimeoutMs:3000,initTimeoutMs:1100});
    await assert.rejects(gpu.ready,/GPU RPC (idle|hard) timeout: init/);
    assert.equal(gpu.dead,true);
   }finally{delete process.env.STUB_HANG_INIT;}
 });
});
