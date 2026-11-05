import {QANDA_VERSION,createQandaAdam,createQandaController,decodeQandaOutput,encodeQandaInput,evaluateQanda,forwardQanda,qandaParameterCount,trainQanda} from "./qanda-brsi-controller.js";
import {hashValue} from "./causal-types.js";

export const QANDA_STATE_VERSION="v9-vectric4v8-qanda-rsi-state-6";
export const DEFAULT_QANDA_CONFIG=Object.freeze({
  datasetCap:4096,minTrainRecords:32,minHeldoutRecords:6,trainEveryRecords:16,
  learningRate:.001,epochs:4,minLossGain:.0005,maxHeadRegression:.05
});
export function createQandaState(overrides={}){
  return{version:QANDA_STATE_VERSION,config:{...DEFAULT_QANDA_CONFIG,...overrides},generation:0,id:"QG-g0",records:[],seen:0,lastTrainSeen:0,promotions:0,rejections:0,lastTrain:null,history:[]};
}
export function ensureQandaState(t){
  if(!t.qanda||t.qanda.version!==QANDA_STATE_VERSION)t.qanda=createQandaState(t.qanda?.config||{});
  t.qanda.config={...DEFAULT_QANDA_CONFIG,...t.qanda.config};
  // A controller trained with an older input schema must not survive an encoder
  // semantic change: its weights may have learned from fields that are now forbidden.
  const freshController=!t.qandaController||t.qandaController.version!==QANDA_VERSION;
  if(freshController){t.qandaController=createQandaController();t.qandaAdam=createQandaAdam(t.qandaController);}
  else if(!t.qandaAdam)t.qandaAdam=createQandaAdam(t.qandaController);
  t.parameterCountQanda=qandaParameterCount(t.qandaController);
  return t.qanda;
}
export function ingestOracleAnswer(t,answer){
  const q=ensureQandaState(t);q.records.push(structuredClone(answer));q.seen++;
  if(q.records.length>q.config.datasetCap)q.records.splice(0,q.records.length-q.config.datasetCap);
  return answer.recordHash||hashValue(answer);
}
function split(records){
  const train=[],held=[];
  for(const x of records){const h=parseInt((x.recordHash||hashValue(x)).slice(0,8),16);((h%5)===0?held:train).push(x);}
  return{train,held};
}
function regressions(before,after){
  const keys=["componentMse","componentAlphaMse","scopeMse","alphaMse","causalMse","retentionMse","generalizationMse","plasticityMse","interactionMse","uncertaintyMse"],out={};
  for(const k of keys)out[k]=(after[k]||0)-(before[k]||0);return out;
}
export function maybeImproveQanda(t,force=false,recursiveVerifier=null){
  const q=ensureQandaState(t),c=q.config;
  if(!force&&q.seen-q.lastTrainSeen<c.trainEveryRecords)return{ran:false,reason:"collecting_oracle_answers"};
  if(q.records.length<c.minTrainRecords)return{ran:false,reason:"insufficient_oracle_records",count:q.records.length};
  const ds=split(q.records);if(ds.held.length<c.minHeldoutRecords||ds.train.length<8)return{ran:false,reason:"insufficient_qanda_holdout",train:ds.train.length,heldout:ds.held.length};
  const champion=structuredClone(t.qandaController),candidate=structuredClone(t.qandaController),candidateOpt=structuredClone(t.qandaAdam);
  const before=evaluateQanda(champion,ds.held),training=trainQanda(candidate,ds.train,candidateOpt,{learningRate:c.learningRate,epochs:c.epochs}),after=evaluateQanda(candidate,ds.held);
  const headRegression=regressions(before,after),worst=Math.max(...Object.values(headRegression)),lossGain=before.loss-after.loss;
  let promote=lossGain>c.minLossGain&&worst<=c.maxHeadRegression,recursive=null;
  if(promote&&recursiveVerifier){recursive=recursiveVerifier({champion,candidate,championOpt:structuredClone(t.qandaAdam),candidateOpt:structuredClone(candidateOpt),trainRecords:ds.train,heldRecords:ds.held});promote=recursive?.pass!==false;}
  if(promote){t.qandaController=candidate;t.qandaAdam=candidateOpt;q.generation++;q.id="QG-g"+q.generation+"-"+(hashValue({g:q.generation,seen:q.seen}).slice(0,8));q.promotions++;}
  else q.rejections++;
  q.lastTrainSeen=q.seen;
  q.lastTrain={ran:true,promote,before,after,training,lossGain,headRegression,recursive,generation:q.generation,id:q.id};
  q.history.push({seen:q.seen,generation:q.generation,promote,lossGain,headRegression});if(q.history.length>64)q.history.shift();
  return q.lastTrain;
}
export function qandaProposal(t,inputRecord){
  const q=ensureQandaState(t),f=forwardQanda(t.qandaController,encodeQandaInput(inputRecord)),decoded=decodeQandaOutput(f);
  const status=["reject","provisional","accept"][f.decision],validated=q.lastTrain?.ran?(q.lastTrain.promote?q.lastTrain.after:q.lastTrain.before):null;
  const validation={
    heldoutCount:Number(validated?.count)||0,
    heldoutAccuracy:Number(validated?.accuracy)||0,
    heldoutLoss:Number(validated?.loss)||0,
    validatedAtSeen:Number(q.lastTrainSeen)||0
  };
  return{controllerId:q.id,generation:q.generation,validation,status,...decoded,raw:Array.from(f.y)};
}
export function qandaSummary(t){
  const q=ensureQandaState(t),ds=split(q.records),held=ds.held.length?evaluateQanda(t.qandaController,ds.held):{count:0,loss:0,accuracy:0};
  return{id:q.id,generation:q.generation,records:q.records.length,seen:q.seen,promotions:q.promotions,rejections:q.rejections,heldout:held,lastTrain:q.lastTrain};
}
