import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {createNativeBridge,pickNativeGraph,nativeSnapshot} from "../native-bridge.mjs";
import {nativeMeasurements,summarizeNativeEvaluation,formatDatasetProgress,
  formatPct} from "../native-metrics.mjs";

const nativeOriginal={
  world:"D:\\training\\OpenThoughts3-1.2M",worlds:["text","maze","transform"],
  corpus:{kind:"parquet",totalRows:1210000,trainRows:1209984,heldOut:16},
  gpu:{device:"cuda:0",util:100},
  graphs:[
    {w:0,arm:"winner",status:"antrenează",worlds:["text","maze","transform"],
      chars:1600000,
      test:{n:4000,aligned:.642,live:.617,field:.551,together:.581,C:.594,masked:.594},
      progress:{trained:4,total:1209984,heldOut:16,remaining:1209980,mode:"native-text"},
      maze:{played:512,test:{n:512,solved:1,shape:1,ratio:1}},
      transform:{played:100,test:{solved:.82,failedRate:.11,ratio:1.28,impossible:10,saidLimitation:8}},
      gpu:{settings:{device:"cuda:0"},text:{hostMs:{
        sustainedExercisesPerSecond:11.48,sustainedCharactersPerSecond:98765,
        charactersPerSecond:102000}}}},
    {w:1,arm:"stable+many",status:"oprit",worlds:["text"],
      chars:100000,test:{n:4000,aligned:.52,live:.5,together:.48},
      progress:{trained:2,total:1209984,heldOut:16}}
  ]
};
const nativeGraph={
  w:0,nodes:[
    ["a","symbol","alpha",3,0,0],["b","symbol","beta",4,1,0],
    ["c","C","gamma",2,2,0]
  ],
  edges:[["a","b","follows",1],["b","c","align",.5]],
  U:[["a",[.1,.2,.3,.4,.5]],["b",[.3,.4,.5,.6,.7]],["c",[.5,.2,.1,.8,.9]]],
  flow:[["a","b"]],
  shared:{training:{step:100,preUpdatePredictionLoss:.348,
    identityBaselineLoss:.721,
    trace:{before:[0,.1],predicted:[.2,.3],observed:[.15,.25]}}}
};
const frozenText={w:0,lived:6000,T:.4,noise:0,answer:.625,all:.7,oldAnswer:.55,
  exercises:[{n:5,a0:2,answer:.625,all:.7,oldAnswer:.55,
    shape:"ab",shapeSame:.5,rows:[[65,65],[66,67],[67,67],[68,69],[69,69]]}]};
