#!/usr/bin/env node
// MagicPerspective / Living Labyrinth — real source observations only.
// Native V17 text model, OR labeled action-transition memory.
// No fake data, no overwrite of original UI/Brain, no CUDA claim.
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import readline from "node:readline";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import {Brain} from "../../transcend/torus-aether/devour/brain.mjs";
import {tokenize} from "../../transcend/torus-aether/language-universe/perspectives.mjs";
import {openTextDataset} from "../../transcend/torus-aether/data/text-dataset.mjs";
import {LearnedPathMemory} from "./learned-path-memory.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const flag=k=>{const i=process.argv.indexOf("--"+k);return i<0?null:process.argv[i+1]??"";};
const has=k=>process.argv.includes("--"+k);
const mode=flag("events")?"events":flag("text")?"text":flag("data")?"parquet":null;
if(!mode||!flag("out")){console.error("Usage: node magic-live.mjs (--data PARQUET_DIR | --text TXT_FILE | --events FILE.jsonl) --out NEW_DIR [--port 8877] [--resume]");process.exit(2);}
const source=path.resolve(flag(mode==="events"?"events":mode==="text"?"text":"data")),out=path.resolve(flag("out"));
const port=Number(flag("port")||8877),maxRows=Math.max(0,Number(flag("max-rows")||0));
const batch=Math.max(1,Math.min(100,Number(flag("batch")||2)));
const rowChars=Math.max(128,Math.min(30000,Number(flag("row-chars")||2400)));
if(!Number.isInteger(port)||port<1024||port>65535)throw Error("Invalid port");
if(!fs.existsSync(source))throw Error("Source missing: "+source);
if(out===source||out.startsWith(source+path.sep))throw Error("Output must be outside source");
const savePath=path.join(out,mode==="events"?"path-memory.json":"brain-live.v8");
const metaPath=path.join(out,"progress.json"),journal=path.join(out,"observed-live.jsonl");
const resume=has("resume");
if(resume&&(!fs.existsSync(savePath)||!fs.existsSync(metaPath)))throw Error("Resume requires checkpoint and progress.json");
if(!resume&&fs.existsSync(out)&&fs.readdirSync(out).length)throw Error("Output directory not empty; refusing overwrite");
fs.mkdirSync(out,{recursive:true});
let brain=mode==="events"?null:resume?Brain.load(savePath):new Brain({rules:"winner",seed:Number(flag("seed")||17)});
let learner=mode==="events"?resume?LearnedPathMemory.restore(JSON.parse(fs.readFileSync(savePath,"utf8"))):new LearnedPathMemory():null;
let progress=resume?JSON.parse(fs.readFileSync(metaPath,"utf8")):{
  schema:1,mode,source,position:-1,rows:0,tokens:0,created:new Date().toISOString()};
if(progress.mode!==mode||progress.source!==source)throw Error("Checkpoint source mismatch");
let running=has("start"),finished=false,busy=false,rate=Math.max(1,Math.min(30,Number(flag("rate")||6)));
let fault=null,frozen=null,last=null,recent=[],clients=new Set(),saved=null,sourceInfo={mode},started=Date.now();
const rawText=x=>String(x??"");
const fragment=(x,n=160)=>rawText(x).slice(0,n);
const rec=e=>{const item={...e,time:new Date().toISOString()};recent.push(item);if(recent.length>120)recent.shift();
 fs.appendFileSync(journal,JSON.stringify(item)+"\n");};
