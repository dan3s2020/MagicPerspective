import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import {openRealSource} from "../research/relational-hypermaze/real-data-source.mjs";
import {RealTrainer} from "../research/relational-hypermaze/real-trainer.mjs";
import {manifestName,legacyName} from "../research/relational-hypermaze/real-checkpoint-store.mjs";

async function fixture(count=28,answerSize=400){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),"mp-v24-checkpoint-"));
 const file=path.join(root,"training.jsonl");
 const rows=Array.from({length:count},(_,i)=>({
  prompt:"What witness experienced entity_"+i+" transformation phase_"+(i%7)+"?",
  answer:"Witnessed answer "+i+" "+("unique-context-phrase ".repeat(Math.ceil(answerSize/22)))
 }));
 await fs.writeFile(file,rows.map(x=>JSON.stringify(x)).join("\n")+"\n");
 return {root,file,rows};
}
test("segmented checkpoints round-trip EXACT current record keys, learned indexes, stats and row cursor after actual evictions",async t=>{
 const f=await fixture(80);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const src=await openRealSource({jsonl:f.file,held:4}),out=path.join(f.root,"runtime");
 const train=await new RealTrainer({source:src,out,maxRecords:13,saveEvery:5,onlineEvery:3}).initialize();
 train.start();await train.loop;
 assert.equal(train.mode,"finished");assert.equal(train.progress.cursor,76);
 assert.ok(train.model.stats.compacted>0);
 const manifest=JSON.parse(await fs.readFile(train.checkpoint,"utf8"));
 assert.equal(manifest.format,2);
 assert.ok(manifest.segments.length>=10);
 assert.equal(manifest.activeRecordCount,train.model.records.size);
 assert.equal(manifest.activeStartId,train.model.records.keys().next().value);
 assert.equal(manifest.progress.cursor,76);
 assert.ok(!(await fs.readdir(out)).some(x=>x.endsWith(".tmp-"+process.pid)));
 const recovered=await new RealTrainer({source:src,out,maxRecords:13,resume:true}).initialize();
 assert.deepEqual([...recovered.model.records.keys()],[...train.model.records.keys()]);
 assert.deepEqual(recovered.model.summary(),train.model.summary());
 assert.equal(recovered.progress.cursor,76);
 assert.equal(recovered.traceHistory.length,train.traceHistory.length);
 assert.equal(recovered.trace.method,"Discoverer.shape");
 assert.ok(recovered.heldout.count===4);
});
test("legacy v1 checkpoint migrates without changing ANY legacy bytes and resumes from committed cursor",async t=>{
 const f=await fixture(25);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const source=await openRealSource({jsonl:f.file,held:4}),out=path.join(f.root,"oldruntime");
 await fs.mkdir(out,{recursive:true});
 const seed=await new RealTrainer({source,out,limit:9,maxRecords:12,
   onlineEvery:1,saveEvery:3}).initialize();
 seed.start();await seed.loop;
 const legacy={
  version:1,sourceFingerprint:source.fingerprint,
  sourceTrainRows:source.trainRows,sourceHeldRows:source.heldRows,
  options:seed.options,progress:seed.progress,model:seed.model.snapshot(),
  trace:seed.trace,events:seed.events,heldout:seed.heldout,
  savedAt:"2026-11-07T00:00:00.000Z"
 };
 const legacyPath=path.join(out,legacyName),index=path.join(out,manifestName);
 await fs.writeFile(legacyPath,JSON.stringify(legacy),"utf8");
 const frozen=await fs.readFile(legacyPath);
 await fs.rm(index);
 const migrated=await new RealTrainer({source,out,limit:0,maxRecords:12,
  onlineEvery:1,saveEvery:3,resume:true}).initialize();
 assert.equal(migrated.progress.cursor,9);
 assert.equal(migrated.savedNextId,seed.model.nextId);
 assert.deepEqual(await fs.readFile(legacyPath),frozen,"legacy save MUST remain byte-identical");
 assert.ok((await fs.readFile(index,"utf8")).includes('"format":2'));
 assert.ok(migrated.trace?.beforeAction);
 migrated.start();await migrated.loop;
 assert.equal(migrated.progress.cursor,21);
 assert.deepEqual(await fs.readFile(legacyPath),frozen);
 const final=await new RealTrainer({source,out,resume:true,maxRecords:12}).initialize();
 assert.equal(final.model.stats.experienced,21);
 assert.equal(final.progress.lastSavedCursor,21);
});
test("corrupt segment cannot become a silently accepted resume checkpoint",async t=>{
 const f=await fixture(20);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const source=await openRealSource({jsonl:f.file,held:2}),out=path.join(f.root,"corrupt");
 const trained=await new RealTrainer({source,out,maxRecords:20,saveEvery:4}).initialize();
 trained.start();await trained.loop;
 const manifest=JSON.parse(await fs.readFile(trained.checkpoint,"utf8"));
 const segment=path.join(out,manifest.segments[0].name);
 await fs.appendFile(segment," \n");
 await assert.rejects(new RealTrainer({source,out,maxRecords:20,resume:true}).initialize(),
 /SHA256|validation|Corrupt|Invalid/);
});
test("large observed answers persist via many bounded JSONL records, no global JSON.stringify of the model",async t=>{
 const f=await fixture(510,32000);t.after(()=>fs.rm(f.root,{recursive:true,force:true}));
 const source=await openRealSource({jsonl:f.file,held:10}),out=path.join(f.root,"large");
 const trainer=await new RealTrainer({source,out,maxRecords:440,
  maxAnswerChars:65536,saveEvery:110,onlineEvery:155}).initialize();
 trainer.start();await trainer.loop;
 assert.equal(trainer.progress.cursor,500);
 assert.equal(trainer.model.stats.experienced,500);
 const manifest=JSON.parse(await fs.readFile(trainer.checkpoint,"utf8"));
 assert.equal(manifest.format,2);assert.ok(manifest.segments.length>=4);
 const contentSize=(await fs.stat(trainer.checkpoint)).size;
 assert.ok(contentSize<250_000,"manifest must be small even if records contain megabytes of answers");
 const files=await fs.readdir(out);
 assert.ok(files.filter(x=>x.endsWith(".records.jsonl")).length>=4);
 const recovered=await new RealTrainer({source,out,maxRecords:440,resume:true}).initialize();
 assert.equal(recovered.progress.cursor,500);
 assert.deepEqual([...recovered.model.records.keys()],[...trainer.model.records.keys()]);
 assert.ok(recovered.model.stats.compacted>0);
});
