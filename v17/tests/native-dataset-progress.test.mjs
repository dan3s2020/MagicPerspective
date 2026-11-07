import test from "node:test";
import assert from "node:assert/strict";
import {datasetProgress,expectedExercises,overallDatasetProgress}
 from "../transcend/torus-aether/devour/dataset-progress.mjs";

test("REAL parquet metadata: 10k rows and 16 frozen examples yield exact train denominator",()=>{
 const source={kind:"parquet",totalRows:10000,trainRows:9984,heldRows:16,fileCount:1};
 assert.equal(expectedExercises(source,0,1),9984);
 const x=datasetProgress(source,0,1,2);
 assert.equal(x.datasetRows,10000);
 assert.equal(x.trainingTotal,9984);
 assert.equal(x.processed,2);
 assert.equal(x.remaining,9982);
 assert.ok(Math.abs(x.percent-(2/9984)*100)<1e-12);
 assert.equal(x.heldOutRows,16);
 assert.equal(x.complete,false);
 console.log("ACTUAL_DATASET_DENOMINATOR_NOT_ASCII_UNIQUES",JSON.stringify(x));
});
test("1.2M dataset metadata: per-worker train shares count each row exactly once",()=>{
 const source={kind:"parquet",totalRows:1200000,trainRows:1199984,heldRows:16,fileCount:120};
 const chunks=[0,1,2,3].map(share=>expectedExercises(source,share,4));
 assert.equal(chunks.reduce((a,b)=>a+b,0),1199984);
 for(let share=0;share<4;share++){
  const final=datasetProgress(source,share,4,chunks[share]);
  assert.equal(final.remaining,0);
  assert.equal(final.percent,100);
 }
 const untrained=datasetProgress(source,2,4,0);
 assert.equal(untrained.percent,0);
 const global=overallDatasetProgress(source,[0,1,2,3].map(share=>({
   share,worlds:["text","maze","transform"],committedExercises:chunks[share]
 })),4);
 assert.equal(global.processed,1199984);
 assert.equal(global.percent,100);
 console.log("FOUR_GPU_TRAINING_SHARDS_METADATA",JSON.stringify({chunks,global}));
});
test("multiple arms training SAME shard are not incorrectly double counted",()=>{
 const source={kind:"parquet",totalRows:102,trainRows:100,heldRows:2,fileCount:2};
 const workers=[
  {share:0,worlds:["text"],committedExercises:30},
  {share:0,worlds:["text"],committedExercises:20},
  {share:1,worlds:["text","maze"],committedExercises:10}
 ];
 const global=overallDatasetProgress(source,workers,2);
 assert.equal(global.processed,40);
 assert.equal(global.percent,40);
 assert.equal(global.coveredShards,2);
});
test("text fixture with every tenth example reserved: denominator includes only TRAINING exercises",()=>{
 const source={kind:"text",totalRows:15,trainRows:14,heldRows:1,
  fileCount:1,heldSet:[10]};
 assert.equal(expectedExercises(source,0,1),14);
 assert.deepEqual([expectedExercises(source,0,2),expectedExercises(source,1,2)],[8,6]);
 assert.equal(datasetProgress(source,0,1,15).percent,100,
  "committed overrun must not exceed 100%");
 assert.equal(datasetProgress(source,0,1,14).remaining,0);
});
test("only committed exercises advance progress; unique alphabet size is irrelevant",()=>{
 const source={kind:"parquet",totalRows:1200000,trainRows:1199984,heldRows:16,fileCount:120};
 const tiny=datasetProgress(source,0,1,1),grown=datasetProgress(source,0,1,950000);
 assert.ok(grown.percent>tiny.percent);
 assert.equal(tiny.datasetRows,1200000);
 assert.ok(grown.percent<100);
 assert.equal(grown.processed,950000);
 assert.equal(grown.remaining,249984);
 assert.equal(datasetProgress(source,0,1,0).processed,0);
 assert.equal(datasetProgress(source,0,1,1199984).percent,100);
});
test("unknown source does not fake a progress percentage",()=>{
 const progress=datasetProgress({kind:"unknown"},0,1,500);
 assert.equal(progress.percent,null);
 assert.equal(progress.trainingTotal,null);
 assert.equal(progress.processed,500);
});
