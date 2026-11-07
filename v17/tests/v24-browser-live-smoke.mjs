// Real Chromium page-level smoke test for the actual V24 dashboard.
// Run in Linux CI after "npm install --no-save playwright-core".
// It tests the browser, not a DOM mock: visible graph, paths, 16D controls,
// atlas, predicted-vs-actual text, offline V17 handling, and no JS exceptions.
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {chromium} from "playwright-core";
import {openRealSource} from "../research/relational-hypermaze/real-data-source.mjs";
import {RealTrainer,makeHTTP} from "../research/relational-hypermaze/real-trainer.mjs";

const exes=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium","/usr/bin/chromium-browser"];
const browserPath=exes.find(x=>fs.existsSync(x));
if(!browserPath)throw Error("Real Chrome/Chromium executable is required for UI acceptance");
const root=await fsp.mkdtemp(path.join(os.tmpdir(),"mp-v24-browser-"));
let server=null,browser=null;
try{
 const jsonl=path.join(root,"training.jsonl");
 const rows=Array.from({length:27},(_,i)=>({
  prompt:"What observed transformation allows auroras to occur in state "+i+"?",
  answer:"Experienced state "+i+": charged particles excite atmospheric molecules to give light."
 }));
 await fsp.writeFile(jsonl,rows.map(r=>JSON.stringify(r)).join("\n")+"\n");
 const source=await openRealSource({jsonl,held:3});
 const trainer=await new RealTrainer({source,out:path.join(root,"runtime"),
   maxRecords:40,saveEvery:6,onlineEvery:1}).initialize();
 server=await makeHTTP(trainer,{port:0});
 trainer.start();await trainer.loop;
 assert.equal(trainer.mode,"finished");
 browser=await chromium.launch({executablePath:browserPath,headless:true,
  args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:1440,height:950}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 const base="http://127.0.0.1:"+server.address().port;
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.getElementById("rows")?.textContent.includes("24"),{timeout:10000});
 assert.equal(await page.locator("#oldPane").isVisible(),false,
  "missing original V17 must never replace the new graph with Firefox error");
 assert.equal(await page.locator("#axisX option").count(),16);
 assert.equal(await page.locator("#traceChoice option").count()>1,true);
 assert.equal(await page.locator("#paths").isVisible(),true);
 assert.equal(await page.locator("#newPane > section").first().locator("#paths").count(),1,
  "actual graph must appear ABOVE all statistics");
 assert.match(await page.locator("#scored").textContent(),/\d+/);
 assert.match(await page.locator("#actualAnswer").textContent(),/PREZIS ÎNAINTE DE ANTRENARE/);
 await page.locator("#showAtlas").click();
 await page.waitForFunction(()=>document.getElementById("shapeMeta")?.textContent.includes("ATLAS OBSERVAT"));
 assert.ok(await page.locator("#paths circle").count()>10,"genuine recorded atlas should have nodes");
 await page.locator("#paths circle").first().click({force:true});
 assert.match(await page.locator("#axisDetail").textContent(),/axes/);
 await page.locator("#axisX").selectOption("2");
 await page.locator("#axisY").selectOption("6");
 await page.locator("#axisZ").selectOption("14");
 await page.locator("#axisW").selectOption("15");
 await page.locator("#rotationXY").fill("45");
 await page.locator("#rotationZW").fill("-30");
 await page.locator("#sliceW").fill("0.3");
 assert.ok(await page.locator("#paths circle").count()>10);
 await page.locator("#showPredictedRoute").click();
 await page.waitForFunction(()=>document.getElementById("shapeMeta")?.textContent.includes("PLAYBACK AL PREDICȚIEI"),{timeout:10000});
 assert.ok(await page.locator("#paths circle").count()>0,"frozen real path must render");
 const traceChoice=page.locator("#traceChoice");
 const options=await traceChoice.locator("option").all();
 assert.ok(options.length>1);
 await traceChoice.selectOption({index:1});
 await page.waitForTimeout(350);
 assert.match(await page.locator("#actualAnswer").textContent(),/RĂSPUNS REAL FOLOSIT EXCLUSIV LA SCORARE/);
 assert.equal(errors.length,0,"No browser JavaScript exception: "+errors.join(" / "));
 const out={check:"V24_REAL_BROWSER_LIVE_PASS",nativeBrowser:browserPath,
   actualTrainRows:trainer.progress.cursor,
   sampledPreActionPredictions:trainer.progress.onlineScored,
   originalV17OfflineHidden:true,axes:16,atlasNodes:await page.locator("#paths circle").count(),
   graphFirst:true,historySelection:true,consolePageErrors:errors.length};
 console.log(JSON.stringify(out));
}finally{
 if(browser)await browser.close();
 if(server)await new Promise(ok=>server.close(ok));
 await fsp.rm(root,{recursive:true,force:true});
}
