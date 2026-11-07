// Regression: an old V21 hypertext-only checkpoint MUST regain original native
// V17 open-loop solution-writing training after --worlds text,hypertext,...
// WITHOUT losing old V20/V21 evidence or contaminating held-out documents.
import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,rmSync,existsSync,readFileSync,writeFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {TextHypermaze} from "../transcend/torus-aether/worlds/text-hypermaze.mjs";
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const freePort=()=>new Promise((ok,fail)=>{
 const s=createServer();s.once("error",fail);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?fail(e):ok(p));});
});
const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ascii=t=>Array.from(t,ch=>ch.charCodeAt(0));
const launch=async({out,input,worlds,port,resume})=>{
 const args=[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds",worlds,
  "--gpu","off","--text",input,"--out",out,"--port",String(port),
  "--mem","2","--every","1200","--maze-every","4000","--start"
 ];
 if(resume)args.push("--resume");
 const proc=spawn(process.execPath,args,{cwd,detached:true,
  env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const stream of [proc.stdout,proc.stderr])stream.on("data",b=>logs=(logs+b.toString()).slice(-24000));
 const stop=async()=>{
  try{process.kill(-proc.pid,"SIGTERM");}catch{try{proc.kill("SIGTERM");}catch{}}
  await sleep(400);
 };
 const until=async(check,maxMs=90000)=>{
  const started=Date.now();
  while(Date.now()-started<maxMs){
   if(proc.exitCode!==null&&proc.exitCode!==0)throw Error("Native worker failed: "+logs);
   try{
    const response=await fetch("http://127.0.0.1:"+port+"/graph?w=0",
       {signal:AbortSignal.timeout(5000)});
    if(response.ok){
      const g=await response.json();
      if(check(g))return g;
    }
   }catch{}
   await sleep(180);
  }
  throw Error("Native trainer timeout: "+logs);
 };
 return {proc,stop,until,logs:()=>logs};
};

test("original V17 Q/A learning resumes ON TOP OF intact V20 and V21 hypermaze evidence",
 {timeout:180000},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v21-text-rescue-"));
 const out=path.join(dir,"save"),input=path.join(dir,"tiny-real-corpus.txt");
 const docs=Array.from({length:71},(_,i)=>
   "Q: Please report the marker for the independently numbered task "+
   String(100+i)+".\nA: blue sky today");
 writeFileSync(input,docs.join("\n\n")+"\n","utf8");
 const held="Q: Please report the marker for the independently numbered task 999.\nA: blue sky today\n\n";
 const saved=path.join(out,"brains","brain-0-stable+many.v8");
 let worker=null;
 try{
  worker=await launch({out,input,worlds:"hypertext,maze,transform",port:await freePort(),resume:false});
  let graph=await worker.until(g=>g.hypermaze?.documents>=60,65000);
  assert.equal(graph.chars,0,"Legacy V21 observes word graph but has no native language training");
  await worker.until(g=>g.hypermaze?.documents>=64,35000);
  for(let k=0;k<60&&!existsSync(saved);k++)await sleep(150);
  assert.ok(existsSync(saved),"Legacy stage should preserve a full native checkpoint");
  let old=Brain.load(saved),cognitive=old.cognitiveDocuments;
  assert.equal(old.exercises||0,0,"Old V21 text engine was not enabled");
  assert.equal(old.chars,0,"Old V21 text engine was not enabled");
  assert.ok(cognitive>=60,"Legacy V20 documents not really observed");
  const oldEdges=TextHypermaze.restore(old.hypermaze).edges.size;
  await worker.stop();worker=null;
  worker=await launch({out,input,worlds:"text,hypertext,cognitivemap,maze,transform",port:await freePort(),resume:true});
  graph=await worker.until(g=>g.chars>1500&&g.exercises>20&&g.hypermaze?.documents>=cognitive,130000);
  assert.ok(graph.chars>1500,"Original text learner did not consume actual Q/A characters");
  assert.ok(graph.exercises>20,"V17 original exercise counter must advance");
  assert.equal(graph.hypermaze.documents,cognitive,"V20 documents reabsorbed during recovery");
  assert.ok(graph.hypermaze.veil.documents>0,"V21 contextual state must survive resume");
  await worker.until(g=>g.final||g.exercises>=63,60000);
  for(let k=0;k<90&&!existsSync(saved);k++)await sleep(100);
  const recovered=Brain.load(saved);
  assert.ok(recovered.chars>0&&recovered.exercises>0);
  assert.ok(recovered.align?.mem.n>0,"Original AligningGraph memory was not trained");
  assert.equal(recovered.cognitiveMap?.documents,cognitive,
    "Newly enabled original V19 cognitive atlas must absorb ALL old V20 corpus documents while V20/V21 skip duplicates");
  assert.ok(Array.isArray(recovered.cognitiveMap?.rules),"Original V19 native rule state must persist even if no causal contrast is discovered on this fixture");

  assert.equal(recovered.cognitiveDocuments,cognitive,"Must not lose or duplicate V20 corpus evidence");
  assert.ok(TextHypermaze.restore(recovered.hypermaze).edges.size>=oldEdges);
  assert.ok(TextHypermaze.restore(recovered.hypermaze).veil.nodes.length>0);
  assert.equal(typeof recovered.disc.shape,"function","Original maze Discoverer.shape is intact");
  const exam=recovered.evalTextExercises([ascii(held)],{T:0,noise:0,seed:74129});
  assert.equal(exam.exercises.length,1);
  const x=exam.exercises[0];
  assert.ok(x.a0>0,"Test must contain genuine Q/A separation");
  assert.ok(x.shape.length>0,"Original native V17 open-loop generation must produce a shape");
  assert.ok(Number.isFinite(x.shapeSame),"Must score generated text, not contextual route reachability");
  assert.ok(x.shapeSame>=0.10,"Regression: frozen original V17 free-run solution shape fell below 10% on the fixed synthetic Q/A acceptance corpus: "+x.shapeSame);
  console.log("V21_NATIVE_QA_RESCUE",JSON.stringify({
   checkpointMigrated:true,
   originalChars:recovered.chars,originalExercises:recovered.exercises,
   oldCognitiveDocuments:cognitive,newCognitiveDocuments:recovered.cognitiveDocuments,
   oldEdges,newEdges:TextHypermaze.restore(recovered.hypermaze).edges.size,
   heldoutTeacherForced:x.answer,
   generatedShapeAccuracy:x.shapeSame,generatedShapeChars:x.shape.length,
   generatedPrefix:x.shape.slice(0,90),sampledGoalKnownToModel:false
  }));
 }finally{
  if(worker)await worker.stop();
  rmSync(dir,{recursive:true,force:true});
 }
});
