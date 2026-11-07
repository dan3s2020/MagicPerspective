import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {ObservedTransformations} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {ContextAxisNavigator} from "../research/text-hypermaze/context-axis-evidence.mjs";
import {NativeFrozenShapeWriter} from "../research/text-hypermaze/native-frozen-shape-writer.mjs";

const results={version:"V33",source:"real unchanged original V17 Brain and ObservedTransformations",
 results:[],limitations:[
  "The explicit goal predicate is supplied; exact unconstrained natural language answer not measured here",
  "Causal action outcomes require trusted independently simulated physical environments",
  "The natural OpenThoughts3 24/20/4 public audit remains 0/4 unless separately reproduced"
 ]};
const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
function actualBrain(){
 const b=new Brain({rules,seed:91});
 for(let i=0;i<150;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 assert.ok(b.disc.conduct(KIND.floor)>=.5);
 return b;
}
test("RED→GREEN real native V17: a missing bridge is NOT walkable, independent witnessed physics opens it, and original first shape drives output",()=>{
 const b=actualBrain(),writer=new NativeFrozenShapeWriter(b);
 const m=writer.world;
 const physical=new Map();
 for(let i=0;i<4;i++){
  m.observeTransition({episode:"left-world-"+i,before:"corridor "+i,
   after:"corridor "+(i+1),action:"move-"+i,accepted:true});
  physical.set("corridor "+i+"|move-"+i,"corridor "+(i+1));
 }
 for(let i=6;i<10;i++){
  const next=i===9?"exit reached":"corridor "+(i+1);
  m.observeTransition({episode:"right-world-"+i,before:"corridor "+i,
   after:next,action:"move-"+i,accepted:true});
  physical.set("corridor "+i+"|move-"+i,next);
 }
 const request={start:"corridor 0",required:["exit"]};
 const prior=writer.predict(request);
 const missing=writer.actAndWrite(prior,()=>{throw Error("Should not move if path absent")});
 assert.equal(prior.plan.found,false);
 assert.equal(missing.found,false);
 assert.equal(missing.emittedCharacters,undefined);
 assert.equal(prior.diagnostic.topology.weakComponents,2);
 assert.equal(prior.diagnostic.topology.reachableFromStart,5);
 assert.equal(prior.diagnostic.topology.goalNodesRetained,1);
 assert.equal(prior.diagnostic.diagnosis,"DISCONNECTED_VERIFIED_COMPONENTS_REQUIRE_NEW_EVIDENCE");
 // Merely reading the 2 fragments next to one another is NOT physics.
 m.observeTextAdjacency({episode:"text-fragments-together",
  beforeText:"corridor 4",afterText:"corridor 6"});
 m.observeTransition({episode:"hallucinated-proposal",
  before:"corridor 4",after:"corridor 6",action:"cross-bridge",accepted:null});
 const stillBlocked=writer.predict(request);
 assert.equal(stillBlocked.plan.found,false);
 assert.ok(stillBlocked.diagnostic.oneEvidenceBridgeCandidates.some(x=>
  x.kind==="CORPUS_ORDER_ONLY"));
 // The trusted independent environment must verify the unseen connector.
 // It gets action+current state only, not the correct answer or predicted path.
 physical.set("corridor 4|cross-bridge","corridor 6");
 const verifiedRealNext=physical.get("corridor 4|cross-bridge");
 assert.equal(verifiedRealNext,"corridor 6");
 const witnessed=m.observeTransition({episode:"independent-physical-bridge",
  before:"corridor 4",after:verifiedRealNext,action:"cross-bridge",
  accepted:true,source:"independent-physical-outcome"});
 assert.equal(witnessed.walkable,true);
 const completed=writer.predict(request);
 assert.equal(completed.plan.found,true);
 assert.equal(completed.plan.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(completed.plan.frozenBeforeAction,true);
 assert.equal(completed.plan.referenceAnswerProvided,false);
 assert.equal(completed.plan.pathContainsInferredEdges,false);
 assert.equal(completed.plan.predicted,"exit reached");
 assert.equal(completed.plan.steps,9);
 assert.equal(completed.diagnostic.topology.weakComponents,1);
 assert.equal(completed.diagnostic.topology.verifiedPathExists,true);
 assert.ok(completed.plan.topology.edges.every(e=>e.status==="physically-verified"));
 const external=({text,action})=>{
  const actual=physical.get(text+"|"+action);
  if(actual===undefined)throw Error("Independent physical world has no such action");
  return actual;
 };
 const enacted=writer.actAndWrite(completed,external);
 assert.equal(enacted.complete,true);
 assert.equal(enacted.originalPathUsedToControlCharacters,true);
 assert.equal(enacted.preactionAnswerShapeWasFrozen,true);
 assert.equal(enacted.output,"exit reached");
 assert.equal(enacted.physicalStepsMatched,9);
 assert.equal(enacted.emittedCharacters,12);
 assert.ok(enacted.characterFrames.every(x=>x.matched));
 // Reference is used ONLY after both original native plans are frozen.
 const diagnosticBefore=writer.atlas.compareAfterFrozenPlan({
  atlasResult:stillBlocked.diagnostic,reference:"exit reached"});
 const diagnosticAfter=writer.atlas.compareAfterFrozenPlan({
  atlasResult:completed.diagnostic,reference:"exit reached"});
 assert.equal(diagnosticBefore.exact,false);
 assert.equal(diagnosticBefore.firstMismatch,0);
 assert.equal(diagnosticBefore.scoredAgainstPreActionFrozenGraph,true);
 assert.equal(diagnosticAfter.scoredAgainstPreActionFrozenGraph,true);
 assert.equal(diagnosticBefore.referenceStateReachable,false,
  "The old prediction MUST be compared to the old disconnected graph, not the updated graph");
 assert.equal(diagnosticBefore.firstWrongReason,
  "CHARACTER_EXISTS_BUT_NOT_IN_REACHABLE_COMPONENT");
 assert.equal(diagnosticAfter.referenceStateReachable,true);
 assert.equal(diagnosticAfter.exact,true);
 results.results.push({
  category:"original_V17_physically_verified_missing_bridge",
  sourceWorlds:8,original2DTrainingEpisodes:b.disc.episodes,
  before:{firstPathFound:prior.plan.found,
   missingCorrectCharacters:diagnosticBefore.firstWrongReason,
   weakGraphComponents:prior.diagnostic.topology.weakComponents,
   reachableObservedStates:prior.diagnostic.topology.reachableFromStart,
   corpusAdjacencyWronglyTreatedAsPhysics:false,
   verifiedPathStillMissingAfterUnverifiedProposal:!stillBlocked.plan.found,
   exampleBlocker:"corridor 4 -(cross-bridge)-> corridor 6"},
  intervention:{action:"cross-bridge",from:"corridor 4",to:"corridor 6",
   evidenceWorld:"independent-physical-bridge",noReferenceAtInference:true},
  after:{firstPathFound:completed.plan.found,firstShape:completed.plan.topology.initialShapeIds,
   completePredictedRoute:completed.plan.actions,
   originalAttractionField:Array.from(completed.plan.values),
   physicalActionsCorrect:enacted.physicalStepsMatched,
   predictedFinal:"exit reached",actualFinal:enacted.output,
   codepointsEmitted:enacted.emittedCharacters,
   codepointsMatchPredicted:enacted.characterFrames.filter(x=>x.matched).length,
   exactAfterFreeze:diagnosticAfter.exact,
   weakGraphComponents:completed.diagnostic.topology.weakComponents},
  experimentalScope:"Observed causal corridor world, not novel open-ended semantics"});
});
function sparse(d,n){
 const lex=Array.from({length:d},(_,j)=>Array.from({length:n},(_,i)=>
  "dim"+j+"value"+i));
 const sentence=idx=>idx.map((v,j)=>lex[j][v]).join(" ")+" artifact.";
 const source=new ObservedTransformations();
 const basis=Array(d).fill(0),samples=[sentence(basis)];
 for(let j=0;j<d;j++)for(let i=1;i<n;i++){
  const a=basis.slice();a[j]=i;samples.push(sentence(a));
 }
 for(const s of samples)source.observeSentence(s);
 return {lex,sentence,source,samples,base:sentence(basis)};
}
test("Native V17 3-axis text: detect EXACT missing anchor restriction and unlock 64 withheld unseen paths using independently witnessed bridge contexts",()=>{
 const world=sparse(3,5),navigator=new ContextAxisNavigator(world.source);
 let before=0;
 for(let a=1;a<5;a++)for(let b=1;b<5;b++)for(let c=1;c<5;c++)
  before+=Number(navigator.plan(world.base,
   [world.lex[0][a],world.lex[1][b],world.lex[2][c]],
   {maxSteps:3}).found);
 assert.equal(before,0);
 const originalAxes=navigator.axisEvidence(5);
 const first=navigator.suggestBridge(world.base);
 assert.deepEqual(first.positions,[0,1]);
 // World independent evaluator verifies candidate BEFORE training on it.
 const validActualWorld=s=>s.includes("artifact.")&&
  [...s.matchAll(/dim([012])value([0-4])/gu)].length===3;
 assert.equal(validActualWorld(first.candidate),true);
 world.source.observeSentence(first.candidate);
 const second=new ContextAxisNavigator(world.source).suggestBridge(world.base);
 assert.deepEqual(second.positions,[1,2]);
 assert.equal(validActualWorld(second.candidate),true);
 world.source.observeSentence(second.candidate);
 const afterNavigator=new ContextAxisNavigator(world.source);
 let after=0,originalStrict=0,scoreChars=0,correctChars=0,oneSuccess=null;
 for(let a=1;a<5;a++)for(let b=1;b<5;b++)for(let c=1;c<5;c++){
  const target=world.sentence([a,b,c]),goal=[
   world.lex[0][a],world.lex[1][b],world.lex[2][c]];
  const prediction=afterNavigator.plan(world.base,goal,{maxSteps:3,maxExpanded:2000});
  const native=world.source.plan({start:world.base,required:goal,
   maxDepth:3,maxExpanded:2000});
  const right=prediction.found&&prediction.predicted===target;
  after+=Number(right);
  originalStrict+=Number(native.found&&native.predicted===target);
  const p=Array.from(prediction.predicted||""),actual=Array.from(target);
  scoreChars+=actual.length;
  correctChars+=actual.filter((c,i)=>p[i]===c).length;
  if(right&&!oneSuccess)oneSuccess={
   goalIsExplicitTokens:true,start:world.base,completePredicted:prediction.predicted,
   path:prediction.states,actions:prediction.actions,
   targetNotInTraining:!world.source.containsSentence(target)};
  assert.equal(world.source.containsSentence(target),false);
 }
 assert.equal(after,64);
 assert.equal(correctChars,scoreChars);
 assert.ok(originalStrict<64);
 results.results.push({
  category:"original_V17_observed_text_anchor_relaxation",
  originalObservedSentences:world.samples.length,
  observedBridges:[first.candidate,second.candidate],
  before:{correctCompletePaths:before,tested:64,axisEvidence:originalAxes},
  after:{correctCompletePaths:after,tested:64,
   strictOriginalPlanner:originalStrict,characterMatch:correctChars,
   characterTotal:scoreChars,axisEvidence:afterNavigator.axisEvidence(5),
   example:oneSuccess},
  restrictionRemoved:"Contextual anchor only released after two independent observed bridge states",
  necessaryCaveat:"This is a factorized 3-axis symbolic world with answer-constraining visible goal tokens, not natural OpenThoughts question answering"
 });
});
test("Original V17 control: same sparse positives are compatible with another physics that REJECTS both bridges; never infer an invented path",()=>{
 const world=sparse(3,5),nav=new ContextAxisNavigator(world.source);
 const worldAccepts=s=>[...s.matchAll(/dim([012])value([0-4])/gu)]
  .filter(t=>Number(t[2])!==0).length<=1;
 const first=nav.suggestBridge(world.base);
 assert.ok(first);
 assert.equal(worldAccepts(first.candidate),false);
 // Physically rejected bridge is NOT an accepted observation.
 const blocked=new ContextAxisNavigator(world.source);
 assert.equal(blocked.axisEvidence(5).some(x=>x.canVaryLeft||x.canVaryRight),false);
 const maybe=blocked.plan(world.base,[world.lex[0][1],world.lex[1][1],world.lex[2][1]],{maxSteps:3});
 assert.equal(maybe.found,false);
 results.results.push({
  category:"indistinguishable_partial_world_negative_control",
  firstBridgeRejectedByIndependentWorld:first.candidate,
  forbiddenToPromoteRejectedBridge:true,
  allowedPathFound:maybe.found,
  ambiguity:"Two worlds explain the same positive singleton examples. No unverified edge is safe to promote."
 });
});
test("evidence summary persists as reproducible standalone CI JSON artifact",()=>{
 const dest=process.env.V33_EVIDENCE_FILE;
 assert.equal(results.results.length,3);
 results.status="TEST_EXECUTED_IN_NATIVE_NODE_22";
 results.userRequestedNaturalText10to15PercentBaselineReproduced=false;
 results.authenticOpenThoughtsWholeAnswerStatus="0/4 measured in prior V29 official public corpus audit; rerun separately";
 if(dest){fs.mkdirSync(path.dirname(dest),{recursive:true});
  fs.writeFileSync(dest,JSON.stringify(results,null,2)+"\n","utf8");}
 console.log("V33_FIRST_SHOT_CAUSAL_PATH_FORENSICS",JSON.stringify(results));
});
