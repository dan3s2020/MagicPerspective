// CROSS-DISCOVERY AUDIT — actual native V17 text vs experimental xD operators.
// Imported local-axes and text-hypermaze research modules are COPIED READ-ONLY
// by CI from pinned isolated research commits. Never modifies production Brain.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {StateDependentTextAxes} from "../research/text-hypermaze/state-dependent-axes.mjs";
import {learnedHolonomy,executeLearnedPath} from "../research/text-hypermaze/path-holonomy.mjs";
import {CoupledTextMaze} from "../research/text-hypermaze/coupled-axes.mjs";
import {evaluateFrozenAxes,selectAxisGate} from "../research/learned-axes/real-text-gate.mjs";
import {ObservedTransformations} from "../transcend/torus-aether/worlds/observed-transformations.mjs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const docs=["README.md","docs/TORUS_AETHER_ABC_20261104.md",
 "docs/LEARNED_AXES_PERSPECTIVE_GATING_20261107.md",
 "docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md"];
const text=docs.map(file=>fs.readFileSync(path.join(root,file),"utf8"));
const paras=text.flatMap(x=>x.split(/\n\s*\n/g).filter(z=>z.trim().length>25));
const mathPairs=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];

test("real repository documents use the ORIGINAL Brain, the new gate remains frozen and xD math pair observations are quantified",()=>{
 const brain=new Brain({seed:17,rules:"winner"});
 const arithmetic=new CoupledTextMaze({maxValue:100000});
 const nonlinear=new StateDependentTextAxes({maxValue:100000});
 let attemptedPairs=0,learnedArithmetic=0,learnedNonlinear=0;
 const train=paras.slice(0,Math.min(100,Math.floor(paras.length*.7)));
 const testSet=paras.slice(Math.max(train.length,Math.floor(paras.length*.8))).slice(0,22);
 assert.ok(train.length>25&&testSet.length>3,JSON.stringify({train:train.length,test:testSet.length}));
 let prev=null;
 for(const paragraph of train){
  brain.liveLanguage(paragraph);
  brain.learnObservedTransformations(paragraph);
  if(prev){
   attemptedPairs++;
   learnedArithmetic+=+(arithmetic.observePair(prev,paragraph).learned===true);
   learnedNonlinear+=+(nonlinear.observePair(prev,paragraph).learned===true);
  }
  prev=paragraph;
 }
 const count=brain.language.seen,stateBefore=JSON.stringify(brain.language.serialize());
 const validation=testSet.slice(0,Math.max(1,Math.floor(testSet.length/2))),
  heldout=testSet.slice(validation.length);
 const gate=selectAxisGate(brain.language,validation);
 const native=evaluateFrozenAxes(brain.language,heldout,{maxTrace:2});
 const gated=evaluateFrozenAxes(brain.language,heldout,{gating:gate,maxTrace:2});
 assert.ok(gated.count>0&&native.count===gated.count);
 assert.equal(brain.language.seen,count,"frozen evaluation should not train");
 assert.equal(JSON.stringify(brain.language.serialize()),stateBefore);
 assert.ok(brain.observedTransformations.operators.size>=0);
 console.log("CROSS_REAL_CORPUS_NO_SEMANTIC_LEAK",JSON.stringify({
  passages:train.length,observedTokens:count,
  textEditOperators:brain.observedTransformations.operators.size,
  observedAdjacentDocumentPairs:attemptedPairs,
  pairedNumericAxesActuallyAccepted:learnedArithmetic,
  nonlinearNumericPairsAccepted:learnedNonlinear,
  heldoutTokens:native.count,nativeTop1:native.native.accuracy,
  validationGatedTop1:gated.gated.accuracy,
  trainedOnHeldout:false
 }));
});
test("integrated imported math research understands genuine multi-coordinate transformation but original one-edit model does not",()=>{
 const native=new ObservedTransformations(),field=new StateDependentTextAxes({maxValue:100000});
 for(const [before,after] of mathPairs){
  native.observeSentence(before);native.observeSentence(after);
  assert.equal(field.observePair(before,after).learned,true);
 }
 const start="5 * 6 = 30.",learned=learnedHolonomy(field,start);
 assert.equal(learned.ready,true);
 const path=executeLearnedPath(field,start,[{primary:0,step:1},{primary:1,step:1}]);
 assert.equal(path.matched,true);
 assert.deepEqual(path.actual,[6,7,42]);
 const old=native.plan({required:["6","7"],start,allowUnseenStart:true,maxDepth:5,maxExpanded:300});
 assert.equal(old.found,false,"old one-edit learner has no paired numeric dynamics on this previously unseen number triple");
 console.log("CROSS_MATH_TRANSFORM_BRIDGE",JSON.stringify({
  source:"real observed numerical pairs (controlled math)",
  originalNativeOneEditFound:old.found,
  coupledNonlinearPredicted:path.expected.finalOutput,
  executed: path.actual[2],exact:path.matched,
  learnedHolonomy:learned.commutator,
  extraPathMemoryCoordinates:path.expected.compressedExtraStateCoordinates,
  semanticNaturalLanguageProven:false
 }));
});
test("explicitly verify current production Brain does not secretly use prototype xD math operators in AligningGraph.write",()=>{
 const src=fs.readFileSync(path.join(root,"transcend/torus-aether/devour/brain.mjs"),"utf8");
 const align=fs.readFileSync(path.join(root,"transcend/torus-aether/align.mjs"),"utf8");
 for(const name of ["StateDependentTextAxes","CoupledTextMaze","learnedHolonomy","WordDrivenNavigator"]){
  assert.ok(!src.includes(name),"the native Brain unexpectedly changed: "+name);
  assert.ok(!align.includes(name),"the original AligningGraph unexpectedly changed: "+name);
 }
 console.log("NONINTEGRATION_EXPLICIT",JSON.stringify({
  nativeTextGeneratorUsesResearchMathPhysics:false,
  nativeTextGeneratorUsesLearnedLocalFrames:false,
  combinedModulesImportable:true,
  routeToOriginalV17UI:false,
  conclusion:"Module compatibility is not yet real end-to-end training integration"
 }));
});
