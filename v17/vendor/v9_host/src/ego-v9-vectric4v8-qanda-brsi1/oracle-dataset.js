import {CAUSAL_SCHEMA_VERSION,hashValue} from "./causal-types.js";

export const RECOMMENDATION_STATUS=Object.freeze(["reject","provisional","accept_unchanged","accept_scaled","accept_cleaned","accept_context_scoped","delay","unresolved"]);
export function validateOracleAnswer(x){
  const required=["experimentId","experienceId","sourceLineage","preCheckpointHash","normalContributionHash",
    "experienceFeatures","stateSignature","updateSignature","optimizerSignature","recentCausalHistory","contextId","changeSignature",
    "wholeUpdate","magnitude","components","scope","retention","generalization","plasticity","interactions","recommendation","confidence","provenance"];
  const missing=required.filter(k=>x?.[k]==null);
  if(missing.length)throw new Error("incomplete OracleAnswer: "+missing.join(","));
  if(!RECOMMENDATION_STATUS.includes(x.recommendation.status))throw new Error("invalid recommendation status");
  if(!Array.isArray(x.wholeUpdate.coupledCausalCurve)||!Array.isArray(x.wholeUpdate.naturalCausalCurve))throw new Error("causal curves required");
  if(!Array.isArray(x.changeSignature.blocks)||typeof x.changeSignature.behavior!=="object")throw new Error("change signature evidence required");
  if(!Array.isArray(x.magnitude.testedAlphas)||!Array.isArray(x.magnitude.selectedInterval))throw new Error("magnitude evidence required");
  if(!Array.isArray(x.components.recursionTree)||!Array.isArray(x.components.unresolved))throw new Error("component evidence required");
  if(!Array.isArray(x.scope.contextEffectMatrix)||!Array.isArray(x.scope.recommendedScope))throw new Error("scope evidence required");
  if(!Array.isArray(x.retention.perCapability)||!Array.isArray(x.generalization.perFamily))throw new Error("retention/generalization evidence required");
  if(!Array.isArray(x.interactions.edges)||!Array.isArray(x.interactions.unresolvedGroups))throw new Error("interaction evidence required");
  if(!Array.isArray(x.confidence.bootstrapIntervals))throw new Error("confidence bootstrap evidence required");
  for(const [name,curve] of [["coupled",x.wholeUpdate.coupledCausalCurve],["natural",x.wholeUpdate.naturalCausalCurve]]){
    for(const p of curve)if(!Number.isFinite(Number(p.horizon))||!Number.isFinite(Number(p.delta)))throw new Error(name+" causal curve point missing horizon/delta");
  }
  return true;
}
export function createOracleAnswer(fields){
  const x={schemaVersion:CAUSAL_SCHEMA_VERSION,oracleVersion:"v9-vectric4v8-qanda-brsi1-oracle-3",...fields};
  validateOracleAnswer(x);x.recordHash=hashValue(x);return x;
}
export class OracleDataset{
  constructor(cap=4096){this.cap=Math.max(64,cap);this.records=[];}
  append(record){validateOracleAnswer(record);this.records.push(structuredClone(record));if(this.records.length>this.cap)this.records.splice(0,this.records.length-this.cap);return record.recordHash||hashValue(record);}
  split(){const train=[],held=[];for(const x of this.records){((parseInt((x.recordHash||hashValue(x)).slice(0,8),16)%5)===0?held:train).push(x);}return{train,held};}
}
