import {ACTION_N,AGENCY_N,BODY_OBS_N,NET,WORLD_OBS_N} from "./config.js";
import {addLocalGrad,addSlice,denseBackward,forwardCore,gruBackward,scaleGrad,trainLocalSequence,visitLocalGrad,zeroLocalGrad} from "./brain.js";
import {probeNativeMultiGpu,trainLocalTrajectoriesNativeMultiGpu} from "./native-multigpu-client.js";

const WG=64;
const METRIC_N=6;
const nowMs=()=>typeof performance!=="undefined"&&performance.now?performance.now():Date.now();

const SUM_WGSL=`
@group(0) @binding(0) var<storage,read> data: array<f32>;
@group(0) @binding(1) var<storage,read> weights: array<f32>;
@group(0) @binding(2) var<storage,read_write> out: array<f32>;
@group(0) @binding(3) var<storage,read> meta: array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i=gid.x; let n=meta[0]; let count=meta[1];
  if(i>=n){return;}
  var s:f32=0.0;
  for(var k:u32=0u;k<count;k=k+1u){s=s+data[k*n+i]*weights[k];}
  out[i]=s;
}`;

function headLayout(model){
  const order=[
    ["actor",model.actor],["critic",model.critic],["ownPred",model.ownPred],
    ["worldPred",model.worldPred],["agency",model.agency]
  ];
  const L={};let off=0;
  for(const [name,p] of order){
    L[name+"W"]=off;off+=p.W.length;
    L[name+"B"]=off;off+=p.b.length;
  }
  L.paramN=off;L.repN=model.actor.inN;L.obsN=model.body.inN+model.world.inN;
  L.worldObsN=model.world.inN;L.agencyN=model.agency.outN;L.ownIn=model.ownPred.inN;
  L.higherN=L.repN-model.body.outN-model.world.outN-model.gru.stateN;
  if(L.higherN!==NET.higherContext)throw new Error("V9 GPU head layout higher-context mismatch");
  return L;
}
function headArrays(x){return [x.actor.W,x.actor.b,x.critic.W,x.critic.b,x.ownPred.W,x.ownPred.b,x.worldPred.W,x.worldPred.b,x.agency.W,x.agency.b];}
function flat(arrays){let n=0;for(const a of arrays)n+=a.length;const out=new Float32Array(n);let o=0;for(const a of arrays){out.set(a,o);o+=a.length;}return out;}
function scatter(src,arrays){let o=0;for(const a of arrays){a.set(src.subarray(o,o+a.length));o+=a.length;}}
function addHead(dst,src){const a=headArrays(dst),b=headArrays(src);for(let k=0;k<a.length;k++)for(let i=0;i<a[k].length;i++)a[k][i]+=b[k][i];}
function finiteArray(name,a){for(const x of a)if(!Number.isFinite(x))throw new Error(name+" contains non-finite values");}
function allGradArrays(g){const out=[];visitLocalGrad(g,a=>out.push(a));return out;}

