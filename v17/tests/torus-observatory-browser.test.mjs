// Real Firefox browser acceptance, NOT an image/synthetic screenshot.
// Launch the ORIGINAL V17 server and use the same UI/HTTP as the user.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {firefox} from 'playwright';
const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();
 s.once('error',reject);
 s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
test('Firefox: the original native Torus UI renders seven REAL observatory tabs, updates counters, and never hangs a frozen shared-eval HTTP request', {timeout:140000},async()=>{
 const home=fs.mkdtempSync(path.join(os.tmpdir(),'magic-v17-real-firefox-'));
 const corpus=path.join(home,'data.txt'),out=path.join(home,'output');
 fs.writeFileSync(corpus,Array.from({length:80},(_,i)=>[
   'She is happy.','She is tired.','He is tired.','He is calm.',
   'A door opens. The path changes. The organism observes the result.'
 ][i%5]).join('\n\n'));
 const p=await port(),host='http://127.0.0.1:'+p;
 const server=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
   '--workers','1','--arms','stable+many','--worlds','text','--gpu','off',
   '--text',corpus,'--out',out,'--port',String(p),'--every','20000','--mem','2'],
   {cwd:v17,detached:true,stdio:['ignore','pipe','pipe']});
 let logs='';for(const stream of [server.stdout,server.stderr])
   stream.on('data',b=>logs=(logs+String(b)).slice(-6000));
 let browser=null;
 try{
   let ready=false;
   for(let i=0;i<150;i++){
     try{const r=await fetch(host+'/graphs');if(r.ok){ready=true;break;}}catch{}
     await sleep(90);
   }
   assert.ok(ready,'Original V17 server failed: '+logs);
   browser=await firefox.launch({headless:true});
   const page=await browser.newPage({viewport:{width:1366,height:820}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(host+'/transcend/torus-aether/ui/index.html?live=1',
     {waitUntil:'domcontentloaded',timeout:30000});
   await page.locator('#tabObserve').click();
   assert.equal(await page.locator('#observePane').isVisible(),true,
     'Native observability panel is hidden after clicking its tab');
   for(const [name,expected] of [
     ['activity','Progres CPU'],
     ['transforms','Transformări induse'],
     ['paths','Căi observate'],
     ['latent','32 dimensiuni'],
     ['noise','Agenția zgomotului'],
     ['spectrum','Faze pe'],
     ['selfcode','Universul propriului cod']
   ]){
     await page.locator('#obsNav [data-obs="'+name+'"]').click();
     const title=await page.locator('#obsTitle').textContent();
     assert.ok(title.includes(expected),name+' does not show real panel title: '+title);
   }
   await page.locator('#tabTrain').click();
   assert.equal(await page.locator('#livePanel').isVisible(),true);
   assert.equal(await page.locator('#observePane').isVisible(),false);
   // Evaluating a not-yet-trained shared CUDA head should not hang Firefox
   // or give an opaque NetworkError: it must report the backend cause.
   await page.locator('#sharedEvalGo').click();
   await page.waitForFunction(()=>{
     const t=document.querySelector('#sharedEvalOut')?.textContent||'';
     return t.includes('Evaluare nereușită:');
   },null,{timeout:20000});
   const evalOut=await page.locator('#sharedEvalOut').textContent();
   assert.match(evalOut,/PyTorch|CUDA|GPU|Shared head/);
   assert.doesNotMatch(evalOut,/NetworkError/);
   await page.locator('#allStart').click();
   await page.waitForFunction(()=>{
     const t=document.querySelector('#steps')?.textContent||'0';
     return Number(t.replace(/[^0-9]/g,''))>0;
   },null,{timeout:30000});
   assert.match(await page.locator('#lastSnapshotAge').textContent(),/s|—/);
   await page.locator('#tabObserve').click();
   await page.waitForFunction(()=>{
     const s=document.querySelector('#obsMeta')?.textContent||'';
     return s.includes('Antrenare CUDA+CPU:')&&s.includes('evenimente');
   },null,{timeout:15000});
   assert.deepEqual(errors,[],'Runtime JS errors in actual Firefox during live interaction');
   console.log('REAL_FIREFOX_NATIVE_V17 '+JSON.stringify({
     tabCount:7,
     processed:await page.locator('#steps').textContent(),
     lived:await page.locator('#livedSteps').textContent(),
     sharedEvalError:evalOut,
     browserScriptErrors:errors.length
   }));
 }finally{
   if(browser)await browser.close();
   try{process.kill(-server.pid,'SIGTERM');}catch{try{server.kill('SIGTERM');}catch{}}
   await sleep(250);
   fs.rmSync(home,{recursive:true,force:true});
 }
});
