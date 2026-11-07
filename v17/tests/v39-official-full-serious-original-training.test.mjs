import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeRealTextEvidencePaths}
 from "../research/text-hypermaze/real-squad-evidence-paths.mjs";
import {runOriginalV39} from "../research/v39/real-unified-trainer.mjs";
const source="https://rajpurkar.github.io/SQuAD-explorer/dataset/";
const required={
 "train-v1.1.json":"3527663986b8295af4f7fcdff1ba1ff3f72d07d61a20f487cb238a6ef92fd955",
 "dev-v1.1.json":"95aa6a52d5d6a735563366753ca50492a658031da74f301ac5238b03966972c9"
};
async function getOfficial(file,dir){
 const url=source+file;
 const res=await fetch(url,{signal:AbortSignal.timeout(120000)});
 assert.equal(res.status,200,"Official Stanford SQuAD 1.1 must be online");
 const bytes=Buffer.from(await res.arrayBuffer());
 const sha=crypto.createHash("sha256").update(bytes).digest("hex");
 assert.equal(sha,required[file],"Official SQuAD source SHA mismatch. Do not proceed.");
 const dest=path.join(dir,file);fs.writeFileSync(dest,bytes);
 return dest;
}
test("V39 production-mode real authentic SQuAD 1.1 train + 650 untouched article-disjoint DEV against SAME original maze-trained Brain.v8 with checkpoint reload and resumed no-double-learning",{
 timeout:920000},async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v39-full-official-"));
 try{
  const train=await getOfficial("train-v1.1.json",dir);
  const dev=await getOfficial("dev-v1.1.json",dir);
  const original=path.join(dir,"ORIGINAL-PRESERVED-BRAIN.v8"),
   out=path.join(dir,"v39-native-official");
  new Brain({rules:{depth:1,off:["R2","R4"],
    budEvery:100,empty:true,maxWires:32,fold:false},seed:11})
    .save(original);
  const originalBytes=fs.readFileSync(original);
  const config={train,dev,tiny:"",original,out,port:8977,
   trainSamples:2400,calibrationSamples:500,devSamples:650,
   epochs:2,checkpointEvery:400,snapshotEvery:200,burnIn:400,
   storyLimit:0,storyEvery:16,fixture:false,keepUiOpen:false};
  const result=await runOriginalV39(config);
  assert.equal(result.ok,true);
  assert.equal(result.realTraining,4800);
  assert.equal(result.averagedSnapshots,23);
  assert.equal(result.internalCalibration.N,500);
  assert.equal(result.externalDev.n,650);
  assert.equal(result.externalDev.answerHiddenFromPlanner,true);
  assert.equal(result.externalDev.policyFrozenBeforeDev,true);
  assert.equal(result.internalCalibration.policySelectedBeforeDev,true);
  assert.equal(result.restoreVerified,true);
  assert.ok(result.originalMazeEpisodes>=26);
  assert.equal(result.storyCount,0,"Do not invent TinyStories if no authentic corpus file is supplied");
  assert.equal(result.internalCalibration.articleDisjoint,true);
  assert.ok(result.externalDev.exact>=100,
   "Original external human-text accuracy has unexpectedly regressed below V38 validated level");
  assert.equal(result.internalCalibration.selectedPolicy,"average",
   "V39 must choose the same frozen original V38 average policy on TRAIN-only validation");
  const checkpoint=path.join(out,"brains","brain-0.v8"),
   loaded=Brain.load(checkpoint),native=new NativeRealTextEvidencePaths(loaded);
  assert.equal(loaded.v39Training.qaExposure,4800);
  assert.equal(loaded.v39Training.avgSnapshots,23);
  assert.equal(loaded.v39Training.selectedPolicy,"average");
  assert.ok(native.memory.averagedWeights.size>12000);
  assert.equal(Buffer.compare(originalBytes,fs.readFileSync(original)),0,
   "Original source Brain.v8 has been overwritten!");
  const resumed=await runOriginalV39(config);
  assert.equal(resumed.realTraining,4800);
  assert.equal(resumed.averagedSnapshots,23);
  assert.deepEqual(resumed.externalDev,result.externalDev);
  assert.equal(Buffer.compare(originalBytes,fs.readFileSync(original)),0);
  const observed=fs.readFileSync(path.join(out,"v39-training-atlas.jsonl"),"utf8")
   .trim().split("\n").map(x=>JSON.parse(x));
  const validationIndex=observed.findIndex(x=>x.kind==="frozen-internal-validation");
  const externalIndex=observed.findIndex(x=>x.kind==="external-frozen-dev");
  assert.ok(validationIndex>=0&&externalIndex>validationIndex,
   "Actual withheld external DEV answers were accessed before policy selection");
  console.log("V39_OFFICIAL_REAL_COMPLETE_SERIOUS_TRAINING_VERIFIED",JSON.stringify({
   realDataset:"Stanford SQuAD v1.1 TRAIN and completely article-disjoint DEV",
   SHA256Pinned:true,
   original2DMazeExperiences:result.originalMazeEpisodes,
   actualOriginalNativeAnswerRoute:"Discoverer.shapeGraph",
   sameOriginalBrain:true,qaTrainingExposures:result.realTraining,
   trainOnlyCalibrationExact:result.internalCalibration.selected.exact,
   calibrationTotal:result.internalCalibration.N,
   policyChosenBeforeOpeningDev:result.internalCalibration.selectedPolicy,
   frozenExternalDEVExact:result.externalDev.exact,
   externalDEVTotal:result.externalDev.n,
   externalDEVAccuracyPct:result.externalDev.exactPct,
   sourceBrainProtected:true,checkpointResumeNoDuplicates:true,
   completeCheckpointRestoredSameShape:true,
   TinyStoriesNotInvented:true,
   realNvidiaRTXVerification:false,
   fullNaturalLanguageSolved:false
  }));
 }finally{
  fs.rmSync(dir,{force:true,recursive:true});
 }
});
