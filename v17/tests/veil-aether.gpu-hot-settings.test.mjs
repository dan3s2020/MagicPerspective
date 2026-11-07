import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {classifyGpuUpdate} from "../transcend/torus-aether/devour/gpu-settings-transition.mjs";

const old={device:"cuda:0",worlds:2,textBatch:1,vram:3,util:100};

test("changing text batch or world count keeps Python CUDA text index exactly where it is",()=>{
 assert.equal(classifyGpuUpdate(old,{...old,textBatch:4}),"reuse");
 assert.equal(classifyGpuUpdate(old,{...old,worlds:64}),"reuse");
 assert.equal(classifyGpuUpdate(old,{...old,worlds:32,textBatch:8}),"reuse");
 assert.equal(classifyGpuUpdate(old,{...old}),"reuse");
});

test("same GPU updates VRAM/util IN PLACE while preserving original model state",()=>{
 assert.equal(classifyGpuUpdate(old,{...old,util:90}),"configure");
 assert.equal(classifyGpuUpdate(old,{...old,vram:2.8}),"configure");
 assert.equal(classifyGpuUpdate(old,{...old,vram:3.2,util:90}),"configure");
 assert.equal(classifyGpuUpdate({device:"off"},{device:"off"}),"reuse");
});

test("device change is the ONLY normal reason for CUDA worker process restart",()=>{
 assert.equal(classifyGpuUpdate(old,{...old,device:"cuda:1"}),"restart");
 assert.equal(classifyGpuUpdate(old,{...old,device:"off"}),"restart");
 assert.equal(classifyGpuUpdate(null,old),"restart");
 assert.equal(classifyGpuUpdate({device:"off"},old),"restart");
});

test("native worker uses classification and preserved Python Server.init does not clear TextCard",()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const worker=readFileSync(path.join(root,"transcend/torus-aether/devour/worker.mjs"),"utf8");
 const client=readFileSync(path.join(root,"transcend/torus-aether/gpu/client.mjs"),"utf8");
 const server=readFileSync(path.join(root,"transcend/torus-aether/gpu/worlds_gpu.py"),"utf8");
 assert.match(worker,/classifyGpuUpdate\(gpuSet,next\)/);
 assert.match(worker,/else if \(change === "configure"\) gpuHotPending = true/);
 assert.match(worker,/else if \(gpuHotPending\)/);
 assert.match(worker,/await gpu\.configure\(gpuSet\)/);
 assert.match(client,/this\.info = await this\.call\(\{cmd: "init", \.\.\.this\.settings\}\)/);
 const pythonInit=server.split("    def init(self, m):")[1].split("    def throttle(self, busy):")[0];
 assert.ok(pythonInit.length>100);
 assert.doesNotMatch(pythonInit,/self\.text\s*=/,"Same-device reconfigure must never wipe CUDA text index");
 assert.doesNotMatch(pythonInit,/self\.shared\s*=/,"Same-device reconfigure must never wipe shared latent learner");
});
