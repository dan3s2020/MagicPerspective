import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {TextPerspectives} from "../transcend/torus-aether/language-universe/perspectives.mjs";
import {evaluateFrozenAxes,selectAxisGate} from "../research/learned-axes/real-text-gate.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const command=path.join(root,"research/learned-axes/train-real-text.mjs");
const actualDocs=[
 "README.md",
 "docs/TORUS_AETHER_ABC_20261104.md",
 "docs/LEARNED_AXES_PERSPECTIVE_GATING_20261107.md",
 "docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md"
];
test("gate uses real V17 language distributions and does NOT learn from its validation or test passages",()=>{
 const m=new TextPerspectives({scales:[1,2,4,8],maxStates:5000});
 m.observe("The creature enters the labyrinth. The door opens. The creature exits the labyrinth.");
 m.observe("The creature sees another door. The creature moves through it.");
 const held=["The creature enters another labyrinth.","The door closes.","The maze contains a path."];
 const seen=m.seen,serialized=JSON.stringify(m.serialize());
 const g=selectAxisGate(m,held);
 assert.deepEqual(g.scales,[1,2,4,8]);
 const result=evaluateFrozenAxes(m,held,{gating:g});
 assert.ok(result.count>0);
 assert.ok(result.native.accuracy>=0&&result.native.accuracy<=1);
 assert.ok(result.gated.accuracy>=0&&result.gated.accuracy<=1);
 assert.ok(result.axes.every(x=>x.selected>=0));
 assert.equal(seen,m.seen);
 assert.equal(serialized,JSON.stringify(m.serialize()));
 console.log("FROZEN_AXIS_GATING",JSON.stringify({tokens:result.count,
  original:result.native.accuracy,gated:result.gated.accuracy,
  scales:g.scales,changesToModel:false}));
});
test("REAL existing V17 documentation feeds original Brain + gated evaluation; save/resume safely",{
 timeout:120000
},()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-real-text-train-"));
 const corpus=path.join(tmp,"actual-project-documents.txt"),out=path.join(tmp,"fresh-branch-snapshot");
 try{
  const paragraphs=actualDocs.flatMap(name=>
   fs.readFileSync(path.join(root,name),"utf8").split(/\n\s*\n/).filter(x=>x.trim().length>25));
  assert.ok(paragraphs.length>60,"Need sufficient actual V17 documentation paragraphs");
  fs.writeFileSync(corpus,paragraphs.join("\n\n"),"utf8");
  const run=(max,resume=false)=>spawnSync(process.execPath,
   [command,"--text",corpus,"--out",out,"--max-rows",String(max),
    "--eval-chars","3000","--save-every","5",...(resume?["--resume"]:[])],
   {encoding:"utf8",timeout:110000,maxBuffer:1024*1024*8});
  const one=run(10);
  assert.equal(one.status,0,"initial real-doc training failed: "+one.stderr+"\n"+one.stdout);
  const r1=JSON.parse(fs.readFileSync(path.join(out,"heldout-results.json"),"utf8"));
  assert.ok(r1.trainingRows>0&&r1.trainingRows<=10);
  assert.equal(r1.frozenEvaluation,true);
  assert.equal(r1.modelMutationsDuringTest,0);
  assert.ok(r1.finalTest.tokens>0);
  assert.ok(fs.statSync(path.join(out,"brain-real-text.v8")).size>0);
  assert.equal(r1.trainingSource.kind,"text");
  const two=run(18,true);
  assert.equal(two.status,0,"resume failed: "+two.stderr+"\n"+two.stdout);
  const r2=JSON.parse(fs.readFileSync(path.join(out,"heldout-results.json"),"utf8"));
  assert.ok(r2.trainingRows>r1.trainingRows);
  assert.equal(r2.finalTest.preselectedPolicy,r2.validation.gatingChoiceBeforeTest);
  assert.ok(["PASS_MORE_THAN_NATIVE_AND_BIGRAM","NOT_YET_DEMONSTRATED"].includes(r2.status));
  assert.ok(r2.observedEditOperators>=0);
  assert.ok(r2.gate.validation.tokens>0);
  // Import an existing saved original Brain into a distinct directory.
  // Its bytes must remain strictly READ-ONLY even when evaluating that Brain.
  const preservedSave=path.join(out,"brain-real-text.v8");
  const digestBefore=fs.readFileSync(preservedSave);
  const importedOut=path.join(tmp,"imported-checkpoint-evaluation");
  const imported=spawnSync(process.execPath,[
   command,"--text",corpus,"--out",importedOut,
   "--import-brain",preservedSave,"--eval-only","--eval-chars","3000"
  ],{encoding:"utf8",timeout:110000,maxBuffer:1024*1024*8});
  assert.equal(imported.status,0,"imported native Brain eval failed: "+imported.stderr+"\n"+imported.stdout);
  const importedReport=JSON.parse(fs.readFileSync(path.join(importedOut,"heldout-results.json"),"utf8"));
  assert.equal(importedReport.importedCheckpoint,preservedSave);
  assert.equal(importedReport.modelMutationsDuringTest,0);
  assert.ok(importedReport.actualObservedTextTokens>0);
  assert.deepEqual(fs.readFileSync(preservedSave),digestBefore,
   "Import evaluation must not modify the existing native V17 checkpoint");
  console.log("EXISTING_V17_CHECKPOINT_READONLY_IMPORT",
   JSON.stringify({sourceUnchanged:true,evaluated:importedReport.finalTest.tokens,
    native:importedReport.finalTest.originalNative.accuracy}));
  // Extend the SAME native saved Brain over the entire actual document train split,
  // not only a tiny fixture. Report real holdout, even if the new gate fails.
  const full=run(0,true);
  assert.equal(full.status,0,"complete real-document pass failed: "+full.stderr+"\n"+full.stdout);
  const r3=JSON.parse(fs.readFileSync(path.join(out,"heldout-results.json"),"utf8"));
  assert.ok(r3.trainingRows>=r2.trainingRows);
  assert.ok(r3.finalTest.tokens>0);
  assert.equal(r3.modelMutationsDuringTest,0);
  console.log("REAL_DOCUMENTS_FULL_PARTITION",JSON.stringify({
    rows:r3.trainingRows,observedTokens:r3.actualObservedTextTokens,
    operators:r3.observedEditOperators,heldout:r3.finalTest.tokens,
    native:r3.finalTest.originalNative.accuracy,
    bigram:r3.finalTest.bigram.accuracy,gated:r3.finalTest.learnedGate.accuracy,
    selected:r3.finalTest.preselectedPolicy,status:r3.status}));
  const final=JSON.stringify({rowsBefore:r1.trainingRows,rowsAfter:r2.trainingRows,
   testTokens:r2.finalTest.tokens,baseline:r2.finalTest.originalNative.accuracy,
   discoveredGate:r2.finalTest.learnedGate.accuracy,status:r2.status});
  console.log("REAL_DOCS_NATIVE_BRAIN_SAVE_RESUME",final);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
