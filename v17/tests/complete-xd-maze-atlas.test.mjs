import test from "node:test";
import assert from "node:assert/strict";
import {CompleteXDWorld,LearnedXDActionAtlas}
  from "../transcend/torus-aether/worlds/full-xd-maze-atlas.mjs";

test("COMPLETE finite maze exposes EVERY accessible corridor, wall, position and target before any action, but never action-to-axis answers",()=>{
  for(const D of [16,64,256,1024,2048]){
    const world=new CompleteXDWorld({dimensions:D,seed:23}),view=world.view();
    assert.equal(view.finiteStateCount,128);
    assert.equal(view.vertices.length,128);
    assert.equal(view.completeFiniteMap,true);
    assert.equal(view.completeFullHypercube,false);
    assert.equal(view.ambientDimensions,D);
    assert.equal(view.activeRank,7);
    assert.ok(view.links.length>=127,"finite world graph must be fully connected after controlled topology generation");
    assert.ok(world.oracleDistance()>0);
    assert.ok(!Object.hasOwn(view,"physicsSeed"));
    assert.ok(!Object.hasOwn(view,"trueActionMap"));
    for(const e of view.links){
      const x=view.vertices.find(v=>v.id===e.from),y=view.vertices.find(v=>v.id===e.to);
      assert.ok(!x.wall&&!y.wall);
      assert.equal(x.coordinates.filter(a=>!y.coordinates.includes(a)).length+
        y.coordinates.filter(a=>!x.coordinates.includes(a)).length,1);
    }
  }
});

test("no learned action map -> no executable route EVEN WHEN the entire physical maze is already visible",()=>{
  const world=new CompleteXDWorld({dimensions:1024,seed:28}),brain=new LearnedXDActionAtlas();
  const plan=brain.plan(world.view());
  assert.equal(plan.found,false);
  assert.equal(plan.reason,"missing-learned-transformations");
  assert.ok(plan.allMissingActionEdges.length>0);
  assert.equal(plan.evaluatorPhysicalShortestPath,7);
  assert.equal(plan.initialPredictedSolution.length,0);
  assert.equal(plan.fullWorld.links.length,world.links.length);
  assert.ok(plan.unidentifiedActions.length>0);
  const noPath=brain.execute(world,plan);
  assert.equal(noPath.solved,false);
  assert.equal(noPath.attempted,0);
});

test("same action effects transferred from smaller previously seen full worlds to many UNSEEN 16..2048D maze topologies, with ZERO target probes",()=>{
  const brain=new LearnedXDActionAtlas();
  const sourceA=brain.trainWorld(new CompleteXDWorld({dimensions:16,seed:17,physicsSeed:11}));
  const sourceB=brain.trainWorld(new CompleteXDWorld({dimensions:64,seed:19,physicsSeed:11}));
  assert.ok(sourceA.execution.solved);
  assert.ok(sourceB.execution.solved);
  assert.equal(brain.effects.size,7);
  for(const D of [16,64,256,1024,2048]){
    for(const seed of [103,211,307,401]){
      const fresh=new CompleteXDWorld({dimensions:D,seed,physicsSeed:11});
      const before=JSON.stringify([...brain.effects]);
      const t=brain.testFrozen(fresh);
      assert.equal(t.plan.found,true,"D"+D+" seed"+seed);
      assert.equal(t.execution.solved,true,"D"+D+" seed"+seed);
      assert.equal(t.execution.frames.length,fresh.oracleDistance());
      assert.deepEqual(t.plan.initialPredictedSolution.length-1,t.execution.frames.length);
      assert.ok(t.plan.allExploredEdges.length>0);
      assert.ok(t.execution.frames.every(x=>x.correct&&x.evidence.worlds.length>0));
      assert.equal(JSON.stringify([...brain.effects]),before,"test cannot update trained map");
      assert.equal(t.plan.fullWorld.completeFiniteMap,true);
      assert.equal(t.plan.fullWorld.ambientDimensions,D);
    }
  }
  assert.equal(brain.testedWorlds,20);
  assert.equal(brain.unsolved,0);
  assert.equal(brain.predictedEdges,brain.correctEdges);
  const last=brain.summary({includeWorld:true}).last;
  assert.equal(last.atlas.fullWorld.vertices.length,128);
  assert.ok(last.atlas.allKnownPhysicalEdges.length>0);
  assert.ok(last.atlas.allExploredEdges.every(e=>e.evidence.action));
});

test("missing transformation remains a wall in LEARNED path graph until one real intervention supplies it; then same world solved",()=>{
  const brain=new LearnedXDActionAtlas();
  const train=new CompleteXDWorld({dimensions:64,seed:42,physicsSeed:23});
  brain.trainWorld(train,{actions:train.actions().slice(0,4)});
  assert.equal(brain.effects.size,4);
  const unseen=new CompleteXDWorld({dimensions:1024,seed:53,physicsSeed:23});
  const before=brain.plan(unseen.view());
  assert.equal(before.found,false);
  assert.equal(before.reason,"missing-learned-transformations");
  assert.ok(before.missingAxes.length>0);
  assert.equal(before.evaluatorPhysicalShortestPath,7);
  // Intervene in this TRAINING WORLD: action is physically applied, true
  // effect observed, and ONLY THEN may the agent add that missing edge law.
  for(const action of unseen.actions().slice(4)){
    const observed=unseen.step(unseen.start,action);
    const evidence=brain.observe(unseen.view(),action,observed);
    assert.equal(evidence.learned,true);
  }
  const repaired=brain.plan(unseen.view()),executed=brain.execute(unseen,repaired);
  assert.equal(repaired.found,true);
  assert.equal(executed.solved,true);
  assert.equal(executed.frames.length,unseen.oracleDistance());
  const next=new CompleteXDWorld({dimensions:2048,seed:67,physicsSeed:23});
  assert.equal(brain.testFrozen(next).execution.solved,true);
});

test("invalid change in hidden action physics is caught by EXECUTION, not incorrectly counted as unseen success",()=>{
  const brain=new LearnedXDActionAtlas();
  brain.trainWorld(new CompleteXDWorld({dimensions:64,seed:11,physicsSeed:18}));
  const mismatched=new CompleteXDWorld({dimensions:256,seed:29,physicsSeed:777});
  const result=brain.testFrozen(mismatched);
  assert.equal(result.plan.found,true);
  assert.equal(result.plan.answerRouteWasNotProvided,true);
  assert.equal(result.execution.solved,false);
  assert.ok(result.execution.frames.some(x=>!x.correct));
  assert.ok(result.execution.reason==="wrong-transferred-action-effect");
  assert.equal(brain.unsolved,1);
});

test("attempted and missed atlas edges are retained, not silently dropped, with explicit cap/semantics",()=>{
  const brain=new LearnedXDActionAtlas({maxWorldRecords:2});
  for(const seed of [13,17,19])brain.trainWorld(
    new CompleteXDWorld({dimensions:64,seed,physicsSeed:11}));
  assert.equal(brain.worldRecords.length,2);
  const atlas=brain.summary({includeWorld:true}).last.atlas;
  assert.ok(atlas.allKnownPhysicalEdges.length>0);
  assert.equal(atlas.fullWorld.vertices.length,128);
  assert.equal(atlas.totalFiniteStates,128);
  assert.equal(atlas.noOracleSolutionPathSupplied,undefined);
  assert.equal(atlas.answerRouteWasNotProvided,true);
  assert.equal(typeof atlas.expanded,"number");
  assert.ok(Array.isArray(atlas.blockedWalls));
});
