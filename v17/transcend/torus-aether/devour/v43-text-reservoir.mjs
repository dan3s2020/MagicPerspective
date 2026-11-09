// V43 genuine corpus producer: bounded, ordered multi-batch reservoir.
// Every batch originates from the ORIGINAL Parquet reader, no synthetic text
// or speculative substitute learning. Reads ahead while the CUDA card runs,
// keeping several future batches READY without unbounded host RAM growth.
export class V43TextReservoir {
  constructor(load,{depth=3,maxCharacters=520000,onState=null}={}){
    if(typeof load!=="function")throw Error("V43 reservoir requires original data reader");
    if(!Number.isInteger(depth)||depth<2||depth>8)throw Error("Invalid bounded depth");
    this.load=load;this.depth=depth;this.maxCharacters=maxCharacters;
    this.onState=onState;this.queue=[];this.reading=false;this.closed=false;
    this.ended=false;this.fault=null;this.waiters=[];this.totalLoaded=0;
    this.totalTaken=0;this.peakQueuedCharacters=0;
  }
  get queuedCharacters(){return this.queue.reduce((n,x)=>n+(x.chars||0),0)}
  get state(){return {readyBatches:this.queue.length,readyRows:this.queue.reduce((n,x)=>n+x.exs.length,0),
    queuedCharacters:this.queuedCharacters,peakQueuedCharacters:this.peakQueuedCharacters,
    depthLimit:this.depth,totalLoaded:this.totalLoaded,totalTaken:this.totalTaken,
    reading:this.reading,ended:this.ended,error:this.fault?.message||null}}
  start(){if(!this.closed&&!this.reading&&!this.ended&&!this.fault)
    void this._pump();}
  async _pump(){
    if(this.reading||this.closed||this.ended||this.fault)return;
    this.reading=true;
    try{
      while(!this.closed&&!this.ended&&this.queue.length<this.depth){
        if(this.queue.length&&this.queuedCharacters>=this.maxCharacters)break;
        const item=await this.load();
        if(this.closed)break;
        if(!item){this.ended=true;break}
        if(!Array.isArray(item.exs)||!item.exs.length||!Number.isFinite(item.chars))
          throw Error("Original V43 corpus reader produced invalid batch");
        this.totalLoaded++;
        if(this.waiters.length){
          this.totalTaken++;
          this.waiters.shift().resolve(item);
        }else{
          this.queue.push(item);
          this.peakQueuedCharacters=Math.max(this.peakQueuedCharacters,this.queuedCharacters);
        }
        this.onState?.(this.state);
      }
    }catch(err){this.fault=err;}
    finally{
      this.reading=false;
      if(this.ended||this.fault||this.closed){
        while(this.waiters.length){
          const w=this.waiters.shift();
          if(this.fault)w.reject(this.fault);else w.resolve(null);
        }
      }
      this.onState?.(this.state);
    }
  }
  async take(){
    if(this.fault)throw this.fault;
    if(this.queue.length){
      const item=this.queue.shift();this.totalTaken++;
      this.onState?.(this.state);this.start();return item;
    }
    if(this.ended||this.closed)return null;
    const ready=new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));
    this.start();return ready;
  }
  close(){
    this.closed=true;this.queue.length=0;
    while(this.waiters.length)this.waiters.shift().resolve(null);
    this.onState?.(this.state);
  }
}
