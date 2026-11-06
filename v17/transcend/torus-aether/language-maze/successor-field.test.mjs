import test from "node:test";
import assert from "node:assert/strict";
import {KIND} from "../worlds/exercise.mjs";
import {shapeOnLearnedTopology} from "./shape-topology.mjs";
import {successorGoalField,selectUphillEdge} from "./successor-field.mjs";
import {LanguageMazeMemory} from "./language-world.mjs";

const conduct=k=>k===KIND.wall?.01:1;
const attract=k=>k===KIND.target?1:0;
const topology=()=>{
 // Start has two equal-length continuations, each leading toward a goal.
 // A: 1 valid / 2 observed transitions; B: 3 valid / 4.
 const kinds=[KIND.self,KIND.floor,KIND.floor,KIND.floor,KIND.floor,
              KIND.floor,KIND.floor,KIND.floor,KIND.floor,KIND.target];
 const neighbors=[
  [{to:1,action:"A",support:1},{to:2,action:"B",support:1}],
  [{to:3,action:"A1"},{to:4,action:"dead"}],
  [{to:5,action:"B1"},{to:6,action:"B2"},{to:7,action:"B3"},{to:8,action:"dead"}],
  [{to:9,action:"finish"}],[],[{to:9,action:"finish"}],
  [{to:9,action:"finish"}],[{to:9,action:"finish"}],[],[]
 ];
 return {kinds,neighbors,start:0,conduct,attract};
};

test("V17 exact propagation remains identical; successor affects only an exact tie",()=>{
 const G=topology();
 const original=shapeOnLearnedTopology(G);
 const sr=successorGoalField(G);
 const hybrid=shapeOnLearnedTopology({...G,tieBreakValues:sr.values});
 assert.deepEqual(hybrid.values,original.values);
 assert.equal(original.path[0].action,"A");
 assert.equal(hybrid.path[0].action,"B");
 assert.equal(original.successorTieBreaks,0);
 assert.equal(hybrid.successorTieBreaks,1);
 assert.equal(sr.values[1],.405);
 assert.equal(sr.values[2],.6075);
 const local=selectUphillEdge(G.neighbors[0],0,original.values,new Set([0]),sr.values);
 assert.equal(local.index,1);
 assert.equal(local.usedSuccessor,true);
});
test("Observed counts change successor evidence, never the original attraction field",()=>{
 const G=topology(),original=shapeOnLearnedTopology(G);
 const before=successorGoalField(G);
 // Five independent successful completed observations of A1.
 G.neighbors[1][0].support=5;
 const after=successorGoalField(G);
 assert.ok(after.values[1]>before.values[1]);
 assert.deepEqual(shapeOnLearnedTopology(G).values,original.values);
});
test("No goal, no possible target discovery; no phantom route",()=>{
 const G=topology();G.kinds[9]=KIND.floor;
 const sr=successorGoalField(G),shape=shapeOnLearnedTopology({...G,tieBreakValues:sr.values});
 assert.deepEqual(sr.values,new Array(G.kinds.length).fill(0));
 assert.equal(shape.path,null);
});
test("Cycle is bounded and field converges with discount, with no leaked answer",()=>{
 const G={kinds:[KIND.self,KIND.floor,KIND.target],
  neighbors:[[{to:1}],[{to:0},{to:2}],[]],start:0,conduct,attract};
 const sr=successorGoalField(G);
 assert.ok(sr.converged);
 assert.ok(sr.values[0]>0&&sr.values[0]<1);
 assert.ok(sr.values[1]>sr.values[0]);
});
test("Real LanguageMazeMemory preserves old results and frozen sidecar for original and hybrid",()=>{
 const m=new LanguageMazeMemory();
 m.learn("Which gate is open?","East");
 m.learn("Which gate is open?","West");
 m.learn("Which gate is open?","East");
 const saved=JSON.stringify(m.export());
 const baseline=m.plan("Which gate is open?",{mode:"original"});
 const enhanced=m.plan("Which gate is open?",{mode:"hybrid"});
 assert.equal(baseline.protocol,"ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS");
 assert.equal(baseline.successor.enabled,false);
 assert.equal(enhanced.successor.enabled,true);
 assert.equal(enhanced.solvedKnownGoal,true);
 assert.equal(enhanced.graph.nodes.length,baseline.graph.nodes.length);
 assert.equal(enhanced.field[0],baseline.field[0]);
 assert.ok(enhanced.graph.nodes.some(x=>x.successorOccupancy!==null));
 assert.equal(enhanced.localAgreementRate,1);
 assert.equal(enhanced.successor.globalTieBreaks,enhanced.successor.localTieBreaks);
 assert.equal(JSON.stringify(m.export()),saved,"no training on frozen questions");
 assert.equal(m.plan("Unknown word without a trained route").abstained,true);
 const restored=LanguageMazeMemory.restore(JSON.parse(saved));
 assert.equal(restored.plan("Which gate is open?",{mode:"original"}).output,baseline.output);
 assert.throws(()=>m.plan("Which gate is open?",{mode:"oracle"}),/Unknown language planning mode/);
});
test("One uniquely observed corridor remains strictly original and no synthetic strengthening",()=>{
 const m=new LanguageMazeMemory();
 m.learn("Portal: abc","cba");
 m.learn("Portal: def","fed");
 const o=m.plan("Portal: ghi",{mode:"original"});
 const h=m.plan("Portal: ghi",{mode:"hybrid"});
 assert.equal(o.output,"ihg");
 assert.equal(h.output,o.output);
 assert.equal(h.initialShape.join(""),o.initialShape.join(""));
 assert.equal(h.field[0],o.field[0]);
});
