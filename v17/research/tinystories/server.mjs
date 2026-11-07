// MagicPerspective / TinyStories Aether: independent LIVE real-data training.
// NOT the original V17 six-scale AligningGraph, maze or transformation worker.
// Uses the same vetted Python GPU protocol and a genuinely learned, GPU-owned
// 1-4-character conditional model with hashed deeper contexts.
// No fake throughput. No OpenThoughts, no generated training samples.
import http from "node:http";
import {exec} from "node:child_process";
import {Worker} from "node:worker_threads";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {GpuWorlds} from "../../transcend/torus-aether/gpu/client.mjs";
import {sourceMetadata,stories} from "./story-stream.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const argv=process.argv.slice(2),arg=(key,def=null)=>{
 const k=argv.indexOf("--"+key);return k>=0?argv[k+1]??"true":def;
},flag=key=>argv.includes("--"+key);
const positive=(value,name,min,max)=>{
 const n=Number(value);if(!Number.isInteger(n)||n<min||n>max)throw Error(name+" out of range");
 return n;
};
const now=()=>Date.now();
const rest=ms=>new Promise(ok=>setTimeout(ok,ms));
const clone=x=>JSON.parse(JSON.stringify(x));
const message=e=>String(e?.stack||e?.message||e).slice(0,3600);

