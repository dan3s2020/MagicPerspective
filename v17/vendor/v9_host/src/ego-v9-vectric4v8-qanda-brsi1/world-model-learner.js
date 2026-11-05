import {RNG} from "./math.js";

export const WORLD_MODEL_VERSION=3;
export const WORLD_MODEL_FEATURE_N=38;
export const WORLD_MODEL_HIDDEN_N=16;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const zeros=n=>new Float64Array(n);
function sigmoid(x){return x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));}
function randn(r,s){return r.normal()*s;}

export function createWorldModel(seed=1){
  const r=new RNG((seed>>>0)^0x574F524C),w1=zeros(WORLD_MODEL_FEATURE_N*WORLD_MODEL_HIDDEN_N),b1=zeros(WORLD_MODEL_HIDDEN_N),w2=zeros(WORLD_MODEL_HIDDEN_N),b2=zeros(1);
  for(let i=0;i<w1.length;i++)w1[i]=randn(r,Math.sqrt(2/WORLD_MODEL_FEATURE_N));
  for(let i=0;i<w2.length;i++)w2[i]=randn(r,Math.sqrt(2/WORLD_MODEL_HIDDEN_N));
  return{version:WORLD_MODEL_VERSION,inputN:WORLD_MODEL_FEATURE_N,hiddenN:WORLD_MODEL_HIDDEN_N,w1,b1,w2,b2};
}
export function worldModelParameterCount(m){return m.w1.length+m.b1.length+m.w2.length+m.b2.length;}
export function encodeWorldModelFeatures({priorWall=.5,priorConfidence=0,cortical=null,echo=null,face=null,physicalDimensions=2}={}){
  return Float64Array.of(
    clamp((Number(priorWall)||.5)*2-1,-1,1),
    clamp(Number(priorConfidence)||0,0,1),
    clamp(Number(cortical?.coherence)||0,0,1),
    clamp(Number(cortical?.conflict)||0,0,1),
    clamp(Number(cortical?.energy)||0,0,1),
    clamp(Number(cortical?.phase)||0,-1,1),
    ...Array.from({length:8},(_,i)=>clamp(Number(cortical?.spectrumAmplitude?.[i])||0,0,1)),
    ...Array.from({length:8},(_,i)=>clamp(Number(cortical?.spectrumPhase?.[i])||0,-1,1)),
    clamp(Number(echo?.energy)||0,0,1),
    clamp(Number(echo?.novelty)||0,0,1),
    clamp(Number(echo?.phase)||0,-1,1),
    Math.tanh(Math.log2(1+Math.max(0,Number(echo?.delay)||0))/6),
    ...Array.from({length:8},(_,i)=>Math.tanh((Number(echo?.spectrum?.amplitude?.[i*2])||0)+(Number(echo?.spectrum?.amplitude?.[i*2+1])||0))),
    clamp(Number(face?.dx)||0,-1,1),
    clamp(Number(face?.dy)||0,-1,1),
    clamp(Number(face?.dz)||0,-1,1),
    physicalDimensions===3?1:0
  );
}
export function forwardWorldModel(m,x){
  const h=zeros(m.hiddenN);
  for(let j=0;j<m.hiddenN;j++){let z=m.b1[j];for(let i=0;i<m.inputN;i++)z+=m.w1[j*m.inputN+i]*x[i];h[j]=Math.tanh(z);}
  let z=m.b2[0];for(let j=0;j<m.hiddenN;j++)z+=m.w2[j]*h[j];
  return{pWall:sigmoid(z),h,logit:z};
}
export function predictWorldModel(m,features){return forwardWorldModel(m,features).pWall;}
export function zeroWorldGrad(m){return{w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(1),records:0,loss:0};}
export function addWorldGrad(a,b,scale=1){for(const k of ["w1","b1","w2","b2"])for(let i=0;i<a[k].length;i++)a[k][i]+=scale*b[k][i];a.records+=(b.records||0)*scale;a.loss+=(b.loss||0)*scale;return a;}
export function visitWorldGrad(g,fn){for(const k of ["w1","b1","w2","b2"])fn(g[k],k);}
export function worldGradNorm(g){let q=0;visitWorldGrad(g,a=>{for(const x of a)q+=x*x;});return Math.sqrt(q);}
export function scaleWorldGrad(g,s){for(const k of ["w1","b1","w2","b2"])for(let i=0;i<g[k].length;i++)g[k][i]*=s;g.records*=s;g.loss*=s;return g;}
export function trainWorldModelRecords(m,records=[]){
  const g=zeroWorldGrad(m);if(!records.length)return g;
  for(const r of records){
    const x=r.features instanceof Float64Array?r.features:Float64Array.from(r.features||[]),y=clamp(Number(r.targetWall)||0,0,1),w=Math.max(.05,Number(r.weight)||1),f=forwardWorldModel(m,x),dz=w*(f.pWall-y);
    g.loss+=w*(-y*Math.log(Math.max(1e-12,f.pWall))-(1-y)*Math.log(Math.max(1e-12,1-f.pWall)));
    g.b2[0]+=dz;
    for(let j=0;j<m.hiddenN;j++){
      g.w2[j]+=dz*f.h[j];
      const dh=dz*m.w2[j]*(1-f.h[j]*f.h[j]);g.b1[j]+=dh;
      const base=j*m.inputN;for(let i=0;i<m.inputN;i++)g.w1[base+i]+=dh*x[i];
    }
    g.records+=w;
  }
  scaleWorldGrad(g,1/records.length);g.records=records.length;return g;
}
export function trainWorldModelRecordContribution(m,records,index){
  if(!Number.isInteger(index)||index<0||index>=records.length)throw new Error("world-model contribution index out of range");
  const g=trainWorldModelRecords(m,[records[index]]);
  // trainWorldModelRecords is an average. One record's exact contribution to
  // the N-record average is its one-record gradient divided by N.
  return scaleWorldGrad(g,1/Math.max(1,records.length));
}
export function createWorldAdam(m){
  const z=()=>({w1:zeros(m.w1.length),b1:zeros(m.b1.length),w2:zeros(m.w2.length),b2:zeros(1)});
  return{step:0,m:z(),v:z()};
}
export function applyWorldGrad(m,g,opt,lr=.001,maxNorm=2){
  let q=0;for(const k of ["w1","b1","w2","b2"])for(const x of g[k])q+=x*x;const raw=Math.sqrt(q),clip=raw>maxNorm?maxNorm/Math.max(1e-12,raw):1;
  opt.step++;const b1=.9,b2=.999,eps=1e-8;
  for(const k of ["w1","b1","w2","b2"]){
    const p=m[k],mm=opt.m[k],vv=opt.v[k],gg=g[k];
    for(let i=0;i<p.length;i++){
      const x=gg[i]*clip;mm[i]=b1*mm[i]+(1-b1)*x;vv[i]=b2*vv[i]+(1-b2)*x*x;
      const mh=mm[i]/(1-Math.pow(b1,opt.step)),vh=vv[i]/(1-Math.pow(b2,opt.step));p[i]-=lr*mh/(Math.sqrt(vh)+eps);
    }
  }
  return{rawNorm:raw,clippedNorm:raw*clip,records:g.records||0,loss:g.loss||0};
}
export function worldModelSnapshot(m){return{version:m.version,inputN:m.inputN,hiddenN:m.hiddenN,parameterCount:worldModelParameterCount(m)};}
