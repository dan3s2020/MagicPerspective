#!/usr/bin/env node
// V17 live trainer telemetry. Monitoring makes no model changes.
// --evaluate explicitly invokes original frozen CPU evaluator, which requests a saved checkpoint.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const base=path.dirname(fileURLToPath(import.meta.url));
const opt=(name,def)=>{const i=process.argv.indexOf('--'+name);return i<0?def:process.argv[i+1];};
const flag=name=>process.argv.includes('--'+name);
const port=Number(opt('port','8867')),w=Number(opt('worker','0')),watch=Number(opt('watch','0'));
const count=Number(opt('samples','3')),max=Number(opt('max','2000'));
const dest=path.resolve(opt('out',path.join(base,'runtime-text-audit')));
if(!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(w)||w<0||watch<0||
 !Number.isInteger(count)||count<1||count>30||!Number.isInteger(max)||max<0)throw Error('Invalid port/worker/samples/max');
const pct=n=>typeof n==='number'&&Number.isFinite(n)?(n*100).toFixed(1)+'%':'—';
const ms=n=>typeof n==='number'&&Number.isFinite(n)?n.toFixed(1)+'ms':'—';
const iso=()=>new Date().toISOString();
async function get(uri,options={}){
 const response=await fetch('http://127.0.0.1:'+port+uri,{...options,
  cache:'no-store',signal:AbortSignal.timeout(240000),
  headers:{accept:'application/json',...(options.headers||{})}});
 if(!response.ok)throw Error(uri+': HTTP '+response.status);
 return response.json();
}
function save(prefix,x){fs.mkdirSync(dest,{recursive:true});
 const file=path.join(dest,prefix+'-'+iso().replace(/[:.]/g,'-')+'.json');
 fs.writeFileSync(file,JSON.stringify(x,null,2)+'\n');return file;}
async function capture(){
 const raw=await get('/graphs'),g=raw.graphs?.find(x=>x.w===w);
 if(!g)throw Error('Worker #'+w+' missing; available '+(raw.graphs||[]).map(x=>x.w).join(','));
 const x=g.gpu?.text||{},p=x.phaseMs||{},h=x.hostMs||{},stamp=iso();
 const snapshot={stamp,worker:w,worlds:g.worlds,status:g.status,chars:g.chars,
  cudaDevice:g.gpu?.info?.name||g.gpu?.settings?.device||'not reported',
  gpuError:g.gpu?.error||null,charsBatch:x.chars??null,
  batch:x.batch??null,cardMs:x.cardMs??null,mergeMs:x.mergeMs??null,
  gpuBusySeconds:x.busy??null,peakVramGB:x.vramUsedGB??null,
  phaseMs:x.phaseMs||null,hostMs:x.hostMs||null,shared:g.shared||null,
  selfCode:g.code||null};
 fs.mkdirSync(dest,{recursive:true});
 let previous;const latest=path.join(dest,'latest-w'+w+'.json');
 try{previous=JSON.parse(fs.readFileSync(latest,'utf8'))}catch{}
 fs.writeFileSync(latest,JSON.stringify(snapshot,null,2)+'\n');
 const saved=save('sample-w'+w,snapshot);
 console.log('\nTEXT V17 / '+stamp+' / worker #'+w);
 console.log('Worlds:',g.worlds.join(','),'state:',g.status,'trained chars:',g.chars,
  'CUDA:',snapshot.cudaDevice,'GPU error:',snapshot.gpuError||'none reported');
 console.log('Batch:',snapshot.batch,'exercises,',snapshot.charsBatch,'chars, card+RPC:',ms(x.cardMs),
  'merge:',ms(x.mergeMs),'VRAM peak:',snapshot.peakVramGB);
 console.log('CUDA ALIGNMENT:',ms(p.alignment),'IMAGINATION:',ms(p.imagination),
  'FULL REINDEX:',ms(p.reindex),'INDEXED MEMORY:',p.indexedCharacters??'—');
 console.log('CPU native graph:',ms(h.originalGraphTrace),'causal language+code:',ms(h.causalTextAndCode),
  'shared Torch:',ms(h.sharedPyTorch),'maze+transforms:',ms(h.mazeAndTransform),'batch total:',ms(h.total));
 if(previous&&previous.chars<=snapshot.chars){
  const elapsed=(Date.parse(stamp)-Date.parse(previous.stamp))/1000;
  if(elapsed>0)console.log('Measured throughput:',((snapshot.chars-previous.chars)/elapsed).toFixed(1),'chars/sec over',elapsed.toFixed(1),'seconds');
 }
 if(!snapshot.phaseMs)console.log('Per-phase CUDA measurements unavailable: restart updated worker with MP_PROFILE_TEXT=1.');
 console.log('Saved:',saved);
 return snapshot;
}
async function frozenEval(){
 console.log('Frozen CPU eval explicitly requested: model saves checkpoint; live training weights not updated by evaluation.');
 const start=Date.now(),result=await get('/eval',{method:'POST',headers:{'content-type':'application/json'},
  body:JSON.stringify({w,kind:'text',opts:{count,max,T:0,noise:0}})});
 if(result.error)throw Error(result.error);
 const rows=(result.exercises||[]).map(e=>{
  const answerLength=Math.max(0,e.n-e.a0),written=e.shape?.length||0;
  return {n:e.n,answerLength,teacherForcedAnswer:e.answer,all:e.all,
   oldGraphAnswer:e.oldAnswer,generatedExactPosition:e.shapeSame,
   written,coverage:answerLength?written/answerLength:null};
 });
 const file=save('frozen-text-eval-w'+w,{timeMs:Date.now()-start,worker:w,rows,raw:result,
  interpretation:'shapeSame is exact same-position character match / answer length. Not semantic or geometric form.'});
 for(const [i,x] of rows.entries())console.log('Example',i+1,'teacher-forced',pct(x.teacherForcedAnswer),
  'independent generation exact',pct(x.generatedExactPosition),'coverage',pct(x.coverage));
 console.log('Frozen evaluation saved:',file);
}
async function attempt(){try{await capture();return true}catch(e){console.error('AUDIT:',e.message);return false}}
const good=await attempt();
if(flag('evaluate'))try{await frozenEval()}catch(e){console.error('EVALUATION:',e.message);process.exitCode=1}
if(watch>0){console.log('Monitoring every',watch,'seconds. Ctrl+C stops monitor only.');
 for(;;){await new Promise(resolve=>setTimeout(resolve,Math.max(2,watch)*1000));await attempt();}
}else if(!good)process.exitCode=1;
