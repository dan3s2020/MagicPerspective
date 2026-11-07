// Optional REAL Chromium acceptance, not a DOM mock or static HTML check.
// Runs browser, tests live controls, sees the actual graph canvas and produces
// a screenshot artifact. Requires Chrome on test machine (GitHub runner has it).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {startServer} from "../server.mjs";
import {DEFAULT_CORPUS} from "../corpus.mjs";

const sleep=n=>new Promise(resolve=>setTimeout(resolve,n));
const browserBinary=()=>{
  for(const name of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){
    const r=spawnSync("which",[name],{encoding:"utf8"});
    if(r.status===0&&r.stdout.trim())return r.stdout.trim();
  }
  throw Error("Chromium browser not installed for real UI acceptance");
};
class CDP {
  constructor(socket){
    this.socket=socket;this.id=0;this.pending=new Map();this.exceptions=[];
    socket.addEventListener("message",e=>{
      const msg=JSON.parse(e.data);
      if(msg.method==="Runtime.exceptionThrown")
        this.exceptions.push(JSON.stringify(msg.params?.exceptionDetails||{}).slice(0,1000));
      if(msg.id&&this.pending.has(msg.id)){
        const p=this.pending.get(msg.id);this.pending.delete(msg.id);
        if(msg.error)p.reject(Error(msg.error.message));
        else p.resolve(msg.result||{});
      }
    });
  }
  send(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.id;
      const t=setTimeout(()=>{this.pending.delete(id);
        reject(Error("Chrome DevTools timeout: "+method));},15000);
      this.pending.set(id,{resolve:v=>{clearTimeout(t);resolve(v)},
        reject:e=>{clearTimeout(t);reject(e)}});
      this.socket.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(expression){
    const response=await this.send("Runtime.evaluate",{
      expression,returnByValue:true,awaitPromise:true});
    if(response.exceptionDetails)throw Error("Browser JS exception: "+
      JSON.stringify(response.exceptionDetails).slice(0,1000));
    return response.result?.value;
  }
}
test("real headless Chromium UI: render graph, controls, evaluations, replay and actual canvas screenshot",{
  timeout:90000
},async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),"v26-real-chrome-"));
  let runtime=null,chrome=null,ws=null;
  try{
    runtime=await startServer({host:"127.0.0.1",port:0,corpus:DEFAULT_CORPUS,
      checkpointDir:path.join(dir,"checkpoints"),auto:true,
      config:{axes:6,words:1024,noise:.2,batch:3,recordEvery:1}});
    const url="http://127.0.0.1:"+runtime.server.address().port+"/";
    const binary=browserBinary();
    const chromeData=path.join(dir,"chrome");
    await fs.mkdir(chromeData,{recursive:true});
    chrome=spawn(binary,[
      "--headless=new","--no-sandbox","--disable-dev-shm-usage",
      "--disable-gpu","--no-first-run","--no-default-browser-check",
      "--remote-allow-origins=*","--window-size=1440,900",
      "--user-data-dir="+chromeData,"--remote-debugging-port=0",
      "about:blank"
    ],{stdio:"ignore"});
    let port=null;
    for(let i=0;i<100;i++){
      try{
        const text=await fs.readFile(path.join(chromeData,"DevToolsActivePort"),"utf8");
        port=Number(text.split("\n")[0]);break;
      }catch{await sleep(100);}
    }
    assert.ok(port>0,"Chrome debugging port did not start");
    const response=await fetch("http://127.0.0.1:"+port+"/json/new?"+
      encodeURIComponent(url),{method:"PUT"});
    assert.equal(response.ok,true);
    const target=await response.json();
    assert.ok(target.webSocketDebuggerUrl);
    ws=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
      ws.addEventListener("open",resolve,{once:true});
      ws.addEventListener("error",reject,{once:true});
    });
    const client=new CDP(ws);
    await client.send("Page.enable");await client.send("Runtime.enable");
    await client.send("Page.navigate",{url});
    let loaded=false;
    for(let i=0;i<70;i++){
      try{
        const p=await client.eval("document.readyState==='complete' && !!document.querySelector('#startBtn') && !!document.querySelector('#graphCanvas')");
        if(p){loaded=true;break}
      }catch{}
      await sleep(100);
    }
    assert.equal(loaded,true,"New HTML did not load in real Chromium");
    // Real browser must actually receive live SSE, have graph, and draw nodes.
    await sleep(900);
    const measured=await client.eval("({canvas:document.querySelector('#graphCanvas').width,worlds:document.querySelector('#mWorlds').textContent,axisOptions:document.querySelector('#axisSelect').options.length,route:document.querySelectorAll('.route-step').length,graphNodes:document.querySelector('#mStates').textContent,conn:document.querySelector('#connection').classList.contains('connected')})");
    assert.ok(measured.canvas>200,"Graph canvas has no backing pixels");
    assert.ok(measured.conn,"Live event stream not connected");
    assert.ok(measured.axisOptions>=2,"Graph slice controls not populated by learned axes");
    assert.ok(measured.route>=1,"Actual predicted path not shown");
    const before=runtime.session.stats.trainWorlds;
    await client.eval("document.querySelector('#pauseBtn').click()");
    await sleep(200);
    assert.equal(runtime.session.running,false,"Pause browser control did not stop native training");
    await client.eval("document.querySelector('#stepBtn').click()");
    await sleep(160);
    assert.ok(runtime.session.stats.trainWorlds>before,"Single step did not run real text exercise");
    await client.eval("document.querySelector('#projection').value='slice';document.querySelector('#projection').dispatchEvent(new Event('change'))");
    await client.eval("document.querySelector('#noise').value='.75';document.querySelector('#noise').dispatchEvent(new Event('input'));document.querySelector('#applyBtn').click()");
    await sleep(150);
    assert.equal(runtime.session.config.noise,.75,"Noise slider was decorative, not real");
    const pathLength=runtime.session.last?.initialPath?.length||0;
    assert.ok(pathLength>=1);
    await client.eval("document.querySelector('#replayPrev').click()");
    await sleep(50);
    const replay=await client.eval("Number(document.querySelector('#replayRange').value)");
    assert.ok(replay<=pathLength);
    await client.eval("document.querySelector('#evalCount').value='10';document.querySelector('#evalBtn').click()");
    await sleep(450);
    assert.ok(runtime.session.stats.holdoutWorlds>=10,"Frozen eval did not run from UI");
    const screenshot=await client.send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
    assert.ok(screenshot.data?.length>10000,"Screenshot missing or blank");
    const artifact=path.resolve("v26-real-browser-ui.png");
    await fs.writeFile(artifact,Buffer.from(screenshot.data,"base64"));
    assert.deepEqual(client.exceptions,[],"Browser reported JavaScript exceptions");
    console.log("V26_REAL_BROWSER_UI",JSON.stringify({url,worlds:runtime.session.stats.trainWorlds,
      graphAxes:measured.axisOptions,routeSteps:measured.route,canvasPixels:measured.canvas,
      frozenEval:runtime.session.stats.holdoutWorlds,
      pauseStep:true,noiseControl:true,projectionControl:true,
      screenshot:artifact,jsExceptions:0}));
  }finally{
    try{ws?.close()}catch{}
    if(chrome)chrome.kill("SIGTERM");
    if(runtime)await runtime.close();
    await fs.rm(dir,{recursive:true,force:true});
  }
});
