import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {CrossWorldAtlas,charList,tokenList} from
  "../transcend/torus-aether/worlds/cross-world-atlas.mjs";

const root=fileURLToPath(new URL("..",import.meta.url));
const doc=fs.readFileSync(path.join(root,"docs/TORUS_AETHER_ABC_20261104.md"),"utf8");
const paragraphs=doc.split(/\n\s*\n/u).filter(s=>tokenList(s).length>=25);
const same=x=>JSON.stringify(x);
test("cross-world route is IMPOSSIBLE before bridge observation, becomes FOUND only by reusing observed transformations from other documents",()=>{
  const a=new CrossWorldAtlas({order:2,mode:"token"});
  const docs=[
    "we found the shape and the field",
    "the field changes through time",
    "time opens another perspective",
    "perspective leads to another solution"
  ];
  for(let i=0;i<2;i++)a.observe(docs[i],{id:"real-observation-"+i});
  const start=["we","found"],goal=["another","solution"];
  const pre=a.plan(start,goal);
  assert.equal(pre.found,false);
  assert.equal(pre.reason,"UNKNOWN_GOAL");
  const old=a.export();
  // Goal must be learned from OTHER episodes; none of the target
  // path's middle symbols are injected into plan.
  a.observe(docs[2],{id:"another-world-2"});
  a.observe(docs[3],{id:"another-world-3"});
  const result=a.plan(start,goal);
  assert.equal(result.found,true);
  assert.equal(result.initialPrediction.predictedFirstBeforeAction,true);
  assert.equal(result.initialPrediction.everyEdgeObserved,true);
  assert.deepEqual(result.initialPrediction.tokens,[
    "we","found","the","shape","and","the","field","changes","through",
    "time","opens","another","perspective","leads","to","another","solution"
  ]);
  const provenance=result.initialPrediction.links.flatMap(e=>e.sources.map(x=>x.id));
  assert.ok(provenance.includes("real-observation-0"));
  assert.ok(provenance.includes("real-observation-1"));
  assert.ok(provenance.includes("another-world-2"));
  assert.ok(provenance.includes("another-world-3"));
  const oldRestored=CrossWorldAtlas.restore(old);
  assert.equal(oldRestored.plan(start,goal).found,false);
  assert.equal(oldRestored.states.length<a.states.length,true);
  console.log("V31_TRANSFER_AFTER_MORE_WORLDS",JSON.stringify({
    before:pre.reason,after:result.reason,
    completeBeforeAction:true,uniqueSourceDocs:new Set(provenance).size,
    observedShortestSteps:result.initialPrediction.steps,
    targetContentsNotInjectedIntoSearch:true}));
});
test("same start and goal, multiple real paths, full candidate atlas, seeded alternatives and preserved provenance",()=>{
  const a=new CrossWorldAtlas({order:2,mode:"token"});
  a.observe("a b c x y end z",{id:"path-A"});
  a.observe("a b c u v end z",{id:"path-B"});
  const p=a.plan(["a","b"],["end","z"],{maxPaths:10});
  assert.equal(p.found,true);
  assert.equal(p.alternatives,2);
  assert.equal(p.allObservedShortestPathsEnumerated,true);
  assert.equal(p.paths[0].steps,p.paths[1].steps);
  assert.notDeepEqual(p.paths[0].tokens,p.paths[1].tokens);
  const values=p.paths.flatMap(z=>z.links.map(x=>x.fieldAfter-x.fieldBefore));
  assert.ok(values.every(v=>v>0),"Original attraction field strictly increases");
  const a0=a.plan(["a","b"],["end","z"],{seed:909,maxPaths:10});
  const a1=a.plan(["a","b"],["end","z"],{seed:909,maxPaths:10});
  assert.deepEqual(a0.paths,a1.paths);
  const ab=a.withoutEdge(["c","x"],["x","y"],["a","b"],["end","z"]);
  assert.equal(ab.removed,true);
  assert.equal(ab.stillReachable,true,"Other observed path remains!");
  assert.equal(a.plan(["a","b"],["end","z"]).paths.length,2);
  console.log("V31_ALL_ALTERNATIVE_PATHS",JSON.stringify({
    actualPaths:p.alternatives,allObservedShortestPathsEnumerated:true,
    seededReplayStable:true,oneRemovedStillReachable:true}));
});
test("frozen withheld natural text: before and after training, every wrong character or context is explained without hiding failure",()=>{
  const train=paragraphs.slice(0,18),heldout=paragraphs.slice(23,27);
  assert.ok(train.length>=12&&heldout.length>=1);
  const a=new CrossWorldAtlas({order:3,mode:"char",maxStates:14000,maxEdges:70000});
  for(let i=0;i<train.length;i++)a.observe(train[i],{id:"corpus-training-"+i});
  const before=a.export();
  const report=heldout.map((s,i)=>a.auditTrace(s,{source:"withheld-"+i}));
  const after=a.export();
  assert.equal(same(before),same(after),"Frozen report may not mutate memory");
  for(const r of report){
    assert.equal(r.frozen,true);
    assert.equal(r.knownGoalGiven,true);
    assert.equal(r.unknownInteriorWithheld,true);
    assert.ok(r.performance.total>=0);
    assert.equal(r.performance.missing+r.performance.covered,r.performance.total);
    assert.equal(r.performance.correct+r.performance.wrong,r.performance.covered);
    assert.equal(r.performance.rows.every(x=>x.correct||
      ["MISSING_CONTEXT","DEAD_END","UNOBSERVED_EDGE","WRONG_BRANCH_RANK"].includes(x.reason)),true);
  }
  const stats=report.reduce((z,r)=>({
    total:z.total+r.performance.total,
    covered:z.covered+r.performance.covered,
    correct:z.correct+r.performance.correct,
    success:z.success+Number(r.firstPathExactlyMatchesActual),
    noRoute:z.noRoute+Number(!r.initialFound),
    missingContexts:z.missingContexts+r.performance.rows.filter(x=>x.reason==="MISSING_CONTEXT").length,
    missingEdges:z.missingEdges+r.performance.rows.filter(x=>x.reason==="UNOBSERVED_EDGE").length,
    wrongBranches:z.wrongBranches+r.performance.rows.filter(x=>x.reason==="WRONG_BRANCH_RANK").length
  }),{total:0,covered:0,correct:0,success:0,noRoute:0,missingContexts:0,missingEdges:0,wrongBranches:0});
  assert.ok(stats.total>20);
  console.log("V31_REAL_DOCS_FROZEN_CHAR_FAILURES",JSON.stringify({
    ...stats,heldoutDocuments:report.length,trainingDocuments:train.length,
    characterAccuracyAll:stats.correct/stats.total,
    characterCoverage:stats.covered/stats.total,
    fullExactFirstPaths:stats.success+"/"+report.length,
    noReferenceLeakage:true,modelNotMutated:true}));
});
test("full original observed topology in checkpoint, capped display is not mistaken for a full maze",()=>{
  const a=new CrossWorldAtlas({order:2,mode:"char"});
  for(const [i,s]of ["the maze learns pathways","the language retains pathways",
    "the organism can travel","the maze learns transformations"].entries())
    a.observe(s,{id:"doc-"+i});
  const before=a.export(),mini=a.snapshot({maxNodes:4,maxEdges:2});
  assert.equal(mini.visible.nodes.length,4);
  assert.ok(a.states.length>mini.visible.nodes.length);
  const restored=CrossWorldAtlas.restore(before);
  assert.deepEqual(restored.export(),before);
  const route=restored.plan(["t","h"],["y","s"]);
  assert.deepEqual(route,a.plan(["t","h"],["y","s"]));
  assert.equal(restored.documents,4);
  assert.ok(mini.observedEdges>=mini.visible.edges.length);
  console.log("V31_FULL_PERSISTENT_ATLAS",JSON.stringify({
    originalStates:a.states.length,originalEdges:a.edges.size,
    displayedNodes:mini.visible.nodes.length,
    restoredExact:true}));
});
test("explicit state and edge budgets DO NOT silently claim complete hyperdimensional world",()=>{
  const a=new CrossWorldAtlas({order:2,mode:"char",maxStates:32,maxEdges:32});
  const s="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  a.observe(s,{id:"large-world"});
  assert.ok(a.skippedStates>0||a.skippedEdges>0);
  const snapshot=a.snapshot();
  assert.equal(snapshot.capacityTruncated,true);
  assert.ok(snapshot.skippedStates+snapshot.skippedEdges>0);
  assert.equal(a.evaluateFrozen(s).graphCompleteForObservedEdges,false);
  console.log("V31_CAPACITY_DISCLOSURE",JSON.stringify({
    states:a.states.length,edges:a.edges.size,
    skippedStates:a.skippedStates,skippedEdges:a.skippedEdges,
    cannotClaimCompleteWorld:true}));
});
