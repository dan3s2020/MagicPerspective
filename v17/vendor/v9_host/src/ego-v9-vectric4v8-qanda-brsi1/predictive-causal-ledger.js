import {hashValue,canonicalize} from "./causal-types.js";
import {NATIVE_PREDICTION_FAMILIES,nativeHorizonIdLooksValid} from "./predictive-causal-horizons.js";

export const PREDICTIVE_LEDGER_VERSION="v9-predictive-causal-ledger-1";
export const BRANCH_STATUS=Object.freeze(["PENDING","RUNNING","RESOLVED","TERMINAL","PRUNED_COMPUTE","INVALID"]);

function deepFreeze(x){
  if(!x||typeof x!=="object"||Object.isFrozen(x))return x;
  Object.freeze(x);for(const v of Object.values(x))deepFreeze(v);return x;
}
function finite(x){return Number.isFinite(Number(x))?Number(x):null;}
function canonicalPrediction(p={}){
  const out={};for(const family of NATIVE_PREDICTION_FAMILIES)out[family]=Object.prototype.hasOwnProperty.call(p,family)?structuredClone(p[family]):"NOT_PREDICTED";
  return out;
}
export function createBranchNode({rootSnapshotId,parentBranchId=null,generationDepth=0,interventionId="WAIT",scope="unknown",cell=null,environmentSeed=null,actionSeed=null,configHash="",brainBeforeHash="",brainAfterHash="",optimizerBeforeHash=null,optimizerAfterHash=null,generationId="",status="PENDING",metadata=null}={}){
  if(!rootSnapshotId)throw new Error("rootSnapshotId required");if(!BRANCH_STATUS.includes(status))throw new Error("invalid branch status "+status);
  const base={schemaVersion:1,ledgerVersion:PREDICTIVE_LEDGER_VERSION,rootSnapshotId:String(rootSnapshotId),parentBranchId:parentBranchId==null?null:String(parentBranchId),
    generationDepth:Math.max(0,Math.floor(Number(generationDepth)||0)),interventionId:String(interventionId),scope:String(scope),cell:cell==null?null:Number(cell),
    environmentSeed,actionSeed,configHash:String(configHash||""),brainBeforeHash:String(brainBeforeHash||""),brainAfterHash:String(brainAfterHash||""),
    optimizerBeforeHash:optimizerBeforeHash==null?null:String(optimizerBeforeHash),optimizerAfterHash:optimizerAfterHash==null?null:String(optimizerAfterHash),
    generationId:String(generationId||""),status,metadata:metadata==null?null:structuredClone(metadata)};
  const branchId="br-"+hashValue(base).slice(0,24);return deepFreeze({...base,branchId});
}
export function commitPrediction({branch,horizonId,logicalCommitOrdinal,prediction={},modelId="",modelGeneration=0,evidenceHash="",metadata=null}={}){
  if(!branch?.branchId)throw new Error("branch required");if(!nativeHorizonIdLooksValid(horizonId))throw new Error("invalid native horizon "+horizonId);
  const ordinal=Number(logicalCommitOrdinal);if(!Number.isFinite(ordinal)||ordinal<0)throw new Error("logicalCommitOrdinal required");
  const body={schemaVersion:1,ledgerVersion:PREDICTIVE_LEDGER_VERSION,rootSnapshotId:branch.rootSnapshotId,branchId:branch.branchId,horizonId:String(horizonId),
    logicalCommitOrdinal:ordinal,modelId:String(modelId||""),modelGeneration:Math.max(0,Math.floor(Number(modelGeneration)||0)),evidenceHash:String(evidenceHash||""),
    prediction:canonicalPrediction(prediction),metadata:metadata==null?null:structuredClone(metadata)};
  const predictionId="pred-"+hashValue(body).slice(0,24);return deepFreeze({...body,predictionId,recordHash:hashValue({...body,predictionId})});
}
function numericErrors(pred,actual,path="",out=[]){
  const p=finite(pred),a=finite(actual);
  if(p!=null&&a!=null){const signed=p-a;out.push({path,signed,absolute:Math.abs(signed),squared:signed*signed});return out;}
  if(pred&&actual&&typeof pred==="object"&&typeof actual==="object"&&!ArrayBuffer.isView(pred)&&!ArrayBuffer.isView(actual)){
    const keys=[...new Set([...Object.keys(pred),...Object.keys(actual)])].sort();
    for(const k of keys)numericErrors(pred[k],actual[k],path?path+"."+k:k,out);
  }
  return out;
}
function categoricalErrors(pred,actual,path="",out=[]){
  if((typeof pred==="string"||typeof pred==="boolean")&&(typeof actual==="string"||typeof actual==="boolean")){out.push({path,predicted:pred,actual,correct:pred===actual});return out;}
  if(pred&&actual&&typeof pred==="object"&&typeof actual==="object"&&!ArrayBuffer.isView(pred)&&!ArrayBuffer.isView(actual)){
    const keys=[...new Set([...Object.keys(pred),...Object.keys(actual)])].sort();for(const k of keys)categoricalErrors(pred[k],actual[k],path?path+"."+k:k,out);
  }return out;
}
export function resolvePrediction(predictionRecord,{logicalResolutionOrdinal,actual={},metricVersion="v1",metadata=null}={}){
  if(!predictionRecord?.predictionId)throw new Error("prediction record required");
  const ordinal=Number(logicalResolutionOrdinal);if(!Number.isFinite(ordinal)||ordinal<predictionRecord.logicalCommitOrdinal)throw new Error("resolution must not precede prediction commitment");
  const actualCanonical=canonicalPrediction(actual),numeric=numericErrors(predictionRecord.prediction,actualCanonical),categorical=categoricalErrors(predictionRecord.prediction,actualCanonical);
  const body={schemaVersion:1,ledgerVersion:PREDICTIVE_LEDGER_VERSION,predictionId:predictionRecord.predictionId,rootSnapshotId:predictionRecord.rootSnapshotId,branchId:predictionRecord.branchId,
    horizonId:predictionRecord.horizonId,logicalCommitOrdinal:predictionRecord.logicalCommitOrdinal,logicalResolutionOrdinal:ordinal,metricVersion:String(metricVersion),
    actual:actualCanonical,error:{numeric,categorical},metadata:metadata==null?null:structuredClone(metadata)};
  const resolutionId="res-"+hashValue(body).slice(0,24);return deepFreeze({...body,resolutionId,recordHash:hashValue({...body,resolutionId})});
}
export function predictionBytes(record){return JSON.stringify(canonicalize(record));}
export function scalarEffect({child,parent,root,valuePath}={}){
  const get=(x)=>String(valuePath||"").split(".").filter(Boolean).reduce((v,k)=>v?.[k],x),c=finite(get(child)),p=finite(get(parent)),r=finite(get(root));
  if(c==null||p==null||r==null)return{localEffect:null,rootEffect:null,status:"UNIDENTIFIED"};
  return{localEffect:c-p,rootEffect:c-r,status:"IDENTIFIED"};
}
export function expansionFrontier({rows=[],controlBranchId,metricKey="loss",mode="min"}={}){
  const valid=rows.filter(x=>x&&x.branchId&&finite(x[metricKey])!=null);if(!valid.length)return controlBranchId?[controlBranchId]:[];
  const values=valid.map(x=>Number(x[metricKey])),best=mode==="max"?Math.max(...values):Math.min(...values),worst=mode==="max"?Math.min(...values):Math.max(...values);
  const out=new Set(controlBranchId?[controlBranchId]:[]);
  for(const x of valid)if(Number(x[metricKey])===best||Number(x[metricKey])===worst)out.add(x.branchId);
  return [...out];
}
export function exactPredictiveFingerprint(payload){return"fp-"+hashValue(payload).slice(0,32);}