const split=p=>parseInt(createHash("sha256").update(p.trim()).digest("hex").slice(0,8),16)%1000;
async function* paragraphs(file){
 const rs=fs.createReadStream(file,{encoding:"utf8"}),lines=readline.createInterface({input:rs,crlfDelay:Infinity});
 const group=[];
 try{for await(const line of lines){
  if(!line.trim()){if(group.length){yield group.join("\n");group.length=0;}}
  else group.push(line);
 }if(group.length)yield group.join("\n");}finally{lines.close();rs.destroy();}
}
async function* rows(){
 if(mode==="parquet"){
  const d=await openTextDataset(source),reserve=Math.max(1,Math.min(128,Math.floor(d.trainRows/10)));
  const trainRows=d.trainRows-reserve;
  sourceInfo={mode,trainRows,validationRows:reserve,finalHeldOutRows:d.held,files:d.files.length};
  for(let i=0;i<trainRows;i++){
   if(i<=progress.position)continue;
   const e=await d.exercise(i);
   yield {position:i,text:"Q: "+e.prompt+"\nA: "+e.answer};
  }
 }else if(mode==="text"){
  sourceInfo={mode,split:"SHA256 paragraph; 80% train, 10% validation, 10% final test"};
  let i=0;
  for await(const p of paragraphs(source)){
   if(split(p)>=800)continue;
   const position=i++;
   if(position<=progress.position)continue;
   yield {position,text:p};
  }
 }else{
  let count=0;for await(const line of readline.createInterface({input:fs.createReadStream(source),crlfDelay:Infinity}))if(line.trim())count++;
  const trainRows=Math.floor(count*.8);
  if(trainRows<80)throw Error("Need at least 100 labeled transition records for train+test");
  sourceInfo={mode,trainRows,finalHeldOutRows:count-trainRows,format:"JSONL before/action/after"};
  let i=0;for await(const line of readline.createInterface({input:fs.createReadStream(source),crlfDelay:Infinity})){
   if(!line.trim())continue;
   const position=i++;if(position>=trainRows)break;
   if(position<=progress.position)continue;
   yield {position,event:JSON.parse(line)};
  }
 }
}
const iter=rows()[Symbol.asyncIterator]();
function getGraph(){
 if(mode!=="events"){
  const selected=[...new Set((last?.tokens||[]).slice(-24))],ids=new Set(selected),edges=[];
  for(const from of selected)for(const [to,value] of [...(brain.language.edges.get(from)||new Map())].sort((a,b)=>b[1]-a[1]).slice(0,4)){
   if(ids.has(to))edges.push({from,to,value});
  }
  return {nodes:selected.map(id=>({id,label:fragment(id,18)})),edges,meaning:"Real edges and counts learned from native V17 text"};
 }
 const edges=recent.filter(x=>x.kind==="transition").slice(-20).filter(x=>x.before&&x.after).map(x=>({
  from:JSON.stringify(x.before.slice(0,3)),to:JSON.stringify(x.after.slice(0,3)),value:1,label:x.action}));
 const ids=[...new Set(edges.flatMap(x=>[x.from,x.to]))].slice(-35);
 return {nodes:ids.map(id=>({id,label:id})),edges:edges.filter(x=>ids.includes(x.from)&&ids.includes(x.to)),
  meaning:"Actual observed action transitions projected onto first 3 coordinates"};
}
function modelInfo(){
 if(mode!=="events"){
  const m=brain.language.report();
  return {tokens:m.observedTokens,states:m.states,trust:m.trust,
   observedOperators:brain.observedTransformations.operators.size,edges:m.edges,
   recentEditEvidence:[...brain.observedTransformations.operators.values()].slice(-5).map(x=>({
    kind:x.kind,from:x.from,to:x.to,support:x.sourceObservations,evidence:x.evidence?.slice(0,1)}))};
 }
 return learner.model?{...learner.model,actions:Object.keys(learner.model.actions),
  trainingEvents:learner.examples.length}:
  {trainingEvents:learner.examples.length,learnedAxes:null,reason:"Need action-labeled observations to identify axes"};
}
function snap(){
 return {version:1,title:"MAGIC PERSPECTIVE — LIVING LABYRINTH",mode,source,sourceInfo,
  state:{running,busy,finished,fault,rate,rows:progress.rows,tokens:progress.tokens,
   position:progress.position,seconds:(Date.now()-started)/1000,saved},
  model:modelInfo(),graph:getGraph(),last,recent:recent.slice(-34),frozen,
  truth:mode==="events"?
    "Actual labeled action observations; independent held-out next-state testing. No hardcoded signed-area, but numeric grammar restriction. CPU.":
    "Original V17 text model training on corpus data, not an xD semantic-action planner. Prediction made before paragraph training. CPU."};
}
const publish=()=>{const message="data: "+JSON.stringify(snap())+"\n\n";
 for(const r of clients){try{r.write(message);}catch{clients.delete(r);}}};
