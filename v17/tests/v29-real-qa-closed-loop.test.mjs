import test from "node:test";
import assert from "node:assert/strict";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {NativeGoalTextMaze} from "../research/text-hypermaze/goal-conditioned-native.mjs";
import {qaPairsFromRealJSON} from "../research/text-hypermaze/openthoughts-jsonl-source.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,empty:true,maxWires:32,fold:false};
function native(){const brain=new Brain({rules,seed:11});for(let i=0;i<145;i++){
 const w=makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]);
 playExercise(w,brain.disc);
 if(i>=24&&brain.disc.attract(KIND.target)>.2&&brain.disc.conduct(KIND.floor)>=.5)break;
 }assert.ok(brain.disc.attract(KIND.target)>.2);
 return new NativeGoalTextMaze(brain,{maxStates:256,maxDepth:6});
}
const ask=(a,b)=>"Please place "+a+" then "+b+" into the final sequence.";
const answer=(a,b)=>"Final sequence: "+a+" "+b+".";
function learn(engine) {
 for(const [a,b] of [["opal","birch"],["jade","birch"],["opal","maple"],
  ["jade","maple"],["opal","cedar"],["amber","birch"]]) {
  engine.observeQA(ask(a,b),answer(a,b));
 }
}

test("real OpenThoughts roles are preserved as observed Q/A pairs, with no role guessing",()=>{
 const q="What changes after the second action?",a="The second action changes the result.";
 assert.deepEqual(qaPairsFromRealJSON({conversations:[
  {from:"human",value:q},{from:"gpt",value:a}]}),[{question:q,answer:a}]);
 assert.deepEqual(qaPairsFromRealJSON({messages:[
  {role:"user",content:[{type:"text",text:q}]},{role:"assistant",content:a}]}),
  [{question:q,answer:a}]);
 assert.deepEqual(qaPairsFromRealJSON({question:q,answer:a}),[{question:q,answer:a}]);
 assert.deepEqual(qaPairsFromRealJSON({messages:[
  {role:"assistant",content:a},{role:"user",content:q}]}),[],
  "No backward Q/A pairing or invented action order");
});

test("same original Brain learns two Q/A effect axes then predicts an unseen full answer BEFORE output, without the answer or its goal tokens",()=>{
 const e=native();learn(e);
 const q=ask("amber","maple"),expected=answer("amber","maple");
 const before=e.brain.qaRoleEvidence?.seen;
 assert.ok(before>=6);
 assert.equal(e.brain.qaRoleEvidence?.examples.some(x=>x.answer===expected),false,
  "Complete withheld answer must not be seen or stored");
 const p=e.planQA({question:q});
 assert.equal(p.goalSource,"learned-observed-question-answer-effects");
 assert.equal(p.originalPlanner,"Discoverer.shapeGraph");
 assert.equal(p.referenceAnswerProvided,false);
 assert.equal(p.plannedBeforeFirstAction,true);
 assert.equal(p.found,true,JSON.stringify(p).slice(0,1000));
 assert.equal(p.predicted,expected);
 assert.ok(p.actions.length>=2,"Must predict both independent language axes");
 assert.ok(p.values?.[0]>0,"Original goal attraction must reach initial answer state");
 assert.equal(e.brain.qaRoleEvidence.seen,before,"Heldout evaluation must never train");
 assert.equal(p.fullAnswerExactVerifiedExternally,false);
 const frame=e.executeQA(p);
 assert.equal(frame.actual,expected);
 assert.equal(frame.actions.length,p.actions.length);
 assert.equal(frame.actual===p.predicted,true);
 console.log("V29_NATIVE_QA_FULL_ANSWER_SHAPE",JSON.stringify({
  learnedQAPairs:before,firstTryFullAnswerExact:true,
  initialActionSteps:p.actions.length,originalPlanner:p.originalPlanner,
  neverObservedAnswer:true,goalAnswerNotSupplied:true,
  testCategory:"bounded compositional natural Q/A role transfer, NOT arbitrary OpenThoughts"
 }));
});

test("previously unseen words in learned free axes can combine; no exact answer memorization",()=>{
 const e=native();learn(e);
 const target=answer("violet","cedar"),p=e.planQA({question:ask("violet","cedar")});
 assert.equal(p.found,true,JSON.stringify(p).slice(0,600));
 assert.equal(p.predicted,target);
 assert.equal(e.brain.qaRoleEvidence.examples.some(x=>x.answer===target),false);
});

test("unsupported question grammar, contradictory training answers, or missing learned axis must be a wall",()=>{
 const e=native();learn(e);
 assert.equal(e.planQA({question:"An unrelated astronomy question without observed goal effects."}).found,false);
 e.observeQA(ask("opal","birch"),"Contradictory different answer.");
 assert.equal(e.planQA({question:ask("amber","maple")}).found,false,
  "Contradictory real observations must disable, not optimize away, action physics");
 const x=native();
 x.observeQA(ask("opal","birch"),answer("opal","birch"));
 assert.equal(x.planQA({question:ask("amber","maple")}).found,false);
});

test("same native Brain QA evidence survives original V8 checkpoint, with no extra fake learner",async()=>{
 const fs=await import("node:fs"),os=await import("node:os"),path=await import("node:path");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"mp-v29-realqa-"));
 const e=native();learn(e);
 const q=ask("amber","maple"),pre=e.planQA({question:q});
 try{
  const file=path.join(dir,"brain.v8");
  e.brain.save(file);
  const loaded=Brain.load(file);
  const resumed=new NativeGoalTextMaze(loaded,{maxStates:256,maxDepth:6});
  const post=resumed.planQA({question:q});
  assert.deepEqual(post.actions,pre.actions);
  assert.equal(post.predicted,pre.predicted);
  assert.equal(typeof loaded.learnTextGPU,"function");
  assert.equal(typeof loaded.disc.shapeGraph,"function");
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
