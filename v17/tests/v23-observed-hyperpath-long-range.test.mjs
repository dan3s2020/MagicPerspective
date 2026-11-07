import test from "node:test";
import assert from "node:assert/strict";
import {Discoverer as FrozenDiscoverer, KIND} from "../transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs";
import {Discoverer as CurrentDiscoverer} from "../transcend/torus-aether/worlds/exercise.mjs";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

const makeObservedChain = (steps=144) => {
  const m=new LearnedCognitiveMap();
  for(let i=0;i<steps;i++) {
    m.observeExternalTransition({domain:"text",
      before:["STATE",String(i)],action:"observed-action-"+i,
      after:["STATE",String(i+1)]});
  }
  return m;
};

test("84 fixed 2D retinas preserve byte-frozen Discoverer.shape outputs including noise",()=>{
  for(let seed=1;seed<=84;seed++){
    const n=7+2*(seed%3), size=n*n, retina=new Array(size).fill(KIND.floor);
    for(let cell=1;cell<size-1;cell++){
      // Deterministic, varied, sometimes disconnected. Exactly the same retina in both.
      if(((cell*131+seed*17) % 19)<4)retina[cell]=KIND.wall;
    }
    retina[0]=KIND.self;retina[size-1]=KIND.target;
    const old=new FrozenDiscoverer(seed),now=new CurrentDiscoverer(seed);
    for(const d of [old,now]){
      d.pass=[18,1,19,9];d.block=[2,80,1,4];
      d.enter=[1,1,10,1];d.endIn=[0,0,9,0];
      d.temp=seed%2?.7:0;
    }
    assert.deepEqual(now.shape(retina,n,0),old.shape(retina,n,0),
      "Original V17 behavior changed on seed "+seed);
  }
  console.log("V23_ORIGINAL_2D_DISCOVERER_PARITY",JSON.stringify({boards:84,noise:"seeded on 42 boards"}));
});

test("original V17 field predicts complete 144-action route across observed text-world transitions before action",()=>{
  const steps=144,m=makeObservedChain(steps);
  const result=m.formObservedWorld("text",["STATE","0"],{slots:{1:String(steps)}},
    {maxNodes:steps+4});
  assert.equal(result.directOriginalMethod,"Discoverer.shape");
  assert.equal(result.plannedBeforeAction,true);
  assert.equal(result.found,true,
    "Original attraction must reach start of long observed path, not vanish numerically: "+
    JSON.stringify({reason:result.field?.reason,values:result.field?.values?.slice(0,8),steps:result.path?.length}));
  assert.equal(result.path.length,steps);
  let cursor=["STATE","0"];
  for(let i=0;i<result.path.length;i++){
    const hop=result.path[i];
    assert.equal(hop.action,"observed-action-"+i);
    const recorded=m.externalEdges.get(JSON.stringify(["text",cursor])+"\u001f"+String(hop.action));
    assert.ok(recorded&&!recorded.ambiguous,"action must have an actually observed effect");
    cursor=recorded.after;
  }
  assert.deepEqual(cursor,["STATE",String(steps)]);
  console.log("V23_OBSERVED_LONG_PATH",JSON.stringify({
    steps,plannedBeforeAction:true,method:result.directOriginalMethod,
    fieldAtStart:result.field.values[0],
    solvedFromLearnedObservedTransitions:result.found,
    limitation:"closed graph of already observed transitions; not a general language understanding claim"
  }));
});

test("no target oracle: absent goal and missing observed edge must not create a path",()=>{
  const m=makeObservedChain(64);
  assert.equal(m.formObservedWorld("text",["STATE","0"],{slots:{1:"999"}},
    {maxNodes:100}).found,false);
  const partial=new LearnedCognitiveMap();
  for(let i=0;i<64;i++)if(i!==17)partial.observeExternalTransition({
    domain:"text",before:["STATE",String(i)],action:"action-"+i,
    after:["STATE",String(i+1)]});
  const p=partial.formObservedWorld("text",["STATE","0"],{slots:{1:"64"}},
    {maxNodes:100});
  assert.equal(p.found,false,"Missing experienced edge is a real wall; never hallucinate a route");
});

