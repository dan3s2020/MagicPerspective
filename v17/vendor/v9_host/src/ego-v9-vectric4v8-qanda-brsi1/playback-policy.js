export const GRID_PREVIEW_LIMIT=32;
export const GRID_PREVIEW_FPS=3;
export const PLAYBACK_BACKLOG_LIMIT=64;
export const PLAYBACK_CATCHUP_BATCH_GAP=10;

export function secondaryPreviewPlan(nA,nB,limit=GRID_PREVIEW_LIMIT){
  const out={A:new Set(),B:new Set()},cap=Math.max(0,Math.min(GRID_PREVIEW_LIMIT,Math.floor(Number(limit)||0)));
  let a=1,b=1,n=0;
  while(n<cap&&(a<nA||b<nB)){
    if(a<nA&&n<cap){out.A.add(a++);n++;}
    if(b<nB&&n<cap){out.B.add(b++);n++;}
  }
  return out;
}

function batchNumber(x){
  const n=Number(x?.batchNumber);
  if(!Number.isSafeInteger(n)||n<0)throw new Error("completed playback batch requires exact non-negative batchNumber");
  return n;
}
function simulationNumber(x){
  const n=Number(x?.simulationId??x?.envId??0);
  return Number.isSafeInteger(n)&&n>=0?n:0;
}
function keyOf(x){return batchNumber(x)+":"+simulationNumber(x);}
function compareItems(a,b){return batchNumber(a)-batchNumber(b)||simulationNumber(a)-simulationNumber(b);}
export function playbackIdentity(item){return{batchNumber:batchNumber(item),simulationId:simulationNumber(item)};}
export function isSimulationIdentityCut(previous,next){
 if(!previous||!next)return false;
 return simulationNumber(previous)!==simulationNumber(next);
}

export class LatestCompletedBatchPlayback {
  constructor(limit=PLAYBACK_BACKLOG_LIMIT){
    this.limit=Math.max(3,Math.floor(Number(limit)||PLAYBACK_BACKLOG_LIMIT));
    this.current=null;
    this.backlog=[];
    this.finished=true;
    this.seen=new Set();
    this.seenOrder=[];
    this.lastShownBatch=null;
    this.selectionReason="none_available";
  }

  reset(){
    this.current=null;
    this.backlog=[];
    this.finished=true;
    this.seen.clear();
    this.seenOrder=[];
    this.lastShownBatch=null;
    this.selectionReason="none_available";
  }

  _compact(){
    this.backlog.sort(compareItems);
    while(this.backlog.length>this.limit){
      let remove=1,bestSpan=Infinity,bestCenter=Infinity,mid=(this.backlog.length-1)/2;
      for(let i=1;i<this.backlog.length-1;i++){
        const span=batchNumber(this.backlog[i+1])-batchNumber(this.backlog[i-1]),center=Math.abs(i-mid);
        if(span<bestSpan||(span===bestSpan&&center<bestCenter)){remove=i;bestSpan=span;bestCenter=center;}
      }
      this.backlog.splice(remove,1);
    }
  }

  complete(item){
    const k=keyOf(item);
    if(this.seen.has(k))return null;
    this.seen.add(k);this.seenOrder.push(k);while(this.seenOrder.length>this.limit*4){const old=this.seenOrder.shift();if(old!=null)this.seen.delete(old);}
    if(!this.current||this.finished){
      this.current=item;
      this.finished=false;
      this.selectionReason=this.lastShownBatch==null?"first_completed":"resume_available";
      return item;
    }
    this.backlog.push(item);
    this.backlog.sort(compareItems);
    this._compact();
    return null;
  }

  finishCurrent(){
    if(!this.current)return null;
    this.lastShownBatch=batchNumber(this.current);
    this.finished=true;
    if(!this.backlog.length){this.selectionReason="none_available";return null;}

    this.backlog.sort(compareItems);
    const newest=batchNumber(this.backlog[this.backlog.length-1]);
    const gap=newest-this.lastShownBatch;
    let idx=0;

    if(gap>PLAYBACK_CATCHUP_BATCH_GAP){
      const target=this.lastShownBatch+Math.floor(gap/2);
      let bestDistance=Infinity,bestBatch=-Infinity;
      for(let i=0;i<this.backlog.length;i++){
        const b=batchNumber(this.backlog[i]),d=Math.abs(b-target);
        if(d<bestDistance||(d===bestDistance&&b>bestBatch)){idx=i;bestDistance=d;bestBatch=b;}
      }
      this.selectionReason="midpoint_catchup";
    }else{
      idx=0;
      this.selectionReason=batchNumber(this.backlog[0])===this.lastShownBatch?"same_batch_completed":"sequential";
    }

    const [next]=this.backlog.splice(idx,1);
    this.current=next;
    this.finished=false;
    return next;
  }

  snapshot(){
    this.backlog.sort(compareItems);
    return{
      currentBatch:this.current?batchNumber(this.current):null,
      currentSimulation:this.current?simulationNumber(this.current):null,
      lastShownBatch:this.lastShownBatch,
      unseenCompletedCount:this.backlog.length,
      backlogOldestBatch:this.backlog.length?batchNumber(this.backlog[0]):null,
      backlogNewestBatch:this.backlog.length?batchNumber(this.backlog[this.backlog.length-1]):null,
      selectionReason:this.selectionReason
    };
  }
}
