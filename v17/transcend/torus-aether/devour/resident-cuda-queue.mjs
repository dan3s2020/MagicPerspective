// Original MagicPerspective V17: bounded read-ahead of the actual TRAINING
// corpus, staged once in the persistent CUDA process. The original
// Brain.learnTextGPU still learns each exercise exactly once, in order.
// No fabricated contexts, no pre-training from future answers, no changes
// to held-out test data and no replacement of native AligningGraph.
export class ResidentCudaExerciseQueue {
  constructor({maxExercises=48,maxBytes=12_000_000,warmExercises=8,
      maxRpcBytes=2_000_000}={}){
    this.maxExercises=Math.max(1,Math.min(256,Math.trunc(maxExercises)));
    this.maxBytes=Math.max(256,Math.trunc(maxBytes));
    this.warmExercises=Math.max(1,Math.min(this.maxExercises,Math.trunc(warmExercises)));
    this.maxRpcBytes=Math.max(64,Math.trunc(maxRpcBytes));
    this.loaded = new WeakMap();
    this.stats = null;
    this.queued = 0;
    this.queuedBytes = 0;
    this.readThrough = 0;
    this.bytesStaged = 0;
    this.bytesCommitted = 0;
    this.callsStaged = 0;
    this.sourceWasReadAhead = false;
  }
  id(row) {
    if(!Number.isSafeInteger(row?.k)||row.k<0)
      throw Error("Cannot preload exercise without original non-negative Parquet row k");
    return "row:"+row.k;
  }
  bytes(row) {
    const a = row?.bytes;
    if(!a||!Array.isArray(a)&&!(a instanceof Uint8Array)&&!Buffer.isBuffer(a))
      throw Error("Source exercise does not include ORIGINAL byte sequence");
    return a;
  }
  state(gpu) {
    let existing=this.loaded.get(gpu);
    if(!existing){existing=new Set();this.loaded.set(gpu,existing);}
    return existing;
  }
  async stage(gpu,rows,{onProgress=()=>{}}={}){
    if(!gpu || gpu.dead)throw Error("Resident pool requires an ACTIVE real GPU process");
    if(!rows.length)return [];
    const loaded=this.state(gpu);
    const ids=rows.map(r=>this.id(r));
    if(new Set(ids).size!==ids.length)
      throw Error("Duplicate corpus training row in resident pool staging");
    const todo=rows.filter(r=>!loaded.has(this.id(r)));
    let part=[],size=0;
    const flush=async()=>{
      if(!part.length)return;
      const entries=part.map(r=>({
        id:this.id(r),b64:Buffer.from(this.bytes(r)).toString("base64")
      }));
      const response=await gpu.call({cmd:"text_pool_add",entries},
        {onProgress:x=>onProgress({phase:"VRAM: "+x.phase,
          done:x.done,total:x.total})});
      if(!response.textPool||response.textPool.physicallyCudaResident===false&&
          String(gpu.settings?.device||"").startsWith("cuda"))
        throw Error("CUDA resident pool did not confirm actual GPU data");
      this.stats=response.textPool;
      for(const r of part){loaded.add(this.id(r));this.bytesStaged+=this.bytes(r).length;}
      this.callsStaged++;
      part=[];size=0;
    };
    for(const row of todo){
      const n=this.bytes(row).length;
      if(n>this.maxRpcBytes)
        throw Error("One source exercise exceeds GPU upload RPC budget; "+
           "use a smaller max exercise source window, not an unverified truncation");
      if(part.length&&size+n>this.maxRpcBytes)await flush();
      part.push(row);size+=n;
    }
    await flush();
    return ids;
  }
  async commit(gpu,rows){
    if(!rows.length)return this.stats;
    const ids=rows.map(r=>this.id(r));
    const loaded=this.state(gpu);
    if(ids.some(id=>!loaded.has(id)))
      throw Error("Refusing to mark native Brain training as CUDA-resident "+
        "when source exercise is not staged on selected process");
    const r=await gpu.call({cmd:"text_pool_commit",ids});
    if(!r.textPool)throw Error("GPU pool commit not confirmed");
    for(const row of rows){
      loaded.delete(this.id(row));
      this.bytesCommitted+=this.bytes(row).length;
    }
    this.stats=r.textPool;
    return r.textPool;
  }
  async *prefetch(source,{skip=0,getGpu,onProgress=()=>{}}={}){
    if(typeof getGpu!=="function")throw Error("Live GPU process provider required");
    const iterator=source[Symbol.asyncIterator]();
    const queue=[];
    let skipped=0,closed=false,ended=false;
    const pendingCap=Math.min(this.maxBytes,this.maxRpcBytes*4);
    const fill=async target=>{
      let added=[];
      while(!ended && queue.length<target){
        const next=await iterator.next();
        if(next.done){ended=true;break;}
        if(skipped++<skip)continue;
        const row=next.value;
        const size=this.bytes(row).length;
        // Keep the first huge row available to train even when its payload
        // exceeds the NORMAL warm pool (do not silently drop source bytes).
        if(queue.length>0&&this.queuedBytes+size>pendingCap){
          // Cannot un-read an async dataset row. Hold it in memory for next
          // refill, rather than skipping it. NOTE this will be fixed via
          // the one-row pending slot and returned at the next fill.
          this._held=row;
          break;
        }
        queue.push(row);added.push(row);
        this.queuedBytes+=size;this.readThrough++;
      }
      // Up to maxRpcBytes per packet; transfer future rows once, then reuse
      // by GPU IDs until original Brain commits each row.
      if(added.length){
        const G=await getGpu();
        if(!G)throw Error("No CUDA process available to stage actual future corpus");
        await this.stage(G,added,{onProgress});
        this.sourceWasReadAhead ||= queue.length>1;
      }
      this.queued=queue.length;
    };
    const takeHeld=async()=>{
      if(!this._held)return;
      const row=this._held;
      if(queue.length&&this.queuedBytes+this.bytes(row).length>pendingCap)return;
      this._held=null;
      queue.push(row);this.queuedBytes+=this.bytes(row).length;
      const G=await getGpu();
      if(!G)throw Error("No CUDA to stage held future row");
      await this.stage(G,[row],{onProgress});
    };
    try{
      await fill(this.warmExercises);
      while(queue.length||this._held||!ended){
        if(!queue.length){
          await takeHeld();
          if(!queue.length)await fill(this.warmExercises);
          if(!queue.length)break;
        }
        const item=queue.shift();
        this.queuedBytes-=this.bytes(item).length;
        this.queued=queue.length;
        yield item;
        await takeHeld();
        // Start the FIRST native TextCard training batch promptly after a
        // small warm window. Once one real native batch has committed, keep
        // topping off the resident VRAM future text pool when its read-ahead
        // queue drops below half the selected exercise budget, rather than
        // letting the card go empty between large groups.
        const refillThreshold=Math.max(2,Math.floor(this.maxExercises/2));
        if((!queue.length||
            (this.bytesCommitted>0 && queue.length<=refillThreshold))&&
            !this._held)
          await fill(this.maxExercises);
      }
    }finally{
      if(!closed&&iterator.return){closed=true;await iterator.return();}
    }
  }
}
