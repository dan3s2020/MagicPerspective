import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {makeMaze,seedOf,SEEDS} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {playExercise,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {NativeCrossEpisodeTransfer} from "../research/text-hypermaze/cross-episode-native.mjs";

const rules={depth:1,off:["R2","R4"],budEvery:100,
 empty:true,maxWires:32,fold:false};
function liveBrain(){
 const brain=new Brain({rules,seed:11});
 for(let i=0;i<240;i++){
  const world=makeMaze(seedOf(SEEDS.train,500+i*23),[7,9,11][i%3]);
  playExercise(world,brain.disc);
  if(i>=24&&brain.disc.attract(KIND.target)>.2&&
   brain.disc.conduct(KIND.floor)>=.5&&brain.disc.self()>=0)break;
 }
 assert.ok(brain.disc.attract(KIND.target)>.2,"Must learn goal attraction from real 2D mazes");
 assert.ok(brain.disc.conduct(KIND.floor)>=.5,"Must learn floor conductance");
 assert.equal(typeof brain.disc.shapeGraph,"function");
 return brain;
}
function witnesses(w){
 for(const [episodeId,action,before,after] of [
 ["world-A-fruit","increase-two","Mira has 3 apples.","Mira has 5 apples."],
 ["world-B-books","increase-two","Toma has 8 books.","Toma has 10 books."],
 ["world-C-coins","decrease-one","Zara has 6 coins.","Zara has 5 coins."],
 ["world-D-shells","decrease-one","Leo has 15 shells.","Leo has 14 shells."]]){
  assert.ok(w.observe({episodeId,action,before,after}).learned);
 }
}
function realPhysics({text,action}){
 const delta=action.name==="increase-two"?2:
  action.name==="decrease-one"?-1:NaN;
 assert.ok(Number.isInteger(delta),"No imagined action allowed by independent physics");
 const match=text.match(/\bhas ([0-9]+)\b/);
 if(!match)throw Error("Actual world cannot apply the requested action");
 return text.replace(/\bhas [0-9]+\b/,"has "+(Number(match[1])+delta));
}
test("V30 native original 2D Discovery learns a transfer rule from different worlds, and shapes unseen third world BEFORE movement",()=>{
 const b=liveBrain(),w=new NativeCrossEpisodeTransfer(b);
 assert.equal(w.summary().reusableActions,0);
 const first=w.observe({episodeId:"only-once",action:"increase-two",
  before:"Example has 3 stones.",after:"Example has 5 stones."});
 assert.equal(first.ready,false);
 const rejected=w.plan({startText:"Ava has 17 marbles.",
  goal:{numericEquals:21}});
 assert.equal(rejected.found,false);
 assert.equal(rejected.reason,"NO_ACTION_WITNESSED_IN_MULTIPLE_INDEPENDENT_WORLDS");
 witnesses(w);
 const before=JSON.stringify(w.summary());
 const plan=w.plan({startText:"Ava has 17 marbles.",goal:{numericEquals:21}});
 assert.equal(plan.found,true,JSON.stringify(plan).slice(0,1200));
 assert.equal(plan.plannedBeforeFirstAction,true);
 assert.equal(plan.referenceAnswerProvided,false);
 assert.equal(plan.algorithm,"SAME original Discoverer.shapeGraph");
 assert.equal(plan.predicted,"Ava has 21 marbles.");
 assert.deepEqual(plan.initialShape,["Ava has 17 marbles.",
   "Ava has 19 marbles.","Ava has 21 marbles."]);
 assert.equal(plan.actions.length,2);
 assert.ok(plan.actions.every(a=>a.trainingWorldCount>=2));
 assert.ok(plan.graph.edges.some(e=>e.action.name==="decrease-one"));
 assert.ok(plan.graph.originalV17AttractionField.length===plan.graph.states);
 assert.ok(plan.graph.edges.every(e=>e.verifiedInCurrentWorld===false));
 assert.equal(JSON.stringify(w.summary()),before,"Frozen planning must not train");
 const result=w.execute(plan,realPhysics);
 assert.equal(result.completeExact,true);
 assert.equal(result.actualFinal,"Ava has 21 marbles.");
 assert.equal(result.correctTransitions,2);
 assert.equal(JSON.stringify(w.summary()),before,"Frozen execution must not train");
 console.log("V30_NATIVE_SAME_BRAIN_FIRST_SHAPE",JSON.stringify({
  sourceWorlds:4,heldoutWorld:"Ava / marbles",
  observedRules:2,prediction:plan.predicted,
  firstShapeSteps:plan.actions.length,independentlyValid:true,
  original5D:plan.graph.originalV17GeometryDimensions,semanticsNotClaimed:true
 }));
});
test("V30 60 unseen compositional maze worlds all reuse rules observed elsewhere without training on test",()=>{
 const w=new NativeCrossEpisodeTransfer(liveBrain());
 witnesses(w);
 let correct=0,physicallyVerified=0,expanded=0;
 for(let i=0;i<60;i++){
  const starting=101+i,startText="Explorer"+i+" has "+starting+" tokens.";
  const p=w.plan({startText,goal:{numericEquals:starting+4}});
  assert.ok(p.found,"Frozen world "+i+" failed: "+p.reason);
  const v=w.execute(p,realPhysics);
  correct+=Number(v.completeExact);
  physicallyVerified+=v.correctTransitions;
  expanded+=p.graph.states;
  assert.equal(v.actualFinal,"Explorer"+i+" has "+(starting+4)+" tokens.");
 }
 assert.equal(correct,60);
 assert.equal(physicallyVerified,120);
 assert.equal(w.summary().observations,4);
 console.log("V30_CROSS_WORLD_HELDOUT",JSON.stringify({complete:correct,
  count:60,independentSteps:physicallyVerified,meanGraphStates:expanded/60,
  learnedOnlyFourWitnesses:true,questionAnsweringNotMeasured:true}));
});
test("V30 word replacement is reused across distinct worlds",()=>{
 const w=new NativeCrossEpisodeTransfer(liveBrain());
 w.observe({episodeId:"atmosphere",action:"heat",
   before:"The atmosphere is cold.",after:"The atmosphere is warm."});
 w.observe({episodeId:"metal",action:"heat",
   before:"The metal feels cold.",after:"The metal feels warm."});
 const p=w.plan({startText:"The distant star feels cold.",
   goal:{containsToken:"warm"}});
 assert.ok(p.found);
 assert.equal(p.predicted,"The distant star feels warm.");
 assert.equal(w.execute(p,({text})=>text.replace("cold","warm")).completeExact,true);
});
test("V30 wrong or conflicted rules abstain rather than hallucinating physically unsupported paths",()=>{
 const w=new NativeCrossEpisodeTransfer(liveBrain());
 w.observe({episodeId:"a",action:"increase-two",
   before:"A has 3 coins.",after:"A has 5 coins."});
 w.observe({episodeId:"b",action:"increase-two",
   before:"B has 7 coins.",after:"B has 9 coins."});
 w.observe({episodeId:"c",action:"increase-two",
   before:"C has 4 coins.",after:"C has 7 coins."});
 assert.equal(w.summary().conflicts,1);
 assert.equal(w.summary().reusableActions,0);
 assert.equal(w.plan({startText:"D has 1 coins.",goal:{numericEquals:5}}).found,false);
});
test("V30 same native original Brain keeps learned cross-world memory after .v8 checkpoint save/load",()=>{
 const b=liveBrain(),w=new NativeCrossEpisodeTransfer(b);
 witnesses(w);
 const file=path.join(fs.mkdtempSync(path.join(os.tmpdir(),"mp-v30-")),"checkpoint.v8");
 try{
  b.save(file);
  const loaded=Brain.load(file),restored=new NativeCrossEpisodeTransfer(loaded);
  assert.equal(restored.summary().reusableActions,2);
  const p=restored.plan({startText:"Val has 20 boxes.",
   goal:{numericEquals:24}});
  assert.equal(p.found,true);
  assert.ok(restored.execute(p,realPhysics).completeExact);
 }finally{fs.rmSync(path.dirname(file),{recursive:true,force:true});}
});
