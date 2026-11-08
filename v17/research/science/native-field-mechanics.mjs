// SCIENCE-ONLY READOUT of ORIGINAL Discoverer.shape(), without modifying it.
// Numeric replay is intentionally transparent and checked path/field against
// the original solver in original-source integration tests.
import {KIND} from "../../transcend/torus-aether/worlds/exercise.mjs";
import {ACTIONS} from "../../transcend/torus-aether/worlds/labyrinth.mjs";

export function retinaForWorld(w){
  const ret=Array.from(w.wall,v=>v?KIND.wall:KIND.floor);
  if(!Number.isInteger(w.start)||!Number.isInteger(w.goal)||
    w.start<0||w.goal<0||w.start>=ret.length||w.goal>=ret.length||
    w.start===w.goal)throw Error("Need an actual nontrivial original maze");
  ret[w.goal]=KIND.target;ret[w.start]=KIND.self;
  return ret;
}
export function nextStep(n,i,a){
  const x=i%n+ACTIONS[a][0],y=Math.floor(i/n)+ACTIONS[a][1];
  return x<0||y<0||x>=n||y>=n?-1:y*n+x;
}
export function replayOriginalShape(D,ret,n,me,{keepFrames=true}={}){
  if(!Array.isArray(ret)||ret.length!==n*n||!Number.isInteger(me)||me<0||me>=ret.length)
    throw Error("Original state-space input invalid");
  const att=[0,1,2,3].map(k=>D.attract(k)),cond=[0,1,2,3].map(k=>D.conduct(k));
  const N=n*n,V=new Float64Array(N),frames=[];
  let seeds=0;
  for(let i=0;i<N;i++)if(att[ret[i]]>.2&&i!==me){V[i]=att[ret[i]];seeds++}
  if(!seeds)return {seedCount:0,frames:[],iterations:0,field:Array.from(V),path:null,att,cond,
    source:"read-only replay of original Discoverer.shape; no goal identified"};
  for(let it=0;it<2*N;it++){
    let changed=0,maxDelta=0,totalDelta=0;
    const before=keepFrames?Array.from(V):null;
    for(let i=0;i<N;i++){
      const k=ret[i];if(att[k]>.2&&i!==me)continue;
      const c=i===me?1:cond[k];if(c<.5)continue;
      let b=0;
      for(let a=0;a<4;a++){const j=nextStep(n,i,a);if(j>=0&&V[j]>b)b=V[j]}
      const v=.97*c*b;
      if(v>V[i]+1e-12){
        const delta=v-V[i];totalDelta+=delta;maxDelta=Math.max(maxDelta,delta);
        V[i]=v;changed++;
      }
    }
    frames.push({iteration:it+1,changed,maxDelta,totalDelta,
      // These are field values AFTER each original Gauss-Seidel update sweep.
      values:keepFrames?Array.from(V):null,initial:it===0?before:null});
    if(!changed)break;
  }
  let p=me;const seen=new Set([p]),path=[],pathCells=[p];
  for(let k=0;k<N;k++){
    let best=-1,bv=V[p];
    for(let a=0;a<4;a++){
      const j=nextStep(n,p,a);
      if(j>=0&&!seen.has(j)&&V[j]>bv){bv=V[j];best=a}
    }
    if(best<0)break;
    path.push(best);p=nextStep(n,p,best);seen.add(p);pathCells.push(p);
    if(att[ret[p]]>.2)break;
  }
  return {seedCount:seeds,frames,iterations:frames.length,field:Array.from(V),
    path:path.length?path:null,pathCells,att,cond,
    source:"Original Discoverer.shape equation replay; verified against native result when tested"};
}
export function independentWeightedDistance(ret,n,me,att,cond){
  // Reverse-source Dijkstra, with negative-log edge cost depending on the
  // STARTING node i of the forward transition i -> j. No oracle wall or
  // simulator goal coordinate is read; seeds come from the native attraction.
  const N=n*n,dist=Array(N).fill(Infinity),done=Array(N).fill(false);
  for(let i=0;i<N;i++)if(att[ret[i]]>.2&&i!==me)
    dist[i]=-Math.log(att[ret[i]]);
  for(let step=0;step<N;step++){
    let u=-1,b=Infinity;
    for(let i=0;i<N;i++)if(!done[i]&&dist[i]<b){b=dist[i];u=i}
    if(u<0)break;
    done[u]=true;
    for(let a=0;a<4;a++){
      const i=nextStep(n,u,a);if(i<0||done[i]||(att[ret[i]]>.2&&i!==me))continue;
      const c=i===me?1:cond[ret[i]];
      if(c<.5)continue;
      const candidate=dist[u]-Math.log(.97*c);
      if(candidate<dist[i])dist[i]=candidate;
    }
  }
  return dist.map(d=>Number.isFinite(d)?Math.exp(-d):0);
}
export function fieldEvidence(D,w,{keepFrames=true}={}){
  const ret=retinaForWorld(w),me=ret.indexOf(D.self());
  if(me<0)return {unavailable:"Original organism has not identified itself"};
  const r=replayOriginalShape(D,ret,w.n,me,{keepFrames});
  const independent=independentWeightedDistance(ret,w.n,me,r.att,r.cond);
  const err=Math.max(...independent.map((x,i)=>Math.abs(x-r.field[i])));
  const native=D.shape(ret,w.n,me);
  const identical=JSON.stringify(native)===JSON.stringify(r.path);
  // Read-only scientific intervention on a prototype-shadow of the frozen
  // original organism; ZERO mutation of the actual Brain or checkpoint.
  const goalOff=Object.create(D);goalOff.temp=0;goalOff.attract=()=>0;
  const floorOff=Object.create(D);floorOff.temp=0;
  floorOff.conduct=k=>k===KIND.floor?0:D.conduct(k);
  const traceEnd=actions=>{
    if(!Array.isArray(actions))return null;
    let i=me;
    for(const a of actions){const next=nextStep(w.n,i,a);if(next<0)return null;i=next}
    return i;
  };
  const goalOffPath=goalOff.shape(ret,w.n,me);
  const floorOffPath=floorOff.shape(ret,w.n,me);
  const counterfactual={
    originalReachesGoal:traceEnd(native)===w.goal,
    removeAttractionReachesGoal:traceEnd(goalOffPath)===w.goal,
    blockFloorReachesGoal:traceEnd(floorOffPath)===w.goal,
    removeAttractionHasPath:Array.isArray(goalOffPath),
    blockFloorHasPath:Array.isArray(floorOffPath),
    intervention:'frozen prototype-shadow, ORIGINAL Discoverer.shape, no checkpoint mutation'
  };
  return {...r,n:w.n,start:w.start,goal:w.goal,ret,wall:Array.from(w.wall),
    independentMaxAbsError:err,nativePathIdentical:identical,
    firstShapeBeforeAction:!!native,originalPath:native,counterfactual};
}


