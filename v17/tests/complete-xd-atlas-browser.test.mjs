// Browser acceptance on the ORIGINAL V17 live UI, original Node trainer and
// a real repository corpus. There is no canned path, mock server, or demo UI.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function freePort(){
 const netServer=net.createServer();
 await new Promise(ok=>netServer.listen(0,"127.0.0.1",ok));
 const n=netServer.address().port;
 await new Promise(ok=>netServer.close(ok));return n;
}
test("ORIGINAL browser renders the ENTIRE finite maze + genuine cross-episode text-path failures; original UI intact, frozen eval buttons work",{
 timeout:180000
},async()=>{
 const port=await freePort(),dir=fs.mkdtempSync(path.join(os.tmpdir(),"v17-native-real-atlas-browser-"));
 const corpus=path.join(root,"docs","TORUS_AETHER_ABC_20261104.md");
 const child=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1","--arms","winner",
  "--mem","1.2","--text",corpus,"--out",dir,"--port",String(port),
  "--worlds","text","--gpu","off","--chars","9000","--every","1000000",
  "--xd-atlas-every","350","--start"
 ],{cwd:root,stdio:["ignore","pipe","pipe"],detached:true});
 let logs="";
 for(const stream of [child.stdout,child.stderr])
  stream.on("data",data=>logs=(logs+data.toString()).slice(-20000));
 let browser=null;
 const base="http://127.0.0.1:"+port;
 try{
  let ready=false;
  for(let i=0;i<200;i++){
   try{const r=await fetch(base+"/graphs");if(r.ok){ready=true;break;}}
   catch{}await delay(110);
  }
  assert.ok(ready,"Original V17 could not boot: "+logs);
  browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1500,height:1050}});
  const errors=[];page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/transcend/torus-aether/ui/index.html?live=1",
    {waitUntil:"domcontentloaded",timeout:30000});
  await page.waitForFunction(()=>{
   const box=document.getElementById("fullAtlasPanel");
   const text=document.getElementById("atlasTextTotals")?.textContent||"";
   const xd=document.getElementById("atlasXdTotals")?.textContent||"";
   return box&&!box.hidden&&text.includes("Exerciții analizate")&&
     xd.includes("Lumi finite trăite")&&
     /Lumi finite trăite [1-9]/.test(xd);
  },null,{timeout:65000});
  assert.equal(await page.locator("#tabTrain").getAttribute("class"),"on");
  assert.equal(await page.locator("#fullAtlasPanel").isVisible(),true);
  assert.equal(await page.locator("#textMazeBox").isVisible(),true);
  assert.equal(await page.locator("#g").isVisible(),true);
  assert.equal(await page.locator("#hypermazeBox").isVisible(),true);
  assert.match(await page.locator("#atlasXdMissing").textContent(),
    /CONEXIUNI COMPLETE FIZICE: [1-9]/);
  assert.match(await page.locator("#atlasTextReason").textContent(),
    /Prima divergență:/);
  const sampled=await page.locator("#atlasXdCanvas").evaluate(cv=>{
    const d=cv.getContext("2d").getImageData(0,0,cv.width,cv.height).data;
    let gold=0,blue=0,notBackground=0;
    for(let i=0;i<d.length;i+=4){
      if(d[i]>160&&d[i+1]>100&&d[i+2]<140)gold++;
      if(d[i]<145&&d[i+1]>130&&d[i+2]>160)blue++;
      if(d[i]!==7||d[i+1]!==18||d[i+2]!==30)notBackground++;
    }
    return {gold,blue,notBackground};
  });
  assert.ok(sampled.notBackground>1000,"Full finite 128-world rendering blank");
  assert.ok(sampled.gold>20,"Planned before action path not drawn");
  await page.locator("#atlasXdPause").click();
  // The original UI is auto-playing before Chromium clicks Pause: the
  // animation can already be at step 1, 2 or 7. Explicitly scrub to zero
  // before asserting the effect of the NEXT ONE real action.
  await page.locator("#atlasXdScrub").evaluate(el=>{
    el.value="0";el.dispatchEvent(new Event("input",{bubbles:true}));
  });
  await page.locator("#atlasXdForward").click();
  assert.match(await page.locator("#atlasXdStep").textContent(),/Acțiune [1-7]\/7/, "A real original finite xD action must be visible, even if live trainer updates it concurrently");
  await page.locator("#atlasScale").selectOption("1");
  await page.waitForFunction(()=>
    (document.getElementById("atlasPageText")?.textContent||"").includes("Scara 2"),
    null,{timeout:20000});
  // Switch from context-prefix graph to the actual OBSERVED single-edit
  // transformation atlas. A page may legitimately be empty if the corpus
  // has no compatible minimal edit witnesses; that must be explicit.
  await page.locator("#atlasScale").selectOption("edits");
  await page.waitForFunction(()=>
    (document.getElementById("atlasPageText")?.textContent||"").includes("ORIGINAL V17"),
    null,{timeout:20000});
  assert.match(await page.locator("#atlasPageText").textContent(),
    /editări învățate/);
  await page.locator("#atlasGatedStart").fill("the moon is bright");
  await page.locator("#atlasGatedGoal").fill("moon,bright");
  await page.locator("#atlasGatedGo").click();
  await page.waitForFunction(()=>
    /STRICT original:/.test(document.getElementById("atlasGatedResult")?.textContent||""),
    null,{timeout:20000});
  assert.equal(await page.locator("#atlasGatedCanvas").isVisible(),true);
  assert.equal(await page.locator("#atlasFutureContext").isVisible(),true);
  await page.locator("#atlasFutureContext").fill("hope");
  await page.locator("#atlasFutureProbe").click();
  // This acceptance page runs original V17 WITHOUT CUDA: a REAL error
  // must be shown, not a fabricated GPU answer from nonexistent memory.
  await page.waitForFunction(()=>
    (document.getElementById("atlasFutureResult")?.textContent||"").includes("Nu pot citi memoria VRAM viitoare"),
    null,{timeout:20000});
  assert.match(await page.locator("#atlasFutureResult").textContent(),
    /CUDA pool inactive|Native GPU process unavailable/);
  await page.locator("#atlasLogMore").click();
  await page.waitForFunction(()=>
    (document.getElementById("atlasLogText")?.textContent||"").includes("byte cursor="),
    null,{timeout:20000});
  await page.locator("#atlasTextFrozenEval").click();
  await page.waitForFunction(()=>
    /TEXT NEVĂZUT, GRAF V17 ÎNGHEȚAT|Evaluarea nativă a eșuat/.test(
      document.getElementById("atlasTextFrozenResult")?.textContent||""),
    null,{timeout:50000});
  assert.match(await page.locator("#atlasTextFrozenResult").textContent(),
    /TEXT NEVĂZUT, GRAF V17 ÎNGHEȚAT/);
  await page.locator("#atlasXdEval").click();
  await page.waitForFunction(()=>
    /TEST ÎNGHEȚAT, fără intervenții/.test(
      document.getElementById("atlasXdEvalText")?.textContent||""),
    null,{timeout:20000});
  assert.match(await page.locator("#atlasXdEvalText").textContent(),
    /TEST ÎNGHEȚAT, fără intervenții/);
  assert.deepEqual(errors,[],"Original browser JS errors: "+errors.join(", "));
  console.log("REAL_ORIGINAL_BROWSER_COMPLETE_XD_ATLAS",JSON.stringify({
    realCorpus:path.basename(corpus),originalGraph:true,originalTextMaze:true,
    fullFiniteWorldVisible:true,nativeTextFailuresVisible:true,
    realGraphPagesAccessible:true,realEpisodeJournalAccessible:true,
    unseenTextFrozenTest:true,unseenXDActionTest:true,
    worldPixels:sampled,jsErrors:errors
  }));
 }catch(err){throw Error(err.message+"\nORIGINAL TRAINER LOGS:\n"+logs);}
 finally{
  if(browser)await browser.close();
  try{process.kill(-child.pid,"SIGTERM");}catch{child.kill("SIGTERM");}
  await Promise.race([new Promise(ok=>child.once("exit",ok)),delay(2200)]);
  fs.rmSync(dir,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 }
});
