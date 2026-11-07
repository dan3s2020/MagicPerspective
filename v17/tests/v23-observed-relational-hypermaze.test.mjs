import test from "node:test";
import assert from "node:assert/strict";
import {ObservedGrammar,words,stateKey,preactionShape,makeGrammar,makeHeldout,verifyPhysics,
  FORMATS,ACTIONS} from "../research/relational-hypermaze/engine.mjs";

test("V23: 300 genuinely held-out long text worlds: shape frozen before any physical step",()=>{
 const grammar=makeGrammar(),initial=JSON.stringify(grammar.snapshot());
 let full=0,optimal=0,wordsTotal=0,bytes=0,parsed=0;
 for(let seed=120000;seed<120300;seed++){
  const world=makeHeldout(seed,{routeLength:3+seed%8,distractors:70+seed%40});
  const plan=preactionShape(grammar,world.document,world.initial,world.goal,{seed});
  const result=verifyPhysics(plan,world);
  full+=Number(result.solved);optimal+=Number(result.solved&&result.steps===world.routeLength);
  wordsTotal+=words(world.document).length;bytes+=world.document.length;
  parsed+=plan.world.observed;
  assert.equal(plan.method,"Discoverer.shape");
  assert.equal(plan.predictedBeforeAction,true);
  assert.ok(plan.field.length===plan.world.states.length);
 }
 assert.equal(JSON.stringify(grammar.snapshot()),initial,"training unchanged during held-out evaluation");
 assert.equal(full,300);
 assert.equal(optimal,300);
 assert.ok(wordsTotal/300>2000);
 assert.ok(bytes/300>20000);
 console.log("V23_HELDOUT_LONG_TEXT",JSON.stringify({cases:300,solved:full,optimal,
  meanWords:wordsTotal/300,meanBytes:bytes/300,observedEdges:parsed}));
});
test("V23: unknown surface language and grammar ablations must abstain, not guess",()=>{
 const grammar=makeGrammar(),untrained=new ObservedGrammar();
 let unknown=0,empty=0;
 for(let seed=120000;seed<120300;seed++){
  const w=makeHeldout(seed,{unseenSurface:true});
  unknown+=Number(!preactionShape(grammar,w.document,w.initial,w.goal,{seed}).found);
  const basic=makeHeldout(seed);
  empty+=Number(!preactionShape(untrained,basic.document,basic.initial,basic.goal,{seed}).found);
 }
 assert.equal(unknown,300);assert.equal(empty,300);
});
test("V23: complete route is an action path, not predicted next characters or teacher answer",()=>{
 const grammar=makeGrammar();
 const w=makeHeldout(77881,{routeLength:9,distractors:96});
 const snapshot=JSON.stringify(grammar.snapshot());
 const p=preactionShape(grammar,w.document,w.initial,w.goal,{seed:100});
 assert.equal(p.route.length,9);assert.ok(verifyPhysics(p,w).solved);
 assert.equal(JSON.stringify(grammar.snapshot()),snapshot);
 assert.ok(p.route.every(e=>Array.isArray(e.from)&&e.from.length===4&&
   Array.isArray(e.to)&&e.to.length===4&&ACTIONS.includes(e.action)));
 const noGoalEdges=preactionShape(grammar,w.document,w.initial,["unseen","p0","c0","t0"]);
 assert.equal(noGoalEdges.found,false);
});
test("V23: four-axis source and target require witnessed transformations",()=>{
 const g=new ObservedGrammar(),s=["sourceA","phaseA","chargeA","timeA"],
 t=["targetB","phaseB","chargeB","timeB"];
 assert.equal(g.witness({sentence:FORMATS[1](s,t,"amber"),before:s,after:t,action:"amber"}),1);
 assert.equal(g.parse(FORMATS[1](s,t,"amber")),null,"one intervention is insufficient");
 assert.equal(g.witness({sentence:FORMATS[1](s,t,"amber"),before:s,after:t,action:"amber"}),2);
 assert.deepEqual(g.parse(FORMATS[1](s,t,"amber")),{before:s,after:t,action:"amber"});
});
test("V23: native shape responds to deterministic seed and optional stochastic traversal",()=>{
 const g=makeGrammar(),w=makeHeldout(88001,{routeLength:10,distractors:100});
 const a=preactionShape(g,w.document,w.initial,w.goal,{seed:91,temperature:0.5});
 const b=preactionShape(g,w.document,w.initial,w.goal,{seed:91,temperature:0.5});
 assert.deepEqual(a.route,b.route);
 assert.deepEqual(a.field,b.field);
 assert.equal(a.temperature,0.5);
});
test("V23: visibly incomplete semantic generalization is not marked passed",()=>{
 const g=makeGrammar();
 const ordinaryQuestion="What physical mechanism produces the aurora borealis?";
 assert.equal(preactionShape(g,ordinaryQuestion,
   ["question","unknown","unknown","t0"],["answer","unknown","unknown","t1"]).found,false);
});
