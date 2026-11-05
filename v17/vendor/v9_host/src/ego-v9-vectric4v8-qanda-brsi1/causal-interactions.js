import {defaultUtility} from "./causal-metrics.js";

export function interactionEffect({J11,J10,J01,J00}){return J11-J10-J01+J00;}
export function interactionFromMetrics(rows,utility=defaultUtility){
  for(const k of ["11","10","01","00"])if(!rows?.[k])throw new Error("interaction requires 11/10/01/00");
  return interactionEffect({J11:utility(rows["11"]),J10:utility(rows["10"]),J01:utility(rows["01"]),J00:utility(rows["00"])});
}
export function interactionLabel(v,resolution=.01){
  if(v>resolution)return"synergy";if(v<-resolution)return"interference";return"neutral_within_resolution";
}
export function shouldTestPair(a,b,{largeEffect=.05}={}){
  if(!a||!b)return false;
  if(Math.abs(a.firstOrder||0)>=largeEffect||Math.abs(b.firstOrder||0)>=largeEffect)return true;
  if(a.classification==="enabling"||b.classification==="enabling"||a.classification==="interfering"||b.classification==="interfering")return true;
  if(a.signChanged||b.signChanged)return true;
  if(a.tbpttSegment&&b.tbpttSegment&&a.tbpttSegment===b.tbpttSegment)return true;
  const usefulA=new Set(a.usefulComponents||[]),harmfulA=new Set(a.harmfulComponents||[]);
  if((b.harmfulComponents||[]).some(x=>usefulA.has(x))||(b.usefulComponents||[]).some(x=>harmfulA.has(x)))return true;
  if(a.contextScope&&b.contextScope){
    const aa=a.contextScope instanceof Set?a.contextScope:new Set(a.contextScope),bb=b.contextScope instanceof Set?b.contextScope:new Set(b.contextScope);
    for(const x of aa)if(bb.has(x))return true;
  }
  const sa=new Set(a.components||[]);return (b.components||[]).some(x=>sa.has(x));
}
