import test from "node:test";
import assert from "node:assert/strict";
import {travelHierarchicalLanguage} from "./hierarchical-shape.mjs";
import {LanguageMazeMemory} from "./language-world.mjs";
import {KIND} from "../worlds/exercise.mjs";

const conduct=k=>k===KIND.wall?.01:1;
const attract=k=>k===KIND.target?1:0;
test("112,531 consecutive characters form full original-law recursive submazes without length cap or missing output",
 {timeout:60000},()=>{
 const chars=[...Array.from({length:112531},(_,i)=>String.fromCharCode(65+i%26))];
 const t0=performance.now(),r=travelHierarchicalLanguage(chars,{conduct,attract,maxReplay:256});
 const elapsedMs=Math.round(performance.now()-t0);
 assert.equal(r.output,chars.join(""));
 assert.equal(r.initialShape.length,112531);
 assert.equal(r.steps,112531);
 assert.equal(r.locallyExecutedSteps,112531);
 assert.equal(r.hierarchy.originalCharacters,112531);
 assert.ok(r.hierarchy.levels>=3,"must recurse through multiple supermazes");
 assert.equal(r.hierarchy.plannedBeforeFirstAction,true);
 assert.equal(r.hierarchy.allLevelsUseOriginalAttractionLaw,true);
 assert.equal(r.trace.length,256);
 assert.equal(r.pathNodes.length,257);
 assert.equal(r.graph.partialPreview,true,"UI preview must clearly disclose truncation");
 assert.equal(r.localAgreementRate,1);
 assert.equal(r.localBlockedSteps,0);
 assert.equal(r.solvedKnownGoal,true);
 assert.equal(r.field[0],r.graph.nodes[0].potential,"root attraction is real, not fabricated");
 assert.ok(r.field.every(Number.isFinite),"every visualized potential is learned-law numerical evidence");
 assert.ok(r.trace.every(v=>Number.isFinite(v.potentialBefore)&&Number.isFinite(v.potentialAfter)&&
   v.potentialAfter>v.potentialBefore&&v.agreesWithGlobal));
 console.log("MEASURED_V18_HIERARCHY",JSON.stringify({
  characters:r.steps,levels:r.hierarchy.levels,groups:r.hierarchy.groups,
  bodySteps:r.locallyExecutedSteps,agreement:r.localAgreementRate,
  elapsedMs,graphPreview:r.graph.nodes.length
 }));
});
test("original learned memory routes a long previously experienced response through recursive submazes",()=>{
 const m=new LanguageMazeMemory();
 const long="☀️アルファβ".repeat(91);
 assert.ok([...long].length>512);
 m.learn("Observed long field",""+long);
 const frozen=JSON.stringify(m.export());
 const r=m.plan("Observed long field");
 assert.equal(r.output,long);
 assert.equal(r.steps,[...long].length);
 assert.equal(r.trace.length,256);
 assert.equal(r.hierarchy.plannedBeforeFirstAction,true);
 assert.equal(r.graph.partialPreview,true);
 assert.equal(r.candidateEvidence.source,"priorly_observed_training_answer");
 assert.equal(JSON.stringify(m.export()),frozen);
});
test("unobserved long answer is not supplied by a target oracle",()=>{
 const m=new LanguageMazeMemory();
 m.learn("Observed long field","A".repeat(1600));
 const r=m.plan("What did not exist anywhere in training?");
 assert.equal(r.abstained,true);
 assert.equal(r.output,"");
});
test("small sequences preserve real original-goal field at every visible node",()=>{
 const r=travelHierarchicalLanguage([...("ABCD")],{conduct,attract,maxReplay:30});
 assert.equal(r.output,"ABCD");
 assert.deepEqual(r.graph.nodes.map(x=>x.potential),r.field);
 assert.ok(r.field.every(x=>x!==1&&Number.isFinite(x)));
 assert.equal(r.graph.nodes.at(-1).potential,1,"original field assigns observed goal attraction 1");
});
