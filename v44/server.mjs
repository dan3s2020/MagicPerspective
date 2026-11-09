#!/usr/bin/env node
// V44 NEW runtime: independent HTTP/SSE orchestration, CUDA Python protocol,
// isolated Parquet reader worker. Does not import any V42/V43 training or UI.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import zlib from "node:zlib";
import {spawn} from "node:child_process";
import {Worker} from "node:worker_threads";
import readline from "node:readline";
import crypto from "node:crypto";

const HERE=path.dirname(url.fileURLToPath(import.meta.url));
const args={python:"python",dataset:"D:\\training\\OpenThoughts3-1.2M",atlas:"",
  runtime:"D:\\MagicPerspective-V44\\runtime",port:0,batch:4,open:true};
for(let i=2;i<process.argv.length;i++){
  const flag=process.argv[i];
  if(flag==="--no-browser"){args.open=false;continue}
  const key=flag.replace(/^--/,"");
  if(!(key in args)||!flag.startsWith("--")||i+1>=process.argv.length)
    throw Error("Invalid CLI argument "+flag);
  args[key]=process.argv[++i];
}
args.port=Number(args.port)||0;
args.batch=Math.max(1,Math.min(16,Number(args.batch)||4));
if(!args.atlas||!fs.existsSync(args.atlas))throw Error("V44 requires the real verified Qwen-weight atlas");
fs.mkdirSync(args.runtime,{recursive:true});
const checkpoint=path.join(args.runtime,"v44-learner.pt");
const SSE=new Set();
let controlWaiter=null,engineReady=false,dataReady=false,dataReading=false,batchBusy=false;
let engine=null,reader=null,holdout=[],running=false,stopping=false,closed=false,pendingRows=null;
const startClock=Date.now(),recentCompletionTimes=[];
const state={
  product:"MagicPerspective V44 | INDEPENDENT STREAM",
  status:"STARTUP",step:"Checking donor geometry and reading real dataset metadata",
  cpu_copy_of_old_training:false,real_dataset:true,target_visible:true,
  qwen_full_forward:false,save_dir:args.runtime,device:"waiting",
  train_rows:0,heldout_rows:0,files:0,completed:0,source_read:0,
  committed_bytes:0,batch_size:args.batch,learned_exercises_this_session:0,
  current_source_index:-1,real_exercises_per_second:0,gpu_batch_exercises_per_second:0,
  gpu_batch_characters_per_second:0,vram_allocated_bytes:0,vram_peak_bytes:0,
  first_shape_verified:0,first_shape_total:0,average_before_pct:0,average_after_pct:0,
  last_event_at:new Date().toISOString(),last_checkpoint:null,last_error:null,
  holdout:null,operator_l2:0,recent:[],current:null,graph:[],pending_job:null
};
const JSON_HEADER={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
const STATIC={
  "/": ["studio.html","text/html; charset=utf-8"],
  "/studio.css":["studio.css","text/css; charset=utf-8"],
  "/studio.js":["studio.js","application/javascript; charset=utf-8"]
};
function expose(){
  return {...state,read_percent:state.train_rows?100*state.source_read/state.train_rows:0,
    committed_percent:state.train_rows?100*state.completed/state.train_rows:0,
    elapsed_seconds:(Date.now()-startClock)/1000,
    heartbeat_age_ms:Date.now()-Date.parse(state.last_event_at)};
}
function push(type, payload){
  const s="event: "+type+"\ndata: "+JSON.stringify(payload)+"\n\n";
  for(const r of SSE){
    try{if(!r.destroyed&&r.writableLength<4_000_000)r.write(s);}
    catch{SSE.delete(r);}
  }
}
function status(note){
  if(note)state.step=note;
  state.last_event_at=new Date().toISOString();
  push("state",expose());
}
function error(message){
  state.status="ERROR";state.last_error=String(message);running=false;
  status("Error: "+String(message));
}
function command(cmd,more={}){
  if(!engine||engine.killed||engine.exitCode!==null)throw Error("CUDA engine not alive");
  engine.stdin.write(JSON.stringify({cmd,...more})+"\n");
}
function setBatch(n){args.batch=Math.max(1,Math.min(16,Number(n)||4));state.batch_size=args.batch;}
function createJournal(){
  const index=new Map(),entries=[];
  const infoFile=path.join(args.runtime,"history.v44.jsonl");
  const binary=path.join(args.runtime,"full-replays.v44.bin");
  if(fs.existsSync(infoFile)){
    for(const line of fs.readFileSync(infoFile,"utf8").split(/\r?\n/)){
      if(!line)continue;try{
        const item=JSON.parse(line);
        index.set(Number(item.id),item);entries.push(item);
      }catch{/* Ignore only incomplete final line from abrupt Windows shutdown. */}
    }
  }
  const fd=fs.openSync(binary,"a+");
  function record(row){
    const compressed=zlib.gzipSync(Buffer.from(JSON.stringify(row)),{level:1});
    const offset=fs.fstatSync(fd).size;
    const len=Buffer.allocUnsafe(4);len.writeUInt32LE(compressed.length);
    fs.writeSync(fd,len);fs.writeSync(fd,compressed);
    const item={id:row.id,offset,length:compressed.length,bytes:row.bytes,
      before_correct:row.before_correct,after_correct:row.after_correct,
      shape_verified:row.shape_verified,shape_total:row.shape_total,
      at:new Date().toISOString(),prompt_preview:row.prompt.slice(0,160)};
    fs.appendFileSync(infoFile,JSON.stringify(item)+"\n");
    index.set(Number(item.id),item);entries.push(item);
    return item;
  }
  function get(id){
    const entry=index.get(id);if(!entry)return null;
    const buf=Buffer.allocUnsafe(entry.length);
    const bytesRead=fs.readSync(fd,buf,0,entry.length,entry.offset+4);
    if(bytesRead!==entry.length)throw Error("Replay trace truncated, refusing partial result");
    return JSON.parse(zlib.gunzipSync(buf).toString("utf8"));
  }
  function list(before=Number.MAX_SAFE_INTEGER,limit=40){
    return entries.filter(x=>x.id<before).slice(-limit).reverse();
  }
  return {record,get,list,close:()=>fs.closeSync(fd)};
}
let journal=createJournal();
const sendJson=(res,obj,code=200)=>{res.writeHead(code,JSON_HEADER);res.end(JSON.stringify(obj))};
function progressRate(now,howMany){
  for(let i=0;i<howMany;i++)recentCompletionTimes.push(now);
  while(recentCompletionTimes.length&&recentCompletionTimes[0]<now-10000)recentCompletionTimes.shift();
  // NEVER use GPU-only batch-time as sustained per-exercise speed.
  const duration=Math.min(10000,now-startClock);
  state.real_exercises_per_second=recentCompletionTimes.length/(Math.max(1000,duration)/1000);
}
let nextEvalAt=100,nextAutoSave=100;
function handleEngine(data){
  state.last_event_at=new Date().toISOString();
  switch(data.kind){
    case "ready":
      engineReady=true;state.device=data.device;state.completed=data.exercises;
      state.committed_bytes=data.bytes;state.current_source_index=data.last_row_index;
      state.source_read=Math.max(state.source_read,data.last_row_index+1);
      state.status="PAUSED";state.step="CUDA initialized. Start the real training.";
      state.first_shape_verified=data.complete_visible_pairs;
      state.first_shape_total=65536;
      if(data.complete_visible_pairs!==65536){error("Exact visible-goal donor geometry was not verified");return}
      status();
      if(!reader)spawnReader();
      break;
    case "phase":
      state.pending_job={phase:data.step,rows:data.rows};state.step=data.step;status();break;
    case "batch":{
      batchBusy=false;
      state.pending_job=null;
      state.completed=data.completed_exercises;
      state.committed_bytes=data.completed_bytes;
      state.current_source_index=data.last_row_index;
      state.gpu_batch_exercises_per_second=data.exact_exercises_per_second;
      state.gpu_batch_characters_per_second=data.exact_characters_per_second;
      state.vram_allocated_bytes=data.vram_allocated_bytes;
      state.vram_peak_bytes=data.vram_peak_bytes;
      state.operator_l2=data.operator_l2;
      state.graph=Array.isArray(data.graph_edges)?data.graph_edges:[];
      const now=Date.now(),actual=data.outcomes||[];
      for(const row of actual){
        const summary=journal.record(row);
        state.recent.unshift(summary);
        if(state.recent.length>160)state.recent.length=160;
        state.current=row;
        state.learned_exercises_this_session++;
      }
      progressRate(now,actual.length);
      if(state.completed>=nextAutoSave){
        nextAutoSave=state.completed+100;
        command("save");
      }
      state.average_before_pct=actual.length?
        100*actual.reduce((s,x)=>s+x.before_correct,0)/
           Math.max(1,actual.reduce((s,x)=>s+x.bytes,0)):0;
      state.average_after_pct=actual.length?
        100*actual.reduce((s,x)=>s+x.after_correct,0)/
           Math.max(1,actual.reduce((s,x)=>s+x.bytes,0)):0;
      state.status=running?"RUNNING":"PAUSED";
      state.step=actual.length+" real exercises completed, model committed to GPU memory";
      status();
      if(stopping){command("quit");return}
      if(running&&state.completed>=nextEvalAt&&holdout.length){
        nextEvalAt=state.completed+100;
        command("eval",{rows:holdout});return;
      }
      if(running)requestNext();
      break;
    }
    case "holdout":
      state.holdout=data.result;state.step="Held-out metric updated on reserved unseen rows";
      status();if(running)requestNext();break;
    case "generation":
      state.chat_result=data;status();if(running)requestNext();break;
    case "checkpoint":
      state.last_checkpoint=data;status();break;
    case "reset":
      state.completed=0;state.source_read=0;state.current_source_index=-1;
      state.committed_bytes=0;state.learned_exercises_this_session=0;
      state.current=null;state.recent=[];state.holdout=null;
      recentCompletionTimes.length=0;dataReading=false;batchBusy=false;
      reader.postMessage({cmd:"seek",index:0});
      const archiveFolder=path.join(args.runtime,"archives");
      fs.mkdirSync(archiveFolder,{recursive:true});
      journal.close();
      for(const name of ["history.v44.jsonl","full-replays.v44.bin"]){
        const src=path.join(args.runtime,name);
        if(fs.existsSync(src)){
          const dest=path.join(archiveFolder,Date.now()+"-"+name);
          fs.renameSync(src,dest);
        }
      }
      journal=createJournal();
      logs.length=0;
      nextAutoSave=100;
      status("New V44 session; archived old checkpoint and full evidence: "+data.archived);
      break;
    case "warning":state.step=String(data.error);status();break;
    case "error":error("GPU engine "+data.command+": "+data.error);break;
    case "fatal":error("GPU initialization: "+data.error);break;
    case "stopped":closed=true;running=false;state.status="STOPPED";status();break;
    default:break;
  }
}
function spawnEngine(){
  engine=spawn(args.python,["-u",path.join(HERE,"engine.py"),
    "--atlas",args.atlas,"--checkpoint",checkpoint,"--device","cuda:0"],{
    cwd:HERE,windowsHide:true,stdio:["pipe","pipe","pipe"]});
  readline.createInterface({input:engine.stdout}).on("line",line=>{
    try{handleEngine(JSON.parse(line));}
    catch(e){error("Invalid CUDA protocol response: "+e.message);}
  });
  engine.stderr.setEncoding("utf8");
  engine.stderr.on("data",line=>{state.engine_stderr=String(line).slice(-2000);status()});
  engine.on("error",e=>error("CUDA process spawn: "+e.message));
  engine.on("exit",(code,signal)=>{
    engineReady=false;
    if(!closed)error("CUDA process exited "+code+" "+signal);
  });
}
function spawnReader(){
  reader=new Worker(new URL("./data-worker.mjs",import.meta.url),{
    workerData:{dataset:args.dataset,startRow:state.current_source_index+1}});
  reader.on("message",data=>{
    if(data.type==="ready"){
      dataReady=true;holdout=data.holdout;
      state.train_rows=data.trainRows;state.heldout_rows=data.heldOutRows;
      state.files=data.files;state.source_read=data.index;
      status("OpenThoughts reader ready: "+data.trainRows+" real training rows, "+data.heldOutRows+" held out");
      return;
    }
    if(data.type==="batch"){
      dataReading=false;
      state.source_read=data.index;
      if(!running||stopping){
        pendingRows=data.rows;
        state.step="Dataset batch decoded; held for resume, not silently trained";
        status();
        if(stopping&&!batchBusy)command("quit");
        return;
      }
      if(!data.rows.length){running=false;state.status="COMPLETE";status("All eligible dataset rows consumed");command("save");return}
      batchBusy=true;
      state.pending_job={phase:"Original Parquet decoded; waiting for vectorized CUDA",rows:data.rows.length,
        bytes:data.sourceBytes};
      status();
      command("batch",{rows:data.rows});
      return;
    }
    if(data.type==="fatal"){error("Original Parquet: "+data.error);return}
    if(data.type==="seek"){status("Source cursor moved to "+data.index);if(running)requestNext()}
  });
  reader.on("error",e=>error("Dataset worker: "+e.stack));
  reader.on("exit",code=>{if(code!==0&&!closed)error("Dataset reader exit "+code)});
}
function requestNext(){
  if(!engineReady||!dataReady||!running||batchBusy||dataReading||stopping)return;
  if(pendingRows){
    const rows=pendingRows;pendingRows=null;
    if(!rows.length){running=false;state.status="COMPLETE";command("save");return}
    batchBusy=true;status("Resuming previously decoded, untrained real dataset batch");
    command("batch",{rows});return;
  }
  if(state.current_source_index+1>=state.train_rows){
    running=false;state.status="COMPLETE";status("All training rows completed");command("save");return;
  }
  dataReading=true;reader.postMessage({cmd:"next",size:args.batch});
}
function processAction(body){
  const action=String(body.action||"").toLowerCase();
  if(action==="start"||action==="resume"){
    if(!engineReady||!dataReady)throw Error("Engine and real dataset must both be ready");
    if(state.status==="ERROR"||state.status==="STOPPED")throw Error("Cannot restart stopped/error CUDA worker");
    if(stopping)throw Error("Stop already requested");
    running=true;state.status="RUNNING";status("Running original OpenThoughts complete exercises on CUDA");
    requestNext();return{ok:true};
  }
  if(action==="pause"){
    running=false;state.status="PAUSED";status("Pause requested; current entire CUDA batch will finish");
    return{ok:true};
  }
  if(action==="save"){command("save");status("Checkpoint queued after in-flight CUDA work");return{ok:true};}
  if(action==="stop"){
    if(stopping)return{ok:true};
    stopping=true;running=false;state.status="STOPPING";status("Save and stop requested after current batch");
    if(!batchBusy&&!dataReading)command("quit");
    return{ok:true};
  }
  if(action==="batch"){
    setBatch(body.size);status("New batch size applied to NEXT complete CUDA batch");return{ok:true};
  }
  if(action==="test"){
    const prompt=String(body.prompt||"");
    if(!prompt.trim()||prompt.length>8192)throw Error("Prompt must be 1–8192 characters");
    command("generate",{prompt,max_output:Math.max(1,Math.min(256,Number(body.max_output)||96))});
    status("Prompt-only model test queued; no reference answer supplied");return{ok:true};
  }
  if(action==="reset"){
    if(body.confirm!=="RESET V44")throw Error("Type RESET V44 to archive and start a new session");
    if(batchBusy||dataReading)throw Error("Pause first and allow current full batch to finish");
    running=false;command("reset");
    status("Archiving existing V44 state before reset");return{ok:true};
  }
  throw Error("Unknown control "+action);
}
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,"http://127.0.0.1");
  if(req.method==="GET"&&STATIC[u.pathname]){
    const [file,ct]=STATIC[u.pathname];res.writeHead(200,{"Content-Type":ct,"Cache-Control":"no-store"});
    fs.createReadStream(path.join(HERE,file)).pipe(res);return;
  }
  if(req.method==="GET"&&u.pathname==="/events"){
    res.writeHead(200,{"Content-Type":"text/event-stream; charset=utf-8",
      "Cache-Control":"no-cache, no-transform","Connection":"keep-alive",
      "X-Accel-Buffering":"no"});
    SSE.add(res);res.write("event: state\ndata: "+JSON.stringify(expose())+"\n\n");
    req.on("close",()=>SSE.delete(res));return;
  }
  if(req.method==="GET"&&u.pathname==="/api/state")return sendJson(res,expose());
  if(req.method==="GET"&&u.pathname==="/api/history"){
    const limit=Math.max(1,Math.min(100,Number(u.searchParams.get("limit"))||40));
    const before=Number(u.searchParams.get("before"))||Number.MAX_SAFE_INTEGER;
    return sendJson(res,{items:journal.list(before,limit)});
  }
  if(req.method==="GET"&&u.pathname==="/api/exercise"){
    try{return sendJson(res,{item:journal.get(Number(u.searchParams.get("id")))})}
    catch(e){return sendJson(res,{error:e.message},500)}
  }
  if(req.method==="POST"&&u.pathname==="/api/control"){
    const origin=req.headers.origin;
    if(origin&&!origin.startsWith("http://127.0.0.1:")&&!origin.startsWith("http://localhost:"))
      return sendJson(res,{error:"Local-only controls"},403);
    let payload="",tooLarge=false;
    req.on("data",part=>{payload+=part;if(payload.length>16000){tooLarge=true;req.destroy()}});
    req.on("end",()=>{
      if(tooLarge)return sendJson(res,{error:"Control payload too large"},413);
      try{return sendJson(res,processAction(JSON.parse(payload||"{}")))}
      catch(e){return sendJson(res,{error:e.message},409)}
    });return;
  }
  sendJson(res,{error:"Not found"},404);
});
server.listen(args.port,"127.0.0.1",()=>{
  const port=server.address().port,href="http://127.0.0.1:"+port;
  console.log("MAGICPERSPECTIVE_V44="+href);
  console.log("CUDA preflight + real OpenThoughts loading; no V42/V43 process touched.");
  spawnEngine();
  if(args.open&&process.platform==="win32"){
    const ui=spawn("cmd.exe",["/c","start","",""+href],{detached:true,windowsHide:true,stdio:"ignore"});
    ui.on("error",()=>{});ui.unref();
  }
});
const ticker=setInterval(()=>{
  progressRate(Date.now(),0);
  if(SSE.size)push("heartbeat",{at:Date.now(),status:state.status,
    phase:state.step,age_ms:Date.now()-Date.parse(state.last_event_at)});
},250);
process.on("SIGINT",()=>{clearInterval(ticker);closed=true;try{command("quit")}catch{}});
