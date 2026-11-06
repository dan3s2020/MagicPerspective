/**
 * ONE algorithm: graph-topological lift of the ORIGINAL V17 Discoverer.shape()
 * (worlds/exercise.mjs). The maze version remains UNCHANGED.
 *
 * Original maze: four grid neighbors, same 0.97 attenuation, conduct/attract,
 * c<.5 wall resistance, goal seed >.2, 2*nodes relaxation and uphill traversal.
 *
 * New world: neighbors are experienced transitions, not a 2D grid. No latent
 * model, trainable encoder, token predictor, embedding, alternate planner or
 * dimensionality constant is introduced. Graph degree is unbounded by 2D.
 */
import {ACTIONS} from "../worlds/labyrinth.mjs";
import {selectUphillEdge} from "./successor-field.mjs";

const validate=({kinds,neighbors,start})=>{
 if(!Array.isArray(kinds)||!Array.isArray(neighbors)||kinds.length!==neighbors.length||kinds.length<1||
  !Number.isInteger(start)||start<0||start>=kinds.length)throw Error("Invalid observed world topology");
 if(kinds.some(k=>!Number.isInteger(k)||k<0||k>3))throw Error("Unknown observed cell kind");
 if(neighbors.some(row=>!Array.isArray(row)||row.some(e=>!Number.isInteger(e?.to)||e.to<0||e.to>=kinds.length)))
  throw Error("Invalid observed transition");
};
/** Exact V17 attraction field semantics over learned arbitrary adjacency. */
export function shapeOnLearnedTopology({kinds,neighbors,start,conduct,attract,temp=0,rand=Math.random,tieBreakValues=null}){
 validate({kinds,neighbors,start});
 if(typeof conduct!=="function"||typeof attract!=="function")throw Error("Provide original Discoverer conduct/attract laws");
 if(tieBreakValues!==null&&(!Array.isArray(tieBreakValues)||tieBreakValues.length!==kinds.length||
   tieBreakValues.some(v=>!Number.isFinite(v)||v<0||v>1)))
   throw Error("Invalid successor occupancy field");
 const count=kinds.length,att=[0,1,2,3].map(attract),cond=[0,1,2,3].map(conduct),
  V=new Float64Array(count);
 let any=false;
 for(let i=0;i<count;i++)if(att[kinds[i]]>.2&&i!==start){V[i]=att[kinds[i]];any=true;}
 if(!any)return {path:null,nodes:[start],values:Array.from(V),reason:"NO_LEARNED_ATTRACTOR"};
 // Exactly the SAME scalar update as original V17. A character-prefix DAG
 // has transitions only towards later-created nodes: a reverse pass computes
 // precisely the SAME converged field without 2*N repeated sweeps.
 // The original 2D maze has cycles, so it retains the literal V17 iteration.
 const relax=i=>{
  const k=kinds[i];if(att[k]>.2&&i!==start)return false;
  const c=i===start?1:cond[k];if(c<.5)return false;
  let best=0;
  for(const edge of neighbors[i]){const v=V[edge.to];if(v>best)best=v;}
  const v=.97*c*best;
  if(v>V[i]+1e-12){V[i]=v;return true;}
  return false;
 };
 const isForwardDAG=neighbors.every((row,i)=>row.every(e=>e.to>i));
 if(isForwardDAG){
  for(let i=count-1;i>=0;i--)relax(i);
 }else{
  for(let it=0;it<2*count;it++){
   let changed=false;
   for(let i=0;i<count;i++)if(relax(i))changed=true;
   if(!changed)break;
  }
 }
 const path=[],nodes=[start],seen=new Set([start]);let pos=start,tieBreaks=0;
 for(let k=0;k<count;k++){
  let best=-1,bv=V[pos];const uphill=[];
  for(let index=0;index<neighbors[pos].length;index++){
   const e=neighbors[pos][index],j=e.to;
   if(!seen.has(j)&&V[j]>V[pos])uphill.push([index,V[j]]);
   if(!seen.has(j)&&V[j]>bv){bv=V[j];best=index;}
  }
  if(temp&&uphill.length>1){
   let total=0;
   const draws=uphill.map(([i,v])=>{const p=Math.exp((v-bv)/(temp*.03*bv+1e-12));total+=p;return [i,p];});
   let r=rand()*total;for(const [i,p]of draws){r-=p;if(r<=0){best=i;break;}}
  }
  // The exact original V17 max-attraction route always wins. ONLY equal
  // attraction can use the independently measured successor occupancy.
  if(best>=0&&tieBreakValues!==null&&!temp){
   const secondary=selectUphillEdge(neighbors[pos],pos,V,seen,tieBreakValues);
   if(secondary.index>=0){best=secondary.index;if(secondary.usedSuccessor)tieBreaks++;}
  }
  if(best<0)break;
  const edge=neighbors[pos][best];
  path.push({from:pos,to:edge.to,action:edge.action??best,character:edge.character??null,
    transformation:edge.transformation??null});
  pos=edge.to;nodes.push(pos);seen.add(pos);
  if(att[kinds[pos]]>.2)break;
 }
 return {path:path.length?path:null,nodes,values:Array.from(V),successorTieBreaks:tieBreaks,
  reason:path.length?"SHAPE_PROPAGATED":"NO_ASCENDING_PATH",
  propagation:isForwardDAG?"SAME_V17_LAW_EXACT_REVERSE_DAG":"SAME_V17_ORIGINAL_RELAXATION"};
}
/**
 * Original 2D topology, preserving the exact order of the four ACTIONS.
 * Compare against original Discoverer.shape() in the acceptance suite.
 */
export function originalGridTopology(ret,n){
 if(ret.length!==n*n)throw Error("Grid dimensional mismatch");
 return {
  kinds:Array.from(ret),
  neighbors:Array.from({length:n*n},(_,i)=>{
   const edges=[];
   for(let a=0;a<4;a++){
    const x=i%n+ACTIONS[a][0],y=((i/n)|0)+ACTIONS[a][1];
    if(x>=0&&y>=0&&x<n&&y<n)edges.push({to:y*n+x,action:a});
   }
   return edges;
  })
 };
}
export function originalShapeAsTopology(discoverer,ret,n,me){
 const G=originalGridTopology(ret,n);
 const result=shapeOnLearnedTopology({...G,start:me,
  conduct:k=>discoverer.conduct(k),attract:k=>discoverer.attract(k),
  temp:discoverer.temp||0,rand:()=>discoverer.r.next()});
 return result.path?.map(e=>e.action)??null;
}
