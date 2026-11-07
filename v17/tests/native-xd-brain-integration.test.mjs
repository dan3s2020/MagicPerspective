import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeTextPathAtlas} from "../transcend/torus-aether/worlds/native-text-path-atlas.mjs";

test("SAME original V17 Brain owns persistent full xD action atlas and native multilingual text context across checkpoint/resume",{
  timeout:30000
},()=>{
  const brain=new Brain({rules:"winner",seed:17});
  const lesson=brain.liveCompleteXDWorld({dimensions:16,seed:29,physicsSeed:17,heldoutSeed:12353});
  assert.equal(lesson.realExposedFiniteTopology,true);
  assert.equal(lesson.training.execution.solved,true);
  assert.equal(lesson.heldout.execution.solved,true);
  assert.equal(brain.xdAtlas.effects.size,7);
  // Train the ORIGINAL native 6-scale text learner, not another inference toy.
  for(const [q,a] of [
    ["Question A","the moon is bright"],
    ["Question B","the moon is calm"],
    ["Question C","the moon is bright"]
  ])brain.learnConstructedText(q,a);
  const inspect=new NativeTextPathAtlas();
  const pre=inspect.before(brain.constructedPaths,"Question D",{maxOutput:30});
  const ans=inspect.after(brain.constructedPaths,pre,"the moon is bright");
  assert.equal(ans.beforeTraining,true);
  assert.equal(ans.teacherForcedTotal,18);
  assert.ok(ans.allPreActionCandidateEdges.length>0);
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"xd-brain-v17-")),filename=path.join(temp,"brain.v8");
  try{
    brain.save(filename);
    const restored=Brain.load(filename);
    assert.equal(restored.xdAtlas.effects.size,7);
    assert.equal(typeof restored.xdAtlas.plan,"function");
    assert.deepEqual(restored.constructedPaths.summary().scaleGraphStates,
      brain.constructedPaths.summary().scaleGraphStates);
    assert.equal(restored.constructedPaths.textRows,3);
    const before=JSON.stringify([...restored.xdAtlas.effects]);
    const frozen=restored.liveCompleteXDWorld({
      dimensions:2048,seed:517,physicsSeed:17,heldoutSeed:777});
    assert.equal(frozen.heldout.execution.solved,true);
    assert.equal(frozen.heldout.plan.pathLength,7);
    assert.equal(restored.constructedPaths.textRows,3);
    assert.equal(before===JSON.stringify([...restored.xdAtlas.effects]),false,
      "Native shared learner received real interventions from an additional TRAINING world");
    const page=inspect.page(restored.constructedPaths,{scale:5,limit:12});
    assert.ok(page.totalStates>0);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
