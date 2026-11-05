import {mapKindForMode} from "./config.js";
import {hashValue} from "./causal-types.js";

function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
export function createRetentionBattery({stage=0,countPerFamily=2,version=1,families=null}={}){
  const fs=families||["v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural","direct","bend","s-curve","backtrack","maze-zigzag","spiral","3d-maze","3d-branching"];
  const cases=[];let id=0;
  for(let f=0;f<fs.length;f++)for(let i=0;i<countPerFamily;i++){
    const envSeed=mix32(0x8E710000+version*65537+f*4099+i),actionSeed=mix32(envSeed^0xA551);
    cases.push({caseId:"R"+version+"-"+id++,capability:fs[f],mapKind:fs[f],stage,envSeed,actionSeed,hard:true,epsilon:.02});
  }
  const manifest={schemaVersion:1,version,cases};return{...manifest,hash:hashValue(manifest)};
}
export function retentionRegression(candidate,baseline){
  const b=new Map(baseline.map(x=>[x.caseId,x]));return candidate.map(x=>{const q=b.get(x.caseId);return{caseId:x.caseId,capability:x.capability||q?.capability,
    success:(x.metrics?.success||0)-(q?.metrics?.success||0),totalReward:(x.metrics?.totalReward||0)-(q?.metrics?.totalReward||0)}});  
}
export function retentionFeasible(regressions,battery){
  const c=new Map(battery.cases.map(x=>[x.caseId,x]));
  const failed=regressions.filter(r=>{const q=c.get(r.caseId);return q?.hard&&r.success<-(q.epsilon??.02);});
  return{feasible:failed.length===0,failed};
}
