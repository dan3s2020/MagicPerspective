// MagicPerspective Real Studio: a local-only read/write interface for the UNMODIFIED
// native V17 devour backend. All training originates in devour/worker.mjs. Research
// tests execute as actual child processes and NEVER masquerade as live learned weights.
// No production Brain, CUDA code, checkpoint, or original V17 UI is changed.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const v17=path.resolve(here,"..");
const assets=path.resolve(here,".");
const allowed=new Map([
 ["GET",new Set(["/graphs","/graph","/state","/telemetry","/shared-eval-status"])],
 ["POST",new Set(["/control","/add","/controls","/gpu","/eval","/language-maze",
   "/composition-plan","/language-eval","/constructed-paths-eval","/perspective-eval",
   "/exam","/shared-eval","/chat"])]
]);
const tests={
 "axes":{label:"Noduri · axe locale · trasee nevăzute",file:"tests/local-axis-transport-shapes.test.mjs"},
 "language":{label:"Limbaj matematic · operatori învățați",file:"tests/math-language-transformation-shapes.test.mjs"},
 "coupled":{label:"Axe + cuvinte · trasee anticipate",file:"tests/coupled-symbolic-local-axes.test.mjs"},
 "2048states":{label:"11 axe · 2.048 stări",file:"tests/xd-2048-states-local-language.test.mjs"},
 "chance":{label:"2048 · direcție și noise real",file:"tests/2048-stochastic-world.test.mjs"},
 "native":{label:"Control negativ: geometrie pe textul real V17",file:"tests/native-geometry-hybrid-text.test.mjs"},
 "context":{label:"Control negativ: contexte textuale",file:"tests/native-context-axis-geometry.test.mjs"}
};
const json=(res,data,status=200)=>{
 if(res.headersSent)return;
 res.writeHead(status,{"content-type":"application/json; charset=utf-8","cache-control":"no-store",
  "x-content-type-options":"nosniff"});
 res.end(JSON.stringify(data));
};
const append=(current,chunk,cap=350000)=>{
 const s=current+String(chunk);
 return s.length>cap?s.slice(-cap):s;
};
const extractResults=output=>{
 const entries=[];
 for(const line of String(output).split("\n")){
  const match=line.match(/(?:^|\s)([A-Z][A-Z0-9_]{5,}) (\{.*\}|\[.*\])\s*$/);
  if(!match)continue;
  try{entries.push({name:match[1],data:JSON.parse(match[2])});}catch{}
 }
 return entries.slice(-60);
};
export function createMagicStudio({port=8872,backendPort=8871,host="127.0.0.1",archiveDir=null}={}){
 if(!Number.isInteger(+port)||+port<0||+port>65535||
    !Number.isInteger(+backendPort)||+backendPort<1||+backendPort>65535)throw Error("Invalid ports");
 const target="http://127.0.0.1:"+backendPort;
 if(archiveDir)fs.mkdirSync(archiveDir,{recursive:true});
 const state={job:null,last:[],seq:0};
 const staticMap=new Map([
  ["/","magic-studio.html"],["/magic-studio.html","magic-studio.html"],
  ["/magic-studio.css","magic-studio.css"],["/magic-studio.js","magic-studio.js"]
 ]);
 const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8"};
 let server;
 const handler=async(req,res)=>{
  try{
   const u=new URL(req.url,"http://127.0.0.1"),name=u.pathname;
   if(req.method==="GET"&&staticMap.has(name)){
     const file=path.join(assets,staticMap.get(name));
     if(!fs.existsSync(file))return json(res,{error:"UI asset missing"},404);
     res.writeHead(200,{"content-type":types[path.extname(file)],"cache-control":"no-store",
       "x-content-type-options":"nosniff","content-security-policy":"default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'"});
     return fs.createReadStream(file).pipe(res);
   }
   if(req.method==="GET"&&name==="/api/info")return json(res,{
    name:"MagicPerspective V17 — Real Studio",source:"native-devour-worker",
    backend:target,port:server?.address()?.port??+port,
    liveTraining:true,trainingSimulated:false,
    originalSourceModified:false,experimentalBrainIntegration:false,
    worlds:["text","maze","transform","selfcode"],arms:["winner","stable+many","stable+grow","grow","many","log","event","concepts"],
    research: Object.entries(tests).map(([id,x])=>({id,label:x.label,kind:"independent-real-test-not-production-training"})),
    caveat:"Experimental local-axis modules are NOT connected to native AligningGraph.write. Research test results are kept separate."
   });
   if(req.method==="GET"&&name==="/api/health"){
     try{const response=await fetch(target+"/graphs",{signal:AbortSignal.timeout(1800)});
       if(!response.ok)throw Error("Native returned "+response.status);
       const d=await response.json();return json(res,{backend:"connected",slots:d.graphs?.length||0,gpu:d.gpu||null});
     }catch(e){return json(res,{backend:"offline",error:String(e.message||e)},503);}
   }
   if(req.method==="GET"&&name==="/api/research/status"){
     const job=state.job;
     return json(res,{current:job?{...job,process:undefined}:null,
       history:state.last.map(x=>({...x,process:undefined}))});
   }
   if(req.method==="POST"&&name==="/api/research/run"){
     const kind=u.searchParams.get("kind");
     if(!tests[kind])return json(res,{error:"Unknown research experiment"},400);
     if(state.job?.status==="running")return json(res,{error:"Research experiment already running",job:state.job.id},409);
     const spec=tests[kind],file=path.join(v17,spec.file);
     if(!fs.existsSync(file))return json(res,{error:"Missing test source: "+spec.file},404);
     const job={id:++state.seq,kind,label:spec.label,status:"running",started:Date.now(),
       ended:null,exitCode:null,stdout:"",stderr:"",metrics:[],error:null,source:spec.file};
     state.job=job;
     if(archiveDir){
       const basename=Date.now()+"-"+job.id+"-"+kind;
       job.stdoutFile=path.join(archiveDir,basename+".out.log");
       job.stderrFile=path.join(archiveDir,basename+".err.log");
       fs.writeFileSync(job.stdoutFile,"");fs.writeFileSync(job.stderrFile,"");
     }
     const child=spawn(process.execPath,["--test",file],{
       cwd:v17,windowsHide:true,stdio:["ignore","pipe","pipe"],
       env:{...process.env,NODE_TEST_CONTEXT:undefined,FORCE_COLOR:"0"}
     });
     const timeout=setTimeout(()=>{if(job.status==="running"){job.error="Research time limit exceeded";child.kill();}},120000);
     child.stdout.on("data",buf=>{if(job.stdoutFile)fs.appendFileSync(job.stdoutFile,buf);job.stdout=append(job.stdout,buf);job.metrics=extractResults(job.stdout);});
     child.stderr.on("data",buf=>{if(job.stderrFile)fs.appendFileSync(job.stderrFile,buf);job.stderr=append(job.stderr,buf,150000);});
     child.on("error",err=>{job.error=err.message;});
     child.on("close",code=>{
       clearTimeout(timeout);job.exitCode=code;job.ended=Date.now();
       job.metrics=extractResults(job.stdout);
       job.status=code===0&&!job.error?"passed":"failed";
       state.last.unshift({...job});state.last=state.last.slice(0,8);
       if(archiveDir){
         const record={id:job.id,kind,label:job.label,source:job.source,status:job.status,started:job.started,ended:job.ended,
           exitCode:job.exitCode,error:job.error,metrics:job.metrics,stdoutFile:job.stdoutFile,stderrFile:job.stderrFile};
         fs.appendFileSync(path.join(archiveDir,"research-index.jsonl"),JSON.stringify(record)+"\n");
       }
     });
     return json(res,{ok:true,id:job.id,status:job.status,label:job.label});
   }
   if(name.startsWith("/api/native/")){
     const upstream="/"+name.slice("/api/native/".length);
     if(!allowed.get(req.method)?.has(upstream))return json(res,{error:"Native route not permitted"},403);
     const addr=target+upstream+u.search;
     const bodyChunks=[];let bytes=0;
     for await(const chunk of req){bytes+=chunk.length;if(bytes>600000)return json(res,{error:"Request too large"},413);bodyChunks.push(chunk);}
     const opts={method:req.method,headers:{"content-type":"application/json"},
       signal:AbortSignal.timeout(upstream==="/eval"||upstream==="/exam"?360000:200000)};
     if(req.method==="POST"&&bodyChunks.length)opts.body=Buffer.concat(bodyChunks);
     try{
       const upstreamRes=await fetch(addr,opts),payload=await upstreamRes.text();
       res.writeHead(upstreamRes.status,{"content-type":upstreamRes.headers.get("content-type")||"application/json",
         "cache-control":"no-store","x-content-type-options":"nosniff"});
       return res.end(payload);
     }catch(err){return json(res,{error:"Native V17 backend unavailable: "+err.message},503);}
   }
   return json(res,{error:"Unknown endpoint"},404);
  }catch(err){return json(res,{error:"Studio error: "+err.message},500);}
 };
 server=http.createServer((req,res)=>{handler(req,res).catch(err=>json(res,{error:err.message},500));});
 return {server,start:()=>new Promise((resolve,reject)=>{
   server.once("error",reject);
   server.listen(+port,host,()=>{server.off("error",reject);resolve(server);});
  }),stop:()=>new Promise(resolve=>server.close(resolve)),state};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=+(process.argv[2]||8872),backendPort=+(process.argv[3]||8871);
 const archiveDir=process.argv[4]?path.resolve(process.argv[4]):null;
 createMagicStudio({port,backendPort,archiveDir}).start().then(()=>{
   console.log("MAGIC V17 STUDIO: http://127.0.0.1:"+port+"/");
   console.log("Original native V17: http://127.0.0.1:"+backendPort+"/");
   console.log("REAL training only; experimental tests are independently labeled.");
 }).catch(err=>{console.error(err);process.exitCode=1;});
}