export class TinyStoriesTrainer{
 constructor({train,valid,out,device="cuda:0",port=8897,batchKB=128,
  batchStories=180,saveSeconds=45,resume=true,nativeWorlds=true,
  nativeTextEvery=16,nativeTextBytes=48,nativeWorldEvery=32}){
  if(path.resolve(train)===path.resolve(valid))throw Error("Train and held-out validation must be DISTINCT files");
  this.train=path.resolve(train);this.valid=path.resolve(valid);this.out=path.resolve(out);
  this.device=device;this.port=positive(port,"port",1025,65535);
  this.batchBytes=positive(batchKB,"batch KB",4,1024)*1024;
  this.batchStories=positive(batchStories,"batch stories",1,2048);
  this.saveSeconds=positive(saveSeconds,"save seconds",2,3600);
  this.resume=resume;this.checkpoint=path.join(this.out,"tinystories-fast-v1.npz");
  this.manifest=path.join(this.out,"tinystories-manifest.json");
  this.paused=true;this.stopRequested=false;this.saveRequested=false;this.running=false;this.finished=false;
  this.model=null;this.gpu=null;this.pendingTest=false;
  this.nativeWorlds=!!nativeWorlds;this.nativeTextEvery=nativeTextEvery;
  this.nativeTextBytes=nativeTextBytes;this.nativeWorldEvery=nativeWorldEvery;
  this.native=null;this.nativeStopped=false;
  this.state={mode:"TinyStories-only",algorithm:"learned 1-4 character contexts (orders 3/4 hashed)",
   phase:"initializing",device,port:this.port,stories:0,chars:0,bytesRead:0,
   datasetSize:0,percent:0,storiesPerSecond:0,charsPerSecond:0,
   MBPerSecond:0,updates:0,checkpointChars:0,lastIndex:-1,
   lastSave:null,startedAt:null,elapsedSeconds:0,error:null,
   preview:null,heldout:null,lastBatch:null,perspectives:[1,2,3,4],
   noOriginalBrain:!this.nativeWorlds,trainingLive:false,history:[],
   native:{enabled:this.nativeWorlds,status:"not-started",stories:0,bytesRead:0,
    cpuOriginal:true,worldIntervalStories:nativeWorldEvery,
    nativeTextSymbolEvery:nativeTextEvery,nativeTextBytesPerSelectedStory:nativeTextBytes,
    modelScope:"original V17 learned language/maze/transform/construction/5D"}};
 }
 async init(){
  const trainMeta=await sourceMetadata(this.train),validMeta=await sourceMetadata(this.valid);
  await fsp.mkdir(this.out,{recursive:true});
  const existing=fs.existsSync(this.manifest),saved=fs.existsSync(this.checkpoint);
  if(existing!==saved)throw Error("Found only ONE of model checkpoint and manifest. Keep files; restore missing file before resume.");
  if(existing&&!this.resume)throw Error("Output has a previous run. Refuse overwrite; use a new output or resume.");
  this.trainMeta=trainMeta;this.validMeta=validMeta;
  this.state.datasetSize=trainMeta.size;
  if(existing){
   this.saved=JSON.parse(await fsp.readFile(this.manifest,"utf8"));
   for(const [key,real,expected] of [
    ["train path",this.train,this.saved.train],["valid path",this.valid,this.saved.valid],
    ["train byte size",trainMeta.size,this.saved.trainSize],
    ["valid byte size",validMeta.size,this.saved.validSize],
    ["train modification",trainMeta.mtimeMs,this.saved.trainMtime]])
    if(real!==expected)throw Error("Unsafe TinyStories resume: "+key+" changed.");
  }else{
   const others=await fsp.readdir(this.out);
   if(others.length)throw Error("Refusing to overwrite nonempty unrelated output directory: "+this.out);
   this.saved={version:1,train:this.train,valid:this.valid,trainSize:trainMeta.size,
    validSize:validMeta.size,trainMtime:trainMeta.mtimeMs,
    offset:0,lastIndex:-1,rows:0,chars:0};
  }
  this.state.bytesRead=this.saved.offset;
  this.state.percent=100*this.saved.offset/trainMeta.size;
  this.gpu=new GpuWorlds({device:this.device,worlds:0,util:100});
  try{
   await this.gpu.ready;
   this.state.gpuInfo=this.gpu.info;
   this.model=await this.gpu.call({cmd:"text_fast_init",checkpoint:this.checkpoint,resume:existing});
   this.state.lastIndex=this.model.lastIndex;
   this.state.stories=this.model.rows;
   this.state.chars=this.model.chars;
   this.state.checkpointChars=this.model.savedChars;
   this.state.phase="ready";
   if(this.nativeWorlds)this.startNativeWorker();
  }catch(e){this.state.error=message(e);this.state.phase="error";this.gpu.close();throw e;}
 }
 startNativeWorker(){
  if(this.native)return;
  const nativeWorker=this.native=new Worker(new URL("./native-worlds-worker.mjs",import.meta.url),{
   workerData:{train:this.train,valid:this.valid,out:this.out,
    symbolEvery:this.nativeTextEvery,symbolBytes:this.nativeTextBytes,
    worldEvery:this.nativeWorldEvery,saveSeconds:this.saveSeconds}
  });
  nativeWorker.on("message",m=>{
   if(m.type==="state"){
    this.state.native={...this.state.native,...m,percent:this.trainMeta?.size?
     100*m.bytesRead/this.trainMeta.size:0,
     lagBehindFastStories:Math.max(0,this.state.stories-m.stories)};
   }else if(m.type==="fatal"||m.type==="exam-error"){
    this.state.native={...this.state.native,error:m.error,
     status:m.type==="fatal"?"error":this.state.native?.status||"unknown"};
   }else if(m.type==="finished"){
    this.state.native={...this.state.native,status:"complete",
     stories:m.rows,bytesRead:m.offset,percent:100};
   }else if(m.type==="saved"){
    this.state.native={...this.state.native,
     lastCheckpoint:new Date().toISOString(),
     lastSavedOffset:m.offset,lastSavedRows:m.rows};
   }
  });
  nativeWorker.on("error",e=>{
   this.state.native={...this.state.native,status:"error",error:message(e)};
  });
  nativeWorker.on("exit",code=>{
   this.nativeStopped=true;
   if(code!==0&&this.state.native?.status!=="error")
    this.state.native={...this.state.native,status:"error",
     error:"Original V17 worker unexpectedly exited with code "+code};
  });
 }
 nativeCommand(type){
  if(!this.native)return {accepted:false,reason:"original V17 background worker disabled"};
  if(this.nativeStopped)return {accepted:false,error:"V17 original worker is not running"};
  this.native.postMessage({type});
  return {accepted:true,command:type};
 }
 readStatus(){return {...this.state,paused:this.paused,running:this.running,
  finished:this.finished,saveRequested:this.saveRequested,
  train:this.train,valid:this.valid,checkpoint:this.checkpoint,
  checkPointIsolated:true,sourceDelimiter:this.trainMeta?.delimiter,
  serverTime:now(),gpuModel:this.model?.algorithm||"observed-hashed-context-1to4"};}
 async commit(){
  if(!this.gpu||!this.model)throw Error("GPU trainer not initialized");
  const checkpoint=await this.gpu.call({cmd:"text_fast_save"});
  // A checkpoint can include more progress than the manifest after a crash.
  // We save committed offset and row number atomically after GPU checkpoint.
  const data={...this.saved,offset:this.state.bytesRead,
   lastIndex:this.state.lastIndex,rows:this.state.stories,
   chars:this.state.chars,updated:new Date().toISOString()};
  const tmp=this.manifest+".tmp";
  await fsp.writeFile(tmp,JSON.stringify(data,null,2));
  await fsp.rename(tmp,this.manifest);
  this.saved=data;
  this.state.checkpointChars=checkpoint.savedChars;
  this.state.lastSave=new Date().toISOString();
  this.saveRequested=false;
  return checkpoint;
 }
 async preview(batch){
  const t=now();
  if(t-(this.lastPreviewAt||0)<1500||!batch.length)return;
  this.lastPreviewAt=t;
  const first=batch[0];
  const data=await this.gpu.call({cmd:"text_fast_eval",rows:[Array.from(first.bytes.subarray(0,350))]});
  this.state.preview={index:first.index,source:"REAL training item; prediction BEFORE GPU update",
   actual:first.text.slice(0,1000),preUpdate: data.examples?.[0]||null,
   correct:data.hits,total:data.seen,accuracy:data.accuracy,
   independentHeldout:false,time:new Date().toISOString()};
 }
 recordRate(after,before,t0){
  const dt=Math.max(.001,(after.at-before.at)/1000);
  const rate=after.chars-before.chars,stories=after.rows-before.rows,bytes=after.offset-before.offset;
  this.state.storiesPerSecond=stories/dt;
  this.state.charsPerSecond=rate/dt;
  this.state.MBPerSecond=bytes/1e6/dt;
  this.state.history.push({at:after.at,stories:after.rows,chars:after.chars,
   pct:100*after.offset/this.trainMeta.size,rateStories:this.state.storiesPerSecond,
   rateMB:this.state.MBPerSecond});
  this.state.history=this.state.history.slice(-100);
 }
 async trainBatch(batch,endOffset){
  if(!batch.length)return;
  this.state.phase="GPU learning";this.state.trainingLive=true;
  const before={at:now(),rows:this.state.stories,chars:this.state.chars,
   offset:this.state.bytesRead};
  await this.preview(batch);
  const result=await this.gpu.call({cmd:"text_fast_train",
   rows:batch.map(({index,bytes})=>({index,b64:bytes.toString("base64")}))});
  // Only report committed REAL updates. Python reports cumulative counts
  // and lastIndex, so duplicate retries cannot double-count learning.
  this.state.stories=result.totalRows;this.state.chars=result.totalChars;
  this.state.lastIndex=result.lastIndex;this.state.bytesRead=endOffset;
  this.state.percent=100*endOffset/this.trainMeta.size;
  this.state.updates++;
  this.state.lastBatch={stories:result.rows,chars:result.chars,
   duplicates:result.duplicates,seconds:result.busy,
   device:result.device,gpuWeightsUpdated:result.gpuWeightsUpdated,
   time:new Date().toISOString()};
  this.state.elapsedSeconds=(now()-this.state.startedAt)/1000;
  this.recordRate({at:now(),rows:this.state.stories,chars:this.state.chars,
   offset:endOffset},before);
  this.state.phase="training";
  if(this.saveRequested||now()-(this.lastCheckpointAt||0)>this.saveSeconds*1000){
   await this.commit();this.lastCheckpointAt=now();
  }
 }
 async run(){
  if(this.running)return;
  this.running=true;this.paused=false;this.finished=false;
  this.state.phase="training";this.state.error=null;
  this.state.startedAt=this.state.startedAt||now();
  let index=this.saved.lastIndex+1;
  let batch=[],bytes=0,endOffset=this.saved.offset;
  try{
   for await(const item of stories(this.train,{startOffset:this.saved.offset,
    metadata:this.trainMeta})){
    while(this.paused&&!this.stopRequested){
     this.state.phase="paused";
     if(this.saveRequested){await this.commit();this.lastCheckpointAt=now();}
     await rest(90);
    }
    if(this.stopRequested)break;
    batch.push({index:index++,bytes:item.ascii,text:item.text});
    bytes+=item.ascii.length;endOffset=item.endOffset;
    if(bytes>=this.batchBytes||batch.length>=this.batchStories){
     await this.trainBatch(batch,endOffset);
     batch=[];bytes=0;
    }
   }
   if(batch.length&&!this.stopRequested)await this.trainBatch(batch,endOffset);
   const allProcessed=!this.stopRequested&&endOffset===this.trainMeta.size;
   await this.commit();
   if(allProcessed){this.finished=true;this.paused=true;this.state.phase="complete";}
  }catch(e){
   this.state.error=message(e);this.state.phase="error";this.paused=true;
  }finally{
   this.running=false;
   if(this.stopRequested){this.state.phase="stopped";this.gpu?.close();}
  }
 }
 start(){
  if(this.state.phase==="error")throw Error(this.state.error||"Reset or diagnose before restarting");
  if(this.finished)throw Error("TinyStories corpus finished. Choose a new output directory for another pass.");
  this.paused=false;
  if(!this.running){this.run();}
  this.nativeCommand("start");
  return this.readStatus();
 }
 pause(){this.paused=true;this.nativeCommand("pause");return this.readStatus();}
 save(){
  this.saveRequested=true;
  this.nativeCommand("save");
  if(!this.running){this.commit().catch(e=>{this.state.error=message(e);this.state.phase="error";});}
  return {accepted:true,notes:"Checkpoint written after current GPU batch; check lastSave."};
 }
 async evaluate({maxStories=32}={}){
  if(this.pendingTest)throw Error("Another held-out test is running");
  this.pendingTest=true;
  try{
   const texts=[];
   for await(const sample of stories(this.valid,{metadata:this.validMeta})){
    texts.push(Array.from(sample.ascii));
    if(texts.length>=maxStories)break;
   }
   if(!texts.length)throw Error("Validation TinyStories file has no usable stories");
   const result=await this.gpu.call({cmd:"text_fast_eval",rows:texts});
   this.state.heldout={...result,stories:texts.length,
    source:"SEPARATE TinyStories-valid.txt ONLY. GPU model was frozen.",
    time:new Date().toISOString()};
   return this.state.heldout;
  }finally{this.pendingTest=false;}
 }
 async stop(){
  this.stopRequested=true;this.paused=false;this.saveRequested=true;
  this.nativeCommand("stop");
  if(this.running){
   for(let i=0;i<450&&this.running;i++)await rest(100);
  }else{
   try{await this.commit();}catch(e){this.state.error=message(e);}
   this.gpu?.close();
  }
  if(this.native&&!this.nativeStopped){
   const w=this.native;
   const closed=new Promise(resolve=>w.once("exit",resolve));
   await Promise.race([closed,rest(12000)]);
   if(!this.nativeStopped)await w.terminate();
  }
 }
}
const send=(res,body,code=200)=>{
 const bytes=Buffer.from(JSON.stringify(body));
 res.writeHead(code,{"content-type":"application/json; charset=utf-8",
  "cache-control":"no-store","content-length":bytes.length});
 res.end(bytes);
};
export async function launch(opts){
 const app=new TinyStoriesTrainer(opts);
 await app.init();
 const httpServer=http.createServer(async(req,res)=>{
  const url=new URL(req.url,"http://127.0.0.1");
  if(req.method==="GET"&&["/","/index.html","/app.js"].includes(url.pathname)){
   const p=path.join(here,"ui",url.pathname==="/app.js"?"app.js":"index.html");
   const b=await fsp.readFile(p);
   res.writeHead(200,{"content-type":p.endsWith(".js")?"text/javascript; charset=utf-8":"text/html; charset=utf-8",
    "cache-control":"no-cache"});
   return res.end(b);
  }
  if(req.method==="GET"&&url.pathname==="/api/status")return send(res,app.readStatus());
  if(req.method==="POST"){
   try{
    if(url.pathname==="/api/start")return send(res,app.start());
    if(url.pathname==="/api/pause")return send(res,app.pause());
    if(url.pathname==="/api/save")return send(res,app.save());
    if(url.pathname==="/api/native-start")return send(res,app.nativeCommand("start"));
     if(url.pathname==="/api/native-test")return send(res,app.nativeCommand("evaluate"));
     if(url.pathname==="/api/native-graph")return send(res,app.nativeCommand("snapshot"));
     if(url.pathname==="/api/test")return send(res,await app.evaluate({
     maxStories:positive(url.searchParams.get("stories")||32,"heldout stories",1,128)
    }));
   }catch(e){return send(res,{error:message(e)},400);}
  }
  return send(res,{error:"Unknown TinyStories endpoint"},404);
 });
 await new Promise((ok,no)=>{
  httpServer.once("error",no);
  httpServer.listen(app.port,"127.0.0.1",ok);
 });
 console.log("TINYSTORIES_AETHER_LISTEN "+JSON.stringify({port:app.port,train:app.train,
  valid:app.valid,device:app.device,checkpoint:app.checkpoint}));
 if(opts.autoOpen&&process.platform==="win32"){
  const address="http://127.0.0.1:"+app.port+"/";
  exec('start "" "'+address+'"',()=>{});
 }
 if(opts.autoStart)app.start();
 let shutting=false;
 const terminate=async()=>{
  if(shutting)return;shutting=true;
  console.log("TINYSTORIES_AETHER_CHECKPOINTING");
  await app.stop();httpServer.close();
 };
 process.once("SIGINT",terminate);process.once("SIGTERM",terminate);
 return {app,httpServer,close:terminate};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const train=arg("train"),valid=arg("valid"),out=arg("out");
 if(!train||!valid||!out){console.error("Usage: node server.mjs --train TinyStories-train.txt --valid TinyStories-valid.txt --out SeparateRun --device cuda:0 --port 8897 --start");process.exit(2);}
 launch({train,valid,out,device:arg("device","cuda:0"),port:arg("port","8897"),
  batchKB:arg("batch-kb","128"),batchStories:arg("batch-stories","180"),
  nativeWorlds:!flag("no-native-worlds"),
  nativeTextEvery:positive(arg("native-text-every","16"),"native text every",1,256),
  nativeTextBytes:positive(arg("native-text-bytes","48"),"native text bytes",4,128),
  nativeWorldEvery:positive(arg("native-world-every","32"),"native world every",1,10000),
  saveSeconds:arg("save-seconds","45"),resume:!flag("fresh"),
  autoStart:flag("start"),autoOpen:flag("open")}).catch(e=>{console.error("TINYSTORIES_START_ERROR",message(e));process.exitCode=1;});
}
