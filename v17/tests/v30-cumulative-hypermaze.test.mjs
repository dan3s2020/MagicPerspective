import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {CumulativeHyperMaze} from "../research/text-hypermaze/cumulative-hypermaze.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
function brain(){
 const b=new Brain({rules,seed:131});
 for(let i=0;i<150;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,400+i*19),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2,"Exactly original native Discoverer learned attractor required");
 return b;
}
const node=i=>i===12?"exit reached":"corridor "+i;
const action=i=>"walk-"+i;
function observeOnePerEpisode(agent){
 for(let i=0;i<12;i++)agent.observeTransition({
  episode:"maze-world-"+(i+1),before:node(i),
  action:action(i),after:node(i+1),accepted:true,
  source:"independent-physical-outcome"
 });
}
test("RED: 12 independent maze episodes form ONE cumulative 12-action route with original native shapeGraph and no 4D coordinates",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b,{maxStates:250,maxEdges:1000});
 let failures=0;
 for(let i=0;i<12;i++){
  m.observeTransition({episode:"isolated-maze-"+i,before:node(i),after:node(i+1),
   action:action(i),accepted:true,source:"independent-physical-outcome"});
  if(i<11){
   const frozen=m.plan({start:node(0),required:["exit"],includeTopology:true});
   failures+=Number(!frozen.found);
  }
 }
 assert.equal(failures,11,"Before final fragment the graph must remain incomplete");
 const plan=m.plan({start:node(0),required:["exit"],includeTopology:true});
 assert.equal(plan.found,true,JSON.stringify(plan).slice(0,700));
 assert.equal(plan.steps,12);
 assert.equal(plan.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(plan.frozenBeforeAction,true);
 assert.equal(plan.goalAnswerSupplied,false);
 assert.equal(plan.completeReachableVerifiedTopology,true);
 assert.equal(plan.topology.nodes.length,13);
 assert.equal(plan.topology.edges.length,12);
 assert.equal(new Set(plan.actions.map(x=>x.evidenceEpisode)).size,12);
 assert.ok(plan.values[0]>0,"Original field must propagate back 12 transformations");
 const physics=new Map(Array.from({length:12},(_,i)=>[node(i)+"|"+action(i),node(i+1)]));
 let actual=node(0);
 for(const step of plan.actions){
  assert.equal(step.before,actual);
  actual=physics.get(actual+"|"+step.action);
  assert.equal(actual,step.after,"Independent physical step did not match predicted path");
 }
 assert.equal(actual,node(12));
 console.log("V30_CUMULATIVE_HYPERMAZE",JSON.stringify({
  separatelyWitnessedMazeEpisodes:12,
  singleEpisodeFullRouteExists:false,composedPreactionPathSteps:plan.steps,
  physicallyVerifiedFullRoute:true,
  distinctEpisodeSources:new Set(plan.actions.map(x=>x.evidenceEpisode)).size,
  originalPlanner:plan.originalPlanner,totalRememberedNodes:plan.memory.nodes,
  totalRememberedEdges:plan.memory.edges,
  caveat:"verified symbolic paths, NOT unrestricted semantic language understanding"
 }));
});

test("repeated observations strengthen exact transformations and an actual rejected action creates a wall that reroutes the field",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b);
 observeOnePerEpisode(m);
 for(let i=0;i<7;i++)m.observeTransition({
  episode:"repeat-"+i,before:node(0),action:action(0),
  after:node(1),accepted:true,source:"independent-physical-outcome"
 });
 let p=m.plan({start:node(0),required:["exit"]});
 assert.equal(p.found,true);
 assert.ok(p.actions[0].observedSupport>=8);
 // Falsify one attractive shortcut that previously worked but environment
 // no longer permits. Rejected action outcome must remove this edge.
 m.observeTransition({episode:"old-world",before:node(0),action:"jump",
  after:node(12),accepted:true,source:"independent-physical-outcome"});
 p=m.plan({start:node(0),required:["exit"]});
 assert.equal(p.steps,1);
 m.observeTransition({episode:"new-world",before:node(0),action:"jump",
  after:node(0),expectedAfter:node(12),accepted:false,
  source:"physical-rejection"});
 p=m.plan({start:node(0),required:["exit"],includeTopology:true});
 assert.equal(p.found,true);assert.equal(p.steps,12);
 assert.ok(p.memory.rejectedActions>=1);
 assert.ok(p.topology.edges.every(e=>!(e.action==="jump"&&e.fromText===node(0))));
});

