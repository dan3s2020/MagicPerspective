import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {launch} from "../research/text-hypermaze/real-corpus-server.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

const freePort=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,{status=200,method="GET"}={}){
 const r=await fetch(url,{method,signal:AbortSignal.timeout(20000)});
 if(r.status!==status)throw Error("Unexpected HTTP "+r.status+": "+(await r.text()).slice(0,800));
 return r.json();
}
test("REAL original V17 JSONL worker serves read-only complete paged atlas, missing physical causal paths and no reference leak",{
 timeout:120000
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v31-live-atlas-"));
 const data=path.join(dir,"native-world.jsonl"),out=path.join(dir,"training");
 const sentences=["He is calm.","He is tired.","She is tired.",
  "The young bird is happy.","The young bird is sleepy.",
  "The old bird is sleepy.","Știința este stabilă.",
  "Știința este rapidă.","Experiența este rapidă."];
 const rows=Array.from({length:90},(_,i)=>({
  conversations:[
   {from:"human",value:sentences[i%sentences.length]},
   {from:"gpt",value:sentences[(i+1)%sentences.length]}
  ]
 }));
 fs.writeFileSync(data,rows.map(x=>JSON.stringify(x)).join("\n")+"\n","utf8");
 let app=null;
 try{
  app=await launch({data,out,port:await freePort(),autoStart:true,
   holdoutEvery:10,saveEvery:30,transitionEvery:2,
   windowTokens:32,maxTokensPerSegment:48,
   maxObserved:1000,maxOperators:2000,heapMB:1024});
  let status=null;
  for(let i=0;i<320;i++){
   const a=await request(app.base+"/api/status");
   if(a.error)throw Error("Native JSONL train failed: "+a.error);
   if(a.status?.phase==="complete"){status=a.status;break;}
   await pause(100);
  }
  assert.ok(status,"Real original native worker did not finish 90 records");
  assert.equal(status.rowsRead,90);
  assert.equal(status.percent,100);
  assert.ok(status.learnedOperators>0);
  const html=await (await fetch(app.base+"/transcend/torus-aether/ui/native-hypermaze.html")).text();
  assert.match(html,/id="forensicAtlas"/);
  assert.match(html,/id="atlasCanvas"/);
  assert.match(html,/id="realBar"/);
  assert.match(html,/src=".\/native-hypermaze.js"/);
  assert.match(html,/src=".\/forensic-path-atlas.js"/);
  const script=await (await fetch(app.base+"/transcend/torus-aether/ui/forensic-path-atlas.js")).text();
  assert.match(script,/firstWrongExpected|firstWrongPredicted|firstMismatch|firstWrongReason|Primul caracter greșit/);
  assert.ok(!script.includes('q.set("reference"'),"Never send correct hidden text to worker");
  const page=await request(app.base+"/api/path-atlas?section=observations&offset=0&limit=4");
  assert.equal(page.originalBrain,true);
  assert.equal(page.referenceAnswerSupplied,false);
  assert.equal(page.originalPlanner,"Discoverer.shapeGraph");
  assert.equal(page.page.items.length,4);
  assert.equal(page.page.hasMore,true);
  assert.ok(page.summary.operatorHypotheses>0);
  assert.equal(page.summary.walkableVerifiedEdges,0,
   "Original corpus text alone is NOT a physically verified world transition");
  assert.equal(page.summary.designLimits.observationMemory.observedLongRejected,0);
  const all=await request(app.base+"/api/path-atlas?section=observations&offset=4&limit=250");
  assert.equal(page.page.total,all.page.total);
  assert.ok(all.page.items.some(x=>x.rawText.includes("Știința")));
  const controls=await request(app.base+"/api/path-atlas?section=operators&offset=0&limit=50");
  assert.ok(controls.page.total>0);
  assert.equal(controls.page.items.every(x=>x.status===
   "INFERRED_EFFECT_REQUIRES_EXTERNAL_ACTION_VERIFICATION"),true);
  const diag=await request(app.base+"/api/path-atlas?section=verified&start="+
   encodeURIComponent("He is calm.")+"&required=tired&limit=50");
  assert.equal(diag.report.referenceWasNotSupplied,true);
  assert.equal(diag.report.topology.verifiedPathExists,false);
  assert.equal(diag.report.diagnosis,"START_NOT_WITNESSED_IN_CAUSAL_MEMORY");
  assert.ok(diag.report.unanchoredTextOperatorHypotheses.length>0);
  const rejected=await request(app.base+"/api/path-atlas?section=nodes&reference=PRIVATE_NEVER_SEND",{
   status:400});
  assert.ok(rejected.error.includes("must not enter path planning"));
  const marker=JSON.parse(fs.readFileSync(path.join(out,"native-hypermaze-progress.json"),"utf8"));
  const original=Brain.load(path.join(out,marker.checkpoint));
  assert.ok(original.observedTransformations.records.size>0);
  assert.equal(original.hypermazeCumulativeExperience,undefined,
   "Read-only atlas must not create alternate/replacement learning memory");
  console.log("V31_REAL_NATIVE_HTTP_ATLAS",JSON.stringify({
   originalRows:90,trainedRows:status.trainedRows,
   observedStates:page.page.total,operatorHypotheses:controls.page.total,
   physicalVerifiedEdges:page.summary.walkableVerifiedEdges,
   labelLeakBlocked:true,originalBrainCheckpointUnmodified:true,
   fullSyntheticTextSemanticsProven:false
  }));
 }finally{
  if(app)await app.close();
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
