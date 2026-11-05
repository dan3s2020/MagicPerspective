import {AGENCY_N,BODY_OBS_N,WORLD_OBS_N} from "./config.js";

function denseShape(p,{inN=null,outN=null}={}){
  if(!p||!Number.isInteger(p.inN)||!Number.isInteger(p.outN))return false;
  if(inN!=null&&p.inN!==inN)return false;if(outN!=null&&p.outN!==outN)return false;
  return p.W?.length===p.inN*p.outN&&p.b?.length===p.outN;
}
export function localBrainShapeCompatible(m){
  if(!m)return false;
  return denseShape(m.body,{inN:BODY_OBS_N})
    &&denseShape(m.world,{inN:WORLD_OBS_N})
    &&denseShape(m.ownPred,{outN:BODY_OBS_N})
    &&denseShape(m.worldPred,{outN:WORLD_OBS_N})
    &&denseShape(m.agency,{outN:AGENCY_N});
}
export function trainerArchitectureCompatible(t){
  if(!t||t.schemaVersion!==100||t.version!=="v9-vectric4v8-qanda-brsi1")return false;
  if(!localBrainShapeCompatible(t.groupA))return false;
  if(!Array.isArray(t.groupB)||!t.groupB.length||!t.groupB.every(localBrainShapeCompatible))return false;
  return true;
}
export function architectureShapeSummary(t){
  const one=m=>m?{bodyIn:m.body?.inN??null,worldIn:m.world?.inN??null,ownOut:m.ownPred?.outN??null,worldOut:m.worldPred?.outN??null,agencyOut:m.agency?.outN??null}:null;
  return{expected:{bodyIn:BODY_OBS_N,worldIn:WORLD_OBS_N,agencyOut:AGENCY_N},groupA:one(t?.groupA),groupB:(t?.groupB||[]).map(one)};
}
