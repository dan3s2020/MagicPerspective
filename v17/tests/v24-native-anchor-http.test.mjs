import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,mkdirSync,rmSync,writeFileSync} from "node:fs";
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

test("V24 native Brain checkpoint and REAL original V17 HTTP service plan heldout 2048 tokens across novel word position",{
 timeout:65000
},async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),"mp-v24-anchor-http-"));
 const out=path.join(root,"runtime"),corpus=path.join(root,"stories.txt");
 const save=path.join(out,"brains","brain-0-stable+many.v8"),p=await port();
 mkdirSync(path.dirname(save),{recursive:true});
 const map=new LearnedCognitiveMap();
 for(const [action,from,to] of [["rewrite-A","A","B"],["rewrite-B","B","C"],["rewrite-C","C","D"]]){
  for(const [before,after] of [
   [["north",from,"south"],["north",to,"south"]],
   [["east","west","north",from,"south"],["east","west","north",to,"south"]]
  ])assert.equal(map.observeActionResult({before,after,action,accepted:true}).learned,true);
 }
 const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:11});
 brain.cognitiveMap=map.export();brain.save(save);
 assert.equal(LearnedCognitiveMap.restore(Brain.load(save).cognitiveMap).rules.size,3);
 writeFileSync(corpus,Array.from({length:60},(_,i)=>
  "Independent world observation "+i+" does not contain the heldout answer.").join("\n\n"),"utf8");
 const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
 const proc=spawn(process.execPath,[
  "transcend/torus-aether/devour/devour.mjs","--workers","1",
  "--arms","stable+many","--worlds","cognitivemap","--gpu","off",
  "--text",corpus,"--out",out,"--port",String(p),"--start","--resume","--mem","2"
 ],{cwd,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let log="";for(const stream of [proc.stdout,proc.stderr])
  stream.on("data",b=>log=(log+b.toString()).slice(-16000));
 const base="http://127.0.0.1:"+p;
 const call=async(endpoint,options={})=>fetch(base+endpoint,{
  ...options,signal:AbortSignal.timeout(18000)});
 try{
  let ready=false;
  for(let i=0;i<150;i++){
   if(proc.exitCode!==null)throw Error("Native V17 exited: "+log);
   try{const r=await call("/graphs");if(r.ok){
    const data=await r.json();
    if(data.graphs?.some(x=>x.w===0&&x.worlds?.includes("cognitivemap"))){ready=true;break;}
   }}catch{}
   await sleep(110);
  }
  assert.ok(ready,"Native V17 cognitive graph unavailable: "+log);
  const heldout=Array.from({length:2048},(_,i)=>"fresh_word_"+i);
  heldout[1007]="A";const req={w:0,initial:heldout.join(" "),
   goal:{slots:{1007:"D"}},maxNodes:32,maxDepth:6};
  const response=await call("/cognitive-eval",{method:"POST",
   headers:{"content-type":"application/json"},body:JSON.stringify(req)});
  assert.equal(response.status,200);const result=await response.json();
  assert.equal(result.frozen,true);
  assert.equal(result.found,true,JSON.stringify(result).slice(0,500));
  assert.equal(result.law,"ORIGINAL_V17_ATTRACTION_0.97");
  assert.deepEqual(result.plannedPath.map(x=>x.action),["rewrite-A","rewrite-B","rewrite-C"]);
  const expected=heldout.slice();expected[1007]="D";
  assert.deepEqual(result.plannedPath.at(-1).after.split(" "),expected);
  assert.ok(result.shapeField[0]>0);
  assert.ok(result.plannedPath.every(h=>Number.isInteger(h.from)&&Number.isInteger(h.to)));
  const duplicate=heldout.slice();duplicate[1010]="A";
  const bad=await call("/cognitive-eval",{method:"POST",
   headers:{"content-type":"application/json"},
   body:JSON.stringify({...req,initial:duplicate.join(" ")})});
  assert.equal(bad.status,200);
  const unknown=await bad.json();
  assert.equal(unknown.found,false,"Unknown ambiguous binding is a real wall, not guessed physics");
  console.log("V24_NATIVE_ANCHOR_HTTP",JSON.stringify({
   inputTokens:2048,novelPosition:1007,independentTrainingActions:6,
   frozenOriginalShapeSteps:result.plannedPath.length,
   startingField:result.shapeField[0],fullOutputExact:true,
   duplicateAnchorAbstains:true,realCheckpointAndHttp:true,
   originalMethod:result.law,limitations:"symbolic test; no open-ended language benchmark or real CUDA proof"
  }));
 }finally{
  if(proc.exitCode===null){
   const stopped=new Promise(resolve=>proc.once("exit",resolve));
   proc.kill("SIGTERM");await Promise.race([stopped,sleep(2500)]);
   if(proc.exitCode===null)proc.kill("SIGKILL");
  }
  rmSync(root,{recursive:true,force:true});
 }
});
