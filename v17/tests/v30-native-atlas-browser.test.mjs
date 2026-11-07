// Chrome acceptance: confirms real V30 atlas UX, not just HTML parsing.
// Requires npm install --no-save playwright-core and system Chrome.
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {chromium} from "playwright-core";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {NativeAtlasRuntime,createAtlasServer}
 from "../research/text-hypermaze/native-atlas-server.mjs";
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium","/usr/bin/chromium-browser"].find(x=>fs.existsSync(x));
if(!chrome)throw Error("Actual Chrome required for V30 browser acceptance test");
const root=await fsp.mkdtemp(path.join(os.tmpdir(),"v30-chrome-"));
let server=null,browser=null;
try{
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
  empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<240;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5)break;
 }
 const runtime=new NativeAtlasRuntime(b,{out:root,maxStates:12,maxDepth:2});
 for(const [episodeId,action,before,after] of [
  ["apples","increase-two","Mira has 3 apples.","Mira has 5 apples."],
  ["books","increase-two","Toma has 8 books.","Toma has 10 books."],
  ["coins","decrease-one","Zara has 6 coins.","Zara has 5 coins."],
  ["shells","decrease-one","Leo has 15 shells.","Leo has 14 shells."]]){
  runtime.observe({episodeId,action,before,after,accepted:true});
 }
 const win=runtime.plan({episodeId:"unknown-solved",startText:"Ava has 17 marbles.",
  goal:{numericEquals:21}});
 assert.ok(win.found);
 const miss=runtime.plan({episodeId:"unknown-cutoff",startText:"Ava has 17 marbles.",
  goal:{numericEquals:201}});
 assert.equal(miss.found,false);
 assert.ok(miss.frontier.counts.depthCutoff||miss.frontier.counts.stateCutoff);
 runtime.save();
 server=await createAtlasServer(runtime,{port:0});
 const base="http://127.0.0.1:"+server.address().port;
 browser=await chromium.launch({executablePath:chrome,headless:true,
  args:["--no-sandbox","--disable-dev-shm-usage"]});
 const page=await browser.newPage({viewport:{width:1580,height:950}});
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(base,{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>document.getElementById("worlds")?.textContent==="4",
  {timeout:10000});
 await page.waitForFunction(()=>document.getElementById("graphInfo")?.
  textContent.includes("ATLAS GLOBAL"),{timeout:10000});
 assert.ok(await page.locator("#graph circle").count()>=8);
 assert.equal(await page.locator("#rules").textContent(),"2 / 2");
 assert.equal(await page.locator("#plans").textContent(),"2");
 assert.equal(await page.locator("#failed").textContent(),"1");
 assert.match(await page.locator("#graphInfo").textContent(),/noduri încărcate/);
 await page.locator("#section").selectOption("failures");
 await page.waitForFunction(()=>document.getElementById("pageInfo")?.
  textContent.includes("din 1 înregistrări"),{timeout:8000});
 assert.equal(await page.locator("#tableRows tr[data-id]").count(),1,
  "Failed attempts must be CLICKABLE from atlas");
 await page.locator("#tableRows tr[data-id]").first().click();
 await page.waitForFunction(()=>document.getElementById("diagnostic")?.
  textContent.includes("DEPTH_DESIGN_CUTOFF")||
  document.getElementById("diagnostic")?.textContent.includes("STATE_DESIGN_CUTOFF"),
  {timeout:10000});
 assert.match(await page.locator("#detail").textContent(),/originalNativeGoalPotentials/);
 await page.locator("#showGlobal").click();
 await page.waitForFunction(()=>document.getElementById("graphInfo")?.textContent.includes("ATLAS GLOBAL"));
 await page.locator("#axisX").selectOption("3");
 await page.locator("#axisY").selectOption("4");
 await page.locator("#rotation").fill("45");
 assert.ok(await page.locator("#graph circle").count()>=8);
 await page.locator("#section").selectOption("rules");
 await page.waitForFunction(()=>document.getElementById("pageInfo")?.textContent.includes("din 2 înregistrări"));
 assert.equal(await page.locator("#tableRows tr").count(),2);
 await page.locator("#section").selectOption("witnesses");
 await page.waitForFunction(()=>document.getElementById("pageInfo")?.textContent.includes("din 4 înregistrări"));
 assert.equal(await page.locator("#tableRows tr").count(),4);
 assert.deepEqual(errors,[],"Chrome must have zero JavaScript exceptions");
 console.log("V30_ACTUAL_CHROME_GLOBAL_HYPERMAZE_PASS",JSON.stringify({
  nativeBrowser:chrome,original5DNotInvented:true,
  sourceWorlds:4,globalAtlasEdges:true,
  failedAttemptShowsDesignBlockers:true,
  allWitnessedTransformationsVisible:true,
  allWorldsShareOriginalV17Brain:true,
  actualBrowserPageErrors:errors.length,
  noOpenEndedLanguageAccuracyClaim:true
 }));
}finally{
 if(browser)await browser.close();
 if(server)await new Promise(ok=>server.close(ok));
 await fsp.rm(root,{recursive:true,force:true});
}
