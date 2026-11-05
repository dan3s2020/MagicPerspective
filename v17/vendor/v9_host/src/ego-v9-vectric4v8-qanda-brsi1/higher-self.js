import { NET } from "./config.js";
import { sigmoid } from "./math.js";

function dense(outN,inN,rng,scale=Math.sqrt(1/(inN+outN))){
  const W=new Float64Array(outN*inN),b=new Float64Array(outN);
  for(let i=0;i<W.length;i++)W[i]=rng.normal()*scale;
  return {W,b,outN,inN};
}
function df(p,x){const y=new Float64Array(p.outN);for(let o=0;o<p.outN;o++){let s=p.b[o],r=o*p.inN;for(let i=0;i<p.inN;i++)s+=p.W[r+i]*x[i];y[o]=s;}return {x,y};}
function db(p,g,c,dy){const dx=new Float64Array(p.inN);for(let o=0;o<p.outN;o++){const d=dy[o];g.b[o]+=d;let r=o*p.inN;for(let i=0;i<p.inN;i++){g.W[r+i]+=d*c.x[i];dx[i]+=p.W[r+i]*d;}}return dx;}
function cat(a,b){const o=new Float64Array(a.length+b.length);o.set(a);o.set(b,a.length);return o;}
function zd(p){return {W:new Float64Array(p.W.length),b:new Float64Array(p.b.length),outN:p.outN,inN:p.inN};}

export function poolSelfStates(states){
  const n=NET.selfHidden,mean=new Float64Array(n),max=new Float64Array(n);max.fill(-Infinity);
  if(!states.length)max.fill(0);
  for(const s of states)for(let i=0;i<n;i++){mean[i]+=s[i];if(s[i]>max[i])max[i]=s[i];}
  if(states.length)for(let i=0;i<n;i++)mean[i]/=states.length;
  return cat(mean,max);
}

export function createHigherSelf(rng){
  const inN=NET.selfHidden*2,h=NET.higherHidden;
  return {version:1,inN,h,
    Wz:dense(h,inN+h,rng),Wr:dense(h,inN+h,rng),Wh:dense(h,inN+h,rng),
    context:dense(NET.higherContext,h,rng),predict:dense(inN,NET.higherContext,rng)};
}
export function zeroHigherGrad(m){return {Wz:zd(m.Wz),Wr:zd(m.Wr),Wh:zd(m.Wh),context:zd(m.context),predict:zd(m.predict)};}

export function forwardHigher(m,pool,hPrev){
  const base=cat(pool,hPrev),zc=df(m.Wz,base),rc=df(m.Wr,base),z=new Float64Array(m.h),r=new Float64Array(m.h);
  for(let i=0;i<m.h;i++){z[i]=sigmoid(zc.y[i]);r[i]=sigmoid(rc.y[i]);}
  const rh=new Float64Array(m.h);for(let i=0;i<m.h;i++)rh[i]=r[i]*hPrev[i];
  const hc=df(m.Wh,cat(pool,rh)),hh=new Float64Array(m.h),h=new Float64Array(m.h);
  for(let i=0;i<m.h;i++){hh[i]=Math.tanh(hc.y[i]);h[i]=(1-z[i])*hPrev[i]+z[i]*hh[i];}
  const cc=df(m.context,h),context=new Float64Array(NET.higherContext);
  for(let i=0;i<context.length;i++)context[i]=Math.tanh(cc.y[i]);
  const pc=df(m.predict,context);
  return {hidden:h,context,prediction:pc.y,cache:{pool,hPrev,base,zc,rc,z,r,rh,hc,hh,cc,context,pc}};
}

function backwardHigherStep(m,g,c,dH,dPred,dContext){
  let dh=Float64Array.from(dH);
  const dc=new Float64Array(NET.higherContext);
  if(dPred){
    const x=db(m.predict,g.predict,c.pc,dPred);
    for(let i=0;i<dc.length;i++)dc[i]+=x[i];
  }
  if(dContext)for(let i=0;i<dc.length;i++)dc[i]+=dContext[i]||0;
  const dpre=new Float64Array(dc.length);
  for(let i=0;i<dpre.length;i++)dpre[i]=dc[i]*(1-c.context[i]*c.context[i]);
  const cx=db(m.context,g.context,c.cc,dpre);
  for(let i=0;i<dh.length;i++)dh[i]+=cx[i];
  const dz=new Float64Array(m.h),dhh=new Float64Array(m.h),dhPrev=new Float64Array(m.h);
  for(let i=0;i<m.h;i++){dhPrev[i]+=dh[i]*(1-c.z[i]);dz[i]=dh[i]*(c.hh[i]-c.hPrev[i]);dhh[i]=dh[i]*c.z[i];}
  const dah=new Float64Array(m.h);for(let i=0;i<m.h;i++)dah[i]=dhh[i]*(1-c.hh[i]*c.hh[i]);
  const dq=db(m.Wh,g.Wh,c.hc,dah),dr=new Float64Array(m.h);
  for(let i=0;i<m.h;i++){const q=dq[m.inN+i];dr[i]+=q*c.hPrev[i];dhPrev[i]+=q*c.r[i];}
  const dar=new Float64Array(m.h);for(let i=0;i<m.h;i++)dar[i]=dr[i]*c.r[i]*(1-c.r[i]);
  const br=db(m.Wr,g.Wr,c.rc,dar);
  const daz=new Float64Array(m.h);for(let i=0;i<m.h;i++)daz[i]=dz[i]*c.z[i]*(1-c.z[i]);
  const bz=db(m.Wz,g.Wz,c.zc,daz);
  for(let i=0;i<m.h;i++)dhPrev[i]+=br[m.inN+i]+bz[m.inN+i];
  return dhPrev;
}

