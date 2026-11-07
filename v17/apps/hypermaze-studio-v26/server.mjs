#!/usr/bin/env node
// MagicPerspective V26: new from-scratch local HTTP UI + actual native training.
// No third-party npm modules and no dependency on old V17 HTTP UI files.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {StudioSession} from "./session.mjs";
import {DEFAULT_CORPUS} from "./corpus.mjs";

const ROOT=fileURLToPath(new URL(".",import.meta.url));
const STATIC=new Map([
  ["/",{path:"public/index.html",type:"text/html; charset=utf-8"}],
  ["/app.js",{path:"public/app.js",type:"text/javascript; charset=utf-8"}],
  ["/style.css",{path:"public/style.css",type:"text/css; charset=utf-8"}]
]);
function cli(args){
  const opts={port:8896,host:"127.0.0.1",corpus:DEFAULT_CORPUS,
    checkpointDir:path.resolve("V26_CHECKPOINTS"),auto:true,config:{}};
  const keys=new Set(["port","host","corpus","checkpoint-dir",
    "axes","words","noise","batch","seed","max-read-mb","no-auto"]);
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(!arg.startsWith("--"))throw Error("Unexpected argument: "+arg);
    const k=arg.slice(2);if(!keys.has(k))throw Error("Unknown option --"+k);
    if(k==="no-auto"){opts.auto=false;continue;}
    const v=args[++i];if(v===undefined||v.startsWith("--"))
      throw Error("Missing value after --"+k);
    if(k==="port")opts.port=Number(v);
    else if(k==="host")opts.host=v;
    else if(k==="corpus")opts.corpus=path.resolve(v);
    else if(k==="checkpoint-dir")opts.checkpointDir=path.resolve(v);
    else opts.config[k.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=Number(v);
  }
  if(!Number.isInteger(opts.port)||opts.port<1024||opts.port>65535)
    throw Error("Port must be 1024..65535");
  if(opts.host!=="127.0.0.1"&&opts.host!=="localhost"&&opts.host!=="::1")
    throw Error("Local-only bind required; do not expose experimental training API on network");
  if(opts.config.maxReadMb!==undefined){
    opts.config.maxReadMB=opts.config.maxReadMb;delete opts.config.maxReadMb;
  }
  return opts;
}
async function jsonBody(req,maxBytes=32*1024*1024){
  let parts=[],length=0;
  for await(const data of req){
    length+=data.length;
    if(length>maxBytes)throw Error("Request body exceeds configured limit");
    parts.push(data);
  }
  const raw=Buffer.concat(parts).toString("utf8");
  try{return raw?JSON.parse(raw):{};}catch{throw Error("Expected valid JSON request");}
}
function send(res,data,status=200){
  const json=JSON.stringify(data);
  res.writeHead(status,{"Content-Type":"application/json; charset=utf-8",
    "Content-Length":Buffer.byteLength(json),
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
  res.end(json);
}
async function route(req,res,session,clients){
  const url=new URL(req.url||"/","http://localhost");
  if(req.method==="GET"&&STATIC.has(url.pathname)){
    const obj=STATIC.get(url.pathname),file=path.join(ROOT,obj.path);
    const payload=await fs.readFile(file);
    res.writeHead(200,{"Content-Type":obj.type,"Content-Length":payload.length,
      "Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
    res.end(payload);return;
  }
  if(req.method==="GET"&&url.pathname==="/api/state"){
    send(res,session.snapshot());return;
  }
  if(req.method==="GET"&&url.pathname==="/api/health"){
    send(res,{ok:session.phase!=="error",phase:session.phase,
      trainWorlds:session.stats.trainWorlds,learned:session.model?.rules.size||0,
      version:"V26-native-live"});return;
  }
  if(req.method==="GET"&&url.pathname==="/api/export"){
    const data=JSON.stringify(session.snapshot(),null,2);
    res.writeHead(200,{"Content-Type":"application/json; charset=utf-8",
      "Content-Disposition":"attachment; filename=V26_LAST_EXPERIMENT.json",
      "Content-Length":Buffer.byteLength(data),"Cache-Control":"no-store"});
    res.end(data);return;
  }
  if(req.method==="GET"&&url.pathname==="/api/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream; charset=utf-8",
      "Cache-Control":"no-cache, no-transform","Connection":"keep-alive",
      "X-Accel-Buffering":"no"});
    res.write("retry: 1000\n\n");
    clients.add(res);
    res.write("event: snapshot\ndata: "+JSON.stringify(session.snapshot())+"\n\n");
    req.on("close",()=>clients.delete(res));
    return;
  }
  if(req.method==="POST"&&url.pathname==="/api/control"){
    const body=await jsonBody(req,2*1024*1024);
    let result={};
    switch(body.action){
      case "start":result=session.start();break;
      case "pause":result=session.pause();break;
      case "step":session.step();result=session.snapshot();break;
      case "reset":result=await session.reset();break;
      case "configure":result=session.configure(body.config||{});break;
      case "evaluate":result=await session.evaluate(Number(body.count)||100);break;
      case "save":result=await session.save();break;
      case "restore":
        if(typeof body.file!=="string"||!body.file)throw Error("Provide checkpoint path");
        result=await session.restore(body.file);break;
      case "corpus":
        if(typeof body.file!=="string"||!body.file)throw Error("Provide corpus file path");
        result=await session.initialize(body.file);break;
      default:throw Error("Unknown control action");
    }
    send(res,{ok:true,result});return;
  }
  if(req.method==="POST"&&url.pathname==="/api/upload"){
    const body=await jsonBody(req,16*1024*1024);
    if(typeof body.text!=="string"||body.text.length<200)
      throw Error("Upload requires a real corpus text of at least 200 characters");
    if(session.running||session.evalBusy)
      throw Error("Pause training before changing the corpus");
    const name=path.basename(String(body.name||"uploaded.txt"))
      .replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,70);
    if(!/\.(txt|md|jsonl|json)$/i.test(name))
      throw Error("Upload requires .txt, .md, .jsonl or .json");
    const destination=path.join(session.checkpointDir,"uploads");
    await fs.mkdir(destination,{recursive:true});
    const file=path.join(destination,Date.now()+"-"+name);
    await fs.writeFile(file,body.text,"utf8");
    const result=await session.initialize(file);
    send(res,{ok:true,file,result});return;
  }
  send(res,{ok:false,error:"Not found"},404);
}
export async function startServer(options={}){
  const o={...cli([]),...options};
  o.config={...cli([]).config,...(options.config||{})};
  const session=new StudioSession({corpusPath:o.corpus,
    checkpointDir:o.checkpointDir,config:o.config});
  await session.initialize(o.corpus);
  const clients=new Set();
  let lastSent=0;
  session.on("update",()=>{
    const now=Date.now();
    if(now-lastSent<180)return;
    lastSent=now;const payload="event: snapshot\ndata: "+
      JSON.stringify(session.snapshot())+"\n\n";
    for(const c of clients)if(!c.writableEnded&&!c.destroyed){
      try{c.write(payload);}catch{clients.delete(c);}
    }
  });
  const server=http.createServer((req,res)=>{
    route(req,res,session,clients).catch(e=>{
      session.message("error",e.message||e);
      if(!res.headersSent)send(res,{ok:false,error:String(e.message||e)},400);
      else if(!res.writableEnded)res.end();
    });
  });
  await new Promise((resolve,reject)=>{
    server.once("error",reject);
    server.listen(o.port,o.host,resolve);
  });
  if(o.auto)session.start();
  const address="http://"+o.host+":"+o.port;
  console.log("MagicPerspective V26 native LIVE text training: "+address);
  console.log("Corpus: "+session.corpus.path+
    "; train tokens "+session.corpus.trainTokens+
    "; unseen tokens "+session.corpus.testTokens);
  console.log("Device: CPU, original V17 Discoverer.shape. CUDA not verified.");
  return {server,session,url:address,close:()=>new Promise(resolve=>{
    session.pause();for(const c of clients)c.end();server.close(resolve);
  })};
}
const thisFile=fileURLToPath(import.meta.url);
if(process.argv[1]&&path.resolve(process.argv[1])===thisFile){
  try{await startServer(cli(process.argv.slice(2)));}
  catch(err){console.error("V26 START FAILED:",err);process.exitCode=1;}
}
