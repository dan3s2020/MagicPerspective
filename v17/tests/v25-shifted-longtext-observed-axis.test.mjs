import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {ObservedAxisCognitiveWorld} from "../research/text-hypermaze/v25-observed-axis-world.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {Discoverer as OriginalDiscoverer,KIND} from "../transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs";
import {Discoverer as CurrentDiscoverer} from "../transcend/torus-aether/worlds/exercise.mjs";

// The source document is ACTUAL prose from this repository, not invented
// repeated "filler" bytes. The six marked textual facts/operators and goal
// constraints ARE a controlled synthetic editing task embedded in that prose.
// This is explicitly NOT unrestricted question answering or semantic reasoning.
const source=fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md",import.meta.url),"utf8");
const words=source.match(/[\p{L}\p{N}_-]+/gu)||[];
assert.ok(words.length>=8200);
const sha256=createHash("sha256").update(source).digest("hex");
const TRAIN=words.slice(0,2048),HELD=words.slice(4200,8200);
const POS=[7,118,270,390,589,811];
const FROM=Array.from({length:6},(_,i)=>"tag_before_axis_"+i);
const TO=Array.from({length:6},(_,i)=>"tag_after_axis_"+i);
const ACTION=i=>"unknown_action_"+i;
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);

function learn(){
 const world=new ObservedAxisCognitiveWorld({maxStates:128,maxStateTokens:4096});
 const baseline=new LearnedCognitiveMap({maxStateTokens:4096,maxNodes:128,maxDepth:10});
 const initial=TRAIN.slice();
 POS.forEach((at,i)=>initial[at]=FROM[i]);
 for(let i=0;i<6;i++){
   const after=initial.slice();after[POS[i]]=TO[i];
   const observation={before:initial,action:ACTION(i),after,accepted:true};
   assert.equal(world.observeActionResult(observation).learned,true);
   assert.equal(baseline.observeActionResult(observation).learned,true);
 }
 assert.equal(world.actions.size,6);
 assert.equal(baseline.examples.size,0);
 return {world,baseline};
}
function caseAt(seed){
 const count=[1024,1536,2048][seed%3];
 const start=Array.from({length:count},(_,i)=>HELD[(i+seed*31)%HELD.length]);
 const shift=(seed*19)%65,positions=POS.map(x=>x+shift);
 positions.forEach((at,i)=>start[at]=FROM[i]);
 const needed=FROM.map((_,i)=>i).filter(i=>(seed*31+i*13)%11<8);
 if(!needed.length)needed.push(seed%6);
 const requires=needed.map(i=>TO[i]);
 const goal={requires},baselineGoal={slots:Object.fromEntries(needed.map(i=>[positions[i],TO[i]]))};
 return {start,positions,needed,goal,baselineGoal,length:count,shift};
}
// Independent environment: NOT an invocation of world.predictEffect().
// It applies the genuine physical action labels and token replacements.
function physics(state,action){
 const i=Number(String(action).split("_").at(-1));
 if(!Number.isInteger(i)||i<0||i>=6||ACTION(i)!==action)return {after:state,accepted:false};
 const j=state.indexOf(FROM[i]);
 if(j<0||j!==state.lastIndexOf(FROM[i]))return {after:state,accepted:false};
 const next=state.slice();next[j]=TO[i];return {after:next,accepted:true};
}
function wrongPhysics(state,action){
 const i=Number(String(action).split("_").at(-1));
 if(!Number.isInteger(i)||i<0||i>=6)return {after:state,accepted:false};
 return physics(state,ACTION((i+1)%6));
}

