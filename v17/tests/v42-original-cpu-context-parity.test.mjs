import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
  const ref=new Brain({rules,seed:77});
  const opt=new Brain({rules,seed:77});
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
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"v42-original-context-"));
  try{
    const f1=path.join(root,"before.v8"),f2=path.join(root,"after.v8");
    ref.save(f1);opt.save(f2);
    assert.deepEqual(fs.readFileSync(f1),fs.readFileSync(f2),
      "Semantic regression: exact old/new native Brain.v8 differed");
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
