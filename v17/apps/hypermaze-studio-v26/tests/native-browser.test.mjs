// REAL Chrome/Chromium rendering of the V26 DESIGN with V17 metric bindings.
// Only upstream transport is a fixed original-V17 API fixture; Chrome, JS,
// canvas, HTTP fetch, controls, text Q/A diff are fully executable.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import {spawn,spawnSync} from "node:child_process";
import {createNativeBridge} from "../native-bridge.mjs";
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const browserBinary=()=>{
  for(const name of ["google-chrome","google-chrome-stable","chromium","chromium-browser"]){
    const r=spawnSync("which",[name],{encoding:"utf8"});
    if(r.status===0)return r.stdout.trim();
  }
  throw Error("Chromium binary unavailable");
};
const open=async server=>new Promise(ok=>server.listen(0,"127.0.0.1",ok));
const close=async server=>new Promise(ok=>server.close(ok));
class CDP{
  constructor(socket){
    this.socket=socket;this.nextId=0;this.pending=new Map();this.errors=[];
    socket.addEventListener("message",e=>{
      const msg=JSON.parse(e.data);
      if(msg.method==="Runtime.exceptionThrown")
        this.errors.push(msg.params?.exceptionDetails?.text||"JS runtime exception");
      const p=this.pending.get(msg.id);
      if(p){this.pending.delete(msg.id);
        if(msg.error)p.reject(Error(msg.error.message));else p.resolve(msg.result||{});}
    });
  }
  send(method,params={}){
    return new Promise((resolve,reject)=>{
      const id=++this.nextId,t=setTimeout(()=>{
        this.pending.delete(id);reject(Error("CDP timeout: "+method));
      },15000);
      this.pending.set(id,{resolve:r=>{clearTimeout(t);resolve(r)},
        reject:e=>{clearTimeout(t);reject(e)}});
      this.socket.send(JSON.stringify({id,method,params}));
    });
  }
  async eval(expression){
    const r=await this.send("Runtime.evaluate",{
      expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error("Browser evaluation threw: "+
      JSON.stringify(r.exceptionDetails).slice(0,700));
    return r.result?.value;
  }
}
test("real browser V26 design displays exact V17 native metrics and visible correct/wrong Q/A",{
  timeout:105000
},async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"v28-browser-"));
 let upstream=null,bridge=null,browser=null,socket=null,err="";
 const calls=[];
 try{
   upstream=http.createServer(async(req,res)=>{
     const u=new URL(req.url,"http://localhost");
     let body="";
     for await(const ch of req)body+=ch.toString();
     calls.push({method:req.method,url:u.pathname,query:u.search,body});
     res.setHeader("content-type","application/json");
     if(u.pathname==="/graphs")return res.end(JSON.stringify({
       world:"D:\\training\\OpenThoughts3-1.2M",worlds:["text","maze"],
       corpus:{kind:"parquet",totalRows:1210000,trainRows:1209984,heldOut:16},
       gpu:{device:"cuda:0"},graphs:[{w:0,arm:"winner",status:"antrenează",
         worlds:["text","maze"],chars:1600000,
         progress:{trained:4,total:1209984,heldOut:16,remaining:1209980,mode:"native-text"},
         test:{n:4000,aligned:.642,live:.617,together:.581,C:.594,field:.551},
         maze:{played:512,test:{shape:1,solved:1,ratio:1}},
         gpu:{settings:{device:"cuda:0"},
           info:{device:"cuda:0",totalGB:4.29,vramGB:3.72,
             freeBeforeGB:4.02,safeHeadroomGB:.30},
           text:{vramUsedGB:2.40,vramReservedGB:2.60,
             vramCurrentAllocatedGB:1.90,vramFreeGB:1.10,
             vramBudgetGB:3.72,realVramPeakFraction:.699,
             cudaChunkUsed:8192,nextCudaChunk:16384,
             hostMs:{sustainedExercisesPerSecond:11.48,
               sustainedCharactersPerSecond:98765}}}}]
     }));
     if(u.pathname==="/graph")return res.end(JSON.stringify({
       w:0,nodes:[["a","symbol","a",2,0,0],["b","symbol","b",3,0,0],
         ["c","perspective","c",4,0,0]],
       edges:[["a","b","follows",1],["b","c","align",.8]],
       U:[["a",[0.1,.2,.3,.4,.5]],["b",[.4,.3,.2,.1,.6]],["c",[.3,.8,.2,.4,.7]]],
       flow:[["a","b"]],
       shared:{training:{step:123,preUpdatePredictionLoss:.348,
         identityBaselineLoss:.721,
         trace:{before:[0,.1],predicted:[.1,.2],observed:[.1,.1]}}}
     }));
     if(u.pathname==="/eval"&&JSON.parse(body).kind==="maze"){
       const wall=Array(49).fill(0);
       const p=[0,1,2,3,4,5,6,13,20,27,34,41,48];
       return res.end(JSON.stringify({w:0,mazes:[{
         n:7,start:0,goal:48,wall,path:p,
         shapes:[[1,1,1,1,1,1,2,2,2,2,2,2]],steps:12,optimal:12,
         solved:true,first:1
       }]}));
     }
     if(u.pathname==="/eval")return res.end(JSON.stringify({
       w:0,T:.4,noise:0,answer:.625,all:.7,oldAnswer:.55,
       exercises:[{n:6,a0:2,answer:.625,all:.7,shape:"BCDE",
         shapeSame:.5,rows:[[65,65],[66,67],[67,67],[68,69],[69,69],[70,70]]}]
     }));
     if(["/control","/controls","/gpu"].includes(u.pathname))
       return res.end(JSON.stringify({ok:true}));
     res.statusCode=404;res.end(JSON.stringify({error:"Not found"}));
   });
   await open(upstream);
   bridge=await createNativeBridge({port:0,nativePort:upstream.address().port,inspectCuda:async()=>({ok:true,python:'test-only-fixture'})});
   const base=bridge.url;
   const chromeDir=path.join(dir,"chrome");
   await fs.mkdir(chromeDir,{recursive:true});
   browser=spawn(browserBinary(),[
     "--headless=new","--no-sandbox","--disable-dev-shm-usage",
     "--disable-gpu","--no-first-run","--no-default-browser-check",
     "--remote-allow-origins=*","--window-size=1550,980",
     "--user-data-dir="+chromeDir,"--remote-debugging-port=0","about:blank"
   ],{stdio:["ignore","ignore","pipe"]});
   browser.stderr.on("data",data=>err=(err+data.toString()).slice(-5000));
   let port=null;
   for(let i=0;i<180;i++){
     if(browser.exitCode!==null||browser.signalCode!==null)break;
     try{
       const txt=await fs.readFile(path.join(chromeDir,"DevToolsActivePort"),"utf8");
       port=Number(txt.split("\n")[0]);break;
     }catch{await sleep(100)}
   }
   assert.ok(port>0,"Chrome failed to initialize: "+err);
   const pageResponse=await fetch("http://127.0.0.1:"+port+"/json/new?"+
     encodeURIComponent(base),{method:"PUT"});
   assert.equal(pageResponse.status,200);
   const page=await pageResponse.json();
   socket=new WebSocket(page.webSocketDebuggerUrl);
   await new Promise((resolve,reject)=>{
     socket.addEventListener("open",resolve,{once:true});
     socket.addEventListener("error",reject,{once:true});
   });
   const c=new CDP(socket);
   await c.send("Page.enable");await c.send("Runtime.enable");
   await c.send("Page.navigate",{url:base});
   let ready=false;
   for(let i=0;i<100;i++){
     const state=await c.eval("({loaded:document.readyState==='complete',"+
       "score:document.querySelector('#mAccuracy')?.textContent,"+
       "canvas:document.querySelector('#graphCanvas')?.width||0})");
     if(state.loaded&&state.score==="64.2%"&&state.canvas>100){ready=true;break;}
     await sleep(100);
   }
   assert.equal(ready,true,"V26 browser UI did not display original ALIGNED score");
   const before=await c.eval("({aligned:document.querySelector('#mAccuracy').textContent,"+
     "live:document.querySelector('#mLearned').textContent,"+
     "throughput:document.querySelector('#mThroughput').textContent,"+
     "nodes:document.querySelector('#mStates').textContent,"+
     "progress:document.querySelector('#mWorlds').textContent,"+
     "source:document.querySelector('#datasetInfo').textContent,"+
     "connected:document.querySelector('#connection').classList.contains('connected')})");
   assert.equal(before.aligned,"64.2%");
   assert.equal(before.live,"61.7%");
   assert.match(before.throughput,/11,48/);
   assert.equal(before.nodes,"3");
   assert.equal(before.progress,"4");
   assert.match(before.source,/OpenThoughts3-1.2M/);
   assert.equal(before.connected,true);
   const progressUI=await c.eval("({state:document.querySelector('#nativeTrainingState').textContent,"+
     "pct:document.querySelector('#nativeProgressPct').textContent,"+
     "counts:document.querySelector('#nativeProgressCounts').textContent,"+
     "color:document.querySelector('#nativeProgressFill').style.width,"+
     "fatal:document.querySelector('#nativeFatal').hidden})");
   assert.equal(progressUI.state,"WORKER ACTIV");
   assert.equal(progressUI.pct,"0.0003%");
   assert.match(progressUI.counts,/4 \/ 1\.209\.984/);
   assert.equal(progressUI.fatal,true);
   assert.ok(parseFloat(progressUI.color)>0,"Actual original training progress must be drawn");
   const cudaReality=await c.eval("({used:document.querySelector('#v32GpuUsed').textContent,"+
     "budget:document.querySelector('#v32GpuBudget').textContent,"+
     "free:document.querySelector('#v32GpuFree').textContent,"+
     "chunk:document.querySelector('#v32GpuMicrochunk').textContent,"+
     "usage:document.querySelector('#v32GpuUsageFill').style.width})");
   assert.match(cudaReality.used,/2,600 GB/);
   assert.match(cudaReality.budget,/3,720 GB/);
   assert.match(cudaReality.free,/1,100 GB/);
   assert.match(cudaReality.chunk,/8\.192/);
   assert.ok(Math.abs(parseFloat(cudaReality.usage)-2.6/3.72*100)<0.1);


   const nativeGeometry=await c.eval("({history:document.querySelector('#nativeHistoryCanvas').width, "+
     "status:document.querySelector('#nativeHistoryInfo').textContent, "+
     "gpu:document.querySelector('#nativeGpuDevice').value})");
   assert.ok(nativeGeometry.history>200);
   assert.match(nativeGeometry.status,/ORIGINAL V17/);
   assert.equal(nativeGeometry.gpu,"cuda:0");
   await c.eval("document.querySelector('#nativeGpuApply').click()");
   await sleep(170);
   assert.ok(calls.some(x=>x.url==="/gpu"&&x.query.includes("device=cuda%3A0")),
     "Original GPU control should not be cosmetic");
   await c.eval("document.querySelector('#evalBtn').click()");
   let accurate=false;
   for(let i=0;i<90;i++){
     const r=await c.eval("({result:document.querySelector('#nativeFrozenStatus').textContent,"+
       "spans:document.querySelector('#textActual').querySelectorAll('span').length,"+
       "wrong:document.querySelector('#textActual').innerHTML.includes('#ff7994')})");
     if(r.spans>=6&&r.wrong){accurate=true;break;}
     await sleep(100);
   }
   assert.equal(accurate,true,"Frozen original Q/A must render actual wrong vs correct characters");
   await c.eval("document.querySelector('#nativeKind').value='maze';document.querySelector('#evalBtn').click()");
   let mazeVisible=false;
   for(let i=0;i<65;i++){
     mazeVisible=await c.eval("!document.querySelector('#nativeMazeBox').hidden");
     if(mazeVisible)break;await sleep(100);
   }
   assert.equal(mazeVisible,true,"Original maze first-shape overlay must be available");
   await c.eval("document.querySelector('#pauseBtn').click()");
   await sleep(170);
   assert.ok(calls.some(x=>x.url==="/control"&&x.query.includes("do=pause")));
   const screenshot=await c.send("Page.captureScreenshot",{
     format:"png",captureBeyondViewport:false});
   assert.ok(screenshot.data?.length>10000);
   await fs.writeFile("v28-native-ui-real-chrome.png",
     Buffer.from(screenshot.data,"base64"));
   assert.deepEqual(c.errors,[],"Browser JS exceptions must be absent");
   console.log("V28_NATIVE_CHROME_UI",JSON.stringify({
     originalAligned:before.aligned,originalLive:before.live,
     originalSustainedThroughput:before.throughput,
     actualCorpusName:true,originalGraphNodes:before.nodes,
     originalFrozenTextQACorrectWrongShown:true,
     originalMazeInitialShapeOverlay:true,nativeGpuSettingsForwarded:true,
     nativeMetricsHistory:true,
     originalPauseForwarded:true,screenshot:"v28-native-ui-real-chrome.png",
     browserExceptions:0}));
 }finally{
   try{socket?.close()}catch{}
   if(browser&&browser.exitCode===null&&browser.signalCode===null){
     const closed=new Promise(ok=>browser.once("close",ok));
     browser.kill("SIGTERM");
     await Promise.race([closed,sleep(2000)]);
     if(browser.exitCode===null&&browser.signalCode===null)browser.kill("SIGKILL");
   }
   if(bridge)await bridge.close();
   if(upstream)await close(upstream);
   await fs.rm(dir,{recursive:true,force:true,maxRetries:12,retryDelay:300});
 }
});
