import test from "node:test";
import assert from "node:assert/strict";
import {LearnedCognitiveMap} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";

const teach=(m,action,from,to)=>{
  const first=m.observeActionResult({before:["north",from,"south"],action,
    after:["north",to,"south"],accepted:true});
  const second=m.observeActionResult({before:["east","west","north",from,"south"],action,
    after:["east","west","north",to,"south"],accepted:true});
  assert.equal(first.learned,true);
  assert.equal(second.learned,true,"Two independent consistent outcomes at different positions must generalize the binding");
};
const uniquePhysics=(state,action)=>{
  const [from,to]=({"rewrite-A":["A","B"],"rewrite-B":["B","C"],"rewrite-C":["C","D"]})[action]||[];
  const matches=state.flatMap((x,i)=>x===from?[i]:[]);
  if(matches.length!==1)return {after:state,accepted:false};
  const after=state.slice();after[matches[0]]=to;
  return {after,accepted:true};
};

test("V24: repeated accepted action physics induces a unique occurrence binding instead of a fixed word position",()=>{
  const m=new LearnedCognitiveMap();
  teach(m,"rewrite-A","A","B");
  const rule=m.rules.get("rewrite-A");
  assert.equal(rule.ambiguous,false);
  assert.equal(rule.positionMode,"unique-anchor");
  assert.deepEqual(m.predict(["other","novel","context","A","ending"],"rewrite-A"),
    ["other","novel","context","B","ending"]);
});

test("V24: single-position evidence cannot silently authorize generalization to a different position",()=>{
  const m=new LearnedCognitiveMap();
  const one=m.observeActionResult({before:["T","A","Q"],after:["T","B","Q"],
    action:"rewrite-A",accepted:true});
  assert.equal(one.learned,true);
  assert.deepEqual(m.predict(["X","A","Z"],"rewrite-A"),["X","B","Z"]);
  assert.equal(m.predict(["X","Y","A","Z"],"rewrite-A"),null);
});

test("V24: multiple candidate bindings and contradictory physics produce abstention",()=>{
  const m=new LearnedCognitiveMap();teach(m,"rewrite-A","A","B");
  assert.equal(m.predict(["A","middle","A"],"rewrite-A"),null,
    "Ambiguous action-target binding must never change an arbitrary occurrence");
  m.observeActionResult({before:["a","b","A","z"],after:["a","b","WRONG","z"],
    action:"rewrite-A",accepted:true});
  assert.equal(m.rules.get("rewrite-A").ambiguous,true);
  assert.equal(m.predict(["one","A","three"],"rewrite-A"),null);
});

test("V24: old graph V17 method plans and independently executes a heldout 2048-token three-rule text transformation",()=>{
  const m=new LearnedCognitiveMap();
  teach(m,"rewrite-A","A","B");teach(m,"rewrite-B","B","C");teach(m,"rewrite-C","C","D");
  const input=Array.from({length:2048},(_,i)=>"heldout_unique_"+i);
  input[1007]="A";
  const goal={slots:{"1007":"D"}};
  const before=JSON.stringify(m.export());
  const plan=m.formSolution(input,goal,{maxNodes:32,maxDepth:6});
  assert.equal(JSON.stringify(m.export()),before,"Pre-action planning must remain read-only");
  assert.equal(plan.found,true);
  assert.equal(plan.directOriginalMethod,"Discoverer.shape");
  assert.equal(plan.path.length,3);
  assert.deepEqual(plan.path.map(x=>x.action),["rewrite-A","rewrite-B","rewrite-C"]);
  assert.ok(plan.field.values[0]>0);
  const lived=m.execute(plan,{step:uniquePhysics});
  assert.equal(lived.solved,true);
  assert.equal(lived.attempts,3);
  assert.equal(lived.predictionAccuracy,1);
  const expected=input.slice();expected[1007]="D";
  assert.deepEqual(lived.final,expected);
  console.log("V24_HELDOUT_ANCHOR_COMPOSITION",JSON.stringify({
    tokens:2048,trainObservations:6,novelPosition:1007,
    frozenPreActionSteps:3,independentExecutionAccuracy:lived.predictionAccuracy,
    fullOutputExact:true,originalMethod:plan.directOriginalMethod,
    limitation:"synthetic word-edit physics, not open-ended semantic Q/A"
  }));
});

test("V24: no route after removing required learned action; restored checkpoint preserves inferred binding",()=>{
  const m=new LearnedCognitiveMap();
  teach(m,"rewrite-A","A","B");teach(m,"rewrite-B","B","C");
  const restored=LearnedCognitiveMap.restore(JSON.parse(JSON.stringify(m.export())));
  const state=["z","A","x","y"];
  assert.deepEqual(restored.predict(state,"rewrite-A"),["z","B","x","y"]);
  assert.equal(restored.formSolution(state,{slots:{1:"C"}},{maxNodes:16,maxDepth:4}).found,true);
  restored.rules.delete("rewrite-B");
  assert.equal(restored.formSolution(state,{slots:{1:"C"}},{maxNodes:16,maxDepth:4}).found,false);
});