async function save(){
 if(brain)brain.save(savePath);else {fs.writeFileSync(savePath+".tmp",JSON.stringify(learner.export()));fs.renameSync(savePath+".tmp",savePath);}
 const tmp=metaPath+".tmp";fs.writeFileSync(tmp,JSON.stringify(progress,null,2));fs.renameSync(tmp,metaPath);saved=new Date().toISOString();
}
const numbers=x=>Array.isArray(x)?x.map(Number):String(x).match(/-?\d+/g)?.map(Number)||null;
async function learn(row){
 if(mode!=="events"){
  const input=rawText(row.text).slice(0,rowChars),tokens=tokenize(input),history=[],samples=[];
  for(const expected of tokens){
   const pred=brain.language.candidates(history);
   samples.push({expected,predicted:pred.token,scale:pred.scale,
    match:pred.token===expected,alternatives:pred.alternatives.slice(0,3)});
   history.push(expected);if(history.length>32)history.shift();
  }
  const beforeHits=samples.reduce((a,b)=>a+ +(b.match),0);
  const actual=brain.liveLanguage(input);
  const operators=brain.learnObservedTransformations(input);
  last={kind:"text",source:"Before training on this paragraph",position:row.position,
   passage:fragment(input,500),tokens:tokens.slice(-24),
   correctBeforeTraining:beforeHits,comparedTokens:tokens.length,
   accuracyBeforeTraining:tokens.length?beforeHits/tokens.length:null,
   predictions:samples.slice(-16),learnedOperators:operators.newOperators,
   shape:brain.language.navigate(tokens.slice(0,Math.min(8,tokens.length)).join(" "),
    {steps:12,useField:false}).path};
  rec({kind:"text",position:row.position,passage:fragment(input,200),
   correct:beforeHits,total:tokens.length,lastPredictions:samples.slice(-5)});
  progress.tokens+=actual.tokens;
 }else{
  const e=row.event;
  if(!e||typeof e.action!=="string"||e.before===undefined||e.after===undefined)
   throw Error("Invalid labeled observation at row "+row.position);
  let before=numbers(e.before),after=numbers(e.after),predicted=null;
  if(learner.model&&before&&after&&learner.model.actions[e.action])
   predicted=learner.move(before,e.action);
  const dep=learner.model?.dependent,error=predicted?predicted[dep]-after[dep]:null;
  last={kind:"transition",position:row.position,action:e.action,before,observed:after,
   predicted,error,match:error===null?null:Math.abs(error)<1e-6,
   independentResultObserved:true};
  learner.observe(e.before,e.action,e.after);
  if(learner.examples.length>=100&&learner.examples.length%50===0){
   try{learner.fit();fault=null;}catch(err){fault="Model not yet identified: "+err.message;}
  }
  rec({kind:"transition",position:row.position,action:e.action,before,after,predicted,error});
 }
 progress.position=row.position;progress.rows++;
}
async function tick(){
 if(!running||busy||finished)return;busy=true;
 try{
  for(let n=0;n<batch;n++){
   if(!running)break;
   if(maxRows&&progress.rows>=maxRows){finished=true;break;}
   const record=await iter.next();
   if(record.done){finished=true;break;}
   await learn(record.value);
  }
  if(finished){running=false;if(learner&&learner.examples.length&&!learner.model)learner.fit();await save();}
  else if(progress.rows>0&&progress.rows%100===0)await save();
 }catch(err){fault="Paused: "+err.message;running=false;console.error(fault);}
 finally{busy=false;publish();}
}
let timer=setInterval(tick,Math.max(40,1000/rate));
async function evaluate(){
 const count=brain?brain.language.seen:learner.examples.length,entries=[];
 if(mode==="parquet"){
  const d=await openTextDataset(source);
  for(let i=0;i<d.held;i++){const e=await d.heldOut(i);entries.push(("Q: "+e.prompt+"\nA: "+e.answer).slice(0,rowChars));}
 }else if(mode==="text"){
  for await(const p of paragraphs(source)){if(split(p)>=900){entries.push(p.slice(0,rowChars));if(entries.length>=30)break;}}
 }else{
  let i=0;
  for await(const line of readline.createInterface({input:fs.createReadStream(source),crlfDelay:Infinity})){
   if(!line.trim())continue;
   if(i++<(sourceInfo.trainRows??Infinity))continue;
   entries.push(JSON.parse(line));if(entries.length>=300)break;
  }
 }
 if(!entries.length)throw Error("No real held-out samples available");
 if(brain){
  let correct=0,known=0,total=0,baseline=[];
  for(const text of entries){
   const r=brain.language.evaluate(text,{useField:false,limit:2000});
   correct+=r.accuracy===null?0:r.accuracy*r.known;known+=r.known;total+=r.tokens;
   if(r.oneTokenBaseline!==null)baseline.push(r.oneTokenBaseline);
  }
  frozen={mode:"Native V17 frozen final test",samples:entries.length,tokens:total,
   known,accuracy:known?correct/known:null,meanBigram:baseline.length?
    baseline.reduce((a,b)=>a+b,0)/baseline.length:null};
 }else{
  if(!learner.model)throw Error("Need a trained path memory model");
  let n=0,exact=0,abs=0;
  const examples=[];
  for(const e of entries){
   const a=numbers(e.before),b=numbers(e.after);
   if(!a||!b)continue;
   const pred=learner.move(a,e.action),delta=Math.abs(pred[learner.model.dependent]-b[learner.model.dependent]);
   exact+=+(delta<1e-6);abs+=delta;n++;
   if(examples.length<10)examples.push({action:e.action,before:a,predicted:pred,observed:b,delta});
  }
  frozen={mode:"Frozen action-labelled final test",samples:n,accuracy:n?exact/n:null,
   mae:n?abs/n:null,examples};
 }
 if((brain?brain.language.seen:learner.examples.length)!==count)throw Error("Evaluation contaminated training");
 publish();return frozen;
}
const json=(res,obj,status=200)=>{res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store"});res.end(JSON.stringify(obj));};
const index=path.join(here,"magic-live.html");
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,"http://localhost");
 try{
  if(req.method==="GET"&&url.pathname==="/"){res.writeHead(200,{"content-type":"text/html; charset=utf-8"});return fs.createReadStream(index).pipe(res);}
  if(req.method==="GET"&&url.pathname==="/api/state")return json(res,snap());
  if(req.method==="GET"&&url.pathname==="/api/export")return json(res,snap());
  if(req.method==="GET"&&url.pathname==="/api/events"){
   res.writeHead(200,{"content-type":"text/event-stream","cache-control":"no-store","connection":"keep-alive"});
   clients.add(res);res.write("data: "+JSON.stringify(snap())+"\n\n");req.on("close",()=>clients.delete(res));return;
  }
  if(req.method==="POST"&&url.pathname==="/api/control"){
   let data="";for await(const x of req){data+=x;if(data.length>20000)throw Error("Too much input");}
   const {command,value}=JSON.parse(data||"{}");
   if(command==="start"){if(finished)throw Error("This dataset pass is finished; start a separate run to replay");running=true;fault=null;}
   else if(command==="pause")running=false;
   else if(command==="save")await save();
   else if(command==="speed"){rate=Math.max(1,Math.min(30,Number(value)||1));clearInterval(timer);timer=setInterval(tick,Math.max(40,1000/rate));}
   else if(command==="evaluate")await evaluate();
   else if(command==="path"){
    if(!learner?.model)throw Error("Load and train action-labeled observations first");
    if(!Array.isArray(value?.start)||!Array.isArray(value?.goal))throw Error("Start state and 2 visible target controls required");
    last={...last,plannedShape:learner.plan(value.start,value.goal,{maxSteps:Math.min(50,Math.max(1,Number(value.maxSteps)||16))})};
   }else throw Error("Unknown command");
   publish();return json(res,{ok:true,state:snap()});
  }
  return json(res,{error:"No route"},404);
 }catch(e){console.error(e);return json(res,{error:e.message},400);}
});
process.on("SIGINT",async()=>{running=false;clearInterval(timer);try{await save();}finally{server.close(()=>process.exit(0));}});
server.listen(port,"127.0.0.1",()=>console.log(JSON.stringify({
 event:"MAGIC_LIVE_READY",url:"http://127.0.0.1:"+port,mode,source,out,running,
 truth:"Real observations; original V17 unchanged; all experimental steps observable"})));
