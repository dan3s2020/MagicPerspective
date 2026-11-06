// Isolated GPU client. Uses ONE Python process for original V17 and CUDA extensions.
// The original v17/.../gpu/client.mjs is intentionally unchanged.
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url));
export class GpuWorlds {
 constructor(settings){this.settings=settings;this.wait=new Map();this.id=0;this.buf='';this.info=null;this.error=null;this.dead=false;this.start();}
 start(){
  const venv=path.join(here,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  const py=this.py=process.env.OCTOPUS_PY||(fs.existsSync(venv)?venv:process.platform==='win32'?'python':'python3');
  this.p=spawn(py,['-u',path.join(here,'cuda_unified.py')],{stdio:['pipe','pipe','pipe'],windowsHide:true});
  const fail=msg=>{if(this.dead)return;this.dead=true;for(const v of this.wait.values())v.reject(Error(msg));this.wait.clear();};
  this.p.on('error',e=>fail('Cannot start '+py+': '+e.message));
  this.p.stdin.on('error',e=>fail('CUDA stdin error: '+e.message+' '+(this.error||'')));
  this.p.stdout.on('data',d=>{this.buf+=d;let k;while((k=this.buf.indexOf('\n'))>=0){
   const line=this.buf.slice(0,k);this.buf=this.buf.slice(k+1);
   let m;try{m=JSON.parse(line);}catch{continue;}
   const v=this.wait.get(m.id);if(v){this.wait.delete(m.id);m.error?v.reject(Error(m.error)):v.resolve(m);}
  }});
  this.p.stderr.on('data',d=>{this.error=((this.error||'')+String(d)).slice(-1400);});
  this.p.on('exit',code=>fail('Unified CUDA worker exited '+code+': '+(this.error||'')));
  let timer;
  const limit=new Promise((_,reject)=>{timer=setTimeout(()=>{reject(Error('Unified CUDA init timeout: '+(this.error||'')));this.close();},180000);});
  this.ready=Promise.race([this.call({cmd:'init',...this.settings}),limit]).then(info=>this.info=info,e=>{this.close();this.dead=true;throw e;}).finally(()=>clearTimeout(timer));
 }
 call(m){return new Promise((resolve,reject)=>{
  if(this.dead)return reject(Error('GPU process is unavailable: '+(this.error||'')));
  const id=++this.id;this.wait.set(id,{resolve,reject});
  try{this.p.stdin.write(JSON.stringify({...m,id})+'\n');}catch(e){this.wait.delete(id);reject(e);}
 });}
 async configure(settings){this.settings={...this.settings,...settings};await this.ready;this.info=await this.call({cmd:'init',...this.settings});return this.info;}
 close(){this.dead=true;for(const w of this.wait.values())w.reject(Error('GPU runtime closed'));this.wait.clear();try{this.p.stdin.end();this.p.kill();}catch{}}
}
