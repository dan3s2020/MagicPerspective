#!/usr/bin/env node
// V28: NEW V26 visual UI, ORIGINAL V17 training only.
// The original native engine, parameters, corpus and checkpoint are NEVER
// altered by this server. Its only job is read-only transport + exact original
// control/eval forwarding. No ObservedEffects, no V26 task generation.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {fileURLToPath} from "node:url";

const ROOT=fileURLToPath(new URL(".",import.meta.url));
const runFile=promisify(execFile);
const GPU_PY=path.resolve(ROOT,"../../transcend/torus-aether/gpu/.venv",
  process.platform==="win32"?"Scripts/python.exe":"bin/python");
export async function inspectOriginalCuda({python=GPU_PY,run=runFile}={}){
  try{
    await fs.access(python);
    const {stdout}=await run(python,["-c",
      "import sys, json, torch; print(json.dumps({'python':sys.executable,'torch':torch.__version__,'cuda':torch.version.cuda,'available':bool(torch.cuda.is_available()),'device':torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}))"
    ],{timeout:15000,windowsHide:true,maxBuffer:256*1024});
    const data=JSON.parse(stdout.trim().split(/\r?\n/).at(-1));
    return {...data,ok:!!data.available&&!!data.cuda,
      python,reason:data.available&&data.cuda?null:
      "PyTorch CUDA is not usable in the ORIGINAL dedicated V17 Python environment"};
  }catch(e){return {ok:false,python,reason:String(e.message||e).slice(0,400)};}
}
export function isCudaStartupFailure(graph){
  return /cuda|torch\.cuda|GPU process|PyTorch|python|OCTOPUS_PY/i.test(
    String(graph?.error||graph?.gpu?.error||""))&&graph?.status==="eroare";
}
const FILES={
  "/": ["public/native.html","text/html; charset=utf-8"],
  "/native-app.js": ["public/native-app.js","text/javascript; charset=utf-8"],
  "/style.css": ["public/style.css","text/css; charset=utf-8"],
  "/native-extra.css": ["public/native-extra.css","text/css; charset=utf-8"],
  "/native-metrics.mjs": ["native-metrics.mjs","text/javascript; charset=utf-8"]
};
const send=(res,body,status=200)=>{
  const data=JSON.stringify(body);
  res.writeHead(status,{"content-type":"application/json; charset=utf-8",
    "cache-control":"no-store","x-content-type-options":"nosniff"});
  res.end(data);
};
const bounded=(v,lo,hi,defaultValue)=>{
  const x=Number(v);return Number.isFinite(x)?Math.max(lo,Math.min(hi,x)):defaultValue;
};
async function parse(req,maxBytes=1024*1024){
  const parts=[];let size=0;
  for await(const chunk of req){
    size+=chunk.length;
    if(size>maxBytes)throw Error("Native request too large");
    parts.push(chunk);
  }
  const raw=Buffer.concat(parts).toString("utf8");
  try{return raw?JSON.parse(raw):{};}catch{throw Error("Invalid JSON")}
}
export function pickNativeGraph(payload,worker=null){
  const list=Array.isArray(payload?.graphs)?payload.graphs:[];
  if(worker!==null&&worker!==undefined&&worker!==""){
    return list.find(x=>Number(x.w)===Number(worker))||null;
  }
  return list.find(x=>x.status==="antrenează")||list[0]||null;
}
export function nativeSnapshot(graphs,graph=null,worker=null){
  const picked=pickNativeGraph(graphs,worker);
  const source=graphs?.corpus||null;
  return {version:"V28_NATIVE_V17_UI",mode:"ORIGINAL_TRAINING",
    selectedWorker:picked?.w??null,workers:graphs?.graphs||[],world:graphs?.world||null,
    corpus:source,worlds:graphs?.worlds||[],gpu:graphs?.gpu||null,
    original:picked,graph:graph||null,
    native:{
      text:picked?.test||null,
      maze:picked?.maze||null,transform:picked?.transform||null,
      progress:picked?.progress||null,
      gpu:picked?.gpu||null,
      shared:graph?.shared||null,
      graphNodes:graph?.nodes||null,graphEdges:graph?.edges||null,
      graphU:graph?.U||null,graphFlow:graph?.flow||null,
      causalText:graph?.textMaze||graph?.hypermaze||graph?.cognitive||null
    },
    scientificScope:"Original V17 training and original heldout metrics. No synthetic V26 editing worlds."};
}
export async function createNativeBridge({
  port=8896,host="127.0.0.1",nativePort=8841,nativeHost="127.0.0.1",
  fetchImpl=fetch,
  inspectCuda=inspectOriginalCuda
}={}){
  if(!["127.0.0.1","localhost"].includes(host)||
    !["127.0.0.1","localhost"].includes(nativeHost))throw Error("Loopback only");
  if(!Number.isInteger(port)||port<0||port>65535||
    !Number.isInteger(nativePort)||nativePort<1024||nativePort>65535)
    throw Error("Invalid port");
  const base="http://"+nativeHost+":"+nativePort;
  async function nativeGet(p,timeout=18000){
    const r=await fetchImpl(base+p,{signal:AbortSignal.timeout(timeout)});
    if(!r.ok)throw Error("Original V17 "+p+" responded HTTP "+r.status);
    const j=await r.json();
    if(j.error)throw Error("Original V17 "+p+": "+j.error);
    return j;
  }
  async function nativePost(p,body=null,timeout=180000){
    const r=await fetchImpl(base+p,{method:"POST",signal:AbortSignal.timeout(timeout),
      ...(body===null?{}:{headers:{"content-type":"application/json"},
        body:JSON.stringify(body)})});
    if(!r.ok)throw Error("Original V17 "+p+" responded HTTP "+r.status);
    const j=await r.json();
    if(j.error||j.ok===false)throw Error("Original V17: "+(j.error||j.reason||"operation rejected"));
    return j;
  }
  const server=http.createServer((req,res)=>{
    (async()=>{
      const u=new URL(req.url||"/","http://localhost"),target=u.pathname;
      if(req.method==="GET"&&FILES[target]){
        const [rel,type]=FILES[target];
        const data=await fs.readFile(path.join(ROOT,rel));
        res.writeHead(200,{"content-type":type,"cache-control":"no-store",
          "content-length":data.length,"x-content-type-options":"nosniff"});
        res.end(data);return;
      }
      if(req.method==="GET"&&target==="/api/native-health"){
        const x=await nativeGet("/graphs",7000);
        send(res,{connected:true,upstream:base,workers:x.graphs?.length||0,
          source:"ORIGINAL_V17",checkpointOwnedBy:"ORIGINAL_V17"});return;
      }
      if(req.method==="GET"&&target==="/api/native-state"){
        const worker=u.searchParams.get("w");
        const graphs=await nativeGet("/graphs");
        const selected=pickNativeGraph(graphs,worker);
        let graph=null,graphError=null;
        if(selected){
          try{graph=await nativeGet("/graph?w="+selected.w,7000);}
          catch(e){graphError=String(e.message||e);}
        }
        send(res,{...nativeSnapshot(graphs,graph,worker),
          graphError,nativeCudaError:isCudaStartupFailure(selected)?selected.error:null,
          upstream:base,receivedAt:new Date().toISOString()});return;
      }
      if(req.method==="POST"&&target==="/api/native-control"){
        const b=await parse(req),worker=b.worker;
        const selector=worker===null||worker===undefined?"":"&w="+encodeURIComponent(worker);
        if(!["start","pause","save","reset"].includes(b.action))
          throw Error("Unknown original training action");
        if(b.action==="reset"&&b.confirm!=="RESET_ORIGINAL_TRAINING")
          throw Error("Original training reset requires explicit confirmation");
        if(b.action==="start"){
          const graphInfo=await nativeGet("/graphs");
          const selected=pickNativeGraph(graphInfo,worker);
          if(isCudaStartupFailure(selected))throw Error(
            "CUDA ORIGINAL V17 FAILED: "+selected.error+
            ". Repeated Start cannot change the Python interpreter of a running worker. "+
            "Restart the ORIGINAL V17 process using START_V17.ps1 -Gpu cuda:0 "+
            "-Resume -Out <SAME_ORIGINAL_CHECKPOINT_FOLDER>; the script prepares "+
            "v17/transcend/torus-aether/gpu/.venv and verifies torch CUDA. "+
            "Do not use hermes-agent\\venv Python for CUDA.");
        }
        const out=await nativePost("/control?do="+encodeURIComponent(b.action)+selector);
        send(res,{ok:true,original:out});return;
      }
      if(req.method==="POST"&&target==="/api/native-eval"){
        const b=await parse(req,2*1024*1024);
        if(!["text","maze","transform"].includes(b.kind))
          throw Error("Original evaluation supports text, maze, transform");
        if(!Number.isInteger(+b.worker)||Number(b.worker)<0)
          throw Error("Select a real original V17 worker");
        const opts=b.kind==="text"?{
          count:Math.trunc(bounded(b.count,1,200,12)),
          max:Math.trunc(bounded(b.maxChars,0,1000000,20000)),
          T:bounded(b.temperature,0,2,.4),
          noise:bounded(b.noise,0,1,0),
          text:String(b.text||"").slice(0,1000000)
        }:b.kind==="maze"?{
          sizes:[7,9,11,13,15,17,19,21,25,31,41,51],
          per:Math.trunc(bounded(b.per,1,10,1)),
          T:bounded(b.temperature,0,2,.4),
          noise:bounded(b.noise,0,1,0)
        }:{
          count:Math.trunc(bounded(b.count,1,60,12)),
          impossible:Math.trunc(bounded(b.impossible,0,20,4)),
          noise:bounded(b.noise,0,1,0)
        };
        // Pass EXACT native eval-worker options. The original engine saves
        // the actual brain, evaluates a frozen copy on original heldout Q/A.
        const original=await nativePost("/eval",{w:Number(b.worker),kind:b.kind,opts},180000);
        send(res,{ok:true,kind:b.kind,worker:Number(b.worker),original,
          provenance:{endpoint:"ORIGINAL /eval",split:"ORIGINAL HELDOUT",
            metricDefinitions:"UNCHANGED ORIGINAL V17"}});return;
      }
      if(req.method==="POST"&&target==="/api/native-params"){
        const b=await parse(req);const sel=b.worker===null||b.worker===undefined?
          "":"w="+encodeURIComponent(b.worker)+"&";
        const permitted=["ltemp","pnoise","gnoise","glr","repel","wtemp","ttemp"];
        const entries=permitted.filter(k=>Number.isFinite(Number(b[k])))
          .map(k=>k+"="+encodeURIComponent(bounded(b[k],0,3,0)));
        if(!entries.length)throw Error("No original V17 parameters given");
        const original=await nativePost("/controls?"+sel+entries.join("&"));
        send(res,{ok:true,original});return;
      }
      if(req.method==="POST"&&target==="/api/native-gpu"){
        const b=await parse(req);
        const dev=String(b.device||"off");
        if(!["off","cpu","cuda:0","cuda:1"].includes(dev))
          throw Error("Invalid original GPU selector");
        if(dev.startsWith("cuda")){
          const result=await inspectCuda();
          if(!result.ok)throw Error(
            "CUDA preflight rejected: "+result.reason+
            " [Python: "+result.python+"]. No GPU configuration was applied. "+
            "Restart original V17 via START_V17.ps1 -Gpu cuda:0 "+
            "-Resume -Out <SAME_ORIGINAL_CHECKPOINT_FOLDER>, "+
            "which prepares its own isolated torch CUDA environment; "+
            "do not use hermes-agent\\venv.");
        }
        const q=new URLSearchParams({
          device:dev,
          worlds:String(Math.trunc(bounded(b.worlds,0,100000,0))),
          textBatch:String(Math.trunc(bounded(b.textBatch,1,128,8))),
          vram:String(bounded(b.vram,0,128,0)),
          util:String(Math.trunc(bounded(b.util,5,100,100)))
        });
        const original=await nativePost("/gpu?"+q);
        send(res,{ok:true,original});return;
      }
      if(req.method==="GET"&&target==="/api/native-evidence"){
        const graphs=await nativeGet("/graphs");
        const selected=pickNativeGraph(graphs,u.searchParams.get("w"));
        const graph=selected?await nativeGet("/graph?w="+selected.w):null;
        const data=JSON.stringify({
          exportedAt:new Date().toISOString(),
          source:"ORIGINAL V17 /graphs and /graph",graphs,
          selectedWorker:selected?.w??null,selectedGraph:graph,
          note:"Read-only original native snapshot; no synthetic edit accuracy."
        },null,2);
        res.writeHead(200,{"content-type":"application/json; charset=utf-8",
          "content-disposition":"attachment; filename=V28_ORIGINAL_TRAINING_EVIDENCE.json",
          "cache-control":"no-store","content-length":Buffer.byteLength(data)});
        res.end(data);return;
      }
      send(res,{error:"Route not found"},404);
    })().catch(e=>{
      if(!res.headersSent)send(res,{error:String(e.message||e),
        upstream:"ORIGINAL_V17",trainingChanged:false},502);
      else if(!res.writableEnded)res.end();
    });
  });
  await new Promise((resolve,reject)=>{
    server.once("error",reject);server.listen(port,host,resolve);
  });
  const address="http://"+host+":"+server.address().port;
  return {server,url:address,close:()=>new Promise(ok=>server.close(ok))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const p=(flag,defaultValue)=>{
    const i=process.argv.indexOf(flag);
    return i<0?defaultValue:process.argv[i+1];
  };
  try{
    const bridge=await createNativeBridge({
      port:Number(p("--port",8896)),
      nativePort:Number(p("--native-port",8841))
    });
    console.log("V28 REAL V17 TRAINING / V26 DESIGN: "+bridge.url);
    console.log("Original trainer runs separately on http://127.0.0.1:"+p("--native-port",8841));
    console.log("No V26 synthetic action model is loaded or executed.");
  }catch(e){console.error("Native V28 bridge failed:",e);process.exitCode=1;}
}
