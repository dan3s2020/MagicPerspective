import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {Discoverer as V17, playExercise as liveMaze, makeMaze, seedOf, SEEDS} from "../transcend/torus-aether/worlds/exercise.mjs";
import {Discoverer as OriginalV17, playExercise as originalLiveMaze} from "../transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs";
import {LearnedCognitiveMap,tokenizeWorld} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

const here=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
test("the FULL ORIGINAL V17 exercise.mjs is preserved byte-for-byte and only shape method is lifted",()=>{
 const old=readFileSync(path.join(here,"transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs"));
 const sha=createHash("sha1").update("blob "+old.length+"\0").update(old).digest("hex");
 assert.equal(sha,"e34d787467b7238c7422a0509173b1f785eb2342",
   "Original V17 source bytes must never be changed or shortened");
 const current=readFileSync(path.join(here,"transcend/torus-aether/worlds/exercise.mjs"),"utf8");
 const original=old.toString("utf8");
 const first="  shape(ret, n, me) {",last="  // ---- choosing what to emit ----";
 assert.equal(current.slice(0,current.indexOf("  // V22: the SAME original V17 solution-shape operator.")),
   original.slice(0,original.indexOf(first)),"No original maze/actor source before shape is rewritten");
 assert.equal(current.slice(current.indexOf(last)),original.slice(original.indexOf(last)),
   "No original maze/actor source after shape is rewritten");
});
test("original V17 2D exercise: exact same full paths, pre-action shapes, actions, learned memories and RNG with and without noise",()=>{
 let episodes=0;
 for (const temp of [0,0.45]) for(const noise of [0,0.18]){
  const original=new OriginalV17(20261107),lifted=new V17(20261107);
  original.temp=lifted.temp=temp;original.noise=lifted.noise=noise;
  for(let size of [7,9,11]) for(let i=0;i<7;i++){
   const world=makeMaze(seedOf(SEEDS.train,20000+size*100+i),size);
   const a=originalLiveMaze(world,original,()=>{}, {record:true});
   const b=liveMaze(world,lifted,()=>{}, {record:true});
   assert.deepEqual(b,a,"Maze world behavior changed for temp="+temp+", noise="+noise+", seed="+world.seed);
   assert.deepEqual(lifted.tries,original.tries);
   assert.deepEqual(lifted.pass,original.pass);
   assert.deepEqual(lifted.block,original.block);
   assert.deepEqual(lifted.enter,original.enter);
   assert.deepEqual(lifted.endIn,original.endIn);
   assert.deepEqual(lifted.trust,original.trust);
   assert.deepEqual(lifted.disp,original.disp);
   assert.equal(lifted.r.s,original.r.s);
   episodes++;
  }
 }
 assert.equal(episodes,84);
 console.log("V22_ORIGINAL_MAZE_PARITY",JSON.stringify({episodes,temperatures:[0,.45],noise:[0,.18],byteIdenticalBehavior:true}));
});
const learned=()=>{
 const m=new LearnedCognitiveMap();
 for(const observed of ["She is happy.","She is tired.","He is tired.","He is calm."])
  m.observeWorld(observed);
 return m;
};
const goal={slots:{0:"She",2:"calm"}};
test("V22 text world calls the ACTUAL original Discoverer.shape over learned action edges, frozen before ANY act",()=>{
 const m=learned(),pre=JSON.stringify(m.export());
 assert.equal(m.examples.has(tokenizeWorld("She is calm.").join("\u001f")),false,
   "Hidden answer must never have been observed");
 const plan=m.formSolution("He is calm.",goal);
 assert.equal(plan.directOriginalMethod,"Discoverer.shape");
 assert.equal(plan.field.originalMethod,"Discoverer.shape");
 assert.equal(plan.field.propagation,"DIRECT_ORIGINAL_DISCOVERER_SHAPE");
 assert.equal(plan.planningLaw,"ORIGINAL_V17_ATTRACTION_0.97");
 assert.equal(plan.plannedBeforeAction,true);
 assert.equal(plan.found,true);
 assert.equal(plan.novelGoal,true);
 assert.equal(plan.path.length,1);
 assert.equal(plan.world.states[plan.path[0].to].join(" "),"She is calm .");
 assert.deepEqual(plan.field.nodes,[0,plan.path[0].to]);
 assert.equal(JSON.stringify(m.export()),pre,"Frozen shape is computed without training or target leakage");
 assert.ok(plan.field.values[0]>0);
 console.log("V22_DIRECT_TEXT_DISCOVERER",JSON.stringify({
  method:plan.directOriginalMethod,learnedRules:plan.learnedRules,
  novelGoal:plan.novelGoal,shapeBeforeAct:plan.path.map(x=>x.action),
  derivedAnswer:plan.world.states[plan.path.at(-1).to].join(" "),
  fullAnswerAccuracy:1
 }));
});
test("actual independent text-world action physics checks the predicted answer; no use of predicted token as its own oracle",()=>{
 const m=learned(),p=m.formSolution("He is calm.",goal);
 let calls=0;
 const actualWorld=(state,action)=>{
  calls++;
  const edit=JSON.parse(action);
  if(!Array.isArray(edit)||edit.length!==3||state[edit[0]]!==edit[1])
   return {accepted:false,after:state};
  const real=state.slice();real[edit[0]]=edit[2];
  return {accepted:true,after:real}; // independent observed text-edit physics
 };
 const result=m.execute(p,{step:actualWorld});
 assert.equal(calls,1);assert.equal(result.solved,true);
 assert.equal(result.predictionAccuracy,1);
 assert.equal(result.final.join(" "),"She is calm .");
 assert.equal(result.goalMet,true);
 assert.equal(m.report().realObservedActions,1);
});
test("unknown semantic target and ablated learned actions MUST abstain; 0% is not a perfect unseen solution",()=>{
 const m=learned();
 assert.equal(m.formSolution("He is calm.",{slots:{2:"never-seen"}}).found,false);
 assert.throws(()=>m.formSolution("He is calm.",{}),/constraints/);
 m.rules.clear();
 assert.equal(m.formSolution("He is calm.",goal).found,false);
});
test("longer unobserved text state preserves all unchanged bytes and predicts an action, not hidden answer characters",()=>{
 const m=new LearnedCognitiveMap();
 const common=Array.from({length:75},(_,i)=>"segment"+i);
 m.observeSentence(["Alice",...common]);
 m.observeSentence(["Bob",...common]);
 const novel=["Bob",...common.slice(0,-1),"never_seen_tail"];
 const goal={slots:{0:"Alice"}};
 assert.equal(m.examples.has(["Alice",...common.slice(0,-1),"never_seen_tail"].join("\u001f")),false);
 const plan=m.formSolution(novel,goal);
 assert.equal(plan.found,true);
 assert.equal(plan.directOriginalMethod,"Discoverer.shape");
 assert.equal(plan.world.states[plan.path.at(-1).to].length,76);
 assert.deepEqual(plan.world.states[plan.path.at(-1).to],["Alice",...novel.slice(1)]);
 const r=m.execute(plan,{observe:false,step:(before,action)=>{
  const edit=JSON.parse(action),out=before.slice();
  if(edit[0]!==0||edit[1]!=="Bob"||edit[2]!=="Alice")return {after:before,accepted:false};
  out[0]="Alice";return {after:out,accepted:true};
 }});
 assert.equal(r.solved,true);
 assert.equal(r.final.length,76);
});
