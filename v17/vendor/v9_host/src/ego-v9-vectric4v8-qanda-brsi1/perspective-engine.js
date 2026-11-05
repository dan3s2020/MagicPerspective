const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const FEATURE_N=12;
const FEATURE_NAMES=["x","y","z","radius","wall","uncertainty","echo","touch-sign","confidence","evidence-strength","body-membership","recency"];
const STRUCTURAL_FEATURES=new Set([0,1,2,3,10]);
function norm(v){let q=0;for(const x of v)q+=x*x;return Math.sqrt(q);}
function dot(a,b){let s=0;for(let i=0;i<Math.min(a.length,b.length);i++)s+=a[i]*b[i];return s;}
function matVec(C,v){const o=new Float64Array(v.length);for(let i=0;i<v.length;i++){let s=0;for(let j=0;j<v.length;j++)s+=C[i][j]*v[j];o[i]=s;}return o;}
function orthogonalize(v,basis){for(const b of basis){const d=dot(v,b);for(let i=0;i<v.length;i++)v[i]-=d*b[i];}const n=norm(v);if(n>1e-12)for(let i=0;i<v.length;i++)v[i]/=n;return n;}
function eigenBasis(C,k){
  const basis=[],values=[];
  for(let c=0;c<k;c++){
    const v=Float64Array.from({length:C.length},(_,i)=>Math.sin((i+1)*(c+1)*1.61803398875)+Math.cos((i+3)*(c+2)*.73));
    if(orthogonalize(v,basis)<=1e-12){v.fill(0);v[c%C.length]=1;orthogonalize(v,basis);}
    for(let it=0;it<28;it++){const w=matVec(C,v);if(orthogonalize(w,basis)<=1e-12)break;v.set(w);}
    const Cv=matVec(C,v),ev=Math.max(0,dot(v,Cv));basis.push(Float64Array.from(v));values.push(ev);
  }
  return{basis,values};
}
function candidateDims(maxD,eff){
  const out=new Set([0,.25,.5,.75,1,Math.round(eff*4)/4]);
  for(let d=1.25;d<=Math.min(maxD,FEATURE_N)+1e-9;d+=.25)out.add(Math.round(d*100)/100);
  return[...out].filter(d=>d>=0&&d<=maxD+1e-9).sort((a,b)=>a-b);
}
function project(v,basis){return basis.map(b=>dot(v,b));}
function reconstruct(latent,basis,d){
  const out=new Float64Array(FEATURE_N),whole=Math.floor(d),frac=d-whole;
  for(let k=0;k<Math.min(whole,basis.length);k++)for(let i=0;i<FEATURE_N;i++)out[i]+=latent[k]*basis[k][i];
  if(frac>0&&whole<basis.length)for(let i=0;i<FEATURE_N;i++)out[i]+=frac*latent[whole]*basis[whole][i];
  return out;
}
function empiricalCycle(rows,mean,basis,d){
  if(!rows.length)return 1;let q=0,n=0;
  for(const r of rows.slice(0,512)){
    const centered=Float64Array.from(r.raw,(x,i)=>x-mean[i]),latent=project(centered,basis),back=reconstruct(latent,basis,d);
    for(let i=0;i<FEATURE_N;i++){const e=centered[i]-back[i];q+=e*e;n++;}
  }
  return q/Math.max(1,n);
}
function geometryDistortion(rows,mean,basis,d){
  const a=rows.slice(0,96);if(a.length<2)return 0;let q=0,n=0;
  const projected=a.map(r=>{const c=Float64Array.from(r.raw,(x,i)=>x-mean[i]);return reconstruct(project(c,basis),basis,d);});
  for(let i=0;i<a.length;i+=3)for(let j=i+1;j<a.length;j+=7){
    const raw=Math.hypot(a[i].raw[0]-a[j].raw[0],a[i].raw[1]-a[j].raw[1],a[i].raw[2]-a[j].raw[2]);
    if(raw<1e-8)continue;
    const z=projected[i],w=projected[j],lat=Math.hypot(z[0]-w[0],z[1]-w[1],z[2]-w[2]);
    q+=Math.abs(lat-raw)/raw;n++;
  }
  return q/Math.max(1,n);
}
function axisMetadata(basis,values){
  return basis.map((b,k)=>{
    let structural=0,semantic=0;for(let i=0;i<b.length;i++){const e=b[i]*b[i];if(STRUCTURAL_FEATURES.has(i))structural+=e;else semantic+=e;}
    const loadings=[...b].map((v,i)=>({feature:FEATURE_NAMES[i],loading:v,energy:v*v})).sort((a,c)=>c.energy-a.energy).slice(0,5);
    return{axis:k+1,eigenvalue:values[k]||0,kind:structural>=semantic?"structural":"semantic",structuralFraction:structural/Math.max(1e-12,structural+semantic),loadings};
  });
}
function retainedVariance(values,d){
  const whole=Math.floor(d),frac=d-whole;let s=0;
  for(let i=0;i<Math.min(whole,values.length);i++)s+=values[i];
  if(frac>0&&whole<values.length)s+=frac*values[whole];
  return s;
}
function recProbability(r){return r.wallA/Math.max(1e-12,r.wallA+r.wallB);}
function recConfidence(r){return clamp(Math.abs(recProbability(r)-.5)*2+.08*((r.touchWall||0)+(r.touchFree||0)),0,1);}
function featureRows(spatial){
  const rows=[],radius=Math.max(4,Number(spatial.radius)||48),poseSet=new Set((spatial.poses||[]).filter(Boolean).map(p=>p.x+","+p.y+","+p.z));
  for(const[k,r]of spatial.map){
    const[x,y,z]=k.split(",").map(Number),p=recProbability(r),u=4*p*(1-p),conf=recConfidence(r),e=Math.tanh(Number(r.echo)||0),touch=((r.touchWall||0)-(r.touchFree||0))/Math.max(1,(r.touchWall||0)+(r.touchFree||0)),strength=Math.tanh(Math.log1p((r.wallA||0)+(r.freeA||0))/3),body=poseSet.has(k)?1:0,rad=Math.hypot(x,y,z)/radius;
    const raw=Float64Array.of(clamp(x/radius,-2,2),clamp(y/radius,-2,2),clamp(z/radius,-2,2),clamp(rad,0,2),p*2-1,u*2-1,e,touch,conf*2-1,strength*2-1,body,Math.tanh((Number(r.last)||0)/128));
    rows.push({x,y,z,wall:p,unc:u,echo:e,last:r.last||0,raw});
  }
  return rows;
}
function covariance(rows){
  const mean=new Float64Array(FEATURE_N);if(!rows.length)return{mean,C:Array.from({length:FEATURE_N},()=>new Float64Array(FEATURE_N))};
  for(const r of rows)for(let i=0;i<FEATURE_N;i++)mean[i]+=r.raw[i];for(let i=0;i<FEATURE_N;i++)mean[i]/=rows.length;
  const C=Array.from({length:FEATURE_N},()=>new Float64Array(FEATURE_N));
  for(const r of rows)for(let i=0;i<FEATURE_N;i++){const a=r.raw[i]-mean[i];for(let j=0;j<=i;j++){const b=r.raw[j]-mean[j];C[i][j]+=a*b;}}
  const den=Math.max(1,rows.length-1);for(let i=0;i<FEATURE_N;i++)for(let j=0;j<=i;j++){C[i][j]/=den;C[j][i]=C[i][j];}
  return{mean,C};
}
export function createPerspectiveEngine(config){
  return{version:3,maxD:Math.max(3,Math.min(FEATURE_N,Number(config.perspectiveMaxLatentD)||8)),complexity:Number(config.perspectiveComplexityPenalty)||.015,activeD:1,effectiveD:0,last:null};
}
export function updatePerspectives(p,spatial,physicalD=2){
  const rows=featureRows(spatial),{mean,C}=covariance(rows),{basis,values}=eigenBasis(C,Math.min(FEATURE_N,Math.ceil(p.maxD))),total=Math.max(1e-12,values.reduce((a,b)=>a+b,0)),sq=Math.max(1e-12,values.reduce((a,b)=>a+b*b,0)),eff=clamp(total*total/sq,0,p.maxD),baseErr=clamp(Number(spatial.predictionErrorEMA)||0,0,1),cands=[];
  p.effectiveD=eff;
  for(const d of candidateDims(p.maxD,eff)){
    const recon=1-retainedVariance(values,d)/total,cycle=empiricalCycle(rows,mean,basis,d),distortion=geometryDistortion(rows,mean,basis,d),underPhysical=d+0.25<physicalD?(physicalD-d)*.08:0;
    const error=.42*recon+.24*cycle+.16*Math.min(2,distortion)+.18*baseErr/(1+.45*d)+underPhysical,score=error+p.complexity*d;
    cands.push({d,error,score,reconstructionError:recon,cycleReconstructionError:cycle,geometryDistortion:distortion});
  }
  cands.sort((a,b)=>a.score-b.score);p.activeD=cands[0]?.d??0;
  const points=rows.slice(0,4096).map(r=>{
    const centered=Float64Array.from(r.raw,(x,i)=>x-mean[i]),latent=basis.map(b=>dot(centered,b)),scale=6;
    return{x:r.x,y:r.y,z:r.z,raw:Array.from(r.raw),latent,project3:[(latent[0]||0)*scale,(latent[1]||0)*scale,(latent[2]||0)*scale],d4:latent[3]||0,d5:latent[4]||0,wall:r.wall,unc:r.unc,echo:r.echo,last:r.last};
  });
  const best=cands[0]||{error:1,score:1,d:0},second=cands[1]||best,latentContext=new Float64Array(Math.min(8,basis.length));let latentWeight=0;
  // A centered PCA cloud has zero ordinary mean. Instead expose a compact
  // uncertainty/echo-weighted latent "viewpoint" so the policy actually gets
  // content from the selected N-D perspective rather than only the scalar D.
  for(const pt of points){
    const w=.15+clamp(Number(pt.unc)||0,0,1)+.35*Math.min(1,Math.abs(Number(pt.echo)||0));latentWeight+=w;
    for(let i=0;i<latentContext.length;i++)latentContext[i]+=w*(Number(pt.latent?.[i])||0);
  }
  if(latentWeight>0)for(let i=0;i<latentContext.length;i++)latentContext[i]=Math.tanh(latentContext[i]/latentWeight*2);
  p.last={version:3,activeD:p.activeD,effectiveD:eff,candidates:cands,physicalD,points,eigenvalues:values,basis:basis.map(v=>Array.from(v)),mean:Array.from(mean),axes:axisMetadata(basis,values),latentContext:Array.from(latentContext),bestError:best.error,cycleReconstructionError:best.cycleReconstructionError||0,geometryDistortion:best.geometryDistortion||0,perspectiveGap:Math.max(0,second.score-best.score),featureNames:FEATURE_NAMES};
  return p.last;
}
export function perspectiveContext(p){
  const q=p.last||{},best=q.candidates?.[0]||{},second=q.candidates?.[1]||best;
  return{activeD:Number(q.activeD)||0,effectiveD:Number(q.effectiveD)||0,bestError:Number(best.error??q.bestError)||0,gap:Math.max(0,Number(second?.score)-Number(best?.score)||Number(q.perspectiveGap)||0),latentContext:Array.from(q.latentContext||[])};
}
export function perspectiveSnapshot(p){return p.last||{version:2,activeD:p.activeD,effectiveD:p.effectiveD,candidates:[],physicalD:2,points:[],eigenvalues:[],basis:[],mean:[],bestError:1,perspectiveGap:0};}
