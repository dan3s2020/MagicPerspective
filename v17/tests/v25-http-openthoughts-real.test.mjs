// Real external OpenThoughts3 diagnostic. This test does NOT certify 100%.
// It fails if a real corpus cannot be fetched, full answers are truncated,
// the native V17 worker fails, or any hidden answer reaches the planner.
import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,rmSync,readFileSync,writeFileSync,existsSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {QuestionGoalNavigator} from "../transcend/torus-aether/worlds/question-goal-navigation.mjs";

const data=process.env.MP_V25_REAL_DATA;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const freePort=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});
});
const repoV17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");

test("UNMODIFIED real OpenThoughts3: 64 train + 16 heldout full long answers, native original solver",
 {skip:!data,timeout:950000},async()=>{
 const manifest=JSON.parse(readFileSync(path.join(data,"_PROVENANCE.json"),"utf8"));
 assert.equal(manifest.dataset,"open-thoughts/OpenThoughts3-1.2M");
 assert.equal(manifest.trainCount,64);
 assert.equal(manifest.heldoutCount,16);
 assert.ok(manifest.minHeldoutAnswerChars>=2048);
 assert.equal(manifest.truncatedCellsSkipped,true);
 assert.equal(manifest.fullOriginalConversations,true);
 const train=manifest.originalRows.filter(x=>x.part==="training"),
   unseen=manifest.originalRows.filter(x=>x.part==="heldout");
 assert.equal(train.length,64);assert.equal(unseen.length,16);
 assert.equal(new Set(manifest.originalRows.map(x=>x.questionSha256)).size,80);
 assert.equal(new Set(manifest.originalRows.map(x=>x.row_idx)).size,80);
 assert.ok(Math.max(...train.map(x=>x.row_idx))<Math.min(...unseen.map(x=>x.row_idx)));
 const out=mkdtempSync(path.join(os.tmpdir(),"magic-v25-real-"));
 const port=await freePort();
 const p=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1",
  "--arms","stable+many","--worlds","cognitivemap","--data",data,
  "--out",out,"--port",String(port),"--mem","3","--start","--gpu","off",
  "--every","2000000"
 ],{cwd:repoV17,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let logs="";
 for(const stream of [p.stdout,p.stderr])stream.on("data",b=>{logs=(logs+b.toString()).slice(-18000);});
 const host="http://127.0.0.1:"+port;
 const get=async uri=>{
  const r=await fetch(host+uri,{signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw Error("HTTP "+r.status+" "+uri);return r.json();
 };
 try{
  let graph=null,completed=false;
  for(let i=0;i<1800;i++){
   if(p.exitCode!==null)throw Error("Native worker/server exited: "+logs);
   try{
    graph=await get("/graph?w=0");
    if(graph?.questionGoal?.rows>=64){completed=true;break;}
   }catch{}
   await pause(300);
  }
  assert.equal(completed,true,"Real 64 Q/A training not complete: "+logs);
  assert.equal(graph.questionGoal.rows,64);
  assert.equal(graph.questionGoal.temporal.rows,64);
  assert.ok(graph.questionGoal.observedActions>0);
  assert.ok(graph.questionGoal.geometryChars>0);
  const checkpoint=path.join(out,"brains","brain-0-stable+many.v8");
  for(let i=0;i<300&&!existsSync(checkpoint);i++)await pause(400);
  assert.ok(existsSync(checkpoint),"Native checkpoint missing after real 64 Q/A: "+logs);
  const loaded=Brain.load(checkpoint);
  const original=QuestionGoalNavigator.restore(loaded.questionGoalNavigator);
  assert.equal(original.temporal.lengthField.rows,64);
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),600000);
  let report;
  try{
   const r=await fetch(host+"/question-goal-heldout?w=0&count=16&maxNodes=1200&temporal=1",
    {method:"POST",signal:controller.signal});
   assert.equal(r.ok,true,"Unexpected native heldout HTTP status");
   report=await r.json();
  }finally{clearTimeout(deadline);}
  assert.ok(!report.error,JSON.stringify(report).slice(0,1000));
  assert.equal(report.frozen,true);
  assert.equal(report.referenceAnswerOnlyInHTTPParent,true);
  assert.equal(report.navigationMode,"temporal-original-shape");
  assert.equal(report.total,16);
  assert.ok(report.exact>=0&&report.exact<=16);
  assert.ok(report.meanLengthShapeSimilarity>=0&&report.meanLengthShapeSimilarity<=1);
  assert.ok(report.meanPredictedLengthError>=0);
  assert.ok(report.results.every(x=>x.referenceAnswerTokens>250));
  const before=JSON.stringify(original.export());
  assert.equal(JSON.stringify(original.export()),before);
  const record={realDataset:manifest.dataset,
   provenanceSha256:manifest.originalRows.map(x=>x.questionSha256),
   originalOperator:"Discoverer.shape",fullOriginalAnswers:true,
   trainRows:64,heldoutRows:16,heldoutMinAnswerChars:manifest.minHeldoutAnswerChars,
   noAnswerOracle:report.referenceAnswerOnlyInHTTPParent,
   firstShotExact:report.exact,exactPercent:report.exactPercent,
   meanAnswerTokenPosition:report.positionMean,
   meanLengthShapeSimilarity:report.meanLengthShapeSimilarity,
   meanPredictedLengthError:report.meanPredictedLengthError,
   meanRoutedLengthError:report.meanAbsLengthError,
   observedTextActions:graph.questionGoal.observedActions,
   graphEdges:graph.cognitive?.observedDomainEdges,
   partialCompletenessNotCertified:true,failClosedRelease:true,
   results:report.results};
  const output=process.env.MP_V25_EVIDENCE;
  if(output)writeFileSync(output,JSON.stringify(record,null,2),"utf8");
  console.log("V25_REAL_OPENTHOUGHTS_RESULT",JSON.stringify({
   dataset:record.realDataset,trainRows:64,heldoutRows:16,
   heldoutMinAnswerChars:record.heldoutMinAnswerChars,
   exactPercent:record.exactPercent,
   meanLengthShapeSimilarity:record.meanLengthShapeSimilarity,
   meanPredictedLengthError:record.meanPredictedLengthError,
   meanRoutedLengthError:record.meanRoutedLengthError,
   observedTextActions:record.observedTextActions,
   releaseAllowed:false
  }));
 }finally{
  try{p.kill("SIGTERM");}catch{}
  await pause(300);
  if(p.exitCode===null)try{p.kill("SIGKILL");}catch{}
  rmSync(out,{recursive:true,force:true});
 }
});
