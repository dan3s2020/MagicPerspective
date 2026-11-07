// V31 original Discoverer attribution math expressed in LOG potential.
// Research opt-in: correct finite precision cutoff for extremely long paths.
// Original Brain.disc, original .shape()/shapeGraph(), original learned actions,
// CUDA, UI and checkpoints are NOT changed.
//
// The native relation is V[i] = .97*conduct(kind[i])*max_(i->j) V[j].
// Because log is monotone:
// logV[i] = log(.97*conduct(kind[i])) + max_(i->j) logV[j].
// This is the SAME objective, not a BFS/A* oracle or a learned substitute.
// For length >~850, original epsilon=1e-12 stops propagation prematurely;
// log values preserve strictly positive potentials over arbitrarily long
// finite routes (until Float64 log distance itself loses order precision).
// Large observed topology can be represented by validated lazy transitions
// so the WHOLE graph is navigable without materializing millions of objects.
const GAMMA=.97;
class Heap{
 constructor(){this.a=[];}
 add(i,v){
  const a=this.a;let p=a.length;a.push({i,v});
  while(p>0){const z=(p-1)>>1;if(a[z].v>=v)break;a[p]=a[z];p=z;}
  a[p]={i,v};
 }
 shift(){
  const a=this.a;if(!a.length)return null;
  const ret=a[0],last=a.pop();if(!a.length)return ret;
  let p=0;while(p*2+1<a.length){
   let c=p*2+1;if(c+1<a.length&&a[c+1].v>a[c].v)c++;
   if(a[c].v<=last.v)break;a[p]=a[c];p=c;
  }a[p]=last;return ret;
 }
 get length(){return this.a.length;}
}
const to=e=>typeof e==="number"?e:e?.to;
export function originalAttractionLogDomain(discoverer,{size,start,
  kindAt,outgoing,incoming,maxActions=size,validateTopology=true}={}){
 if(!discoverer||typeof discoverer.attract!=="function"||
  typeof discoverer.conduct!=="function"||
  !Number.isSafeInteger(size)||size<2||size>3000000||
  !Number.isSafeInteger(start)||start<0||start>=size||
  !Number.isSafeInteger(maxActions)||maxActions<1||maxActions>size||
  typeof kindAt!=="function"||typeof outgoing!=="function"||
  typeof incoming!=="function")
  throw Error("Invalid original observed learned topology");
 const att=[0,1,2,3].map(i=>discoverer.attract(i));
 const cond=[0,1,2,3].map(i=>discoverer.conduct(i));
 const types=new Uint8Array(size),logV=new Float64Array(size).fill(-Infinity),
   seed=new Uint8Array(size);
 let goalCount=0,edges=0;
 for(let i=0;i<size;i++){
  const k=kindAt(i);
  if(!Number.isInteger(k)||k<0||k>3)throw Error("Invalid learned state kind");
  types[i]=k;
  if(i!==start&&att[k]>.2){logV[i]=Math.log(att[k]);seed[i]=1;goalCount++;}
  if(validateTopology){
   const out=outgoing(i);if(!Array.isArray(out))throw Error("Unvalidated forward transitions");
   for(const e of out){
    const j=to(e);
    if(!Number.isSafeInteger(j)||j<0||j>=size)
     throw Error("Invalid learned directed forward edge");
    edges++;
   }
  }
 }
 if(!goalCount)return null;
 const heap=new Heap();
 for(let i=0;i<size;i++)if(seed[i])heap.add(i,logV[i]);
 let visits=0,relax=0;
 while(heap.length){
  const x=heap.shift();visits++;
  if(x.v!==logV[x.i])continue;
  const back=incoming(x.i);
  if(!Array.isArray(back))throw Error("Unvalidated learned reverse transitions");
  for(const pred of back){
   const i=to(pred);
   if(!Number.isSafeInteger(i)||i<0||i>=size)throw Error("Invalid learned reverse edge");
   if(seed[i])continue;
   const c=i===start?1:cond[types[i]];
   if(c<.5)continue;
   const next=x.v+Math.log(GAMMA*c);
   if(next>logV[i]){logV[i]=next;heap.add(i,next);relax++;}
  }
 }
 const path=[],visited=new Set([start]);let p=start;
 for(let a=0;a<maxActions;a++){
  let best=-1,score=logV[p],action=null;
  const forward=outgoing(p);
  if(!Array.isArray(forward))throw Error("Invalid forward transitions");
  for(const edge of forward){
   const j=to(edge);
   if(visited.has(j)||logV[j]<=logV[p])continue;
   if(logV[j]>score){best=j;score=logV[j];
    action=typeof edge==="number"?null:edge.action??null;}
  }
  if(best<0)break;
  path.push({from:p,to:best,action,logPotential:score});
  p=best;visited.add(p);
  if(seed[p])break;
 }
 if(!path.length)return null;
 return {path,targetReached:!!seed[p],firstPredictionBeforeAction:true,
  originalAttractionEquation:true,logPrecision:true,
  logValueAtStart:logV[start],
  valuesLog:logV,
  statistics:{size,validatedForwardEdges:edges,
   targetSeeds:goalCount,reverseRelaxations:relax,heapPops:visits,
   pathLength:path.length,goalReached:!!seed[p]}};
}
