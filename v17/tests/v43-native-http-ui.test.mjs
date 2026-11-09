import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Load the real original V42 native bridge, only enabling its additive V43 mode.
process.env.MAGICPERSPECTIVE_V43_UI="1";
const {createNativeBridge}=await import("../apps/hypermaze-studio-v26/native-bridge.mjs");

const listen=server=>new Promise((ok,fail)=>server.once("error",fail).listen(0,"127.0.0.1",()=>ok(server.address().port)));
const close=server=>new Promise(ok=>server.close(ok));

test("V43 same original V42 browser port: UI, real source sidecars, same Start Training route",async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v43-http-"));
  const checkpoint=path.join(dir,"brain-0-winner.v8");
  fs.writeFileSync(checkpoint,"mock-only: no original weights are replaced");
  const record={id:3,input:"Cât este 1+1? 🌐",exerciseReference:"2",player1:{
    before:{text:"1",score:{accuracy:0}},
    after:{text:"2",score:{accuracy:1}}},
    player2:{output:"2",score:{accuracy:1},allMovements:[{from:1,to:2}]}
  };
  fs.writeFileSync(checkpoint+".v43-exercises.jsonl",JSON.stringify(record)+"\n");
  fs.writeFileSync(checkpoint+".v43-live.json",JSON.stringify({
    format:"magicperspective/v43-live/v1",at:new Date().toISOString(),active:true,
    phase:"planning full donor coordinate movements",sourceRow:19,
    input:"Cât este 1+1?",reference:"2",beforeText:"1",beforeAccuracy:0,
    outputPrefix:"2",plannedBytes:1,totalBytes:1,bytesPerSecond:100
  }));
  fs.writeFileSync(checkpoint+".v43-status.json",JSON.stringify({
    format:"magicperspective/v43-one-universe/v1",completed:3,
    history:[{id:3,at:new Date().toISOString(),before:0,player2:1,after:1}],
    lastExercise:record,completedExercisesPerSecond:3.25,
    completedCharactersPerSecond:20
  }));
  let running=false,native=null,bridge=null;
  try{
    native=http.createServer((req,res)=>{
      const u=new URL(req.url,"http://127.0.0.1");
      const json=x=>{res.writeHead(200,{"content-type":"application/json"});res.end(JSON.stringify(x));};
      if(u.pathname==="/health")return json({checkpoint,status:running?"antrenează":"pauză",
        health:{phase:running?"text CUDA: self-index":"text CUDA: self-index",
          state:"running",heartbeatAgeMs:350,batch:{phase:"text CUDA: self-index",done:16400,total:50000},
          realDatasetRowsRead:2,lastRealDatasetRowIndex:1,
          gpuBatchQueuedRows:2,gpuBatchQueuedCharacters:100000},
        dataset:{assignedTrainingRows:40,completedTrainingRows:10,percent:25}});
      if(u.pathname==="/graphs")return json({graphs:[{w:0,status:running?"antrenează":"pauză",
        progress:{trained:10,total:40}}]});
      if(u.pathname==="/graph")return json({nodes:[],edges:[]});
      if(u.pathname==="/control"&&req.method==="POST"){
        assert.equal(u.searchParams.get("do"),"start");
        running=true;return json({ok:true});
      }
      res.writeHead(404);res.end();
    });
    const nativePort=await listen(native);
    bridge=await createNativeBridge({port:0,nativePort});
    const page=await fetch(bridge.url+"/");
    assert.equal(page.status,200);
    const html=await page.text();
    assert.ok(html.includes('id="startBtn"'),"Original V42 Start Training must remain");
    assert.ok(html.includes('id="v43ToggleGraph"'),"V43 hides original universe");
    assert.ok(html.includes('id="v43Rows"'),"V43 full exercise journal belongs to original UI");
    const originalJs=await fetch(bridge.url+"/native-app.js");
    assert.equal(originalJs.status,200);
    assert.ok((await originalJs.text()).includes('$("startBtn").addEventListener'));
    const extraJs=await fetch(bridge.url+"/v43-ui.js");
    assert.equal(extraJs.status,200);
    const status=await (await fetch(bridge.url+"/api/v43-status")).json();
    assert.equal(status.mode,"V43_ONE_ORGANISM_ONLY");
    assert.equal(status.dataset.v43Percent,25,"original V42 resumed dataset progress");
    assert.equal(status.dataset.v43Completed,3,"V43-only fused count separate");
    assert.equal(status.health.realDatasetRowsRead,2,"decoded rows must be independent from completed CUDA rows");
    assert.equal(status.health.batch.done,16400,"live CUDA phase must not freeze at zero");
    assert.equal(status.health.gpuBatchQueuedRows,2);
    assert.equal(status.worker.lastExercise.input,record.input);
    assert.equal(status.live.active,true);
    assert.equal(status.live.sourceRow,19);
    assert.equal(status.live.beforeText,"1");
    assert.equal(status.live.outputPrefix,"2");
    assert.ok((await (await fetch(bridge.url+"/v43-ui.js")).text()).includes('v43-correct'));
    const journal=await (await fetch(bridge.url+"/api/v43-exercises?limit=10")).json();
    assert.equal(journal.items.length,1);
    assert.equal(journal.items[0].input,record.input);
    assert.deepEqual(journal.items[0].player2.allMovements,record.player2.allMovements);
    const start=await fetch(bridge.url+"/api/native-control",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({action:"start",worker:0})
    });
    assert.equal(start.status,200);
    assert.equal((await start.json()).original.ok,true);
    assert.equal(running,true,"Start Training must call ORIGINAL V42 native /control");
  }finally{
    if(bridge)await bridge.close();
    if(native)await close(native);
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
