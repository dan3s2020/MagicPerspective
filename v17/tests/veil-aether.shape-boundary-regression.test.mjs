import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
const ascii=s=>Array.from(s,ch=>ch.charCodeAt(0));

test("200-character question truncated before A: is NOT 0%-correct answer generation",()=>{
 const brain=new Brain({rules,c:{margin:.05,window:400,many:12},seed:11});
 for(const ch of ascii("Q: State a color.\nA: blue\n\n".repeat(32)))brain.live(ch);
 const question="Q: "+("This task has a long question without the answer in the first two hundred characters. ".repeat(4)).slice(0,260);
 const full=ascii(question+"\nA: blue\n\n");
 const short=full.slice(0,200);
 assert.ok(!short.some((x,i)=>x===10&&short[i+1]===65&&short[i+2]===58));
 const truncated=brain.evalTextExercises([short],{T:0,noise:0,seed:74129}).exercises[0];
 assert.equal(truncated.n,200);
 assert.equal(truncated.answerBoundaryFound,false);
 assert.equal(truncated.invalidShapeReason,"NO_ANSWER_BOUNDARY_IN_EVALUATED_PREFIX");
 assert.equal(truncated.a0,-1);
 assert.equal(truncated.answer,null);
 assert.equal(truncated.shapeSame,null,"A missing answer cannot be scored as 0% incorrect");
 assert.equal(truncated.shape,null);
 const complete=brain.evalTextExercises([full],{T:0,noise:0,seed:74129}).exercises[0];
 assert.equal(complete.answerBoundaryFound,true);
 assert.ok(complete.a0>200);
 assert.ok(Number.isFinite(complete.shapeSame));
 assert.equal(typeof complete.shape,"string");
 console.log("V21_MISSING_A_BOUNDARY_NOT_FALSE_ZERO",JSON.stringify({
  evaluatedLength:short.length,correctlyUnscored:truncated.shapeSame,
  completeLength:full.length,completeBoundary:complete.a0,
  completeOpenLoopAccuracy:complete.shapeSame
 }));
});

test("native V17 writer method itself is unchanged; only scoring boundary is corrected",()=>{
 const brain=new Brain({rules,seed:12});
 for(const ch of ascii("Q: Say OK.\nA: OK\n\n".repeat(10)))brain.live(ch);
 const r=brain.evalTextExercises([ascii("Q: Say OK.\nA: OK\n\n")],{T:0,noise:0,seed:14}).exercises[0];
 assert.equal(r.answerBoundaryFound,true);
 assert.ok(r.a0>0);
 assert.ok(r.shape!==null);
 assert.ok(r.shapeSame>=0&&r.shapeSame<=1);
});