function recordLayout(L){
  let o=0;const R={rep:o};o+=L.repN;R.nextObs=o;o+=L.obsN;R.action=o++;R.confidence=o++;R.advantage=o++;R.ret=o++;
  R.agency=o;o+=L.agencyN;R.identityAgencyActive=o++;R.bias=o;o+=ACTION_N;R.mask=o;o+=ACTION_N;R.stride=o;return R;
}
function packRecords(entries,L,R){
  const out=new Float32Array(entries.length*R.stride);
  const put=(base,off,a,n,label)=>{if(!a||a.length!==n)throw new Error("V9 GPU "+label+" length mismatch");for(let i=0;i<n;i++){const v=Number(a[i]);if(!Number.isFinite(v))throw new Error("V9 GPU "+label+" non-finite");out[base+off+i]=v;}};
  for(let k=0;k<entries.length;k++){
    const {record:r,rep}=entries[k],b=k*R.stride;
    put(b,R.rep,rep,L.repN,"rep");put(b,R.nextObs,r.nextObs,L.obsN,"nextObs");
    const action=Math.floor(Number(r.action));if(action<0||action>=ACTION_N)throw new Error("V9 GPU invalid action");
    out[b+R.action]=action;out[b+R.confidence]=Number(r.confidence)||0;out[b+R.advantage]=Number(r.advantage)||0;out[b+R.ret]=Number(r.return)||0;
    const agencyTarget=new Float64Array(L.agencyN);for(let i=4;i<L.agencyN;i++)agencyTarget[i]=.5;for(let i=0;i<Math.min(L.agencyN,r.agencyTarget?.length||0);i++)agencyTarget[i]=Number(r.agencyTarget[i])||0;
    put(b,R.agency,agencyTarget,L.agencyN,"agencyTarget");out[b+R.identityAgencyActive]=r.identityAgencyActive===true?1:0;
    const bias=r.specialistBias||new Float64Array(ACTION_N),mask=r.actionMask||new Uint8Array(ACTION_N).fill(1);
    put(b,R.bias,bias,ACTION_N,"specialistBias");put(b,R.mask,mask,ACTION_N,"actionMask");
  }
  return out;
}
function gpuConfig(cfg){return Float32Array.of(cfg.rlEnabled===false?0:1,Number(cfg.entropyCoef)||0,Number(cfg.valueCoef)||0,Number(cfg.ownPredictCoef)||0,Number(cfg.worldPredictCoef)||0,Number(cfg.agencyCoef)||0);}

