import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,rmSync,existsSync,readdirSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.dirname(fileURLToPath(import.meta.url));
const runtime=path.resolve(root,"../transcend/torus-aether/devour/devour.mjs");
const sleep=n=>new Promise(r=>setTimeout(r,n));
async function port(){
 return new Promise((ok,fail)=>{
  const s=createServer();s.once("error",fail);s.listen(0,"127.0.0.1",()=>{
   const p=s.address().port;s.close(err=>err?fail(err):ok(p));
  });
 });
}
async function get(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(4000)});
 assert.equal(r.status,200);return r.json();
}
async function post(url,body,ms=120000){
 const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify(body),signal:AbortSignal.timeout(ms)});
 assert.equal(r.status,200);return r.json();
}
function start(base,out,corpus,portNo,{resume=false}={}){
 const args=[runtime,"--workers","1","--arms","stable+many",
  "--mem","2","--worlds","cognitivemap","--text",corpus,
  "--gpu","off","--out",out,"--port",String(portNo)];
 if(resume)args.push("--resume");
 const proc=spawn(process.execPath,args,{
  env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]
 });
 let logs="";
 for(const stream of [proc.stdout,proc.stderr])stream.on("data",data=>{
  logs+=data.toString().slice(0,3000);if(logs.length>20000)logs=logs.slice(-20000);
 });
 return {proc,get logs(){return logs;}};
}
async function ready(proc,base,timeout=15000){
 const at=Date.now();
 while(Date.now()-at<timeout){
  if(proc.proc.exitCode!==null)throw Error("Native Brain exited before readiness: "+proc.logs.slice(-2000));
  try{
   const status=await get(base+"/graphs");
   if(status.graphs?.[0]?.worlds?.includes("cognitivemap"))return status;
  }catch{}
  await sleep(100);
 }
 throw Error("Native Brain start timeout: "+proc.logs.slice(-2000));
}
async function kill(proc){
 if(!proc||proc.proc.exitCode!==null)return;
 const done=new Promise(r=>proc.proc.once("exit",r));
 proc.proc.kill("SIGTERM");
 await Promise.race([done,sleep(2000)]);
 if(proc.proc.exitCode===null)proc.proc.kill("SIGKILL");
}
const observed=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];
test("one ORIGINAL V17 Brain: actual observed nonlinear actions -> saved checkpoint -> frozen 2057-token full solution, including restart", {timeout:130000},async()=>{
 const tmp=mkdtempSync(path.join(os.tmpdir(),"mp-v24-native-http-"));
 const out=path.join(tmp,"native-unchanged"),corpus=path.join(tmp,"real-observed.txt");
 writeFileSync(corpus,Array.from({length:20},(_,i)=>
  "This is the original independent observation "+i+" about existing worlds and their outcomes.").join("\n\n"),"utf8");
 let srv=null;
 try{
  const portNo=await port(),base="http://127.0.0.1:"+portNo;
  srv=start(base,out,corpus,portNo);
  const graph=await ready(srv,base);
  // Real native original UI must serve the new controls IN ADDITION to all
  // existing V17 controls; no separate demo web server or synthetic graph.
  const html=await fetch(base+"/transcend/torus-aether/ui/index.html",{signal:AbortSignal.timeout(6000)});
  assert.equal(html.status,200);
  const page=await html.text();
  assert.match(page,/native-math-live\.js/);
  for(const old of ['id="cognitiveBox"','id="cognitiveEvaluate"','id="run"','id="reset"','id="eval"']){
    assert.ok(page.includes(old),"Original UI control was removed: "+old);
  }
  const script=await fetch(base+"/transcend/torus-aether/ui/native-math-live.js",{signal:AbortSignal.timeout(6000)});
  assert.equal(script.status,200);
  assert.match(await script.text(),/native-math-eval/);
  assert.equal(graph.graphs.length,1);
  assert.deepEqual(graph.graphs[0].worlds,["cognitivemap"]);
  // Control: BEFORE action observations, the original Brain must abstain,
  // never answer from a character predictor or fabricated target graph.
  const premature=await post(base+"/native-math-eval",{
   w:0,document:"2 * 3 = 6.",goals:[{index:0,value:7},{index:2,value:8}]
  });
  assert.match(premature.error||"",/no experienced mathematical action field/i);
  for(const [before,after] of observed){
    const r=await post(base+"/native-math-observe",{w:0,before,after});
    assert.equal(r.nativeBrain,true,JSON.stringify(r));
    assert.equal(r.result?.learned,true,JSON.stringify(r));
    assert.ok(r.savedMB>=0);
  }
  const doc="2 * 3 = 6.  "+Array.from({length:2044},(_,i)=>
   "independent_new_text_"+i).join(" ")+" \nThis unchanged ending must survive.";
  const goals=[{index:0,value:7},{index:2,value:8}];
  const arguments_= {w:0,document:doc,goals,seed:1919,temperature:0};
  const original=await post(base+"/native-math-eval",arguments_);
  assert.ok(!original.error,JSON.stringify(original).slice(0,1800));
  assert.equal(original.frozen,true);
  assert.equal(original.nativeBrain,true);
  assert.equal(original.found,true,JSON.stringify({reason:original.reason,observedPairs:original.observedPairs,operators:original.learnedOperators,method:original.originalMethod,stateFieldAtStart:original.stateFieldAtStart,graph:original.observedTopology}).slice(0,2500));
  assert.equal(original.originalMethod,"Discoverer.shape");
  assert.equal(original.planningLaw,"ORIGINAL_V17_ATTRACTION_0.97");
  assert.equal(original.heldoutReferenceAnswerProvided,false);
  assert.equal(original.plannedBeforeAction,true);
  assert.ok(original.inputTokens>=2048);
  assert.ok(original.plannedSteps>=2);
  assert.ok(original.stateFieldAtStart>0);
  assert.ok(original.observedTopology.completeNodes>original.plannedSteps);
  assert.equal(original.observedTopology.goalBeforeFirstAction,true);
  assert.ok(original.observedTopology.edges.length>0);
  assert.ok(original.observedTopology.nodes.length>0);
  assert.deepEqual(original.observedTopology.path.slice(1),original.plannedPath.map(x=>x.to));
  assert.ok(original.plannedPath.every(x=>x.verified===false),
    "Novel text-graph edges are hypotheses until independently executed");
  assert.equal(original.completeAnswer,doc.replace("2 * 3 = 6.","7 * 8 = 56."));
  assert.ok(original.completeAnswer.length>40000);
  const again=await post(base+"/native-math-eval",arguments_);
  assert.deepEqual(again.plannedPath,original.plannedPath);
  assert.equal(again.completeAnswer,original.completeAnswer);
  // Independent world physics replays the entire previously frozen route:
  // true multiplication is defined ONLY in this heldout physical evaluator.
  // The planner does NOT get this function or a target dependent answer.
  let actualDocument=doc,planId=again.planId,lastOutcome=null;
  assert.ok(Number.isSafeInteger(planId));
  for(const hop of again.plannedPath){
    const [primary,step]=JSON.parse(hop.action);
    const old=/(\d+) \* (\d+) = (\d+)\./.exec(actualDocument);
    assert.ok(old,"Real world must expose current numeric expression");
    const a=Number(old[1])+(primary===0?step:0);
    const b=Number(old[2])+(primary===1?step:0);
    const observed=actualDocument.replace(old[0],a+" * "+b+" = "+(a*b)+".");
    lastOutcome=await post(base+"/native-math-step",{
      w:0,planId,afterDocument:observed,accepted:true});
    assert.equal(lastOutcome.accurate,true,JSON.stringify(lastOutcome).slice(0,1100));
    assert.equal(lastOutcome.evidenceStatus,
      "USER_OR_EXTERNAL_WORLD_SUPPLIED_ACTUAL_OUTCOME_NOT_SELF_EXECUTED");
    assert.ok(lastOutcome.trace.at(-1).physicallyReported);
    actualDocument=observed;
  }
  assert.equal(lastOutcome.completed,true);
  assert.equal(lastOutcome.fullOutcomeMatchedPrediction,true);
  assert.equal(lastOutcome.measuredSteps,again.plannedSteps);
  assert.equal(actualDocument,again.completeAnswer);
  const afterFeedback=await post(base+"/native-math-eval",arguments_);
  assert.equal(afterFeedback.found,true);
  assert.equal(afterFeedback.completeAnswer,original.completeAnswer);
  // A physically rejected action is NOT automatically a successful step.
  const rejected=await post(base+"/native-math-step",{
    w:0,planId:afterFeedback.planId,afterDocument:doc,accepted:false});
  assert.equal(rejected.accurate,false);
  assert.equal(rejected.trace.at(-1).blockedThisContext,true);
  assert.equal(rejected.fullOutcomeMatchedPrediction,false);
  assert.ok(rejected.replanned,
    "After surprise the original Discoverer must issue a new plan or state an honest failure");
  const postRejection=await post(base+"/native-math-eval",arguments_);
  assert.equal(postRejection.completeAnswer,original.completeAnswer,
    "Blocking one experienced corridor must not erase independent valid alternative paths");
  const illegal=await post(base+"/native-math-eval",{
   w:0,document:doc,goals:[{index:4,value:56}]
  });
  assert.match(illegal.error||"",/independent coordinates/);
  const unsupported=await post(base+"/native-math-eval",{
   w:0,document:"Something entirely different",goals
  });
  assert.equal(unsupported.found,false);
  const dir=path.join(out,"brains");
  assert.ok(existsSync(dir),"Original Brain checkpoint folder must exist");
  assert.ok(readdirSync(dir).some(f=>f.endsWith(".v8")));
  await kill(srv);
  srv=start(base,out,corpus,portNo,{resume:true});
  await ready(srv,base);
  const restored=await post(base+"/native-math-eval",arguments_);
  assert.equal(restored.found,true,JSON.stringify(restored).slice(0,1000));
  assert.equal(restored.completeAnswer,original.completeAnswer,
    "Original V17 Brain persisted all induced action evidence");
  assert.deepEqual(restored.plannedPath,postRejection.plannedPath,
    "Checkpoint must restore the updated state, including actual observed resistance");
  console.log("V24_ONE_NATIVE_BRAIN_HTTP_COMPLETE",JSON.stringify({
    observedActionPairs:observed.length,fullDocumentTokenCount:original.inputTokens,
    fullAnswerCharacters:original.completeAnswer.length,
    multiActionPredictedBeforeOutput:original.plannedSteps,
    graphStates:original.observedTopology.completeNodes,
    originalMethod:original.originalMethod,
    exactRestoredAnswer:true,originalUIAndRuntimePreserved:true,
    separatelyObservedPhysicalSteps:again.plannedSteps,
    physicalContradictionRecorded:true,realReplanTriggered:true,
    CUDAExecuted:false,unrestrictedTextUnderstandingProven:false
  }));
 } finally {
  await kill(srv);
  rmSync(tmp,{force:true,recursive:true});
 }
});
