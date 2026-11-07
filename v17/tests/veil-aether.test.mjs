import test from "node:test";
import assert from "node:assert/strict";
import {VeilAether} from "../transcend/torus-aether/worlds/veil-aether.mjs";
import {TextHypermaze} from "../transcend/torus-aether/worlds/text-hypermaze.mjs";
import {Discoverer} from "../transcend/torus-aether/worlds/exercise.mjs";

test("same current symbol, different observed histories => different learned futures",()=>{
 const m=new VeilAether({maxStates:100,maxEdges:300});
 for(let i=0;i<16;i++){
  m.observeTokens(["Alice","is","happy","."],{id:i*2});
  m.observeTokens(["Bob","is","sad","."],{id:i*2+1});
 }
 const alice=m._choice(["Alice","is"]),bob=m._choice(["Bob","is"]);
 assert.equal(alice.token,"happy");
 assert.equal(bob.token,"sad");
 assert.equal(alice.p,1);assert.equal(bob.p,1);
 const s=m.snapshot();
 assert.ok(s.historyAxisEvidence>0,"Prior-token context must matter measurably");
 assert.ok(s.contextAccuracyCovered>.9,JSON.stringify(s));
 assert.ok(s.oneTokenAccuracyAll<.7,JSON.stringify(s));
 assert.equal(s.semanticGoalVerified,false);
 assert.equal(s.originalDiscovererDirectlyReused,false);
 assert.equal(typeof Discoverer.prototype.shape,"function","Original maze method retained");
 console.log("V21_CONTEXT_MEMORY",JSON.stringify({states:s.states,edges:s.edges,
   contextual:s.contextAccuracyCovered,oneToken:s.oneTokenAccuracyAll,
   historyAxisEvidence:s.historyAxisEvidence}));
});

test("frozen contextual path is the original V17 0.97 attraction law on observed edges",()=>{
 const m=new VeilAether();
 for(let i=0;i<6;i++)m.observeTokens(["Alice","is","happy","."]);
 const old=JSON.stringify(m.export());
 const p=m.plan(["Alice","is"],["happy","."]);
 assert.equal(p.found,true);
 assert.equal(p.distance,2);
 assert.deepEqual(p.path,["Alice is","is happy","happy ."]);
 assert.equal(p.math.shortestObservedRoute,true);
 assert.equal(p.math.strictUphill,true);
 assert.ok(p.math.maxResidual<1e-11,p.math.maxResidual);
 assert.equal(JSON.stringify(m.export()),old,"Frozen planner MUST NOT train");
 assert.equal(m.plan(["Alice","is"],["never","observed"]).found,false);
 assert.equal(m.plan(["happy","."],["Alice","is"]).found,false);
 console.log("V21_FROZEN_SHAPE",JSON.stringify(p.math));
});

test("chance branches are measured from observations; surprise and replanning precede learning",()=>{
 const m=new VeilAether();
 for(let i=0;i<8;i++)m.observeTokens(["Alice","is","happy","."]);
 for(let i=0;i<2;i++)m.observeTokens(["Alice","is","sad","."]);
 const before=m._choice(["Alice","is"]);
 assert.equal(before.token,"happy");assert.equal(before.choices.length,2);
 assert.ok(Math.abs(before.choices.find(x=>x.token==="sad").p-.2)<1e-10);
 const latest=m.observeTokens(["Alice","is","sad","."],{id:20261107});
 assert.equal(latest.plannedBeforeIngestion,true);
 // This document may not be sampled for replay; persisted online totals
 // must include its PRE-observation discrepancy.
 const now=m._choice(["Alice","is"]);
 assert.ok(Math.abs(now.choices.find(x=>x.token==="sad").p-3/11)<1e-10);
 assert.equal(now.support,11);
 assert.equal(m.docs,11);
});

test("observed physical effects join same checkpoint but cannot fabricate text edges",()=>{
 const m=new VeilAether();
 m.observeTokens(["one","two","three"]);
 const before=m.edges.size;
 m.observeExperience({domain:"maze",before:[1,3,0],action:"output:5",after:[1,0,3]});
 m.observeExperience({domain:"maze",before:[1,0,3],action:"output:5",after:[1,0,3]});
 m.observeExperience({domain:"transform",before:[0,0],action:"output:7",after:[1,0]});
 m.observeExperience({domain:"text",before:"a",action:"observed-edit",after:"b"});
 assert.equal(m.edges.size,before,"Different worlds do not hallucinate token paths");
 assert.equal(m.domainEvents.maze,2);
 assert.equal(m.domainEvents.transform,1);
 assert.equal(m.domainEvents.text,1);
 const [maze]=m.snapshot().externalActions.filter(r=>r.domain==="maze");
 assert.equal(maze.observed,2);assert.equal(maze.changed,1);assert.equal(maze.unchanged,1);
 assert.deepEqual(VeilAether.restore(m.export()).snapshot(),m.snapshot());
});

test("bounded contextual graph, honest skipped states and legacy checkpoint migration",()=>{
 const m=new VeilAether({maxStates:8,maxEdges:8});
 for(let i=0;i<60;i++)m.observeTokens(["root",String(i),"branch",String(i+1)]);
 const state=m.snapshot();
 assert.ok(state.states<=8&&state.edges<=8);
 assert.ok(state.skippedStates>0);
 assert.ok(state.skippedEdges>=0);
 const v20=new TextHypermaze({maxNodes:50,maxEdges:100});
 for(let i=0;i<12;i++)v20.observeWorld("Alice is happy. Bob is sad.",{id:i});
 assert.ok(v20.veil.nodes.length>0);
 assert.ok(v20.snapshot().veil.documents===12);
 const restored=TextHypermaze.restore(v20.export());
 assert.deepEqual(restored.veil.snapshot(),v20.veil.snapshot());
 const legacy=v20.export();delete legacy.veil;
 const migrated=TextHypermaze.restore(legacy);
 assert.equal(migrated.veil.docs,0);
 assert.deepEqual(migrated.plan("Alice","sad").math,v20.plan("Alice","sad").math);
});

test("no future document ingestion enters its preaction shape",()=>{
 const m=new VeilAether();
 const first=m.observeTokens(["never","before","seen","word"],{id:1});
 assert.deepEqual(first.firstShape,[]);
 const second=m.observeTokens(["never","before","seen","word"],{id:2});
 assert.deepEqual(second.firstShape,["never before","before seen","seen word"]);
 assert.equal(second.plannedBeforeIngestion,true);
 assert.equal(m.last.initialFound,true);
 assert.ok(m.last.frames[0].remainingShape.length>=2);
 console.log("V21_NO_FUTURE_LEAK",JSON.stringify({first:first.firstShape,second:second.firstShape}));
});