test("no bridge in prior experience means no imaginary path; a previously unseen goal stays unreachable",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b);
 for(let i=0;i<4;i++)m.observeTransition({episode:"one-"+i,
  before:node(i),after:node(i+1),action:action(i),accepted:true});
 for(let i=6;i<12;i++)m.observeTransition({episode:"other-"+i,
  before:node(i),after:node(i+1),action:action(i),accepted:true});
 const fail=m.plan({start:node(0),required:["exit"],includeTopology:true});
 assert.equal(fail.found,false);
 assert.equal(fail.reason,"NO_EVIDENCED_PATH_TO_GOAL");
 assert.equal(fail.memory.unknownConnections>0,true);
 m.observeTransition({episode:"newly-discovered-bridge",
  before:node(4),after:node(6),action:"rare-bridge",
  accepted:true,source:"independent-physical-outcome"});
 const found=m.plan({start:node(0),required:["exit"]});
 assert.equal(found.found,true);
 assert.ok(found.actions.some(x=>x.action==="rare-bridge"));
 assert.equal(found.steps,11);
});

test("wrong guesses, source text adjacency and inferred operators are NOT silently promoted to witnessed walkable edges",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b);
 observeOnePerEpisode(m);
 m.observeTransition({episode:"hypothesis-1",before:node(0),after:node(12),
  action:"imaginary",accepted:null,source:"model-proposal"});
 const evidence=m.plan({start:node(0),required:["exit"]});
 assert.equal(evidence.steps,12);
 const audit=m.audit();
 assert.equal(audit.proposedEdges>=1,true);
 assert.equal(evidence.actions.every(x=>x.edgeStatus==="physically-verified"),true);
 m.observeTextAdjacency({episode:"OpenThoughts3-row-1",
  beforeText:"The reasoning passage starts.",afterText:"The reasoning passage continues."});
 assert.equal(m.plan({start:"The reasoning passage starts.",required:["continues"]}).found,false);
});

test("actual original Brain .v8 checkpoint holds cumulative cross-world paths and does not require a second model",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b);
 observeOnePerEpisode(m);
 const old=m.plan({start:node(0),required:["exit"],includeTopology:true});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v30-cumulative-"));
 try{
  const fn=path.join(dir,"native-brain.v8");b.save(fn);
  const loaded=Brain.load(fn);
  const restored=new CumulativeHyperMaze(loaded);
  const next=restored.plan({start:node(0),required:["exit"],includeTopology:true});
  assert.deepEqual(next.actions,old.actions);
  assert.deepEqual(next.values,old.values);
  assert.equal(typeof loaded.chat,"function");
  assert.equal(typeof loaded.disc.shapeGraph,"function");
  assert.ok(loaded.hypermazeCumulativeExperience);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test("sparse old context-axis evidence can join separated text experiences without asserting it is already independently verified",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b,{maxStates:550,maxEdges:3000});
 const source=b.observedTransformations;
 const tokens=ids=>ids.map((v,i)=>"dim"+i+"v"+v).join(" ")+" artifact.";
 const origin=tokens([0,0,0]);
 for(const text of [origin,tokens([1,0,0]),tokens([2,0,0]),
  tokens([0,1,0]),tokens([0,2,0]),tokens([0,0,1]),tokens([0,0,2])]){
  source.observeSentence(text);
 }
 let absent=m.plan({start:origin,required:["dim0v2","dim1v2","dim2v2"],
  allowInferred:true,maxExpansionDepth:4});
 assert.equal(absent.found,false,
  "Three independent dimensions are unproven when neighbor contexts never vary");
 // Previously tested bridge hypothesis from PR #34; repeated independent
 // observed sentences are added to THE ORIGINAL Brain's operator memory.
 source.observeSentence(tokens([1,1,0]));
 source.observeSentence(tokens([0,1,1]));
 const found=m.plan({start:origin,required:["dim0v2","dim1v2","dim2v2"],
  allowInferred:true,maxExpansionDepth:5,includeTopology:true});
 assert.equal(found.found,true,JSON.stringify(found).slice(0,750));
 assert.equal(found.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(found.steps,3);
 assert.equal(found.pathContainsInferredEdges,true);
 assert.equal(found.externallyVerifiedSemanticExecution,false);
 assert.equal(found.goalAnswerSupplied,false);
 assert.equal(source.containsSentence(found.predicted),false);
 console.log("V30_REUSED_CONTEXT_AXES",JSON.stringify({
  beforeObservedBridges:false,
  afterWitnesedBridges:found.found,
  retainedOriginalOperators:source.operators.size,
  fullPredictedUnseenText:found.predicted,
  originalNativePlanner:found.originalPlanner,
  semanticClaim:"inferred, requires environment check before promoting to verified"
 }));
});

