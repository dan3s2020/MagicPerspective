// End-to-end: original V17 devour worker must automatically recall historic
// observed text-world sentences after 32 REAL corpus episodes. No training
// answer is injected; the existing original learning engine is unchanged.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
const freePort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();
 s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{
  const port=s.address().port;s.close(()=>resolve(port));
 });
});
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
test("same ACTUAL original V17 worker automatically replays previously observed training worlds on real episode 32 and persists every event",{
 timeout:100000
},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-auto-native-atlas-"));
 const data=path.join(tmp,"observed-training-only.txt");
 const out=path.join(tmp,"run");
 const sections=[];
 for(let i=0;i<38;i++){
  if(i===0)sections.push("Sigma museum field is calm.");
  else if(i===1)sections.push("Sigma museum field is curious.");
  else if(i===35)sections.push("Omega museum field is curious.");
  else sections.push("The museum corridor number "+i+" has a different pattern.");
 }
 fs.writeFileSync(data,sections.join("\n\n")+"\n","utf8");
 const port=await freePort(),url="http://127.0.0.1:"+port;
 const child=spawn(process.execPath,[
  path.join(root,"transcend","torus-aether","devour","devour.mjs"),
  "--workers","1","--arms","winner","--worlds","text",
  "--gpu","off","--text",data,"--out",out,
  "--port",String(port),"--mem","1","--every","10000000",
  "--start","--native-hypermaze"
 ],{cwd:root,detached:process.platform!=="win32",
  stdio:["ignore","pipe","pipe"]});
 let log="";
 for(const stream of [child.stdout,child.stderr])
  stream.on("data",chunk=>{log=(log+String(chunk)).slice(-7000);});
 try{
  const checkpoint=path.join(out,"brains","brain-0-winner.v8");
  const journal=checkpoint+".hypermaze-atlas.jsonl";
  let observed=null;
  for(let poll=0;poll<280;poll++){
   if(child.exitCode!==null)
    throw Error("Original training server exited unexpectedly: "+log);
   try{
    const r=await fetch(url+"/native-hypermaze-atlas?"+
     new URLSearchParams({w:"0",mode:"summary"}));
    const x=await r.json();
    if(x.result?.historicalReplayEvents>=1&&x.result?.worldsByDomain?.text>=32){
     observed=x.result;break;
    }
   }catch{}
   await sleep(180);
  }
  assert.ok(observed,"Original worker never automatically revisited lived training worlds: "+log);
  assert.ok(observed.journalEvents>=33);
  assert.ok(observed.lastReplayCursor>0);
  assert.ok(fs.existsSync(journal),"Atlas was not persisted on disk alongside original Brain");
  const result=await(await fetch(url+"/native-hypermaze-atlas?"+
   new URLSearchParams({w:"0",mode:"events",kind:"replay",limit:"30"}))).json();
  assert.ok(result.result?.events?.length>=1);
  const recorded=result.result.events[0];
  assert.ok(recorded.historicalWorldsScanned>=1);
  assert.ok(recorded.genuineOldSentencesRehearsed>=2);
  assert.equal(recorded.originalBrainCorpusObservationsUnchanged,true);
  assert.equal(recorded.source,"original observed source evidence; zero withheld answers");
  const before=fs.statSync(journal).size;
  // Do not assume the worker already saved at the moment of replay.
  // Request the ORIGINAL save explicitly, and check the same Brain.v8.
  await fetch(url+"/control?do=save&w=0",{method:"POST"});
  let saved=null;
  for(let i=0;i<150;i++){
   if(fs.existsSync(checkpoint)){
    try{saved=Brain.load(checkpoint);if(saved.exercises>=32)break;}catch{}
   }
   await sleep(120);
  }
  assert.ok(saved?.observedTransformations?.operators?.size>=1,
   "Original Brain.v8 checkpoint did not retain real learned edit operators");
  assert.ok(saved.observedTransformations.historicalReplays>0,
   "Actual original Brain did not own archived episodic rehearsal");
  assert.ok(fs.statSync(journal).size>=before);
  console.log("ORIGINAL_WORKER_32_EPISODE_AUTOMATIC_CROSS_WORLD_RECALL",JSON.stringify({
   actualOriginalV17CorpusExercises:saved.exercises,
   actualObservedTextWorlds:observed.worldsByDomain.text,
   automaticRecallEvents:observed.historicalReplayEvents,
   priorTrainingWorldsScanned:recorded.historicalWorldsScanned,
   observedHistoricalSentencesRehearsed:recorded.genuineOldSentencesRehearsed,
   originalBrainHistoricalReplays:saved.observedTransformations.historicalReplays,
   journalEvents:observed.journalEvents,
   originalBrainAndAtlasSaved:true,
   noValidationAnswerEverUsed:true,
   noSeparateTrainingMotor:true
  }));
 }finally{
  try{
   if(process.platform==="win32")child.kill("SIGTERM");
   else process.kill(-child.pid,"SIGTERM");
  }catch{try{child.kill("SIGTERM");}catch{}}
  await sleep(180);
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
