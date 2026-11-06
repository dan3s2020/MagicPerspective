#!/usr/bin/env node
// Termux-friendly, read-only inspection of the ACTUAL running V17 Brain.
// No training, no network beyond localhost, no checkpoint rewrite.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {analyzeSelfCodeGraph,difference,printableReport} from './transcend/torus-aether/worlds/self-code-metrics.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));
function opt(name,fallback){const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];}
const port=Number(opt('port','8867')),worker=Number(opt('worker','0')),watch=Number(opt('watch','0'));
if(!Number.isInteger(port)||port<1||port>65535||!Number.isInteger(worker)||worker<0||!Number.isFinite(watch)||watch<0)
 throw Error('Usage: node v17/measure-self-code.mjs [--port 8867] [--worker 0] [--watch 15]');
const output=path.resolve(opt('out',path.join(ROOT,'selfcode-measurements')));
async function json(url){
 const reply=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!reply.ok)throw Error('HTTP '+reply.status+' on '+url);
 return reply.json();
}
async function snapshot(){
 const graph=await json('http://127.0.0.1:'+port+'/graph?w='+worker);
 const result=analyzeSelfCodeGraph(graph,worker);
 result.port=port;
 let previous=null;
 const latest=path.join(output,'latest-'+worker+'.json');
 if(fs.existsSync(latest)){
  try{previous=JSON.parse(fs.readFileSync(latest,'utf8'));}catch{}
 }
 const diff=difference(previous,result);
 fs.mkdirSync(output,{recursive:true});
 const name=result.utc.replace(/[:.]/g,'-')+'-w'+worker+'.json';
 const target=path.join(output,name);
 fs.writeFileSync(target,JSON.stringify({snapshot:result,comparison:diff},null,2)+'\n');
 fs.writeFileSync(latest,JSON.stringify(result,null,2)+'\n');
 console.log('\n'+printableReport(result,diff));
 console.log('\nRaport salvat:',target);
 if(!result.code)console.log('Verifică în interfață că este selectat graful care rulează lumea code.');
 return result;
}
async function main(){
 const run=async()=>{try{await snapshot();}catch(e){
  console.error('NU AM PUTUT MASURA:',e.message);
  console.error('Verifica daca V17 este pornit pe 127.0.0.1:'+port+' si daca este selectat workerul corect (--worker N).');
  if(!watch)process.exitCode=1;
 }};
 await run();
 if(watch>0){
  console.log('Monitorizare locală la',watch,'secunde. Oprește cu Ctrl+C.');
  const wait=ms=>new Promise(done=>setTimeout(done,ms));
  for(;;){await wait(Math.max(2,watch)*1000);await run();}
 }
}
await main();