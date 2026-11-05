import {RNG} from "./math.js";

export const META_ACTIONS=Object.freeze(["HOLD","BUD","RETIRE","FUSION_BUD","REACTIVATE","K_UP","K_DOWN","PING","PRIME_SIGNAL"]);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function softmax(a){let m=Math.max(...a),s=0,o=a.map(x=>{const v=Math.exp(Math.max(-40,Math.min(40,x-m)));s+=v;return v;});return o.map(x=>x/Math.max(1e-12,s));}

export function createMetaController(seed,config){
  const F=18,A=META_ACTIONS.length,rng=new RNG((seed>>>0)^0x6d657461),W=Array.from({length:A},()=>Float64Array.from({length:F},()=>rng.normal()*.03)),b=new Float64Array(A),v=new Float64Array(F);
  return{version:4,F,A,W,b,v};
}
export function metaParameterCount(m){return m.A*m.F+m.A+m.F;}
export function metaFeatures({uncertainty=1,frontier=1,conflict=0,echoNovelty=0,computeRemaining=1,energyRemaining=1,energyDebt=0,energyEfficiency=0,recentEnergyCost=0,n=16,k=1,progress=0,reward=0,stagnation=0,effectiveD=1,slotPressure=0,slotEfficiency=0,fragmentCount=1}={}){
  return Float64Array.of(1,clamp(uncertainty,0,1),clamp(frontier,0,1),clamp(conflict,0,1),clamp(echoNovelty,0,1),clamp(computeRemaining,0,1),clamp(energyRemaining,0,1),clamp(energyDebt,0,1),clamp(energyEfficiency,0,1),clamp(recentEnergyCost,0,1),Math.tanh(Math.log2(Math.max(2,n))/4),Math.tanh(k/4),Math.tanh(progress),Math.tanh(reward*.2),Math.tanh((effectiveD-1)/3+stagnation*.2),clamp(slotPressure,0,1),clamp(slotEfficiency,0,1),Math.tanh(Math.max(1,fragmentCount)/4));
}
export function forwardMeta(m,features){
  const logits=[];for(let a=0;a<m.A;a++){let s=m.b[a];for(let i=0;i<m.F;i++)s+=m.W[a][i]*features[i];logits.push(s);}
  const probs=softmax(logits),value=m.v.reduce((s,w,i)=>s+w*features[i],0);return{logits,probs,value};
}
export function chooseMeta(m,features,rng,deterministic=false){
  const f=forwardMeta(m,features);let action=0;
  if(deterministic){for(let i=1;i<f.probs.length;i++)if(f.probs[i]>f.probs[action])action=i;}
  else{let x=rng.next();for(let i=0;i<f.probs.length;i++){x-=f.probs[i];if(x<=0){action=i;break;}}}
  return{index:action,name:META_ACTIONS[action],probs:Float64Array.from(f.probs),value:f.value,features:Float64Array.from(features)};
}
export function zeroMetaGrad(m){return{W:Array.from({length:m.A},()=>new Float64Array(m.F)),b:new Float64Array(m.A),v:new Float64Array(m.F),records:0,loss:0};}
export function addMetaGrad(dst,src,scale=1){for(let a=0;a<dst.W.length;a++){for(let i=0;i<dst.W[a].length;i++)dst.W[a][i]+=scale*src.W[a][i];dst.b[a]+=scale*src.b[a];}for(let i=0;i<dst.v.length;i++)dst.v[i]+=scale*src.v[i];dst.records+=(src.records||0)*scale;dst.loss+=(src.loss||0)*scale;return dst;}
export function scaleMetaGrad(g,s){for(const row of g.W)for(let i=0;i<row.length;i++)row[i]*=s;for(let i=0;i<g.b.length;i++)g.b[i]*=s;for(let i=0;i<g.v.length;i++)g.v[i]*=s;g.records*=s;g.loss*=s;return g;}
export function trainMetaRecords(model,records,{gamma=.92,entropy=.015,lossWeights=null}={}){
  const g=zeroMetaGrad(model);if(!records?.length)return g;let ret=0;
  const returns=new Float64Array(records.length);for(let t=records.length-1;t>=0;t--){ret=Number(records[t].reward||0)+gamma*ret;returns[t]=ret;}
  let mean=0;for(const x of returns)mean+=x;mean/=returns.length;let vv=0;for(const x of returns){const d=x-mean;vv+=d*d;}const sd=Math.sqrt(vv/returns.length+1e-8);
  for(let t=0;t<records.length;t++){
    const r=records[t],x=r.features,f=forwardMeta(model,x),target=returns[t],adv=(target-f.value)/sd,a=r.action,lw=lossWeights?Number(lossWeights[t]??0):1;
    for(let j=0;j<model.A;j++){
      let d=((j===a?1:0)-f.probs[j])*adv;
      if(entropy)d+=entropy*(-Math.log(Math.max(1e-12,f.probs[j]))-1)*f.probs[j]*(j===a?1:-1/Math.max(1,model.A-1));
      d*=lw;for(let i=0;i<model.F;i++)g.W[j][i]+=d*x[i];g.b[j]+=d;
    }
    const dv=lw*(target-f.value);for(let i=0;i<model.F;i++)g.v[i]+=dv*x[i];
    g.loss+=lw*(.5*(target-f.value)*(target-f.value)-Math.log(Math.max(1e-12,f.probs[a]))*adv);g.records+=lw;
  }
  scaleMetaGrad(g,1/records.length);g.records=lossWeights?Array.from(lossWeights).reduce((s,x)=>s+(Number(x)||0),0):records.length;return g;
}
export function trainMetaRecordsContribution(model,records,index,options={}){
  if(!Number.isInteger(index)||index<0||index>=records.length)throw new Error("meta contribution index out of range");
  const lossWeights=new Float64Array(records.length);lossWeights[index]=1;
  return trainMetaRecords(model,records,{...options,lossWeights});
}
export function visitMetaGrad(g,fn){for(const row of g.W)fn(row);fn(g.b);fn(g.v);}
export function metaGradNorm(g){let q=0;visitMetaGrad(g,a=>{for(const x of a)q+=x*x;});return Math.sqrt(q);}
export function applyMetaGrad(model,grad,lr=.003,maxNorm=3){
  let q=0;for(const row of grad.W)for(const x of row)q+=x*x;for(const x of grad.b)q+=x*x;for(const x of grad.v)q+=x*x;const n=Math.sqrt(q),s=n>maxNorm?maxNorm/Math.max(1e-12,n):1;
  for(let a=0;a<model.A;a++){for(let i=0;i<model.F;i++)model.W[a][i]+=lr*s*grad.W[a][i];model.b[a]+=lr*s*grad.b[a];}
  for(let i=0;i<model.F;i++)model.v[i]+=lr*s*grad.v[i];return{rawNorm:n,clippedNorm:n*s,records:grad.records||0};
}
export function metaSnapshot(model,records=[]){
  const counts=Object.fromEntries(META_ACTIONS.map(a=>[a,0]));for(const r of records||[])if(META_ACTIONS[r.action])counts[META_ACTIONS[r.action]]++;
  return{version:model.version,parameterCount:metaParameterCount(model),records:records.length,actionCounts:counts};
}
