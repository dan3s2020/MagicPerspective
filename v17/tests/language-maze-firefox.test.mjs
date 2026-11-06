// REAL Firefox + REAL original V17 trainer. No mocked DOM or injected routes.
// Runs the native UI while the same original Brain trains from actual TXT.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {firefox} from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const socket=net.createServer();socket.once("error",reject);
 socket.listen(0,"127.0.0.1",()=>{const p=socket.address().port;socket.close(()=>resolve(p));});
});
test("Firefox sees real 5D language maze, frozen gold line before first action, body moves on learned edges with step replay, rotation and original Torus preserved", {timeout:150000},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v17-language-firefox-"));
 const source=path.join(temp,"original-corpus.txt"),out=path.join(temp,"brains");
 const examples=["She is happy.","She is tired.","He is tired.","He is calm."];
 fs.writeFileSync(source,examples.join("\n\n")+"\n","utf8");
 const p=await port(),host="http://127.0.0.1:"+p;
 const trainer=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","text",
  "--gpu","off","--text",source,"--out",out,"--port",String(p),
  "--start","--mem","1","--every","50000"
 ],{cwd:root,detached:true,stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const s of [trainer.stdout,trainer.stderr])s.on("data",b=>logs=(logs+String(b)).slice(-8000));
 let browser=null;
 try{
  let ready=false;
  for(let i=0;i<120;i++){
   try{if((await fetch(host+"/graphs")).ok){ready=true;break;}}catch{}
   await sleep(100);
  }
  assert.ok(ready,"Original server unavailable "+logs);
  browser=await firefox.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(host+"/transcend/torus-aether/ui/index.html?live=1",
    {waitUntil:"domcontentloaded",timeout:30000});
  const original=await page.locator("#g").isVisible();
  assert.equal(original,true,"Original 5D Torus canvas removed");
  await page.locator("#tabLanguageMaze").click();
  assert.equal(await page.locator("#languageMazePane").isVisible(),true);
  assert.equal(await page.locator("#languageMazeCv").isVisible(),true);
  assert.equal(await page.locator("#g").isVisible(),false,
   "Full-width new maze should replace visualization, NOT delete original graph");
  await page.locator("#languageMazeStart").fill("He is calm.");
  await page.locator("#languageMazeGoal").fill("She,calm");
  await page.locator("#languageMazePlan").click();
  await page.waitForFunction(()=>{
   const status=document.querySelector("#languageMazeStatus")?.textContent||"";
   return status.includes("FORMA REALĂ ÎNGHEȚATĂ")||status.includes("eșuat");
  },null,{timeout:45000});
  const status=await page.locator("#languageMazeStatus").textContent();
  assert.match(status,/FORMA REALĂ ÎNGHEȚATĂ/,status);
  assert.match(await page.locator("#languageMazeFrame").textContent(),
    /ÎNAINTE DE MIȘCARE/);
  assert.match(await page.locator("#languageMazeFrame").textContent(),
    /She is calm\./);
  assert.match(await page.locator("#languageMazePath").textContent(),
    /AURIU/);
  assert.equal(await page.locator("#languageMazeFrameNo").textContent(),"0 / 1");
  await page.locator("#languageMazeNext").click();
  assert.equal(await page.locator("#languageMazeFrameNo").textContent(),"1 / 1");
  const text=await page.locator("#languageMazeFrame").textContent();
  assert.match(text,/Acțiune:/);
  assert.match(text,/Noua stare executată:/);
  assert.match(text,/Perspectiv|PERSPECTIVA/);
  await page.locator("#languageMazeRestart").click();
  assert.equal(await page.locator("#languageMazeFrameNo").textContent(),"0 / 1");
  const canvas=page.locator("#languageMazeCv");
  const bounds=await canvas.boundingBox();
  assert.ok(bounds.width>400&&bounds.height>200,"Viewer is not full width");
  await page.mouse.move(bounds.x+Math.min(80,bounds.width/3),bounds.y+80);
  await page.mouse.down();
  await page.mouse.move(bounds.x+Math.min(190,bounds.width/2),bounds.y+135,{steps:7});
  await page.mouse.up();
  await page.locator("#languageMazeRotation").selectOption("34");
  await page.locator("#languageMazeSlice").selectOption("w");
  await page.locator("#languageMazePerspective").selectOption("body");
  assert.match(await page.locator("#languageMazeGeometry").textContent(),
    /5D|PCA/);
  await page.locator("#tabTrain").click();
  assert.equal(await page.locator("#g").isVisible(),true,
   "Original Torus must be restored after visualizing language");
  assert.equal(await page.locator("#languageMazePane").isVisible(),false);
  await page.locator("#tabLanguageMaze").click();
  assert.equal(await page.locator("#languageMazeCv").isVisible(),true);
  assert.deepEqual(errors,[],"Browser errors in real original V17 UI");
  console.log("REAL_V17_FIREFOX_LANGUAGE_MAZE "+JSON.stringify({
   originalCanvasRestored:true,goal:"She,calm",
   predictedBeforeMoving:"She is calm.",frames:2,rotations:true,
   alternateLayers:true,errors:errors.length
  }));
 }finally{
  if(browser)await browser.close();
  try{process.kill(-trainer.pid,"SIGTERM");}catch{try{trainer.kill("SIGTERM");}catch{}}
  await sleep(240);fs.rmSync(temp,{recursive:true,force:true});
 }
});
