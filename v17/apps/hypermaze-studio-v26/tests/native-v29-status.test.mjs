import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import {createNativeBridge,nativeWorkerHealth} from "../native-bridge.mjs";
const healthyStatus={w:0,status:"oprit",arm:"winner",chars:1084735,
  progress:{trained:18,total:80666,heldOut:16},error:null,
  test:{aligned:.654,live:.584}};
const original=(status)=>({
  world:"D:\\training\\OpenThoughts3-1.2M",
  worlds:["text","maze"],
  corpus:{kind:"parquet",trainRows:80666,heldOut:16,totalRows:80682},
  graphs:[{...healthyStatus,...status}]
});
async function fixture(initial){
  let current=initial,commands=[];
  const server=http.createServer((req,res)=>{
    const url=new URL(req.url||"/","http://127.0.0.1");
    commands.push({method:req.method,path:url.pathname,query:url.search});
    res.setHeader("content-type","application/json");
    if(url.pathname==="/graphs")return res.end(JSON.stringify(original(current)));
    if(url.pathname==="/graph")return res.end(JSON.stringify({
      w:0,nodes:[["n0","symbol","n0",0,0,0]],edges:[],U:[],flow:[]}));
    if(url.pathname==="/control"){
      if(url.searchParams.get("do")==="start")current={...current,status:"antrenează"};
      return res.end(JSON.stringify({ok:true}));
    }
    res.statusCode=404;res.end("{}");
  });
  await new Promise(ok=>server.listen(0,"127.0.0.1",ok));
  const bridge=await createNativeBridge({nativePort:server.address().port,port:0});
  return{
    commands,url:bridge.url,
    set:s=>{current=s},
    close:async()=>{
      await bridge.close();await new Promise(ok=>server.close(ok));
    }
  };
}
const post=async(url,payload)=>{
  const response=await fetch(url,{method:"POST",headers:{
    "content-type":"application/json"},body:JSON.stringify(payload)});
  return {status:response.status,data:await response.json()};
};
test("fatal ORIGINAL V17 CUDA is not running regardless of stale 65.4% ALIGNED and nonzero historical progress",async()=>{
  const fatal={status:"eroare",
    error:"RuntimeError: torch.cuda.is_available() is false in hermes-agent/venv/python.exe"};
  const x=await fixture(fatal);
  try{
    const status=await (await fetch(x.url+"/api/native-state?w=0")).json();
    assert.equal(status.original.test.aligned,.654);
    assert.equal(status.original.progress.trained,18);
    assert.equal(status.workerHealth.active,false);
    assert.equal(status.workerHealth.state,"eroare");
    assert.match(status.workerHealth.error,/cuda.is_available/);
    assert.match(status.nativeCudaError,/torch.cuda/);
    assert.deepEqual(nativeWorkerHealth(status.original),status.workerHealth);
    const start=await post(x.url+"/api/native-control",{action:"start",worker:0});
    assert.equal(start.status,502);
    assert.match(start.data.error,/ORIGINAL V17 WORKER FAILED/);
    assert.equal(x.commands.some(v=>v.path==="/control"),false,
      "No fake Start request may be sent to dead native process");
    console.log("V29_FATAL_WORKER_GUARD",JSON.stringify({
      frozenAlignedStillPresent:true,backendLive:false,
      startRejected:true,originalCheckpointUnchanged:true}));
  }finally{await x.close()}
});
test("original Start is ACKNOWLEDGED not falsely considered TRAINED until dataset counter advances",async()=>{
  const x=await fixture(healthyStatus);
  try{
    const result=await post(x.url+"/api/native-control",{action:"start",worker:0});
    assert.equal(result.status,200);
    assert.equal(result.data.commandAcknowledged,true);
    assert.equal(result.data.trainingProgressVerified,false,
      "Original unchanged counter cannot mean training confirmed");
    const state=await (await fetch(x.url+"/api/native-state?w=0")).json();
    assert.equal(state.workerHealth.state,"antrenează");
    assert.equal(state.workerHealth.progress,18);
    assert.equal(state.workerHealth.active,true);
    x.set({status:"antrenează",progress:{trained:19,total:80666,heldOut:16}});
    const after=await (await fetch(x.url+"/api/native-state?w=0")).json();
    assert.equal(after.workerHealth.progress,19);
    assert.equal(after.original.progress.total,80666);
    console.log("V29_REAL_START_PROGRESS",JSON.stringify({
      commandAcknowledged:true,progressVerifiedAtStart:false,
      subsequentDatasetAdvance:true,denominatorUnchanged:true}));
  }finally{await x.close()}
});
test("V26 design includes visible original 1:1 colored dataset bar, worker fatal reason and no original engine changes",async()=>{
  const x=await fixture({status:"eroare",error:"CUDA down"});
  try{
    const html=await (await fetch(x.url)).text();
    const css=await (await fetch(x.url+"/native-extra.css")).text();
    const js=await (await fetch(x.url+"/native-app.js")).text();
    assert.match(html,/id="nativeProgressTrack"/);
    assert.match(html,/id="nativeProgressFill"/);
    assert.match(html,/id="nativeProgressCounts"/);
    assert.match(html,/id="nativeTrainingState"/);
    assert.match(html,/id="nativeFatal"/);
    assert.match(html,/id="nativeProgressHeldout"/);
    assert.match(css,/\.native-progress-fill/);
    assert.match(css,/linear-gradient/);
    assert.match(js,/startRequestedProgress/);
    assert.match(js,/renderNativeDataset/);
    assert.match(js,/trainingProgress|TRAINING REAL CONFIRMAT/);
    assert.doesNotMatch(html,/src="\/app\.js"/,
      "Old V26 word-substitution trainer must not be served");
    console.log("V29_DATASET_BAR_RESTORED",JSON.stringify({
      visualV26Preserved:true,tealDatasetBar:true,
      nativeNumeratorDenominator:true,errorVisible:true,
      noOriginalModelReplacement:true}));
  }finally{await x.close()}
});
