// End-to-end acceptance: ORIGINAL V17 devour server + REAL worker training
// six observed non-fabricated text/maze/transform experiences, new magical
// page, native snapshots, user controls, before-answer paths and old UI.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const freePort=()=>new Promise((ok,no)=>{
 const srv=net.createServer();srv.once("error",no);
 srv.listen(0,"127.0.0.1",()=>{const p=srv.address().port;srv.close(()=>ok(p));});
});
test("native V17 actually trains and serves living MAGIC UI plus original V17 5D interface",{
 timeout:120000
},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-native-live-"));
 const data=path.join(tmp,"observed-text.txt"),out=path.join(tmp,"runtime");
 fs.writeFileSync(data,[
  "Q: How does she feel?\nA: She is happy.",
  "Q: How does she feel?\nA: She is tired.",
  "Q: How does she feel?\nA: She is calm.",
  "Q: How does he feel?\nA: He is happy.",
  "Q: How does she feel?\nA: She is very happy.",
  "Q: How does he feel?\nA: He is very calm.",
  "Q: Observe a transformation.\nA: 2 * 3 = 6\n3 * 3 = 9",
  "Q: Observe a transformation.\nA: 2 * 4 = 8\n3 * 4 = 12",
  "Q: Observe a transformation.\nA: 3 * 3 = 9\n4 * 3 = 12",
  "Q: Observe a transformation.\nA: 3 * 4 = 12\n4 * 4 = 16",
  "Q: Observe a transformation.\nA: 2 * 3 = 6\n2 * 4 = 8",
  "Q: Observe a transformation.\nA: 3 * 3 = 9\n3 * 4 = 12",
  "Q: Observe a transformation.\nA: 4 * 3 = 12\n4 * 4 = 16",
  "Q: Observe a transformation.\nA: 2 * 5 = 10\n3 * 5 = 15",
  "Q: Observe a transformation.\nA: 3 * 5 = 15\n4 * 5 = 20"
 ].join("\n\n")+"\n","utf8");
 const port=await freePort(),url="http://127.0.0.1:"+port;
 const child=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","text,maze,transform",
  "--text",data,"--out",out,"--port",String(port),"--gpu","off",
  "--mem","2","--every","5000","--maze-every","50000",
  "--start","--magic-view","--math-axes","--trace-transformations"
 ],{cwd:root,detached:true,stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const ch of [child.stdout,child.stderr])ch.on("data",s=>logs=(logs+String(s)).slice(-14000));
 try{
  let status=null;for(let i=0;i<140;i++){
   try{const r=await fetch(url+"/graphs");if(r.ok){status=await r.json();break;}}catch{}
   await sleep(100);
  }
  assert.ok(status,"The REAL V17 server did not bind: "+logs);
  assert.equal(status.graphs.length,1);
  assert.deepEqual(status.graphs[0].worlds,["text","maze","transform"]);
  const rootResponse=await fetch(url+"/",{redirect:"manual"});
  assert.equal(rootResponse.status,302);
  assert.equal(rootResponse.headers.get("location"),
   "/transcend/torus-aether/ui/magic.html?live=1");
  const direct=await fetch(url+"/magic",{redirect:"manual"});
  assert.equal(direct.status,302);
  assert.match(direct.headers.get("location"),/magic\.html/);
  const htmlResponse=await fetch(url+"/transcend/torus-aether/ui/magic.html?live=1");
  assert.equal(htmlResponse.status,200);
  assert.match(htmlResponse.headers.get("content-type"),/text\/html/);
  const html=await htmlResponse.text();
  for(const id of ["field","paths","chart","mChars","mTokens","mStates","mOps",
   "mAccuracy","worker","start","pause","save","noise","applyNoise",
   "autoProbe","probe","ops","stream","gpu","pathStep","axisX","axisY","axisZ"])
   assert.ok(html.includes('id="'+id+'"'),"Missing real MAGIC UI control: "+id);
  const js=await fetch(url+"/transcend/torus-aether/ui/magic.js");
  assert.equal(js.status,200);
  const code=await js.text();
  assert.match(code,/\/graphs/);assert.match(code,/\/graph\?w=/);
  assert.match(code,/\/telemetry\?w=/);assert.match(code,/\/language-maze\?w=/);
  assert.doesNotMatch(code,/setInterval\(\s*fake|mockGraph|demoWorld|Math\.random\(\)/);
  const original=await(await fetch(url+"/transcend/torus-aether/ui/index.html?live=1")).text();
  for(const id of ["g","languageMazeCv","textMazeBox","textMazeCv","tabTrain","tabLanguageMaze"])
   assert.ok(original.includes('id="'+id+'"'),"Old V17 UI control has been removed: "+id);
  // Original user controls must really be connected, not UI-only dummy buttons.
  const noise=await(await fetch(url+"/controls?w=0&gnoise=4",{method:"POST"})).json();
  assert.equal(noise.ok,true);assert.equal(noise.applied.gnoise,4);
  let trained=null,episode=null;
  for(let i=0;i<220;i++){
   try{
    const g=await fetch(url+"/graph?w=0");
    if(g.ok){
     const snap=await g.json();
     if(snap.chars>100&&Array.isArray(snap.nodes)&&snap.nodes.length&&snap.U?.length){
      trained=snap;
      if(snap.textMaze?.ready&&snap.textMaze?.frames?.length>1){episode=snap.textMaze;break;}
     }
    }
   }catch{}
   await sleep(120);
  }
  assert.ok(trained,"No nonempty LIVE ORIGINAL GraphTrace after training: "+logs);
  assert.ok(trained.chars>100);
  assert.ok(trained.U.length>0,"No native learned toroidal geometry");
  assert.ok(trained.edges.length>0,"No actual learned edges");
  assert.ok(trained.language?.observedTokens>0,"Real language model did not train");
  assert.ok(trained.observedTransformations?.observed>0,"Real text differences not learned");
  assert.ok(episode,"No native before-current-answer text maze predicted shape: "+
   JSON.stringify(trained?.textMaze)+"; "+logs);
  assert.equal(episode.oracleAnswerUsed,false);
  assert.equal(episode.trainReferenceProvided,false);
  assert.equal(episode.source,"original-six-scale-text-learner");
  assert.ok(episode.globalPrediction.length>0);
  assert.equal(episode.frames[0].stage,"before-first-action");
  assert.equal(episode.initialShape.at(-1),episode.globalPrediction);
  const telemetry=await(await fetch(url+"/telemetry?w=0&after=0")).json();
  assert.ok(telemetry.points.length>0,"Native sample telemetry missing");
  const graphs=await(await fetch(url+"/graphs")).json();
  assert.ok(graphs.graphs[0].chars>100);
  assert.ok(graphs.graphs[0].language.observedTokens>0);
  let learnedMath=null;
  for(let i=0;i<140;i++){
   const response=await fetch(url+"/graph?w=0");
   if(response.ok){
    const graph=await response.json();
    if(graph.realMathAxes?.coupledPairs>=5 && graph.realMathAxes.stateDependentPairs>=5){
     learnedMath=graph.realMathAxes;break;
    }
   }
   await sleep(120);
  }
  assert.ok(learnedMath,"Original native worker failed to absorb observed math lines: "+logs);
  const planned=await (await fetch(url+"/real-math-plan?w=0&start="+encodeURIComponent("5 * 6 = 30")+
   "&index=0&value=6",{method:"POST"})).json();
  assert.equal(planned.frozen,true,JSON.stringify(planned));
  assert.equal(planned.referenceAnswerProvided,false);
  assert.ok(planned.plan?.states?.length>=2,JSON.stringify(planned));
  const checkpoint=path.join(out,"brains","brain-0-stable+many.v8.observed-math-axes.v8");
  let saved=false;
  for(let i=0;i<90;i++){
   if(fs.existsSync(checkpoint)&&fs.statSync(checkpoint).size>50){saved=true;break;}
   await sleep(80);
  }
  assert.ok(saved,"Observed math axes were not persisted next to real native Brain checkpoint");
  // Browser smoke: only if Chrome is already available; never silently
  // claim visual verification if not installed in this runner.
  const chromeNames=["google-chrome","chromium","chromium-browser"];
  const browser=chromeNames.find(name=>spawnSync("which",[name],{encoding:"utf8"}).status===0);
  if(browser){
   const result=spawnSync(browser,[
    "--headless","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--dump-dom","--virtual-time-budget=3500",
    url+"/transcend/torus-aether/ui/magic.html?live=1"
   ],{encoding:"utf8",timeout:20000,maxBuffer:10*1024*1024});
   assert.equal(result.status,0,"Chromium runtime failed to render magic UI: "+result.stderr?.slice(-2500));
   assert.match(result.stdout, /id="mChars"/);
   assert.match(result.stdout,/Where the solution takes shape/);
   const connected=/data-magic-connected="true"/.test(result.stdout);
   const observed=+(result.stdout.match(/data-magic-observed-chars="(\d+)"/)?.[1]||0);
   console.log("REAL_HEADLESS_BROWSER_MAGIC_UI",JSON.stringify({browser,rendered:true,connected,observed}));
   assert.ok(connected&&observed>0,"The Chromium DOM must reflect an actual live /graph snapshot, not only static HTML");
  }else console.log("BROWSER_NOT_INSTALLED: HTTP and native training were still verified");
  console.log("REAL_NATIVE_MAGIC_TRAINING_ACCEPTANCE",JSON.stringify({
   port,originalControlsPreserved:true,magicUIAccessible:true,graphLive:true,
   chars:trained.chars,nodes:trained.nodes.length,edges:trained.edges.length,
   learned5D:trained.U.length,observedTextTokens:trained.language.observedTokens,
   operators:trained.observedTransformations.learnedOperators,
   pathModelRows:episode.modelRowsBeforeNewObservation,bodyFrames:episode.frames.length,
   globalPath:episode.globalPrediction.slice(0,60),telemetry:telemetry.points.length,
   actualNumericPairs:learnedMath.coupledPairs,actualNumericTransforms:learnedMath.stateDependentPairs,
   frozenMathPath:planned.plan.states,mathCheckpoint:true,
   cuda:false,reason:"CI has no NVIDIA GPU; original CUDA launcher still performs device self-tests on user machine"
  }));
 }finally{
  try{process.kill(-child.pid,"SIGTERM");}catch{try{child.kill("SIGTERM");}catch{}}
  await sleep(240);fs.rmSync(tmp,{recursive:true,force:true});
 }
});
test("magical UI source is only an extra live view, not a replacement for original production files",()=>{
 const html=fs.readFileSync(path.join(root,"transcend/torus-aether/ui/magic.html"),"utf8");
 const js=fs.readFileSync(path.join(root,"transcend/torus-aether/ui/magic.js"),"utf8");
 const launcher=fs.readFileSync(path.join(root,"START_MAGIC_REAL.ps1"),"utf8");
 const start=fs.readFileSync(path.join(root,"START_V17.ps1"),"utf8");
 assert.match(html,/canvas id="field"/);assert.match(html,/canvas id="paths"/);
 assert.match(js,/shape/i);assert.match(js,/snapshot|state\.graph/);
 assert.match(launcher,/Gpu=\$Gpu/);assert.match(launcher,/MagicUI=\$true/);
 assert.match(launcher,/Resume=\$true/);assert.match(start,/\[switch\]\$MagicUI/);
 assert.ok(!js.includes("Math.random("),"There are no simulated path/node transitions");
});