test("contradictory observed action transitions invalidate the route, not quietly promote the guess",()=>{
  const m=makeObservedChain(64);
  assert.equal(m.formObservedWorld("text",["STATE","0"],{slots:{1:"64"}},
    {maxNodes:100}).found,true);
  const contradictory=m.observeExternalTransition({
    domain:"text",before:["STATE","32"],action:"observed-action-32",
    after:["STATE","UNEXPECTED"]});
  assert.equal(contradictory.conflict,true);
  assert.equal(m.formObservedWorld("text",["STATE","0"],{slots:{1:"64"}},
    {maxNodes:100}).found,false);
});

test("511 observed transformations fit the existing 512-node V22 evaluation budget without erasing attraction",()=>{
  const steps=511, m=makeObservedChain(steps);
  const p=m.formObservedWorld("text",["STATE","0"],{slots:{1:String(steps)}},
    {maxNodes:512});
  assert.equal(p.found,true,"Original propagation must span the whole existing graph budget");
  assert.equal(p.path.length,steps);
  assert.ok(p.field.values[0]>0,"Whole solution is planned from node zero");
  assert.equal(p.path[0].action,"observed-action-0");
  assert.equal(p.path.at(-1).action,"observed-action-510");
  console.log("V23_MAX_NATIVE_OBSERVED_PATH",JSON.stringify({
    plannedBeforeAction:p.plannedBeforeAction,steps,
    fieldAtStart:p.field.values[0],method:p.directOriginalMethod
  }));
});

const taughtPhaseActions = (steps=48) => {
  const m=new LearnedCognitiveMap();
  // Learn the effects from short lived state/action contrasts; the long
  // held-out question and its complete target sentence NEVER appear in training.
  for(let i=0;i<steps;i++) {
    const result=m.observeActionResult({
      before:["phase:"+i,"training-only-tail"],
      action:"advance:"+i,
      after:["phase:"+(i+1),"training-only-tail"],
      accepted:true
    });
    assert.equal(result.learned,true);
  }
  return m;
};

test("48 consecutive original Discoverer actions solve an unseen 2048-token text state before output",()=>{
  const steps=48, m=taughtPhaseActions(steps);
  const novel=["phase:0",...Array.from({length:2047},(_,i)=>"unseen_unique_content_"+i)];
  const complete=["phase:"+steps,...novel.slice(1)];
  const pre=JSON.stringify(m.export());
  assert.equal(m.examples.size,0,"The evaluation text must not enter observed sentence corpus");
  const plan=m.formSolution(novel,{slots:{0:"phase:"+steps}},
    {maxNodes:100,maxDepth:64,temperature:0});
  assert.equal(JSON.stringify(m.export()),pre,"Planning must not modify training evidence");
  assert.equal(plan.directOriginalMethod,"Discoverer.shape");
  assert.equal(plan.plannedBeforeAction,true);
  assert.equal(plan.found,true,"Confirmed local action physics must propagate to start of an unseen long text");
  assert.equal(plan.path.length,steps,"The whole multi-action shape must exist before execution");
  const independentlyExecuted=m.execute(plan,{
    step:(state,action)=>{
      const i=Number(String(action).split(":")[1]);
      if(!Number.isInteger(i)||state[0]!=="phase:"+i)
        return {after:state,accepted:false};
      const after=state.slice();after[0]="phase:"+(i+1);
      return {after,accepted:true}; // independent physics: ignores 'predicted'
    }
  });
  assert.equal(independentlyExecuted.solved,true);
  assert.equal(independentlyExecuted.trace.length,steps);
  assert.ok(independentlyExecuted.trace.every(x=>x.accurate));
  assert.deepEqual(independentlyExecuted.final,complete,
    "FULL long output, not just goal marker or next-character proxy, must match");
  console.log("V23_UNSEEN_LONG_COMPOSITION",JSON.stringify({
    tokens:novel.length,actions:steps,
    frozenBeforeFirstAction:true,
    fullAnswerAccuracy:1,
    matchedEveryToken:true,source:"independently executed symbolic physics",
    baseline:"trained on 48 single-action examples; NO natural-language semantic accuracy implied"
  }));
});

