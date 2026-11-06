import test from "node:test";
import assert from "node:assert/strict";
import {Discoverer,KIND} from "../worlds/exercise.mjs";
import {makeMaze} from "../worlds/labyrinth.mjs";
import {LanguageMazeMemory} from "./language-world.mjs";
import {originalShapeAsTopology,shapeOnLearnedTopology} from "./shape-topology.mjs";

// The essential "same mechanism" proof: exact ORIGINAL V17 method on 2D mazes.
test("graph lift equals unchanged original Discoverer.shape on 88 unseen 2D configurations",()=>{
 for(const n of [5,7,9,11])for(let seed=1;seed<=22;seed++){
  const w=makeMaze(17000+seed*147+n,n),ret=Array.from(w.wall,x=>x?KIND.wall:KIND.floor);
  ret[w.goal]=KIND.target;ret[w.start]=KIND.self;
  const D=new Discoverer(seed);D.temp=0;
  D.pass[KIND.floor]=500;D.block[KIND.wall]=500;
  D.endIn[KIND.target]=40;D.enter[KIND.target]=42;
  const native=D.shape(ret,n,w.start);
  const lifted=originalShapeAsTopology(D,ret,n,w.start);
  assert.deepEqual(lifted,native,"same law diverged at "+n+"x"+n+" seed "+seed);
 }
});
test("actual observations create nested character-submaze world and a complete pre-action shape",()=>{
 const m=new LanguageMazeMemory();
 assert.equal(m.plan("where is ruby key?").abstained,true);
 for(const [q,a]of [
  ["Where is the ruby key?","Under the oak."],
  ["Find the ruby key location.","Under the oak."],
  ["Where is the silver ring?","Near the lake."]
 ])assert.equal(m.learn(q,a).learned,true);
 const before=JSON.stringify(m.export());
 const result=m.plan("ruby key location?");
 assert.equal(result.protocol,"ONE_MAZE_LAW_OVER_OBSERVED_TEXT_TRANSITIONS");
 assert.equal(result.output,"Under the oak.");
 assert.equal(result.solvedKnownGoal,true);
 assert.equal(result.initialShape.length,[..."Under the oak."].length);
 assert.equal(result.trace.length,[..."Under the oak."].length);
 assert.equal(result.trace.at(-1).localRemaining,0);
 assert.ok(result.field[0]>0,"goal field must reach input position BEFORE output");
 assert.ok(result.graph.nodes.some(x=>x.kind===KIND.target));
 assert.ok(result.graph.edges.length>=result.output.length);
 assert.equal(JSON.stringify(m.export()),before,"inference never trains or reads heldout answer");
});
test("unknown question abstains instead of pretending it knows a target",()=>{
 const m=new LanguageMazeMemory();
 m.learn("Where is the ruby key?","Under the oak.");
 assert.equal(m.plan("What is the emerald dragon?").abstained,true);
 assert.equal(m.plan("What is the emerald dragon?").output,"");
});
test("frozen heldout answer is read strictly after output planning",()=>{
 const m=new LanguageMazeMemory();
 m.learn("Where is the ruby key?","Under the oak.");
 m.learn("Find the ruby key location.","Under the oak.");
 const old=JSON.stringify(m.export());
 const cases=m.frozenCompare([
  {prompt:"ruby key location?",answer:"Under the oak."},
  {prompt:"What is the emerald dragon?",answer:"Not in this world"}
 ]);
 assert.equal(cases.cases.length,2);
 assert.equal(cases.cases[0].equal,true);
 assert.equal(cases.cases[1].hasKnownPath,false);
 assert.equal(cases.abstained,1);
 assert.equal(cases.exactRate,.5);
 assert.equal(JSON.stringify(m.export()),old,"evaluation must not learn heldout answer");
});
test("Unicode characters create actual codepoint portals rather than ASCII placeholders",()=>{
 const m=new LanguageMazeMemory();
 m.learn("Unde este cheia roșie?","În pădure 🗝️.");
 const result=m.plan("Unde este cheia roșie?");
 assert.equal(result.output,"În pădure 🗝️.");
 assert.equal(result.steps,[..."În pădure 🗝️."].length);
 assert.equal(result.trace.length,result.steps);
});
test("JSON sidecar roundtrip preserves observed graph without touching V17 Brain",()=>{
 const m=new LanguageMazeMemory({maxRecords:5,maxCandidates:3,maxGraphNodes:100});
 for(const [q,a]of [
  ["ruby key place","Under oak"],["ruby key map","Under oak"],
  ["silver ring place","Near lake"],["silver ring map","Near lake"],
  ["copper map place","On hill"]
 ])m.learn(q,a);
 const before=m.plan("ruby key map");
 const restored=LanguageMazeMemory.restore(JSON.parse(JSON.stringify(m.export())));
 const after=restored.plan("ruby key map");
 assert.deepEqual(after.initialShape,before.initialShape);
 assert.equal(restored.stats().rowsSeen,5);
 assert.deepEqual(restored.export(),m.export());
 assert.throws(()=>LanguageMazeMemory.restore({version:6}),/Invalid/);
});
test("same original propagation respects learned wall resistance and missing routes",()=>{
 const kinds=[KIND.self,KIND.floor,KIND.wall,KIND.target];
 const neighbors=[[{to:1,character:"x"},{to:2,character:"y"}],
  [{to:3,character:"z"}],[{to:3,character:"!"}],[]];
 const law={conduct:k=>k===KIND.wall?.01:1,attract:k=>k===KIND.target?1:0};
 const value=shapeOnLearnedTopology({kinds,neighbors,start:0,...law});
 assert.deepEqual(value.path.map(e=>e.character),["x","z"]);
 assert.equal(value.nodes.at(-1),3);
 const missing=shapeOnLearnedTopology({kinds:[KIND.self,KIND.floor],neighbors:[[],[]],start:0,...law});
 assert.equal(missing.path,null);
});
