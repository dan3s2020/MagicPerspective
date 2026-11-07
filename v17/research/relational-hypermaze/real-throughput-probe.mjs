// V24 throughput/streaming stability probe. This is load testing, NOT a
// semantic score or a substitute for training on the user's real OpenThoughts3.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {performance} from "node:perf_hooks";
import assert from "node:assert/strict";
import {openRealSource} from "./real-data-source.mjs";
import {RealTrainer} from "./real-trainer.mjs";

const rows=16016;
const root=await fs.mkdtemp(path.join(os.tmpdir(),"mp-v24-load-"));
try{
 const file=path.join(root,"measured-throughput.jsonl");
 const docs=[];
 for(let i=0;i<rows;i++){
  const entity="entity_"+i,kind="family_"+i%123,relation="cause_"+i%97;
  const question="What experienced relational mechanism joins "+entity+" with "+kind+
    " during transformation "+relation+" in state phase_"+(i%19)+"?";
  const answer="Observed transition "+entity+" uses "+relation+" to affect "+kind+
    " across time and phase. "+("This complete dialogue action was witnessed in the source world. ").repeat(8);
  docs.push(JSON.stringify({prompt:question,answer}));
 }
 await fs.writeFile(file,docs.join("\n")+"\n");
 const source=await openRealSource({jsonl:file,held:16});
 const t=new RealTrainer({source,out:path.join(root,"save"),maxRecords:7000,
  saveEvery:3000,onlineEvery:125});
 await t.initialize();
 const start=performance.now();t.start();await t.loop;
 const elapsed=(performance.now()-start)/1000;
 assert.equal(t.mode,"finished");
 assert.equal(t.progress.cursor,16000);
 assert.equal(t.model.stats.experienced,16000);
 assert.equal(t.heldout.count,16);
 assert.ok(t.model.stats.compacted>0,"bounded memory must compact under load");
 const result={type:"V24_NATIVE_STREAM_STRESS_NOT_SEMANTIC_QA",
   rowsTrain:t.progress.cursor,heldOut:t.heldout.count,
   totalInputCharacters:t.model.stats.charactersSeen,
   elapsedSeconds:+elapsed.toFixed(3),
   rowsPerSecond:+(t.progress.cursor/elapsed).toFixed(2),
   charactersPerSecond:+(t.model.stats.charactersSeen/elapsed).toFixed(2),
   indexedRecords:t.model.records.size,compacted:t.model.stats.compacted,
   checkpointSaved:!!(await fs.stat(t.checkpoint)),
   samplesScoredPreUpdate:t.progress.onlineScored,
   backend:"Node CPU",notAnOpenDomainAccuracyResult:true,
   rssMegabytes:+(process.memoryUsage().rss/1048576).toFixed(1)};
 console.log(JSON.stringify(result,null,2));
}finally{await fs.rm(root,{recursive:true,force:true});}