test("V25: 120 shifted long-text worlds, causal learned axis physics, COMPLETE native preaction solution shape",()=>{
 const {world,baseline}=learn();
 let exactShapes=0,exactExecuted=0,frozenPlans=0,baselinePaths=0,correctSteps=0,steps=0;
 let maximalStates=0,shifted=0;
 const sample=[];
 for(let seed=0;seed<120;seed++){
  const task=caseAt(seed);
  const frozen=JSON.stringify(world.export());
  const plan=world.formSolution(task.start,task.goal,{
    seed:74129+seed*7919,temperature:seed%4===0?.7:0});
  assert.equal(JSON.stringify(world.export()),frozen,"Planning must NEVER train");
  frozenPlans++;
  assert.equal(plan.directOriginalMethod,"Discoverer.shape");
  assert.equal(plan.plannedBeforeAction,true);
  assert.equal(plan.found,true,JSON.stringify({seed,reason:plan.reason}));
  assert.equal(plan.path.length,task.needed.length);
  assert.ok(plan.field[0]>0,"Attraction must propagate back to start");
  maximalStates=Math.max(maximalStates,plan.world.states.length);
  shifted+=Number(task.shift>0);
  // Create the complete withheld reference AFTER the initial shape is frozen.
  const expected=task.start.slice();
  for(const i of task.needed)expected[task.positions[i]]=TO[i];
  const initialExact=equal(plan.predictedCompleteOutput,expected);
  exactShapes+=Number(initialExact);
  assert.equal(initialExact,true,"Whole predicted output differs from reference");
  const actual=world.execute(plan,physics,{learnFeedback:false});
  exactExecuted+=Number(actual.solved&&equal(actual.final,expected));
  correctSteps+=actual.trace.filter(e=>e.predictionCorrect).length;
  steps+=actual.trace.length;
  const old=baseline.formSolution(task.start,task.baselineGoal,{maxNodes:128,maxDepth:10});
  baselinePaths+=Number(old.found);
  if(seed<4)sample.push({seed,words:task.length,shift:task.shift,
    axes:task.needed.length,steps:plan.path.length,fieldAtStart:plan.field[0],
    exact:initialExact,baselineFound:old.found});
 }
 const results={name:"V25_UNSEEN_SHIFTED_LONG_TEXT_MULTI_AXIS",
  corpus:"v17/docs/TORUS_AETHER_ABC_20261104.md",sha256,
  trainedInterventions:6,trainSourceWordRange:[0,2048],
  heldoutSourceWordRange:[4200,8200],
  unseenTextTasks:120,tokenLengths:[1024,1536,2048],
  heldoutTasksWithChangedActionCoordinates:shifted,
  axes:6,maxGraphStates:maximalStates,
  frozenPlans,exactInitialCompleteShapes:exactShapes,
  exactExecutedFullAnswers:exactExecuted,
  correctActions:correctSteps,executedActions:steps,
  originalAbsoluteSlotBaselinePlans:baselinePaths,
  initialShapeRate:exactShapes/120,
  originalBaselineRate:baselinePaths/120,
  goalVisibility:"required output tokens, not complete answer",
  semanticQA:false,openThoughtsTest:false,originalUIPatched:false,
  examples:sample};
 console.log(JSON.stringify(results));
 assert.ok(results.initialShapeRate>=.70);
 assert.ok(results.originalBaselineRate<results.initialShapeRate);
 assert.equal(exactExecuted,120);
});

test("V25: no learned action, missing operator, wrong causal physics and ambiguous sources fail closed",()=>{
 const {world}=learn();
 const none=new ObservedAxisCognitiveWorld();
 const missing=ObservedAxisCognitiveWorld.restore(world.export());
 missing.actions.delete(ACTION(0));
 let noTrainingFound=0,missingFound=0,scrambledExact=0;
 for(let seed=0;seed<60;seed++){
  const task=caseAt(seed);
  noTrainingFound+=Number(none.formSolution(task.start,task.goal).found);
  missingFound+=Number(missing.formSolution(task.start,{requires:[TO[0]]}).found);
  const p=world.formSolution(task.start,task.goal);
  assert.equal(p.found,true);
  const execution=world.execute(p,wrongPhysics,{learnFeedback:false});
  scrambledExact+=Number(execution.solved&&
    ObservedAxisCognitiveWorld.satisfied(execution.final,task.goal));
 }
 const repeated=caseAt(5);
 repeated.start[repeated.positions[0]+2]=FROM[0]; // Two indistinguishable source tokens.
 const ambiguous=world.formSolution(repeated.start,{requires:[TO[0]]});
 const impossible=world.formSolution(caseAt(7).start,{requires:["unobserved_target"]});
 const restored=ObservedAxisCognitiveWorld.restore(world.export());
 const before=caseAt(17),a=world.formSolution(before.start,before.goal,{seed:2026,temperature:.7});
 const b=restored.formSolution(before.start,before.goal,{seed:2026,temperature:.7});
 const results={name:"V25_FAILURE_CONTROLS",tests:60,
  noTrainingFound,missingActionFound:missingFound,
  scrambledPhysicsExact:scrambledExact,
  ambiguousSourceAbstains:!ambiguous.found,
  unknownGoalAbstains:!impossible.found,
  checkpointRestoresSameFrozenShape:JSON.stringify(a.path)===JSON.stringify(b.path)};
 console.log(JSON.stringify(results));
 assert.equal(noTrainingFound,0);
 assert.equal(missingFound,0);
 assert.equal(scrambledExact,0);
 assert.equal(ambiguous.found,false);
 assert.equal(impossible.found,false);
 assert.deepEqual(a.path,b.path);
});

test("V25: unchanged ORIGINAL 2D Discoverer shape, 84 varied mazes with and without noise",()=>{
 let parity=0;
 for(let seed=1;seed<=84;seed++){
  const n=7+2*(seed%3),retina=Array(n*n).fill(KIND.floor);
  for(let j=1;j<n*n-1;j++)if((j*131+seed*17)%19<4)retina[j]=KIND.wall;
  retina[0]=KIND.self;retina[n*n-1]=KIND.target;
  const original=new OriginalDiscoverer(seed),current=new CurrentDiscoverer(seed);
  for(const x of [original,current]){
   x.pass=[18,1,19,9];x.block=[2,80,1,4];
   x.enter=[1,1,10,1];x.endIn=[0,0,9,0];x.temp=seed%2?.7:0;
  }
  assert.deepEqual(current.shape(retina,n,0),original.shape(retina,n,0));
  parity++;
 }
 console.log(JSON.stringify({name:"V25_ORIGINAL_2D_PARITY",boards:parity,noiseCases:42}));
 assert.equal(parity,84);
});
