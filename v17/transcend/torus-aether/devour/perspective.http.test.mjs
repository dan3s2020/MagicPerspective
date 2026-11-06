import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Brain} from './brain.mjs';

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../');
function freePort(){
 return new Promise((resolve,reject)=>{
  const srv=net.createServer();
  srv.once('error',reject);srv.listen(0,'127.0.0.1',()=>{
   const p=srv.address().port;srv.close(()=>resolve(p));
  });
 });
}
test('actual ORIGINAL V17 HTTP trainer serves live edited UI, learns inside worker, evaluates frozen and saves',async()=>{
 const port=await freePort(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'v17-live-body-http-'));
 const file=path.join(tmp,'real-text.txt');fs.writeFileSync(file,'This is a real local training source for HTTP integration. '.repeat(60)+'\n\n'+'An independent training paragraph with different characters and additional information. '.repeat(12));
 const script=path.join(root,'transcend/torus-aether/devour/devour.mjs');
 const args=[script,'--workers','1','--arms','winner','--text',file,'--out',path.join(tmp,'runtime'),'--port',String(port),
  '--worlds','maze','--maze-every','1','--gpu','off','--start','--mem','2','--every','100000'];
 const child=spawn(process.execPath,args,{cwd:root,stdio:['ignore','pipe','pipe']});
 let output='';const append=x=>{output=(output+x.toString()).slice(-4500);};
 child.stdout.on('data',append);child.stderr.on('data',append);
 const url='http://127.0.0.1:'+port;
 try{
  let isReady=false;
  for(let i=0;i<150;i++){try{const r=await fetch(url+'/graphs');if(r.ok){isReady=true;break;}}catch{}await sleep(100);}
  assert.ok(isReady,'Real V17 HTTP service unavailable: '+output);
  const html=await (await fetch(url+'/transcend/torus-aether/ui/index.html?live=1')).text();
  assert.match(html,/id="perspectiveBox"/);
  assert.match(html,/id="mazeCv"/);
  assert.match(html,/id="chatForm"/);
  const js=await (await fetch(url+'/transcend/torus-aether/ui/app.js')).text();
  assert.match(js,/function perspectiveDraw\(/);
  let g=null;
  for(let i=0;i<250;i++){
   try{const r=await fetch(url+'/graph?w=0');if(r.ok){const v=await r.json();if(v.perspective?.episodes>=1){g=v;break;}}}
   catch{}await sleep(100);
  }
  assert.ok(g,'No real perspective training events arrived from worker: '+output);
  assert.ok(g.perspective.episodes>=1);
  assert.ok(g.perspective.last?.trace?.length>0,'Recorded live perspective replay missing');
  const list=await (await fetch(url+'/graphs')).json();
  assert.ok(list.graphs[0].worlds.includes('maze'));
  assert.ok(list.graphs[0].perspective?.episodes>=1);
  await fetch(url+'/control?do=pause&w=0',{method:'POST'});
  const response=await fetch(url+'/perspective-eval?w=0&count=4&seed=73',{method:'POST'});
  assert.equal(response.status,200);
  const evalData=await response.json();
  assert.ok(!evalData.error,JSON.stringify(evalData));
  assert.equal(evalData.learned.count,4);
  assert.equal(evalData.control.count,4);
  assert.equal(evalData.replay[0].globalObservationsAfterStart,0);
  const save=path.join(tmp,'runtime','brains','brain-0-winner.v8');
  await fetch(url+'/control?do=save&w=0',{method:'POST'});
  let exists=false;
  for(let i=0;i<100;i++){if(fs.existsSync(save)&&fs.statSync(save).size>0){exists=true;break;}await sleep(100);}
  assert.ok(exists,'Real Brain did not save from live UI control: '+output);
  const b=Brain.load(save);
  assert.ok(b.perspective.episodes>0,'Saved Brain lost live perspective learning');
  console.log('V17_LIVE_HTTP_ACCEPTANCE '+JSON.stringify({
   port,realEpisodes:b.perspective.episodes,learnedSamples:b.perspective.samples,
   evalCount:evalData.count,fromActualUI:true,
   savedCheckpointBytes:fs.statSync(save).size
  }));
 }finally{
  try{await fetch(url+'/stop',{method:'POST'});}catch{}
  child.kill('SIGINT');
  await Promise.race([new Promise(ok=>child.once('exit',ok)),sleep(6000)]);
  if(child.exitCode===null)child.kill('SIGKILL');
  fs.rmSync(tmp,{recursive:true,force:true});
 }
},{timeout:100000});