function headShader(L,R){
  return `
const REP:u32=${L.repN}u;
const OBS:u32=${L.obsN}u;
const BODY:u32=${BODY_OBS_N}u;
const WORLD:u32=${L.worldObsN}u;
const OWNIN:u32=${L.ownIn}u;
const AGENCY:u32=${L.agencyN}u;
const PNUM:u32=${L.paramN}u;
const STRIDE:u32=${R.stride}u;
@group(0) @binding(0) var<storage,read> p:array<f32>;
@group(0) @binding(1) var<storage,read> rec:array<f32>;
@group(0) @binding(2) var<storage,read> cfg:array<f32>;
@group(0) @binding(3) var<storage,read_write> grad:array<f32>;
@group(0) @binding(4) var<storage,read_write> drepOut:array<f32>;
@group(0) @binding(5) var<storage,read_write> metricOut:array<f32>;
@group(0) @binding(6) var<storage,read> meta:array<u32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid:vec3<u32>){
  let k=gid.x;if(k>=meta[0]){return;}let rb=k*STRIDE;let gb=k*PNUM;let db=k*REP;let mb=k*${METRIC_N}u;
  var rep:array<f32,${L.repN}>;for(var i:u32=0u;i<REP;i=i+1u){rep[i]=rec[rb+${R.rep}u+i];}
  var logits:array<f32,${ACTION_N}>;var probs:array<f32,${ACTION_N}>;var mx:f32=-3.4e38;
  for(var o:u32=0u;o<${ACTION_N}u;o=o+1u){
    var s=p[${L.actorB}u+o];for(var i:u32=0u;i<REP;i=i+1u){s=s+p[${L.actorW}u+o*REP+i]*rep[i];}
    s=s+rec[rb+${R.bias}u+o];if(rec[rb+${R.mask}u+o]<0.5){s=-1.0e9;}logits[o]=s;mx=max(mx,s);
  }
  var den:f32=0.0;for(var o:u32=0u;o<${ACTION_N}u;o=o+1u){probs[o]=exp(logits[o]-mx);den=den+probs[o];}
  var ent:f32=0.0;for(var o:u32=0u;o<${ACTION_N}u;o=o+1u){probs[o]=probs[o]/max(den,1e-20);ent=ent-probs[o]*log(max(probs[o],1e-12));}
  var value=p[${L.criticB}u];for(var i:u32=0u;i<REP;i=i+1u){value=value+p[${L.criticW}u+i]*rep[i];}
  let act=u32(max(0.0,rec[rb+${R.action}u]));let conf=rec[rb+${R.confidence}u];
  var ai:array<f32,${L.ownIn}>;for(var i:u32=0u;i<REP;i=i+1u){ai[i]=rep[i];}
  for(var i:u32=0u;i<${ACTION_N}u;i=i+1u){ai[REP+i]=select(0.0,1.0,i==act);}ai[REP+${ACTION_N}u]=conf;
  var own:array<f32,${BODY_OBS_N}>;for(var o:u32=0u;o<BODY;o=o+1u){var s=p[${L.ownPredB}u+o];for(var i:u32=0u;i<OWNIN;i=i+1u){s=s+p[${L.ownPredW}u+o*OWNIN+i]*ai[i];}own[o]=s;}
  var wp:array<f32,${L.worldObsN}>;for(var o:u32=0u;o<WORLD;o=o+1u){var s=p[${L.worldPredB}u+o];for(var i:u32=0u;i<REP;i=i+1u){s=s+p[${L.worldPredW}u+o*REP+i]*rep[i];}wp[o]=s;}
  var ag:array<f32,${L.agencyN}>;for(var o:u32=0u;o<AGENCY;o=o+1u){var s=p[${L.agencyB}u+o];for(var i:u32=0u;i<OWNIN;i=i+1u){s=s+p[${L.agencyW}u+o*OWNIN+i]*ai[i];}ag[o]=s;}
  var drep:array<f32,${L.repN}>;var dai:array<f32,${L.ownIn}>;
  var actorLoss:f32=0.0;var valueLoss:f32=0.0;var ownLoss:f32=0.0;var worldLoss:f32=0.0;var agencyLoss:f32=0.0;
  if(cfg[0]>0.5){
    let adv=rec[rb+${R.advantage}u];actorLoss=-adv*log(max(probs[act],1e-12));let er=value-rec[rb+${R.ret}u];valueLoss=0.5*er*er;
    for(var o:u32=0u;o<${ACTION_N}u;o=o+1u){
      var d=-adv*(select(0.0,1.0,o==act)-probs[o]);if(cfg[1]!=0.0){d=d+cfg[1]*probs[o]*(log(max(probs[o],1e-12))+ent);}
      grad[gb+${L.actorB}u+o]=grad[gb+${L.actorB}u+o]+d;
      for(var i:u32=0u;i<REP;i=i+1u){grad[gb+${L.actorW}u+o*REP+i]=grad[gb+${L.actorW}u+o*REP+i]+d*rep[i];drep[i]=drep[i]+p[${L.actorW}u+o*REP+i]*d;}
    }
    let dc=cfg[2]*er;grad[gb+${L.criticB}u]=grad[gb+${L.criticB}u]+dc;
    for(var i:u32=0u;i<REP;i=i+1u){grad[gb+${L.criticW}u+i]=grad[gb+${L.criticW}u+i]+dc*rep[i];drep[i]=drep[i]+p[${L.criticW}u+i]*dc;}
  }
  for(var o:u32=0u;o<BODY;o=o+1u){
    let er=own[o]-rec[rb+${R.nextObs}u+o];ownLoss=ownLoss+er*er/BODY;let d=cfg[3]*2.0*er/BODY;
    grad[gb+${L.ownPredB}u+o]=grad[gb+${L.ownPredB}u+o]+d;
    for(var i:u32=0u;i<OWNIN;i=i+1u){grad[gb+${L.ownPredW}u+o*OWNIN+i]=grad[gb+${L.ownPredW}u+o*OWNIN+i]+d*ai[i];dai[i]=dai[i]+p[${L.ownPredW}u+o*OWNIN+i]*d;}
  }
  for(var o:u32=0u;o<WORLD;o=o+1u){
    let er=wp[o]-rec[rb+${R.nextObs+BODY_OBS_N}u+o];worldLoss=worldLoss+er*er/WORLD;let d=cfg[4]*2.0*er/WORLD;
    grad[gb+${L.worldPredB}u+o]=grad[gb+${L.worldPredB}u+o]+d;
    for(var i:u32=0u;i<REP;i=i+1u){grad[gb+${L.worldPredW}u+o*REP+i]=grad[gb+${L.worldPredW}u+o*REP+i]+d*rep[i];drep[i]=drep[i]+p[${L.worldPredW}u+o*REP+i]*d;}
  }
  let agencyCount:u32=select(4u,AGENCY,rec[rb+${R.identityAgencyActive}u]>0.5);
  for(var o:u32=0u;o<AGENCY;o=o+1u){
    if(o<agencyCount){
      let denAg=max(1.0,f32(agencyCount));let er=ag[o]-rec[rb+${R.agency}u+o];agencyLoss=agencyLoss+er*er/denAg;let d=cfg[5]*2.0*er/denAg;
      grad[gb+${L.agencyB}u+o]=grad[gb+${L.agencyB}u+o]+d;
      for(var i:u32=0u;i<OWNIN;i=i+1u){grad[gb+${L.agencyW}u+o*OWNIN+i]=grad[gb+${L.agencyW}u+o*OWNIN+i]+d*ai[i];dai[i]=dai[i]+p[${L.agencyW}u+o*OWNIN+i]*d;}
    }
  }
  for(var i:u32=0u;i<REP;i=i+1u){drep[i]=drep[i]+dai[i];drepOut[db+i]=drep[i];}
  metricOut[mb]=actorLoss;metricOut[mb+1u]=valueLoss;metricOut[mb+2u]=ent;metricOut[mb+3u]=ownLoss;metricOut[mb+4u]=worldLoss;metricOut[mb+5u]=agencyLoss;
}`;
}

