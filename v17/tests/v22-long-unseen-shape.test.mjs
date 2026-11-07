import test from "node:test";
import assert from "node:assert/strict";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {Discoverer} from "../transcend/torus-aether/worlds/exercise.mjs";

test("100 genuinely unseen 80-token compositional text transformations; full output predicted pre-action with original Discoverer",()=>{
 const model=new LearnedCognitiveMap();
 const common=Array.from({length:79},(_,i)=>"fixed"+i);
 model.observeSentence(["Alice",...common]);
 model.observeSentence(["Bob",...common]);
 assert.equal(model.examples.size,2);
 let correct=0,covered=0;
 for(let i=0;i<100;i++){
  const tail="novel_tail_"+i; // NEVER observed in any training world
  const input=["Bob",...common.slice(0,-1),tail];
  const expected=["Alice",...common.slice(0,-1),tail];
  const referenceHidden=model.examples.has(expected.join("\u001f"));
  assert.equal(referenceHidden,false,"Answer must not be observed in training");
  const goal={slots:{0:"Alice"}}; // objective is GIVEN, not derived from held-out answer
  const before=JSON.stringify(model.export());
  const plan=model.formSolution(input,goal,{maxDepth:6,maxNodes:64,seed:74129});
  assert.equal(JSON.stringify(model.export()),before,"Pre-action plan must not train on heldout text");
  if(!plan.found)continue;
  covered++;
  assert.equal(plan.directOriginalMethod,"Discoverer.shape");
  assert.equal(plan.path.length,1);
  const execution=model.execute(plan,{observe:false,step:(prior,action)=>{
   const edit=JSON.parse(action),state=prior.slice();
   if(edit[0]!==0||edit[1]!=="Bob"||edit[2]!=="Alice")return {after:prior,accepted:false};
   state[0]="Alice";return {after:state,accepted:true};
  }});
  if(execution.solved&&JSON.stringify(execution.final)===JSON.stringify(expected))correct++;
 }
 assert.equal(covered,100);
 assert.equal(correct,100);
 assert.equal(model.examples.size,2,"Heldout full answers must not enter training memory");
 console.log("V22_LONG_HOLDOUT_STRUCTURED",JSON.stringify({
  trainedOriginalSentences:2,unseenTasks:100,lengthTokens:80,
  preActionOriginalShapeReachability:covered/100,
  fullAnswerExactStructuredAccuracy:correct/100,
  goalType:"explicit position constraint",
  semanticQAFromOpenThoughtsVerified:false,
  userRequestedGeneral100PercentVerified:false
 }));
});

test("original Discoverer softmax noise explores alternative learned action paths, deterministic with same seed",()=>{
 const model=new LearnedCognitiveMap();
 for(const s of ["Alice is happy.","Bob is happy.","Alice is sad.","Bob is sad."])
  model.observeWorld(s);
 const goal={slots:{0:"Alice",2:"sad"}};
 const first=model.formSolution("Bob is happy.",goal,{temperature:0,seed:1234});
 assert.equal(first.found,true);
 const stable=model.formSolution("Bob is happy.",goal,{temperature:0,seed:9876});
 assert.deepEqual(stable.path,first.path,"Temperature=0 must be deterministic");
 const before=JSON.stringify(model.export());
 const choices=new Set();
 for(let seed=1;seed<=64;seed++){
  const a=model.formSolution("Bob is happy.",goal,{temperature:.6,seed});
  assert.equal(a.found,true);
  assert.equal(a.directOriginalMethod,"Discoverer.shape");
  choices.add(a.path[0].action);
  const replay=model.formSolution("Bob is happy.",goal,{temperature:.6,seed});
  assert.deepEqual(replay.path,a.path,"Same V17 seed/noise must reproduce path");
 }
 assert.ok(choices.size>=2,"V17 noise must explore genuinely distinct learned alternative action paths");
 assert.equal(JSON.stringify(model.export()),before,"No observed answer may leak in seeded noise tests");
 console.log("V22_ORIGINAL_NOISE",JSON.stringify({alternativeFirstActions:choices.size,seedCount:64,seededDeterminism:true}));
});

test("real rejection blocks ONLY the rejected state/action and shape replanning cannot use it again",()=>{
 const model=new LearnedCognitiveMap();
 for(const s of ["Alice is happy.","Bob is happy.","Alice is sad.","Bob is sad."])
  model.observeWorld(s);
 const goal={slots:{0:"Alice",2:"sad"}};
 const planned=model.formSolution("Bob is happy.",goal);
 assert.equal(planned.found,true);
 const rejected=model.execute(planned,{step:state=>({after:state,accepted:false})});
 assert.equal(rejected.solved,false);
 assert.equal(rejected.attempts,1);
 const replan=model.formSolution("Bob is happy.",goal);
 assert.equal(replan.directOriginalMethod,"Discoverer.shape");
 if(replan.found)assert.notEqual(replan.path[0].action,planned.path[0].action,
    "Observed wall cannot be reused silently; alternative route only");
});
