import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {NativeCrossEpisodeTransfer} from "../research/text-hypermaze/cross-episode-native.mjs";
import {NativeWorldAtlas} from "../research/text-hypermaze/native-world-atlas.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function native(){
 const b=new Brain({rules,seed:11});
 for(let i=0;i<240;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&
   b.disc.conduct(KIND.floor)>=.5&&b.disc.self()>=0)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
function laws(model){
 for(const [episodeId,action,before,after] of [
 ["world-apples","plus-two","Nora has 3 apples.","Nora has 5 apples."],
 ["world-books","plus-two","Toby has 8 books.","Toby has 10 books."],
 ["world-coins","minus-one","Zara has 6 coins.","Zara has 5 coins."],
 ["world-shells","minus-one","Leo has 15 shells.","Leo has 14 shells."]])
  assert.ok(model.observe({episodeId,action,before,after}).learned);
}
function physics({text,action}){
 const delta=action.name==="plus-two"?2:action.name==="minus-one"?-1:NaN;
 assert.ok(Number.isInteger(delta));
 const m=text.match(/\bhas ([0-9]+)\b/);
 return text.replace(/\bhas [0-9]+\b/,"has "+(Number(m[1])+delta));
}
test("V30 atlas: all paths, all world-witnessed transformations, every failure and independent outcome survive Brain .v8",()=>{
 const b=native(),model=new NativeCrossEpisodeTransfer(b,{maxStates:256,maxDepth:8});
 const atlas=new NativeWorldAtlas(b);
 assert.equal(atlas.summary().witnessedEvents,0);
 laws(model);
 const before=JSON.stringify(model.summary());
 let successes=0;
 for(let k=0;k<25;k++){
  const v=101+k,p=model.plan({startText:"AtlasWalker"+k+" has "+v+" stones.",
   goal:{numericEquals:v+4}});
  assert.ok(p.found);
  assert.equal(JSON.stringify(model.summary()),before,"preaction frozen graph cannot train weights");
  assert.equal(p.frontier.completeLanguageKnown,false);
  assert.equal(p.graph.nodes.length,p.graph.states);
  const id=atlas.logAttempt(p,{episodeId:"unseen-world-"+k,
   tag:"frozen plan over persistent cross-world rules"}).id;
  const out=model.execute(p,physics);
  atlas.logOutcome(id,out);
  successes+=Number(out.completeExact);
 }
 assert.equal(successes,25);
 const missing=model.plan({startText:"Impossible has 11 stones.",
   goal:{numericEquals:3001}});
 const missingId=atlas.logAttempt(missing,{episodeId:"no-observed-path"}).id;
 assert.equal(missing.found,false);
 const gaps=atlas.explain(missingId);
 assert.equal(gaps.planned,false);
 assert.ok(gaps.exploredNodes>0);
 assert.ok(Array.isArray(gaps.explicitDesignRestrictions));
 const summary=atlas.summary();
 assert.equal(summary.witnessedEvents,4);
 assert.equal(summary.recordedFrozenPlans,26);
 assert.equal(summary.physicallyValidatedSuccesses,25);
 assert.equal(summary.unplannedBlockedWorlds,1);
 assert.equal(summary.allLanguageStatesKnown,false);
 const events=atlas.page("witnesses",{offset:0,limit:2});
 assert.equal(events.total,4);assert.equal(events.items.length,2);
 assert.equal(atlas.page("witnesses",{offset:2,limit:2}).items.length,2);
 assert.equal(atlas.page("rules",{offset:0,limit:100}).total,2);
 assert.equal(atlas.page("worlds",{offset:0,limit:100}).total,4);
 assert.equal(atlas.page("attempts",{offset:0,limit:5}).total,26);
 assert.equal(atlas.page("failures",{offset:0,limit:100}).total,1);
 const detail=atlas.detail(missingId);
 assert.equal(detail.attempt.fullExploredGraph.nodes.length,missing.graph.nodes.length);
 assert.equal(detail.graphSemantics.knownClosure,missing.frontier.closureOfAllCurrentlyAdmittedTransfers);
 const folder=fs.mkdtempSync(path.join(os.tmpdir(),"magic-v30-atlas-"));
 try{
  const save=path.join(folder,"single-original-brain.v8");b.save(save);
  const revived=Brain.load(save);
  const resumedModel=new NativeCrossEpisodeTransfer(revived),
   resumedAtlas=new NativeWorldAtlas(revived);
  assert.deepEqual(resumedAtlas.summary(),summary);
  assert.deepEqual(resumedAtlas.detail(missingId),detail);
  assert.equal(resumedModel.summary().reusableActions,2);
  const next=resumedModel.plan({startText:"NewlyRestored has 8 crates.",
   goal:{numericEquals:12}});
  assert.ok(next.found);
 }finally{fs.rmSync(folder,{recursive:true,force:true});}
 console.log("V30_ATLAS_NATIVE_SAVED_PERSISTENCE",JSON.stringify({
  fullFrozenPlans:26,fullActualWorldOutcomes:25,
  completeWitnessHistory:4,independentSourceWorlds:4,
  model:"one V17 Brain",failureCounterexamples:1,
  allGraphNodesInspectable:true,allGraphEdgesInspectable:true,
  noOpenDomainClaim:true
 }));
});
test("V30 atlas: insufficient evidence, contradictory transformations, multi-token refusal and missing action labels remain visible",()=>{
 const b=native(),model=new NativeCrossEpisodeTransfer(b);
 const atlas=new NativeWorldAtlas(b);
 model.observe({episodeId:"first-world",action:"plus-two",
  before:"A has 2 coins.",after:"A has 4 coins."});
 const insufficient=model.plan({startText:"D has 8 coins.",
  goal:{numericEquals:10}});
 assert.equal(insufficient.found,false);
 assert.equal(insufficient.frontier.withheldRules[0].reason,
  "INSUFFICIENT_INDEPENDENT_WORLDS");
 atlas.logAttempt(insufficient,{episodeId:"insufficient-support"});
 model.observe({episodeId:"second-world",action:"plus-two",
  before:"B has 7 coins.",after:"B has 9 coins."});
 assert.ok(model.plan({startText:"D has 8 coins.",goal:{numericEquals:10}}).found);
 const multi=model.observe({episodeId:"third-world",action:"multiple-edits",
  before:"A has one apple.",after:"B has two oranges."});
 assert.equal(multi.learned,false);
 assert.equal(multi.reason,"unsupported-witnessed-effect");
 model.observe({episodeId:"third-world",action:"plus-two",
  before:"C has 6 coins.",after:"C has 9 coins."});
 assert.equal(model.summary().conflicts,1);
 const broken=model.plan({startText:"D has 8 coins.",
  goal:{numericEquals:10}});
 assert.equal(broken.found,false);
 assert.equal(broken.frontier.withheldRules[0].reason,"CONTRADICTORY_OBSERVED_EFFECTS");
 const id=atlas.logAttempt(broken,{episodeId:"conflicted-rule"}).id;
 const explain=atlas.explain(id);
 assert.ok(explain.missingObservedRules.some(x=>x.reason==="CONFLICTED_OBSERVED_EFFECTS"));
 assert.equal(atlas.page("witnesses",{limit:20}).total,4);
 assert.equal(atlas.page("witnesses",{limit:20}).items.filter(x=>x.type==="rejected").length,1);
 assert.equal(atlas.page("witnesses",{limit:20}).items.filter(x=>x.type==="conflict").length,1);
 const named=model.plan({startText:"E has 11 coins.",goal:{numericEquals:13},
  allowedActions:["another-world-action"]});
 assert.deepEqual(named.frontier.missingLabels,["another-world-action"]);
});
test("V30 atlas: finite search budget reports EACH excluded possible corridor, never claims a complete language world",()=>{
 const b=native(),model=new NativeCrossEpisodeTransfer(b,{maxStates:4,maxDepth:2}),
  atlas=new NativeWorldAtlas(b);
 laws(model);
 const p=model.plan({startText:"D has 20 stones.",
  goal:{numericEquals:44}});
 assert.equal(p.found,false);
 assert.ok(p.frontier.counts.depthCutoff>0||
  p.frontier.counts.stateCutoff>0,
  "If learner can step farther, the omitted known corridors must be counted");
 assert.equal(p.frontier.closureOfAllCurrentlyAdmittedTransfers,false);
 assert.equal(p.frontier.completeLanguageKnown,false);
 assert.equal(p.graph.completeNaturalLanguageWorld,false);
 const id=atlas.logAttempt(p,{episodeId:"design-limits"}).id;
 const d=atlas.explain(id);
 assert.ok(d.explicitDesignRestrictions.some(x=>
  /DEPTH_DESIGN_CUTOFF|STATE_DESIGN_CUTOFF/.test(x.type)));
 const detail=atlas.detail(id);
 assert.ok(detail.graphSemantics.frontierCutoffs.depthCutoff+
  detail.graphSemantics.frontierCutoffs.stateCutoff>0);
 console.log("V30_DESIGN_MISSING_PATHS",JSON.stringify({
  omittedDepth:detail.graphSemantics.frontierCutoffs.depthCutoff,
  omittedState:detail.graphSemantics.frontierCutoffs.stateCutoff,
  pathFound:p.found,notMislabelledComplete:true,
  reason:p.reason}));
});