test("48-step unseen long-text composition fails if causal action physics is ablated",()=>{
  const m=taughtPhaseActions(48);
  const novel=["phase:0",...Array.from({length:2047},(_,i)=>"new_"+i)];
  const goal={slots:{0:"phase:48"}};
  const good=m.formSolution(novel,goal,{maxNodes:100,maxDepth:64});
  assert.equal(good.found,true);
  m.rules.delete("advance:23");
  const ablated=m.formSolution(novel,goal,{maxNodes:100,maxDepth:64});
  assert.equal(ablated.found,false,"A missing learned action must break the route");
});

test("real-world contradictory outcome invalidates the 48-step unseen plan",()=>{
  const m=taughtPhaseActions(48);
  const novel=["phase:0",...Array.from({length:2047},(_,i)=>"unseen_"+i)];
  const good=m.formSolution(novel,{slots:{0:"phase:48"}},
    {maxNodes:100,maxDepth:64});
  assert.equal(good.found,true);
  m.observeActionResult({
    before:["phase:23","training-only-tail"], action:"advance:23",
    after:["phase:999","training-only-tail"],accepted:true});
  const invalid=m.formSolution(novel,{slots:{0:"phase:48"}},
    {maxNodes:100,maxDepth:64});
  assert.equal(invalid.found,false,"Conflicting transformation cannot be assumed traversable");
});

test("320-action branching observed hypermaze uses original V17 attraction and seeded noise",()=>{
  const layers=160, m=new LearnedCognitiveMap();
  for(let i=0;i<layers;i++){
    const hub=["HUB",String(i)],next=["HUB",String(i+1)];
    for(const side of ["LEFT","RIGHT"]){
      const mid=[side,String(i)];
      m.observeExternalTransition({domain:"text",before:hub,
        action:"branch-"+side+"-"+i,after:mid});
      m.observeExternalTransition({domain:"text",before:mid,
        action:"merge-"+side+"-"+i,after:next});
    }
  }
  const goal={slots:{0:"HUB",1:String(layers)}};
  const kwargs={maxNodes:layers*3+4};
  const make=(seed,temperature)=>m.formObservedWorld("text",["HUB","0"],goal,
    {...kwargs,disc:{temp:temperature},maxNodes:layers*3+4});
  const deterministic=make(21,0);
  assert.equal(deterministic.found,true);
  assert.equal(deterministic.path.length,2*layers);
  assert.equal(deterministic.directOriginalMethod,"Discoverer.shape");
  assert.equal(deterministic.plannedBeforeAction,true);
  assert.ok(deterministic.path.every(h=>typeof h.action==="string"));
  // The existing formObservedWorld API does not expose a seed argument.
  // Its actor receives a fixed seed; same temperature MUST replay the same noise.
  const stochasticA=make(21,.8),stochasticB=make(21,.8);
  assert.equal(stochasticA.found,true);
  assert.deepEqual(stochasticA.path,stochasticB.path);
  assert.equal(stochasticA.path.length,2*layers);
  const choices=stochasticA.path.filter(h=>h.action.startsWith("branch-"));
  assert.equal(choices.length,layers);
  assert.ok(choices.some(h=>h.action.startsWith("branch-LEFT")));
  assert.ok(choices.some(h=>h.action.startsWith("branch-RIGHT")),
    "Noise must be able to choose between two equally valid observed paths");
  console.log("V23_OBSERVED_BRANCHING_NOISE",JSON.stringify({
    layers,actions:deterministic.path.length,
    branchingChoices:choices.length,seededReproducible:true,
    left:choices.filter(h=>h.action.startsWith("branch-LEFT")).length,
    right:choices.filter(h=>h.action.startsWith("branch-RIGHT")).length,
    originalMethod:stochasticA.directOriginalMethod
  }));
});
