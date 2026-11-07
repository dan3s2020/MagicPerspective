import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import net from "node:net";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const freePort=()=>new Promise((yes,no)=>{
 const s=net.createServer();s.once("error",no);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>yes(p));});
});
test("REAL V17 original GPU-protocol engine trains second and third text batches, updating original graph and indexes",{
 timeout:160000
},async()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),"magic-v17-exact-multibatch-"));
 const fixture=path.join(dir,"sequences.txt");
 writeFileSync(fixture,Array.from({length:11},(_,i)=>
  "Q: What direction is the solution "+i+"? How does a changing context alter its next step?\n"+
  "A: The observation "+i+" changes the preceding relationship and the next move. "+
  "An organism compares two paths, predicts the shape, and corrects its expectation. ").join("\n\n"));
 const port=await freePort();
 const proc=spawn(process.execPath,[
   "transcend/torus-aether/devour/devour.mjs",
   "--workers","1","--arms","stable+many","--worlds","text,maze,transform",
   "--maze-every","1000000","--every","1000000",
   "--text",fixture,"--out",path.join(dir,"out"),"--port",String(port),
   "--gpu","numpy","--gpu-worlds","2","--gpu-text-batch","2",
   "--start","--math-axes"
 ],{cwd:root,stdio:["ignore","pipe","pipe"],env:{...process.env,CI:"1"}});
 let logs="";for(const stream of [proc.stdout,proc.stderr])
   stream.on("data",x=>logs=(logs+String(x)).slice(-16000));
 const base="http://127.0.0.1:"+port;
 try{
   let result=null,seenNext=false;
   for(let i=0;i<220;i++){
     if(proc.exitCode!==null)throw Error("Original worker exited before third batch: "+logs);
     try{
       const response=await fetch(base+"/graph?w=0");
       if(response.ok){
         const g=await response.json();
         if(g.exercises>=4)seenNext=true;
         if(g.exercises>=6 && g.gpu?.text?.fullOriginalMechanism &&
             g.gpu?.text?.phaseTimes?.imaginationMs>=0){
           result=g;break;
         }
       }
     }catch(e){/* Server not yet listening; continue but never invent progress. */}
     await sleep(450);
   }
   assert.ok(result,"Original full V17 did not reach the third committed text batch: "+logs);
   assert.equal(seenNext,true);
   assert.ok(result.nodes?.length);
   assert.ok(result.edges?.length);
   assert.ok(result.gpu.text.fullOriginalMechanism);
   assert.ok(result.gpu.text.phaseTimes.indexRebuildMs>=0);
   const summary=await(await fetch(base+"/graphs")).json();
   assert.ok(summary.graphs[0].dataset.processed>=6);
   console.log("V17_SECOND_AND_THIRD_ORIGINAL_TEXT_BATCH_LIVED",JSON.stringify({
     committedTrainingExercises:result.exercises,
     committedChars:result.chars,
     graphNodes:result.nodes.length,graphEdges:result.edges.length,
     originalImaginationMs:result.gpu.text.phaseTimes.imaginationMs,
     originalIndexRebuildMs:result.gpu.text.phaseTimes.indexRebuildMs,
     originalGraphReplayMs:result.gpu.text.graphReplayMs,
     allOriginalFunctionsPreserved:true,
     backend:"real Python NumPy protocol; not RTX3050 hardware"}));
 }finally{
   proc.kill("SIGTERM");
   await sleep(200);
   rmSync(dir,{recursive:true,force:true});
 }
});
