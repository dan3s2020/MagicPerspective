import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,rmSync,writeFileSync,existsSync} from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {createServer} from "node:net";

const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test("GPU interpreter failure cannot silently continue training text-only or create a checkpoint",
 {timeout:28000},async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),"mp-v21-badgpu-"));
 const corpus=path.join(temp,"text.txt"),out=path.join(temp,"save");
 const port=await freePort();
 writeFileSync(corpus,Array.from({length:35},(_,i)=>
   "This is a sufficiently long actual source document number "+i+" with many words and context.").join("\n\n"),"utf8");
 const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 // Intentionally select Node as a fake Python so CUDA cannot be initialized.
 // Real CUDA is NOT needed for this fail-closed regression.
 const proc=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1",
  "--arms","stable+many","--worlds","hypertext,maze,transform",
  "--gpu","cuda:0","--gpu-worlds","4","--vram","1",
  "--text",corpus,"--out",out,"--port",String(port),"--start"
 ],{cwd,detached:true,env:{...process.env,OCTOPUS_PY:process.execPath,MP_NO_BROWSER:"1"},
   stdio:["ignore","pipe","pipe"]});
 let log="";
 for(const s of [proc.stdout,proc.stderr])s.on("data",b=>log=(log+b.toString()).slice(-18000));
 try{
  const since=Date.now();
  while(Date.now()-since<18000 && !log.includes("CUDA PRE-FLIGHT FAILED BEFORE TRAINING")){
   await sleep(120);
  }
  assert.match(log,/CUDA PRE-FLIGHT FAILED BEFORE TRAINING/,
    "Must fail explicitly before ingesting a single source document: "+log);
  assert.ok(!existsSync(path.join(out,"brains","brain-0-stable+many.v8")),
    "GPU launch failure must not write a misleading partial checkpoint");
  assert.doesNotMatch(log,/#\s*0\s+stable\+many\s+.*\s+DONE/,
    "No misleading finished training after failed CUDA init");
  console.log("V21_FAIL_CLOSED_BAD_CUDA_PYTHON",{preflightCaught:true,checkpointCreated:false});
 }finally{
  try{process.kill(-proc.pid,"SIGTERM");}catch{try{proc.kill("SIGTERM");}catch{}}
  await sleep(200);
  rmSync(temp,{recursive:true,force:true});
 }
});
