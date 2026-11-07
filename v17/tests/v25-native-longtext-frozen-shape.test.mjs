import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

// Reproduce a frozen multi-action, long-DOCUMENT text-state benchmark with the
// ACTUAL native Discoverer.shape() as the field/planner. It is not a next-token
// metric, not OpenThoughts Q/A, and not a claim of general natural-language QA.
// For every test, entire source text is new to the learned action map, the
// correct complete output is constructed ONLY after the initial plan exists.
const CORPUS_FILE = new URL("../docs/TORUS_AETHER_ABC_20261104.md", import.meta.url);
const raw = fs.readFileSync(CORPUS_FILE, "utf8");
const words = raw.match(/[\\p{L}\\p{N}_\\-]+/gu) || [];
const SOURCE_SHA256 = createHash("sha256").update(raw).digest("hex");
assert.ok(words.length >= 8200, "Need 8,200 source words, or the frozen test is invalid");
const TRAIN = words.slice(0, 2048);
const HELD = words.slice(4200, 8200); // Disjoint, separated by a 2,152-word gap.
const AT = [17, 139, 301, 461, 701, 947]; // Independent state axes, scattered over long text.
const FROM = ["calm", "blue", "north", "open", "dry", "small"];
const TO = ["focused", "green", "south", "closed", "wet", "large"];
const ACTION = i => "observed_action_" + i;
const eq = (a,b) => a.length === b.length && a.every((x,i)=>x===b[i]);

function training() {
  const model = new LearnedCognitiveMap({
    maxStateTokens: 4096, maxNodes: 128, maxDepth: 10
  });
  const before = TRAIN.slice();
  AT.forEach((at,i) => {before[at] = FROM[i];});
  for (let i=0;i<AT.length;i++) {
    const after = before.slice();
    after[AT[i]] = TO[i];
    // The world reports action/effect AFTER it actually happened. No oracle
    // solver, answer string, goal route, or test document is included.
    const learned = model.observeActionResult({
      before, after, action: ACTION(i), accepted: true
    });
    assert.equal(learned.learned,true);
  }
  assert.equal(model.rules.size,6);
  assert.equal(model.examples.size,0,
    "Only six action/effect pairs, no memorized full-sentence answer examples");
  return model;
}
function trial(seed) {
  const length = [1024,1536,2048][seed%3];
  const start = Array.from({length},(_,i)=>HELD[(i+seed*31)%HELD.length]);
  AT.forEach((at,i)=>{start[at]=FROM[i];});
  const required = AT.map((_,i)=>i)
    .filter(i=>(seed*31+i*13)%11<8);
  if (!required.length) required.push(seed%6);
  // Observable GOAL constraints only (same role as a visible maze target),
  // not the complete correct answer or route.
  const goal={slots:Object.fromEntries(required.map(i=>[AT[i],TO[i]]))};
  return {start,required,goal,length};
}
function worldPhysics(state,action) {
  const i=Number(String(action).split("_").at(-1));
  if (!Number.isInteger(i) || i<0 || i>=6 ||
      action!==ACTION(i) || state[AT[i]]!==FROM[i])
    return {after:state,accepted:false};
  const after=state.slice();
  after[AT[i]]=TO[i];
  return {after,accepted:true};
}
function wrongWorldPhysics(state,action) {
  // Real controlled causal ablation: intervention A is wired to the effect of
  // DIFFERENT action B. The learner's prior causal graph stays unchanged.
  const i=Number(String(action).split("_").at(-1));
  if (!Number.isInteger(i) || i<0 || i>=6) return {after:state,accepted:false};
  return worldPhysics(state,ACTION((i+1)%6));
}

