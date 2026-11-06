import test from "node:test";
import assert from "node:assert/strict";
import {committedTrainingMaze} from "./hypermaze-live-training.mjs";
import {livingV17Trace} from "./hypermaze-native-live.mjs";

test("REAL corpus row: preserve pre-learning prior, actual observed-character path and after-learning competing routes",()=>{
 const event={
  kind:"TRAINING_QA_COMMITTED",seq:14,at:1762488000000,where:"CUDA_BATCH_COMMITTED",
  prompt:"which route",observedAnswer:"abc",fullAnswerChars:3,
  brainChars:1234,trainingMemory:{rowsObserved:20,successorTraining:{updates:239}},
  before:{before:"axc",abstained:false,seenQABefore:19},
  after:{
   output:"abc",graph:{
    nodes:[{id:0,kind:3,potential:.6,successorOccupancy:.6},
      {id:1,lastCharacter:"a",potential:.8,successorOccupancy:.8},
      {id:2,lastCharacter:"b",potential:.9,successorOccupancy:.9},
      {id:3,lastCharacter:"c",potential:1,successorOccupancy:1},
      {id:4,lastCharacter:"x",potential:.7,successorOccupancy:.7},
      {id:5,lastCharacter:"c",potential:1,successorOccupancy:1}],
    edges:[{from:0,to:1,character:"a",observedSupport:4},
      {from:1,to:2,character:"b",observedSupport:2},
      {from:2,to:3,character:"c",observedSupport:2},
      {from:1,to:4,character:"x",observedSupport:1},
      {from:4,to:5,character:"c",observedSupport:1}],
    goals:[{node:3},{node:5}]
   }
  }
 };
 const m=committedTrainingMaze(event);
 assert.deepEqual(m.observedNodes,[0,1,2,3]);
 assert.deepEqual(m.preNodes,[0,1,4,5]);
 assert.deepEqual(m.postNodes,[0,1,2,3]);
 assert.deepEqual(m.trace.map(x=>x.character),["a","b","c"]);
 assert.deepEqual(m.trace.map(x=>x.predictedCharacter),["a","x","c"]);
 assert.equal(m.metrics.beforePredictionCharacterRate,2/3);
 assert.equal(m.metrics.observedBranches,1);
 assert.equal(m.metrics.trainedRows,20);
 assert.equal(m.metrics.successorUpdates,239);
 assert.equal(m.provenance,"ACTUAL_COMMITTED_TRAINING_ROW_AND_PREVIOUS_LANGUAGE_WORLD");
});
test("new actual training answer edge remains honestly marked observed and is NEVER fabricated as a previous prediction",()=>{
 const m=committedTrainingMaze({
  kind:"TRAINING_QA_COMMITTED",observedAnswer:"xyz",fullAnswerChars:3,
  before:{before:null,abstained:true},after:{output:"xyz",
   graph:{nodes:[{id:0}],edges:[],goals:[]}}
 });
 assert.equal(m.preNodes.length,0,"No prior solution must not be drawn as gold");
 assert.equal(m.observedNodes.length,4);
 assert.equal(m.metrics.beforePredictionCharacterRate,null);
 assert.equal(m.graph.edges.length,3);
 assert.ok(m.graph.edges.every(e=>e.source==="actual_completed_corpus_character"));
 assert.deepEqual(m.trace.map(e=>e.character),["x","y","z"]);
});
test("native original V17 GraphTrace symbols, A/C links and errors use actual measured source data",()=>{
 const snap={
  nodes:[
   ["s:97","sym","a",1,0,0],
   ["s:98","sym","b",.4,10,1],
   ["a:1","A","A·1",.5,15,0],
   ["c:x","C","C·x",.3,18,0]],
  edges:[
   ["s:97","s:98","world",.2,""],
   ["a:1","s:97","feel",2,""],
   ["c:x","s:98","see",.8,""]],
  U:[[97,[.1,.2,.3,.4,.5]],[98,[.5,.6,.7,.8,.9]]],
  strip:[[97,1,0,0],[98,0,0,1]],
  flow:[[97,98]],accC:.4,accF:.6,chars:400
 };
 const n=livingV17Trace(snap);
 assert.equal(n.nodes.length,4);
 assert.equal(n.links.length,3);
 assert.equal(n.countNative,2);
 assert.equal(n.countProjected,2);
 assert.equal(n.nodes[1].error,1);
 assert.ok(n.nodes.every(v=>v.coord?.length===5));
 assert.equal(n.stream[1].char,"b");
 assert.equal(n.stream[1].misleading,true);
 assert.equal(n.accF,.6);
 assert.match(n.provenance,/REAL_V17_GRAPHTRACE_LIVE/);
});
test("reject bogus absent training and graph data instead of drawing any simulated maze",()=>{
 assert.throws(()=>committedTrainingMaze({kind:"DEMO"}),/Committed Q\/A/);
 assert.throws(()=>livingV17Trace({U:[]}),/trace snapshot missing/);
});
