import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {openRealSource} from "../research/relational-hypermaze/real-data-source.mjs";
import {RealTextAtlas,scoreAnswer} from "../research/relational-hypermaze/real-corpus-core.mjs";
import {RealTrainer,makeHTTP} from "../research/relational-hypermaze/real-trainer.mjs";

async function fixture(n=16){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"mp-v24-"));
 const file=path.join(root,"qa.jsonl"),txt=path.join(root,"qa.txt");
 const rows=Array.from({length:n},(_,i)=>({
  prompt:"What does stable relation object"+i+" cause?",
  answer:"Answer entity"+i+" learned from an actual witnessed dialog."
 }));
 await fs.writeFile(file,rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
 await fs.writeFile(txt,rows.map(x=>"Q: "+x.prompt+"\nA: "+x.answer+"\n").join("\n"));
 return {root,file,txt,rows};
}
test("V24: real JSONL and Q/A TXT split excludes last 2 rows; no wrap",async t=>{
 const f=await fixture(14);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 for(const opt of [{jsonl:f.file},{qaTxt:f.txt}]){
  const src=await openRealSource({...opt,held:2});
  assert.equal(src.trainRows,12);assert.equal(src.heldRows,2);
  const train=[];for await(const r of src.trainingFrom(10))train.push(r);
  assert.deepEqual(train.map(x=>x.index),[10,11]);
  assert.deepEqual((await src.heldOut()).map(x=>x.index),[12,13]);
  assert.ok(!train.some(x=>x.index>=12));
 }
});
test("V24: exact original shape plans observed Q/A, unknown abstains, immutable frozen prediction and serialization",()=>{
 const g=new RealTextAtlas({maxRecords:10});
 g.observe("What makes an aurora visible?","Particles collide with atmospheric gases and light is emitted.",{sourceRow:2});
 g.observe("Why are auroras caused by particles?","Auroras arise from energized gases.",{sourceRow:4});
 const before=JSON.stringify(g.snapshot());
 const plan=g.predict("How do particles cause auroras?");
 assert.equal(plan.method,"Discoverer.shape");
 assert.ok(plan.beforeAction&&plan.found);
 assert.equal(plan.answerPreviouslyObserved,true);
 assert.ok(plan.route.some(x=>x.verified));
 assert.ok(plan.route.some(x=>!x.verified));
 assert.equal(JSON.stringify(g.snapshot()),before);
 assert.equal(g.predict("unrelatedxyzvocabulary").found,false);
 assert.equal(JSON.stringify(RealTextAtlas.restore(JSON.parse(before)).snapshot()),before);
 const s=scoreAnswer("A B A","A B C");assert.equal(s.exact,0);assert.ok(s.wordF1>0&&s.wordF1<1);
});
test("V24: genuine streaming, freeze-before-observation, checkpoint resume and heldout nonleakage",async t=>{
 const f=await fixture(18);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const src=await openRealSource({jsonl:f.file,held:3});
 const out=path.join(f.root,"checkpoint");
 const trainer=await new RealTrainer({source:src,out,maxRecords:40,
  limit:7,saveEvery:2,onlineEvery:1}).initialize();
 trainer.start();await trainer.loop;
 assert.equal(trainer.mode,"finished");
 assert.equal(trainer.progress.cursor,7);
 assert.equal(trainer.model.stats.experienced,7);
 assert.equal(trainer.heldout.count,3);
 assert.equal(trainer.heldout.heldOutIsNeverTrained,true);
 const hold=(await src.heldOut());
 for(const x of hold)assert.ok(![...trainer.model.records.values()].some(r=>r.prompt===x.prompt));
 const snap=JSON.parse(await fs.readFile(trainer.checkpoint,"utf8"));
 assert.equal(snap.progress.cursor,7);
 assert.equal(snap.sourceFingerprint,src.fingerprint);
 await assert.rejects(new RealTrainer({source:src,out,maxRecords:40}).initialize(),/Existing checkpoint/);
 const second=await new RealTrainer({source:src,out,maxRecords:40,saveEvery:2,onlineEvery:1,resume:true}).initialize();
 assert.equal(second.progress.cursor,7);
 second.start();await second.loop;
 assert.equal(second.progress.cursor,15);
 assert.equal(second.model.stats.experienced,15);
 assert.equal(second.status().progress.datasetFullyConsumed,true);
 assert.equal(second.heldout.count,3);
 assert.equal(second.progress.onlineScored,15);
 for(const x of hold)assert.ok(![...second.model.records.values()].some(r=>r.prompt===x.prompt));
});
test("V24: online/pause/resume and real HTTP controls, HTML, trace, CSRF protection",async t=>{
 const f=await fixture(12);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const source=await openRealSource({jsonl:f.file,held:2});
 const trainer=await new RealTrainer({source,out:path.join(f.root,"srv"),saveEvery:2,onlineEvery:1}).initialize();
 const server=await makeHTTP(trainer,{port:0});
 t.after(()=>new Promise(ok=>server.close(ok)));
 const base="http://127.0.0.1:"+server.address().port;
 const status=await (await fetch(base+"/api/status")).json();
 assert.equal(status.mode,"idle");assert.equal(status.progress.heldOut,2);
 assert.match(await (await fetch(base+"/")).text(),/MagicPerspective V24/);
 const post=async (url,data,headers={})=>fetch(base+url,{method:"POST",
  headers:{"content-type":"application/json",...headers},body:JSON.stringify(data)});
 const cors=await post("/api/control",{action:"start"},{origin:"http://malicious.example"});
 assert.equal(cors.status,403);
 const started=await post("/api/control",{action:"start"});assert.equal(started.status,200);
 await trainer.loop;
 assert.equal(trainer.mode,"finished");
 const trace=await (await fetch(base+"/api/trace")).json();
 assert.equal(trace.row,9);assert.ok(Array.isArray(trace.route));
 const held=await post("/api/control",{action:"evaluate"});assert.equal(held.status,200);
 const p=await post("/api/predict",{prompt:f.rows[0].prompt});const answer=await p.json();
 assert.ok(answer.found);assert.equal(answer.method,"Discoverer.shape");
 const events=await (await fetch(base+"/api/events")).json();assert.ok(events.length>0);
});
test("V24: prevents silently using a changed dataset for resume",async t=>{
 const f=await fixture(12);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const s=await openRealSource({jsonl:f.file,held:2});
 const out=path.join(f.root,"changed");
 const a=await new RealTrainer({source:s,out,limit:4}).initialize();
 a.start();await a.loop;
 await fs.appendFile(f.file,JSON.stringify({prompt:"extra",answer:"new row"})+"\n");
 const changed=await openRealSource({jsonl:f.file,held:2});
 await assert.rejects(new RealTrainer({source:changed,out,resume:true}).initialize(),
 /source changed/);
});
test("V24: actual Parquet source uses existing V17 OpenThoughts reader if fixture supplied",async()=>{
 const dir=process.env.MP_V24_PARQUET_FIXTURE;
 if(!dir)return;
 const src=await openRealSource({data:dir});
 assert.ok(src.totalRows>=20);assert.equal(src.heldRows,16);
 const first=[];for await(const row of src.trainingFrom(0)){first.push(row);if(first.length>=2)break;}
 assert.equal(first[0].index,0);assert.ok(first[0].prompt.includes("parquet question"));
 const held=await src.heldOut();assert.equal(held.length,16);
 assert.ok(!first.some(x=>held.some(y=>x.index===y.index)));
});


