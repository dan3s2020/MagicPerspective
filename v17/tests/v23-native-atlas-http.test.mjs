import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {mkdtempSync,writeFileSync,readFileSync,statSync,rmSync,readdirSync} from "node:fs";
import os from "node:os";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const sleep=t=>new Promise(r=>setTimeout(r,t));
const port=()=>new Promise((ok,bad)=>{const s=createServer();s.once("error",bad);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(err=>err?bad(err):ok(p));});});
test("NATIVE actual CPU Text+Cognitive+Hypermaze+Maze/Transform exposes entire persistent cross-world atlas AND real missing-path diagnostics",{
 timeout:100000
},async()=>{
 const temp=mkdtempSync(path.join(os.tmpdir(),"mp-v23-real-atlas-")),data=path.join(temp,"training.txt"),
   out=path.join(temp,"training-checkpoint");
 const docs=[
 "blue is happy and learning.","red is happy and learning.",
 "blue was tired and learning.","red was tired and learning.",
 "red feels calm and learning.","green feels calm and learning.",
 "red looks rested and learning.","green looks rested and learning.",
 "other filler never gives any answers.","noise blank extra training paragraph.",
 "blue is quiet and learning.","red is quiet and learning.",
 "red feels strong and learning.","green feels strong and learning.",
 "extra sentences here are different.","another context real remembered."
 ];
 writeFileSync(data,docs.join("\n\n")+"\n");
 const openPort=await port(),base="http://127.0.0.1:"+openPort;
 const child=spawn(process.execPath,[
  path.join(root,"transcend/torus-aether/devour/devour.mjs"),
  "--workers","1","--arms","stable+many","--worlds","text,cognitivemap,hypertext,maze,transform",
  "--gpu","off","--text",data,"--out",out,"--port",String(openPort),
  "--mem","2","--every","1500","--maze-every","180","--start"
 ],{cwd:root,env:{...process.env,MP_NO_BROWSER:"1"},stdio:["ignore","pipe","pipe"]});
 let log="";for(const s of [child.stdout,child.stderr])s.on("data",b=>{log=(log+b.toString()).slice(-15000);});
 const get=async url=>{const r=await fetch(base+url,{signal:AbortSignal.timeout(6000)});return r.json();};
 try{
  let graph;const t0=Date.now();
  while(Date.now()-t0<60000){
   if(child.exitCode!==null&&child.exitCode!==0)throw Error("Trainer crashed: "+log);
   try{graph=await get("/graph?w=0");if(graph.cognitive?.documents>=14)break;}catch{}
   await sleep(190);
  }
  assert.ok(graph?.cognitive?.documents>=14,"Original cognitive actual training did not progress: "+log);
  assert.ok(graph.cognitive.inducedActionRules>0,"No real transform induction");
  const raw=await get("/atlas?w=0&cursor=0&limit=4");
  assert.equal(raw.appendOnly,true);
  assert.equal(raw.omittedRecords,0);
  // Original maze & transform actions may be logged BEFORE any corpus
  // contrast. The first four events do NOT have to be text evidence.
  let foundOriginalRule=false,scanCursor=0;
  for(let page=0;page<500&&!foundOriginalRule;page++){
    const candidate=await get("/atlas?w=0&cursor="+scanCursor+"&limit=30&kind=rule-evidence");
    foundOriginalRule=candidate.rows.length>0;
    if(candidate.end)break;
    assert.ok(candidate.nextCursor>scanCursor);
    scanCursor=candidate.nextCursor;
  }
  assert.equal(foundOriginalRule,true,"The real corpus must contribute at least one cross-world observed contrast to the atlas");
  const evaluation=await fetch(base+"/cognitive-eval",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:0,initial:"blue irrelevant context unknown.",
     goal:{slots:{"0":"green"}},maxNodes:250,maxDepth:5})
  });
  assert.equal(evaluation.status,200);
  const plan=await evaluation.json();
  assert.ok(!plan.error,"Crossworld native original planner error: "+JSON.stringify(plan));
  assert.equal(plan.directOriginalMethod,"Discoverer.shape");
  assert.equal(plan.usedCrossWorld,true);
  assert.equal(plan.found,true,"Actual multiple-text-world transitions must compose");
  assert.ok(plan.plannedPath.length>=2);
  assert.equal(plan.plannedPath.at(-1).after.split(" ")[0],"green");
  const fail=await fetch(base+"/cognitive-eval",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({w:0,initial:"blue irrelevant context unknown.",
     goal:{slots:{"0":"impossible_never_observed"}},maxNodes:75,maxDepth:4})
  });
  assert.equal(fail.status,200);
  const missing=await fail.json();
  assert.equal(missing.found,false);
  assert.ok(missing.diagnostics?.excludedByDesign?.length);
  assert.ok(missing.diagnostics?.goalTokensNeverGenerated?.includes("impossible_never_observed"));
  // Every recorded journal byte is navigable, including transformed
  // whole paths and unsuccessful alternatives (no top-128 slice).
  const filtered=[];let cursor=0;
  for(let page=0;page<1000;page++){
    const res=await get("/atlas?w=0&cursor="+cursor+"&limit=7&kind=planning-attempt");
    filtered.push(...res.rows);
    if(res.end){cursor=res.nextCursor;break;}
    assert.ok(res.nextCursor>cursor);cursor=res.nextCursor;
  }
  const good=filtered.find(r=>r.found===true&&r.input.includes("blue irrelevant"));
  const bad=filtered.find(r=>r.found===false&&r.input.includes("blue irrelevant"));
  assert.ok(good&&bad,"Missing full positive/negative evidence in atlas");
  assert.equal(good.fullAtlas.states[good.fullPredictedPath.at(-1).to][0],"green");
  assert.equal(good.fullAtlas.neighbors.length,good.fullAtlas.states.length);
  assert.ok(good.fullAtlas.neighbors.flat().some(edge=>edge.crossWorld));
  assert.ok(bad.diagnostics.excludedByDesign.length);
  const exported=await fetch(base+"/atlas-export?w=0");
  assert.equal(exported.status,200);
  const full=await exported.text();
  const filename=readdirSync(path.join(out,"brains")).find(f=>f.endsWith(".atlas.jsonl"));
  assert.ok(filename);
  const disk=readFileSync(path.join(out,"brains",filename),"utf8");
  assert.equal(full,disk,"The user must download THE ENTIRE atlas; UI may not silently omit evidence");
  assert.ok(full.length>0);
  const html=await(await fetch(base+"/transcend/torus-aether/ui/index.html")).text();
  assert.match(html,/id="v23AtlasCanvas"/);
  assert.match(html,/v23-full-atlas-live.js/);
  const js=await fetch(base+"/transcend/torus-aether/ui/v23-full-atlas-live.js");
  assert.equal(js.status,200);
  assert.match(await js.text(),/v23AtlasNext/);
  console.log("V23_NATIVE_FULL_ATLAS",JSON.stringify({
   observedDocuments:graph.cognitive.documents,
   learnedRules:graph.cognitive.inducedActionRules,
   preActionRoute:plan.plannedPath.map(x=>x.action),
   firstTryExplicitGoalReached:plan.found,
   unsupportedGoalFailed:!missing.found,
   missingReasons:missing.diagnostics.excludedByDesign,
   fullJournalBytes:full.length,
   exportedBytesEqualDisk:true,
   arbitrarySemanticQA70NotProven:true
  }));
 }finally{
  if(child.exitCode===null){child.kill("SIGTERM");await sleep(250);if(child.exitCode===null)child.kill("SIGKILL");}
  rmSync(temp,{recursive:true,force:true});
 }
});
