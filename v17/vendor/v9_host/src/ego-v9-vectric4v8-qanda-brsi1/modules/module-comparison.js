import {modulesForCapability} from "./module-host.js";
import {hashValue} from "../causal-types.js";

export async function compareCapabilityModules({
  host,capability,frozenRoot,cases=[],execute,score=null,includeOff=false
}={}){
  if(!host)throw new Error("module host required");
  if(typeof execute!=="function")throw new Error("module comparison execute function required");
  const rootHash=hashValue(frozenRoot),caseHash=hashValue(cases);
  const candidates=modulesForCapability(host,capability).filter(s=>includeOff||s.mode!=="off");
  if(!candidates.length)throw new Error("no modules attached for capability "+capability);
  const results=[];
  for(const slot of candidates){
    const root=structuredClone(frozenRoot),matchedCases=structuredClone(cases);
    if(hashValue(root)!==rootHash||hashValue(matchedCases)!==caseHash)throw new Error("matched comparison clone mismatch");
    const output=await execute({slot,module:slot.definition,adapter:slot.adapter,root,cases:matchedCases,mode:slot.mode});
    const finalRootHash=hashValue(root),value=typeof score==="function"?Number(score(output,slot)):null;
    results.push({id:slot.id,version:slot.version,mode:slot.mode,rootHash,caseHash,finalRootHash,score:Number.isFinite(value)?value:null,output});
  }
  const pairwise=[];
  for(let i=0;i<results.length;i++)for(let j=i+1;j<results.length;j++){
    const a=results[i],b=results[j],delta=a.score!=null&&b.score!=null?a.score-b.score:null;
    pairwise.push({a:a.id,b:b.id,scoreA:a.score,scoreB:b.score,delta});
  }
  return{version:1,capability:String(capability),rootHash,caseHash,candidateCount:results.length,results,pairwise};
}

export function assertMatchedModuleComparison(report){
  if(!report?.results?.length)throw new Error("empty module comparison");
  for(const row of report.results){
    if(row.rootHash!==report.rootHash)throw new Error("module comparison root mismatch for "+row.id);
    if(row.caseHash!==report.caseHash)throw new Error("module comparison case mismatch for "+row.id);
  }
  return true;
}
