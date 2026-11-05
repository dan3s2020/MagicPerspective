import {hashValue} from "./causal-types.js";
function mix32(x){x=(x+0x9e3779b9)>>>0;x^=x>>>16;x=Math.imul(x,0x21f0aaad);x^=x>>>15;x=Math.imul(x,0x735a2d97);x^=x>>>15;return x>>>0;}
export const GENERALIZATION_FAMILIES=Object.freeze(["v1-wide","v1-funnel","v1-slit","v1-offset","v1-keyhole","v1-procedural","direct","bend","s-curve","backtrack","maze-zigzag","spiral","3d-maze","3d-branching"]);
export function createGeneralizationBattery({stage=0,countPerFamily=3,version=1}={}){
  const splits={development:[],selection:[],final:[]};let id=0;
  for(let f=0;f<GENERALIZATION_FAMILIES.length;f++)for(let splitIndex=0;splitIndex<3;splitIndex++)for(let i=0;i<countPerFamily;i++){
    const split=["development","selection","final"][splitIndex],envSeed=mix32(0x6E000000+version*104729+f*7919+splitIndex*131071+i);
    splits[split].push({caseId:"G"+version+"-"+id++,family:GENERALIZATION_FAMILIES[f],mapKind:GENERALIZATION_FAMILIES[f],stage,envSeed,actionSeed:mix32(envSeed^0x51EC7),split});
  }
  const manifest={schemaVersion:1,version,splits};return{...manifest,hash:hashValue(manifest)};
}
export function assertNoLeakage(battery){
  const seen=new Set();
  for(const split of ["development","selection","final"])for(const x of battery.splits[split]){const k=x.mapKind+":"+x.envSeed;if(seen.has(k))throw new Error("generalization provenance leakage "+k);seen.add(k);}
  return true;
}
