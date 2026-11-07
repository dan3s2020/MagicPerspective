import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {CumulativeHyperMaze} from "../research/text-hypermaze/cumulative-hypermaze.mjs";
import {NativeCrossEpisodeTransfer} from "../research/text-hypermaze/cross-episode-native.mjs";
import {ForensicPathAtlas} from "../research/text-hypermaze/forensic-path-atlas.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
function brain(){
 const b=new Brain({rules,seed:91});
 for(let i=0;i<150;i++){
  playExercise(makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]),b.disc);
  if(i>=24&&b.disc.attract(KIND.target)>.2&&b.disc.conduct(KIND.floor)>=.5)break;
 }
 assert.ok(b.disc.attract(KIND.target)>.2);
 return b;
}
function joinableWorld(){
 const b=brain(),m=new CumulativeHyperMaze(b),atlas=new ForensicPathAtlas(b);
 for(let i=0;i<4;i++)m.observeTransition({
  episode:"left-"+i, before:"corridor "+i,after:"corridor "+(i+1),
  action:"move-"+i,accepted:true});
 for(let i=6;i<10;i++)m.observeTransition({
  episode:"right-"+i,before:"corridor "+i,after:
   i===9?"exit reached":"corridor "+(i+1),
  action:"move-"+i,accepted:true});
 return {b,m,atlas};
}

