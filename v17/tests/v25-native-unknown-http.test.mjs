import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,existsSync,readFileSync,rmSync} from "node:fs";
import path from "node:path";
import os from "node:os";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const root=path.dirname(fileURLToPath(import.meta.url));
const run=path.resolve(root,"../transcend/torus-aether/devour/devour.mjs");
const html=path.resolve(root,"../transcend/torus-aether/ui/index.html");
const pause=t=>new Promise(r=>setTimeout(r,t));
const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.on("error",reject);s.listen(0,"127.0.0.1",()=>{
  const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});
});
const fetchJSON=async(url,data=null)=>{
 const response=await fetch(url,{method:data?"POST":"GET",headers:data?{"content-type":"application/json"}:{},
  body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(15000)});
 assert.equal(response.status,200);
 return response.json();
};
const neutral=(entity,a,b)=>"A visitor wondered whether "+entity+
 " could have moved from "+a+" to "+b+", but nothing was observed.";
test("V25 REAL original V17 HTTP: reject legacy confident wrong answer, then accept only witnessed no-effect evidence",{
 timeout:60000
},async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),"mp-v25-native-")),
  corpus=path.join(temp,"corpus.txt"),out=path.join(temp,"runtime");
 writeFileSync(corpus,Array.from({length:75},(_,i)=>
   "She is happy. She is tired. He is calm. This is original corpus sample "+i+".").join("\n\n"),"utf8");
 const port=await freePort();
 const proc=spawn(process.execPath,[run,"--workers","1","--arms","stable+many",
   "--mem","2","--worlds","cognitivemap","--text",corpus,"--gpu","off",
   "--out",out,"--port",String(port),"--start"],{
    env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]
   });
 let logs="";proc.stdout.on("data",b=>logs+=b.toString().slice(0,2000));
 proc.stderr.on("data",b=>logs+=b.toString().slice(0,2000));
 try{
  const base="http://127.0.0.1:"+port;
  let ready=false,graph;
  for(let k=0;k<120;k++){
   if(proc.exitCode!==null)throw Error("Native V17 server died: "+logs.slice(-1500));
   try{graph=await fetchJSON(base+"/graph?w=0");if(graph.cognitive?.documents>=25){ready=true;break}}
   catch{}
   await pause(150);
  }
  assert.equal(ready,true,"Original cognitive runtime failed: "+logs.slice(-1600));
  assert.equal(graph.chars,0,"Native cognitive model must not be char predictor");
  const samples=[];
  for(let i=0;i<24;i++){
   const entity="training_numeric_"+i,quantity=1+i%9,before=10+i*3;
   samples.push({type:"action",sentence:"Account "+entity+" received "+quantity+" credits.",
     entity,before,after:before+quantity,quantity});
  }
  for(let i=0;i<6;i++){
   const entity="initial_training_"+i,value=5000+i*31;
   samples.push({type:"initial",sentence:"Account "+entity+" begins with "+value+" credits.",entity,value});
   const q="question_training_"+i;
   samples.push({type:"question",question:"After the full report, what is the balance of "+q+"?",entity:q});
  }
  let learn;
  for(let k=0;k<30;k++){
   learn=await fetchJSON(base+"/v23-lab",{w:0,kind:"numeric",command:"train",observations:samples});
   if(!learn.error)break;
   if(!/finishing/.test(learn.error))throw Error(learn.error);
   await pause(120);
  }
  assert.equal(learn?.statistics?.verifiedLaws,1,"Original witnessed numerical rule not learned");
  const entity="heldout_account";
  const question="After the full report, what is the balance of "+entity+"?";
  const bad=["Account "+entity+" begins with 10 credits.",
    "Account "+entity+" received 2 credits.",
    "Account "+entity+" donated 5 credits.",
    "Account "+entity+" received 3 credits."].join("\n");
  const legacy=await fetchJSON(base+"/v23-lab",{
   w:0,kind:"numeric",command:"plan",document:bad,question});
  assert.equal(legacy.found,true);
  assert.equal(legacy.answer,15,"Failure is important to reproduce, not erase");
  const separatePhysicalTruth=10+2-5+3;
  assert.equal(separatePhysicalTruth,10);
  assert.notEqual(legacy.answer,separatePhysicalTruth);
  const fail=await fetchJSON(base+"/v25-strict",{
   w:0,kind:"numeric",command:"plan",document:bad,question});
  assert.equal(fail.found,false);
  assert.equal(fail.reason,"UNKNOWN_RELEVANT_SENTENCE");
  assert.equal(fail.audit.unknown.length,1);
  const inert=Array.from({length:8},(_,i)=>{
   const e="unmoved_training_"+i,holder="holder_"+i;
   return {sentence:neutral(e,"site_"+i+"_a","site_"+i+"_b"),entity:e,
     before:holder,after:holder,accepted:true};
  });
  let learned;
  for(let k=0;k<20;k++){
   learned=await fetchJSON(base+"/v25-strict",{
    w:0,kind:"numeric",command:"teach-neutral",observations:inert});
   if(!learned.error)break;
   if(!/finishing/.test(learned.error))throw Error(learned.error);
   await pause(120);
  }
  assert.equal(learned.changed,true);assert.equal(learned.verifiedNeutralPatterns,1);
  const safe=["Account "+entity+" begins with 10 credits.",
    "Account "+entity+" received 2 credits.",
    neutral(entity,"source_extra","dest_extra"),
    "Account "+entity+" received 3 credits."].join("\n");
  const positive=await fetchJSON(base+"/v25-strict",{w:0,kind:"numeric",command:"plan",
    document:safe,question,offset:0,limit:20});
  assert.equal(positive.found,true,JSON.stringify(positive).slice(0,500));
  assert.equal(positive.answer,15);
  assert.equal(positive.originalMethod,"Discoverer.shape");
  assert.equal(positive.strictClosedWorld,true);
  assert.equal(positive.audit.unknown.length,0);
  assert.equal(positive.audit.recognizedNeutral,1);
  assert.equal(positive.path.total,2);
  const pronoun=["Account "+entity+" begins with 10 credits.",
    "Account "+entity+" received 2 credits.",
    "It donated 5 credits.",
    "Account "+entity+" received 3 credits."].join("\n");
  const rejectPronoun=await fetchJSON(base+"/v25-strict",{w:0,kind:"numeric",
    command:"plan",document:pronoun,question});
  assert.equal(rejectPronoun.found,false);
  assert.equal(rejectPronoun.audit.unknown.length,1);
  const checkpoint=path.join(out,"brains","brain-0-stable+many.v8");
  const until=Date.now()+5000;
  while(!existsSync(checkpoint)&&Date.now()<until)await pause(100);
  assert.equal(existsSync(checkpoint),true);
  const restored=Brain.load(checkpoint);
  assert.ok(restored.v23Numeric&&restored.v25NeutralEvidence,
    "The native Brain must contain BOTH preserved original witnessed mechanisms");
  assert.equal(restored.v25NeutralEvidence.total,8);
  assert.equal(restored.v23Numeric.laws.length,1);
  const ui=readFileSync(html,"utf8");
  for(const id of ["allStart","allSave","gpuApply","textMazeCanvas","cognitiveEvaluate",
    "v23LabBox","v23PathCanvas","v25GateBox","v25StrictPlan","v25TeachNeutral"])
    assert.ok(ui.includes('id="'+id+'"'),"Lost native original or added UI: "+id);
  assert.ok(ui.includes('src="v25-uncertainty-live.js"'));
  console.log("V25_NATIVE_UNCERTAINTY_HTTP",JSON.stringify({
   originalServerAndBrain:true,legacyIncorrectAnswer:legacy.answer,
   independentPhysicalTruth:separatePhysicalTruth,
   unknownEventRejectedBeforeAct:fail.reason,
   reportedNeutralExamples:inert.length,learnedNeutralPatterns:1,
   strictCorrectKnownCase:positive.answer,strictUnknownReferences:0,
   unresolvedPronounRejected:true,
   checkpointSavedBothModels:true,
   originalUIControlsPreserved:true,OpenThoughts3Accuracy:"NOT_TESTED"
  }));
 }finally{
  if(proc.exitCode===null){
   const finished=new Promise(r=>proc.once("exit",r));
   proc.kill("SIGTERM");await Promise.race([finished,pause(2000)]);
   if(proc.exitCode===null)proc.kill("SIGKILL");
  }
  rmSync(temp,{recursive:true,force:true});
 }
});
