// Graphical browser acceptance: ACTUAL V17 backend with genuine repository
// text corpus (NOT fake JSON). This confirms the NEW live training panel is
// visible ON THE SAME original training page, and actually draws real paths.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const availablePort=()=>new Promise((ok,no)=>{
 const s=net.createServer();s.once("error",no);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>ok(p));});
});
test("Chromium sees genuine pre-action predicted route, observed answer and nonblank canvas ON ORIGINAL V17 TRAINING PAGE",{
 timeout:180000
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v17-real-hypermaze-browser-"));
 const port=await availablePort();
 const source=path.join(root,"docs","TORUS_AETHER_ABC_20261104.md");
 const child=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","winner","--mem","1",
  "--text",source,"--out",path.join(dir,"runtime"),"--port",String(port),
  "--worlds","text","--every","8000","--chars","25000","--gpu","off","--start"
 ],{cwd:root,stdio:["ignore","pipe","pipe"],detached:true});
 let logs="";for(const p of [child.stdout,child.stderr])p.on("data",b=>logs=(logs+b.toString()).slice(-14000));
 let browser=null;
 const url="http://127.0.0.1:"+port;
 try{
  let ready=false;
  for(let i=0;i<140;i++){
   try{if((await fetch(url+"/graphs")).ok){ready=true;break;}}
   catch{}await sleep(90);
  }
  assert.ok(ready,"Actual native backend did not start: "+logs);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1600,height:1000}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(url+"/transcend/torus-aether/ui/index.html?live=1",
   {waitUntil:"domcontentloaded",timeout:30000});
  // No fake board, fake path injection or separate demo tab switch.
  await page.waitForFunction(()=>{
   const b=document.getElementById("hypermazeBox"),
    info=document.getElementById("hypermazeRows");
   return b&&!b.hidden&&Number((info?.textContent||"0").replace(/[^\d]/g,""))>=1;
  },null,{timeout:50000});
  assert.equal(await page.locator("#tabTrain").getAttribute("class"),"on");
  assert.equal(await page.locator("#hypermazeBox").isVisible(),true);
  assert.equal(await page.locator("#workerHealth").isVisible(),true,
   "Worker health must remain on the original training page");
  await page.waitForFunction(()=>
    (document.getElementById("workerHealth")?.textContent||"").includes("Ultimul graf"),
    null,{timeout:15000});
  assert.match(await page.locator("#workerHealth").textContent(),
    /Heartbeat: .*Ultimul graf: .*Fază raportată:/);
  assert.match(await page.locator("#workerHealth").textContent(),
    /DEBIT REAL .* exerciții\/s .* MB\/s text EFECTIV COMIS/);
  assert.equal(await page.locator("#textMazeBox").isVisible(),true,
   "Native original V17 text maze must not disappear");
  assert.equal(await page.locator("#g").isVisible(),true,
   "Native original V17 graph must not disappear");
  assert.match(await page.locator("#hypermazeFrame").textContent(),
   /EPISOD REAL \d+/);
  assert.match(await page.locator("#hypermazeFrame").textContent(),
   /FORMA ÎNAINTE DE RĂSPUNS/);
  assert.match(await page.locator("#hypermazeInfo").textContent(),
   /corpus real/);
  const rgb=await page.locator("#hypermazeCanvas").evaluate(cv=>{
   const g=cv.getContext("2d"),pix=g.getImageData(0,0,cv.width,cv.height).data;
   let colored=0;for(let i=0;i<pix.length;i+=80)if(
    !(pix[i]===5&&pix[i+1]===14&&pix[i+2]===23))colored++;
   return colored;
  });
  assert.ok(rgb>30,"The live trajectory canvas was blank");
  await page.locator("#hypermazePause").click();
  await page.locator("#hypermazeNext").click();
  assert.match(await page.locator("#hypermazeFrame").textContent(),/PAS \d+/);
  await page.locator("#hypermazeRestart").click();
  assert.equal(await page.locator("#hypermazeExport").isVisible(),true);
  assert.equal(await page.locator("#hypermazeEval").isVisible(),true);
  assert.deepEqual(errors,[],"Runtime original V17 browser errors: "+errors.join(", "));
  console.log("REAL_BROWSER_HYPERMAZE",JSON.stringify({
   corpus:path.basename(source),worker:"original V17 devour",originalGraph:true,
   originalTextMaze:true,visibleNewLivePanel:true,
   meaningfulNonblankPixels:rgb,
   liveRows:await page.locator("#hypermazeRows").textContent(),
   replayStep:await page.locator("#hypermazeFrameNo").textContent(),
   errors}));
 }finally{
  if(browser)await browser.close();
  try{process.kill(-child.pid,"SIGTERM");}catch{child.kill("SIGTERM");}
  await Promise.race([new Promise(ok=>child.once("exit",ok)),sleep(1800)]);
  fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 }
});
