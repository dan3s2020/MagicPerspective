import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import {Brain} from "./brain.mjs";
import {gpuTextWindows,applyCompletedWindow,resumeSourceState,DEFAULT_GPU_WINDOW_CHARS} from "./gpu-text-windows.mjs";

test("112530-symbol OpenThoughts row is split losslessly into restartable 4096-symbol CUDA windows",()=>{
  const N=112531,raw=Uint8Array.from({length:N},(_,i)=>(i*53+37)%128);
  const windows=gpuTextWindows(raw);
  assert.ok(windows.length>=27);
  assert.equal(windows[0].from,0);
  assert.equal(windows.at(-1).to,N);
  assert.ok(windows.every((w,i)=>w.bytes.length>0&&w.bytes.length<=DEFAULT_GPU_WINDOW_CHARS&&w.complete===(i===windows.length-1)));
  assert.deepEqual(Buffer.concat(windows.map(w=>Buffer.from(w.bytes))),Buffer.from(raw));
  const source={sourceRows:0,sourceOffset:0,exercises:0};
  let visited=0;
  for(const w of windows){
    assert.equal(w.from,visited);
    applyCompletedWindow(source,{rowChars:raw.length,from:w.from,to:w.to});
    visited=w.to;
  }
  assert.deepEqual(resumeSourceState(source),{rows:1,offset:0});
  assert.equal(source.exercises,1,"Windows must NOT count as extra dataset rows");
});
test("resume partway through a 112531-symbol ORIGINAL row without duplicates and without changing row identity",()=>{
 const raw=Uint8Array.from({length:112531},(_,i)=>65+i%26);
 const all=gpuTextWindows(raw,{maxChars:4096});
 const brain={sourceRows:17,sourceOffset:0,exercises:17};
 const first=all.slice(0,7);
 for(const w of first)applyCompletedWindow(brain,{rowChars:raw.length,from:w.from,to:w.to});
 assert.equal(brain.sourceRows,17);
 assert.equal(brain.sourceOffset,7*4096);
 assert.deepEqual(resumeSourceState(brain),{rows:17,offset:7*4096});
 const rest=gpuTextWindows(raw,{maxChars:4096,offset:brain.sourceOffset});
 assert.equal(rest[0].from,7*4096);
 assert.deepEqual(Buffer.concat([...first,...rest].map(x=>Buffer.from(x.bytes))),Buffer.from(raw));
 for(const w of rest)applyCompletedWindow(brain,{rowChars:raw.length,from:w.from,to:w.to});
 assert.equal(brain.sourceRows,18);
 assert.equal(brain.exercises,18);
 assert.equal(brain.sourceOffset,0);
 assert.throws(()=>applyCompletedWindow(brain,{rowChars:raw.length,from:0,to:10}),/Noncontiguous|./); // no re-consumption of an already completed row without starting next logically
});
test("resume cursor survives original real V17 Brain.save/load and old checkpoints use exercises count",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-window-cursor-")),file=path.join(dir,"brain.v8");
 try{
  const B=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},c:{margin:.05,window:400,many:12},seed:19});
  B.sourceRows=58;B.sourceOffset=12288;B.sourceRowFingerprint="test-fingerprint";B.sourceRowLength=112531;B.exercises=58;
  B.save(file);
  const C=Brain.load(file);
  assert.deepEqual(resumeSourceState(C),{rows:58,offset:12288});
  assert.equal(C.sourceRowFingerprint,"test-fingerprint");
  assert.equal(C.sourceRowLength,112531);
  assert.deepEqual(resumeSourceState({exercises:42}),{rows:42,offset:0});
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("invalid window configuration and offset are rejected rather than discarding content",()=>{
 const data=[1,2,3,4,5];
 assert.throws(()=>gpuTextWindows(data,{maxChars:0}),/Invalid/);
 assert.throws(()=>gpuTextWindows(data,{maxChars:4096,offset:6}),/Invalid/);
 assert.throws(()=>applyCompletedWindow({sourceRows:3,sourceOffset:4},{rowChars:20,from:0,to:7}),/Noncontiguous/);
});
