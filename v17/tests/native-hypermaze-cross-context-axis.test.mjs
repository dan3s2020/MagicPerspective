import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeMaze,seedOf,SEEDS}
 from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {NativeGoalTextMaze}
 from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {enumerateNativePaths,auditNativePath}
 from "../research/text-hypermaze/native-path-atlas.mjs";
function liveOriginal(){
 const b=new Brain({rules:{depth:1,off:["R2","R4"],budEvery:100,
   empty:true,maxWires:32,fold:false},seed:11});
 for(let i=0;i<100;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,800+i*17),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
test("Two distinct lived context mazes generate evidence-backed reusable native axis allowing a THIRD unseen context; one observation does not",()=>{
 const b=liveOriginal();
 const native=new NativeGoalTextMaze(b,{maxStates:150,maxDepth:4,generalizeContextAxes:true});
 // Original same-state hypothesis FIRST observed only in one grammatical
 // context; the generated answer in the third context is never observed.
 native.observe("He is tired.\nShe is tired.");
 native.observe("He was ready.");
 const start="He was ready.",required=["She","ready"];
 const first=native.plan({start,required,includeTopology:true});
 assert.equal(first.found,false,"One observed context cannot justify a context-free action");
 assert.equal(native.brain.hypermazeContextAxes.size,0);
 native.observe("He feels calm.\nShe feels calm.");
 assert.equal(native.brain.observedTransformations.containsSentence("She was ready."),false);
 assert.ok(native.brain.hypermazeContextAxes.size>=2,
  "Two separately observed He→She contexts must induce evidence-backed transferable axis");
 const off=new NativeGoalTextMaze(b,{maxStates:150,maxDepth:4,
  generalizeContextAxes:false}).plan({start,required,includeTopology:true});
 assert.equal(off.found,false,
  "Prior context-bound original action must still fail when transfer hypothesis is disabled");
 const after=native.plan({start,required,includeTopology:true});
 assert.equal(after.found,true,JSON.stringify(after).slice(0,700));
 assert.equal(after.predicted,"She was ready.");
 assert.equal(after.referenceAnswerProvided,false);
 assert.equal(after.graph.generalizedContextTransferEnabled,true);
 const action=after.actions.find(x=>x.contextFreeTransferHypothesis===true);
 assert.ok(action,"The predicted path must actually USE independently learned cross-context axis");
 assert.equal(action.operatorFrom,"He");
 assert.equal(action.operatorTo,"She");
 assert.equal(action.independentlyObservedContexts,2);
 assert.ok(action.generalizedFromRealObservations.every(x=>x.corpusEvidence?.from&&x.corpusEvidence?.to));
 const atlas=enumerateNativePaths(after);
 assert.ok(atlas.initialShape.usedEdges.length>=1);
 assert.equal(atlas.topology.completeNaturalLanguage,false);
 assert.equal(atlas.paths.length>=1,true);
 const body=native.execute(after,{trainNoise:false,enableNoise:false});
 assert.equal(body.solvedInternalGoal,true);
 assert.equal(body.executedFinal,"She was ready.");
 const audited=auditNativePath({plan:after,atlas,reference:"She was ready.",brain:b});
 assert.equal(audited.completeTextExactFirstTry,true);
 assert.equal(audited.characterAttributionAvailable,true);
 assert.ok(audited.charAudit.predictedCharacterOrigins.some(x=>
  x.kind==="learned-text-transformation"&&x.operatorFrom==="He"&&
  x.evidence?.from==="He is tired."));
 assert.equal(b.observedTransformations.containsSentence("She was ready."),false);
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),"mp-context-axis-"));
 try{
  const file=path.join(temp,"brain.v8");b.save(file);
  const restored=Brain.load(file);
  assert.ok(restored.hypermazeContextAxes.size>=2);
  const again=new NativeGoalTextMaze(restored,{maxStates:150,maxDepth:4})
   .plan({start,required});
  assert.equal(again.predicted,"She was ready.");
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 console.log("REAL_ORIGINAL_CROSS_CONTEXT_AXIS_TRANSFER",JSON.stringify({
  oneContextFound:first.found,twoContextsFound:after.found,
  withoutCrossContextAxisFound:off.found,
  predictedBeforeFirstAction:after.predicted,
  realObservedContexts:action.independentlyObservedContexts,
  sourceEvidence:action.generalizedFromRealObservations,
  reusedAfterOriginalBrainCheckpoint:true,
  noHiddenAnswerSeen:true,externalSemanticCorrectnessNotProven:true}));
});
