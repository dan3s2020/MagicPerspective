import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,readFileSync,existsSync,rmSync,readdirSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {CharacterHypermaze,parseCharAction,charActionId} from "../transcend/torus-aether/worlds/character-hypermaze.mjs";
const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
const port=()=>new Promise((ok,bad)=>{const s=createServer();s.once("error",bad);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(err=>err?bad(err):ok(p));});});
test("V24 native actual CPU 5-world training builds persistent unicode character atlas; old V23 blocked vs original V17 unlocked; full forensic journal",{
 timeout:130000
},async()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),"mp-v24-actual-char-")),
   corpus=path.join(root,"actual-corpus.txt"),save=path.join(root,"saved");
 const docs=[
 "Q: cat flies across the river.\nA: cat flies across the river.",
 "Q: cot flies across the river.\nA: cot flies across the river.",
 "Q: bat glows under the silver moon.\nA: bat glows under the silver moon.",
 "Q: bot glows under the silver moon.\nA: bot glows under the silver moon.",
 "Q: cot sings in a completely new world.\nA: cot sings in a completely new world.",
 "Q: cut sings in a completely new world.\nA: cut sings in a completely new world.",
 "Q: bot rests on the very distant shore.\nA: bot rests on the very distant shore.",
 "Q: but rests on the very distant shore.\nA: but rests on the very distant shore.",
 ...Array.from({length:12},(_,i)=>"Q: Another separate training record "+i+".\nA: Background evidence unrelated to hidden answer "+i+".")
 ];
 writeFileSync(corpus,docs.join("\n\n")+"\n");
 const p=await port(),base="http://127.0.0.1:"+p;
 const args=["transcend/torus-aether/devour/devour.mjs",
  "--workers","1","--arms","stable+many","--worlds","text,cognitivemap,hypertext,maze,transform",
  "--gpu","off","--text",corpus,"--out",save,"--port",String(p),
  "--mem","2","--every","1200","--maze-every","250","--start"];
 const child=spawn(process.execPath,args,{cwd,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let log="";for(const stream of [child.stdout,child.stderr])
  stream.on("data",b=>{log=(log+b.toString()).slice(-13000)});
 const get=async path=>{
  const res=await fetch(base+path,{signal:AbortSignal.timeout(5000)});
  return res.json();
 };
 const post=async(path,o)=>{
  const res=await fetch(base+path,{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify(o),signal:AbortSignal.timeout(45000)});
  return res.json();
 };
 try{
  let graph;const start=Date.now();
  while(Date.now()-start<65000){
   if(child.exitCode!==null&&child.exitCode!==0)throw Error("Native CPU exit: "+log);
   try{
    graph=await get("/graph?w=0");
    if(graph?.cognitive?.documents>=16&&
       graph?.characterAtlas?.admittedCrossWorldRuleClasses>=2)break;
   }catch{}
   await sleep(200);
  }
  assert.ok(graph?.cognitive?.documents>=16,"Real original corpus did not train: "+log);
  assert.ok(graph?.characterAtlas?.admittedCrossWorldRuleClasses>=2,
    "Native V24 did not induce char rules from actual independent Q/A worlds: "+
    JSON.stringify(graph?.characterAtlas)+"\n"+log);
  assert.equal(graph.characterAtlas.originalNavigator,"Discoverer.shape");
  assert.ok(graph.chars>0&&graph.exercises>0,"Original V17 native character generator must remain active");
  const r=await post("/character-eval",{w:0,initial:"mat",goal:{charSlots:{1:"u"}},
     maxNodes:120,maxDepth:6,temperature:0,seed:74129});
  assert.ok(!r.error,"Native char forensic failed: "+JSON.stringify(r));
  assert.equal(r.before.found,false);
  assert.equal(r.after.found,true);
  assert.equal(r.after.method,"Discoverer.shape");
  assert.deepEqual(r.after.predictedActions.map(e=>e.to),["mot","mut"]);
  assert.equal(r.after.predictionBeforeAnyAction,true);
  assert.equal(r.after.completeKnownGraph,true);
  const miss=await post("/character-eval",{w:0,initial:"mat",
    goal:{charSlots:{1:"e"}},maxNodes:120,maxDepth:6});
  assert.equal(miss.after.found,false);
  assert.ok(miss.after.diagnostics.missingGoalCharacterPaths.some(e=>e.wanted==="e"));
  const dir=path.join(save,"brains");
  const ck=path.join(dir,"brain-0-stable+many.v8");
  // A native snapshot may take an additional periodic report to persist.
  for(let j=0;j<50&&!existsSync(ck);j++)await sleep(150);
  assert.ok(existsSync(ck),"Original Brain checkpoint must exist, never replaced");
  const original=Brain.load(ck);
  assert.ok(original.align?.mem.n>0);
  assert.ok(original.cognitiveMap);
  assert.ok(original.characterAtlas);
  const restored=CharacterHypermaze.restore(original.characterAtlas);
  assert.ok(restored.transferable().length>=2);
  const files=readdirSync(dir).filter(x=>x.endsWith(".atlas.jsonl"));
  assert.equal(files.length,1);
  const exported=await fetch(base+"/atlas-export?w=0");
  assert.equal(exported.status,200);
  const full=await exported.text();
  assert.equal(full,readFileSync(path.join(dir,files[0]),"utf8"));
  const parsed=full.trim().split("\n").map(x=>JSON.parse(x));
  assert.ok(parsed.some(x=>x.type==="character-rule-evidence"));
  const attempts=parsed.filter(x=>x.type==="character-planning-attempt");
  assert.ok(attempts.some(x=>!x.found&&x.reason==="NO_INDEPENDENT_CHARACTER_TRANSFORM_EVIDENCE"));
  assert.ok(attempts.some(x=>x.found&&x.completePredictedPath?.length===2));
  assert.ok(attempts.some(x=>!x.found&&x.diagnostics?.missingGoalCharacterPaths.some(p=>p.wanted==="e")));
  const ui=await(await fetch(base+"/transcend/torus-aether/ui/index.html")).text();
  assert.match(ui,/v24CharacterCanvas/);assert.match(ui,/v24-character-forensic-live.js/);
  assert.match(await(await fetch(base+"/transcend/torus-aether/ui/v24-character-forensic-live.js")).text(),
    /character-eval/);
  console.log("V24_REAL_NATIVE_CAUSAL_PATH_FORENSICS",JSON.stringify({
    CPU:true,originalTextLearnedDocs:graph.cognitive.documents,
    originalV17Chars:graph.chars,realCharacterRules:restored.transferable().length,
    before:{found:r.before.found,reason:r.before.reason},
    after:{found:r.after.found,method:r.after.method,
      path:r.after.predictedActions.map(x=>({from:x.from,action:parseCharAction(x.action),to:x.to}))},
    missingPath:{found:miss.after.found,missing:miss.after.diagnostics.missingGoalCharacterPaths},
    fullAtlasDiskBytes:full.length,exactArchiveExport:true,
    userRequested70percentSemanticQA:"NOT_PROVEN"
  }));
 }finally{
  if(child.exitCode===null){child.kill("SIGTERM");await sleep(350);
    if(child.exitCode===null)child.kill("SIGKILL");}
  rmSync(root,{recursive:true,force:true});
 }
});
