// Isolated local HTTP text lab. No imports from or writes to the original A/B/C runtime.
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {TextExperiment} from "./engine.mjs";
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(process.env.OCTOPUS_TEXT_RUNTIME||path.join(here,"../../runtime-transcend-epistemic-text-v1"));
const port=Number(process.env.OCTOPUS_TEXT_PORT||8833);
if(!Number.isInteger(port)||port<1024||port>65535||
 /runtime-a12|runtime-transcend-epistemic-abc|runtime-capital/i.test(root))
 throw Error("Refusing unsafe shared runtime or bad port");
await fs.mkdir(root,{recursive:true});
const slots=[path.join(root,"checkpoint-0.json"),path.join(root,"checkpoint-1.json")];
const digest=s=>crypto.createHash("sha256").update(s).digest("hex");
let generation=-1,recovered=false,badSlots=[];
async function recover(){
 let found=null,present=0;
 for(const file of slots){
   let raw;try{raw=await fs.readFile(file,"utf8");present++;}
   catch(e){if(e.code==="ENOENT")continue;throw e;}
   try{
     const wrap=JSON.parse(raw);
     if(wrap.schema!=="octopus-text-checkpoint-v1"||!Number.isSafeInteger(wrap.generation)||
        digest(JSON.stringify(wrap.state))!==wrap.hash)throw Error("Hash mismatch");
     const restored=TextExperiment.restore(wrap.state);
     if(!found||wrap.generation>found.generation)found={generation:wrap.generation,exp:restored};
   }catch(e){badSlots.push({file:path.basename(file),reason:String(e.message||e)});}
 }
 if(!found&&present>0)throw Error("All text checkpoints are invalid. No silent training reset: "+JSON.stringify(badSlots));
 if(found){generation=found.generation;recovered=true;return found.exp;}
 return new TextExperiment();
}
const exp=await recover();
let running=false,timer=null,closed=false,error=null,lastEvaluation=null,saving=null;
let task=Promise.resolve(),lastSave=Date.now();
function enqueue(fn){
 const p=task.then(fn);task=p.catch(e=>{error=String(e.stack||e);running=false;console.error(error);});
 return p;
}
async function save(reason="manual"){
 if(saving)return saving;
 saving=(async()=>{
   const next=generation+1,state=exp.serialize();
   const body=JSON.stringify({schema:"octopus-text-checkpoint-v1",
     generation:next,reason,at:new Date().toISOString(),state,
     hash:digest(JSON.stringify(state))});
   const destination=slots[next%2],tmp=destination+".tmp";
   await fs.writeFile(tmp,body,"utf8");await fs.rename(tmp,destination);
   generation=next;lastSave=Date.now();return{generation,episodes:exp.episodes,reason};
 })();
 try{return await saving;}finally{saving=null;}
}
async function oneTick(){
 if(!running||closed)return;
 try{
   await enqueue(async()=>{
     if(!running)return;
     exp.step(20);
     if(Date.now()-lastSave>15000)await save("autosave");
   });
 }catch{}
 if(running&&!closed)timer=setTimeout(oneTick,100);
}
function status(){
 return{ready:true,engine:"CPU TEXT NEXT-BYTE A/B/C — RESEARCH",running,
   episodes:exp.episodes,recovered,generation,error,badSlots,
   checkpointRoot:root,data:exp.snapshot(),evaluation:lastEvaluation};
}
const respond=(res,body,status=200)=>{
 res.writeHead(status,{"content-type":"application/json; charset=utf-8",
   "cache-control":"no-store","x-content-type-options":"nosniff"});
 res.end(JSON.stringify(body));
};
function input(req){
 return new Promise((resolve,reject)=>{
   let data="",size=0;
   req.on("data",chunk=>{size+=chunk.length;if(size>150000){reject(Error("Request too large"));req.destroy();return;}
     data+=chunk.toString("utf8");});
   req.on("end",()=>{try{resolve(JSON.parse(data||"{}"));}catch(e){reject(e);}});
   req.on("error",reject);
 });
}
const page=await fs.readFile(path.join(here,"visualizer.html"),"utf8");
const server=http.createServer(async(req,res)=>{
 try{
   if(req.method==="GET"&&(req.url==="/"||req.url==="/index.html")){
     res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store"});
     return res.end(page);
   }
   if(req.method==="GET"&&req.url==="/api/state")return respond(res,status());
   if(req.method==="POST"&&req.url==="/api/control"){
     const body=await input(req);
     if(body.action==="start"){
       if(error)throw Error("Training stopped because of server error: "+error);
       if(!running){running=true;timer=setTimeout(oneTick,0);}return respond(res,{ok:true});
     }
     if(body.action==="pause"){
       running=false;if(timer)clearTimeout(timer);
       return respond(res,await enqueue(async()=>({ok:true,saved:await save("pause")})));
     }
     if(body.action==="step"){
       if(running)throw Error("Pause before manual steps");
       const n=Number(body.count||1);
       if(!Number.isInteger(n)||n<1||n>5000)throw Error("1..5000 steps allowed");
       return respond(res,await enqueue(async()=>{exp.step(n);await save("manual-steps");
         return{ok:true,episodes:exp.episodes};}));
     }
     if(body.action==="evaluate"){
       if(running)throw Error("Pause training before frozen evaluation");
       return respond(res,await enqueue(async()=>{
         const before=JSON.stringify(exp.serialize());
         lastEvaluation=exp.evaluate(2000);
         if(before!==JSON.stringify(exp.serialize()))throw Error("Frozen evaluation mutated learner");
         return{ok:true,evaluation:lastEvaluation};
       }));
     }
     if(body.action==="save")return respond(res,await enqueue(async()=>({ok:true,saved:await save()})));
     throw Error("Unknown action");
   }
   if(req.method==="POST"&&req.url==="/api/corpus"){
     if(running)throw Error("Pause before curriculum change");
     const body=await input(req);
     if(typeof body.text!=="string")throw Error("Missing text");
     return respond(res,await enqueue(async()=>{
       await save("before-curriculum-change");
       exp.setCorpus(body.text);lastEvaluation=null;
       const saved=await save("new-curriculum");
       return{ok:true,trainingLines:exp.corpus.train.length,heldoutLines:exp.corpus.held.length,
         preservedEpisodes:exp.episodes,saved};
     }));
   }
   respond(res,{error:"Not found"},404);
 }catch(e){respond(res,{error:String(e.message||e)},400);}
});
async function shutdown(){
 if(closed)return;closed=true;running=false;if(timer)clearTimeout(timer);
 try{await task;await save("shutdown");}finally{server.close();}
}
process.on("SIGINT",()=>{shutdown().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});});
process.on("SIGTERM",()=>{shutdown().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1);});});
await new Promise((ok,fail)=>server.once("error",fail).listen(port,"127.0.0.1",ok));
console.log("OCTOPUS EPISTEMIC TEXT LAB http://127.0.0.1:"+port+"/");
console.log("Episodes:",exp.episodes,"checkpoint root:",root,"recovered:",recovered);
console.log("Original binary A/B/C, CUDA, and checkpoints are untouched.");
