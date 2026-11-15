// Same physically intersected 4D tesseract geometry as the existing independent frozen A/C experiment.
import assert from 'node:assert/strict';
const VERTICES=Array.from({length:16},(_,m)=>
  Array.from({length:4},(_,k)=>m&(1<<k)?1:-1));
const EDGES=[];
for(let i=0;i<16;i++)for(let axis=0;axis<4;axis++){
  const j=i^(1<<axis);if(i<j)EDGES.push([i,j]);
}
assert.equal(EDGES.length,32);
function random(seed){
  let x=seed>>>0;
  return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296;};
}
function rotate(v,a,b,t){
  const p=v.slice(),c=Math.cos(t),s=Math.sin(t);
  p[a]=c*v[a]-s*v[b];p[b]=s*v[a]+c*v[b];
  return p;
}
function orientation(seed){
  const r=random(seed);
  // Fully specified 4D rotations: changing order of 4D planes generally
  // changes the projection; independent of the sensor learner.
  return [[0,3,.18+1.14*r()],[1,3,-.9+1.8*r()],
          [2,3,-.7+1.4*r()],[0,2,-.8+1.6*r()]];
}
function slice4(angles,level){
  assert.ok(Number.isInteger(level)&&level>=0&&level<=4);
  const v=VERTICES.map(p=>angles.reduce((q,[a,b,t])=>rotate(q,a,b,t),p));
  const maxW=Math.max(...v.map(p=>Math.abs(p[3])));
  const h=(level-2)*.35*maxW;
  const samples=[];
  for(const [a,b] of EDGES){
    const u=v[a],w=v[b],delta=w[3]-u[3];
    if(Math.abs(delta)<1e-12){
      if(Math.abs(u[3]-h)<1e-9)samples.push(u.slice(0,3),w.slice(0,3));
      continue;
    }
    const t=(h-u[3])/delta;
    if(t>=-1e-10&&t<=1+1e-10){
      const s=Math.max(0,Math.min(1,t));
      samples.push([0,1,2].map(k=>u[k]+s*(w[k]-u[k])));
    }
  }
  const seen=new Set();
  return samples.filter(p=>{
    const key=p.map(x=>Math.round(x*1e7)).join(',');
    if(seen.has(key))return false;seen.add(key);return true;
  });
}
function sensor(points,view){
  // Real 2D quantized views of actual geometric cross-section points.
  // A projects primarily XY; C projects primarily ZY. No level/angle/seed
  // enters the Brain or its predicted output.
  const raster=new Array(16).fill(0);
  for(const p of points){
    const x=view==='A'?p[0]+.27*p[2]:p[2]-.22*p[0];
    const y=view==='A'?p[1]-.13*p[2]:p[1]+.19*p[0];
    const px=Math.max(0,Math.min(3,Math.floor((x+2.4)/4.8*4)));
    const py=Math.max(0,Math.min(3,Math.floor((y+2.4)/4.8*4)));
    raster[py*4+px]=Math.min(3,raster[py*4+px]+1);
  }
  // Physical sensor alphabet 48..51; empty and occupied cells counted separately.
  return raster.map(x=>48+x);
}
function frames(seed){
  const angles=orientation(seed);
  return Array.from({length:5},(_,level)=>{
    const cut=slice4(angles,level);
    return {level,pointCount:cut.length,A:sensor(cut,'A'),C:sensor(cut,'C')};
  });
}

export {frames,slice4,orientation,sensor};