test("read-only atlas diagnoses disconnected maze segments without fabricating a bridge",()=>{
 const {b,m,atlas}=joinableWorld();
 const before=JSON.stringify([m.state,b.disc.attract(KIND.target)]);
 const observed=m.plan({start:"corridor 0",required:["exit"]});
 assert.equal(observed.found,false);
 const report=atlas.analyse({start:"corridor 0",required:["exit"],nativePlan:observed});
 assert.equal(report.originalPlanFound,false);
 assert.equal(report.topology.verifiedPathExists,false);
 assert.equal(report.topology.weakComponents,2);
 assert.equal(report.topology.reachableFromStart,5);
 assert.equal(report.topology.goalNodesRetained,1);
 assert.equal(report.oneEvidenceBridgeCandidates.length,0);
 assert.equal(report.diagnosis,"DISCONNECTED_VERIFIED_COMPONENTS_REQUIRE_NEW_EVIDENCE");
 assert.equal(report.nextExperiment.type,"OBSERVE_NEW_TRUE_BEFORE_ACTION_AFTER_AT_REACHABLE_FRONTIER");
 assert.equal(JSON.stringify([m.state,b.disc.attract(KIND.target)]),before);
});
test("observed SOURCE ORDER and unverified proposals are visible walls until independent action evidence opens the same gap",()=>{
 const {m,atlas}=joinableWorld();
 const initial=m.plan({start:"corridor 0",required:["exit"]});
 m.observeTextAdjacency({episode:"language-fragment-1",
  beforeText:"corridor 4",afterText:"corridor 6"});
 m.observeTransition({episode:"hypothetical-only",
  before:"corridor 4",after:"corridor 6",action:"unknown-bridge",
  accepted:null,source:"model-not-an-environment"});
 const before=atlas.analyse({start:"corridor 0",required:["exit"],nativePlan:initial});
 assert.equal(before.topology.verifiedPathExists,false);
 assert.ok(before.oneEvidenceBridgeCandidates.some(x=>x.kind==="CORPUS_ORDER_ONLY"));
 assert.ok(before.oneEvidenceBridgeCandidates.some(x=>x.kind==="OBSERVED_PROPOSAL"));
 assert.equal(atlas.page({section:"textOnly"}).items[0].status,
  "CHRONOLOGICAL_NOT_PHYSICAL");
 assert.equal(atlas.page({section:"proposals"}).items[0].status,
  "HYPOTHESIS_NOT_WALKABLE");
 const upgraded=m.observeTransition({episode:"independently-verified-bridge",
  before:"corridor 4",after:"corridor 6",action:"cross-bridge",accepted:true,
  source:"independent-physical-outcome"});
 assert.equal(upgraded.walkable,true);
 const p=m.plan({start:"corridor 0",required:["exit"],includeTopology:true});
 assert.equal(p.found,true);
 assert.equal(p.steps,9);
 assert.equal(p.originalPlanner,"Discoverer.shapeGraph");
 assert.ok(p.actions.some(x=>x.action==="cross-bridge"));
 const after=atlas.analyse({start:"corridor 0",required:["exit"],nativePlan:p});
 assert.equal(after.topology.verifiedPathExists,true);
 assert.equal(after.topology.weakComponents,1);
 assert.equal(after.originalPlanFound,true);
 assert.equal(after.selectedPathEvidenceComplete,true);
 assert.ok(after.verifiedPathAlternatives.routes.some(p=>p.length===10));
 assert.ok(after.oneEvidenceBridgeCandidates.length===0);
 assert.equal(p.topology.edges.every(e=>e.status==="physically-verified"),true);
 console.log("V31_MISSING_BRIDGE_RECOVERY",JSON.stringify({
  before:before.diagnosis,after:after.diagnosis,
  generatedSteps:p.steps,observedIndependentEpisodes:9,
  correctWorldActionRequired:true,unverifiedTextOrderRejected:true
 }));
});
test("every retained edge and its episode provenance is paged, including explicit blocked action and repeated evidence",()=>{
 const {m,atlas}=joinableWorld();
 for(let i=0;i<8;i++)m.observeTransition({episode:"repeated-"+i,
  before:"corridor 0",action:"move-0",after:"corridor 1",accepted:true});
 m.observeTransition({episode:"old-world",before:"corridor 0",
  action:"forbidden-shortcut",after:"exit reached",accepted:true});
 m.observeTransition({episode:"new-world",before:"corridor 0",
  action:"forbidden-shortcut",after:"corridor 0",
  expectedAfter:"exit reached",accepted:false});
 const total=atlas.summary();
 assert.equal(total.blockedEdges,1);
 const first=atlas.page({section:"verified",limit:3,offset:0});
 const next=atlas.page({section:"verified",limit:3,offset:3});
 assert.equal(first.items.length,3);
 assert.equal(next.offset,3);
 assert.ok(first.total>first.items.length);
 assert.equal(total.walkableVerifiedEdges,first.total);
 assert.equal(first.items.concat(next.items).some(x=>x.action==="move-0"),true);
 const blocked=atlas.page({section:"blocked"});
 assert.equal(blocked.items[0].action,"forbidden-shortcut");
 assert.equal(blocked.items[0].status,"rejected-by-world");
 const e=atlas.page({section:"verified",limit:1000}).items.find(x=>x.action==="move-0");
 assert.equal(e.support,9);
 assert.equal(e.independentEpisodes,9);
 const selected=atlas.analyse({start:"corridor 0",required:["exit"]});
 assert.ok(selected.missingBridgeCandidates.every(x=>!x.walkable));
});
test("after-only Unicode character audit identifies first incorrect character and distinguishes absent from reachable symbols",()=>{
 const {m,atlas}=joinableWorld();
 const p=m.plan({start:"corridor 0",required:["exit"]});
 const report=atlas.analyse({start:"corridor 0",required:["exit"],nativePlan:p});
 assert.equal(report.referenceWasNotSupplied,true);
 assert.equal(report.predictedBeforeAction,null);
 const scored=atlas.compareAfterFrozenPlan({atlasResult:report,
  reference:"☯ completely unseen"});
 assert.equal(scored.comparedAfterFrozenPrediction,true);
 assert.equal(scored.firstMismatch,0);
 assert.equal(scored.firstWrongExpected,"☯");
 assert.equal(scored.firstWrongReason,"CORRECT_CHARACTER_ABSENT_FROM_RETAINED_STATES");
 assert.equal(scored.wrongCharacterExamples[0].expectedCodePoint,0x262f);
 assert.equal(scored.referenceNeverSentToPlanner,true);
});
test("incomplete retained memory must report design erasure, never a complete maze",()=>{
 const b=brain(),m=new CumulativeHyperMaze(b,{maxStates:4,maxEdges:4}),
  atlas=new ForensicPathAtlas(b);
 for(let i=0;i<12;i++)m.observeTransition({
  episode:"evicted-world-"+i,before:"location "+i,
  after:"location "+(i+1),action:"walk-"+i,accepted:true});
 const summary=atlas.summary();
 assert.ok(summary.designLimits.causalMemory.evictedNodes>0);
 assert.ok(summary.designLimits.causalMemory.evictedEdges>0);
 assert.equal(summary.retainedMemoryComplete,false);
 const result=atlas.analyse({start:"location 0",required:["location"]});
 assert.equal(result.diagnosis,"START_NOT_WITNESSED_IN_CAUSAL_MEMORY");
 assert.equal(result.topology.totalRetainedNodes<=4,true);
 assert.ok(result.atlas.designLimits.causalMemory.evictedNodes>=1);
});
test("cross-world action hypotheses from other V30 branch are visible in SAME Brain without silently becoming verified maze edges",()=>{
 const b=brain(),transfer=new NativeCrossEpisodeTransfer(b),atlas=new ForensicPathAtlas(b);
 for(const [world,a,c] of [["a",3,5],["b",8,10]]){
  transfer.observe({episodeId:world,action:"increase-two",
   before:"Sam has "+a+" stones.",after:"Sam has "+c+" stones."});
 }
 assert.equal(transfer.summary().reusableActions,1);
 const detail=atlas.page({section:"crossWorld",limit:30});
 assert.equal(detail.total,1);
 assert.equal(detail.items[0].support,2);
 assert.deepEqual(detail.items[0].worlds,["a","b"]);
 assert.equal(detail.items[0].status,
  "TRANSFER_HYPOTHESIS_UNTIL_VERIFIED_IN_TARGET_WORLD");
 assert.equal(atlas.summary().walkableVerifiedEdges,0);
 assert.equal(atlas.summary().crossWorldRules,1);
});
test("native atlas, actions, cumulative map and cross-world evidence survive SAME original .v8 checkpoint",()=>{
 const {b,m,atlas}=joinableWorld();
 m.observeTransition({episode:"bridge",before:"corridor 4",after:"corridor 6",
  action:"cross-bridge",accepted:true});
 const original=atlas.analyse({start:"corridor 0",required:["exit"]});
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v31-atlas-"));
 try{
  const file=path.join(dir,"native-brain.v8");b.save(file);
  const restored=Brain.load(file);
  const again=new ForensicPathAtlas(restored).analyse({
   start:"corridor 0",required:["exit"]});
  assert.equal(again.topology.verifiedPathExists,true);
  assert.deepEqual(again.topology,original.topology);
  assert.equal(again.atlas.walkableVerifiedEdges,original.atlas.walkableVerifiedEdges);
  assert.equal(typeof restored.disc.shapeGraph,"function");
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
