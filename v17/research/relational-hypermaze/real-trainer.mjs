// MagicPerspective V24 REAL corpus training service. Original V17/V22 sources
// and checkpoints are untouched. Every prediction is frozen BEFORE the row is learned.
import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {setImmediate as yieldLoop} from "node:timers/promises";
import {fileURLToPath} from "node:url";
import {openRealSource} from "./real-data-source.mjs";
import {RealTextAtlas,normalize,scoreAnswer} from "./real-corpus-core.mjs";
import {readManifest,writeManifest,manifestName,legacyName} from "./real-checkpoint-store.mjs";

const dirname=path.dirname(fileURLToPath(import.meta.url));
const send=(res,status,payload)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8",
 "cache-control":"no-store","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(payload));};
const number=(s,defaultValue)=>s==null?defaultValue:Number(s);
const int=(n,min,max,label)=>{if(!Number.isSafeInteger(n)||n<min||n>max)throw Error("Invalid "+label+" (required "+min+".."+max+")");return n;};

export class RealTrainer{
 constructor({source,out,maxRecords=20000,maxAnswerChars=65536,saveEvery=5000,
  onlineEvery=25,limit=0,resume=false}={}){
  if(!source?.trainingFrom||!source?.heldOut)throw Error("Real corpus source required");
  this.source=source;this.out=path.resolve(out||path.join(dirname,"runtime-v24-real"));
  this.checkpoint=path.join(this.out,manifestName);
  this.legacyCheckpoint=path.join(this.out,legacyName);
  this.savedSegments=[];this.savedNextId=0;
  this.options={maxRecords:int(maxRecords,10,500000,"maxRecords"),
    maxAnswerChars:int(maxAnswerChars,256,1000000,"maxAnswerChars"),
    saveEvery:int(saveEvery,1,1000000,"saveEvery"),
    onlineEvery:int(onlineEvery,1,1000000,"onlineEvery"),
    limit:int(limit,0,1000000000,"limit")};
  this.resume=resume;this.targetRows=limit?Math.min(source.trainRows,limit):source.trainRows;
  this.model=new RealTextAtlas({maxRecords,maxAnswerChars});
  this.progress={cursor:0,onlineScored:0,onlineAnswerFound:0,onlineExact:0,
    onlineF1Sum:0,onlineExactQuestionRepeat:0,lastSavedCursor:0,
    startedAt:null,doneAt:null,evals:0};
  this.mode="idle";this.error=null;this.trace=null;this.traceHistory=[];this.heldout=null;
  this.events=[];this.loop=null;this.waiter=null;this.stopFlag=false;
  this.saveQueue=Promise.resolve();this.startedWall=0;this.startedAtRow=0;
 }
 async initialize(){
  await fsp.mkdir(this.out,{recursive:true});
  const exists=fs.existsSync(this.checkpoint)||fs.existsSync(this.legacyCheckpoint);
  if(exists&&!this.resume)throw Error("Existing V24 checkpoint (index or legacy); use --resume. No overwrite.");
  if(this.resume&&!exists)throw Error("--resume requested but no V24 checkpoint exists in "+this.out);
  if(exists){
   const saved=await readManifest(this.out,this.source,this.options,this.targetRows);
   this.model=saved.model;this.progress=saved.progress;
   this.heldout=saved.heldout||null;this.trace=saved.trace||null;
   this.traceHistory=(saved.traceHistory||[]).slice(-16);
   if(this.trace&&!this.traceHistory.some(t=>t.row===this.trace.row))
     this.traceHistory.push(this.trace);
   this.events=[...(saved.events||[]).slice(-119),
     {type:"resume",cursor:this.progress.cursor,time:Date.now()}];
   this.savedSegments=saved.segments||[];
   this.savedNextId=saved.lastSavedNextId||0;
   this.mode=this.progress.cursor>=this.targetRows?"finished":"paused";
   if(saved.format===1){
     // Before training further, atomically publish a new compact manifest.
     // atlas-v24.json is preserved byte-for-byte as a recovery copy.
     await this.save();
     this.events.push({type:"migration",cursor:this.progress.cursor,time:Date.now()});
   }
  }
  return this;
 }
 status(){
  const active=this.mode==="running"||this.mode==="paused";
  const denom=this.source.trainRows;
  return {version:24,mode:this.mode,error:this.error,
    progress:{...this.progress,
      trainRows:denom,heldOut:this.source.heldRows,targetRows:this.targetRows,
      consumedPercent:denom?100*this.progress.cursor/denom:0,
      remaining:denom-this.progress.cursor,limitActive:this.targetRows<denom,
      datasetFullyConsumed:this.progress.cursor===denom},
    atlas:this.model.summary(),heldout:this.heldout,
    traceHistory:this.traceHistory.map(t=>({row:t.row,found:t.found,exact:t.exact,
      wordF1:t.wordF1,steps:t.route?.length||0,question:t.question.slice(0,160)})),
    lastTrace:this.trace?{row:this.trace.row,question:this.trace.question,
      predicted:this.trace.predicted,found:this.trace.found,exact:this.trace.exact,
      wordF1:this.trace.wordF1,beforeAction:true,routeSteps:this.trace.route?.length||0}:null,
    input:{kind:this.source.kind,root:this.source.root,totalRows:this.source.totalRows,
      trainRows:this.source.trainRows,heldRows:this.source.heldRows,files:this.source.files},
    backend:{graph:"Node.js CPU",cudaTextShapeVerified:false,
      note:"Original V17 CUDA worlds are separate; do not report this graph as CUDA training"},
    checkpoint:{file:this.checkpoint,legacyFile:this.legacyCheckpoint,
      legacyRetained:fs.existsSync(this.legacyCheckpoint),savedCursor:this.progress.lastSavedCursor,
      segmentCount:this.savedSegments.length},
    throughput:{rowsPerSecond:this.startedWall>0&&this.mode==="running"?
      (this.progress.cursor-this.startedAtRow)*1000/Math.max(1,Date.now()-this.startedWall):0,
      totalProcessed:this.progress.cursor}};
 }
 _release(){if(this.waiter){const wake=this.waiter;this.waiter=null;wake();}}
 start(){
  if(this.mode==="error")throw Error("Previous training failure; repair and resume from saved checkpoint");
  if(this.mode==="finished"||this.progress.cursor>=this.targetRows)throw Error("Training target already reached");
  if(this.loop){this.mode="running";this._release();return;}
  this.stopFlag=false;this.mode="running";this.startedWall=Date.now();
  this.startedAtRow=this.progress.cursor;
  this.progress.startedAt||=new Date().toISOString();
  this.loop=this._pump().catch(e=>{this.error=e.stack||e.message;this.mode="error";
    this.events.push({type:"fatal",message:e.message,time:Date.now()});}).finally(()=>{this.loop=null;});
 }
 pause(){if(this.mode!=="running")return false;this.mode="paused";return true;}
 async stop(){this.stopFlag=true;this._release();
  if(this.loop)await this.loop;
  if(this.mode!=="finished"&&this.mode!=="error")this.mode="stopped";
  await this.save();return this.status();}
 async _pump(){
  try{
   for await(const row of this.source.trainingFrom(this.progress.cursor)){
    if(row.index>=this.targetRows||this.stopFlag)break;
    while(this.mode==="paused"&&!this.stopFlag)await new Promise(r=>{this.waiter=r;});
    if(this.stopFlag)break;
    if(row.index!==this.progress.cursor)throw Error("Dataset cursor discontinuity at "+row.index);
    // Predict BEFORE seeing the current answer in training.
    if(row.index%this.options.onlineEvery===0){
     const plan=this.model.predict(row.prompt,{seed:row.index+17});
     const score=scoreAnswer(plan.answer,row.answer);
     this.progress.onlineScored++;
     this.progress.onlineAnswerFound+=Number(plan.found);
     this.progress.onlineExact+=score.exact;
     this.progress.onlineF1Sum+=score.wordF1;
     const exactOld=plan.learnedContexts?.some(c=>normalize(c.question)===normalize(row.prompt))||false;
     this.progress.onlineExactQuestionRepeat+=Number(exactOld);
     this.trace={row:row.index,beforeAction:plan.beforeAction,method:plan.method,
       question:row.prompt.slice(0,5000),predicted:plan.answer.slice(0,5000),
       actual:row.answer.slice(0,2000),
       found:plan.found,exact:score.exact,wordF1:score.wordF1,
       dimensions:plan.dimensions,axisLabels:plan.axisLabels,
       reason:plan.reason,route:plan.route,
       nodes:plan.nodes,edges:plan.edges,field:plan.field,
       hypotheses:plan.learnedContexts,
       note:"PRE-UPDATE sampled online score, not frozen held-out accuracy"};
     this.traceHistory.push(this.trace);if(this.traceHistory.length>16)this.traceHistory.shift();
     this.events.push({type:"prediction",row:row.index,found:plan.found,
       exact:score.exact,wordF1:score.wordF1,time:Date.now()});
     if(this.events.length>120)this.events.shift();
    }
    this.model.observe(row.prompt,row.answer,{sourceRow:row.index});
    this.progress.cursor=row.index+1;
    if(this.progress.cursor%this.options.saveEvery===0)await this.save();
    if(this.progress.cursor%1000===0)console.log("V24_REAL_PROGRESS",JSON.stringify({
      cursor:this.progress.cursor,trained:this.model.stats.accepted,
      evaluated:this.progress.onlineScored,correct:this.progress.onlineExact,
      exactPercent:this.progress.onlineScored?100*this.progress.onlineExact/this.progress.onlineScored:0,
      wordF1Percent:this.progress.onlineScored?100*this.progress.onlineF1Sum/this.progress.onlineScored:0,
      saved:this.progress.lastSavedCursor}));
    if(this.progress.cursor%32===0)await yieldLoop();
   }
   if(this.progress.cursor>=this.targetRows){
    this.mode="finished";this.progress.doneAt=new Date().toISOString();
    await this.evaluateHeldout();await this.save();
   }else if(this.stopFlag){this.mode="stopped";await this.save();}
  }catch(e){this.mode="error";this.error=e.stack||e.message;
   throw e;}
 }
 async evaluateHeldout(){
  const before=JSON.stringify(this.model.summary());
  const rows=await this.source.heldOut();
  if(rows.length!==this.source.heldRows)throw Error("Held-out partition count mismatch");
  let found=0,exact=0,f1=0,nonDuplicate=0,nonDuplicateExact=0,nonDuplicateFound=0;
  const samples=[];
  for(const row of rows){
   const pred=this.model.predict(row.prompt,{seed:992331+row.index});
   const score=scoreAnswer(pred.answer,row.answer);
   const wasExactQuestion=pred.learnedContexts?.some(c=>
     normalize(c.question)===normalize(row.prompt))||false;
   found+=Number(pred.found);exact+=score.exact;f1+=score.wordF1;
   if(!wasExactQuestion){nonDuplicate++;nonDuplicateExact+=score.exact;nonDuplicateFound+=Number(pred.found);}
   if(samples.length<10)samples.push({index:row.index,found:pred.found,
     exact:score.exact,wordF1:score.wordF1,duplicateQuestion:wasExactQuestion,
     predictedPreview:pred.answer.slice(0,120),routeSteps:pred.route.length});
  }
  if(before!==JSON.stringify(this.model.summary()))
   throw Error("Held-out evaluation mutated training memory");
  this.progress.evals++;
  this.heldout={count:rows.length,found,fullExact:exact,meanWordF1:rows.length?f1/rows.length:0,
   nonDuplicate,nonDuplicateFound,nonDuplicateExact,
   heldOutIsNeverTrained:true,answerUsedOnlyAfterPlan:true,samples,
   warning:"Retrieval of witnessed answers, NOT new answer generation"};
  this.events.push({type:"heldout",cursor:this.progress.cursor,
    fullExact:exact,count:rows.length,time:Date.now()});
  return this.heldout;
 }
 save(){
  const task=this.saveQueue.then(async()=>{
   const saved=await writeManifest({
    out:this.out,source:this.source,options:this.options,
    progress:this.progress,model:this.model,trace:this.trace,
    traceHistory:this.traceHistory,events:this.events,
    heldout:this.heldout,previousSegments:this.savedSegments,
    lastSavedNextId:this.savedNextId
   });
   this.savedSegments=saved.segments;
   this.savedNextId=saved.lastSavedNextId;
   this.progress.lastSavedCursor=this.progress.cursor;
   return {saved:true,cursor:this.progress.cursor,file:saved.manifest,
     segmentCount:saved.segments.length};
  });
  this.saveQueue=task.catch(()=>{});
  return task;
 }

}
export async function makeHTTP(trainer,{port=8899,host="127.0.0.1"}={}){
 const html=await fsp.readFile(path.join(dirname,"real-live.html"),"utf8");
 const server=http.createServer(async(req,res)=>{
  const h=(req.headers.host||"").split(":")[0].toLowerCase();
  if(h!=="localhost"&&h!=="127.0.0.1"){send(res,403,{error:"Loopback host only"});return;}
  const origin=req.headers.origin;
  if(origin&&origin!==("http://"+req.headers.host)){
   send(res,403,{error:"Cross-origin control blocked"});return;}
  const u=new URL(req.url,"http://127.0.0.1");
  try{
   if(req.method==="GET"&&(u.pathname==="/"||u.pathname==="/index.html")){
    res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store",
     "content-security-policy":"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-src http://127.0.0.1:* http://localhost:*; connect-src 'self';"});
    res.end(html);return;
   }
   if(req.method==="GET"&&u.pathname==="/api/status")return send(res,200,trainer.status());
   if(req.method==="GET"&&u.pathname==="/api/trace"){
    const row=u.searchParams.get("row");
    const selected=row==null?trainer.trace:trainer.traceHistory.find(t=>t.row===Number(row));
    return send(res,200,selected||{reason:"NO_SAMPLED_PREACTION_TRACE"});
   }
   if(req.method==="GET"&&u.pathname==="/api/trace-history")return send(res,200,
    trainer.traceHistory.map(t=>({row:t.row,found:t.found,exact:t.exact,wordF1:t.wordF1,
      steps:t.route?.length||0,question:t.question.slice(0,120)})));
   if(req.method==="GET"&&u.pathname==="/api/events")return send(res,200,trainer.events);
   if(req.method==="GET"&&u.pathname==="/api/health")return send(res,200,{ok:trainer.mode!=="error",mode:trainer.mode});
   if(req.method==="POST"){
    let content="";for await(const part of req){content+=part;
     if(content.length>100000){send(res,413,{error:"Request too large"});return;}}
    let data={};if(content){try{data=JSON.parse(content);}catch{return send(res,400,{error:"Invalid JSON"});}}
    if(u.pathname==="/api/predict"){
     if(typeof data.prompt!=="string"||data.prompt.length>200000)return send(res,400,{error:"Valid prompt required"});
     return send(res,200,trainer.model.predict(data.prompt,{
       seed:int(number(data.seed,17),0,2147483647,"seed"),
       temperature:Number(data.temperature)||0}));
    }
    if(u.pathname==="/api/control"){
     const act=data.action;
     if(act==="start"||act==="resume")trainer.start();
     else if(act==="pause")trainer.pause();
     else if(act==="stop")await trainer.stop();
     else if(act==="save")await trainer.save();
     else if(act==="evaluate")await trainer.evaluateHeldout();
     else return send(res,400,{error:"Unknown action"});
     return send(res,200,trainer.status());
    }
   }
   return send(res,404,{error:"Not found"});
  }catch(e){return send(res,409,{error:e.message});}
 });
 await new Promise((ok,no)=>{server.once("error",no);server.listen(port,host,ok);});
 return server;
}
export async function main(argv=process.argv.slice(2)){
 const get=(name,defaultValue=null)=>{const i=argv.indexOf("--"+name);return i<0?defaultValue:argv[i+1];};
 const source=await openRealSource({data:get("data"),jsonl:get("jsonl"),
   qaTxt:get("qa-txt"),held:int(number(get("held"),16),1,1000,"held")});
 const out=path.resolve(get("out",path.join(dirname,"runtime-v24-real")));
 const runner=new RealTrainer({source,out,resume:argv.includes("--resume"),
   maxRecords:int(number(get("max-records"),20000),10,500000,"max-records"),
   maxAnswerChars:int(number(get("max-answer-chars"),65536),256,1000000,"max-answer-chars"),
   saveEvery:int(number(get("save-every"),5000),1,1000000,"save-every"),
   onlineEvery:int(number(get("online-every"),25),1,1000000,"online-every"),
   limit:int(number(get("limit"),0),0,1000000000,"limit")});
 await runner.initialize();
 const port=int(number(get("port"),8899),1024,65535,"port");
 const server=await makeHTTP(runner,{port});
 console.log("MAGICPERSPECTIVE V24 REAL CORPUS Native Discoverer.shape");
 console.log(JSON.stringify({url:"http://127.0.0.1:"+port,source:runner.status().input,
   output:runner.checkpoint,resuming:runner.resume,backend:"Node CPU graph; CUDA not claimed"}));
 if(argv.includes("--start"))runner.start();
 let quitting=false;
 process.on("SIGINT",()=>{if(quitting)return;quitting=true;
  runner.stop().then(()=>server.close(()=>process.exit(0))).catch(e=>{console.error(e);process.exitCode=1;server.close();});});
 process.on("SIGTERM",()=>{if(quitting)return;quitting=true;
  runner.stop().then(()=>server.close(()=>process.exit(0))).catch(e=>{console.error(e);process.exitCode=1;server.close();});});
 return {runner,server};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error("V24 startup failed:",e.stack||e.message);process.exitCode=1;});
}
