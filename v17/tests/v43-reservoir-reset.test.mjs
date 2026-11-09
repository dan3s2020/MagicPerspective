import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {EventEmitter} from "node:events";
import {V43TextReservoir} from "../transcend/torus-aether/devour/v43-text-reservoir.mjs";
import {archiveV43Session,v43OwnedSessionFiles,stopV43WorkerForReset}
  from "../transcend/torus-aether/devour/v43-reset.mjs";

test("Parquet reservoir keeps three REAL future batches loaded, FIFO and bounded",async()=>{
  const arrivals=Array.from({length:14},(_,i)=>({
    meta:[{k:i,prompt:"original "+i,answer:"real "+i}],
    exs:[Array.from({length:45000},(_,j)=>(j+i)%128)],
    chars:45000
  }));
  let cursor=0;
  const r=new V43TextReservoir(async()=>{
    await Promise.resolve();
    return arrivals[cursor++]||null;
  },{depth:3,maxCharacters:150000});
  r.start();
  const seen=[];
  for(let i=0;i<14;i++){
    const item=await r.take();
    assert.equal(item.meta[0].k,i,"Original dataset must never reorder");
    seen.push(item);
    assert.ok(r.state.readyBatches<=3);
    assert.ok(r.state.queuedCharacters<=180000,
      "Host cannot accumulate more than the bounded original reservoir");
    assert.ok(r.peek(2).length<=2);
  }
  assert.equal(await r.take(),null);
  assert.equal(r.totalTaken,14);
  assert.ok(r.peakQueuedCharacters>0,"Future real texts are prepared while CUDA runs");
  r.close();
});
test("same V42 Brain cannot reset until its CUDA child ACK and terminate completed",async()=>{
  class FakeWorker extends EventEmitter{
    constructor(){super();this.events=[];}
    postMessage(m){
      assert.equal(m,"shutdown-reset");
      this.events.push("stop-python");
      queueMicrotask(()=>{
        this.events.push("python-closed");
        this.emit("message",{type:"v43-reset-ready",noGpuProcessRetained:true});
      });
    }
    async terminate(){
      this.events.push("old-worker-terminated");
      return 1;
    }
  }
  const worker=new FakeWorker();
  const result=await stopV43WorkerForReset(worker);
  assert.equal(result.acknowledged,true);
  assert.deepEqual(worker.events,["stop-python","python-closed","old-worker-terminated"]);
});
test("verified reset archives EVERY V43 sidecar without deleting unrelated files",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"v43-reset-"));
  try{
    const brain=path.join(dir,"brains","brain-0-winner.v8");
    fs.mkdirSync(path.dirname(brain),{recursive:true});
    const suffixes=["",".v43-status.json",".v43-live.json",
      ".v43-exercises.jsonl",".shared.pt",".causal.json",
      ".native-paths.json",".path-atlas.jsonl",".xd-atlas.jsonl"];
    for(const suffix of suffixes)fs.writeFileSync(brain+suffix,Buffer.from("authentic "+suffix));
    const unrelated=path.join(path.dirname(brain),"brain-1-other.v8");
    fs.writeFileSync(unrelated,"must remain");
    assert.equal(v43OwnedSessionFiles(brain).length,suffixes.length);
    const archive=archiveV43Session(brain,path.join(dir,"brains-before-reset"),{stamp:147});
    assert.equal(archive.verified,true);
    assert.equal(archive.movedCount,suffixes.length);
    assert.equal(v43OwnedSessionFiles(brain).length,0);
    assert.equal(fs.readFileSync(unrelated,"utf8"),"must remain");
    const manifest=JSON.parse(fs.readFileSync(path.join(archive.destination,"RESET_MANIFEST.json"),"utf8"));
    assert.equal(manifest.complete,true);
    assert.deepEqual(manifest.files,archive.files);
    assert.throws(()=>archiveV43Session(brain,path.join(dir,"brains-before-reset"),{stamp:147}),/collision/);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test("original native UI has Reset control and V43 worker start identity",()=>{
  const dir=new URL("../",import.meta.url);
  const ui=fs.readFileSync(new URL("./apps/hypermaze-studio-v26/public/native-v43.html",dir),"utf8");
  const code=fs.readFileSync(new URL("./transcend/torus-aether/devour/devour.mjs",dir),"utf8");
  const v43=fs.readFileSync(new URL("./apps/hypermaze-studio-v26/public/v43-ui.js",dir),"utf8");
  assert.ok(ui.includes('id="resetBtn"'));
  assert.ok(code.includes("verifiedV43Reset"));
  assert.ok(code.includes("await stopV43WorkerForReset"));
  assert.ok(code.includes("archiveV43Session"));
  assert.ok(v43.includes("w.startTime!==model.sessionStart"));
});
