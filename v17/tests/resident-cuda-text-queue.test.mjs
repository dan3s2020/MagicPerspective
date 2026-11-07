import test from "node:test";
import assert from "node:assert/strict";
import {ResidentCudaExerciseQueue}
  from "../transcend/torus-aether/devour/resident-cuda-queue.mjs";

class ExactFakeDevicePool {
  constructor(){
    this.dead=false;this.settings={device:"cuda:0"};
    this.entries=new Map();this.calls=[];
  }
  async call(m){
    this.calls.push(m.cmd);
    if(m.cmd==="text_pool_add"){
      for(const e of m.entries){
        if(this.entries.has(e.id))throw Error("duplicate resident ID");
        this.entries.set(e.id,Buffer.from(e.b64,"base64"));
      }
      return {textPool:this.report()};
    }
    if(m.cmd==="text_pool_commit"){
      const existing=[...this.entries.keys()];
      assert.deepEqual(m.ids,existing.slice(0,m.ids.length),"strict FIFO eviction");
      for(const id of m.ids)this.entries.delete(id);
      return {textPool:this.report()};
    }
    if(m.cmd==="text_learn"){
      const ex=m.ids.map(id=>[...this.entries.get(id)]);
      assert.ok(ex.every(x=>x.length>0));
      return {seen:ex.reduce((s,x)=>s+x.length-1,0),hits:0};
    }
    throw Error("Unknown fake device command "+m.cmd);
  }
  report(){const bytes=[...this.entries.values()].reduce((s,x)=>s+x.length,0);
    return {physicallyCudaResident:true,residentBytes:bytes,
      residentExercises:this.entries.size,budgetMB:128};}
}
async function* source(n=13,bytes=83){
 for(let i=0;i<n;i++){yield {k:i,prompt:"Q"+i,answer:"A"+i,bytes:Array.from({length:bytes+i},(_,n)=>(n+i)%127)};}
}

test("next source rows are genuinely staged in GPU ahead of first native learn; exact FIFO commit all rows; no duplicates",async()=>{
  const GPU=new ExactFakeDevicePool();
  const queue=new ResidentCudaExerciseQueue({
    maxExercises:6,maxBytes:2500,warmExercises:3,maxRpcBytes:2000});
  const rows=[],commits=[];
  for await(const row of queue.prefetch(source(13),{
      getGpu:async()=>GPU})){
    rows.push(row);
    if(rows.length===3){
      assert.ok(queue.sourceWasReadAhead);
      assert.ok(queue.readThrough>=3);
      assert.ok(GPU.entries.has("row:0"));
      assert.ok(GPU.entries.has("row:1"));
      assert.ok(GPU.entries.has("row:2"));
    }
    if(rows.length%3===0){
      const originalBatch=rows.slice(rows.length-3);
      const ids=await queue.stage(GPU,originalBatch);
      const r=await GPU.call({cmd:"text_learn",ids});
      assert.equal(r.seen,originalBatch.reduce((s,x)=>s+x.bytes.length-1,0));
      const stat=await queue.commit(GPU,originalBatch);
      commits.push(stat.residentExercises);
    }
  }
  const tail=rows.slice(Math.floor(rows.length/3)*3);
  if(tail.length){
    const ids=await queue.stage(GPU,tail);
    const r=await GPU.call({cmd:"text_learn",ids});
    assert.equal(r.seen,tail.reduce((s,x)=>s+x.bytes.length-1,0));
    await queue.commit(GPU,tail);
  }
  assert.equal(rows.length,13);
  assert.equal(queue.readThrough,13);
  assert.equal(queue.bytesCommitted,rows.reduce((s,x)=>s+x.bytes.length,0));
  assert.equal(queue.bytesStaged,queue.bytesCommitted);
  assert.equal(GPU.entries.size,0);
  assert.ok(commits.some(n=>n>0),"real future exercises remain in pool across learned-batch commits");
  assert.ok(GPU.calls.filter(c=>c==="text_pool_add").length>1);
});

test("resumed corpus skips already committed rows BEFORE GPU prefetch; never sends previous answers again",async()=>{
 const queue=new ResidentCudaExerciseQueue({
   maxExercises:5,maxBytes:1200,warmExercises:2,maxRpcBytes:1000});
 const gpu=new ExactFakeDevicePool(),seen=[];
 for await(const ex of queue.prefetch(source(9,18),{
   skip:6,getGpu:async()=>gpu})){
   seen.push(ex.k);
   const ids=await queue.stage(gpu,[ex]);
   await gpu.call({cmd:"text_learn",ids});
   await queue.commit(gpu,[ex]);
 }
 assert.deepEqual(seen,[6,7,8]);
 assert.equal(gpu.entries.size,0);
 assert.equal(queue.bytesCommitted,18+6+18+7+18+8);
});

test("when native GPU child changes, same currently uncommitted rows must be restaged on fresh device without old trust updates",async()=>{
 const q=new ResidentCudaExerciseQueue({maxRpcBytes:2000});
 const a=new ExactFakeDevicePool(),b=new ExactFakeDevicePool();
 const rows=[{k:41,bytes:[71,72,73]},{k:42,bytes:[74,75]}];
 const original=await q.stage(a,rows);
 assert.deepEqual(original,["row:41","row:42"]);
 a.dead=true;
 const reloaded=await q.stage(b,rows);
 assert.deepEqual(reloaded,original);
 assert.deepEqual([...b.entries.values()].map(x=>[...x]),rows.map(x=>x.bytes));
 await b.call({cmd:"text_learn",ids:reloaded});
 const done=await q.commit(b,rows);
 assert.equal(done.residentExercises,0);
 assert.equal(q.bytesStaged,10);
 assert.equal(q.bytesCommitted,5);
});

test("source read ahead failure cannot silently drop or reorder a world; one oversized row fails loudly",async()=>{
 const q=new ResidentCudaExerciseQueue({maxExercises:5,maxBytes:1500,warmExercises:2,maxRpcBytes:300});
 const gpu=new ExactFakeDevicePool();
 async function* inputs(){
   yield {k:0,bytes:[1,2,3]};
   yield {k:1,bytes:Array(500).fill(60)};
 }
 await assert.rejects(async()=>{
   for await(const e of q.prefetch(inputs(),{getGpu:async()=>gpu})){
     await q.stage(gpu,[e]);
   }
 },/source exercise exceeds GPU upload RPC budget/);
});
