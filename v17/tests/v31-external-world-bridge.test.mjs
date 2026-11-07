import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {KIND,playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {CrossWorldBridgeExperiment} from "../research/text-hypermaze/cross-world-bridge-experiment.mjs";
import {ForensicPathAtlas} from "../research/text-hypermaze/forensic-path-atlas.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function setup(){
 const b=new Brain({rules,seed:111});
 for(let i=0;i<150;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 const e=new CrossWorldBridgeExperiment(b);
 for(const [episode,action,from,to] of [
  ["fruit","increase-two","Mira has 3 apples.","Mira has 5 apples."],
  ["books","increase-two","Toma has 8 books.","Toma has 10 books."],
  ["coins","decrease-one","Zara has 6 coins.","Zara has 5 coins."],
  ["shells","decrease-one","Leo has 15 shells.","Leo has 14 shells."]
 ])assert.equal(e.observeSource({episodeId:episode,action,before:from,after:to}).learned,true);
 return e;
}
const realTwo=({text,action,...rest})=>{
 assert.deepEqual(Object.keys(rest),[],"Independent target world must NEVER receive expected next solution");
 const change=action.name==="increase-two"?2:action.name==="decrease-one"?-1:NaN;
 assert.ok(Number.isSafeInteger(change));
 const match=text.match(/\bhas ([0-9]+)\b/);
 if(!match)throw Error("Independent target does not support requested action");
 return text.replace(/\bhas [0-9]+\b/,"has "+(Number(match[1])+change));
};
test("V31: 4 partial source worlds => frozen whole unknown-world path => real action feedback opens 2 verified steps in SAME original Brain",()=>{
 const ex=setup();
 const before=JSON.stringify(ex.transfer.summary());
 const frozen=ex.frozen({startText:"Ava has 17 marbles.",
  goal:{numericEquals:21},required:["21"]});
 assert.equal(frozen.predicted.found,true);
 assert.equal(frozen.predicted.predicted,"Ava has 21 marbles.");
 assert.equal(frozen.predicted.algorithm,"SAME original Discoverer.shapeGraph");
 assert.equal(frozen.original.found,false);
 assert.equal(frozen.diagnostic.topology.verifiedPathExists,false);
 assert.equal(frozen.referenceAnswerProvided,false);
 assert.equal(JSON.stringify(ex.transfer.summary()),before,"Frozen plan must not train from future outcomes");
 const result=ex.observeAfterActualAction({
  episodeId:"novel-target-world-Ava",plan:frozen.predicted,
  required:["21"],physicalStep:realTwo
 });
 assert.equal(result.realExternalSteps,2);
 assert.equal(result.correctlyVerifiedSteps,2);
 assert.equal(result.invalidPredictedSteps,0);
 assert.equal(result.fullyMatchedIndependentPhysics,true);
 assert.equal(result.before.originalFound,false);
 assert.equal(result.before.verifiedPathExists,false);
 assert.equal(result.after.originalFound,true);
 assert.equal(result.after.verifiedPathExists,true);
 assert.equal(result.after.originalOriginalShape,"Discoverer.shapeGraph");
 assert.equal(result.after.originalRoute.length,2);
 assert.equal(result.predictedFullText,result.output);
 assert.equal(result.evidence.every(x=>x.nowWalkableInNativeCumulativeMemory),true);
 const atlas=ex.atlas.page({section:"verified",limit:20});
 assert.equal(atlas.total,2);
 assert.ok(atlas.items.every(e=>e.firstEpisode==="novel-target-world-Ava"));
 console.log("V31_CROSS_WORLD_BRIDGE_OPENED",JSON.stringify({
  firstUnseenWorld:"Ava has 17 marbles.",predictedBeforeAction:result.predictedFullText,
  verifiedRealActions:result.realExternalSteps,
  originallyNoVerifiedPath:true,nowOriginalShapeCanNavigate:true,
  sourceWorlds:4,learntNativeBrainOriginal:true
 }));
});
test("second unseen world gets a predicted path WITHOUT first seeing its actions; original learned atlas remains gated until physical feedback",()=>{
 const ex=setup();
 const first=ex.frozen({startText:"Ava has 17 marbles.",
   goal:{numericEquals:21},required:["21"]});
 ex.observeAfterActualAction({
  episodeId:"target-first",plan:first.predicted,
  required:["21"],physicalStep:realTwo
 });
 const second=ex.frozen({startText:"Mia has 25 marbles.",
   goal:{numericEquals:29},required:["29"]});
 assert.equal(second.predicted.found,true);
 assert.equal(second.predicted.predicted,"Mia has 29 marbles.");
 assert.equal(second.original.found,false);
 assert.equal(second.diagnostic.atlas.walkableVerifiedEdges,2);
 const after=ex.observeAfterActualAction({
  episodeId:"target-second",plan:second.predicted,
  required:["29"],physicalStep:realTwo
 });
 assert.equal(after.after.originalFound,true);
 assert.equal(after.after.retainedGraphEdges,4);
 assert.equal(after.after.originalRoute.length,2);
 assert.equal(ex.transfer.summary().reusableActions,2);
});
test("wrong target-world physics falsifies a transferred action and creates a wall instead of allowing imaginary path",()=>{
 const ex=setup();
 const before=ex.frozen({startText:"Ava has 17 marbles.",
   goal:{numericEquals:21},required:["21"]});
 assert.equal(before.predicted.found,true);
 const independentWrong=({text,...args})=>{
  assert.ok(!Object.hasOwn(args,"expectedInPlan"));
  const match=text.match(/\bhas ([0-9]+)\b/);
  return text.replace(/\bhas [0-9]+\b/,"has "+(Number(match[1])+3));
 };
 const result=ex.observeAfterActualAction({
  episodeId:"novel-target-world-different-physics",plan:before.predicted,
  required:["21"],physicalStep:independentWrong
 });
 assert.equal(result.correctlyVerifiedSteps,0);
 assert.equal(result.invalidPredictedSteps,1);
 assert.equal(result.after.originalFound,false);
 assert.equal(result.firstFailure.predicted,"Ava has 19 marbles.");
 assert.equal(result.firstFailure.actual,"Ava has 20 marbles.");
 assert.equal(result.firstFailure.nowWalkableInNativeCumulativeMemory,false);
 assert.equal(ex.atlas.page({section:"blocked"}).total,1);
 assert.equal(ex.transfer.summary().conflicts,1);
 const noLongerTrusted=ex.transfer.plan({startText:"Zoe has 20 stones.",
   goal:{numericEquals:24}});
 assert.equal(noLongerTrusted.found,false);
 console.log("V31_WRONG_TRANSFORMATION_BLOCKED",JSON.stringify({
  firstWrongPredicted:result.firstFailure.predicted,
  firstWrongObserved:result.firstFailure.actual,
  wallAdded:true,ruleFalsified:true,wrongRuleNeverMadeWalkable:true
 }));
});
test("native Brain checkpoint remembers cross-world transfer + newly verified cumulative paths; missing graph links remain honest",()=>{
 const ex=setup();
 const p=ex.frozen({startText:"Ava has 17 marbles.",
   goal:{numericEquals:21},required:["21"]});
 ex.observeAfterActualAction({episodeId:"persisted-Ava",
  plan:p.predicted,required:["21"],physicalStep:realTwo});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v31-bridge-"));
 try{
  const file=path.join(dir,"native.v8");ex.brain.save(file);
  const loaded=Brain.load(file),restored=new CrossWorldBridgeExperiment(loaded);
  assert.equal(restored.atlas.summary().walkableVerifiedEdges,2);
  assert.equal(restored.transfer.summary().reusableActions,2);
  const atlas=new ForensicPathAtlas(loaded);
  assert.equal(atlas.analyse({start:"Ava has 17 marbles.",required:["21"]}).topology.verifiedPathExists,true);
  const observed=restored.memory.plan({start:"Ava has 17 marbles.",required:["21"]});
  assert.equal(observed.originalPlanner,"Discoverer.shapeGraph");
  assert.equal(observed.steps,2);
  assert.equal(restored.memory.plan({start:"Never lived has 31 marbles.",required:["35"]}).found,false);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
