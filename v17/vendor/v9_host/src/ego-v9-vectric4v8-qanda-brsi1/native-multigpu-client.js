import {ACTION_N,AGENCY_N,BODY_OBS_N,NET,WORLD_OBS_N} from "./config.js";
import {addLocalGrad,trainLocalSequence,visitLocalGrad,zeroLocalGrad} from "./brain.js";

const METRIC_KEYS=["actor","value","entropy","own","world","agency","continuity"];
const STATUS_TTL_MS=5000;
let statusCache=null,statusAt=0,nativeVerified=false,nativeParity=null,nativeFailure=null;

function clamp01(x,f=.75){const n=Number(x);return Number.isFinite(n)?Math.max(.05,Math.min(1,n)):f;}
function arraysOfModel(m){return[
  ["bodyW",m.body.W],["bodyB",m.body.b],["worldW",m.world.W],["worldB",m.world.b],
  ["gruWz",m.gru.Wz.W],["gruWzB",m.gru.Wz.b],["gruWr",m.gru.Wr.W],["gruWrB",m.gru.Wr.b],["gruWh",m.gru.Wh.W],["gruWhB",m.gru.Wh.b],
  ["actorW",m.actor.W],["actorB",m.actor.b],["criticW",m.critic.W],["criticB",m.critic.b],
  ["ownW",m.ownPred.W],["ownB",m.ownPred.b],["worldPredW",m.worldPred.W],["worldPredB",m.worldPred.b],["agencyW",m.agency.W],["agencyB",m.agency.b]
];}
function modelLayout(model){
  const offsets={};let paramN=0;for(const[name,a]of arraysOfModel(model)){offsets[name]=paramN;paramN+=a.length;}
  return{
    offsets,paramN,obsN:BODY_OBS_N+WORLD_OBS_N,bodyObsN:BODY_OBS_N,worldObsN:WORLD_OBS_N,
    bodyHidden:model.body.outN,worldHidden:model.world.outN,selfHidden:model.gru.stateN,higherN:NET.higherContext,
    gruInput:model.gru.inputN,gruGateIn:model.gru.inputN+model.gru.stateN,repN:model.actor.inN,ownIn:model.ownPred.inN,
    actionN:ACTION_N,agencyN:AGENCY_N
  };
}
function flattenModel(model){
  let n=0;for(const[,a]of arraysOfModel(model))n+=a.length;
  const out=new Float32Array(n);let o=0;for(const[,a]of arraysOfModel(model)){out.set(a,o);o+=a.length;}return out;
}
function scatterGrad(model,flat){
  const g=zeroLocalGrad(model),dst=[];visitLocalGrad(g,a=>dst.push(a));let o=0;
  for(const a of dst){for(let i=0;i<a.length;i++)a[i]=flat[o+i];o+=a.length;}
  if(o!==flat.length)throw new Error("native multi-GPU gradient shape mismatch");
  return g;
}
function recordLayout(L){
  let o=0;const R={};
  R.obs=o;o+=L.obsN;R.nextObs=o;o+=L.obsN;R.hidden=o;o+=L.selfHidden;R.higher=o;o+=L.higherN;
  R.prevAction=o++;R.prevReward=o++;R.prevMismatch=o;o+=3;R.action=o++;R.confidence=o++;R.advantage=o++;R.ret=o++;
  R.agency=o;o+=L.agencyN;R.identityActive=o++;R.bias=o;o+=L.actionN;R.mask=o;o+=L.actionN;R.stride=o;
  return R;
}
function finite(v,label){const n=Number(v);if(!Number.isFinite(n))throw new Error("native multi-GPU "+label+" non-finite");return n;}
function packTrajectories(trajectories,L,R){
  const useful=trajectories.filter(t=>t?.length),recordCount=useful.reduce((n,t)=>n+t.length,0),records=new Float32Array(recordCount*R.stride),offsets=new Uint32Array(useful.length+1);
  let row=0;
  const put=(base,off,a,n,label,fill=0)=>{for(let i=0;i<n;i++)records[base+off+i]=finite(a?.[i]??fill,label);};
  for(let ti=0;ti<useful.length;ti++){
    offsets[ti]=row;
    for(const r of useful[ti]){
      const b=row*R.stride;
      put(b,R.obs,r.obs,L.obsN,"obs");put(b,R.nextObs,r.nextObs,L.obsN,"nextObs");
      put(b,R.hidden,r.hiddenBefore,L.selfHidden,"hiddenBefore");put(b,R.higher,r.higherContext,L.higherN,"higherContext");
      records[b+R.prevAction]=finite(r.prevAction??0,"prevAction");records[b+R.prevReward]=finite(r.prevReward??0,"prevReward");
      put(b,R.prevMismatch,r.prevMismatch,3,"prevMismatch");
      records[b+R.action]=finite(r.action,"action");records[b+R.confidence]=finite(r.confidence??0,"confidence");records[b+R.advantage]=finite(r.advantage??0,"advantage");records[b+R.ret]=finite(r.return??0,"return");
      const ag=new Float32Array(L.agencyN);for(let i=4;i<L.agencyN;i++)ag[i]=.5;for(let i=0;i<Math.min(L.agencyN,r.agencyTarget?.length||0);i++)ag[i]=finite(r.agencyTarget[i],"agencyTarget");
      put(b,R.agency,ag,L.agencyN,"agencyTarget");records[b+R.identityActive]=r.identityAgencyActive===true?1:0;
      put(b,R.bias,r.specialistBias,L.actionN,"specialistBias",0);
      const mask=r.actionMask||new Uint8Array(L.actionN).fill(1);put(b,R.mask,mask,L.actionN,"actionMask",1);
      row++;
    }
  }
  offsets[useful.length]=row;return{useful,records,offsets,recordCount};
}
function encodeMeta(meta){return btoa(JSON.stringify(meta));}
function decodeMeta(s){return s?JSON.parse(atob(s)):{};}
function joinBody(params,records,offsets){
  const out=new Uint8Array(params.byteLength+records.byteLength+offsets.byteLength),a=new Uint8Array(params.buffer,params.byteOffset,params.byteLength),b=new Uint8Array(records.buffer,records.byteOffset,records.byteLength),c=new Uint8Array(offsets.buffer,offsets.byteOffset,offsets.byteLength);
  out.set(a,0);out.set(b,a.length);out.set(c,a.length+b.length);return out;
}
function gradArrays(g){const out=[];visitLocalGrad(g,a=>out.push(a));return out;}
function parity(cpu,gpu){
  const a=gradArrays(cpu),b=gradArrays(gpu);let mx=0,q=0,n=0;
  for(let k=0;k<a.length;k++)for(let i=0;i<a[k].length;i++){const d=Math.abs(Number(a[k][i])-Number(b[k][i]));mx=Math.max(mx,d);q+=d*d;n++;}
  return{maxAbs:mx,rms:Math.sqrt(q/Math.max(1,n)),components:n};
}

