import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const port=()=>new Promise((ok,bad)=>{
 const s=createServer();s.once("error",bad);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(err=>err?bad(err):ok(p));});
});
const bytes=s=>Array.from(s).map(c=>c.charCodeAt(0));
test("exact full Q/A scoring counts COMPLETE first guesses, never individual-character success; 70% threshold is strict",()=>{
 const brain=Object.create(Brain.prototype);
 brain.e={};brain.chain={play:()=>({out:[1,0,0,0]})};brain.ctxOf=()=>[];brain.histOf=()=>[];
 let decoded=[],budgets=[];
 brain.align={
   readFrozen:(ex,cb)=>{for(let i=0;i<ex.length;i++)cb(i,ex[i],ex[i],[]);},
   write:(q,opts)=>{
     budgets.push(opts.max);
     const question=String.fromCharCode(...q);
     const answer=question.match(/task ([0-9]+)/)?.[1]||"0";
     decoded.push(question);
     return bytes(" result "+answer+(Number(answer)<7?"":" wrong"));
   }
 };
 const prompts=Array.from({length:10},(_,i)=>bytes("Q: task "+i+"\nA: result "+i+"\n\n"));
 const r=brain.evalTextExercises(prompts,{T:0,noise:0,seed:42,strictFullAnswer:true,maxGeneratedChars:128});
 assert.equal(r.firstAnswerExactTotal,10);
 assert.equal(r.firstAnswerExactCorrect,7);
 assert.deepEqual(budgets,Array(10).fill(128),"Hidden answers must not affect the prediction generation budget");
 assert.equal(r.firstAnswerExactRate,.7);
 assert.equal(r.firstAnswerTarget70Reached,true);
 assert.equal(r.answer,1,"Teacher-forced char correctness MUST NOT replace exact answer result");
 assert.ok(decoded.every(q=>!q.includes("result")),"Prediction must receive only Q: prefix, not the heldout answer");
 assert.equal(brain.evalTextExercises(prompts.slice(7),{seed:2}).firstAnswerTarget70Reached,false);
});

test("NATIVE CPU V22: real V17 Q/A + V19 original Discoverer.shape + V20/21 + 2D maze/transform and exact heldout API", {timeout:95000}, async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"mp-v22-cpu-exact-"));
 const input=path.join(dir,"real-exercises.txt"),out=path.join(dir,"checkpoint");
 const docs=Array.from({length:26},(_,i)=>
  "Q: Given task number "+i+", what is the marker?\nA: amber lake");
 writeFileSync(input,docs.join("\n\n")+"\n");
 const listen=await port(),native=path.join(root,"transcend/torus-aether/devour/devour.mjs");
 const proc=spawn(process.execPath,[
  native,"--workers","1","--arms","stable+many","--worlds","text,cognitivemap,hypertext,maze,transform",
  "--gpu","off","--text",input,"--out",out,"--port",String(listen),
  "--mem","2","--every","1500","--maze-every","250","--start"
 ],{cwd:root,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let log="";
 for(const stream of [proc.stdout,proc.stderr])stream.on("data",b=>{log=(log+b.toString()).slice(-12000);});
 const base="http://127.0.0.1:"+listen,read=async p=>{
  const response=await fetch(base+p,{signal:AbortSignal.timeout(4500)});
  if(!response.ok)throw Error("HTTP "+response.status);return response.json();
 };
 try{
   let g,listing;const start=Date.now();
   while(Date.now()-start<55000){
     if(proc.exitCode!==null&&proc.exitCode!==0)throw Error("CPU trainer crashed: "+log);
     try{
       listing=await read("/graphs");g=await read("/graph?w=0");
       if(g.progress?.trained>=8&&g.cognitive?.documents>=8)break;
     }catch{}
     await sleep(180);
   }
   assert.ok(g?.progress?.trained>=8,"Native CPU learner never read real original Q/A: "+log);
   assert.ok(g?.cognitive?.documents>=8,"Native learned text-world not active: "+log);
   assert.equal(g.progress.mode,"native-text");
   assert.deepEqual(listing.graphs[0].worlds,["text","cognitivemap","hypertext","maze","transform"]);
   assert.equal(listing.gpu.device,"off");
   assert.equal(listing.corpus.kind,"text");
   assert.ok(g.maze?.played>0,"Original 2D maze world should not be dropped");
   assert.ok(g.transform?.played>0,"Original transformation world should not be dropped");
   const html=await(await fetch(base+"/transcend/torus-aether/ui/index.html?live=1")).text();
   assert.match(html,/id="cpuExactEvaluate"/);
   assert.match(html,/id="cpuExactRate"/);
   assert.match(html,/id="v22OriginalShapeCanvas"/);
   const source=await(await fetch(base+"/transcend/torus-aether/ui/app.js")).text();
   assert.match(source,/firstAnswerExactRate/);
   // The read-only evaluator saves the original Brain first, then evaluates a
   // FROZEN copy. No hidden answer is supplied to align.write().
   let result=await fetch(base+"/eval",{
     method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify({w:0,kind:"text",opts:{count:2,max:0,maxOutput:128,T:0,noise:0,strictHeldout:true}})
   });
   assert.equal(result.status,200);
   const strict=await result.json();
   assert.ok(!strict.error,"Original heldout evaluation failed: "+JSON.stringify(strict.error));
   assert.equal(strict.heldoutAnswerComplete,true);
   assert.equal(strict.firstAnswerExactTotal,strict.exercises.length);
   assert.equal(strict.firstAnswerExactTotal,2,"Distinct 2 heldout rows must not be resampled up to 16 times");
   assert.ok(strict.firstAnswerExactRate>=0&&strict.firstAnswerExactRate<=1);
   assert.equal(strict.firstAnswerTarget70Reached,strict.firstAnswerExactRate>=.70);
   assert.ok(strict.exercises.every(x=>typeof x.firstAnswerExact==="boolean"));
   result=await fetch(base+"/eval",{
     method:"POST",headers:{"content-type":"application/json"},
     body:JSON.stringify({w:0,kind:"text",opts:{count:1,max:50,T:0,noise:0}})
   });
   const truncated=await result.json();
   assert.equal(truncated.heldoutAnswerComplete,false);
   assert.equal(truncated.firstAnswerExactRate,null);
   assert.equal(truncated.firstAnswerExactTotal,0);
   console.log("V22_REAL_CPU_QA_GATE",JSON.stringify({
     cuda:false,actualTrainingExercises:g.progress.trained,
     realHeldoutTotal:strict.firstAnswerExactTotal,
     exactWholeAnswers:strict.firstAnswerExactCorrect,
     exactRate:strict.firstAnswerExactRate,
     threshold70Reached:strict.firstAnswerTarget70Reached,
     scoreNotAssumed70:true
   }));
 }finally{
   if(proc.exitCode===null){proc.kill("SIGTERM");await sleep(350);
     if(proc.exitCode===null)proc.kill("SIGKILL");}
   rmSync(dir,{recursive:true,force:true});
 }
});
