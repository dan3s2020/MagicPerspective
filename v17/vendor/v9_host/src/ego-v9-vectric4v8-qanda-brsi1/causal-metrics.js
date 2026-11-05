import {finite,mean,median} from "./causal-types.js";

export const ORACLE_METRICS=Object.freeze([
  "success","totalReward","actions","actionEfficiency","entropy","rejectRate","meanDistance","worstDistance",
  "meanN","meanK","finalK","computeSpent","computeBudget","actionBudget","budgetScale","budgetDistance","budgetDetour",
  "energyCapacity","energySpent","energyRemaining","energyDebt","energyEfficiency","energyPerProgress",
  "perspectiveD","effectiveD","organCount","births","retirements","fusions",
  "actor","value","own","world","agency","continuity"
]);
export function metricVector(m={}){
  const out={};for(const k of ORACLE_METRICS)out[k]=finite(m[k]);return out;
}
export function defaultUtility(m={}){
  const spent=finite(m.computeSpent),budget=Math.max(1,finite(m.computeBudget)||1),computeRatio=spent/budget;
  const energySpent=finite(m.energySpent),energyCapacity=Math.max(1,finite(m.energyCapacity)||1),energyRatio=energySpent/energyCapacity;
  const actionEfficiency=finite(m.actionEfficiency),debtRatio=finite(m.energyDebt)/energyCapacity;
  return 10*finite(m.success)+.002*finite(m.totalReward)+.25*actionEfficiency
    -.7*finite(m.rejectRate)-.08*finite(m.worstDistance)-.02*finite(m.meanDistance)
    -.30*computeRatio-.22*energyRatio-.25*debtRatio
    -.008*finite(m.meanN)-.012*finite(m.meanK||m.finalK);
}
function seed32(s){let h=2166136261>>>0;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let x=seed32(seed)||1;return()=>{x+=0x6D2B79F5;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function bootstrapMean(ds,seed,resamples=2000){
  if(!ds.length)return[0,0];const r=rng(seed),means=[];
  for(let b=0;b<resamples;b++){let s=0;for(let i=0;i<ds.length;i++)s+=ds[Math.floor(r()*ds.length)];means.push(s/ds.length);}
  means.sort((a,b)=>a-b);return[means[Math.floor(.025*(means.length-1))],means[Math.floor(.975*(means.length-1))]];
}
export function pairedSummary(onCases,offCases,{experimentId="",horizon=0,resamples=2000}={}){
  const off=new Map(offCases.map(x=>[x.caseId,x.metrics||x]));
  const out={};
  for(const metric of ORACLE_METRICS){
    const d=[];
    for(const row of onCases){const b=off.get(row.caseId);if(!b)continue;d.push(finite((row.metrics||row)[metric])-finite(b[metric]));}
    const mu=mean(d),med=median(d),sd=d.length?Math.sqrt(mean(d.map(x=>(x-mu)*(x-mu)))):0,ci=bootstrapMean(d,experimentId+"|"+metric+"|"+horizon,resamples);
    out[metric]={n:d.length,deltas:d,mean:mu,median:med,sd,min:d.length?Math.min(...d):0,max:d.length?Math.max(...d):0,
      positive:d.filter(x=>x>0).length,negative:d.filter(x=>x<0).length,zero:d.filter(x=>x===0).length,ci95:ci};
  }
  return out;
}
export function causalPoint(onMetrics,offMetrics,utility=defaultUtility){return utility(onMetrics)-utility(offMetrics);}
export function areaUnderLearningCurve(onCurve,offCurve,utility=defaultUtility){
  const off=new Map(offCurve.map(x=>[x.horizon,x.metrics]));let value=0,count=0;
  for(const x of onCurve){if(!off.has(x.horizon))continue;value+=utility(x.metrics)-utility(off.get(x.horizon));count++;}
  return{value,count};
}
export function thresholdSpeedup(onCurve,offCurve,threshold,utility=defaultUtility){
  const hit=c=>{for(const x of c.slice().sort((a,b)=>a.horizon-b.horizon))if(utility(x.metrics)>=threshold)return x.horizon;return null;};
  const a=hit(onCurve),b=hit(offCurve);return{on:a,off:b,speedup:a!=null&&b!=null?b-a:null,censored:a==null||b==null};
}