test("all four math action observations are in DIFFERENT worlds, but original native goal attraction composes a novel multiplication answer with NO output supplied",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b,{maxStates:5000,maxEdges:20000});
 const training=[
  ["2 * 3 = 6.","3 * 3 = 9."],
  ["2 * 4 = 8.","3 * 4 = 12."],
  ["2 * 3 = 6.","2 * 4 = 8."],
  ["3 * 3 = 9.","3 * 4 = 12."]
 ];
 training.forEach(([before,after],i)=>m.observeTransition({
  episode:"distinct-math-world-"+i,before,after,action:"observed-number-change-"+i,
  accepted:true,source:"independently-verified-numeric-action-outcome"
 }));
 const exactUnseenStart="5 * 6 = 30.",expected="8 * 7 = 56.";
 const goalOnlyInputs=[{index:0,value:8},{index:2,value:7}];
 assert.equal(training.some(row=>row.includes(exactUnseenStart)),false);
 assert.equal(training.some(row=>row.includes(expected)),false);
 const p=m.planNumeric({start:exactUnseenStart,numericGoals:goalOnlyInputs,
  maxExpansionDepth:15,maxGraphNodes:4000,includeTopology:true});
 assert.equal(p.found,true,JSON.stringify(p).slice(0,850));
 assert.equal(p.predicted,expected);
 assert.equal(p.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(p.goalDependentAnswerSupplied,false);
 assert.equal(p.plannedBeforeFirstAction,true);
 assert.equal(p.pathContainsInferredEdges,true);
 assert.ok(p.steps>=4);
 assert.equal(p.inferredNumericModel,"original-StateDependentTextAxes");
 assert.equal(p.learnedOperatorObservations,4);
 assert.ok(p.learnedAxisRank>=2);
 assert.ok(p.values[0]>0);
 // The independent oracle is used HERE only after the plan is frozen.
 for(const frame of p.initialShape){
  const values=frame.match(/\d+/g).map(Number);
  assert.equal(values[0]*values[1],values[2]);
 }
 console.log("V30_CROSS_MAZE_NUMERIC_PATH",JSON.stringify({
  physicallyObservedActionEpisodes:training.length,
  unknownStart:exactUnseenStart,fullUnseenAnswer:p.predicted,
  steps:p.steps,originalPlanner:p.originalPlanner,
  learnedGlobalGraphNodes:p.topology.nodes.length,
  inferredEdges:p.topology.hypothesisEdges,
  outputAnswerNotProvided:true,
  independentMultiplicationTruth:true,
  limitation:"controlled numeric token grammar, not open-ended general natural language"
 }));
});

test("sparse cross-world samples must NOT create false confident nonlinear axes",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b);
 m.observeTransition({episode:"sparse-1",before:"2 * 3 = 6.",
  after:"3 * 3 = 9.",action:"first-plus",accepted:true});
 m.observeTransition({episode:"sparse-2",before:"2 * 3 = 6.",
  after:"2 * 4 = 8.",action:"second-plus",accepted:true});
 const p=m.planNumeric({start:"5 * 6 = 30.",
  numericGoals:[{index:0,value:8},{index:2,value:7}]});
 assert.equal(p.found,false);
 assert.equal(p.reason,"INSUFFICIENT_CROSS_CONTEXT_EVIDENCE");
});

