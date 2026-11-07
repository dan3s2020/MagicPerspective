import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const trainer=path.join(root,"transcend","torus-aether","devour","devour.mjs");
const corpus=path.join(root,"docs","TORUS_AETHER_ABC_20261104.md");
const delay=ms=>new Promise(ok=>setTimeout(ok,ms));
async function availablePort(){
 const server=net.createServer();await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
 const port=server.address().port;
 await new Promise(ok=>server.close(ok));return port;
}
async function poll(fn,{timeout=40000}={}){
 const started=Date.now();
 let lastError=null;
 while(Date.now()-started<timeout){
   try{const value=await fn();if(value)return value;}
   catch(e){lastError=e;}
   await delay(170);
 }
 throw Error("Real backend never reached the requested state: "+lastError?.message);
}
const json=async url=>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),1500);
 try{const r=await fetch(url,{signal:controller.signal,cache:"no-store"});
  if(!r.ok)throw Error("HTTP "+r.status+" for "+url);
  return await r.json();
 }finally{clearTimeout(timeout);}
};
test("REAL original V17 Node worker + genuine repository corpus, live telemetry and frozen held-out HTTP endpoint",{
 timeout:110000
},async()=>{
 const port=await availablePort();
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-real-hypermaze-"));
 const child=spawn(process.execPath,[
   trainer,"--workers","1","--arms","winner","--mem","0.8",
   "--text",corpus,"--out",tmp,"--port",String(port),
   "--worlds","text","--every","5000","--gpu","off","--chars","16000"
 ],{cwd:root,stdio:["ignore","pipe","pipe"],env:{...process.env,CI:"1"}});
 const logs=[],append=data=>{if(logs.join("").length<100000)logs.push(data.toString());};
 child.stdout.on("data",append);child.stderr.on("data",append);
 const base="http://127.0.0.1:"+port;
 try{
   const status=await poll(async()=>{
     const r=await json(base+"/graphs");
     return r.graphs?.length===1?r:null;
   });
   assert.equal(status.graphs.length,1);
   // Independent worker watchdog health must be visible BEFORE training
   // and must never mistake an old graph snapshot for new work.
   const initialHealth=await json(base+"/health?w=0");
   assert.equal(initialHealth.w,0);
   assert.equal(initialHealth.health.workerResponsive,true);
   assert.equal(initialHealth.canResume,false);
   assert.ok(initialHealth.health.state==="running"||
     initialHealth.health.state==="paused");
   assert.ok(status.graphs[0].health);
   const empty=await poll(async()=>{
     const r=await json(base+"/graph?w=0");
     return r.hypermaze?.enabled?r:null;
   });
   assert.equal(empty.hypermaze.rows,0);
   assert.equal(empty.hypermaze.learnedEdges,0);
   assert.equal(empty.hypermaze.last,null);
   // This is the existing corpus's own held-out split, not a synthetic fake.
   const evalReq=await fetch(base+"/hypermaze-eval?w=0&count=3",{method:"POST"});
   const frozen=await evalReq.json();
   assert.equal(frozen.frozen,true,JSON.stringify(frozen));
   assert.equal(frozen.trainingRowsBefore,0);
   assert.equal(frozen.trainingRowsAfter,0);
   assert.ok(frozen.rows>=1);
   const start=await fetch(base+"/control?do=start&w=0",{method:"POST"});
   assert.equal((await start.json()).ok,true);
   const trained=await poll(async()=>{
     const r=await json(base+"/graph?w=0");
     return r.hypermaze?.rows>=1?r:null;
   },{timeout:65000});
   assert.ok(trained.hypermaze.observedTokens>=1);
   const liveHealth=await json(base+"/health?w=0");
   assert.ok(liveHealth.health);
   assert.ok(typeof liveHealth.health.snapshotAgeMs==="number");
   assert.ok(liveHealth.health.snapshotAgeMs>=0);
   assert.ok(liveHealth.health.state!=="unresponsive");
   assert.ok(trained.hypermaze.learnedEdges>0);
   assert.equal(trained.hypermaze.last.answerShownToModelBeforePrediction,false);
   assert.ok(Array.isArray(trained.hypermaze.last.frames));
   assert.ok(Array.isArray(trained.hypermaze.last.predictedRoute));
   assert.ok(trained.hypermaze.last.source==="prose"||
     trained.hypermaze.last.source==="qa");
   const tl=await json(base+"/telemetry?w=0");
   assert.ok(tl.hypermaze?.rows>=1);
   const save=await fetch(base+"/control?do=save&w=0",{method:"POST"});
   assert.equal((await save.json()).ok,true);
   const saved=await poll(async()=>{
     const brainFolder=path.join(tmp,"brains");
     if(!fs.existsSync(brainFolder))return null;
     return fs.readdirSync(brainFolder).some(x=>x.endsWith(".hypermaze.json"))?true:null;
   },{timeout:25000});
   assert.equal(saved,true);
   const sidecar=fs.readdirSync(path.join(tmp,"brains")).find(x=>x.endsWith(".hypermaze.json"));
   const stored=JSON.parse(fs.readFileSync(path.join(tmp,"brains",sidecar),"utf8"));
   assert.ok(stored.stats.rows>=1);
   console.log("TRUE_V17_TEXT_CORPUS_HTTP_INTEGRATION",JSON.stringify({
     realCorpus:path.basename(corpus),rows:trained.hypermaze.rows,
     learnedEdges:trained.hypermaze.learnedEdges,
     nonSyntheticFrames:trained.hypermaze.last.frames.length,
     source:trained.hypermaze.last.source,
     frozenHeldoutRows:frozen.rows,
     checkpointRows:stored.stats.rows,realBackend:true}));
 }catch(e){throw Error(e.message+"\nBackend stdout/stderr:\n"+logs.join("").slice(-18000));}
 finally{
   child.kill("SIGTERM");
   await Promise.race([new Promise(resolve=>child.once("exit",resolve)),delay(1500)]);
   fs.rmSync(tmp,{recursive:true,force:true,maxRetries:3,retryDelay:200});
 }
});
