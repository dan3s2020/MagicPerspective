// Strictly unseen 4D convex polytope family for falsification.
// Truncated regular 5-cell (truncated 4-simplex), with true 20 vertices,
// 40 edges, 3D hyperplane cross sections and dual 2D sensors.
// No physical vertices, target, family name or simulator state is exposed to
// the original Braivour body; only the read-only world evaluator calls this.
import assert from "node:assert/strict";
import {orientation,sensor} from "./physical_sections.mjs";
function make5Cell(){
 const basis=[];
 for(let k=0;k<4;k++){
  let v=Array.from({length:5},(_,j)=>j===k?1:j===4?-1:0);
  for(const b of basis){
   const dot=v.reduce((s,x,j)=>s+x*b[j],0);
   v=v.map((x,j)=>x-dot*b[j]);
  }
  const mag=Math.sqrt(v.reduce((s,x)=>s+x*x,0));
  basis.push(v.map(x=>x/mag));
 }
 return Array.from({length:5},(_,i)=>{
  const vec=Array.from({length:5},(_,j)=>(i===j?1:0)-.2);
  return basis.map(b=>2.2*vec.reduce((s,x,j)=>s+x*b[j],0));
 });
}
const base=make5Cell(),vertices=[],map=new Map(),edges=[];
for(let i=0;i<5;i++)for(let j=0;j<5;j++)if(i!==j){
 map.set(i+":"+j,vertices.length);
 vertices.push(base[i].map((x,k)=>(2*x+base[j][k])/3));
}
// Truncation creates a small tetrahedral vertex figure about each old vertex.
for(let i=0;i<5;i++){
 const remaining=Array.from({length:5},(_,j)=>j).filter(j=>j!==i);
 for(let a=0;a<remaining.length;a++)for(let b=a+1;b<remaining.length;b++)
   edges.push([map.get(i+":"+remaining[a]),map.get(i+":"+remaining[b])]);
}
// The original ten 5-cell edges become ten connectors after truncation.
for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)
 edges.push([map.get(i+":"+j),map.get(j+":"+i)]);
assert.equal(vertices.length,20);
assert.equal(edges.length,40);
const edgeLengths=new Set(edges.map(([i,j])=>
 Math.round(vertices[i].reduce((s,x,k)=>s+(x-vertices[j][k])**2,0)*1e6)));
assert.equal(edgeLengths.size,1,"Constructed truncated simplex edges are not regular");
function rotate(point,angles){
 let p=point.slice();
 for(const [a,b,t] of angles){
  const c=Math.cos(t),s=Math.sin(t),q=p.slice();
  q[a]=c*p[a]-s*p[b];q[b]=s*p[a]+c*p[b];p=q;
 }
 return p;
}
function slice(seed,level){
 const v=vertices.map(p=>rotate(p,orientation(seed)));
 const maxW=Math.max(...v.map(p=>Math.abs(p[3])));
 const h=(level-2)*.35*maxW,points=[];
 for(const [a,b] of edges){
  const p=v[a],q=v[b],delta=q[3]-p[3];
  if(Math.abs(delta)<1e-12){
    if(Math.abs(p[3]-h)<1e-9)points.push(p.slice(0,3),q.slice(0,3));
    continue;
  }
  const t=(h-p[3])/delta;
  if(t>=-1e-10&&t<=1+1e-10){
   const r=Math.min(1,Math.max(0,t));
   points.push([0,1,2].map(k=>p[k]+r*(q[k]-p[k])));
  }
 }
 const seen=new Set();
 return points.filter(p=>{
  const key=p.map(x=>Math.round(1e7*x)).join(',');
  if(seen.has(key))return false;seen.add(key);return true;
 });
}
export function truncated5CellFrames(seed){
 return Array.from({length:5},(_,level)=>{
  const pointset=slice(seed,level);
  return {level,pointCount:pointset.length,
   A:sensor(pointset,"A"),C:sensor(pointset,"C")};
 });
}
export const truncated5CellGeometry={vertices:20,edges:40,dimension:4,source:"true 4D truncated simplex"};
