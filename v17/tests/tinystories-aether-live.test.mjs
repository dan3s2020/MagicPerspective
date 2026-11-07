import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import net from "node:net";
import {spawn,spawnSync} from "node:child_process";
import {launch,TinyStoriesTrainer} from "../research/tinystories/server.mjs";
import {sourceMetadata,stories} from "../research/tinystories/story-stream.mjs";
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const story=i=>"Once upon a time, there was a little cat named Lily "+i+
 ". Lily loved to explore the big green garden. One morning she found a red ball. "+
 "The cat played with the ball and felt very happy. Finally she went back home.";
const testStory=i=>"A little dog named Tim "+i+" saw a blue toy. "+
 "He gave it to his friend and smiled. The sun was bright and warm.";
const write=(p,items)=>fs.writeFileSync(p,
 items.join("\n<|endoftext|>\n")+"\n<|endoftext|>\n","utf8");
const call=async(url,method="GET")=>{
 const r=await fetch(url,{method,cache:"no-store"});const o=await r.json();
 assert.ok(r.ok,JSON.stringify(o));return o;
};

test("TinyStories text separators stream EXACT raw positions; resume skips already-read items",async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tiny-stream-")),f=path.join(tmp,"train.txt");
 try{
  const originals=[story(1),"A girl saw a café. She smiled.",story(3)];
  write(f,originals);
  const meta=await sourceMetadata(f);
  assert.equal(meta.delimiter,"tiny-mark");
  const all=[];
  for await(const x of stories(f,{metadata:meta}))all.push(x);
  assert.equal(all.length,3);
  assert.equal(all.at(-1).endOffset,meta.size);
  assert.ok(all[1].text.includes("café"));
  assert.ok(all[1].ascii.length>0);
  assert.ok([...all[1].ascii].every(v=>v<128));
  const remaining=[];
  for await(const item of stories(f,{metadata:meta,startOffset:all[0].endOffset}))
   remaining.push(item);
  assert.equal(remaining.length,2);
  assert.equal(remaining[0].text,all[1].text);
  assert.ok(all.every((x,i)=>i===0||x.endOffset>all[i-1].endOffset));
  console.log("TINYSTORIES_STREAM_EXACT_OFFSETS",JSON.stringify({
   testItems:all.length,lastOffset:all.at(-1).endOffset,
   suffixItems:remaining.length,split:meta.delimiter}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test("real independent TinyStories Python GPU protocol: train, LIVE UI, frozen valid, checkpoint and resume",{
 timeout:150000
},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tiny-real-ui-"));
 const train=path.join(tmp,"TinyStories-train.txt"),valid=path.join(tmp,"TinyStories-valid.txt"),
  out=path.join(tmp,"the-isolated-tiny-run");
 write(train,Array.from({length:120},(_,i)=>story(i)));
 write(valid,Array.from({length:31},(_,i)=>testStory(i)));
 const p=await port(),url="http://127.0.0.1:"+p;
 let primary=null,secondary=null;
 try{
  primary=await launch({train,valid,out,device:"numpy",port:p,batchKB:4,batchStories:7,
   saveSeconds:2,resume:true,autoStart:true,autoOpen:false});
  const html=await fetch(url+"/");
  assert.equal(html.status,200);
  const body=await html.text();
  for(const id of ["start","pause","save","test","path","chart","storiesRate",
   "mbRate","stories","accuracy","actual","predicted","fill"])
   assert.ok(body.includes('id="'+id+'"'),"Missing real TinyStories UI "+id);
  const js=await fetch(url+"/app.js");
  assert.equal(js.status,200);
  const client=await js.text();
  assert.match(client,/\/api\/status/);assert.match(client,/\/api\/test/);
  assert.doesNotMatch(client,/Math\.random\(\)|fakeStory|mockGpu/);
  let status=null;
  for(let i=0;i<480;i++){
   status=await call(url+"/api/status");
   if(status.finished&&status.stories>=120)break;
   if(status.error)throw Error(status.error);
   await delay(120);
  }
  assert.ok(status.finished,"not finished: "+JSON.stringify(status).slice(0,2000));
  assert.equal(status.stories,120);
  assert.ok(status.chars>18000);
  assert.equal(status.percent,100);
  assert.ok(status.lastBatch?.chars>0);
  assert.equal(status.lastBatch.gpuWeightsUpdated,false,
   "CI tests real NumPy protocol, not pretend NVIDIA hardware");
  assert.equal(status.sourceDelimiter,"tiny-mark");
  assert.ok(status.history.length>2);
  assert.ok(status.storiesPerSecond>0);
  assert.ok(status.preview?.preUpdate?.actual.length>0);
  assert.ok(status.preview?.preUpdate?.predicted.length>0);
  assert.ok(!status.preview.preUpdate.actual.includes("\u0000"),"Observed text must be rendered as genuine ASCII, not int64 NUL bytes");
  assert.ok(!status.preview.preUpdate.predicted.includes("\u0000"),"Predicted text must not contain int64 serialization NUL bytes");
  assert.ok(fs.existsSync(path.join(out,"tinystories-fast-v1.npz")));
  const prior=JSON.parse(fs.readFileSync(path.join(out,"tinystories-manifest.json"),"utf8"));
  assert.equal(prior.rows,120);
  assert.equal(prior.lastIndex,119);
  assert.equal(prior.offset,fs.statSync(train).size);
  const before=await call(url+"/api/status");
  const result=await call(url+"/api/test?stories=13","POST");
  assert.equal(result.frozen,true);
  assert.equal(result.stories,13);
  assert.ok(result.seen>200);
  assert.ok(result.accuracy>=0&&result.accuracy<=1);
  const after=await call(url+"/api/status");
  assert.equal(after.stories,before.stories,"heldout evaluation changed training");
  assert.equal(after.chars,before.chars,"heldout evaluation changed weights");
  assert.equal(after.checkpointChars,before.checkpointChars);
  assert.equal(after.heldout.frozen,true);
  const names=["google-chrome","chromium","chromium-browser"];
  const browser=names.find(n=>spawnSync("which",[n],{encoding:"utf8"}).status===0);
  if(browser){
   // The browser MUST run asynchronously: blocking this Node process
   // would also block the very same actual HTTP server it needs to fetch.
   const render=await new Promise((resolve,reject)=>{
    const child=spawn(browser,["--headless","--no-sandbox","--disable-gpu",
     "--disable-dev-shm-usage","--dump-dom","--virtual-time-budget=1800",url+"/"]);
    let stdout="",stderr="";
    child.stdout.on("data",d=>stdout+=d.toString());
    child.stderr.on("data",d=>stderr+=d.toString());
    child.on("error",reject);
    child.on("exit",status=>resolve({status,stdout,stderr}));
    setTimeout(()=>{if(child.exitCode===null)child.kill("SIGKILL");},19000).unref();
   });
   assert.equal(render.status,0,render.stderr?.slice(-1200));
   assert.match(render.stdout,/data-tinystories-connected="true"/);
   assert.match(render.stdout,/data-tinystories-trained="120"/);
   console.log("TINYSTORIES_BROWSER_REAL_LIVE",JSON.stringify({browser,trained:120,realDOM:true}));
  }
  console.log("TINYSTORIES_ACTUAL_GPU_PROTOCOL_TRAINING",JSON.stringify({
   trainerDevice:"numpy",realCuda:false,stories:status.stories,
   chars:status.chars,liveUpdates:status.updates,checkpoint:prior.offset,
   verifiedHeldoutStories:result.stories,heldoutAccuracy:result.accuracy,
   model:"hashed-4-order-conditional-counts"}));
  await primary.close();primary=null;
  const p2=await port();
  secondary=await launch({train,valid,out,device:"numpy",port:p2,batchKB:4,
   batchStories:7,saveSeconds:2,resume:true,autoStart:false});
  const recovered=secondary.app.readStatus();
  assert.equal(recovered.stories,120);
  assert.equal(recovered.chars,status.chars);
  assert.equal(recovered.lastIndex,119);
  assert.ok(recovered.checkpointChars>=status.chars);
  secondary.app.start();
  for(let j=0;j<100&&!secondary.app.finished;j++)await delay(80);
  assert.equal(secondary.app.state.stories,120,"Duplicate training on resume");
  console.log("TINYSTORIES_CHECKPOINT_RESUME",JSON.stringify({
   recovered:recovered.stories,noDuplicateTraining:true,validSeparate:true,
   bytes:fs.statSync(path.join(out,"tinystories-fast-v1.npz")).size
  }));
 }finally{
  if(primary)await primary.close();
  if(secondary)await secondary.close();
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
test("rejects accidental data leakage and unrelated checkpoint overwrite",async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tiny-protect-"));
 const f=path.join(tmp,"train.txt"),other=path.join(tmp,"out");
 write(f,[story(1),story(2)]);
 fs.mkdirSync(other);fs.writeFileSync(path.join(other,"important.txt"),"DO NOT ERASE");
 try{
  assert.throws(()=>new TinyStoriesTrainer({train:f,valid:f,out:other}),/DISTINCT/);
  const t=new TinyStoriesTrainer({train:f,valid:path.join(tmp,"valid.txt"),out:other,device:"numpy"});
  write(path.join(tmp,"valid.txt"),[testStory(1)]);
  await assert.rejects(()=>t.init(),/Refusing to overwrite/);
  assert.equal(fs.readFileSync(path.join(other,"important.txt"),"utf8"),"DO NOT ERASE");
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
