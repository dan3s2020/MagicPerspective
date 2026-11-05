import {emitSharedComplex,hearSharedComplex} from "./same-dish-shared-field.js";

const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function emitCorticalToSharedDish(field,corticalCell,{position,step=0,lifetimeSteps=null,observerProvenance=null}={}){
  if(!field||!corticalCell||!position)return null;
  return emitSharedComplex(field,{
    position,step,lifetimeSteps,
    real:corticalCell.real||[],
    imag:corticalCell.imag||[],
    observerProvenance
  });
}

export function hearSharedDishCortical(field,receiver,{step=0,solids=null,occlusion=true}={}){
  const raw=hearSharedComplex(field,receiver,{step,solids,occlusion}),bins=8,br=new Float64Array(bins),bi=new Float64Array(bins),ba=new Float64Array(bins);
  for(let b=0;b<raw.real.length;b++){
    const k=Math.min(bins-1,Math.floor(b*bins/Math.max(1,raw.real.length))),r=Number(raw.real[b])||0,i=Number(raw.imag[b])||0;
    br[k]+=r;bi[k]+=i;ba[k]+=Math.hypot(r,i);
  }
  const spectrumAmplitude=new Array(bins),spectrumPhase=new Array(bins);let coherent=0,total=0;
  for(let k=0;k<bins;k++){
    const m=Math.hypot(br[k],bi[k]);spectrumAmplitude[k]=Math.tanh(ba[k]);spectrumPhase[k]=ba[k]<=1e-12?0:Math.atan2(bi[k],br[k])/Math.PI;coherent+=m;total+=ba[k];
  }
  const coherence=total<=1e-12?0:clamp(coherent/total,0,1);
  return{
    coherence,conflict:total<=1e-12?0:1-coherence,energy:raw.energy,phase:raw.phase,
    spectrumAmplitude,spectrumPhase,sourceCount:raw.sourceCount
  };
}