function coreBackward(model,trajectories,flatCaches,drep,cfg){
  const total=zeroLocalGrad(model),metrics={continuity:0};let base=0,units=0;
  const bodyH=model.body.outN,worldH=model.world.outN,stateN=model.gru.stateN,repN=model.actor.inN,tbptt=Math.max(1,Math.floor(Number(cfg.tbpttSteps)||1));
  for(const traj of trajectories){
    const n=traj.length;if(!n)continue;const g=zeroLocalGrad(model);let dhFuture=new Float64Array(stateN),continuity=0;
    for(let t=n-1;t>=0;t--){
      if(t<n-1&&((t+1)%tbptt)===0)dhFuture.fill(0);
      const cache=flatCaches[base+t],dr=drep.subarray((base+t)*repN,(base+t+1)*repN),dBody=new Float64Array(bodyH),dWorldH=new Float64Array(worldH),dh=new Float64Array(stateN);
      addSlice(dBody,dr,0,bodyH);addSlice(dWorldH,dr,bodyH,worldH);addSlice(dh,dr,bodyH+worldH,stateN);
      for(let i=0;i<stateN;i++)dh[i]+=dhFuture[i];
      if(cfg.continuityCoef){
        for(let i=0;i<stateN;i++){const er=cache.gc.h[i]-cache.gc.hPrev[i];continuity+=er*er/stateN;dh[i]+=cfg.continuityCoef*2*er/stateN;}
      }
      const gb=gruBackward(model.gru,g.gru,cache.gc,dh);addSlice(dBody,gb.dx,0,bodyH);addSlice(dWorldH,gb.dx,bodyH,worldH);dhFuture=gb.dhPrev;
      if(cfg.continuityCoef)for(let i=0;i<stateN;i++){const er=cache.gc.h[i]-cache.gc.hPrev[i];dhFuture[i]-=cfg.continuityCoef*2*er/stateN;}
      denseBackward(model.body,g.body,cache.bc,dBody);denseBackward(model.world,g.world,cache.wc,dWorldH);
    }
    scaleGrad(g,1/n);addLocalGrad(total,g);metrics.continuity+=continuity/n;units++;base+=n;
  }
  return{grad:total,metrics,units};
}

