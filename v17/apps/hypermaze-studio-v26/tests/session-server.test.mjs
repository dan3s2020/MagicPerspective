import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {StudioSession} from "../session.mjs";
import {startServer} from "../server.mjs";
import {DEFAULT_CORPUS} from "../corpus.mjs";

async function tempDir(){return fs.mkdtemp(path.join(os.tmpdir(),"magic-v26-"));}
test("real corpus cold-start, measured learning, frozen 50 unseen worlds, pause/step/checkpoint/restore",async()=>{
 const dir=await tempDir();
 const session=new StudioSession({corpusPath:DEFAULT_CORPUS,checkpointDir:dir,
   config:{axes:6,words:1024,noise:.2,batch:2,seed:74129}});
 try{
   await session.initialize();
   assert.ok(session.corpus.trainTokens>1000);
   assert.ok(session.corpus.testTokens>1000);
   assert.equal(session.model.rules.size,0);
   for(let i=0;i<6;i++)session.step();
   assert.equal(session.stats.trainWorlds,6);
   assert.equal(session.model.rules.size,6);
   assert.equal(session.stats.modelUpdates,6);
   assert.ok(session.stats.trainBytes>10000);
   const modelBefore=JSON.stringify(session.model.export());
   await session.evaluate(50);
   assert.equal(JSON.stringify(session.model.export()),modelBefore,
     "Heldout evaluation must NOT modify the learner");
   assert.equal(session.stats.holdoutWorlds,50);
   assert.equal(session.stats.holdoutFrozen,50);
   assert.equal(session.stats.holdoutExactShape,50);
   assert.equal(session.stats.holdoutExecutedExact,50);
   assert.equal(session.snapshot().hardware.cudaVerified,false);
   assert.ok(session.last.graph.nodes.length>=64);
   const checkpoint=await session.save();
   const json=JSON.parse(await fs.readFile(checkpoint.path,"utf8"));
   assert.equal(json.model.rules.length,6);
   assert.ok(Number.isInteger(json.rngState));
   assert.ok(json.last?.graph?.nodes?.length>=64,"Replay graph and trace must survive checkpoint");
   assert.ok(json.lastRaw?.before?.length>=1024,"Checkpoint must preserve full raw text");
   const restored=new StudioSession({corpusPath:DEFAULT_CORPUS,checkpointDir:dir,
     config:{axes:6,words:1024,seed:74129}});
   await restored.initialize();await restored.restore(checkpoint.path);
   assert.deepEqual(restored.model.export(),session.model.export());
   assert.deepEqual(restored.last?.initialPath,session.last?.initialPath);
   assert.deepEqual(restored.lastRaw?.before,session.lastRaw?.before);
   assert.equal(restored.random.state(),session.random.state());
   const a=session.step(),b=restored.step();
   assert.deepEqual(a.task.tokens,b.task.tokens);
   assert.deepEqual(a.plan.path,b.plan.path);
   assert.equal(a.plan.completeBeforeAction,true);
   await assert.rejects(async()=>restored.configure({axes:8}),/requires Reset/);
   const before=session.stats.trainWorlds;
   session.start();
   await new Promise(resolve=>setTimeout(resolve,180));
   session.pause();
   assert.ok(session.stats.trainWorlds>before,
     "Actual asynchronous training must process more real corpus worlds");
   console.log("V26_LIVE_INTEGRATION",JSON.stringify({
     learnedRules:session.model.rules.size,
     holdoutExact:50,holdoutTotal:50,
     bytesTrained:session.stats.trainBytes,
     startPauseLive:true,checkpointRoundTrip:true,
     frozenNoLeak:true,originalV17Planner:true}));
 }finally{
   session.pause();await fs.rm(dir,{recursive:true,force:true});
 }
});
test("new HTML/CSS/JS served by local API, controls, text upload, export and health work",async()=>{
 const dir=await tempDir();
 let runtime;
 try{
   runtime=await startServer({corpus:DEFAULT_CORPUS,host:"127.0.0.1",
     port:0,checkpointDir:dir,auto:false,config:{axes:4,words:512}});
   const base="http://127.0.0.1:"+runtime.server.address().port;
   async function post(where,body){
     const r=await fetch(base+where,{method:"POST",headers:{
       "Content-Type":"application/json"},body:JSON.stringify(body)});
     return {status:r.status,data:await r.json()};
   }
   const html=await (await fetch(base+"/")).text();
   const css=await (await fetch(base+"/style.css")).text();
   const js=await (await fetch(base+"/app.js")).text();
   assert.match(html,/Hypermaze/);assert.match(html,/id="graphCanvas"/);
   assert.match(html,/id="startBtn"/);assert.match(html,/id="evalBtn"/);
   assert.match(css,/\.canvas-frame/);assert.match(js,/new EventSource/);
   assert.match(js,/axisPicker\.innerHTML/,"Axis slice selector must show actual learnt dimensions");
   const health=await (await fetch(base+"/api/health")).json();
   assert.equal(health.ok,true);
   const stepped=await post("/api/control",{action:"step"});
   assert.equal(stepped.status,200);assert.equal(stepped.data.ok,true);
   assert.equal(stepped.data.result.stats.trainWorlds,1);
   const configured=await post("/api/control",{action:"configure",config:{
     noise:.75,words:640,batch:5}});
   assert.equal(configured.data.result.config.noise,.75);
   const evaled=await post("/api/control",{action:"evaluate",count:6});
   assert.equal(evaled.data.result.stats.holdoutWorlds,6);
   const exported=await (await fetch(base+"/api/export")).json();
   assert.equal(exported.stats.trainWorlds,1);
   assert.ok(exported.fullText?.before?.length>=512,"Export must not truncate raw text");
   assert.ok(exported.learnerCheckpoint?.rules?.length>0);
   const save=await post("/api/control",{action:"save"});
   assert.ok(save.data.result.path.endsWith(".json"));
   const restore=await post("/api/control",{action:"restore",file:save.data.result.path});
   assert.equal(restore.data.ok,true);
   const data=(await fs.readFile(DEFAULT_CORPUS,"utf8"));
   const upload=await post("/api/upload",{name:"actual-corpus.md",text:data});
   assert.equal(upload.data.ok,true);
   assert.equal(upload.data.result.stats.trainWorlds,0,
     "Changing corpus must not leak previously learned action states");
   const restarted=await post("/api/control",{action:"start"});
   assert.equal(restarted.data.result.running,true);
   const paused=await post("/api/control",{action:"pause"});
   assert.equal(paused.data.result.running,false);
   console.log("V26_HTTP_UI_INTEGRATION",JSON.stringify({
     filesServed:3,apiHealth:true,step:true,evaluate:true,
     checkpointSaveRestore:true,realTextUpload:true,startPause:true}));
 }finally{
   if(runtime)await runtime.close();
   await fs.rm(dir,{recursive:true,force:true});
 }
});
