// CUDA worker bridge: local Windows-only Python process, never a fake CUDA flag.
// No CPU fallback. Existing Brain Studio HTTP server and saved brains remain intact.
import {spawn} from 'node:child_process';
import path from 'node:path';

export class CudaBridge{
 constructor({python,root}){
  this.python=python||null;
  this.root=root;
  this.child=null;
  this.lastError=null;
  this.lastLog='';
  this.started=false;
  this.ready=false;
  this.base='http://127.0.0.1:3045';
 }
 launch(){
  if(!this.python||this.child)return;
  const script=path.join(this.root,'cuda','cuda_worker.py');
  this.started=true;
  try{
   const proc=spawn(this.python,[script,'--port','3045'],{
    cwd:this.root,windowsHide:true,stdio:['ignore','pipe','pipe'],
    env:{...process.env,PYTHONUNBUFFERED:'1'}
   });
   this.child=proc;
   proc.stdout.on('data',chunk=>{
    const line=String(chunk);this.lastLog=(this.lastLog+line).slice(-3500);
    if(line.includes('CUDA_GRAPH_READY'))this.ready=true;
    console.log('[CUDA]',line.trim());
   });
   proc.stderr.on('data',chunk=>{
    const line=String(chunk);this.lastLog=(this.lastLog+line).slice(-3500);
    console.error('[CUDA]',line.trim());
   });
   proc.on('error',error=>{this.lastError=error.message;this.ready=false;this.child=null});
   proc.on('exit',(code,signal)=>{
    if(code&&code!==0)this.lastError='CUDA process exit '+code+
     (signal?' signal '+signal:'')+' '+this.lastLog.slice(-700);
    this.ready=false;this.child=null;
   });
  }catch(e){this.lastError=e.message;this.child=null;}
 }
 async request(endpoint,body=undefined,timeout=15000){
  if(!this.python)throw Error('CUDA Windows backend is disabled. Run START_MAGIC_CUDA.ps1');
  const response=await fetch(this.base+endpoint,{
   method:body===undefined?'GET':'POST',
   headers:body===undefined?{}:{'Content-Type':'application/json'},
   body:body===undefined?undefined:JSON.stringify(body),
   signal:AbortSignal.timeout(timeout)
  });
  const payload=await response.json();
  if(!response.ok)throw Error(payload.error||'CUDA HTTP '+response.status);
  return payload;
 }
 async status(){
  if(!this.python)return {available:false,running:false,status:'disabled',
   error:'Rulează START_MAGIC_CUDA.ps1 pe Windows cu NVIDIA CUDA.'};
  try{
   const result=await this.request('/status',undefined,2800);
   return result;
  }catch(e){
   return {available:false,running:false,status:'unavailable',
    error:this.lastError||this.lastLog.slice(-350)||e.message,
    pythonConfigured:true,started:this.started,ready:this.ready};
  }
 }
 async waitIdle(){
  await this.request('/stop',{});
  for(let i=0;i<300;i++){
   const state=await this.status();
   if(!state.available)throw Error('CUDA worker disconnected before synchronization: '+state.error);
   if(!state.running){
    if(state.status==='error')throw Error('CUDA training failed: '+state.error);
    return state;
   }
   await new Promise(resolve=>setTimeout(resolve,130));
  }
  throw Error('CUDA worker did not acknowledge pause; GPU live checkpoint remains independent');
 }
 async shutdown(){
  if(!this.child)return;
  try{await this.waitIdle()}catch(e){console.error('[CUDA shutdown]',e)}
  const child=this.child;
  if(child){child.kill('SIGTERM');this.child=null;}
 }
}
