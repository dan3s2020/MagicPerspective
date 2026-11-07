import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {createMagicStudio} from "../magic-studio/studio-server.mjs";

const here=path.dirname(fileURLToPath(import.meta.url));
const v17=path.resolve(here,"..");
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function freePort(){
 const s=http.createServer((req,res)=>res.end("reserved"));
 await new Promise(resolve=>s.listen(0,"127.0.0.1",resolve));
 const p=s.address().port;await new Promise(resolve=>s.close(resolve));return p;
}
async function eventually(fn,{time=18000,interval=200}={}){
 const start=Date.now();let error;
 while(Date.now()-start<time){
  try{const value=await fn();if(value)return value;}catch(e){error=e;}
  await wait(interval);
 }
 throw Error("Timed out awaiting native backend: "+(error?.message||"not ready"));
}
test("Magic Studio exposes its own real provenance, UI assets, rejects arbitrary paths and proxies ONLY known V17 APIs",async t=>{
 const backend=http.createServer(async(req,res)=>{
  const u=new URL(req.url,"http://localhost");
  res.setHeader("content-type","application/json");
  if(u.pathname==="/graphs")return res.end(JSON.stringify({graphs:[{w:0,arm:"stable+many",worlds:["text","maze"],status:"antrenează",chars:201,test:{aligned:.31}}],gpu:{device:"off"}}));
  if(u.pathname==="/graph")return res.end(JSON.stringify({nodes:[["s:32","sym","␣",1,0,0]],edges:[],U:[],flow:[],snapshotAt:Date.now()}));
  if(u.pathname==="/control")return res.end(JSON.stringify({ok:true,command:u.searchParams.get("do"),graph:u.searchParams.get("w")}));
  res.statusCode=404;res.end(JSON.stringify({error:"Native unknown route"}));
 });
 await new Promise(resolve=>backend.listen(0,"127.0.0.1",resolve));
 t.after(()=>new Promise(resolve=>backend.close(resolve)));
 const studio=createMagicStudio({port:0,backendPort:backend.address().port});
 await studio.start();t.after(()=>studio.stop());
 const base="http://127.0.0.1:"+studio.server.address().port;
 const info=await(await fetch(base+"/api/info")).json();
 assert.equal(info.liveTraining,true);
 assert.equal(info.trainingSimulated,false);
 assert.equal(info.experimentalBrainIntegration,false);
 assert.ok(info.research.length>=6);
 const page=await(await fetch(base+"/")).text();
 assert.match(page,/Graful organismului/);
 assert.match(page,/START|Start training/);
 assert.match(page,/metricAligned/);
 const ui=await(await fetch(base+"/magic-studio.js")).text();
 assert.match(ui,/api\/native/);
 assert.match(ui,/graphCanvas/);
 const health=await(await fetch(base+"/api/health")).json();
 assert.equal(health.backend,"connected");
 const slots=await(await fetch(base+"/api/native/graphs")).json();
 assert.equal(slots.graphs[0].chars,201);
 const command=await(await fetch(base+"/api/native/control?do=pause&w=0",{method:"POST"})).json();
 assert.equal(command.command,"pause");
 assert.equal(command.graph,"0");
 const forbidden=await fetch(base+"/api/native/stop",{method:"POST"});
 assert.equal(forbidden.status,403);
 const privateFile=await fetch(base+"/../START_V17.ps1");
 assert.equal(privateFile.status,404);
 const fakeTest=await fetch(base+"/api/research/run?kind=arbitrary-script",{method:"POST"});
 assert.equal(fakeTest.status,400);
 const empty=await(await fetch(base+"/api/research/status")).json();
 assert.equal(empty.current,null);
});
test("real research results are from EXECUTED Node tests, never hardcoded front-end scores",async t=>{
 const studio=createMagicStudio({port:0,backendPort:18888});
 await studio.start();t.after(()=>studio.stop());
 const base="http://127.0.0.1:"+studio.server.address().port;
 const start=await(await fetch(base+"/api/research/run?kind=axes",{method:"POST"})).json();
 assert.equal(start.ok,true);
 const result=await eventually(async()=>{
  const r=await(await fetch(base+"/api/research/status")).json();
  return r.current?.status!=="running"?r.current:false;
 },{time:35000});
 assert.equal(result.status,"passed",result.stderr?.slice(-2400));
 assert.equal(result.exitCode,0);
 assert.ok(result.stdout.includes("LEARNED_LOCAL_AXES_HELDOUT_ROUTES"),JSON.stringify({stdout:result.stdout.slice(0,4500),stderr:result.stderr.slice(0,3000),metrics:result.metrics,status:result.status,source:result.source}));
 assert.ok(result.metrics.some(x=>x.name==="LEARNED_LOCAL_AXES_HELDOUT_ROUTES"));
 assert.ok(result.metrics.some(x=>x.name==="NOISY_LOCAL_AXES_RECOVERY"));
 assert.ok(result.metrics.find(x=>x.name==="LEARNED_LOCAL_AXES_HELDOUT_ROUTES").data.some(x=>x.D===5&&x.exactRoutes>0));
});
test("connect Studio to a REAL native V17 devouring worker on a real repo text corpus; observe actual training snapshots",async t=>{
 const source=path.join(v17,"docs","TORUS_AETHER_ABC_20261104.md");
 if(!fs.existsSync(source))throw Error("Original corpus unavailable, cannot invent a demo");
 const out=fs.mkdtempSync(path.join(os.tmpdir(),"mp-studio-real-"));
 t.after(()=>fs.rmSync(out,{recursive:true,force:true}));
 const nativePort=await freePort(),stdout=[],stderr=[];
 const worker=spawn(process.execPath,[
  path.join(v17,"transcend/torus-aether/devour/devour.mjs"),
  "--workers","1","--arms","stable+many","--mem","1.2",
  "--every","400","--chars","1800","--text",source,
  "--out",out,"--port",String(nativePort),
  "--worlds","text,maze,transform","--maze-every","400","--gpu","off","--start"
 ],{cwd:v17,windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,NODE_TEST_CONTEXT:undefined}});
 worker.stdout.on("data",x=>{stdout.push(String(x));if(stdout.length>700)stdout.shift();});
 worker.stderr.on("data",x=>{stderr.push(String(x));if(stderr.length>300)stderr.shift();});
 t.after(()=>{if(worker.exitCode===null)worker.kill("SIGTERM");});
 const studio=createMagicStudio({port:0,backendPort:nativePort});
 await studio.start();t.after(()=>studio.stop());
 const base="http://127.0.0.1:"+studio.server.address().port;
 await eventually(async()=>{const r=await fetch(base+"/api/health");return r.ok;},{time:60000});
 let snapshot;
 try { snapshot=await eventually(async()=>{
  const r=await(await fetch(base+"/api/native/graph?w=0")).json();
  if(r?.nodes?.length>3&&r.edges?.length>0&&r.chars>0)return r;
  return false;
 },{time:60000}); } catch(err) { throw Error(err.message+"\nNATIVE STDOUT:\n"+stdout.slice(-60).join("")+"\nNATIVE STDERR:\n"+stderr.slice(-40).join("")); }
 assert.ok(snapshot.nodes.length>3);
 assert.ok(snapshot.edges.length>0);
 assert.ok(snapshot.U?.length>=1);
 const live=(await(await fetch(base+"/api/native/graphs")).json()).graphs[0];
 assert.ok(["antrenează","gata","oprit","pauză"].includes(live.status));
 assert.ok(live.worlds.includes("maze")&&live.worlds.includes("text")&&live.worlds.includes("transform"));
 assert.ok(live.chars>0);
 const stats=await(await fetch(base+"/api/native/telemetry?w=0")).json();
 assert.ok(stats.points.length>0);
 assert.ok(stats.points.some(x=>x.nodes>0&&x.edges>0));
 const command=await(await fetch(base+"/api/native/control?do=save&w=0",{method:"POST"})).json();
 assert.equal(command.ok,true);
 console.log("STUDIO_NATIVE_V17_REAL_WORKER_SMOKE",JSON.stringify({
  chars:snapshot.chars,nodeCount:snapshot.nodes.length,edgeCount:snapshot.edges.length,
  geometrySymbols:snapshot.U.length,
  worlds:live.worlds,observations:stats.points.length,
  checkpointDir:path.join(out,"brains"),
  note:"Actual original V17 worker, no mock engine, no CUDA claim (CI CPU smoke)"
 }));
});