test("real existing NativeGoalTextMaze (not an isolated research planner) uses and checkpoints the SAME cumulative cross-maze Brain",()=>{
 const b=brain(),native=new NativeGoalTextMaze(b,{maxStates:300,maxDepth:6});
 for(let i=0;i<12;i++)native.observeVerifiedWorldTransition({
  episode:"new-world-"+i,before:node(i),after:node(i+1),
  action:action(i),accepted:true,source:"verified-external-world-action"
 });
 const a=native.planCumulativeWorld({start:node(0),required:["exit"],
  includeTopology:true});
 assert.equal(a.found,true);
 assert.equal(a.steps,12);
 assert.equal(a.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(a.actions.every(x=>x.edgeStatus==="physically-verified"),true);
 const unrelated=new NativeGoalTextMaze(b);
 const after=unrelated.planCumulativeWorld({start:node(0),required:["exit"]});
 assert.deepEqual(after.actions,a.actions,"Cumulative paths must survive creating a NEW temporary view of the SAME Brain");
 const metrics=native.cumulativeWorldStatus();
 assert.equal(metrics.episodes,12);
 assert.equal(metrics.physicallyVerifiedEdges,12);
 assert.equal(metrics.memoryNodes,13);
 // The ordinary previous native paths and Q/A controls remain available.
 assert.equal(typeof native.plan,"function");
 assert.equal(typeof native.planQA,"function");
 assert.equal(typeof b.disc.shape,"function");
 assert.equal(typeof b.disc.shapeGraph,"function");
});

test("numerical field discovered in other episodes is accessible via SAME native V17 UI/worker engine and replayed from one Brain checkpoint",()=>{
 const b=brain(),native=new NativeGoalTextMaze(b);
 const worldEvidence=[
 ["2 * 3 = 6.","3 * 3 = 9."],["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],["3 * 3 = 9.","3 * 4 = 12."]
 ];
 worldEvidence.forEach(([before,after],i)=>native.observeVerifiedWorldTransition({
  episode:"math-experience-"+i,before,after,action:"measured-change-"+i,
  accepted:true,source:"independent-causal-math-world"
 }));
 const req={start:"5 * 6 = 30.",
  numericGoals:[{index:0,value:8},{index:2,value:7}],
  maxGraphNodes:1000,maxExpansionDepth:15};
 const prediction=native.planCumulativeNumericWorld(req);
 assert.equal(prediction.found,true);
 assert.equal(prediction.predicted,"8 * 7 = 56.");
 assert.equal(prediction.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(prediction.goalDependentAnswerSupplied,false);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v30-native-integration-"));
 try{
  const file=path.join(dir,"original-brain.v8");
  b.save(file);
  const loaded=Brain.load(file),resumed=new NativeGoalTextMaze(loaded);
  const again=resumed.planCumulativeNumericWorld(req);
  assert.equal(again.predicted,prediction.predicted);
  assert.deepEqual(again.actions,prediction.actions);
  assert.equal(loaded.hypermazeCumulativeExperience.episodesObserved,4);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});

test("historically aliased same-visible-state actions cannot be accepted as one deterministic corridor",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b);
 m.observeTransition({episode:"hidden-state-off",before:"door state",after:"door open",
  action:"use",accepted:true,source:"independent-physical-outcome"});
 m.observeTransition({episode:"hidden-state-on",before:"door state",after:"door sealed",
  action:"use",accepted:true,source:"independent-physical-outcome"});
 // Both worlds contain identical visible "door state" but different action
 // results, as in the earlier original PR36 holonomy/hidden lever discovery.
 // Their missing history coordinate is a WALL to deterministic planning.
 const uncertain=m.plan({start:"door state",required:["open"],
  includeTopology:true});
 assert.equal(uncertain.found,false,
  "Same visible self state cannot masquerade as a known single world transition");
 assert.equal(uncertain.memory.ambiguousActions,1);
 assert.equal(m.audit().ambiguousActions,1);
 m.observeTransition({episode:"separate-deterministic-world",before:"door state",
  after:"door open",action:"known alternative",accepted:true});
 const safe=m.plan({start:"door state",required:["open"]});
 assert.equal(safe.found,true);
 assert.equal(safe.actions[0].action,"known alternative");
 console.log("V30_HIDDEN_CONTEXT_WALL",JSON.stringify({
  conflictingOutcomeWorlds:2,ambiguousNativeAxes:m.audit().ambiguousActions,
  unreliableTransitionExcluded:true,
  alternateObservedPhysicalRoutePreserved:true,
  necessaryFutureDiscovery:"additional observable history/context coordinate"
 }));
});

test("two long LANGUAGE mazes without any identical 96-token segments discover a reusable 5-token bridge across previous episodes",()=>{
 const b=brain(),n=new NativeGoalTextMaze(b);
 const phrase="observed bridge transformation anchor between cases";
 const answer1=phrase+" "+Array.from({length:260},(_,i)=>"alphauniquetoken"+i).join(" ");
 const answer2=phrase+" "+Array.from({length:260},(_,i)=>"betauniquetoken"+i).join(" ");
 n.observeQA("Explain the first long independent world outcome.",answer1);
 const before=n.cumulativeWorldStatus();
 assert.equal(before.roleEpisodes,1);
 assert.equal(before.multiScaleSharedAnchors,0);
 n.observeQA("Explain the second distinct long world outcome.",answer2);
 const after=n.cumulativeWorldStatus();
 assert.equal(after.roleEpisodes,2);
 assert.equal(after.sharedExactChunkAnchors,0,
  "No 96-token exact cross-episode anchors exist; text mazes are segmented");
 assert.ok(after.multiScaleSharedAnchors>=1,
  "The organism must retain a short reusable anchor across different long problems");
 assert.ok(after.multiScaleObservedMotifs>0);
 assert.ok(after.multiScaleObservedSourceEdges>0);
 assert.equal(after.physicallyVerifiedEdges,0,
  "A repeated phrase is NOT a witnessed semantic transformation");
 assert.equal(n.planCumulativeWorld({start:phrase,required:["alphauniquetoken259"]}).found,false,
  "Shared lexical motifs must NOT be converted silently into real physics");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v30-anchored-"));
 try{
  const file=path.join(dir,"brain.v8");b.save(file);
  const loaded=new NativeGoalTextMaze(Brain.load(file));
  assert.equal(loaded.cumulativeWorldStatus().multiScaleSharedAnchors,
   after.multiScaleSharedAnchors);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log("V30_MULTISCALE_CROSS_LANGUAGE_MAZE",JSON.stringify({
  longProblemEpisodes:2,sharedExact96TokenSegments:after.sharedExactChunkAnchors,
  newlyDiscoveredSharedShortMotifs:after.multiScaleSharedAnchors,
  witnessedTextOnlySourceEdges:after.multiScaleObservedSourceEdges,
  realPhysicalActionsClaimed:after.physicallyVerifiedEdges,
  originalBrainCheckpointPreserved:true,
  result:"short reusable lexical bridges, still unverified semantic physics"
 }));
});

test("ORGANISM learns GOAL from unseen natural-language question, combines Q/A episodes with physical numeric worlds, then original field finds whole answer without supplied answer or numeric goals",()=>{
 const b=brain(),n=new NativeGoalTextMaze(b);
 const witnessed=[
  [2,3,6,3,3,9],
  [2,4,8,3,4,12],
  [2,3,6,2,4,8],
  [3,3,9,3,4,12]
 ];
 witnessed.forEach(([x,y,z,x2,y2,z2],i)=>n.observeVerifiedWorldTransition({
  episode:"physically-observed-math-maze-"+i,
  before:x+" * "+y+" = "+z+".",
  after:x2+" * "+y2+" = "+z2+".",
  action:"recorded-world-effect-"+i,accepted:true,
  source:"independent-numeric-world-transition"
 }));
 const observedPrompts=[
  ["Compute 2 times 3.","2 * 3 = 6."],
  ["Compute 2 times 4.","2 * 4 = 8."],
  ["Compute 3 times 3.","3 * 3 = 9."],
  ["Compute 3 times 4.","3 * 4 = 12."]
 ];
 for(const [q,a] of observedPrompts)n.observeQA(q,a);
 const question="Compute 8 times 7.";
 assert.equal(observedPrompts.some(([q])=>q===question),false);
 const p=n.planCumulativeQuestion({question,maxGraphNodes:4000,maxExpansionDepth:18,
  includeTopology:true});
 assert.equal(p.found,true,JSON.stringify(p).slice(0,1100));
 assert.equal(p.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(p.goalLearnedFromQuestion,true);
 assert.equal(p.goalDependentAnswerSupplied,false);
 assert.equal(p.referenceAnswerProvided,false);
 assert.equal(p.predicted,"8 * 7 = 56.");
 assert.ok(p.steps>=8);
 assert.equal(p.sourceWitnessedQuestionAnswerExamples,4);
 assert.equal(p.learnedQuestionNumericAxes.length,2);
 assert.equal(p.topology.originalNativeV17Graph,true);
 assert.equal(p.pathContainsInferredEdges,true);
 for(const state of p.initialShape){
  const ns=state.match(/\d+/g).map(Number);
  assert.equal(ns[0]*ns[1],ns[2],"Independent physical arithmetic check on every predicted step");
 }
 console.log("V30_AUTONOMOUS_QUESTION_TO_HYPERMAZE",JSON.stringify({
  trainedQuestionAnswerEpisodes:4,
  physicallyWitnessedDifferentMazeEpisodes:4,
  previouslyUnseenQuestion:question,fullFirstAnswer:p.predicted,
  originalShapeSteps:p.steps,goalFromQuestionOnly:true,
  dependentAnswerNotProvided:true,
  semanticScope:"learned fixed question grammar and witnessed numeric field, not arbitrary OpenThoughts"
 }));
});

test("no known goal grammar, no physically observed world effects, or contradictory Q/A must block question-only navigation",()=>{
 const b=brain(),n=new NativeGoalTextMaze(b);
 for(const [q,a] of [
  ["Compute 2 times 3.","2 * 3 = 6."],
  ["Compute 2 times 4.","2 * 4 = 8."],
  ["Compute 3 times 3.","3 * 3 = 9."],
  ["Compute 3 times 4.","3 * 4 = 12."]
 ])n.observeQA(q,a);
 assert.equal(n.planCumulativeQuestion({question:"Compute 8 times 7."}).found,false,
  "Questions without accepted physical rules cannot invent a solution");
 assert.equal(n.planCumulativeQuestion({question:"Describe photosynthesis in new words."}).found,false);
 n.observeQA("Compute 2 times 3.","An unrelated contradictory outcome.");
 assert.equal(n.planCumulativeQuestion({question:"Compute 8 times 7."}).found,false);
});

test("atlas records EVERY found/missing original path in one Brain: paginate all attempts, compare missing axes, inspect edge evidence, reload checkpoint",()=>{
 const b=brain(),n=new NativeGoalTextMaze(b);
 const atlas=()=>n.cumulativeAtlas({view:"attempts",limit:200});
 const failures=[];
 for(let i=0;i<12;i++){
  n.observeVerifiedWorldTransition({
   episode:"isolated-atlas-world-"+i,before:node(i),after:node(i+1),
   action:action(i),accepted:true,source:"actual-independent-movement"
  });
  const attempt=n.planCumulativeWorld({start:node(0),required:["exit"],
   includeTopology:true});
  if(i<11){
   assert.equal(attempt.found,false);
   failures.push(attempt.atlasAttemptId);
  }else{
   assert.equal(attempt.found,true);
   assert.equal(attempt.actions.length,12);
  }
 }
 const whole=atlas();
 assert.equal(whole.ok,true);
 assert.equal(whole.memory.attemptsTotal,12);
 assert.equal(whole.memory.failuresTotal,11);
 assert.equal(whole.memory.successesTotal,1);
 assert.equal(whole.rows.length,12);
 assert.ok(whole.rows.some(r=>r.outcome==="path-found"));
 assert.ok(whole.rows.some(r=>r.outcome==="path-missing"));
 assert.ok(whole.rows.some(r=>r.diagnostics.some(x=>x.code==="INFERRED_AXES_DISABLED_BY_DESIGN")));
 const failed=n.cumulativeAtlas({view:"attempts",filter:"failed",offset:0,limit:5});
 assert.equal(failed.total,11);
 assert.equal(failed.rows.length,5);
 assert.equal(failed.nextOffset,5);
 const next=n.cumulativeAtlas({view:"attempts",filter:"failed",offset:5,limit:5});
 assert.equal(next.rows.length,5);
 const last=n.cumulativeAtlas({view:"attempts",filter:"failed",offset:10,limit:5});
 assert.equal(last.rows.length,1);
 assert.equal(last.nextOffset,null);
 const selected=n.cumulativeAtlas({view:"attempts",attemptId:failures[3]});
 assert.equal(selected.selectedAttempt.id,failures[3]);
 assert.equal(selected.selectedAttempt.found,false);
 const nodes=n.cumulativeAtlas({view:"nodes",offset:0,limit:10});
 assert.equal(nodes.total,13);
 assert.equal(nodes.rows.length,10);
 assert.equal(nodes.nextOffset,10);
 assert.equal(n.cumulativeAtlas({view:"nodes",offset:10,limit:10}).rows.length,3);
 const edges=n.cumulativeAtlas({view:"edges",filter:"verified",limit:20});
 assert.equal(edges.total,12);
 assert.ok(edges.rows.every(x=>x.physicallyVerifiedOriginally&&x.traversableNow));
 const details=n.cumulativeAtlas({view:"attempts",attemptId:whole.rows[0].id});
 assert.equal(details.selectedAttempt.trace.length,12);
 assert.equal(new Set(details.selectedAttempt.trace.map(x=>x.episode)).size,12);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v30-atlas-"));
 try{
  const file=path.join(dir,"original-Brain.v8");b.save(file);
  const restored=new NativeGoalTextMaze(Brain.load(file));
  const copy=restored.cumulativeAtlas({view:"attempts",limit:200});
  assert.deepEqual(copy.rows,whole.rows);
  assert.deepEqual(copy.memory,whole.memory);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
 console.log("V30_ATLAS_FOUND_VS_MISSING",JSON.stringify({
  trainingEpisodes:12,retainedAttemptCount:whole.rows.length,
  successes:whole.memory.successesTotal,failures:whole.memory.failuresTotal,
  allPhysicalEdges:edges.total,
  explicitDesignGateCodes:[...new Set(failed.rows.flatMap(x=>x.diagnostics.map(d=>d.code)))],
  restoredExactNativeCheckpoint:true,allEvidenceAccessibleByPagination:true
 }));
});

test("atlas refuses to turn contradictory axes, failed physical steps, or similar source text into traversable edges",()=>{
 const b=brain(),n=new NativeGoalTextMaze(b);
 n.observeVerifiedWorldTransition({episode:"one",before:"door state",
  after:"door open",action:"use",accepted:true});
 n.observeVerifiedWorldTransition({episode:"two",before:"door state",
  after:"door locked",action:"use",accepted:true});
 n.observeVerifiedWorldTransition({episode:"three",before:"door state",
  after:"door closed",action:"invalid",accepted:null});
 n.observeNonCausalTextAdjacency({episode:"long-language",
  beforeText:"A question word occurs",afterText:"A different paragraph word occurs"});
 const refused=n.planCumulativeWorld({start:"door state",required:["open"]});
 assert.equal(refused.found,false);
 const audit=n.cumulativeAtlas({view:"edges",limit:20});
 assert.equal(audit.memory.ambiguousStateActionTypes,1);
 assert.equal(n.cumulativeAtlas({view:"edges",filter:"ambiguous"}).total,2);
 assert.equal(n.cumulativeAtlas({view:"edges",filter:"proposed"}).total,1);
 assert.equal(audit.rows.filter(e=>e.status==="source-order-only").length,1);
 assert.equal(audit.rows.filter(e=>e.traversableNow).length,0);
 const fails=n.cumulativeAtlas({view:"diagnostics",filter:"failed"});
 assert.ok(fails.rows.some(e=>e.code==="HIDDEN_STATE_ALIASING"));
 assert.ok(fails.rows.some(e=>e.code==="UNTESTED_HYPOTHESIS_EDGES"));
 assert.ok(fails.rows.some(e=>e.code==="DISCONNECTED_OR_MISSING_GOAL"));
});