export function trainHigherSequence(m,records,options={}){
  const g=zeroHigherGrad(m);if(!records.length)return {grad:g,loss:0};
  const cs=[];let h=Float64Array.from(records[0].hiddenBefore||new Float64Array(m.h)),loss=0;
  const lossWeights=options?.lossWeights||null;
  const lossWeight=(i)=>lossWeights?Number(lossWeights[i]??0):1;
  for(const r of records){const f=forwardHigher(m,r.pool,h);cs.push({r,f});h=f.hidden;}
  let dh=new Float64Array(m.h);
  for(let t=cs.length-1;t>=0;t--){
    const {r,f}=cs[t],dp=new Float64Array(m.inN),lw=lossWeight(t);
    for(let i=0;i<dp.length;i++){const e=f.prediction[i]-r.nextPool[i];loss+=e*e/dp.length;dp[i]=lw*2*e/dp.length;}
    dh=backwardHigherStep(m,g,f.cache,dh,dp,null);
  }
  const scale=1/records.length;for(const p of [g.Wz,g.Wr,g.Wh,g.context,g.predict]){for(let i=0;i<p.W.length;i++)p.W[i]*=scale;for(let i=0;i<p.b.length;i++)p.b[i]*=scale;}
  return {grad:g,loss:loss/records.length};
}

export function trainHigherSequenceContribution(model,records,index){
  const n=records?.length||0;
  if(!Number.isInteger(index)||index<0||index>=n)throw new Error("higher contribution index out of range");
  const lossWeights=new Float64Array(n);lossWeights[index]=1;
  return trainHigherSequence(model,records,{lossWeights});
}

export function visitHigherPairs(m,g,fn){for(const k of ["Wz","Wr","Wh","context","predict"]){fn(m[k].W,g[k].W);fn(m[k].b,g[k].b);}}
export function higherGradNorm(g){let q=0;for(const k of ["Wz","Wr","Wh","context","predict"])for(const a of [g[k].W,g[k].b])for(const v of a)q+=v*v;return Math.sqrt(q);}
export function createHigherAdam(m){return {step:0,m:zeroHigherGrad(m),v:zeroHigherGrad(m)};}
export function higherAdamStep(m,g,opt,lr=8e-4,maxNorm=2){
  const n=higherGradNorm(g),s=n>maxNorm?maxNorm/Math.max(1e-12,n):1;
  if(s<1)for(const k of ["Wz","Wr","Wh","context","predict"])for(const a of [g[k].W,g[k].b])for(let i=0;i<a.length;i++)a[i]*=s;
  opt.step++;const b1=.9,b2=.999,e=1e-8,c1=1-Math.pow(b1,opt.step),c2=1-Math.pow(b2,opt.step);
  const ps=[],gs=[],ms=[],vs=[];visitHigherPairs(m,g,(p,x)=>{ps.push(p);gs.push(x);});visitHigherPairs(opt.m,opt.m,(p)=>ms.push(p));visitHigherPairs(opt.v,opt.v,(p)=>vs.push(p));
  for(let k=0;k<ps.length;k++)for(let i=0;i<ps[k].length;i++){const x=gs[k][i];ms[k][i]=b1*ms[k][i]+(1-b1)*x;vs[k][i]=b2*vs[k][i]+(1-b2)*x*x;ps[k][i]-=lr*(ms[k][i]/c1)/(Math.sqrt(vs[k][i]/c2)+e);}
  return {rawNorm:n,clippedNorm:n*s};
}

export function addHigherGrad(dst,src,scale=1){
  for(const k of ["Wz","Wr","Wh","context","predict"]){
    for(let i=0;i<dst[k].W.length;i++)dst[k].W[i]+=scale*src[k].W[i];
    for(let i=0;i<dst[k].b.length;i++)dst[k].b[i]+=scale*src[k].b[i];
  }
}
export function scaleHigherGrad(g,scale){
  for(const k of ["Wz","Wr","Wh","context","predict"]){
    for(let i=0;i<g[k].W.length;i++)g[k].W[i]*=scale;
    for(let i=0;i<g[k].b.length;i++)g[k].b[i]*=scale;
  }
}

export function higherParameterCount(model){
  let n=0;
  for(const k of ["Wz","Wr","Wh","context","predict"])n+=model[k].W.length+model[k].b.length;
  return n;
}


export function higherPredictionMse(m,record){
  const f=forwardHigher(m,record.pool,record.hiddenBefore||new Float64Array(m.h));
  let q=0,n=Math.min(f.prediction.length,record.nextPool?.length||0);
  for(let i=0;i<n;i++){const d=f.prediction[i]-record.nextPool[i];q+=d*d;}
  return n?q/n:0;
}
