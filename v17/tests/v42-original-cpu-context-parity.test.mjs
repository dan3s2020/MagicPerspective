import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const originalCtx=(b,i,n)=>Array.from({length:n},(_,j)=>i-j-1>=0?b[i-j-1]:32);
const originalHist=(b,i)=>Array.from({length:32},(_,j)=>i-j-1>=0?b[i-j-1]:32);

test("V42 optimized Brain history exactly equals original Array.from in every context slot",()=>{
  const brain=new Brain({rules,seed:11});
  const byteHistory=[];
  for(let i=0;i<500;i++)byteHistory.push((i*71+i*i)%128);
  for(const cap of [1,2,8,16,32,64,96]){
    brain.e.c.cap=cap;
    for(const i of [0,1,2,3,31,32,33,63,64,65,100,499,500]){
      assert.deepEqual(brain.ctxOf(byteHistory,i),originalCtx(byteHistory,i,cap));
      assert.deepEqual(brain.histOf(byteHistory,i),originalHist(byteHistory,i));
    }
  }
});
test("V42 same original Brain.live, learned states and exact V8 checkpoint after text+maze observations",()=>{
  // To compare a checkpoint byte-for-byte, both contenders must start
  // from the exact SAME serialized original Brain, not two independently
  // constructed instances with potentially different timestamps/identities.
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"v42-original-context-"));
  const initialFile=path.join(root,"initial.v8");
  new Brain({rules,seed:77}).save(initialFile);
  const ref=Brain.load(initialFile),opt=Brain.load(initialFile);
  ref.ctxOf=function(b,i){return originalCtx(b,i,this.CTX)};
  ref.histOf=function(b,i){return originalHist(b,i)};
  const corpus=Array.from({length:180},(_,i)=>(i*i*13+i*17+32)%128);
  for(const brain of [ref,opt]){
    brain.beginExercise();
    for(const y of corpus)brain.live(y,false,{old:true});
    brain.learnConstructedText("What is repeated?","Repeated observed transformation");
    brain.learnObservedTransformations("alpha -> beta. alpha -> beta.");
  }
  assert.equal(opt.lived,ref.lived);
  assert.equal(opt.chars,ref.chars);
  assert.deepEqual(opt.align.trustForCard(),ref.align.trustForCard());
  assert.deepEqual(opt.constructedPaths.summary(),ref.constructedPaths.summary());
  assert.deepEqual(opt.observedTransformations.report(),ref.observedTransformations.report());
  try{
    const f1=path.join(root,"before.v8"),f2=path.join(root,"after.v8");
    ref.save(f1);opt.save(f2);
    // Baseline control: two independent ORIGINAL V41 Fast implementations,
    // both restored from the SAME immutable checkpoint. If even those
    // serialize differently, byte identity is not a valid regression oracle.
    const originalTwin=Brain.load(initialFile);
    originalTwin.ctxOf=function(b,i){return originalCtx(b,i,this.CTX)};
    originalTwin.histOf=function(b,i){return originalHist(b,i)};
    originalTwin.beginExercise();
    for(const y of corpus)originalTwin.live(y,false,{old:true});
    originalTwin.learnConstructedText("What is repeated?","Repeated observed transformation");
    originalTwin.learnObservedTransformations("alpha -> beta. alpha -> beta.");
    const twinFile=path.join(root,"original-twin.v8");
    originalTwin.save(twinFile);
    const originalTwinBytes=fs.readFileSync(twinFile);
    console.log("V42_ORIGINAL_ORIGINAL_BASELINE_BINARY_PARITY",JSON.stringify({
      sameBytes:fs.readFileSync(f1).equals(originalTwinBytes),
      sameLength:fs.statSync(f1).size===fs.statSync(twinFile).size
    }));
    const originalBytes=fs.readFileSync(f1),optimizedBytes=fs.readFileSync(f2);
    if(!originalBytes.equals(optimizedBytes)){
      const first=originalBytes.findIndex((byte,index)=>byte!==optimizedBytes[index]);
      console.log("V42_BINARY_CHECKPOINT_DIAGNOSTIC",JSON.stringify({
        oldLength:originalBytes.length,newLength:optimizedBytes.length,
        firstByteMismatch:first,
        oldNear:Array.from(originalBytes.subarray(Math.max(0,first-12),first+25)),
        newNear:Array.from(optimizedBytes.subarray(Math.max(0,first-12),first+25))
      }));
    }
    // Original-to-original binary equality is impossible within this
    // SAME JS process: the original V41 runtime uses process-global dynamic
    // identifiers. Compare independent ORIGINAL worker processes instead.
    // This verifies native checkpoint bytes under production process layout.
    const runner=path.join(path.dirname(fileURLToPath(import.meta.url)),
      "v42-original-process-replay.mjs");
    const run=(mode,file)=>{
      const p=spawnSync(process.execPath,[runner,mode,initialFile,file],
        {encoding:"utf8",timeout:45000});
      assert.equal(p.status,0,"Native process replay failed: "+p.stdout+"\n"+p.stderr);
      return fs.readFileSync(file);
    };
    const processOriginal=run("original",path.join(root,"process-original.v8"));
    const processOptimized=run("optimized",path.join(root,"process-optimized.v8"));
    const controlOriginal=run("original",path.join(root,"process-old-control.v8"));
    const baselineDeterministic=processOriginal.equals(controlOriginal);
    console.log("V42_ORIGINAL_PROCESS_DETERMINISM",JSON.stringify({
      twoOriginalWorkerByteIdentical:baselineDeterministic,
      optimizedBytesIdentical:processOriginal.equals(processOptimized)
    }));
    assert.deepEqual(processOriginal,processOptimized,
      "Actual independent worker checkpoint differs under original vs V42 context");
    assert.deepEqual(processOriginal,controlOriginal,
      "Two identical original worker processes diverge: baseline is nondeterministic");
    const revived=Brain.load(f2);
    assert.equal(revived.lived,ref.lived);
    assert.equal(revived.constructedPaths.textRows,ref.constructedPaths.textRows);
    console.log("V42_EXACT_ORIGINAL_V8_CHECKPOINT_PARITY_PASS",JSON.stringify({
      chars:corpus.length,checkpointBytes:fs.statSync(f2).size,
      contextSymbolsIdentical:true,fullBrainSerializedBytesIdentical:true
    }));
  }finally{fs.rmSync(root,{recursive:true,force:true})}
});
test("V42 CPU context microbenchmark reports observed timing without asserting fabricated speedup",()=>{
  const brain=new Brain({rules,seed:9}),memory=Array.from({length:64},(_,i)=>i+20);
  brain.e.c.cap=64;
  function measure(f){
    let sum=0;const start=performance.now();
    for(let k=0;k<30000;k++){const v=f(memory,memory.length);sum+=v[0]+v[31]+v[63]}
    return {ms:+(performance.now()-start).toFixed(2),sum};
  }
  const a=measure((b,i)=>originalCtx(b,i,64)),b=measure((b,i)=>brain.ctxOf(b,i));
  assert.equal(a.sum,b.sum);
  console.log("V42_CPU_HISTORY_MICROBENCH",JSON.stringify({
    oldMs:a.ms,newMs:b.ms,speedup:a.ms/b.ms,
    note:"Only original context construction, not end-to-end training"
  }));
});
