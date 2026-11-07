// Stress the EXACT user-reported 15,000-row failure boundary using a
// REAL 16,032-row ZSTD Parquet file, not a fabricated JSON test stream.
// All rows are real reads from a genuine nested human/gpt Parquet fixture.
// The fixture is synthetic content: this does NOT prove OpenThoughts3 quality.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {openTextDataset} from "../transcend/torus-aether/data/text-dataset.mjs";
import {NativeAtlasRuntime} from "../research/text-hypermaze/native-atlas-server.mjs";
import {ingestNativeParquet} from "../research/text-hypermaze/native-parquet-ingest.mjs";
const root=process.env.V30_STRESS_PARQUET;
if(!root)throw Error("V30_STRESS_PARQUET missing, generate genuine 16032-row Parquet");
const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
test("V30 16k actual nested ZSTD Parquet, original V17 Brain 15000 checkpoint boundary, exact restart, fixed heldout",async t=>{
 const d=await fsp.mkdtemp(path.join(os.tmpdir(),"v30-16032-"));
 t.after(()=>fsp.rm(d,{recursive:true,force:true}));
 const ds=await openTextDataset(root);
 assert.equal(ds.total,16032);
 assert.equal(ds.trainRows,16016);
 assert.equal(ds.held,16);
 const hidden=await ds.heldOut(0);
 const brain=new Brain({rules,seed:11});
 for(let i=0;i<240;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),brain.disc);
  if(i>=24&&brain.disc.attract(KIND.target)>.2&&
   brain.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(brain.disc.attract(KIND.target)>.2);
 const source=path.join(d,"trained-original-V17.v8");
 brain.save(source);
 const original=await fsp.readFile(source);
 const runtime=new NativeAtlasRuntime(Brain.load(source),{out:path.join(d,"v30")});
 const t0=Date.now();
 const stageOne=await ingestNativeParquet(runtime,root,{
  maxRows:15200,saveEvery:5000});
 assert.equal(stageOne.rowsConsumed,15200);
 assert.equal(runtime.status().realOpenThoughtsParquet.lastSavedCursor,15200);
 assert.ok(fs.statSync(runtime.checkpoint).size>1000);
 const mid=Date.now();
 const reloaded=new NativeAtlasRuntime(Brain.load(runtime.checkpoint),{out:runtime.out});
 assert.equal(reloaded.status().realOpenThoughtsParquet.cursor,15200);
 assert.equal(reloaded.status().realOpenThoughtsParquet.lastSavedCursor,15200);
 const final=await ingestNativeParquet(reloaded,root,{
  maxRows:0,saveEvery:5000});
 const now=Date.now();
 assert.equal(final.rowsConsumed,16016);
 assert.equal(final.heldoutExcluded,16);
 assert.equal(final.completedAllTrainRows,true);
 assert.equal(reloaded.status().realOpenThoughtsParquet.lastSavedCursor,16016);
 assert.equal(reloaded.status().mode,"finished");
 assert.equal(reloaded.engine.summary().reusableActions,0,
  "Natural language differences are not automatically witnessed physical effects");
 assert.ok(reloaded.brain.observedTransformations.evicted>0,
  "A bounded original native memory MUST report historical raw state eviction");
 assert.equal(reloaded.status().originalNativeText.fullPastRawTextStatesRetained,false);
 assert.equal(reloaded.brain.observedTransformations.containsSentence(hidden.prompt),false);
 assert.equal(reloaded.brain.observedTransformations.containsSentence(hidden.answer),false);
 assert.deepEqual(await fsp.readFile(source),original,
  "Original V17 source checkpoint must remain byte-for-byte identical");
 const revived=new NativeAtlasRuntime(Brain.load(reloaded.checkpoint),{out:reloaded.out});
 assert.equal(revived.status().realOpenThoughtsParquet.cursor,16016);
 assert.equal(revived.status().originalNativeText.evictedTextStates,
  reloaded.status().originalNativeText.evictedTextStates);
 assert.ok(revived.brain.observedTransformations.operators.size>0);
 const memory=process.memoryUsage();
 console.log("V30_ACTUAL_PARQUET_OVER_15000_PASS",JSON.stringify({
  actualZstdParquetRows:16032,
  consumedWithoutBrokenSave:16016,
  heldoutNotTrained:16,
  firstStageBeyondFaultBoundary:15200,
  restartFromByteIdenticalNativeBrain:15200,
  finalPersistedCursor:revived.status().realOpenThoughtsParquet.cursor,
  operators:revived.brain.observedTransformations.operators.size,
  activeNativeTextStates:revived.brain.observedTransformations.records.size,
  evictedNativeTextStates:revived.brain.observedTransformations.evicted,
  originalCheckpointStillExact:true,
  fileCheckpointBytes:fs.statSync(reloaded.checkpoint).size,
  nativeProcessRSSMiB:+(memory.rss/1048576).toFixed(1),
  firstStageSeconds:+((mid-t0)/1000).toFixed(2),
  finalStageSeconds:+((now-mid)/1000).toFixed(2),
  semanticQuestionAnswerAccuracyNotProven:true
 }));
});