export async function probeNativeMultiGpu(cfg={},force=false){
  if(cfg.nativeMultiGpuEnabled===false)return{available:false,verified:false,reason:"native multi-GPU disabled",adapter:{description:"Native multi-GPU OFF"},devices:[]};
  const now=Date.now();if(!force&&statusCache&&now-statusAt<STATUS_TTL_MS)return{...statusCache,verified:nativeVerified,parity:nativeParity};
  try{
    const r=await fetch("/compute/opencl/status",{cache:"no-store"});if(!r.ok)throw new Error("native GPU status HTTP "+r.status);
    const s=await r.json(),min=Math.max(1,Math.floor(Number(cfg.nativeGpuMinDevices)||2)),devices=Array.isArray(s.devices)?s.devices:[];
    statusCache={available:Boolean(s.ok)&&devices.length>=min,reason:devices.length>=min?null:("need "+min+" OpenCL GPUs, found "+devices.length),adapter:{description:"Native OpenCL · "+devices.map(x=>x.name).join(" + ")},devices,deviceCount:devices.length,backend:"native-opencl",targetUtilization:clamp01(cfg.nativeGpuTargetUtilization??cfg.gpuTargetUtilization)};
    statusAt=now;return{...statusCache,verified:nativeVerified,parity:nativeParity};
  }catch(e){nativeFailure=e?.message||String(e);statusCache={available:false,verified:false,reason:nativeFailure,adapter:{description:"Native OpenCL unavailable"},devices:[],deviceCount:0,backend:"native-opencl"};statusAt=now;return statusCache;}
}

