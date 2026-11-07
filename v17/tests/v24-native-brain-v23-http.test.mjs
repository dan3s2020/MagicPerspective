import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,readFileSync,rmSync,existsSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const root=path.dirname(fileURLToPath(import.meta.url));
const launcher=path.resolve(root,"../transcend/torus-aether/devour/devour.mjs");
const uiPath=path.resolve(root,"../transcend/torus-aether/ui/index.html");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const availablePort=()=>new Promise((resolve,reject)=>{
 const server=createServer();server.once("error",reject);
 server.listen(0,"127.0.0.1",()=>{const p=server.address().port;
   server.close(e=>e?reject(e):resolve(p));});
});
async function json(url,body=null){
 const r=await fetch(url,{method:body===null?"GET":"POST",
   headers:body===null?{}:{"content-type":"application/json"},
   body:body===null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 assert.equal(r.status,200,"Native HTTP status "+r.status);
 return r.json();
}
test("REAL original Brain V17 HTTP: train witnessed numerical effects, freeze answer-blind whole path and restore same checkpoint",{
 timeout:60000
},async()=>{
 const folder=mkdtempSync(path.join(os.tmpdir(),"magic-v24-native-")),
  corpus=path.join(folder,"real-text-observations.txt"),
  out=path.join(folder,"original-brain-runtime");
 const text=Array.from({length:80},(_,i)=>
  ["She is happy.","She is tired.","He is tired.","He is calm."].join(" ")+
  " The training log observed the world, record "+i+".").join("\n\n");
 writeFileSync(corpus,text,"utf8");
 const port=await availablePort();
 const proc=spawn(process.execPath,[launcher,"--workers","1","--arms","stable+many","--mem","2",
   "--worlds","cognitivemap","--text",corpus,"--gpu","off","--out",out,
   "--port",String(port),"--start"],{env:{...process.env,MP_NO_BROWSER:"1"},
    stdio:["ignore","pipe","pipe"]});
 let logs="";proc.stdout.on("data",b=>logs+=b.toString().slice(-2500));
 proc.stderr.on("data",b=>logs+=b.toString().slice(-2500));
 try{
  const base="http://127.0.0.1:"+port;
  let ready=false,graph=null,progress=null;
  for(let i=0;i<110;i++){
   if(proc.exitCode!==null)throw Error("Native server exited unexpectedly: "+logs.slice(-3000));
   try{
    progress=await json(base+"/graphs");
    graph=await json(base+"/graph?w=0");
    if(graph.cognitive?.documents>=25){ready=true;break;}
   }catch{}
   await wait(180);
  }
  assert.equal(ready,true,"Original full document cognitive training absent: "+logs.slice(-2000));
  assert.equal(graph.chars,0,"V24 test must not confuse old character training with grounded actions");
  assert.deepEqual(progress.graphs[0].worlds,["cognitivemap"]);
  const records=[];
  for(let i=0;i<24;i++){
   const entity="train_effect_"+i,before=i*3+10,quantity=i%7+1;
   records.push({type:"action",sentence:"Account "+entity+" received "+quantity+" credits.",
     entity,quantity,before,after:before+quantity});
  }
  for(let i=0;i<6;i++){
   const entity="start_"+i,value=10001+i*131;
   records.push({type:"initial",sentence:"Account "+entity+" begins with "+value+" credits.",entity,value});
   const q="question_"+i;
   records.push({type:"question",question:"After the full report, what is the balance of "+q+"?",entity:q});
  }
  let trained;
  for(let attempt=0;attempt<30;attempt++){
   trained=await json(base+"/v23-lab",{w:0,kind:"numeric",command:"train",observations:records});
   if(!trained.error)break;
   if(!/finishing/.test(trained.error))throw Error(trained.error);
   await wait(100);
  }
  assert.equal(trained?.changed,true,"Witnessed native learning failed: "+JSON.stringify(trained));
  assert.equal(trained.statistics.verifiedLaws,1);
  assert.equal(trained.statistics.actionSamples,24);
  const entity="heldout_native_case",initial=12013,N=384;
  const amount=i=>1+i%9;
  const document=["Account "+entity+" begins with "+initial+" credits.",
    ...Array.from({length:N},(_,i)=>"Account "+entity+" received "+amount(i)+" credits.")].join("\n");
  const expected=initial+Array.from({length:N},(_,i)=>amount(i)).reduce((a,b)=>a+b,0);
  const question="After the full report, what is the balance of "+entity+"?";
  assert.equal(document.includes(String(expected)),false,"Target present in entire observed source");
  assert.equal(question.includes(String(expected)),false,"Target present in question");
  const plan=await json(base+"/v23-lab",{w:0,kind:"numeric",command:"plan",question,document,offset:0,limit:80});
  assert.equal(plan.error,undefined,JSON.stringify(plan));
  assert.equal(plan.found,true);assert.equal(plan.frozen,true);
  assert.equal(plan.originalMethod,"Discoverer.shape");
  assert.equal(plan.plannedBeforeAction,true);
  assert.equal(plan.answer,expected);
  assert.equal(plan.goal.answerProvided,false);
  assert.equal(plan.path.total,N);
  assert.equal(plan.path.steps.length,80);
  assert.ok(plan.originalShapeCalls>=2);
  assert.ok(plan.maxLocalNodes<=129);
  assert.match(plan.sha256,/^[0-9a-f]{64}$/);
  if(!plan.fromSave){
   const second=await json(base+"/v23-lab",{w:0,kind:"numeric",command:"page",
     planId:plan.planId,offset:300,limit:50});
   assert.equal(second.found,true,JSON.stringify(second));
   assert.equal(second.path.offset,300);
   assert.equal(second.path.steps.length,50);
   assert.equal(second.path.steps[0].index,300);
  }
  const save=path.join(out,"brains","brain-0-stable+many.v8");
  const start=Date.now();
  while(!existsSync(save)&&Date.now()-start<7000)await wait(100);
  assert.equal(existsSync(save),true,"Original Brain checkpoint was never persisted");
  const previous=Brain.load(save);
  assert.ok(previous.v23Numeric,"V23 must live in original Brain checkpoint");
  assert.equal(previous.v23Numeric.laws.length,1);
  assert.equal(previous.v23Numeric.laws[0][1].coefficients[0],1);
  const secondPlan=await json(base+"/v23-lab",{w:0,kind:"numeric",command:"plan",question,document,
   offset:0,limit:25});
  assert.equal(secondPlan.found,true);
  assert.equal(secondPlan.answer,expected);
  // Frozen evaluation is read-only on the model, including checkpointed law values.
  const after=Brain.load(save);
  assert.deepEqual(after.v23Numeric,previous.v23Numeric,"Frozen planning mutated training memory");
  const ui=readFileSync(uiPath,"utf8");
  for(const id of ["allStart","allSave","gpuApply","textMazeCanvas","cognitiveEvaluate",
    "v23LabBox","v23PathCanvas","v23Plan","v23Scrub"])
   assert.ok(ui.includes('id="'+id+'"'),"Original or V24 user control missing: "+id);
  assert.ok(ui.includes('src="v23-grounded-live.js"'));
  console.log("V24_NATIVE_BRAIN_HTTP",JSON.stringify({
   source:"real original V17 devour.mjs worker + Brain checkpoint",
   originalTextTrainingCharacters:graph.chars,observedSamples:records.length,
   witnessedLaws:trained.statistics.verifiedLaws,originalMethod:plan.originalMethod,
   frozenPlanSteps:N,answer:expected,answerProvidedAsGoal:false,modelSavedInBrain:true,
   resumedCheckpointAnswer:secondPlan.answer,existingControlsPreserved:true,
   CUDA:"NOT_TESTED",OpenThoughts3:"NOT_TESTED"
  }));
 }finally{
  if(proc.exitCode===null){
   const ended=new Promise(r=>proc.once("exit",r));
   proc.kill("SIGTERM");await Promise.race([ended,wait(2000)]);
   if(proc.exitCode===null)proc.kill("SIGKILL");
  }
  rmSync(folder,{recursive:true,force:true});
 }
});
