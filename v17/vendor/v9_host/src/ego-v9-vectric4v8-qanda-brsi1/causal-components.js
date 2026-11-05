import {HIGHER_COMPONENTS,LOCAL_COMPONENTS,META_COMPONENTS,WORLD_MODEL_COMPONENTS,pathGet} from "./causal-types.js";
import {componentOnlyGradient,componentRemovedGradient,gradientComponentNorm} from "./causal-contributions.js";

export function componentNames(kind="local"){return kind==="higher"?HIGHER_COMPONENTS:(kind==="meta"?META_COMPONENTS:(kind==="world"?WORLD_MODEL_COMPONENTS:LOCAL_COMPONENTS));}
export function tensorSlices(grad,path,{minSize=32}={}){
  const a=pathGet(grad,path);if(!(a instanceof Float64Array))throw new Error("component is not tensor "+path);
  if(a.length<=minSize)return[{path,start:0,end:a.length,id:path+"[0:"+a.length+"]"}];
  const mid=Math.floor(a.length/2);
  return[{path,start:0,end:mid,id:path+"[0:"+mid+"]"},{path,start:mid,end:a.length,id:path+"["+mid+":"+a.length+"]"}];
}
function zeroAll(g,kind){
  const out=structuredClone(g),names=componentNames(kind);
  for(const p of names){const a=pathGet(out,p);if(a instanceof Float64Array)a.fill(0);}return out;
}
export function sliceOnlyGradient(g,path,start,end,kind="local"){
  const out=zeroAll(g,kind),src=pathGet(g,path),dst=pathGet(out,path);
  if(!(src instanceof Float64Array)||!(dst instanceof Float64Array))throw new Error("invalid slice path");
  dst.set(src.slice(start,end),start);return out;
}
export function sliceRemovedGradient(g,path,start,end){
  const out=structuredClone(g),a=pathGet(out,path);if(!(a instanceof Float64Array))throw new Error("invalid slice path");
  a.fill(0,start,end);return out;
}
export function scaleGradientComponent(g,path,beta){
  const out=structuredClone(g),a=pathGet(out,path);if(!(a instanceof Float64Array))throw new Error("invalid component "+path);
  const b=Number(beta);for(let i=0;i<a.length;i++)a[i]*=b;return out;
}
export function maskGradientComponents(g,componentScores,kind="local",{harmfulThreshold=-.25}={}){
  const out=structuredClone(g),prefix=kind==="higher"?"higher:":(kind==="meta"?"meta:":(kind==="world"?"world:":"local:"));
  for(const path of componentNames(kind)){
    const score=Number(componentScores?.[prefix+path]);
    if(Number.isFinite(score)&&score<=harmfulThreshold){
      const a=pathGet(out,path);if(a instanceof Float64Array)a.fill(0);
    }
  }
  return out;
}

export function applyQandaProposalGradient(g,proposal={},kind="local",{harmfulThreshold=-.25}={}){
  const out=structuredClone(g),prefix=kind==="higher"?"higher:":(kind==="meta"?"meta:":(kind==="world"?"world:":"local:"));
  const alpha=Number.isFinite(Number(proposal?.alpha))?Number(proposal.alpha):0;
  for(const path of componentNames(kind)){
    const a=pathGet(out,path);if(!(a instanceof Float64Array))continue;
    const score=Number(proposal?.componentScores?.[prefix+path]);
    const betaRaw=Number(proposal?.componentBetas?.[prefix+path]);
    const beta=Number.isFinite(betaRaw)?Math.max(0,Math.min(2,betaRaw)):1;
    const factor=(Number.isFinite(score)&&score<=harmfulThreshold)?0:(alpha*beta);
    for(let i=0;i<a.length;i++)a[i]*=factor;
  }
  return out;
}
export function classifyMarginal({marginal=0,only=0,resolution=.01}){
  if(marginal>resolution&&only>resolution)return"useful";
  if(marginal>resolution&&Math.abs(only)<=resolution)return"interaction-dependent";
  if(marginal<-resolution)return"harmful";
  if(Math.abs(marginal)<=resolution&&Math.abs(only)<=resolution)return"neutral-within-resolution";
  return"unresolved";
}
export async function analyzeTopLevelComponents({contribution,kind="local",evaluateGradient,resolution=.01}){
  const full=await evaluateGradient(contribution),rows=[];
  for(const name of componentNames(kind)){
    const removed=await evaluateGradient(componentRemovedGradient(contribution,name));
    const only=await evaluateGradient(componentOnlyGradient(contribution,name,kind));
    const marginal=full.utility-removed.utility,onlyEffect=only.utility-(await evaluateGradient(zeroAll(contribution,kind))).utility;
    rows.push({id:name,name,norm:gradientComponentNorm(contribution,name),marginal,only:onlyEffect,classification:classifyMarginal({marginal,only:onlyEffect,resolution}),full,removed,onlyResult:only});
  }
  return rows;
}
export async function recursivelyResolveComponent({contribution,path,kind="local",evaluateGradient,resolution=.01,minSize=32,maxDepth=8,depth=0}){
  const src=pathGet(contribution,path);if(!(src instanceof Float64Array))throw new Error("bad component path");
  const full=await evaluateGradient(contribution),removed=await evaluateGradient(componentRemovedGradient(contribution,path)),only=await evaluateGradient(componentOnlyGradient(contribution,path,kind));
  const zero=await evaluateGradient(zeroAll(contribution,kind)),marginal=full.utility-removed.utility,onlyEffect=only.utility-zero.utility;
  const classification=classifyMarginal({marginal,only:onlyEffect,resolution});
  const node={id:path,path,start:0,end:src.length,depth,marginal,only:onlyEffect,classification,children:[]};
  if((classification==="harmful"||classification==="interaction-dependent"||classification==="unresolved")&&src.length>minSize&&depth<maxDepth){
    for(const sl of tensorSlices(contribution,path,{minSize})){
      const childGrad=sliceOnlyGradient(contribution,path,sl.start,sl.end,kind);
      const child=await recursivelyResolveSlice({baseContribution:contribution,sliceGrad:childGrad,path,start:sl.start,end:sl.end,kind,evaluateGradient,resolution,minSize,maxDepth,depth:depth+1});
      node.children.push(child);
    }
  }
  return node;
}
async function recursivelyResolveSlice({baseContribution,sliceGrad,path,start,end,kind,evaluateGradient,resolution,minSize,maxDepth,depth}){
  const zero=zeroAll(baseContribution,kind),only=await evaluateGradient(sliceGrad),z=await evaluateGradient(zero);
  const without=sliceRemovedGradient(baseContribution,path,start,end),full=await evaluateGradient(baseContribution),removed=await evaluateGradient(without);
  const marginal=full.utility-removed.utility,onlyEffect=only.utility-z.utility,classification=classifyMarginal({marginal,only:onlyEffect,resolution});
  const node={id:path+"["+start+":"+end+"]",path,start,end,depth,marginal,only:onlyEffect,classification,children:[]};
  if((classification==="harmful"||classification==="interaction-dependent"||classification==="unresolved")&&(end-start)>minSize&&depth<maxDepth){
    const mid=Math.floor((start+end)/2);
    for(const [a,b] of [[start,mid],[mid,end]])node.children.push(await recursivelyResolveSlice({baseContribution,sliceGrad:sliceOnlyGradient(baseContribution,path,a,b,kind),path,start:a,end:b,kind,evaluateGradient,resolution,minSize,maxDepth,depth:depth+1}));
  }
  return node;
}
