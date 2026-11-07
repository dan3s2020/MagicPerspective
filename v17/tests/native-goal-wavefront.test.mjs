import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {Discoverer,KIND} from "../transcend/torus-aether/worlds/exercise.mjs";
import {observedGoalField,executeObservedGoal} from "../transcend/torus-aether/worlds/goal-wavefront.mjs";
import {VeilAether} from "../transcend/torus-aether/worlds/veil-aether.mjs";
import {textTokens} from "../transcend/torus-aether/worlds/text-hypermaze.mjs";

const brain=()=>{const d=new Discoverer(17);d.temp=0;return d;};
const graph=(edges,n,start=0,goal=n-1)=>({
  nodes:Array.from({length:n},(_,id)=>({id})),
  edges:edges.map(([from,to,action,count=1])=>({from,to,action,count})),
  start,goals:[goal],maxSteps:128
});

test("Original V17 2D maze route stays active for exact original three args",()=>{
  const d=brain();
  d.pass=[100,1,1,1];d.block=[1,100,1,1];
  d.enter[2]=5;d.endIn[2]=5;
  const ret=[
    1,1,1,1,1,
    1,3,0,2,1,
    1,1,1,1,1,
    1,1,1,1,1,
    1,1,1,1,1
  ];
  const old=d.shape(ret,5,6);
  assert.deepEqual(old,[1,1],"Old rectangular maze attraction selects two east actions");
});
test("The SAME Discoverer.shape method plans entire witnessed graph route before first action",()=>{
  const d=brain(),g=graph([[0,1,"a"],[1,2,"b"],[0,3,"detour"],[3,4,"step"],[4,2,"return"]],5,0,2);
  const before=JSON.stringify(g);
  const r=d.shape(null,0,-1,g);
  assert.equal(JSON.stringify(g),before,"Planning is read-only; no reference answer or future was learned");
  assert.equal(r.found,true);
  assert.deepEqual(r.nodes,[0,1,2]);
  assert.deepEqual(r.path.map(e=>e.action),["a","b"]);
  assert.equal(r.firstAction,"a");
  assert.equal(r.plannedBeforeFirstAction,true);
  assert.equal(r.originalDiscovererDirectlyUsed,true);
  assert.ok(r.math.maxBellmanResidual<1e-12);
  assert.equal(r.math.strictlyUphill,true);
  assert.equal(r.math.noUnobservedEdges,true);
});
test("No oracle leakage: an inaccessible hidden answer getter is never read",()=>{
  const d=brain(),g=graph([[0,1,"observed"],[1,2,"observed"]],3);
  Object.defineProperty(g,"hiddenAnswer",{get(){throw Error("HELDOUT ANSWER LEAK");}});
  assert.deepEqual(d.shape(null,0,-1,g).nodes,[0,1,2]);
});
test("Action effect probabilities are learned from empirical observed outcomes",()=>{
  const g=graph([[0,1,"move",9],[0,2,"move",1],[1,3,"continue"],[2,3,"continue"]],4);
  const r=brain().shape(null,0,-1,g);
  assert.equal(r.found,true);
  assert.deepEqual(r.nodes,[0,1,3]);
  assert.equal(r.path[0].empiricalOutcomeProbability,.9);
  assert.ok(r.math.maxBellmanResidual<1e-12);
});
test("Causal ablation of observed transitions destroys the route instead of inventing one",()=>{
  const g=graph([[0,1,"a"],[1,2,"b"]],3);
  assert.equal(brain().shape(null,0,-1,g).found,true);
  const broken=structuredClone(g);broken.edges=broken.edges.filter(e=>e.from!==1);
  const r=brain().shape(null,0,-1,broken);
  assert.equal(r.found,false);
  assert.equal(r.reason,"NO_OBSERVED_ROUTE");
});
test("Actual environmental divergence is detected; native shape replans from observed state",async()=>{
  const d=brain();
  const g=graph([[0,1,"a"],[1,3,"finish"],[0,2,"wrong"],[2,3,"recover"]],4);
  const physics=new Map([
    ["0:a",2],["2:recover",3]
  ]);
  const trace=await executeObservedGoal({discoverer:d,space:g,
    act:({state,action})=>{const key=state+":"+action;if(!physics.has(key))throw Error("Invalid world action "+key);return physics.get(key);}});
  assert.equal(trace.original.found,true);
  assert.deepEqual(trace.original.nodes,[0,1,3]);
  assert.equal(trace.reached,true);
  assert.deepEqual(trace.trace.map(e=>e.matched),[false,true]);
  assert.deepEqual(trace.trace.map(e=>e.actual),[2,3]);
  assert.deepEqual(trace.trace[0].shapeBeforeAction,[0,1,3]);
  assert.deepEqual(trace.trace[1].shapeBeforeAction,[2,3]);
});
test("Native V21 observed contextual text path calls Brain.disc.shape directly and matches original Veil known-goal",()=>{
  const memory=new VeilAether();
  memory.observeTokens(["FROM","go","nodeA","nodeB","TO"],{id:0});
  const frozen=memory.planNative(brain(),"FROM go","nodeB TO");
  const baseline=memory.plan("FROM go","nodeB TO");
  assert.equal(frozen.originalMethod,"Brain.disc.shape()");
  assert.equal(frozen.originalDiscovererDirectlyUsed,true);
  assert.equal(frozen.hiddenAnswerUsed,false);
  assert.equal(frozen.found,true);
  assert.deepEqual(frozen.path,baseline.path);
  assert.equal(frozen.links[0].action,"observed-next-symbol:nodeA");
  assert.ok(frozen.math.maxBellmanResidual<1e-12);
});
test("Unknown contextual state cannot be hallucinated into a visible goal",()=>{
  const m=new VeilAether();m.observeTokens(["one","two","three","four"],{id:0});
  assert.equal(m.planNative(brain(),"one two","UNSEEN GOAL").found,false);
  assert.equal(m.planNative(brain(),"one two","UNSEEN GOAL").reason,"UNKNOWN_CONTEXT");
});
test("Temperature acts on actual route choice, never on invented transitions",()=>{
  const g=graph([[0,1,"left"],[0,2,"right"],[1,3,"finish"],[2,3,"finish"]],4);
  assert.equal(brain().shape(null,0,-1,g).firstAction,"left");
  const d=brain();d.temp=.8;d.r.next=()=>.99;
  const r=d.shape(null,0,-1,g);
  assert.equal(r.firstAction,"right");
  assert.equal(r.found,true);
  assert.ok(r.math.noUnobservedEdges);
});
test("Natural repository text: a long corpus creates ACTUAL contextual paths, no synthetic nodes",()=>{
  const source=fs.readFileSync(new URL("../../CONVERSATIE_COMPLETA_DIN_CONTEXT.md",import.meta.url),"utf8");
  const words=textTokens(source);
  assert.ok(source.length>50000);
  const take=words.slice(0,4000);
  const memory=new VeilAether({maxStates:12000,maxEdges:120000});
  memory.observeTokens(take,{id:"real-repository-document"});
  const start=take.slice(0,2),goal=take.slice(98,100);
  const r=memory.planNative(brain(),start,goal,{maxSteps:160});
  assert.equal(r.frozen,true);
  assert.equal(r.originalDiscovererDirectlyUsed,true);
  assert.equal(r.found,true);
  assert.ok(r.path.length>=2);
  assert.ok(r.math.maxBellmanResidual<1e-12);
  const before=memory.export(); // frozen evaluation must not change learned corpus
  memory.planNative(brain(),start,goal);
  assert.deepEqual(memory.export(),before);
  console.log("REAL_CORPUS",JSON.stringify({bytes:source.length,observedTokens:take.length,
    states:memory.nodes.length,edges:memory.edges.size,firstTryKnownGoal:r.found,
    plannedSteps:r.links.length,residual:r.math.maxBellmanResidual}));
});
test("Reject fabricated/unwitnessed transitions and invalid goals",()=>{
  assert.throws(()=>observedGoalField(graph([[0,1,"x",0]],2)),/Only real observed/);
  const g=graph([[0,1,"x"]],2);g.goals=[999];
  assert.throws(()=>brain().shape(null,0,-1,g),/Visible goal/);
});
