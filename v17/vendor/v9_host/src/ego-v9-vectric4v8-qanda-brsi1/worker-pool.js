export class WorkerPool{
  constructor(count,onEvent=()=>{},label="pool"){
    this.count=Math.max(1,Math.floor(count));
    this.targetCount=this.count;
    this.onEvent=onEvent;
    this.label=String(label||"pool");
    this.workers=[];
    this.queue=[];
    this.pending=new Map();
    this.nextTask=1;
    this.nextWorkerId=0;
    this.lastDequeuedGroup=null;
    this.stats={submitted:0,completed:0,failed:0,totalQueueMs:0,totalRunMs:0,maxQueueMs:0,maxRunMs:0,byGroup:{}};
    for(let i=0;i<this.count;i++)this.workers.push(this._spawn());
  }
  _now(){return typeof performance!=="undefined"&&performance.now?performance.now():Date.now();}
  _groupStats(group){
    const g=String(group||"ungrouped");
    return this.stats.byGroup[g]||(this.stats.byGroup[g]={submitted:0,completed:0,failed:0,totalQueueMs:0,totalRunMs:0,maxQueueMs:0,maxRunMs:0});
  }
  _spawn(){
    const w=new Worker(new URL("./worker-entry.js",import.meta.url),{type:"module"});
    w._busy=false;w._id=this.nextWorkerId++;w._task=null;w._progress=null;w._modelCacheKeys=new Set();
    w.onmessage=e=>this._message(w,e.data);
    w.onerror=e=>this._workerFailure(w,e);
    w.onmessageerror=e=>this._workerFailure(w,e);
    return w;
  }
  _retireIdleWorkers(){
    let retired=0;
    for(let i=this.workers.length-1;i>=0&&this.workers.length>this.targetCount;i--){
      const w=this.workers[i];
      if(w._busy)continue;
      try{w.terminate();}catch(_){}
      this.workers.splice(i,1);retired++;
    }
    this.count=this.workers.length;
    if(retired)this.onEvent({type:"worker-pool-resized",pool:this.label,count:this.count,targetCount:this.targetCount,direction:"shrink",retired});
    return retired;
  }
  _workerFailure(w,e){
    const taskId=w._task,p=taskId!=null?this.pending.get(taskId):null;
    if(p){
      this.pending.delete(taskId);this.stats.failed++;this._groupStats(p.group).failed++;
      p.reject(new Error(`worker ${w._id} crashed during task ${taskId}: ${e?.message||"message error"}`));
    }
    const event={type:"worker-error",pool:this.label,worker:w._id,taskId:taskId??null,group:p?.group??null,envId:p?.envId??null,message:e?.message||"worker failure",poolSnapshot:this.snapshot()};
    this.onEvent(event);
    try{w.terminate();}catch(_){}
    const idx=this.workers.indexOf(w);
    if(idx>=0){
      this.workers.splice(idx,1);
      if(this.workers.length<this.targetCount)this.workers.push(this._spawn());
    }
    this.count=this.workers.length;
    this._retireIdleWorkers();
    this._pump();
  }
  destroy(){
    const workers=this.workers.splice(0);
    for(const w of workers){try{w.terminate();}catch(_){}}
    this.queue=[];
    for(const p of this.pending.values())p.reject(new Error("worker pool destroyed"));
    this.pending.clear();
    this.count=0;this.targetCount=0;
  }
  resize(nextCount){
    const target=Math.max(1,Math.floor(Number(nextCount)||1)),before=this.workers.length;
    this.targetCount=target;
    if(target>before){
      for(let i=before;i<target;i++)this.workers.push(this._spawn());
      this.count=this.workers.length;
      this.onEvent({type:"worker-pool-resized",pool:this.label,count:this.count,targetCount:this.targetCount,direction:"grow"});
      this._pump();
      return this.count;
    }
    if(target<before){
      this._retireIdleWorkers();
      this._pump();
      return this.count;
    }
    this.count=this.workers.length;
    this.onEvent({type:"worker-pool-resized",pool:this.label,count:this.count,targetCount:this.targetCount,direction:"same"});
    return this.count;
  }
  submit(payload){
    return new Promise((resolve,reject)=>{
      const taskId=this.nextTask++,submittedAt=this._now(),group=String(payload?.group||"")||null,envId=payload?.envId??payload?.envs?.[0]?.envId??null;
      this.pending.set(taskId,{resolve,reject,submittedAt,dispatchedAt:null,group,envId,type:payload?.type||"task"});
      this.queue.push({taskId,...payload});
      this.stats.submitted++;this._groupStats(group).submitted++;
      this._pump();
    });
  }
  _takeFair(){
    if(!this.queue.length)return null;
    let idx=0;
    if(this.lastDequeuedGroup!=null){
      const other=this.queue.findIndex(x=>String(x.group||"")!==this.lastDequeuedGroup);
      if(other>=0)idx=other;
    }
    const [task]=this.queue.splice(idx,1);
    this.lastDequeuedGroup=String(task.group||"");
    return task;
  }
  _pump(){
    this._retireIdleWorkers();
    for(const w of this.workers){
      if(w._busy||!this.queue.length)continue;
      const task=this._takeFair(),p=this.pending.get(task.taskId),now=this._now();
      w._busy=true;w._task=task.taskId;w._progress=null;
      if(p){
        p.dispatchedAt=now;
        const q=Math.max(0,now-p.submittedAt);
        this.stats.totalQueueMs+=q;this.stats.maxQueueMs=Math.max(this.stats.maxQueueMs,q);
        const gs=this._groupStats(p.group);gs.totalQueueMs+=q;gs.maxQueueMs=Math.max(gs.maxQueueMs,q);
      }
      try{
        let wire=task;
        if(task.modelCacheKey){
          const key=String(task.modelCacheKey);
          if(w._modelCacheKeys.has(key)){wire={...task};delete wire.modelCachePayload;}
          else{
            w._modelCacheKeys.add(key);
            while(w._modelCacheKeys.size>6)w._modelCacheKeys.delete(w._modelCacheKeys.values().next().value);
          }
        }
        w.postMessage(wire);
      }catch(e){
        if(p){this.pending.delete(task.taskId);p.reject(e);}
        w._busy=false;w._task=null;
      }
    }
  }
  snapshot(){
    const now=this._now();
    return{
      label:this.label,count:this.count,targetCount:this.targetCount,
      busy:this.workers.filter(w=>w._busy).length,queued:this.queue.length,pending:this.pending.size,
      stats:{...this.stats,byGroup:Object.fromEntries(Object.entries(this.stats.byGroup).map(([g,s])=>[g,{...s}]))},
      workers:this.workers.map(w=>{
        const p=w._task!=null?this.pending.get(w._task):null;
        return{id:w._id,busy:Boolean(w._busy),taskId:w._task??null,group:p?.group??null,envId:p?.envId??null,runMs:p?.dispatchedAt==null?0:Math.max(0,now-p.dispatchedAt),queueMs:p?.dispatchedAt==null&&p?Math.max(0,now-p.submittedAt):0,progress:w._progress?{...w._progress}:null};
      })
    };
  }
  _message(w,msg){
    const p=this.pending.get(msg.taskId);if(!p)return;
    if(msg.type==="preview"){
      this.onEvent({type:"preview",pool:this.label,worker:w._id,group:p.group,taskId:msg.taskId,...msg});return;
    }
    if(msg.type==="live-sim"){
      this.onEvent({type:"live-sim",pool:this.label,worker:w._id,group:p.group,taskId:msg.taskId,...msg});return;
    }
    if(msg.type==="progress"){
      w._progress={done:Number(msg.done)||0,total:Number(msg.total)||0,envId:msg.envId??null,batchNumber:msg.batchNumber??null,policyVersion:msg.policyVersion??null};
      this.onEvent({type:"progress",pool:this.label,worker:w._id,group:p.group,taskId:msg.taskId,...w._progress});return;
    }
    this.pending.delete(msg.taskId);w._busy=false;w._task=null;w._progress=null;
    const runMs=p.dispatchedAt==null?0:Math.max(0,this._now()-p.dispatchedAt);
    this.stats.totalRunMs+=runMs;this.stats.maxRunMs=Math.max(this.stats.maxRunMs,runMs);
    const gs=this._groupStats(p.group);gs.totalRunMs+=runMs;gs.maxRunMs=Math.max(gs.maxRunMs,runMs);
    if(msg.type==="error"){
      this.stats.failed++;gs.failed++;
      const err=new Error(msg.message||"worker task failed");
      if(msg.stack)err.stack=`${err.name}: ${err.message}\nWorker stack:\n${msg.stack}`;
      p.reject(err);
    }else{
      this.stats.completed++;gs.completed++;p.resolve({...msg,_workerId:w._id});
    }
    this._retireIdleWorkers();
    this._pump();
  }
}
