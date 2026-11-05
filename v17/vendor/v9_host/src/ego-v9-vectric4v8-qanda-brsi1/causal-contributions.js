import {
  addLocalGrad,localGradNorm,trainLocalSequence,trainLocalSequenceContribution,
  visitLocalGrad,zeroLocalGrad
} from "./brain.js";
import {
  addHigherGrad,higherGradNorm,trainHigherSequence,trainHigherSequenceContribution,
  scaleHigherGrad,zeroHigherGrad
} from "./higher-self.js";
import {hashValue,LOCAL_COMPONENTS,HIGHER_COMPONENTS,META_COMPONENTS,WORLD_MODEL_COMPONENTS,pathGet,pathSet} from "./causal-types.js";
import {addMetaGrad,metaGradNorm,scaleMetaGrad,trainMetaRecords,trainMetaRecordsContribution,visitMetaGrad,zeroMetaGrad} from "./meta-controller.js";
import {addWorldGrad,scaleWorldGrad,trainWorldModelRecordContribution,trainWorldModelRecords,visitWorldGrad,worldGradNorm,zeroWorldGrad} from "./world-model-learner.js";

function localArrays(g){const a=[];visitLocalGrad(g,x=>a.push(x));return a;}
function higherArrays(g){const a=[];for(const k of ["Wz","Wr","Wh","context","predict"])a.push(g[k].W,g[k].b);return a;}
function metaArrays(g){const a=[];visitMetaGrad(g,x=>a.push(x));return a;}
function worldArrays(g){const a=[];visitWorldGrad(g,x=>a.push(x));return a;}
function residualRatio(aggregate,sum,arraysFn){
  const a=arraysFn(aggregate),b=arraysFn(sum);let r2=0,g2=0,maxAbs=0;
  for(let k=0;k<a.length;k++)for(let i=0;i<a[k].length;i++){const d=a[k][i]-b[k][i];r2+=d*d;g2+=a[k][i]*a[k][i];maxAbs=Math.max(maxAbs,Math.abs(d));}
  return{relativeL2:Math.sqrt(r2)/Math.max(1e-15,Math.sqrt(g2)),maxAbs};
}
export function scaleLocalGradient(g,s){const out=structuredClone(g);visitLocalGrad(out,a=>{for(let i=0;i<a.length;i++)a[i]*=s;});return out;}
export function scaleHigherGradient(g,s){const out=structuredClone(g);scaleHigherGrad(out,s);return out;}
export function scaleMetaGradient(g,s){const out=structuredClone(g);scaleMetaGrad(out,s);return out;}
export function scaleWorldGradient(g,s){const out=structuredClone(g);scaleWorldGrad(out,s);return out;}
export function combineLocalGradient(aggregate,contribution,alpha){
  const out=structuredClone(aggregate);addLocalGrad(out,contribution,Number(alpha)-1);return out;
}
export function combineHigherGradient(aggregate,contribution,alpha){
  const out=structuredClone(aggregate);addHigherGrad(out,contribution,Number(alpha)-1);return out;
}
export function combineMetaGradient(aggregate,contribution,alpha){
  const out=structuredClone(aggregate);addMetaGrad(out,contribution,Number(alpha)-1);return out;
}
export function combineWorldGradient(aggregate,contribution,alpha){
  const out=structuredClone(aggregate);addWorldGrad(out,contribution,Number(alpha)-1);return out;
}
export function localContribution(model,records,cfg,index,finalScale=1){
  return scaleLocalGradient(trainLocalSequenceContribution(model,records,cfg,index).grad,finalScale);
}
export function higherContribution(model,records,index,finalScale=1){
  return scaleHigherGradient(trainHigherSequenceContribution(model,records,index).grad,finalScale);
}
export function metaContribution(model,records,index,{finalScale=1,gamma=.92,entropy=.015}={}){
  return scaleMetaGradient(trainMetaRecordsContribution(model,records,index,{gamma,entropy}),finalScale);
}
export function worldContribution(model,records,index,finalScale=1){
  return scaleWorldGradient(trainWorldModelRecordContribution(model,records,index),finalScale);
}
export function reconstructLocalContributions(model,records,cfg,{finalScale=1}={}){
  const aggregate=scaleLocalGradient(trainLocalSequence(model,records,cfg).grad,finalScale);
  const sum=zeroLocalGrad(model),contributions=[];
  for(let i=0;i<records.length;i++){const g=localContribution(model,records,cfg,i,finalScale);contributions.push(g);addLocalGrad(sum,g);}
  return{aggregate,contributions,residual:residualRatio(aggregate,sum,localArrays),aggregateNorm:localGradNorm(aggregate),hash:hashValue(aggregate)};
}
export function reconstructHigherContributions(model,records,{finalScale=1}={}){
  const aggregate=scaleHigherGradient(trainHigherSequence(model,records).grad,finalScale);
  const sum=zeroHigherGrad(model),contributions=[];
  for(let i=0;i<records.length;i++){const g=higherContribution(model,records,i,finalScale);contributions.push(g);addHigherGrad(sum,g);}
  return{aggregate,contributions,residual:residualRatio(aggregate,sum,higherArrays),aggregateNorm:higherGradNorm(aggregate),hash:hashValue(aggregate)};
}
export function reconstructMetaContributions(model,records,{finalScale=1,gamma=.92,entropy=.015}={}){
  const aggregate=scaleMetaGradient(trainMetaRecords(model,records,{gamma,entropy}),finalScale);
  const sum=zeroMetaGrad(model),contributions=[];
  for(let i=0;i<records.length;i++){const g=metaContribution(model,records,i,{finalScale,gamma,entropy});contributions.push(g);addMetaGrad(sum,g);}
  return{aggregate,contributions,residual:residualRatio(aggregate,sum,metaArrays),aggregateNorm:metaGradNorm(aggregate),hash:hashValue(aggregate)};
}
export function reconstructWorldContributions(model,records,{finalScale=1}={}){
  const aggregate=scaleWorldGradient(trainWorldModelRecords(model,records),finalScale);
  const sum=zeroWorldGrad(model),contributions=[];
  // trainWorldModelRecordContribution already contains 1/N for this sequence.
  for(let i=0;i<records.length;i++){const g=worldContribution(model,records,i,finalScale);contributions.push(g);addWorldGrad(sum,g);}
  return{aggregate,contributions,residual:residualRatio(aggregate,sum,worldArrays),aggregateNorm:worldGradNorm(aggregate),hash:hashValue(aggregate)};
}
function zeroLikeArray(a){return new Float64Array(a.length);}
export function componentOnlyGradient(g,path,kind="local"){
  const out=kind==="higher"?zeroHigherGradFrom(g):(kind==="meta"?zeroMetaGradFrom(g):(kind==="world"?zeroWorldGradFrom(g):zeroLocalGradFrom(g)));
  const src=pathGet(g,path),dst=pathGet(out,path);
  if(!(src instanceof Float64Array)||!(dst instanceof Float64Array))throw new Error("invalid component "+path);
  dst.set(src);return out;
}
export function componentRemovedGradient(g,path){
  const out=structuredClone(g),a=pathGet(out,path);
  if(!(a instanceof Float64Array))throw new Error("invalid component "+path);
  a.fill(0);return out;
}
function zeroLocalGradFrom(g){
  const out=structuredClone(g);visitLocalGrad(out,a=>a.fill(0));return out;
}
function zeroHigherGradFrom(g){
  const out=structuredClone(g);for(const a of higherArrays(out))a.fill(0);return out;
}
function zeroMetaGradFrom(g){
  const out=structuredClone(g);for(const a of metaArrays(out))a.fill(0);return out;
}
function zeroWorldGradFrom(g){
  const out=structuredClone(g);for(const a of worldArrays(out))a.fill(0);return out;
}
export function splitGradientComponents(g,kind="local"){
  const names=kind==="higher"?HIGHER_COMPONENTS:(kind==="meta"?META_COMPONENTS:(kind==="world"?WORLD_MODEL_COMPONENTS:LOCAL_COMPONENTS));
  return names.map(name=>({name,grad:componentOnlyGradient(g,name,kind),hash:hashValue(pathGet(g,name))}));
}
export function gradientComponentNorm(g,path){
  const a=pathGet(g,path);if(!(a instanceof Float64Array))return 0;let q=0;for(const v of a)q+=v*v;return Math.sqrt(q);
}