// Experimental alternative ENGINE, NOT wired into original Brain. Binary-heap
// reverse shortest path in O((V+E)log V). Used ONLY to benchmark a possible
// future exact optimization with mandatory route/value parity.
export function heapWeightedField(ret,n,me,att,cond){
  const N=n*n,dist=Array(N).fill(Infinity),heap=[];
  const push=(d,i)=>{
    let k=heap.length;heap.push([d,i]);
    while(k>0){const p=(k-1)>>1;if(heap[p][0]<=d)break;heap[k]=heap[p];k=p}
    heap[k]=[d,i];
  };
  const pop=()=>{
    const first=heap[0],last=heap.pop();
    if(heap.length){
      let k=0;
      while(true){
        let j=2*k+1;if(j>=heap.length)break;
        if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;
        if(heap[j][0]>=last[0])break;
        heap[k]=heap[j];k=j;
      }
      heap[k]=last;
    }
    return first;
  };
  for(let i=0;i<N;i++)if(att[ret[i]]>.2&&i!==me){
    dist[i]=-Math.log(att[ret[i]]);push(dist[i],i);
  }
  while(heap.length){
    const [du,u]=pop();if(du>dist[u]+1e-14)continue;
    for(let a=0;a<4;a++){
      const i=nextStep(n,u,a);
      if(i<0||(att[ret[i]]>.2&&i!==me))continue;
      const c=i===me?1:cond[ret[i]];if(c<.5)continue;
      const candidate=du-Math.log(.97*c);
      if(candidate<dist[i]-1e-14){dist[i]=candidate;push(candidate,i)}
    }
  }
  return dist.map(d=>Number.isFinite(d)?Math.exp(-d):0);
}
export function greedyFromField(field,ret,n,me,att){
  const path=[],seen=new Set([me]);let p=me;
  for(let k=0;k<n*n;k++){
    let best=-1,bv=field[p];
    for(let a=0;a<4;a++){
      const j=nextStep(n,p,a);
      if(j>=0&&!seen.has(j)&&field[j]>bv){bv=field[j];best=a}
    }
    if(best<0)break;
    path.push(best);p=nextStep(n,p,best);seen.add(p);
    if(att[ret[p]]>.2)break;
  }
  return path.length?path:null;
}
