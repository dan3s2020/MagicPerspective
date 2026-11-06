import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const server=path.join(root,"transcend/torus-aether/devour/devour.mjs");
const ui=fs.readFileSync(path.join(root,"transcend/torus-aether/ui/index.html"),"utf8");
test("all original native graph/train/eval/CUDA tabs remain with real new language-world controls",()=>{
 for(const id of ["g","liveTelemetry","tabTrain","tabEval","tabPS","tabMetrics","tabTransfer",
  "tabLang","langPane","langPrompt","langGraph","langMode","langCompare","langCompareReport","langGlobal","langLocal","langPlan",
  "langPlay","langStep","allSave","allStart","allPause","gpuDev","liveReset","sharedEvalGo","evGo"]){
  assert.match(ui,new RegExp('id="'+id+'"'),"Missing original or new V18 control: "+id);
 }
 assert.match(ui,/src="app\.js"/);
 assert.match(ui,/src="perspective-studio\.js"/);
 assert.match(ui,/src="language-maze-studio\.js"/);
 const client=fs.readFileSync(path.join(root,"transcend/torus-aether/ui/language-maze-studio.js"),"utf8");
 assert.match(client,/fetch\("\/language-maze\/plan"/);
 assert.match(client,/result\.trace/);
 const worker=fs.readFileSync(path.join(root,"transcend/torus-aether/devour/worker.mjs"),"utf8");
 assert.match(worker,/languageMaze\.learn\(row\.prompt,row\.answer\)/);
 assert.match(worker,/saveLanguageMaze\(\)/);
 assert.match(worker,/LanguageMazeMemory\.restore/);
});
test("original V17 server serves real V18 prompt-only language-maze without unseen-answer oracle",
 {timeout:45000},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v18-http-"));
 const file=path.join(tmp,"world.txt"),out=path.join(tmp,"checkpoints");
 fs.writeFileSync(file,Array.from({length:20},(_,i)=>
  "Training observation "+i+": blue river follows stone and the moon is above the ridge.").join("\n\n"));
 const netServer=net.createServer();await new Promise((yes,no)=>netServer.once("error",no).listen(0,"127.0.0.1",yes));
 const port=netServer.address().port;await new Promise(yes=>netServer.close(yes));
 const child=spawn(process.execPath,[server,"--workers","1","--arms","stable+many","--text",file,
  "--out",out,"--port",String(port),"--gpu","off","--worlds","text","--every","1000000","--start"],{
  cwd:root,stdio:["ignore","pipe","pipe"]
 });
 let logs="";
 for(const s of [child.stdout,child.stderr])s.on("data",b=>logs=(logs+b.toString()).slice(-12000));
 const base="http://127.0.0.1:"+port;
 try{
  let actual=null;
  for(let n=0;n<70;n++){
   if(child.exitCode!==null)throw Error("V17 server exited: "+logs);
   await new Promise(resolve=>setTimeout(resolve,200));
   try{
    const r=await fetch(base+"/graphs");if(r.status===200){actual=await r.json();break;}
   }catch{}
  }
  assert.ok(actual,"Real original V17 server did not start: "+logs);
  const bad=await fetch(base+"/language-maze/plan",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:0,prompt:"unknown question",reference:"SECRET_TEST_ANSWER"})});
  const denied=await bad.json();assert.match(denied.error,/forbidden/);
  const r=await fetch(base+"/language-maze/plan",{method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:0,prompt:"unknown question with no observed path"})});
  assert.equal(r.status,200);
  const response=await r.json();
  assert.equal(response.protocol,"ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS");
  assert.equal(response.abstained,true);
  assert.equal(response.output,"");
  assert.equal(response.steps,0);
  assert.ok(Array.isArray(response.graph.nodes));
  assert.equal(response.graph.nodes[0].kind,3);
  assert.equal(response.trainingMemory.noLatentModel,true);
  const baseMode=await fetch(base+"/language-maze/plan",{method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({w:0,prompt:"unknown question with no observed path",mode:"original"})});
  assert.equal((await baseMode.json()).successor.mode,"original");
  const comparison=await fetch(base+"/language-maze/compare?w=0&count=8",{method:"POST"});
  const frozen=await comparison.json();
  assert.match(frozen.error,/requires held-out Parquet/);
  assert.ok(!Object.hasOwn(frozen,"hybrid"),"TXT without Q/A must not invent held-out accuracy");
 }finally{
  child.kill("SIGTERM");await new Promise(resolve=>setTimeout(resolve,200));
  if(child.exitCode===null)child.kill("SIGKILL");
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
