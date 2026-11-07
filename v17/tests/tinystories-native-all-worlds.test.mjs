import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";
import {spawn,spawnSync} from "node:child_process";
import {launch} from "../research/tinystories/server.mjs";
const delay=t=>new Promise(resolve=>setTimeout(resolve,t));
const port=()=>new Promise((resolve,reject)=>{
 const server=net.createServer();server.once("error",reject);
 server.listen(0,"127.0.0.1",()=>{const number=server.address().port;server.close(()=>resolve(number));});
});
const story=i=>"Once upon a time, there was a little fox named Milo "+i+
 ". It went to the river every morning. Milo found a bright stone."+
 " The stone looked like the moon. The fox brought the stone home and slept happily.";
const write=(f,rows)=>fs.writeFileSync(f,rows.join("\n<|endoftext|>\n")+
 "\n<|endoftext|>\n","utf8");
const get=async(url,method="GET")=>{
 const r=await fetch(url,{method});const j=await r.json();
 if(!r.ok||j.error)throw Error(JSON.stringify(j).slice(0,1500));return j;
};
async function until(f,ms=120000){
 const deadline=Date.now()+ms;
 let latest=null;
 while(Date.now()<deadline){
  latest=await f();
  if(latest)return latest;
  await delay(400);
 }
 throw Error("Native multiworld timed out: "+JSON.stringify(latest));
}
test("Fast CUDA-architecture text feed runs in PARALLEL with true original Brain native maze/transform/5D/causal/constructed worlds",{
 timeout:260000
},async()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"tiny-native-all-"));
 const train=path.join(tmp,"TinyStories-train.txt"),valid=path.join(tmp,"TinyStories-valid.txt"),
  out=path.join(tmp,"independent-output");
 write(train,Array.from({length:12},(_,i)=>story(i)));
 write(valid,Array.from({length:5},(_,i)=>"A girl visited a beautiful tree "+i+
  ". She laughed and climbed. Then she went home."));
 let app=null,recovered=null;
 try{
  const p=await port(),url="http://127.0.0.1:"+p;
  app=await launch({train,valid,out,device:"numpy",port:p,
   batchKB:4,batchStories:4,saveSeconds:2,
   nativeWorlds:true,nativeTextEvery:2,nativeTextBytes:12,
   nativeWorldEvery:4,autoStart:true,autoOpen:false});
  const html=await (await fetch(url+"/")).text();
  const source=await (await fetch(url+"/native-ui.js")).text();
  for(const id of ["nativePct","nativeFill","nativeLag","mazeWorlds",
    "transformWorlds","perspectiveStates","constructedPairs","graphNodes",
    "selfCodeTicks","nativeGraph","nativeWorldInfo","nativePredicted","nativeActual",
    "scoreLanguage","scoreMaze","scoreConstructed","scoreTransform",
    "nativeStart","nativeTest","nativeGraphRefresh"]){
   assert.ok(html.includes('id="'+id+'"'),"Missing all-world real UI "+id);
  }
  assert.match(source,/\/api\/status/);
  assert.match(source,/\/api\/native-test/);
  assert.doesNotMatch(source,/Math\.random\(|mockNative|demoNodes|fakeScores/);
  const progress=await until(async()=>{
   const s=await get(url+"/api/status");
   if(s.native?.status==="error")throw Error("Native V17 failed: "+s.native.error);
   return (s.finished&&s.native?.stories>=8&&
     s.native?.mazes?.played>=1&&s.native?.transformations?.played>=1&&
     s.native?.graph?.nodes?.length>0&&s.native?.selfCode?.ticks>=1)?s:null;
  },140000);
  assert.equal(progress.stories,12);
  assert.equal(progress.percent,100);
  assert.equal(progress.native.gpuOriginal,false);
  assert.ok(progress.native.mazes.played>=1);
  assert.ok(progress.native.transformations.played>=1);
  assert.ok(progress.native.mazes.perspectiveEpisodes>=1);
  assert.ok(progress.native.text.observedStories>=8);
  assert.ok(progress.native.text.contextualStates>0);
  assert.ok(progress.native.text.graphNodes>0);
  assert.ok(progress.native.text.constructedTextPairs>0);
  assert.ok(progress.native.text.sampledGraphBytes>0);
  assert.equal(progress.native.nativeTextSymbolEvery,2);
  assert.equal(progress.native.nativeTextBytesPerSelectedStory,12);
  assert.ok(progress.native.graph.U.length>0);
  const nativeAtStart=progress.native.stories;
  const testAck=await get(url+"/api/native-test","POST");
  assert.equal(testAck.accepted,true);
  const measured=await until(async()=>{
   const s=await get(url+"/api/status");
   if(s.native?.error)throw Error(s.native.error);
   return s.native?.exam?.frozen?s:null;
  },100000);
  assert.equal(measured.native.exam.mazes.count,4);
  assert.equal(measured.native.exam.transforms.count,3);
  assert.equal(measured.native.exam.constructed.count,3);
  for(const domain of ["mazes","constructed","transforms"]){
   const rate=measured.native.exam[domain].solvedRate;
   assert.ok(typeof rate==="number"&&rate>=0&&rate<=1,
    "Original native world score must be real measured probability: "+domain);
  }
  assert.equal(measured.native.stories>=nativeAtStart,true);
  const browser=["google-chrome","chromium","chromium-browser"].find(name=>
   spawnSync("which",[name],{encoding:"utf8"}).status===0);
  if(browser){
   const output=await new Promise((resolve,reject)=>{
    const child=spawn(browser,["--headless","--no-sandbox","--disable-gpu",
     "--disable-dev-shm-usage","--dump-dom","--virtual-time-budget=2000",url+"/"]);
    let stdout="",stderr="";
    child.stdout.on("data",d=>stdout+=d.toString());child.stderr.on("data",d=>stderr+=d.toString());
    child.on("error",reject);child.on("exit",status=>resolve({status,stdout,stderr}));
    setTimeout(()=>{if(child.exitCode===null)child.kill("SIGKILL");},19000).unref();
   });
   assert.equal(output.status,0,output.stderr.slice(-1500));
   assert.match(output.stdout,/data-tinystories-connected="true"/);
   assert.match(output.stdout,/data-native-v17-learned="[1-9]\d*"/);
   console.log("REAL_TINYSTORIES_NATIVE_CHROME",JSON.stringify({
    browser,realNativeDOM:true,fastStories:progress.stories,
    nativeStories:measured.native.stories}));
  }
  const save=await get(url+"/api/save","POST");
  assert.equal(save.accepted,true);
  await app.close();app=null;
  const nativeFile=path.join(out,"tinystories-native-v17.v8"),
   nativeCode=path.join(out,"tinystories-native-v17.v8.selfcode.json");
  assert.ok(fs.existsSync(nativeFile)&&fs.statSync(nativeFile).size>500);
  assert.ok(fs.existsSync(nativeCode));
  const p2=await port();
  recovered=await launch({train,valid,out,device:"numpy",port:p2,
   batchKB:4,batchStories:4,saveSeconds:2,
   nativeWorlds:true,nativeTextEvery:2,nativeTextBytes:12,
   nativeWorldEvery:4,autoStart:false});
  const resume=await until(async()=>{
   const s=recovered.app.readStatus();
   return s.native?.stories>=measured.native.stories?s:null;
  },20000);
  assert.equal(resume.stories,12);
  assert.equal(resume.native.stories,measured.native.stories);
  assert.ok(resume.native.mazes.played>=1);
  assert.ok(resume.native.transformations.played>=1);
  assert.equal(resume.native.exam?.frozen,true,"Independent native capability scores must survive checkpoint restart");
  assert.equal(resume.native.exam.mazes.count,4);
  assert.equal(resume.native.exam.transforms.count,3);
  const a=await get("http://127.0.0.1:"+p2+"/api/native-start","POST");
  assert.equal(a.accepted,true);
  await delay(500);
  const after=recovered.app.readStatus();
  assert.equal(after.native.stories,resume.native.stories,
   "Restart must not reconsume original V17 stories from earlier checkpoint");
  console.log("REAL_TINYSTORIES_ALL_NATIVE_WORLDS",JSON.stringify({
   fastStories:resume.stories,originalV17Stories:resume.native.stories,
   originalMazeWorlds:resume.native.mazes.played,
   originalCausalWorlds:resume.native.transformations.played,
   originalTextPerspectives:resume.native.text.contextualStates,
   originalGraphNodes:resume.native.text.graphNodes,
   observedSelfCode:resume.native.selfCode.ticks,
   independentSeededExam:resume.native.exam?.frozen||false,
   nativeSaved:fs.statSync(nativeFile).size,
   gpuBenchmarkOnNvidia:false,source:"real deterministic TinyStories-format fixture",
   noMadeUpIQ:true}));
 }finally{
  if(app)await app.close();
  if(recovered)await recovered.close();
  fs.rmSync(tmp,{recursive:true,force:true});
 }
});
