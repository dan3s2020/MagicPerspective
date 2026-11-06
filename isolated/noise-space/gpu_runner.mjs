// Read-only adapter to V17's EXISTING CUDA world/card implementation.
// CUDA mode must initialize a real PyTorch CUDA device; no silent CPU substitution.
import {GpuWorlds} from './cuda_full_client.mjs';
const bounded=(x,lo,hi,fallback)=>{const n=Number(x);return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):fallback;};
export function checkedGpuConfig(raw={}){
 const device=raw.device==='numpy'?'numpy':'cuda:0';
 return {device,worlds:Math.round(bounded(raw.worlds,1,256,32)),textBatch:Math.round(bounded(raw.textBatch,1,32,4)),
  vram:bounded(raw.vram,.5,3.8,2.6),util:bounded(raw.util,10,100,100)};
}
export class IsolatedGpuRunner{
 constructor(){this.client=null;this.info=null;this.error=null;this.settings=null;this.last=null;this.auxLast=null;}
 get active(){return !!this.client&&!this.client.dead&&!!this.info;}
 async start(raw){
  if(this.client)this.close();
  this.error=null;this.settings=checkedGpuConfig(raw);this.client=new GpuWorlds(this.settings);
  try{
   this.info=await this.client.ready;
   if(this.settings.device.startsWith('cuda')&&(!this.info?.torch||!String(this.info.device).startsWith('cuda')||!this.info?.auxiliary?.torchCUDA))
    throw Error('The CUDA worker did not confirm hardware execution.');
   this.last={type:'device_ready',device:this.info.device,at:new Date().toISOString()};
   return this.info;
  }catch(e){this.error=String(e.stack||e);this.close();throw e;}
 }
 async text(brain,exercises){
  if(!this.active)throw Error('GPU is not ready');
  if(!exercises.length)throw Error('No unique text exercises supplied');
  const a=performance.now(),v=await brain.learnTextGPU(this.client,exercises);
  const out={kind:'text',worlds:exercises.length,bytes:exercises.reduce((n,x)=>n+x.length,0),
    device:this.info.device,elapsedMs:Math.round(performance.now()-a),gpuBusyMs:v.cardMs,
    vramUsedGB:v.vramUsedGB,alignAccuracy:v.acc,mergeMs:v.mergeMs};
  this.last=out;return out;
 }
 async maze(brain,callback=async()=>{}){
  if(!this.active)throw Error('GPU is not ready');
  const a=performance.now(),v=await brain.learnMazesGPU(this.client,this.settings.worlds,callback);
  this.last={kind:'maze',worlds:v.batch,solved:v.solved,device:this.info.device,
    elapsedMs:Math.round(performance.now()-a),gpuBusyMs:v.cardMs,
    vramUsedGB:v.vramUsedGB,mergeMs:v.mergeMs};return this.last;
 }
 async transform(brain,callback=async()=>{}){
  if(!this.active)throw Error('GPU is not ready');
  const a=performance.now(),v=await brain.playTransformsGPU(this.client,this.settings.worlds,callback);
  this.last={kind:'transform',worlds:v.batch,device:this.info.device,elapsedMs:Math.round(performance.now()-a),
    gpuBusySeconds:v.busy,vramUsedGB:v.vramUsedGB};return this.last;
 }
 async geometry(geometry,samples){
  if(!this.active)throw Error('GPU is not ready');
  if(!samples.length)return null;
  const r=await this.client.call({cmd:'geometry_train',state:geometry.export(),samples,batchSize:128});
  if(this.settings.device.startsWith('cuda')&&!String(r.device).startsWith('cuda'))throw Error('Geometry did not train on CUDA');
  this.auxLast={kind:'geometry',trained:r.trained,evaluated:r.evaluated,elapsedMs:r.elapsedMs,peakVramGB:r.peakVramGB,device:r.device};return r;
 }
 async latent(agent,samples){
  if(!this.active)throw Error('GPU is not ready');
  if(!samples.length)return null;
  const r=await this.client.call({cmd:'latent_train',state:agent.latent.export(),samples});
  if(this.settings.device.startsWith('cuda')&&!String(r.device).startsWith('cuda'))throw Error('Goal field did not train on CUDA');
  this.auxLast={kind:'latent',trained:r.trained,elapsedMs:r.elapsedMs,peakVramGB:r.peakVramGB,device:r.device};return r;
 }
 status(){const cuda=this.active&&String(this.info?.device||'').startsWith('cuda');return {enabled:this.active,requested:!!this.settings,device:this.info?.device||null,
  info:this.info,config:this.settings,last:this.last,auxLast:this.auxLast,error:this.error,
  trainableCuda:{v17TextAlignment:cuda,mazeWorldBatches:cuda,transformWorldPhysics:cuda,
   geometricSGD:cuda,causal32DGoalField:cuda},
  remainingCPU:['V17 legacy LeanC/EmergentChain associative updates','Discoverer and CausalOrganism sparse rule merges',
   'CausalTextAgent action-effect and reward-value maps','TextActionPaths word-transition counts',
   'language-world interventions, scoring, text corpus IO and UI'],
  caveat:'Original V17 CUDA routines plus geometric and 32D goal SGD train on Torch. Sparse Brain updates, action/value maps and UI remain CPU. This is NOT a complete all-GPU brain.'};}
 close(){if(this.client){this.client.close();this.client=null;}this.info=null;}
}
