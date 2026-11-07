// MagicPerspective V31: sparse execution of the EXACT ORIGINAL Discoverer
// attraction/conductance equation on an OBSERVED directed state-transition graph.
//
// RESEARCH OPT-IN ONLY. Original Discoverer.shape()/shapeGraph(), Brain, CUDA,
// UI and .v8 checkpoint are NOT edited. This reduces 2N whole-graph sweeps to
// reverse, value-ordered updates. NOT a new BFS solution oracle, transformer,
// A*, token predictor, hardcoded path or privileged world simulator.
//
// The original equation for a nonterminal state is:
//   V[s] = .97 * conduct(kind[s]) * max_{s -> t} V[t]
// and seed target potential is attract(kind[t]) (learned by Discoverer).
// A body's initial state has conductance 1. Uphill path extraction retains
// original adjacency order and the strict V[next] > V[here] rule.
// The sparse routine supports ZERO geometry/edge preference only; these
// controls must stay explicit rather than silently changing original physics.
const DELTA=1e-12;
class MaxHeap {
 constructor(){this.arr=[];}
 push(index,value){
  const a=this.arr;let i=a.length;a.push({index,value});
  while(i){const p=(i-1)>>1;if(a[p].value>=value)break;
   a[i]=a[p];i=p;}a[i]={index,value};
 }
 pop(){
  const a=this.arr;if(!a.length)return null;
  const best=a[0],last=a.pop();if(!a.length)return best;
  let i=0;while((i*2+1)<a.length){
   let c=2*i+1;if(c+1<a.length&&a[c+1].value>a[c].value)c++;
   if(a[c].value<=last.value)break;
   a[i]=a[c];i=c;
  }a[i]=last;return best;
 }
 get length(){return this.arr.length;}
}
function endpoint(e){return typeof e==="number"?e:e?.to;}
export function originalAttractionSparse(discoverer,kinds,neighbors,me,{
 details=true,maxNodes=2000000,maxEdges=12000000,maxActions=undefined
}={}){
 if(!discoverer||typeof discoverer.attract!=="function"||
  typeof discoverer.conduct!=="function")throw Error("Original Discoverer required");
 if(!Array.isArray(kinds)||!Array.isArray(neighbors)||
  kinds.length!==neighbors.length||kinds.length>maxNodes||
  !Number.isInteger(me)||me<0||me>=kinds.length||
  !kinds.every(k=>Number.isInteger(k)&&k>=0&&k<=3))
  throw Error("Invalid original observed topology");
 const N=kinds.length,incoming=Array.from({length:N},()=>[]),out=neighbors;
 let edges=0;
 // This validates the ENTIRE observed graph before planning, including nodes
 // no path ends up traversing, exactly as native shapeGraph does.
 for(let i=0;i<N;i++){
  if(!Array.isArray(out[i]))throw Error("Invalid learned graph adjacency");
  for(const e of out[i]){
   const j=endpoint(e);
   if(!Number.isInteger(j)||j<0||j>=N)
    throw Error("Invalid learned graph edge");
   if(++edges>maxEdges)throw Error("Observed graph edge budget exceeded");
   incoming[j].push(i);
  }
 }
 const att=[0,1,2,3].map(k=>discoverer.attract(k));
 const cond=[0,1,2,3].map(k=>discoverer.conduct(k));
 const V=new Float64Array(N),heap=new MaxHeap();
 let targets=0,relaxations=0,popped=0;
 for(let i=0;i<N;i++)if(i!==me&&att[kinds[i]]>.2){
  V[i]=att[kinds[i]];heap.push(i,V[i]);targets++;
 }
 if(!targets)return null;
 while(heap.length){
  const poppedNode=heap.pop();popped++;
  const {index:j,value}=poppedNode;
  if(value!==V[j])continue;
  for(const i of incoming[j]){
   // Native operator never propagates out of a target.
   if(i!==me&&att[kinds[i]]>.2)continue;
   const c=i===me?1:cond[kinds[i]];
   if(c<.5)continue;
   const v=.97*c*value;
   if(v>V[i]+DELTA){V[i]=v;heap.push(i,v);relaxations++;}
  }
 }
 const path=[],visited=new Set([me]);let current=me;
 const limit=maxActions===undefined?N:maxActions;
 if(!Number.isSafeInteger(limit)||limit<0)throw Error("Invalid path length");
 for(let step=0;step<limit;step++){
  let best=-1,bestValue=V[current],bestEdge=null,options=[];
  for(const e of out[current]){
   const j=endpoint(e);
   if(visited.has(j)||V[j]<=V[current])continue;
   if(details)options.push({to:j,value:V[j],score:V[j],
    action:typeof e==="number"?null:e.action??null});
   if(V[j]>bestValue){
    bestValue=V[j];best=j;bestEdge=e;
   }
  }
  if(best<0)break;
  const edge=typeof bestEdge==="number"?{to:bestEdge}:bestEdge;
  path.push({from:current,to:best,action:edge.action??null,
   value:V[best],options:details?options:undefined});
  current=best;visited.add(current);
  if(att[kinds[current]]>.2)break;
 }
 if(!path.length)return null;
 const targetReached=att[kinds[current]]>.2;
 const stats={nodes:N,edges,seedTargets:targets,relaxations,popped,
  reached:targetReached,valueAtStart:V[me]};
 return details?{
  path,values:V,targetReached,firstPredictionBeforeAction:true,
  sharedOriginalAlgorithm:true,sparseExactEquation:true,
  geometricPreferenceUsed:false,statistics:stats
 }:path.map(e=>e.action);
}
