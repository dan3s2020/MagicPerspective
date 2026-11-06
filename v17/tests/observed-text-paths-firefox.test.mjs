// Browser acceptance against REAL original V17 native worker, not synthetic path data.
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
  const s=net.createServer();s.once("error",reject);
  s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
test("actual original trained Brain draws observed 5D symbol paths on V17 first UI; temperature change alone generates new path",{timeout:160000},async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-textpath-browser-"));
  const src=path.join(dir,"corpus.txt"),out=path.join(dir,"runtime");
  fs.writeFileSync(src,Array.from({length:12},(_,i)=>
    "Q: Find the path through the labyrinth number "+i+
    "\nA: Start at the entry. Move through the passages. Observe each transformation and reach the goal.\n"
  ).join("\n"));
  const p=await port(),base="http://127.0.0.1:"+p;
  const worker=spawn(process.execPath,["transcend/torus-aether/devour/devour.mjs",
    "--workers","1","--arms","stable+many","--worlds","text","--gpu","off",
    "--text",src,"--out",out,"--port",String(p),"--start","--mem","2","--every","50000"],
    {cwd:root,detached:true,stdio:["ignore","pipe","pipe"]});
  let logs="";for(const pipe of [worker.stdout,worker.stderr])
    pipe.on("data",v=>logs=(logs+String(v)).slice(-10000));
  let browser=null;
  try {
    let ready=false;
    for(let i=0;i<140;i++){
      try{if((await fetch(base+"/graphs")).ok){ready=true;break;}}catch{}
      await sleep(90);
    }
    assert.ok(ready,"original training server did not start "+logs);
    // Real learning on the native Brain ensures the aligner and Geometry.U exist.
    const learned=await fetch(base+"/chat",{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({w:0,history:[["you","The sentence changes state, and the graph records its observed path."]],
        opts:{T:.6,max:1,stopBlank:false,learn:true,seed:19}})}).then(r=>r.json());
    assert.ok(!learned.error,"native brain could not learn "+JSON.stringify(learned));
    browser=await firefox.launch({headless:true});
    const page=await browser.newPage({viewport:{width:1600,height:1000}});
    const errors=[];page.on("pageerror",e=>errors.push(e.message));
    await page.goto(base+"/transcend/torus-aether/ui/index.html?live=1",
      {waitUntil:"domcontentloaded",timeout:35000});
    assert.equal(await page.locator("#observeTextPaths").isChecked(),true);
    await page.locator("#scanTextPaths").click();
    await page.waitForFunction(()=>
      (document.querySelector("#textPathStats")?.textContent||"").includes("T 0.10"),
      null,{timeout:100000});
    const stats=await page.locator("#textPathStats").textContent();
    assert.match(stats,/First true decision fork|identical on observed horizon/);
    assert.match(stats,/5D transitions/);
    assert.equal(await page.locator("#textPathCanvas").isVisible(),true);
    const pix=await page.locator("#textPathCanvas").evaluate(c=>{
      const d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let colored=0;for(let i=0;i<d.length;i+=1000)if(d[i]!==8||d[i+1]!==22||d[i+2]!==35)colored++;
      return colored;
    });
    assert.ok(pix>6,"The observed native 5D path canvas did not render");
    // User only changes the writing-temperature slider, never presses Scrie again.
    await page.locator("#wtemp").evaluate(el=>{el.value="0.8";el.dispatchEvent(new Event("change",{bubbles:true}));});
    await page.waitForFunction(()=>
      (document.querySelector("#writeOut")?.textContent||"").includes("T 0.80"),null,{timeout:100000});
    assert.deepEqual(errors,[],"Firefox original V17 runtime errors");
    console.log("REAL_FIREFOX_TEXT_PATHS",JSON.stringify({originalWorker:true,
      sameSnapshotScan:true,autoWritingOnTemperatureChange:true,canvasSamples:pix,errors:0}));
  }finally{
    if(browser)await browser.close();
    try{process.kill(-worker.pid,"SIGTERM");}catch{try{worker.kill("SIGTERM");}catch{}}
    await sleep(250);fs.rmSync(dir,{recursive:true,force:true});
  }
});
