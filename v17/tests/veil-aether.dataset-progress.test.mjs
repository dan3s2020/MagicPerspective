import test from "node:test";
import assert from "node:assert/strict";
import {trainingProgress, trainingShardSize} from "../transcend/torus-aether/devour/dataset-progress.mjs";

test("OpenThoughts-style Parquet: excludes 16 truly held-out rows, not distinct symbols", () => {
  const source={kind:"parquet",totalRows:10000,trainRows:9984,heldRows:16};
  const atStart=trainingProgress(source,{w:0,n:1,learned:0,mode:"native-text"});
  assert.equal(atStart.total,9984);assert.equal(atStart.heldOut,16);
  assert.equal(atStart.percent,0);assert.equal(atStart.datasetTotalRows,10000);
  const partial=trainingProgress(source,{w:0,n:1,learned:1940,mode:"native-text"});
  assert.equal(partial.trained,1940);
  assert.equal(partial.remaining,8044);
  assert.equal(partial.percent,Number((100*1940/9984).toFixed(2)));
  assert.equal(trainingProgress(source,{w:0,n:1,learned:9984}).percent,100);
  assert.equal(trainingProgress(source,{w:0,n:1,learned:10000}).overflow,true);
});
test("multiple workers receive accurate disjoint shard totals, not identical 100% whole-corpus badges", () => {
  const src={kind:"parquet",totalRows:10000,trainRows:9984,heldRows:16};
  const a=trainingProgress(src,{w:0,n:3,learned:2000});
  const b=trainingProgress(src,{w:1,n:3,learned:2000});
  const c=trainingProgress(src,{w:2,n:3,learned:2000});
  assert.equal(a.total+b.total+c.total,9984);
  assert.equal(a.shards,3);
  assert.ok(a.percent<100);
  assert.equal(a.datasetTrainRows,9984);
});
test("TXT source matches original exact 0-based worker / 1-based heldout selection",()=>{
  const heldSet=[10,20,30,40,50,60];
  const source={kind:"text",totalRows:65,trainRows:59,heldRows:6,heldSet};
  assert.equal(trainingShardSize(source,0,1),59);
  assert.equal(trainingShardSize(source,0,2),33);
  assert.equal(trainingShardSize(source,1,2),26);
  const done=trainingProgress(source,{w:0,n:1,learned:59,mode:"observed-only"});
  assert.equal(done.percent,100);
  assert.equal(done.mode,"observed-only");
});
test("simulation-only worlds have no fake dataset percentage",()=>{
  assert.equal(trainingProgress({kind:"none"},{learned:60000}),null);
  assert.equal(trainingProgress(undefined),null);
});
