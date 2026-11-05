import { addLocalGrad, localGradNorm, visitLocalGrad, visitLocalParamPairs, zeroLocalGrad } from "./brain.js";

function zeroLike(model){return zeroLocalGrad(model);}
export function createAdam(model){return {step:0,m:zeroLike(model),v:zeroLike(model)};}

export function clipLocalGrad(grad,maxNorm=2){
  const n=localGradNorm(grad);
  const scale=n>maxNorm?maxNorm/Math.max(1e-12,n):1;
  if(scale<1)visitLocalGrad(grad,a=>{for(let i=0;i<a.length;i++)a[i]*=scale;});
  return {rawNorm:n,clippedNorm:n*scale,scale};
}

export function adamStep(model,grad,opt,lr=8e-4,maxNorm=2){
  const clip=clipLocalGrad(grad,maxNorm), b1=.9,b2=.999,eps=1e-8;
  opt.step++;
  const c1=1-Math.pow(b1,opt.step),c2=1-Math.pow(b2,opt.step);
  const params=[],grads=[],ms=[],vs=[];
  visitLocalParamPairs(model,grad,(p,g)=>{params.push(p);grads.push(g);});
  visitLocalGrad(opt.m,a=>ms.push(a));visitLocalGrad(opt.v,a=>vs.push(a));
  for(let k=0;k<params.length;k++){
    const p=params[k],g=grads[k],m=ms[k],v=vs[k];
    for(let i=0;i<p.length;i++){
      const gi=Number.isFinite(g[i])?g[i]:0;
      m[i]=b1*m[i]+(1-b1)*gi;v[i]=b2*v[i]+(1-b2)*gi*gi;
      p[i]-=lr*(m[i]/c1)/(Math.sqrt(v[i]/c2)+eps);
    }
  }
  return clip;
}

export { addLocalGrad };
