import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {enumerateNativePaths,auditNativePath,appendNativeAtlasLedger,readNativeAtlasLedger}
 from "../research/text-hypermaze/native-path-atlas.mjs";
function trainedBrain(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<90;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,600+i*13),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
test("Ablating an actually learned cross-world action destroys the goal path, restores after REAL observed memory; 5D causality is not claimed",()=>{
 const brain=trainedBrain();
 const model=new NativeGoalTextMaze(brain,{maxStates:220,maxDepth:5});
 model.observe("He is calm.\nHe is tired.\nShe is tired.");
 const req={start:"He is calm.",required:["She","calm"]};
 const before=model.plan({...req,includeTopology:true});
 assert.equal(before.predicted,"She is calm.");
 const op=before.actions.find(x=>x.kind==="replace"&&x.from==="He"&&x.to==="She");
 assert.ok(op,"Need a genuine reusable original observed subject-edit axis");
 assert.ok(op.learnedFrom?.from&&op.learnedFrom?.to);
 const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v17-original-axis-ablation-"));
 try{
  const f=path.join(snapshot,"brain.v8");brain.save(f);
  const killed=Brain.load(f);
  assert.ok(killed.observedTransformations.operators.delete(op.key));
  const missing=new NativeGoalTextMaze(killed,{maxStates:220,maxDepth:5})
   .plan({...req,includeTopology:true});
  assert.equal(missing.found,false,
   "Original planner found path despite removing the ONLY real subject-changing action");
  assert.equal(missing.failureReason,"missing-reachable-goal");
  const evaluated=enumerateNativePaths(missing);
  const post=auditNativePath({plan:missing,atlas:evaluated,
   reference:"She is calm.",brain:killed});
  assert.equal(post.completeTextExactFirstTry,false);
  assert.ok(post.operatorGap.gapCategories["operator-transition-never-observed"]>=1);
  const recovered=Brain.load(f);
  const again=new NativeGoalTextMaze(recovered,{maxStates:220,maxDepth:5}).plan(req);
  assert.equal(again.predicted,"She is calm.");
  console.log("ORIGINAL_V17_OPERATOR_CAUSAL_ABLATION",JSON.stringify({
   actuallyObservedOperatorKey:op.key,sourceEvidence:op.learnedFrom,
   beforeAblationFirstTryExact:true,afterRemovalPathFound:missing.found,
   afterCheckpointRestoreExact:again.predicted==="She is calm.",
   geometryAblationProven:false,noiseAblationProven:false,
   missingOperatorDetectedByFrozenAtlas:true}));
 }finally{fs.rmSync(snapshot,{recursive:true,force:true});}
});
test("Ambiguous partial language target is diagnosed when an alternative complete route exists in the ORIGINAL graph",()=>{
 const brain=trainedBrain(),M=new NativeGoalTextMaze(brain,{maxStates:250,maxDepth:5});
 M.observe("He is calm.\nHe is tired.\nShe is tired.\nShe is brave.");
 const plan=M.plan({start:"He is calm.",required:["She"],includeTopology:true});
 const atlas=enumerateNativePaths(plan,{maxPaths:128});
 const distinct=atlas.paths.map(x=>x.states.at(-1))
  .filter(x=>x!==plan.predicted);
 assert.ok(distinct.length>0,"Need two actually reachable solutions to the SAME partial goal");
 const audit=auditNativePath({plan,atlas,brain,reference:distinct[0]});
 assert.equal(audit.completeTextExactFirstTry,false);
 assert.equal(audit.alternativeRouteToReference,true);
 assert.ok(audit.failureCategories.includes("correct-reference-route-present-but-not-selected"));
 assert.ok(audit.failureCategories.includes("goal-constraints-do-not-uniquely-identify-reference")===false);
 console.log("ORIGINAL_ATLAS_AMBIGUOUS_GOAL_DIAGNOSIS",JSON.stringify({
  required:["She"],candidateValidFinalStates:[plan.predicted,...distinct],
  chosenFinal:plan.predicted,differentReferenceWasStillReachable:true,
  wrongAxisDetected:true,notUniqueSemanticAnswer:true}));
});
test("Design ceilings are visible: 256-token rejection is never disguised as lack of a path",()=>{
 const b=trainedBrain(),M=new NativeGoalTextMaze(b);
 const text=Array.from({length:310},(_,i)=>"unique"+i).join(" ")+"!";
 const observed=M.observe(text);
 assert.equal(observed.observed.newSentences,0);
 assert.ok(b.observedTransformations.rejectedLong>=1);
 const plan=M.plan({start:"He is calm.",required:["She"],includeTopology:true});
 const atlas=enumerateNativePaths(plan);
 assert.ok(atlas.possibleDesignBarriers.includes("some-observations-exceeded-token-window"));
 assert.equal(atlas.designLimits.maxTokensPerObservation,256);
 assert.equal(atlas.topology.completeNaturalLanguage,false);
});
test("UTF-8 ledger remains reversible across 64KB chunk boundaries and exact byte cursors",()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v17-utf8-ledger-"));
 try{
  const f=path.join(tmp,"nested","brain.v8.hypermaze-atlas.jsonl");
  const huge="Știința și experiența 🧭 ".repeat(3000);
  appendNativeAtlasLedger(f,{event:"preaction",id:1,source:huge});
  appendNativeAtlasLedger(f,{event:"postmortem",id:1,reference:"Știința 🧭"});
  const a=readNativeAtlasLedger(f,{limit:1});
  assert.equal(a.rows.length,1);assert.equal(a.rows[0].source,huge);
  const b=readNativeAtlasLedger(f,{cursor:a.nextCursor,limit:1});
  assert.equal(b.rows[0].reference,"Știința 🧭");
  assert.equal(b.end,true);
  assert.ok(b.nextCursor>a.nextCursor);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
