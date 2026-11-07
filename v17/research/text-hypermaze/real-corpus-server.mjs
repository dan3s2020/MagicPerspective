// The standalone OpenThoughts 1.2M LIVE server drives ONLY the ALREADY
// DEMONSTRATED NativeGoalTextMaze learning machinery. Not devour.mjs, not
// AligningGraph, not a byte frequency/next-token substitute. One worker owns
// ONE persistent Brain and produces all authentic path/geometry/noise states.
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import {Worker,isMainThread} from "node:worker_threads";
import {fileURLToPath} from "node:url";
import {enumerateJSONL} from "./openthoughts-jsonl-source.mjs";
const here=path.dirname(fileURLToPath(import.meta.url));
const uiDir=path.resolve(here,"../../transcend/torus-aether/ui");
const allowedPages=new Map([
 ["/","native-hypermaze.html"],
 ["/index.html","native-hypermaze.html"],
 ["/transcend/torus-aether/ui/native-hypermaze.html","native-hypermaze.html"],
 ["/transcend/torus-aether/ui/native-hypermaze.js","native-hypermaze.js"]
]);
const parseArgs=(argv=process.argv.slice(2))=>{
 const at=k=>argv.indexOf("--"+k),value=(k,defaultValue)=>{
  const i=at(k);return i<0?defaultValue:argv[i+1];
 };
 const integer=(k,def,min,max)=>{
  const s=value(k,String(def)),n=Number(s);
  if(!Number.isSafeInteger(n)||n<min||n>max)
   throw Error("--"+k+" must be integer "+min+".."+max);
  return n;
 };
 const data=value("data",null);if(!data)throw Error("Pass --data with your REAL existing OpenThoughts JSONL file or folder");
 const out=path.resolve(value("out",path.join(here,"../../../runtime-real-openthoughts-hypermaze")));
 return {data:path.resolve(data),out,port:integer("port",8899,1025,65535),
  holdoutEvery:integer("holdout-every",100,2,10000),
  saveEvery:integer("save-every",500,1,1000000),
  transitionEvery:integer("transition-every",128,1,100000),
  windowTokens:integer("window-tokens",96,8,120),
  maxTokensPerSegment:integer("max-tokens-per-segment",128,8,256),
  maxObserved:integer("max-observed",12000,100,200000),
  maxOperators:integer("max-operators",80000,100,2000000),
  autoStart:argv.includes("--start")};
};
const response=(res,status,obj)=>{const str=JSON.stringify(obj);
 res.writeHead(status,{"content-type":"application/json; charset=utf-8",
  "cache-control":"no-store","content-length":Buffer.byteLength(str)});
 res.end(str);
};
export async function launch(options={}){
 const conf=options.data?parseArgs([
  "--data",options.data,"--out",options.out||path.join(here,"../../../runtime-real-openthoughts-hypermaze"),
  "--port",String(options.port||8899),
  "--holdout-every",String(options.holdoutEvery||100),
  "--save-every",String(options.saveEvery||500),
  "--transition-every",String(options.transitionEvery||128),
  "--window-tokens",String(options.windowTokens||96),
  "--max-tokens-per-segment",String(options.maxTokensPerSegment||128),
  "--max-observed",String(options.maxObserved||12000),
  "--max-operators",String(options.maxOperators||80000),
  ...(options.autoStart?["--start"]:[])
 ]):parseArgs();
 const files=await enumerateJSONL(conf.data);
 await fsp.mkdir(conf.out,{recursive:true});
 const marker=path.join(conf.out,"native-real-corpus-marker.json");
 const signature={kind:"actual-original-native-hypermaze-JSONL",
  input:files.map(x=>({path:x.path,size:x.size,mtimeMs:x.mtimeMs}))};
 const present=await fsp.readdir(conf.out);
 if(!fs.existsSync(marker)&&present.length)
  throw Error("Refusing to overwrite other training outputs at "+conf.out+". Choose an isolated NEW -Out path.");
 if(fs.existsSync(marker)){
  const prior=JSON.parse(await fsp.readFile(marker,"utf8"));
  if(JSON.stringify(prior)!==JSON.stringify(signature))
   throw Error("Different dataset at existing native output; refuse unsafe model reuse");
 }else await fsp.writeFile(marker,JSON.stringify(signature,null,2));
 const worker=new Worker(new URL("./real-corpus-worker.mjs",import.meta.url),{
  workerData:{files,out:conf.out,opts:conf},resourceLimits:{
    maxOldGenerationSizeMb:Math.min(8192,Math.max(1024,options.heapMB||4096))}
 });
 let workerError=null,latest=null,started=false,closed=false,requestId=0;
 const pending=new Map();
 const rpc=(cmd,fields={},timeout=60000)=>new Promise((resolve,reject)=>{
  if(workerError||closed)return reject(Error(workerError||"Worker closed"));
  const id=++requestId;
  const timer=setTimeout(()=>{pending.delete(id);
   reject(Error("Real native worker timed out: "+cmd));},timeout);
  pending.set(id,{resolve,reject,timer});
  worker.postMessage({cmd,id,...fields});
 });
 worker.on("message",m=>{
  if(m.type==="status"){latest=m.status;started=true;return;}
  if(m.type==="fatal"){
   workerError=m.error;
   console.error("REAL_HYPERMAZE_FATAL",m.error);
   return;
  }
  if(m.type==="note"){console.log("NATIVE_LEARNER",m.text);return;}
  if(m.type==="saved"){console.log("REAL_NATIVE_CHECKPOINT",JSON.stringify(m));return;}
  if(m.type==="rpc"){
   const q=pending.get(m.id);if(!q)return;
   pending.delete(m.id);clearTimeout(q.timer);
   if(m.error)q.reject(Error(m.error));else q.resolve(m.result);
  }
 });
 worker.on("error",err=>{workerError=err.stack||err.message;
  for(const x of pending.values()){clearTimeout(x.timer);x.reject(err);}
  pending.clear();
  console.error("ORIGINAL_HYPERMAZE_WORKER_FATAL",workerError);
 });
 worker.on("exit",n=>{
  if(!closed&&n!==0)workerError=workerError||"Native training worker exited "+n;
  for(const x of pending.values()){clearTimeout(x.timer);x.reject(Error(workerError||"Worker stopped"));}
  pending.clear();
 });
 const server=http.createServer((req,res)=>{
  void(async()=>{
   const url=new URL(req.url||"/","http://127.0.0.1");
   if(req.method==="GET"&&allowedPages.has(url.pathname)){
    const filename=allowedPages.get(url.pathname);
    const file=path.join(uiDir,filename);
    const data=await fsp.readFile(file);
    res.writeHead(200,{"content-type":filename.endsWith(".js")?
     "text/javascript; charset=utf-8":"text/html; charset=utf-8",
     "cache-control":"no-store"});res.end(data);return;
   }
   if(req.method==="GET"&&url.pathname==="/api/status")
    return response(res,200,{ready:started,error:workerError,status:latest,
     originalModel:"NativeGoalTextMaze + original Discoverer.shapeGraph",
     trainingSource:files.map(x=>({path:x.path,bytes:x.size})),
     noLegacyBytePredictor:true,usesGPU:false});
   if(req.method==="GET"&&url.pathname==="/graphs")
    return response(res,200,{graphs:[{
     w:0,arm:"verified-native-hypermaze",status:workerError?"error":latest?.phase||"starting",
     error:workerError,worlds:["text"],chars:latest?.trainTextUTF8Bytes||0,
     nativeHypermaze:{
      actualCorpusRows:latest?.trainedRows||0,
      observedGeometryPairs:latest?.geometryPairs||0,
      originalNativeBrain:true,originalNoiseAgency:true,
      learnedOperators:latest?.learnedOperators||0,
      fileProgressPercent:latest?.percent||0,
      textMBPerSecond:latest?.textMBPerSecond||0,
      exactLongSemanticAnswersProven:false
     }}]});
   if(req.method==="POST"&&url.pathname==="/control"){
    const action=url.searchParams.get("do");
    const commands={start:"start",pause:"pause",save:"save",stop:"stop"};
    if(!(action in commands))return response(res,400,{error:"Unsupported native action "+action});
    const result=await rpc(commands[action]);
    return response(res,200,{ok:true,action,status:result});
   }
   if(req.method==="POST"&&url.pathname==="/native-qa"){
    const question=url.searchParams.get("question")||"";
    if(!question.trim()||question.length>4000)
     return response(res,400,{error:"Question required, at most 4000 characters; do NOT send answer"});
    const data=await rpc("qa",{question,
     execute:url.searchParams.get("execute")==="1"},30000);
    return response(res,200,data);
   }
   if(req.method==="POST"&&url.pathname==="/native-hypermaze"){
    const required=(url.searchParams.get("required")||"").split(",").map(x=>x.trim()).filter(Boolean);
    const start=url.searchParams.get("start")||"";
    if(!start.trim()||start.length>4000||required.length<1||required.length>16)
     return response(res,400,{error:"Observed start and 1..16 explicit goal tokens required; no hidden answer"});
    const data=await rpc("plan",{start,required,
     topology:url.searchParams.get("topology")==="1",
     execute:url.searchParams.get("execute")==="1"},120000);
    return response(res,200,data);
   }
   if(req.method==="POST"&&url.pathname==="/api/start")
    return response(res,200,await rpc("start"));
   if(req.method==="POST"&&url.pathname==="/api/pause")
    return response(res,200,await rpc("pause"));
   if(req.method==="POST"&&url.pathname==="/api/save")
    return response(res,200,await rpc("save"));
   if(req.method==="POST"&&url.pathname==="/api/stop")
    return response(res,200,await rpc("stop"));
   return response(res,404,{error:"Not found; only the verified isolated native-hypermaze UI is served"});
  })().catch(err=>response(res,500,{error:err.message}));
 });
 try{
  await new Promise((resolve,reject)=>{
   server.once("error",reject);
   server.listen(conf.port,"127.0.0.1",resolve);
  });
 }catch(err){await worker.terminate();throw err;}
 const base="http://127.0.0.1:"+conf.port;
 console.log("REAL_NATIVE_HYPERMAZE_HTTP",base+"/transcend/torus-aether/ui/native-hypermaze.html");
 console.log("ACTUAL_JSONL_INPUT",files.map(f=>f.path+" ("+f.size+" bytes)").join("; "));
 console.log("MODEL_ONLY","NativeGoalTextMaze / Discoverer.shapeGraph / ObservedTransformations / NoiseAgency");
 console.log("NO_FALSE_CUDA","Node CPU learning path; unrelated CUDA byte trainer is deliberately NOT started");
 const close=async()=>{
  if(closed)return;
  try{await rpc("pause",{},7000);await rpc("save",{},60000);}catch(err){
   console.error("CLOSE_CHECKPOINT_ERROR",err.message);
  }
  closed=true;await worker.terminate();await new Promise(resolve=>server.close(resolve));
 };
 return {server,worker,base,close,rpc,getStatus:()=>latest,getError:()=>workerError,config:conf};
}
if(isMainThread&&process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 launch().then(app=>{
  const halt=()=>{
   console.log("Native OpenThoughts training shutting down; checkpoint requested");
   void app.close().then(()=>process.exit(0)).catch(err=>{
    console.error(err);process.exit(1);
   });
  };
  process.on("SIGINT",halt);process.on("SIGTERM",halt);
 }).catch(err=>{console.error("NATIVE_OPENTHOUGHTS_START_ERROR",err.stack||err.message);process.exitCode=1;});
}
