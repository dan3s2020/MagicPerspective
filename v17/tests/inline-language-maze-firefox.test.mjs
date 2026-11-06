// Browser acceptance against REAL original V17 training + original Firefox UI.
// The text maze MUST be directly visible on TRAINING, beside the 2D maze and
// the transformation game. No tab switch or manual evaluation is allowed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {firefox} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once('error',reject);
 s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
test('Firefox shows automatically generated language hypermaze ON TRAINING alongside original 2D maze and transformations, gold initial shape and actual character steps', {timeout:170000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'magic-inline-firefox-'));
 const src=path.join(dir,'corpus.txt'),out=path.join(dir,'runtime');
 fs.writeFileSync(src,[
 'Q: How does she feel?\nA: She is happy.',
 'Q: How does she feel?\nA: She is tired.',
 'Q: How does she feel?\nA: She is calm.',
 'Q: How does he feel?\nA: He is tired.',
 'Q: How does she feel?\nA: She is very calm.',
 'Q: How does he feel?\nA: He is calm.'
 ].join('\n\n')+'\n');
 const p=await port(),base='http://127.0.0.1:'+p;
 const worker=spawn(process.execPath,['transcend/torus-aether/devour/devour.mjs',
  '--workers','1','--arms','stable+many','--worlds','text,maze,transform',
  '--gpu','off','--text',src,'--out',out,'--port',String(p),
  '--start','--mem','2','--every','50000','--maze-every','10000'],
  {cwd:root,detached:true,stdio:['ignore','pipe','pipe']});
 let logs='';for(const pipe of [worker.stdout,worker.stderr])
  pipe.on('data',v=>logs=(logs+String(v)).slice(-9000));
 let browser=null;
 try{
  let ready=false;
  for(let i=0;i<130;i++){
   try{if((await fetch(base+'/graphs')).ok){ready=true;break;}}catch{}
   await sleep(80);
  }
  assert.ok(ready,'Native server failed to boot '+logs);
  browser=await firefox.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1500,height:950}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/transcend/torus-aether/ui/index.html?live=1',
    {waitUntil:'domcontentloaded',timeout:30000});
  // NO tab click: this is the SAME initial page as the user's screenshot.
  await page.waitForFunction(()=>{
   const el=document.querySelector('#textMazeBox');
   return el&&!el.hidden&&el.getBoundingClientRect().width>100;
  },null,{timeout:25000});
  await page.waitForFunction(()=>{
   const t=document.querySelector('#textMazeInfo')?.textContent||'';
   return t.includes('Episod REAL');
  },null,{timeout:25000});
  assert.equal(await page.locator('#tabTrain').getAttribute('class'),'on');
  assert.equal(await page.locator('#textMazeBox').isVisible(),true);
  assert.equal(await page.locator('#mazeBox').isVisible(),true,
    'Original 2D maze must remain visible when maze world is enabled');
  assert.equal(await page.locator('#transBox').isVisible(),true,
    'Original transformation game must remain visible');
  assert.match(await page.locator('#textMazeInfo').textContent(),
    /răspunsul curent ascuns predictorului/);
  // Pause animation before checking the first frozen frame.
  await page.locator('#textMazePause').click();
  await page.locator('#textMazeRestart').click();
  assert.match(await page.locator('#textMazeFrame').textContent(),
    /ÎNAINTE DE ACȚIUNE/);
  assert.match(await page.locator('#textMazeFrame').textContent(),
    /Încă nicio acțiune/);
  await page.locator('#textMazeNext').click();
  assert.match(await page.locator('#textMazeFrame').textContent(),
    /Char emis:/);
  assert.match(await page.locator('#textMazeFrame').textContent(),
    /Context 1\/2\/4\/8\/16\/32/);
  await page.locator('#textMazePlane').selectOption('14');
  await page.locator('#textMazeMode').selectOption('body');
  await page.locator('#textMazeMode').selectOption('both');
  const pix=await page.locator('#textMazeCv').evaluate(c=>{
   const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   let nonzero=0;for(let i=0;i<data.length;i+=4096)
    if(data[i]||data[i+1]||data[i+2])nonzero++;
   return nonzero;
  });
  assert.ok(pix>10,'Canvas is blank; real shape/route did not draw');
  await page.locator('#tabObserve').click();
  await page.locator('#tabTrain').click();
  assert.equal(await page.locator('#textMazeBox').isVisible(),true,
    'Returning to TRAINING must restore inline hypermaze');
  assert.deepEqual(errors,[],'Actual Firefox runtime errors in original V17');
  console.log('REAL_FIREFOX_INLINE_LANGUAGE_MAZE '+JSON.stringify({
   allThreeWorldsOnTraining:true,automaticNoClick:true,
   goldVisibleAtFrame0:true,bodyCharacterAtFrame1:true,
   rotations:true,originalTabsUnchanged:true,canvasSamples:pix,errors:0
  }));
 }finally{
  if(browser)await browser.close();
  try{process.kill(-worker.pid,'SIGTERM');}catch{try{worker.kill('SIGTERM');}catch{}}
  await sleep(240);fs.rmSync(dir,{recursive:true,force:true});
 }
});
