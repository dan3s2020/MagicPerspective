import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,mkdirSync,rmSync,writeFileSync,readFileSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

const port=()=>new Promise((resolve,reject)=>{
 const s=createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(e=>e?reject(e):resolve(p));});
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

test("real native HTTP frozen planning of unseen 2048-token text uses original V17 UI and a persisted Brain",{
 timeout:65000
},async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),"mp-v23-native-http-"));
 const out=path.join(root,"runtime"),corpus=path.join(root,"stories.txt");
 const brains=path.join(out,"brains"),save=path.join(brains,"brain-0-stable+many.v8");
 const p=await port();
 mkdirSync(brains,{recursive:true});
 const map=new LearnedCognitiveMap();
 for(let i=0;i<48;i++){
  map.observeActionResult({before:["phase_"+i,"training_body"],action:"advance_"+i,
   after:["phase_"+(i+1),"training_body"],accepted:true});
 }
 const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:11});
 brain.cognitiveMap=map.export();
 brain.save(save);
 const restored=Brain.load(save);
 assert.equal(LearnedCognitiveMap.restore(restored.cognitiveMap).rules.size,48);
 writeFileSync(corpus,Array.from({length:60},(_,i)=>
  "Observed unrelated complete sentence number "+i+" supports the original learner.").join("\n\n"),"utf8");
 const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const proc=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1",
  "--arms","stable+many","--worlds","cognitivemap","--gpu","off",
  "--text",corpus,"--out",out,"--port",String(p),"--start","--resume","--mem","2"
 ],{cwd,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let log="";for(const stream of [proc.stdout,proc.stderr])
  stream.on("data",b=>log=(log+b.toString()).slice(-16000));
 const base="http://127.0.0.1:"+p;
 const fetchNative=async(url,options={})=>fetch(base+url,{
  ...options,signal:AbortSignal.timeout(18000)});
 try{
  let ready=false;
  for(let n=0;n<150;n++){
   if(proc.exitCode!==null)throw Error("Native V17 server exited: "+log);
   try{const r=await fetchNative("/graphs");if(r.ok){
    const data=await r.json();
    if(data.graphs?.some(x=>x.w===0&&x.worlds?.includes("cognitivemap"))){ready=true;break;}
   }}catch{}
   await sleep(110);
  }
  assert.ok(ready,"Original cognitive graph failed to boot: "+log);
  const html=await(await fetchNative("/transcend/torus-aether/ui/index.html?live=1")).text();
  const app=await(await fetchNative("/transcend/torus-aether/ui/app.js")).text();
  for(const id of ["cognitiveMaxDepth","cognitiveMaxNodes","cognitivePathCanvas",
    "cognitivePathScrub","cognitivePathDetail","allStart","allSave",
    "gpuApply","textMazeCanvas"]){
    assert.ok(html.includes('id="'+id+'"'),"Original or new UI control missing: "+id);
  }
  assert.match(app,/drawFrozenCognitivePath/);
  assert.match(app,/original|Original|ORIGINAL/);
  const novel=["phase_0",...Array.from({length:2047},(_,i)=>"fresh_unseen_word_"+i)];
  const req={w:0,initial:novel.join(" "),goal:{slots:{0:"phase_48"}},
    maxNodes:100,maxDepth:64};
  const pre=Brain.load(save);
  const preActions=LearnedCognitiveMap.restore(pre.cognitiveMap).rules.size;
  const response=await fetchNative("/cognitive-eval",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify(req)});
  assert.equal(response.status,200,"Original HTTP endpoint missing");
  const reply=await response.json();
  assert.equal(reply.frozen,true,JSON.stringify(reply).slice(0,500));
  assert.equal(reply.found,true,JSON.stringify(reply).slice(0,500));
  assert.equal(reply.law,"ORIGINAL_V17_ATTRACTION_0.97");
  assert.equal(reply.plannedPath.length,48);
  assert.ok(reply.shapeField?.length>=49);
  assert.equal(reply.plannedPath[0].from,0);
  assert.equal(reply.plannedPath.at(-1).after.split(" ").length,2048);
  assert.equal(reply.plannedPath.at(-1).after.split(" ")[0],"phase_48");
  assert.equal(reply.plannedPath.at(-1).after.split(" ").at(-1),novel.at(-1));
  assert.equal(reply.plannedPath[0].action,"advance_0");
  assert.equal(reply.plannedPath.at(-1).action,"advance_47");
  assert.ok(reply.shapeField[0]>0);
  const after=Brain.load(save);
  assert.ok(LearnedCognitiveMap.restore(after.cognitiveMap).rules.size>=preActions,
    "Frozen evaluation must not erase learned transforms");
  console.log("V23_NATIVE_LONG_HTTP",JSON.stringify({
   heldoutTextTokens:novel.length,shapeSteps:reply.plannedPath.length,
   frozen:reply.frozen,attractionAtStart:reply.shapeField[0],
   originalMethod:reply.law,allControlsPreserved:true,
   testSource:"persisted native V17 Brain; no ground-truth answer supplied"
  }));
 }finally{
  if(proc.exitCode===null){
   const stopped=new Promise(resolve=>proc.once("exit",resolve));
   proc.kill("SIGTERM");
   await Promise.race([stopped,sleep(2500)]);
   if(proc.exitCode===null)proc.kill("SIGKILL");
  }
  rmSync(root,{recursive:true,force:true});
 }
});
