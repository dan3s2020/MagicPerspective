// Evaluator-only REAL 4D polytope physics: different underlying 4D bodies,
// not a stylistic morphing animation or invented 2D images.
// Their physical intersections are what original Braivour senses and acts in.
// Never expose the family, 4D vertices, angles or shape seeds to the organism.
import assert from 'node:assert/strict';
import {orientation,sensor,frames as tesseractFrames} from './physical_sections.mjs';

function projectPoint(point,angles){
  let p=point.slice();
  for(const [a,b,theta] of angles){
    const q=p.slice(),c=Math.cos(theta),s=Math.sin(theta);
    q[a]=c*p[a]-s*p[b];
    q[b]=s*p[a]+c*p[b];
    p=q;
  }
  return p;
}
function edgesOfVertices(vertices,{family}){
  const edges=[];
  const distance=(a,b)=>a.reduce((x,v,j)=>x+(v-b[j])**2,0);
  if(family==='5-cell'){
    for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)edges.push([i,j]);
  } else {
    const pairDistances=[];
    for(let i=0;i<vertices.length;i++)for(let j=i+1;j<vertices.length;j++){
      pairDistances.push({i,j,d:distance(vertices[i],vertices[j])});
    }
    const minimum=Math.min(...pairDistances.map(x=>x.d));
    for(const e of pairDistances)if(Math.abs(e.d-minimum)<1e-7)edges.push([e.i,e.j]);
  }
  return edges;
}
function simplex4D(){
  const basis=[];
  for(let k=0;k<4;k++){
    let v=Array.from({length:5},(_,j)=>j===k?1:j===4?-1:0);
    for(const b of basis){
      const dot=v.reduce((s,x,j)=>s+x*b[j],0);
      v=v.map((x,j)=>x-dot*b[j]);
    }
    const norm=Math.sqrt(v.reduce((s,x)=>s+x*x,0));
    assert.ok(norm>1e-6);
    basis.push(v.map(x=>x/norm));
  }
  const V=[];
  for(let k=0;k<5;k++){
    const q=Array.from({length:5},(_,j)=>(j===k?1:0)-.2);
    V.push(basis.map(b=>2.2*q.reduce((s,x,j)=>s+x*b[j],0)));
  }
  for(let i=0;i<5;i++)for(let j=i+1;j<5;j++)
    assert.ok(Math.abs(V[i].reduce((s,v,k)=>s+(v-V[j][k])**2,0)-2*2.2*2.2)<1e-7);
  return V;
}
const POLY={
  '16-cell':Array.from({length:8},(_,i)=>{
    const v=[0,0,0,0];v[i>>1]=(i&1)?2:-2;return v;
  }),
  '5-cell':simplex4D(),
  '24-cell':(()=>{
    const vertices=[];
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)
      for(const a of [-1,1])for(const b of [-1,1]){
        const p=[0,0,0,0];p[i]=Math.SQRT2*a;p[j]=Math.SQRT2*b;
        vertices.push(p);
      }
    return vertices;
  })()
};
const EXPECTED={'16-cell':{vertices:8,edges:24},'5-cell':{vertices:5,edges:10},
  '24-cell':{vertices:24,edges:96}};
const BODIES=Object.fromEntries(Object.entries(POLY).map(([name,vertices])=>{
  const edges=edgesOfVertices(vertices,{family:name});
  assert.equal(vertices.length,EXPECTED[name].vertices);
  assert.equal(edges.length,EXPECTED[name].edges);
  return [name,{name,vertices,edges}];
}));
function cut(body,seed,level){
  assert.ok(body&&Number.isInteger(level)&&level>=0&&level<5);
  const rotated=body.vertices.map(v=>projectPoint(v,orientation(seed)));
  const maxW=Math.max(...rotated.map(v=>Math.abs(v[3])));
  const h=(level-2)*.35*maxW,pts=[];
  for(const [a,b] of body.edges){
    const p=rotated[a],q=rotated[b],d=q[3]-p[3];
    if(Math.abs(d)<1e-11){
      if(Math.abs(p[3]-h)<1e-9)pts.push(p.slice(0,3),q.slice(0,3));
      continue;
    }
    const t=(h-p[3])/d;
    if(t>=-1e-10&&t<=1+1e-10){
      const tau=Math.min(1,Math.max(0,t));
      pts.push([0,1,2].map(k=>p[k]+tau*(q[k]-p[k])));
    }
  }
  const seen=new Set();
  return pts.filter(p=>{
    const key=p.map(x=>Math.round(x*1e7)).join(',');
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
export function polytopeFrames(seed,family){
  if(family==='tesseract')return tesseractFrames(seed);
  const body=BODIES[family];
  if(!body)throw Error('Unknown physical polytope family');
  return Array.from({length:5},(_,level)=>{
    const points=cut(body,seed,level);
    return {level,pointCount:points.length,
      A:sensor(points,'A'),C:sensor(points,'C')};
  });
}
export const real4DPolytopeGeometry=Object.fromEntries(Object.entries(BODIES)
  .map(([name,body])=>[name,{vertices:body.vertices.length,
    edges:body.edges.length}]));