async function nativeRawTrain(model,trajectories,cfg){
  const L=modelLayout(model),R=recordLayout(L),packed=packTrajectories(trajectories,L,R);
  if(!packed.useful.length)return{used:false,reason:"no records"};
  const params=flattenModel(model),meta={
    version:1,layout:L,recordLayout:R,paramN:L.paramN,recordStride:R.stride,trajectoryCount:packed.useful.length,recordCount:packed.recordCount,offsetCount:packed.offsets.length,
    modelKey:String(cfg.nativeModelKey||cfg.modelCacheKey||"anonymous"),tbpttSteps:Math.max(1,Math.floor(Number(cfg.tbpttSteps)||1)),
    rlEnabled:cfg.rlEnabled!==false,entropyCoef:Number(cfg.entropyCoef)||0,valueCoef:Number(cfg.valueCoef)||0,ownPredictCoef:Number(cfg.ownPredictCoef)||0,worldPredictCoef:Number(cfg.worldPredictCoef)||0,agencyCoef:Number(cfg.agencyCoef)||0,continuityCoef:Number(cfg.continuityCoef)||0,
    targetUtilization:clamp01(cfg.nativeGpuTargetUtilization??cfg.gpuTargetUtilization),minDevices:Math.max(1,Math.floor(Number(cfg.nativeGpuMinDevices)||2)),residentBuffers:cfg.nativeGpuResidentBuffers!==false,vramTargetFraction:Math.max(.05,Math.min(.75,Number(cfg.nativeGpuVramTargetFraction)||.35)),vramMaxMB:Math.max(128,Math.floor(Number(cfg.nativeGpuVramMaxMB)||1536)),sharedVramMaxMB:Math.max(64,Math.floor(Number(cfg.nativeSharedGpuBufferMaxMB)||256)),group:String(cfg.nativeGroup||"?"),requestId:String(cfg.nativeRequestId||cfg.nativeModelKey||"native")
  };
  const body=joinBody(params,packed.records,packed.offsets),res=await fetch("/compute/opencl/train-local",{method:"POST",headers:{"Content-Type":"application/octet-stream","X-Octopus-GPU-Meta":encodeMeta(meta)},body,cache:"no-store"});
  if(!res.ok){let reason="HTTP "+res.status;try{const q=await res.json();reason=q.error||reason;}catch(_){}throw new Error("native multi-GPU train failed: "+reason);}
  const rm=decodeMeta(res.headers.get("X-Octopus-GPU-Meta")),ab=await res.arrayBuffer(),need=(L.paramN+METRIC_KEYS.length)*4;
  if(ab.byteLength!==need)throw new Error("native multi-GPU response size "+ab.byteLength+" expected "+need);
  const all=new Float32Array(ab),gf=all.slice(0,L.paramN),mv=all.slice(L.paramN),grad=scatterGrad(model,gf),metrics={};
  for(let i=0;i<METRIC_KEYS.length;i++)metrics[METRIC_KEYS[i]]=Number(mv[i])||0;
  const devices=Array.isArray(rm.devices)?rm.devices:[],target=clamp01(meta.targetUtilization);
  return{used:true,grad,metrics,units:packed.useful.length,records:packed.recordCount,gpu:{available:true,verified:nativeVerified,reason:null,adapter:{description:"Native OpenCL · "+devices.map(x=>x.name).join(" + ")},devices,backend:"native-opencl",native:true,stats:{dispatches:Number(rm.dispatches)||devices.length,headBatches:1,records:packed.recordCount,gpuMs:Number(rm.kernelMs)||0,maxGpuMs:Number(rm.maxKernelMs)||0,uploadedBytes:body.byteLength,downloadedBytes:ab.byteLength,targetWorkloadShare:1,targetUtilization:target,perDevice:rm.perDevice||[],wallMs:Number(rm.wallMs)||0,computeWallMs:Number(rm.computeWallMs)||0,queueWaitMs:Number(rm.queueWaitMs)||0,paceMs:Number(rm.paceMs)||0,group:rm.group||String(cfg.nativeGroup||"?"),requestId:rm.requestId||String(cfg.nativeRequestId||"")},workload:{requestedShare:1,actualShare:1,totalRecords:packed.recordCount,gpuRecords:packed.recordCount,cpuRecords:0}}};
}

export async function trainLocalTrajectoriesNativeMultiGpu(model,trajectories,cfg={}){
  const status=await probeNativeMultiGpu(cfg);if(!status.available)return{used:false,reason:status.reason,gpu:status};
  const useful=trajectories.filter(t=>t?.length);if(!useful.length)return{used:false,reason:"no records",gpu:status};
  if(!nativeVerified&&cfg.nativeGpuVerify!==false){
    const a=useful[0].slice(0,Math.min(6,useful[0].length));if(a.length){
      const b=(useful[1]?.length?useful[1]:a).slice(0,Math.min(6,(useful[1]?.length?useful[1]:a).length)),verifyTrajs=[a,b],cpuGrad=zeroLocalGrad(model);
      for(const sample of verifyTrajs)addLocalGrad(cpuGrad,trainLocalSequence(model,sample,{...cfg,gpuEnabled:false,nativeMultiGpuEnabled:false}).grad);
      const out=await nativeRawTrain(model,verifyTrajs,{...cfg,nativeModelKey:"verify:"+String(cfg.nativeModelKey||"v9"),nativeGpuMinDevices:Math.max(2,Number(cfg.nativeGpuMinDevices)||2)});
      const p=parity(cpuGrad,out.grad);nativeParity={...p,devices:out.gpu?.devices?.map(x=>x.name)||[]};
      if((out.gpu?.devices?.length||0)<Math.max(2,Number(cfg.nativeGpuMinDevices)||2))throw new Error("native OpenCL verification did not execute on both GPUs");
      if(p.maxAbs>.012||p.rms>.0012){nativeFailure="native OpenCL parity failed maxAbs="+p.maxAbs+" rms="+p.rms;throw new Error(nativeFailure);}
      nativeVerified=true;
    }
  }
  const out=await nativeRawTrain(model,useful,cfg);if(out.gpu){out.gpu.verified=nativeVerified;out.gpu.stats.parityMaxAbs=nativeParity?.maxAbs??null;out.gpu.stats.parityRms=nativeParity?.rms??null;}return out;
}

export function nativeMultiGpuState(){return{verified:nativeVerified,parity:nativeParity,failure:nativeFailure,status:statusCache};}