const makeFakeNative=async()=>{
  const commands=[];
  const fake=http.createServer(async(req,res)=>{
    const url=new URL(req.url,"http://localhost");
    let input="";
    for await(const b of req)input+=b;
    commands.push({method:req.method,path:url.pathname,search:url.search,body:input});
    res.setHeader("content-type","application/json; charset=utf-8");
    if(url.pathname==="/graphs")res.end(JSON.stringify(nativeOriginal));
    else if(url.pathname==="/graph")res.end(JSON.stringify(nativeGraph));
    else if(url.pathname==="/control"||url.pathname==="/controls"||
      url.pathname==="/gpu")res.end(JSON.stringify({ok:true,graphs:[0,1]}));
    else if(url.pathname==="/eval")res.end(JSON.stringify(frozenText));
    else {res.statusCode=404;res.end(JSON.stringify({error:"not found"}));}
  });
  await new Promise(ok=>fake.listen(0,"127.0.0.1",ok));
  return {server:fake,commands,port:fake.address().port,
    close:()=>new Promise(ok=>fake.close(ok))};
};
test("exact native V17 KPI and corpus denominator parity, absent is not synthetic success",()=>{
  const normalized=nativeSnapshot(nativeOriginal,nativeGraph,0);
  const m=nativeMeasurements(normalized);
  assert.equal(m.aligned,.642);
  assert.equal(m.live,.617);
  assert.equal(m.together,.581);
  assert.equal(m.C,.594);
  assert.equal(m.field,.551);
  assert.equal(m.mazeShape,1);
  assert.equal(m.mazeSolved,1);
  assert.equal(m.mazeRatio,1);
  assert.equal(m.transformSolved,.82);
  assert.equal(m.transformFailedRate,.11);
  assert.equal(m.progressTrained,4);
  assert.equal(m.progressTotal,1209984);
  assert.equal(m.progressHeldout,16);
  assert.equal(m.sustainedCharactersPerSecond,98765);
  assert.equal(m.completedExercisesPerSecond,11.48);
  assert.equal(m.preUpdatePredictionLoss,.348);
  assert.equal(m.identityBaselineLoss,.721);
  assert.equal(m.nativeGraphNodes,3);
  assert.equal(m.nativeGraphEdges,2);
  assert.equal(formatDatasetProgress({trained:4,total:1209984}),"0.0003%");
  assert.equal(formatPct(m.aligned),"64.2%");
  const absent=nativeMeasurements(nativeSnapshot({graphs:[{w:7}]},null,7));
  assert.equal(absent.aligned,null);
  assert.equal(absent.completedExercisesPerSecond,null);
  assert.equal(absent.progressPercent,"—");
  assert.equal(absent.nativeGraphNodes,null);
  assert.equal(pickNativeGraph(nativeOriginal,1).w,1);
  console.log("V28_NATIVE_KPI_PARITY",JSON.stringify({
    aligned:formatPct(m.aligned),live:formatPct(m.live),
    together:formatPct(m.together),mazeShape:formatPct(m.mazeShape),
    exactOriginalProgress:m.progressPercent,
    actuallyCompletedPerSecond:m.completedExercisesPerSecond,
    noFakeAccuracy:true,noSyntheticTraining:true}));
});
test("real original eval-worker text row pairs are decoded, without synthetic target substitutions",()=>{
  const r=summarizeNativeEvaluation({original:frozenText});
  assert.equal(r.kind,"text");
  assert.equal(r.answer,.625);
  assert.equal(r.exercises.length,1);
  assert.equal(r.exercises[0].rows.length,5);
  assert.equal(r.exercises[0].answerStart,2);
  assert.equal(r.exercises[0].shape,"ab");
  const diff=r.exercises[0].rows.map(([correct,guess])=>correct===guess);
  assert.deepEqual(diff,[true,false,true,false,true]);
  const ma=summarizeNativeEvaluation({original:{mazes:[
    {n:7,solved:true,first:1},{n:9,solved:false,first:.5}]}});
  assert.equal(ma.solved,1);assert.equal(ma.meanFirstShape,.75);
  const tr=summarizeNativeEvaluation({original:{tasks:[
    {solved:true,impossible:false,predicted:10,failed:1},
    {solved:false,impossible:true,said:true,predicted:0,failed:0}]}});
  assert.equal(tr.solved,1);assert.equal(tr.failedRate,.1);
  console.log("V28_NATIVE_FROZEN_EVAL",JSON.stringify({
    originalResponseRetained:true,
    trueCorrectVsPredictedDiff:true,unseenQAShapeAvailable:true,
    originalMazeAndTransformCompatible:true}));
});
test("native bridge: new V26 HTML, exact original GET /graphs /graph, original POST control/eval and native evidence",async()=>{
  const source=await makeFakeNative();
  let bridge;
  try{
    bridge=await createNativeBridge({port:0,nativePort:source.port,inspectCuda:async()=>({ok:true,python:'test-only-fixture'})});
    const base=bridge.url;
    const txt=async p=>(await fetch(base+p)).text();
    const get=async p=>{const r=await fetch(base+p);assert.equal(r.status,200,p);return r.json();};
    const post=async (p,b)=>{
      const r=await fetch(base+p,{method:"POST",
        headers:{"content-type":"application/json"},body:JSON.stringify(b)});
      return {status:r.status,body:await r.json()};
    };
    const html=await txt("/");
    const css=await txt("/style.css");
    const js=await txt("/native-app.js");
    assert.match(html,/Hypermaze/);
    assert.match(html,/native-app\.js/);
    assert.match(html,/ALIGNED V17/);
    assert.match(html,/Ce nimerește și ce greșește/);
    assert.match(css,/\.canvas-frame/);
    assert.match(js,/\/api\/native-state/);
    assert.doesNotMatch(html,/src="\/app\.js"/);
    assert.doesNotMatch(js,/\b(?:new\s+ObservedEffects|chooseAxisPhysics\s*\(|makeTask\s*\()/,
      "No executable V26 synthetic training calls may be used");
    const health=await get("/api/native-health");
    assert.equal(health.connected,true);
    const state=await get("/api/native-state?w=0");
    assert.deepEqual(state.original,nativeOriginal.graphs[0]);
    assert.deepEqual(state.graph,nativeGraph);
    assert.deepEqual(state.corpus,nativeOriginal.corpus);
    assert.equal(state.selectedWorker,0);
    assert.equal(state.version,"V28_NATIVE_V17_UI");
    const start=await post("/api/native-control",{action:"start",worker:0});
    assert.equal(start.status,200);
    const save=await post("/api/native-control",{action:"save",worker:0});
    assert.equal(save.body.ok,true);
    const noReset=await post("/api/native-control",{action:"reset",worker:0});
    assert.equal(noReset.status,502);
    const evaled=await post("/api/native-eval",{
      kind:"text",worker:0,count:12,maxChars:20000,temperature:.4,noise:0});
    assert.equal(evaled.status,200);
    assert.deepEqual(evaled.body.original,frozenText);
    assert.equal(JSON.parse(source.commands.find(x=>x.path==="/eval").body).kind,"text");
    assert.equal(JSON.parse(source.commands.find(x=>x.path==="/eval").body).w,0);
    assert.equal(source.commands.find(x=>x.path==="/eval").method,"POST");
    const noise=await post("/api/native-params",{worker:0,pnoise:.3,ltemp:.8});
    assert.equal(noise.status,200);
    const gpu=await post("/api/native-gpu",{
      device:"cuda:0",worlds:4,textBatch:8,vram:3,util:100});
    assert.equal(gpu.status,200);
    const evidence=await get("/api/native-evidence?w=0");
    assert.deepEqual(evidence.graphs,nativeOriginal);
    assert.deepEqual(evidence.selectedGraph,nativeGraph);
    assert.ok(source.commands.every(x=>x.path!=="/api/control"&&x.path!=="/api/eval"),
      "Bridge cannot accidentally call V26 synthetic training");
    assert.ok(source.commands.some(x=>x.path==="/controls"&&
      x.search.includes("pnoise=0.3")));
    assert.ok(source.commands.some(x=>x.path==="/gpu"&&
      x.search.includes("device=cuda%3A0")));
    console.log("V28_NATIVE_TRANSPORT",JSON.stringify({
      nativeUpstream:"ORIGINAL V17",uiHtml:true,originalGraphBytes:true,
      noV26Model:true,saveOriginal:true,frozenOriginal:true,
      exactOriginalNumerators:true,gpuControlsForwarded:true}));
  }finally{
    if(bridge)await bridge.close();
    await source.close();
  }
});
test("exact original V17 engine and data dataset modules unchanged in V28 branch",async()=>{
  const sha=async file=>{
    const b=await fs.readFile(file);
    return createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
  };
  const root=fileURLToPath(new URL("../../..",import.meta.url));
  const frozen={
    "transcend/torus-aether/worlds/exercise.mjs":"739d6c5cc36e8d43b83dc66f499c5140aca414d3",
    "transcend/torus-aether/devour/devour.mjs":"c03307181340a37c088b7b01e13ce49d180ef3f5",
    "transcend/torus-aether/ui/app.js":"680896211b75074ab6047546f8ea45a4b0e35b8c",
    "transcend/torus-aether/ui/index.html":"8f315490a6d9b277dfa787f10fea81022b2cd043",
    "transcend/torus-aether/devour/worker.mjs":"5856fc5151f3b5612706b341048885ba3697e5f2",
    "transcend/torus-aether/devour/brain.mjs":"92abe452dd4f66e09cd321201dbcdac3ab9f55a6",
    "transcend/torus-aether/devour/eval-worker.mjs":"1d95b7e7f4ceac78063444973d83bfb2ed32ba39",
    "transcend/torus-aether/data/text-dataset.mjs":"ed8bd09ca9cddbfcd1e14c292d3ddeb67d6a2ba7"
  };
  for(const [p,expect]of Object.entries(frozen))
    assert.equal(await sha(path.join(root,p)),expect,"V28 modified ORIGINAL native training: "+p);
  console.log("V28_ORIGINAL_BYTE_PARITY",JSON.stringify({
    unchangedOriginalTrainingFiles:Object.keys(frozen).length,allExact:true}));
});
