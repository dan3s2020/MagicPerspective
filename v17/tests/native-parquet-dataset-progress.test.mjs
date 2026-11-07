import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import net from "node:net";
import path from "node:path";
import {spawn,spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
const v17=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const freePort=()=>new Promise((ok,no)=>{
 const listener=net.createServer();listener.once("error",no);
 listener.listen(0,"127.0.0.1",()=>{
  const port=listener.address().port;listener.close(()=>ok(port));
 });
});
test("original V17 live server on ACTUAL Parquet: 40 rows, 24 train, 16 heldout, exact progress",{timeout:120000},async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"magic-real-parquet-progress-"));
 const root=path.join(temp,"data"),out=path.join(temp,"run");fs.mkdirSync(root,{recursive:true});
 const py=[
  "import pathlib, sys",
  "import pyarrow as pa",
  "import pyarrow.parquet as pq",
  "d=pathlib.Path(sys.argv[1]);d.mkdir(parents=True,exist_ok=True)",
  "for shard in range(2):",
  "  data=[{'question':f'Q {shard*20+i}: how do context words change when evidence arrives?',",
  "         'answer':f'A {shard*20+i}: a prediction adapts after an observed transition.'} for i in range(20)]",
  "  pq.write_table(pa.Table.from_pylist(data),str(d / f'train-{shard:02d}.parquet'))"
 ].join("\n");
 const python=process.env.PYTHON||"python3";
 const make=spawnSync(python,["-c",py,root],{encoding:"utf8",timeout:30000});
 assert.equal(make.status,0,"Failed to make real Parquet files: "+make.stderr);
 const port=await freePort();
 const child=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","text",
  "--data",root,"--out",out,"--port",String(port),
  "--gpu","off","--mem","2","--every","100000",
  "--start","--magic-view","--math-axes"
 ],{cwd:v17,stdio:["ignore","pipe","pipe"],detached:true});
 let logs="";for(const stream of [child.stdout,child.stderr])
  stream.on("data",buf=>logs=(logs+String(buf)).slice(-16000));
 const base="http://127.0.0.1:"+port;
 try{
  let result=null,hadPartial=false;
  for(let i=0;i<280;i++){
   if(child.exitCode!==null)throw Error("Native V17 process exited: "+logs);
   try{
    const r=await fetch(base+"/graphs",{cache:"no-store"});
    if(r.ok){
     const data=await r.json(),g=data.graphs[0],D=g?.dataset;
     assert.equal(data.dataset.rows,40);
     assert.equal(data.dataset.trainRows,24);
     assert.equal(data.dataset.heldOutRows,16);
     assert.equal(data.dataset.files,2);
     assert.equal(D.trainingTotal,24);
     assert.equal(D.datasetRows,40);
     assert.equal(D.heldOutRows,16);
     if(D.processed>0&&D.processed<24)hadPartial=true;
     if(D.processed===24&&D.percent===100){result={data,g,D};break;}
    }
   }catch(e){
    if(e?.code==="ERR_ASSERTION")throw e;
   }
   await sleep(120);
  }
  assert.ok(result,"Original Parquet trainer did not consume all 24/24 training rows: "+logs);
  assert.ok(hadPartial||result.g.exercises===24,"Training counter did not advance");
  assert.equal(result.data.dataset.processed.total,24);
  assert.equal(result.data.dataset.processed.processed,24);
  const snapResp=await fetch(base+"/graph?w=0");
  assert.equal(snapResp.status,200);
  const snap=await snapResp.json();
  assert.equal(snap.dataset.trainingTotal,24);
  assert.equal(snap.dataset.heldOutRows,16);
  assert.equal(snap.dataset.percent,100);
  assert.equal(snap.exercises,24);
  assert.ok(snap.chars>100);
  const page=await(await fetch(base+"/transcend/torus-aether/ui/magic.html?live=1")).text();
  assert.match(page,/id="datasetProgressBar"/);
  assert.match(page,/id="mExercises"/);
  const original=await(await fetch(base+"/transcend/torus-aether/ui/index.html?live=1")).text();
  assert.match(original,/id="trainingDatasetBar"/);
  console.log("LIVE_FULL_REAL_PARQUET_DATASET_PROGRESS",JSON.stringify({
   parquetFiles:2,realRows:40,training:24,heldout:16,
   committed:result.D.processed,percent:result.D.percent,
   characters:snap.chars,originalAndMagicUI:true}));
 }finally{
  try{process.kill(-child.pid,"SIGTERM");}
  catch{try{child.kill("SIGTERM");}catch{}}
  await sleep(250);
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
