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

function originalBrain(){
 const brain=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
  empty:true,maxWires:32,fold:false},seed:11});
 brain.enableEndogenousNoise();
 for(let i=0;i<80;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,300+i*23),[7,9,11][i%3]),brain.disc);
  if(i>=24&&brain.disc.attract(KIND.target)>.2&&
    brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
 }
 assert.ok(brain.disc.attract(KIND.target)>.2);
 assert.ok(brain.disc.conduct(KIND.floor)>=.5);
 return brain;
}
test("Atlas distinguishes genuinely missing cross-exercise operators from known paths and demonstrates repair only after NEW real observations",()=>{
 const brain=originalBrain(),M=new NativeGoalTextMaze(brain,{maxStates:150,maxDepth:5});
 const first=M.observe("He is calm.\nHe is tired.");
 assert.equal(first.learned,true);
 const earlier=brain.observedTransformations.operators.size;
 assert.ok(earlier>=2);
 const req={start:"He is calm.",required:["She","calm"]};
 const denied=M.plan({...req,includeTopology:true});
 assert.equal(denied.found,false);
 assert.equal(denied.plannedBeforeFirstAction,true);
 assert.equal(denied.referenceAnswerProvided,false);
 assert.equal(denied.graph.closedUnderLearnedOperators,true);
 assert.equal(denied.failureReason,"missing-reachable-goal");
 const A=enumerateNativePaths(denied,{maxPaths:500});
 assert.equal(A.topology.completeNaturalLanguage,false);
 assert.equal(A.topology.closedUnderLearnedOperators,true);
 assert.equal(A.paths.length,0);
 assert.ok(A.deadEnds.length>=1);
 assert.ok(A.transformations.length>=2);
 // Only AFTER the path is frozen, the hidden reference can be inspected.
 const auditDenied=auditNativePath({plan:denied,atlas:A,
  reference:"She is calm.",brain});
 assert.equal(auditDenied.referenceWasUsedForPlanning,false);
 assert.equal(auditDenied.completeTextExactFirstTry,false);
 assert.equal(auditDenied.charAudit.firstMismatch,0);
 assert.ok(auditDenied.charAudit.incorrectCharacters.some(x=>x.expected==="S"));
 assert.ok(auditDenied.operatorGap.gapCategories["operator-transition-never-observed"]>=1);
 const beforeReport=brain.observedTransformations.seen;
 assert.equal(beforeReport,2);
 // NOW a separate genuine corpus observation is experienced. Hidden
 // sentence "She is calm" is STILL withheld; the missing reusable
 // subject-substitution rule comes from another maze/world.
 M.observe("She is tired.");
 assert.ok(brain.observedTransformations.operators.size>earlier);
 assert.equal(brain.observedTransformations.containsSentence("She is calm."),false);
 const unlocked=M.plan({...req,includeTopology:true});
 assert.equal(unlocked.found,true,JSON.stringify(unlocked).slice(0,700));
 assert.equal(unlocked.predicted,"She is calm.");
 assert.ok(unlocked.actions.length>=1);
 // The learned subject axis can now transfer directly across worlds;
 // the actual path length, not a fabricated 2-step minimum, is measured.
 const success=enumerateNativePaths(unlocked,{maxPaths:500,maxSteps:8});
 assert.ok(success.paths.length>=1,"Atlas must contain actual newly reachable global goal path");
 assert.ok(success.initialShape.usedEdges.length>=1);
 assert.ok(success.initialShape.usedEdges.every(x=>x.sourceEvidence?.from));
 assert.ok(success.transformations.every(x=>x.graphUses>=1));
 assert.ok(success.topology.states>=3);
 const auditSuccess=auditNativePath({plan:unlocked,atlas:success,
  reference:"She is calm.",brain});
 assert.equal(auditSuccess.completeTextExactFirstTry,true);
 assert.equal(auditSuccess.charAudit.accuracy,1);
 assert.equal(auditSuccess.characterAttributionAvailable,true);
 assert.equal(auditSuccess.charAudit.predictedCharacterOrigins.length,
  Array.from("She is calm.").length);
 assert.equal(auditSuccess.charAudit.predictedCharacterOrigins[0].kind,
  "learned-text-transformation");
 assert.equal(auditSuccess.charAudit.predictedCharacterOrigins[0].operatorFrom,"He");
 assert.equal(auditSuccess.charAudit.predictedCharacterOrigins[0].operatorTo,"She");
 assert.ok(auditSuccess.charAudit.predictedCharacterOrigins[0].evidence?.from,
  "The exact first predicted character must retain a real prior-world source example");
 assert.ok(auditSuccess.charAudit.predictedCharacterOrigins.some(x=>x.kind==="observed-start"),
  "Unmodified characters must be credited to the initial observed text, not invented transformations");
 assert.equal(auditSuccess.operatorGap.minimumTokenEditDistance,0);
 const body=M.execute(unlocked,{maxSteps:10,trainNoise:false,enableNoise:false});
 assert.equal(body.solvedInternalGoal,true);
 assert.equal(body.executedFinal,"She is calm.");
 assert.equal(brain.observedTransformations.seen,3,
  "Atlas audits and frozen evaluations MUST NOT change training data");
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v17-evidence-atlas-"));
 try{
  const checkpoint=path.join(tmp,"original-brain.v8");
  const ledger=checkpoint+".hypermaze-atlas.jsonl";
  appendNativeAtlasLedger(ledger,{event:"preaction",trial:1,
   plan:denied,atlas:A});
  appendNativeAtlasLedger(ledger,{event:"postmortem",trial:1,audit:auditDenied});
  appendNativeAtlasLedger(ledger,{event:"preaction",trial:2,
   plan:unlocked,atlas:success});
  appendNativeAtlasLedger(ledger,{event:"postmortem",trial:2,audit:auditSuccess});
  const p1=readNativeAtlasLedger(ledger,{limit:2});
  assert.equal(p1.rows.length,2);
  assert.equal(p1.rows[1].audit.completeTextExactFirstTry,false);
  const p2=readNativeAtlasLedger(ledger,{cursor:p1.nextCursor,limit:2});
  assert.equal(p2.rows.length,2);
  assert.equal(p2.rows[1].audit.completeTextExactFirstTry,true);
  assert.equal(p2.end,true);
  assert.ok(p2.nextCursor>p1.nextCursor);
  brain.save(checkpoint);
  const loaded=Brain.load(checkpoint);
  assert.equal(loaded.observedTransformations.operators.size,
   brain.observedTransformations.operators.size);
  assert.equal(loaded.observedTransformations.seen,3);
  const restored=new NativeGoalTextMaze(loaded,{maxStates:150,maxDepth:5})
   .plan(req);
  assert.equal(restored.predicted,"She is calm.");
  console.log("NATIVE_ATLAS_CROSS_WORLD_MISSING_OPERATOR_REPAIRED",JSON.stringify({
   failuresBeforeNewEvidence:1,successAfterRealNewObservation:1,
   observedSentences:3,operatorsRetained:loaded.observedTransformations.operators.size,
   pathsEnumerated:success.paths.length,
   originalGlobalShapeActions:unlocked.actions.length,
   charTraceCorrectAfter: auditSuccess.charAudit.correctPositions,
   actualAppendOnlyRecords:4,
   completeLearnedOperatorWorld:success.topology.closedUnderLearnedOperators,
   completeNaturalLanguage:false,
   semanticGeneralizationProven:false}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test("Atlas reports frontier and explicit state/depth limits instead of claiming a complete language maze",()=>{
 const brain=originalBrain();
 const model=new NativeGoalTextMaze(brain,{maxStates:30,maxDepth:1});
 model.observe("He is calm.\nHe is tired.\nShe is tired.");
 const report=model.plan({start:"He is calm.",required:["She","calm"],
  includeTopology:true});
 assert.equal(report.graph.closedUnderLearnedOperators,false);
 assert.ok(report.graph.frontierCount>=1);
 assert.ok(report.topology.frontier.some(x=>x.reason==="depth-budget"));
 assert.equal(report.topology.completeNaturalLanguage,false);
 const atlas=enumerateNativePaths(report,{maxPaths:3});
 assert.equal(atlas.enumeration.truncated,true);
 assert.equal(atlas.enumeration.allFiniteSimplePathsProven,false);
 assert.ok(atlas.topology.frontierCount>=1);
});
test("Atlas audits all Unicode codepoints after a frozen plan; identical text is exact, missing letters are individually shown",()=>{
 const brain=originalBrain();
 const M=new NativeGoalTextMaze(brain);
 M.observe("Știința este calmă.\nȘtiința este rapidă.\nExperiența este rapidă.\nExperiența este stabilă.");
 const plan=M.plan({start:"Experiența este stabilă.",
  required:["Știința","stabilă"],includeTopology:true});
 assert.equal(plan.predicted,"Știința este stabilă.");
 const atlas=enumerateNativePaths(plan);
 const good=auditNativePath({plan,atlas,brain,reference:"Știința este stabilă."});
 assert.equal(good.completeTextExactFirstTry,true);
 assert.equal(good.charAudit.accuracy,1);
 const bad=auditNativePath({plan,atlas,brain,reference:"Știința este incorectă."});
 assert.equal(bad.completeTextExactFirstTry,false);
 assert.ok(bad.charAudit.incorrectCharacters.length>0);
 assert.equal(bad.characterAttributionAvailable,true);
 assert.ok(bad.charAudit.incorrectCharacters.some(x=>x.originalPathSource?.kind),
  "Every wrong character must be linked to the actual original route or a known absent generated character");
 assert.ok(bad.operatorGap.minimumTokenEditDistance>=1);
 assert.equal(brain.observedTransformations.containsSentence("Știința este incorectă."),false);
});
