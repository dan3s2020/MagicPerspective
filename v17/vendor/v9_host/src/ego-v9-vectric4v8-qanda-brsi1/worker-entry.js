import { evaluateBatchAccelerated } from "./evaluate-batch.js";
import {probeWorkerGpu} from "./gpu-head-trainer.js";
import { runOracleExperiment } from "./causal-oracle.js";

const modelCache=new Map();
function resolveCachedEvaluate(msg){
  const key=msg.modelCacheKey?String(msg.modelCacheKey):null;
  if(key&&msg.modelCachePayload){modelCache.set(key,msg.modelCachePayload);while(modelCache.size>6)modelCache.delete(modelCache.keys().next().value);}
  if(!key)return msg;
  const cached=modelCache.get(key);if(!cached)throw new Error("worker model cache miss for "+key);
  return {...msg,...cached,modelCachePayload:undefined};
}

function transfers(value,out=[],seenObj=new Set(),seenBuf=new Set()){
  if(value==null||typeof value!=="object"||seenObj.has(value))return out;seenObj.add(value);
  if(ArrayBuffer.isView(value)){const b=value.buffer;if(b instanceof ArrayBuffer&&b.byteLength&&!seenBuf.has(b)){seenBuf.add(b);out.push(b);}return out;}
  if(value instanceof ArrayBuffer){if(value.byteLength&&!seenBuf.has(value)){seenBuf.add(value);out.push(value);}return out;}
  if(Array.isArray(value)){for(const x of value)transfers(x,out,seenObj,seenBuf);return out;}
  for(const x of Object.values(value))transfers(x,out,seenObj,seenBuf);return out;
}
self.onmessage=async(ev)=>{
  const msg=ev.data;if(!msg)return;
  try{
    if(msg.type==="gpu-probe"){
      const gpu=await probeWorkerGpu(msg.config||{},msg.model||null);
      self.postMessage({type:"result",taskId:msg.taskId,gpu});return;
    }
    if(msg.type==="evaluate"){
      const evalMsg=resolveCachedEvaluate(msg);
      const result=await evaluateBatchAccelerated(evalMsg,p=>{const m={type:"preview",taskId:msg.taskId,...p};self.postMessage(m,transfers(p));},p=>{self.postMessage({type:"progress",taskId:msg.taskId,...p});},p=>{self.postMessage({type:"live-sim",taskId:msg.taskId,...p});});
      self.postMessage({type:"result",taskId:msg.taskId,...result});return;
    }
    if(msg.type==="causal-oracle"){
      const result=await runOracleExperiment(msg.request);
      self.postMessage({type:"result",taskId:msg.taskId,oracleResult:{answer:result.answer}});return;
    }
    throw new Error("unknown worker task type "+msg.type);
  }catch(error){self.postMessage({type:"error",taskId:msg.taskId,message:error?.message||String(error),stack:error?.stack||null});}
};
