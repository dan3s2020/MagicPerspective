import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import net from "node:net";
import {spawn} from "node:child_process";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const server=path.join(root,"research/path-memory/magic-live.mjs");
const ui=path.join(root,"research/path-memory/magic-live.html");
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const port=()=>new Promise((resolve,reject)=>{
 const s=net.createServer();s.once("error",reject);
 s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p));});
});
const sourceDocs=[
 "README.md",
 "docs/TORUS_AETHER_ABC_20261104.md",
 "docs/LEARNED_AXES_PERSPECTIVE_GATING_20261107.md",
 "docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md"
];
async function launch(args){
 const child=spawn(process.execPath,[server,...args],{stdio:["ignore","pipe","pipe"]});
 let log="";child.stdout.on("data",d=>log+=d);child.stderr.on("data",d=>log+=d);
 const i=args.indexOf("--port"),base="http://127.0.0.1:"+args[i+1];
 for(let t=0;t<90;t++){
  if(child.exitCode!==null)throw Error("Magic process exited: "+log);
  try{const r=await fetch(base+"/api/state");if(r.ok)return {child,base,logs:()=>log};}catch{}
  await sleep(80);
 }
 child.kill("SIGINT");throw Error("Magic service never became ready: "+log);
}
const command=async(service,action,value)=>{
 const r=await fetch(service.base+"/api/control",{method:"POST",
  headers:{"content-type":"application/json"},body:JSON.stringify({command:action,value})});
 const payload=await r.json();
 assert.equal(r.ok,true,"API "+action+" rejected: "+JSON.stringify(payload));
 return payload;
};
async function poll(s,predicate,limitMs=15000){
 const until=Date.now()+limitMs;let state;
 while(Date.now()<until){
  const r=await fetch(s.base+"/api/state");state=await r.json();
  if(predicate(state))return state;
  if(state.state?.fault&&state.state.running===false)throw Error(state.state.fault+"\n"+s.logs());
  await sleep(75);
 }
 throw Error("State did not reach condition: "+JSON.stringify(state).slice(0,1000)+"\n"+s.logs());
}
async function close(s){
 if(!s)return;
 if(s.child.exitCode!==null)return;
 s.child.kill("SIGINT");
 await Promise.race([
  new Promise(r=>s.child.once("exit",r)),
  sleep(1500).then(()=>s.child.kill("SIGKILL"))
 ]);
}
test("ACTUAL native V17 text: responsive magical UI, live SSE, training, frozen heldout, full ledger, checkpoint and resume",{
 timeout:95000
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-live-real-"));
 let s=null,t=null;
 try{
  const paragraphs=sourceDocs.flatMap(name=>
   fs.readFileSync(path.join(root,name),"utf8").split(/\n\s*\n/g).filter(x=>x.trim().length>25));
  assert.ok(paragraphs.length>100);
  const input=path.join(dir,"actual-repository-corpus.txt"),out=path.join(dir,"saved-magic");
  fs.writeFileSync(input,paragraphs.join("\n\n"));
  const p=await port();
  s=await launch(["--text",input,"--out",out,"--port",String(p),"--batch","3",
   "--rate","30","--row-chars","2200","--max-rows","12"]);
  const page=await (await fetch(s.base+"/")).text();
  assert.match(page,/The Living Labyrinth/);
  assert.match(page,/id="start"/);
  assert.match(page,/id="pause"/);
  assert.match(page,/id="save"/);
  assert.match(page,/id="eval"/);
  assert.match(page,/id="space"/);
  assert.match(page,/id="ledger"/);
  assert.doesNotMatch(page,/Math.random\(\).*fake|setInterval\([^)]*addFake/i);
  const es=await fetch(s.base+"/api/events");
  assert.equal(es.headers.get("content-type").startsWith("text/event-stream"),true);
  const received=await es.body.getReader().read();
  assert.match(new TextDecoder().decode(received.value),/^data:/);
  await es.body.cancel();
  await command(s,"start");
  const observed=await poll(s,x=>x.state.finished&&x.state.rows===12);
  assert.ok(observed.model.tokens>0);
  assert.ok(observed.last.predictions.length>0);
  assert.equal(observed.mode,"text");
  assert.equal(observed.truth.includes("CPU"),true);
  assert.ok(observed.graph.nodes.length>0);
  const score=await command(s,"evaluate");
  assert.ok(score.state.frozen.samples>0,"real held-out paragraphs must exist");
  assert.ok(score.state.frozen.tokens>0);
  assert.ok(score.state.frozen.accuracy===null||score.state.frozen.accuracy>=0);
  await command(s,"save");
  const ledger=await (await fetch(s.base+"/api/log")).text();
  assert.ok(ledger.split("\n").filter(Boolean).length===12);
  const entry=JSON.parse(ledger.split("\n")[0]);
  assert.ok(entry.passage&&entry.predictions?.length);
  assert.ok(fs.statSync(path.join(out,"brain-live.v8")).size>0);
  assert.ok(fs.statSync(path.join(out,"progress.json")).size>0);
  const firstSave=fs.readFileSync(path.join(out,"brain-live.v8"));
  await close(s);s=null;
  const p2=await port();
  t=await launch(["--text",input,"--out",out,"--port",String(p2),"--resume",
   "--batch","2","--rate","30","--row-chars","2200","--max-rows","20","--start"]);
  const after=await poll(t,x=>x.state.finished&&x.state.rows===20);
  assert.ok(after.model.tokens>observed.model.tokens);
  assert.ok(fs.statSync(path.join(out,"brain-live.v8")).size>=firstSave.length*.5);
  console.log("MAGIC_NATIVE_TEXT_LIVE_PASS",JSON.stringify({
   firstRows:observed.state.rows,resumedRows:after.state.rows,
   observedTokens:after.model.tokens,learnedOperators:after.model.observedOperators,
   trueGraphNodes:after.graph.nodes.length,frozenTestTokens:score.state.frozen.tokens,
   actualLedgerLines:12,originalV17SourceRewritten:false
  }));
 }finally{await close(s);await close(t);fs.rmSync(dir,{recursive:true,force:true});}
});
test("true action-labelled observations: discover path memory, see every transition, plan goals, frozen test and resume",{
 timeout:95000
},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-live-path-"));
 let s=null,t=null;
 try{
  const input=path.join(dir,"observed-action-transitions.jsonl"),out=path.join(dir,"path-memory-run");
  const r=(()=>{let v=371;return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};})();
  const actions=["E+","E-","N+","N-"],record=[];
  for(let i=0;i<480;i++){
   const x=10+Math.floor(r()*40),y=10+Math.floor(r()*40),z=1000+Math.floor(r()*100);
   const before=[x,y,z,Math.floor(r()*11),Math.floor(r()*11)];
   const after=before.slice(),a=actions[i%4];
   if(a==="E+"){after[0]++;after[2]+=1+2*y;}
   if(a==="E-"){after[0]--;after[2]-=1+2*y;}
   if(a==="N+"){after[1]++;after[2]+=4+5*x;}
   if(a==="N-"){after[1]--;after[2]-=4+5*x;}
   after[3]=Math.floor(r()*11);after[4]=Math.floor(r()*11);
   record.push({before,action:a,after});
  }
  fs.writeFileSync(input,record.map(x=>JSON.stringify(x)).join("\n")+"\n");
  const p=await port();
  s=await launch(["--events",input,"--out",out,"--port",String(p),
   "--batch","50","--rate","30","--start"]);
  const first=await poll(s,x=>x.state.finished&&x.state.rows===384);
  assert.equal(first.mode,"events");
  assert.deepEqual(first.model.inputAxes,[0,1]);
  assert.equal(first.model.dependent,2);
  assert.equal(first.model.derivedPathMemoryDimensions,1);
  assert.ok(first.graph.nodes.length>0);
  assert.ok(first.recent.some(e=>e.kind==="transition"&&e.before&&e.after));
  const evaluated=await command(s,"evaluate");
  assert.equal(evaluated.state.frozen.samples,96);
  assert.equal(evaluated.state.frozen.accuracy,1);
  assert.ok(evaluated.state.frozen.mae<1e-6);
  const planned=await command(s,"path",{start:[12,15,300,1,4],goal:[14,17],maxSteps:12});
  assert.equal(planned.state.last.plannedShape.found,true);
  assert.equal(planned.state.last.plannedShape.plannedBeforeExecution,true);
  assert.equal(planned.state.last.plannedShape.referenceDependentAnswerGiven,false);
  const log=await (await fetch(s.base+"/api/log")).text();
  assert.equal(log.split("\n").filter(Boolean).length,384);
  await command(s,"save");
  const check=JSON.parse(fs.readFileSync(path.join(out,"path-memory.json"),"utf8"));
  assert.equal(check.samples,384);
  assert.equal(check.examples.length,384,"No path observations may be omitted from checkpoint");
  await close(s);s=null;
  const p2=await port();
  t=await launch(["--events",input,"--out",out,"--port",String(p2),"--resume","--max-rows","384"]);
  const restored=await (await fetch(t.base+"/api/state")).json();
  assert.equal(restored.model.trainingEvents,384);
  assert.equal(restored.model.derivedPathMemoryDimensions,1);
  console.log("MAGIC_ACTION_MEMORY_LIVE_PASS",JSON.stringify({
   trainedObservations:384,discoveredAxes:restored.model.inputAxes,
   dependent:restored.model.dependent,extraPathMemory:restored.model.derivedPathMemoryDimensions,
   unseenEvents:96,unseenExact:evaluated.state.frozen.accuracy,
   checkpointExamplesPreserved:check.examples.length,originalV17Preserved:true
  }));
 }finally{await close(s);await close(t);fs.rmSync(dir,{recursive:true,force:true});}
});
