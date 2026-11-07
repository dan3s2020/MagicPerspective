import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {MAZE_SYMBOLS} from "../transcend/torus-aether/worlds/maze.mjs";

test("original Brain really lives 12000 input chars, plays 3 mazes, saves/replays and freezes unseen tests",{
 timeout:90000},()=>{
 const docs=fs.readFileSync("docs/ARCHITECTURE.md","utf8");
 assert.ok(docs.length>100);
 // Unlike the older torus-brain.test.mjs, do NOT assume a short 4097-byte
 // docs file magically expands to 12000 chars after text.slice(0,12000).
 const trainText=docs.repeat(Math.ceil(12000/docs.length)).slice(0,12000);
 const heldText=(docs.repeat(2)).slice(500,1500);
 const A=Array.from(trainText,c=>Math.min(126,c.charCodeAt(0)));
 const H=Array.from(heldText,c=>Math.min(126,c.charCodeAt(0)));
 assert.equal(A.length,12000);
 const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
 const b=new Brain({rules,c:{margin:.05,window:400,many:12}});
 for(let i=0;i<A.length;i++){b.live(A[i]);if(i%4000===0)b.playMaze();}
 assert.equal(b.mazes.played,3);
 assert.ok(b.mazes.last.path.length>0);
 assert.ok([...b.trace.nodes.keys()].some(id=>MAZE_SYMBOLS.has(+id.slice(2))));
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"magic-original-regression-"));
 try{
  const file=path.join(dir,"brain.v8"),before=b.test(H);
  b.save(file);
  const saved=Brain.load(file);
  assert.deepEqual(saved.test(H),before);
  saved.live(65);saved.playMaze();
  assert.equal(saved.mazes.played,4);
  const frozen=saved.testMazes(6);
  assert.equal(frozen.n,6);
  assert.equal(saved.mazes.played,4);
  assert.equal(typeof saved.learnTextGPU,"function");
  assert.equal(typeof saved.predictTextWorldShape,"function");
  console.log("NATIVE_V17_FULL_12000_CHARS_3_MAZES_RESTORED",JSON.stringify({
   chars:12000,mazesPlayedBeforeCheckpoint:3,
   afterRestartAndNewMaze:4,frozenMazeTests:frozen.n}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