test("120 frozen unseen long-text problems: exact full initial solution shape and physical execution",()=>{
  const model=training();
  let plans=0, firstFrozen=0, exactPredicted=0, completeCorrect=0;
  let correctSteps=0, allSteps=0, maxWorld=0;
  const rows=[];
  for(let seed=0;seed<120;seed++){
    const {start,required,goal,length}=trial(seed);
    const before=JSON.stringify(model.export());
    const plan=model.formSolution(start,goal,{
      maxNodes:128,maxDepth:10,
      seed:74129+seed*7919,
      temperature:seed%4===0?.7:0
    });
    const frozen=before===JSON.stringify(model.export());
    firstFrozen+=Number(frozen);
    assert.equal(frozen,true,"Frozen planning cannot update training data");
    assert.equal(plan.directOriginalMethod,"Discoverer.shape");
    assert.equal(plan.plannedBeforeAction,true);
    plans+=Number(plan.found);
    assert.equal(plan.found,true,JSON.stringify({seed,reason:plan.reason}));
    assert.equal(plan.path.length,required.length);
    maxWorld=Math.max(maxWorld,plan.world.states.length);
    const predicted=plan.world.states[plan.path.at(-1).to];
    // The independent reference is built only AFTER the complete plan was frozen.
    const expected=start.slice();
    for(const i of required)expected[AT[i]]=TO[i];
    const exact=eq(predicted,expected);
    exactPredicted+=Number(exact);
    const execution=model.execute(plan,{step:worldPhysics,observe:false});
    const correct=execution.solved&&eq(execution.final,expected);
    completeCorrect+=Number(correct);
    correctSteps+=execution.trace.filter(e=>e.accurate).length;
    allSteps+=execution.trace.length;
    rows.push({seed,length,axes:required.length,steps:plan.path.length,
      frozen,found:plan.found,firstShapeExact:exact,fullAnswerExact:correct});
    assert.equal(exact,true,"Predicted FULL answer (not only terminal token) incorrect");
    assert.equal(correct,true,"Actual action effects disagree with frozen shape");
  }
  const summary={name:"V25_FROZEN_LONG_TEXT_ACTUAL_ORIGINAL_DISCOVERER",
    sourceFile:"v17/docs/TORUS_AETHER_ABC_20261104.md",
    sourceSha256:SOURCE_SHA256,trainingObservedActions:6,
    corpusWords:words.length,trainSourceWordRange:[0,2048],
    heldoutSourceWordRange:[4200,8200],distinctTextTasks:120,
    testTokenLengths:[1024,1536,2048],stateDimensions:6,
    maxObservedWorldStates:maxWorld,
    originalAlgorithm:"Discoverer.shape",completePlans:plans,
    frozenBeforeAnyAction:firstFrozen,exactFullInitialShapes:exactPredicted,
    exactFullResponsesAfterIndependentActions:completeCorrect,
    correctPredictedTransitions:correctSteps,observedTransitions:allSteps,
    firstShapeExactRate:exactPredicted/120,
    overallExactCompleteAnswerRate:completeCorrect/120,
    strictMeaning:"Observed text-edit physics with explicit goals; NOT open-ended natural-language understanding",
    samples:rows.slice(0,5)};
  console.log(JSON.stringify(summary));
  assert.ok(summary.firstShapeExactRate>=.70);
  assert.ok(summary.overallExactCompleteAnswerRate>=.70);
});

test("no training, missing required causal action, and scrambled effects are true negative controls",()=>{
  const trained=training(),none=new LearnedCognitiveMap({maxStateTokens:4096,maxNodes:128,maxDepth:10});
  let untrainedPaths=0,missingRequiredPaths=0,scrambledExact=0;
  const noAxis0=LearnedCognitiveMap.restore(trained.export());
  noAxis0.rules.delete(ACTION(0));
  for(let seed=0;seed<60;seed++){
    const {start,goal}=trial(seed);
    untrainedPaths+=Number(none.formSolution(start,goal,{maxNodes:128,maxDepth:10}).found);
    const axisZeroGoal={slots:{[AT[0]]:TO[0]}};
    missingRequiredPaths+=Number(noAxis0.formSolution(start,axisZeroGoal,{maxNodes:128,maxDepth:10}).found);
    const plan=trained.formSolution(start,goal,{maxNodes:128,maxDepth:10});
    assert.equal(plan.found,true);
    const actual=trained.execute(plan,{step:wrongWorldPhysics,observe:false});
    const reference=start.slice();
    for(const i of AT.map((_,i)=>i).filter(i=>goal.slots[AT[i]]===TO[i]))
      reference[AT[i]]=TO[i];
    scrambledExact+=Number(actual.solved&&eq(actual.final,reference));
  }
  const control={name:"V25_CAUSAL_NEGATIVE_CONTROLS",
    tests:60,untrainedPaths,missingRequiredPaths,scrambledPhysicsExact:scrambledExact,
    interpretation:"Correct effects and learned actions are causally necessary in this constrained task"};
  console.log(JSON.stringify(control));
  assert.equal(untrainedPaths,0);
  assert.equal(missingRequiredPaths,0);
  assert.equal(scrambledExact,0);
});