test("V24: Windows UTF-8 BOM input preserves first real Q/A row",async t=>{
 const f=await fixture(14);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 for(const [kind,file] of [["qaTxt",f.txt],["jsonl",f.file]]){
  const text=await fs.readFile(file,"utf8");
  await fs.writeFile(file,"\uFEFF"+text,"utf8");
  const source=await openRealSource({[kind]:file,held:2});
  assert.equal(source.totalRows,14);assert.equal(source.trainRows,12);
  const rows=[];for await(const row of source.trainingFrom(0)){rows.push(row);if(rows.length>=2)break;}
  assert.equal(rows[0].index,0);assert.equal(rows[0].prompt,f.rows[0].prompt);
 }
});


test("V24: full native Parquet training to real held-out test and checkpoint, not only reader",async t=>{
 const dir=process.env.MP_V24_PARQUET_FIXTURE;if(!dir)return;
 const src=await openRealSource({data:dir});
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),"mp-v24-parquet-training-"));
 t.after(()=>fs.rm(tmp,{recursive:true,force:true}));
 const trainer=await new RealTrainer({source:src,out:tmp,maxRecords:90,
   saveEvery:13,onlineEvery:7}).initialize();
 trainer.start();await trainer.loop;
 assert.equal(trainer.mode,"finished");
 assert.equal(trainer.progress.cursor,src.trainRows);
 assert.equal(trainer.model.stats.experienced,src.trainRows);
 assert.equal(trainer.heldout.count,src.heldRows);
 assert.equal(trainer.heldout.heldOutIsNeverTrained,true);
 const saved=JSON.parse(await fs.readFile(trainer.checkpoint,"utf8"));
 assert.equal(saved.progress.cursor,src.trainRows);
 const held=await src.heldOut();
 for(const row of held)assert.ok(![...trainer.model.records.values()].some(r=>r.sourceRow===row.index));
});
test("V24: actual OpenThoughts-like nested conversations parquet, human/gpt roles and separate heldout",async()=>{
 const dir=process.env.MP_V24_PARQUET_CONVERSATION_FIXTURE;if(!dir)return;
 const src=await openRealSource({data:dir});
 assert.equal(src.totalRows,85);assert.equal(src.heldRows,16);assert.equal(src.trainRows,69);
 let first;
 for await(const row of src.trainingFrom(0)){first=row;break;}
 assert.equal(first.index,0);
 assert.ok(first.prompt.includes("nested human question 0"),JSON.stringify(first));
 assert.ok(first.answer.includes("nested gpt answer 0"),JSON.stringify(first));
 const held=await src.heldOut();
 assert.equal(held[0].index,69);
 assert.ok(held[0].prompt.includes("nested human question 69"));
});