class WorkerGpuHeadTrainer{
  constructor(adapter,device,info){
    this.adapter=adapter;this.device=device;this.info=info;this.available=Boolean(device);this.verified=false;this.reason=this.available?"":"WebGPU unavailable";this.pipeline=null;this.sumPipeline=null;this.signature=null;this.lost=false;
    this.stats={dispatches:0,headBatches:0,records:0,gpuMs:0,maxGpuMs:0,uploadedBytes:0,downloadedBytes:0,parityMaxAbs:null,parityRms:null,targetWorkloadShare:.75,targetUtilization:.75};
    if(device?.lost)device.lost.then(x=>{this.lost=true;this.available=false;this.reason="GPU device lost: "+(x?.message||x?.reason||"unknown");});
  }
  summary(){return{available:this.available&&!this.lost,verified:this.verified,reason:this.reason,adapter:this.info,stats:{...this.stats}};}
  ensure(){if(!this.available||this.lost||!this.device)throw new Error(this.reason||"WebGPU unavailable");}
  async compile(model){
    this.ensure();const L=headLayout(model),R=recordLayout(L),sig=[L.paramN,L.repN,L.obsN,L.worldObsN,L.agencyN].join(":");
    if(this.pipeline&&this.sumPipeline&&this.signature===sig)return{L,R};
    const compile=async(label,code)=>{const mod=this.device.createShaderModule({label,code}),ci=await mod.getCompilationInfo(),bad=(ci.messages||[]).filter(x=>x.type==="error");if(bad.length)throw new Error(label+" compile: "+bad.map(x=>x.message).join(" | "));return this.device.createComputePipelineAsync({label,layout:"auto",compute:{module:mod,entryPoint:"main"}});};
    this.pipeline=await compile("V9HeadTrain",headShader(L,R));this.sumPipeline=await compile("V9HeadReduce",SUM_WGSL);this.signature=sig;return{L,R};
  }
  makeBuffer(data,usage){
    const size=Math.max(4,Math.ceil(data.byteLength/4)*4),b=this.device.createBuffer({size,usage,mappedAtCreation:true}),dst=new Uint8Array(b.getMappedRange());dst.set(new Uint8Array(data.buffer,data.byteOffset,data.byteLength));b.unmap();return b;
  }
  async trainRaw(model,trajectories,cfg){
    this.ensure();const useful=trajectories.filter(t=>t?.length);if(!useful.length)return{grad:zeroLocalGrad(model),metrics:{actor:0,value:0,entropy:0,own:0,world:0,agency:0,continuity:0},units:0,records:0,gpu:this.summary()};
    const {L,R}=await this.compile(model),entries=[],weights=[],flatCaches=[];
    for(const traj of useful){
      let h=Float64Array.from(traj[0].hiddenBefore||new Float64Array(model.gru.stateN));
      for(const record of traj){
        const core=forwardCore(model,record.obs,h,record.higherContext,record.prevAction,record.prevReward,record.prevMismatch,{});
        h=core.hidden;entries.push({record,rep:core.rep});flatCaches.push(core.cache);weights.push(1/traj.length);
      }
    }
    const params=flat(headArrays(model)),cfgData=gpuConfig(cfg),outHead=zeroLocalGrad(model),drep=new Float32Array(entries.length*L.repN),metricRaw=new Float32Array(entries.length*METRIC_N);
    const deviceLimit=Math.min(Number(this.device.limits?.maxStorageBufferBindingSize)||134217728,Number(this.device.limits?.maxBufferSize)||268435456);
    const requested=Math.max(8,Number(cfg.gpuMaxBufferMB)||32)*1024*1024,maxBytes=Math.min(deviceLimit,requested),rowBytes=Math.max(4,L.paramN*4),maxRows=Math.max(1,Math.floor(maxBytes/rowBytes));
    let cursor=0;
    while(cursor<entries.length){
      const end=Math.min(entries.length,cursor+maxRows),part=entries.slice(cursor,end),partWeights=Float32Array.from(weights.slice(cursor,end)),packed=packRecords(part,L,R),meta=Uint32Array.of(part.length,L.paramN),sumMeta=Uint32Array.of(L.paramN,part.length),gpuStart=nowMs();
      const pB=this.makeBuffer(params,GPUBufferUsage.STORAGE),rB=this.makeBuffer(packed,GPUBufferUsage.STORAGE),cB=this.makeBuffer(cfgData,GPUBufferUsage.STORAGE),gB=this.device.createBuffer({size:part.length*L.paramN*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),dB=this.device.createBuffer({size:part.length*L.repN*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),mtB=this.device.createBuffer({size:part.length*METRIC_N*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),mB=this.makeBuffer(meta,GPUBufferUsage.STORAGE),wB=this.makeBuffer(partWeights,GPUBufferUsage.STORAGE),sumB=this.device.createBuffer({size:L.paramN*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),smB=this.makeBuffer(sumMeta,GPUBufferUsage.STORAGE);
      const bind=this.device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:pB}},{binding:1,resource:{buffer:rB}},{binding:2,resource:{buffer:cB}},{binding:3,resource:{buffer:gB}},{binding:4,resource:{buffer:dB}},{binding:5,resource:{buffer:mtB}},{binding:6,resource:{buffer:mB}}]}),sumBind=this.device.createBindGroup({layout:this.sumPipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:gB}},{binding:1,resource:{buffer:wB}},{binding:2,resource:{buffer:sumB}},{binding:3,resource:{buffer:smB}}]});
      const rg=this.device.createBuffer({size:L.paramN*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),rd=this.device.createBuffer({size:part.length*L.repN*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),rm=this.device.createBuffer({size:part.length*METRIC_N*4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      const enc=this.device.createCommandEncoder();enc.clearBuffer(gB);let pass=enc.beginComputePass();pass.setPipeline(this.pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(part.length/WG));pass.end();pass=enc.beginComputePass();pass.setPipeline(this.sumPipeline);pass.setBindGroup(0,sumBind);pass.dispatchWorkgroups(Math.ceil(L.paramN/WG));pass.end();enc.copyBufferToBuffer(sumB,0,rg,0,L.paramN*4);enc.copyBufferToBuffer(dB,0,rd,0,part.length*L.repN*4);enc.copyBufferToBuffer(mtB,0,rm,0,part.length*METRIC_N*4);this.device.queue.submit([enc.finish()]);
      await Promise.all([rg.mapAsync(GPUMapMode.READ),rd.mapAsync(GPUMapMode.READ),rm.mapAsync(GPUMapMode.READ)]);
      const gh=new Float32Array(rg.getMappedRange().slice(0)),dh=new Float32Array(rd.getMappedRange().slice(0)),mh=new Float32Array(rm.getMappedRange().slice(0));finiteArray("GPU head grad",gh);finiteArray("GPU drep",dh);finiteArray("GPU metrics",mh);
      const tmp=zeroLocalGrad(model);scatter(gh,headArrays(tmp));addHead(outHead,tmp);drep.set(dh,cursor*L.repN);metricRaw.set(mh,cursor*METRIC_N);
      for(const x of [rg,rd,rm]){x.unmap();x.destroy();}for(const x of [pB,rB,cB,gB,dB,mtB,mB,wB,sumB,smB])x.destroy();
      const gpuMs=Math.max(0,nowMs()-gpuStart);this.stats.gpuMs+=gpuMs;this.stats.maxGpuMs=Math.max(this.stats.maxGpuMs,gpuMs);this.stats.dispatches+=2;this.stats.headBatches++;this.stats.records+=part.length;this.stats.uploadedBytes+=params.byteLength+packed.byteLength+cfgData.byteLength+partWeights.byteLength+meta.byteLength+sumMeta.byteLength;this.stats.downloadedBytes+=gh.byteLength+dh.byteLength+mh.byteLength;
      cursor=end;
    }
    const core=coreBackward(model,useful,flatCaches,drep,cfg);addLocalGrad(core.grad,outHead);
    const metrics={actor:0,value:0,entropy:0,own:0,world:0,agency:0,continuity:core.metrics.continuity};
    const keys=["actor","value","entropy","own","world","agency"];
    for(let i=0;i<entries.length;i++){const w=weights[i];for(let j=0;j<keys.length;j++)metrics[keys[j]]+=metricRaw[i*METRIC_N+j]*w;}
    return{grad:core.grad,metrics,units:core.units,records:entries.length,gpu:this.summary()};
  }
  async verify(model,trajectory,cfg){
    const sample=trajectory.slice(0,Math.min(6,trajectory.length));if(!sample.length)return;
    const cpu=trainLocalSequence(model,sample,cfg),gpu=await this.trainRaw(model,[sample],cfg),ca=allGradArrays(cpu.grad),ga=allGradArrays(gpu.grad);let mx=0,q=0,n=0;
    for(let k=0;k<ca.length;k++)for(let i=0;i<ca[k].length;i++){const d=Math.abs(ca[k][i]-ga[k][i]);mx=Math.max(mx,d);q+=d*d;n++;}
    const rms=Math.sqrt(q/Math.max(1,n));this.stats.parityMaxAbs=mx;this.stats.parityRms=rms;
    if(mx>0.008||rms>0.0008)throw new Error("V9 WebGPU hybrid parity failed: maxAbs="+mx+" rms="+rms);
    this.verified=true;
  }
}

let singletonPromise=null;
async function createRuntime(){
  if(!globalThis.navigator?.gpu)return new WorkerGpuHeadTrainer(null,null,{description:"navigator.gpu unavailable"});
  try{
    const adapter=await navigator.gpu.requestAdapter({powerPreference:"high-performance"});if(!adapter)return new WorkerGpuHeadTrainer(null,null,{description:"No high-performance WebGPU adapter"});
    let info={};try{const q=adapter.info||(adapter.requestAdapterInfo?await adapter.requestAdapterInfo():null);if(q)info={vendor:q.vendor||"",architecture:q.architecture||"",device:q.device||"",description:q.description||""};}catch(_){}
    const label=[info.vendor,info.architecture,info.device,info.description].join(" ").toLowerCase(),software=adapter.isFallbackAdapter===true||/swiftshader|llvmpipe|software raster|microsoft basic|\bwarp\b/.test(label);
    if(software){const r=new WorkerGpuHeadTrainer(null,null,{...info,software:true});r.reason="Software WebGPU adapter rejected";return r;}
    const device=await adapter.requestDevice();return new WorkerGpuHeadTrainer(adapter,device,{...info,software:false,powerPreference:"high-performance"});
  }catch(e){const r=new WorkerGpuHeadTrainer(null,null,{description:"WebGPU init failed"});r.reason=e?.message||String(e);return r;}
}

function nativeProbeTrajectories(model){
  const obsN=BODY_OBS_N+WORLD_OBS_N,make=(seed)=>Array.from({length:3},(_,k)=>{
    const obs=Float64Array.from({length:obsN},(_,i)=>Math.sin((i+1)*(.031+seed*.001)+k*.17)*.2),nextObs=Float64Array.from(obs,(x,i)=>x+Math.cos((i+3)*.07+k)*.01),agency=new Float64Array(AGENCY_N);for(let i=4;i<AGENCY_N;i++)agency[i]=.5;
    return{obs,nextObs,hiddenBefore:Float64Array.from({length:model.gru.stateN},(_,i)=>Math.sin(i*.05+k*.09+seed)*.1),higherContext:Float64Array.from({length:NET.higherContext},(_,i)=>Math.cos(i*.08+k*.03+seed)*.1),prevAction:(k+seed)%ACTION_N,prevReward:.03*(k-seed),prevMismatch:Float64Array.of(.01*k,-.02*k,.015*(k+1)),action:(k*2+seed)%ACTION_N,confidence:.45+.05*k,advantage:.2-.03*k,return:.3+.02*k,agencyTarget:agency,identityAgencyActive:true,actionMask:new Uint8Array(ACTION_N).fill(1)};
  });
  return[make(1),make(2)];
}
export async function probeWorkerGpu(cfg={},model=null){
  if(cfg?.gpuEnabled===false)return{available:false,verified:false,reason:"disabled",adapter:{description:"GPU disabled"},stats:{targetWorkloadShare:0,targetUtilization:0}};
  if(cfg?.nativeMultiGpuEnabled!==false){
    const native=await probeNativeMultiGpu(cfg,true);
    if(native.available&&model){
      try{
        const out=await trainLocalTrajectoriesNativeMultiGpu(model,nativeProbeTrajectories(model),{...cfg,nativeModelKey:"startup-probe"});
        if(out?.used)return out.gpu;
      }catch(e){return{...native,available:false,verified:false,reason:e?.message||String(e)};}
    }
    if(native.available)return{...native,stats:{targetWorkloadShare:1,targetUtilization:Number(cfg.nativeGpuTargetUtilization??cfg.gpuTargetUtilization)||.75,records:0,dispatches:0,gpuMs:0}};
    if(cfg?.nativeMultiGpuRequired===true)return native;
  }
  if(!singletonPromise)singletonPromise=createRuntime();
  const rt=await singletonPromise,target=Math.max(.05,Math.min(1,Number(cfg?.gpuTargetUtilization)||.75));
  rt.stats.targetWorkloadShare=target;rt.stats.targetUtilization=target;
  return rt.summary();
}

export async function trainLocalTrajectoriesGpu(model,trajectories,cfg){
  if(cfg?.gpuEnabled===false)return{used:false,reason:"disabled"};
  const useful=trajectories.filter(t=>t?.length);if(!useful.length)return{used:false,reason:"no records"};
  if(cfg?.nativeMultiGpuEnabled!==false){
    try{
      const native=await trainLocalTrajectoriesNativeMultiGpu(model,useful,cfg);
      if(native?.used)return native;
      if(cfg?.nativeMultiGpuRequired===true)throw new Error(native?.reason||"native multi-GPU required but unavailable");
    }catch(e){
      if(cfg?.nativeMultiGpuRequired===true)throw e;
    }
  }
  if(!singletonPromise)singletonPromise=createRuntime();
  const rt=await singletonPromise,target=Math.max(.05,Math.min(1,Number(cfg?.gpuTargetUtilization)||.75));rt.stats.targetWorkloadShare=target;rt.stats.targetUtilization=target;
  if(!rt.available){if(cfg?.gpuRequired!==false)throw new Error("V9 GPU required but unavailable: "+rt.reason);return{used:false,reason:rt.reason,gpu:rt.summary()};}
  try{
    if(!rt.verified)await rt.verify(model,useful[0],cfg);
    const out=await rt.trainRaw(model,useful,cfg);return{used:true,...out};
  }catch(e){
    rt.available=false;rt.reason=e?.message||String(e);
    if(cfg?.gpuRequired!==false)throw e;
    return{used:false,reason:rt.reason,gpu:rt.summary()};
  }
}

export function workerGpuSummary(){
  return singletonPromise?{state:"initialized"}:{state:"cold"};
}
