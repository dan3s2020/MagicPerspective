import test from "node:test";
import assert from "node:assert/strict";
import {TemporalTextShape} from "../transcend/torus-aether/worlds/temporal-text-shape.mjs";
import {LearnedCognitiveMap,tokenizeWorld} from "../transcend/torus-aether/worlds/learned-cognitive-map.mjs";
import {Discoverer as Original,KIND} from "../transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs";
import {Discoverer as Current} from "../transcend/torus-aether/worlds/exercise.mjs";

const N=145;
const answer=t=>Array.from({length:t-1},(_,i)=>i%2?"beta":"alpha").concat("OMEGA").join(" ");
function build(n=N){
 const model=new TemporalTextShape(),map=new LearnedCognitiveMap();
 const text=answer(n),tokens=tokenizeWorld(text);
 let previous=["<bos>","<bos>"];
 for(const token of tokens){
  const next=[previous[1],token];
  map.observeExternalTransition({domain:"text",before:previous,
   action:"observed-append:"+token,after:next});
  previous=next;
 }
 model.learn("What happens at the far end of this long observed path?",text);
 return {model,map,tokens,terminal:previous.slice(),text};
}
test("time-lifted ORIGINAL Discoverer predicts 145 actions before moving despite an early two-token shortcut",()=>{
 const {model,map,terminal,text}=build();
 const frozen=JSON.stringify([map.export(),model.export()]);
 const common={map,terminals:[terminal],estimatedTokens:N,maxStates:2000,maxDepth:180,minFraction:1};
 const path=model.plan("Which long route reaches the goal?",common);
 assert.equal(path.ready,true,JSON.stringify(path));
 assert.equal(path.originalOperator,"Discoverer.shape");
 assert.equal(path.plannedBeforeFirstMovement,true);
 assert.equal(path.initialShape.length,N);
 assert.equal(path.actualPlannedLength,N);
 assert.equal(path.referenceAnswerProvided,false);
 assert.equal(path.answer,text);
 assert.ok(path.frames.every((s,i)=>s.time===i));
 assert.ok(path.initialShape.every(s=>s.valueAfter>s.valueBefore));
 assert.equal(path.graph.truncated,false);
 assert.equal(JSON.stringify([map.export(),model.export()]),frozen,"Frozen inference MUST NOT alter learners");
 const repeat=model.plan("Which long route reaches the goal?",common);
 assert.deepEqual(path.initialShape.map(e=>e.action),repeat.initialShape.map(e=>e.action));
 console.log("V25_TEMPORAL_PATH",JSON.stringify({steps:N,
  originalMethod:path.originalOperator,truncated:path.graph.truncated,
  states:path.graph.states,edges:path.graph.edges}));
});
test("prior V24 two-token destination is reachable in only three actions; time dimension forbids shortcut",()=>{
 const {model,map,terminal}=build();
 const old=map.formObservedWorld("text",["<bos>","<bos>"],{slots:{0:terminal[0],1:terminal[1]}});
 assert.equal(old.found,true);
 assert.ok(old.path.length<10,"Old V24 shortcut length was "+old.path.length);
 const improved=model.plan("Long observed path",{map,terminals:[terminal],
  estimatedTokens:N,maxStates:2000,maxDepth:180,minFraction:1});
 assert.equal(improved.ready,true);
 assert.equal(improved.actualPlannedLength,N);
 assert.ok(improved.actualPlannedLength>old.path.length*20);
});
test("unknown/contradictory transition remains a wall in temporal graph",()=>{
 const {model,map,terminal}=build();
 const e=JSON.stringify(["text",["<bos>","<bos>"]])+"\u001fobserved-append:alpha";
 const original=map.externalEdges.get(e);
 map.externalEdges.delete(e);
 const unavailable=model.plan("Long path",{map,terminals:[terminal],
  estimatedTokens:N,maxStates:2000,maxDepth:180});
 assert.equal(unavailable.ready,false);
 map.externalEdges.set(e,original);
 const conflict=map.observeExternalTransition({domain:"text",
  before:["<bos>","<bos>"],action:"observed-append:alpha",
  after:["beta","ALTERNATE"]});
 assert.equal(conflict.conflict,true);
 const denied=model.plan("Long path",{map,terminals:[terminal],
  estimatedTokens:N,maxStates:2000,maxDepth:180});
 assert.equal(denied.ready,false);
});
test("estimated length learned from Q/A without provided answer and serializes",()=>{
 const {model,map,terminal}=build(110);
 assert.equal(model.lengthField.rows,1);
 const q="What happens at the far end of this long observed path?";
 const estimate=model.lengthField.predict(q);
 assert.equal(estimate.ready,true);
 assert.equal(estimate.estimatedTokens,110);
 assert.equal(estimate.globalMean,110);
 const before=JSON.stringify(model.export());
 const resumed=TemporalTextShape.restore(JSON.parse(before));
 assert.equal(JSON.stringify(resumed.export()),before);
 const plan=resumed.plan(q,{map,terminals:[terminal],maxStates:3000,maxDepth:130});
 assert.equal(plan.originalOperator,"Discoverer.shape");
 assert.equal(plan.ready,true);
 assert.equal(JSON.stringify(resumed.export()),before);
});
test("finite time horizons cannot falsely claim an answer when the graph budget prevents reaching its target",()=>{
 const {model,map,terminal}=build(280);
 const result=model.plan("This path",{map,terminals:[terminal],
  estimatedTokens:280,maxStates:30,maxDepth:300});
 assert.equal(result.ready,false);
 assert.equal(result.graph.truncated,true);
});
test("original unchanged 2D solver regression with seeded temperature",()=>{
 for(let seed=1;seed<=36;seed++){
  const n=9+2*(seed%3),ret=new Array(n*n).fill(KIND.floor);
  for(let j=0;j<ret.length;j++)if((j*19+seed*7)%29<4)ret[j]=KIND.wall;
  ret[0]=KIND.self;ret[ret.length-1]=KIND.target;
  const old=new Original(seed),now=new Current(seed);
  for(const d of [old,now]){
   d.pass=[5,1,19,3];d.block=[2,50,1,4];d.enter=[1,1,10,1];
   d.endIn=[0,0,8,0];d.temp=seed%2?0.7:0;
  }
  assert.deepEqual(old.shape(ret,n,0),now.shape(ret,n,0));
 }
});
