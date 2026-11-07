import test from "node:test";
import assert from "node:assert/strict";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {CoupledTextMaze} from "../research/text-hypermaze/coupled-axes.mjs";
import {StateDependentTextAxes} from "../research/text-hypermaze/state-dependent-axes.mjs";

const pairs=[
 ["2 * 3 = 6.","3 * 3 = 9."],
 ["2 * 4 = 8.","3 * 4 = 12."],
 ["2 * 3 = 6.","2 * 4 = 8."],
 ["3 * 3 = 9.","3 * 4 = 12."],
 ["3 * 4 = 12.","4 * 4 = 16."],
 ["2 * 4 = 8.","2 * 5 = 10."]
];
const digits=s=>tokenizeObservation(s).filter(x=>/^\d+$/.test(x)).map(Number);
const seedRng=s=>()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
function trained(rows=pairs){const m=new StateDependentTextAxes({maxExpanded:8000,maxValue:300});
 for(const [a,b] of rows)assert.equal(m.observePair(a,b).learned,true);
 return m;}
test("learn a variable MOVEMENT FIELD rather than a fixed axis, with no multiplication operation encoded",()=>{
 const m=trained(),base=m.discover("2 * 3 = 6.");
 assert.equal(base.ready,true,JSON.stringify(base));
 assert.equal(base.dependent,2);
 assert.deepEqual(base.axes,[0,1]);
 const at3=m.availableActions("2 * 3 = 6.").actions;
 const at4=m.availableActions("2 * 4 = 8.").actions;
 const x3=at3.find(x=>x.primary===0&&x.step===1);
 const x4=at4.find(x=>x.primary===0&&x.step===1);
 assert.equal(x3.predictedNext,"3 * 3 = 9.");
 assert.equal(x4.predictedNext,"3 * 4 = 12.");
 assert.ok(x3.contextSlopes[1]>.99);
 const y3=at3.find(x=>x.primary===1&&x.step===1);
 assert.equal(y3.predictedNext,"2 * 4 = 8.");
 assert.ok(y3.contextSlopes[0]>.99);
 console.log("STATE_DEPENDENT_TEXT_MOVEMENT_FIELD",JSON.stringify({
  learnedPairs:m.observations,axes:base.axes,dependent:base.dependent,
  xAxisAt3:x3,xAxisAt4:x4,yAxisAt2:y3}));
});
test("48 unseen multiplication goals: infer the missing product from local learned field, planned BEFORE any execution",()=>{
 const m=trained(),fixed=new CoupledTextMaze({maxValue:300});
 for(const [a,b] of pairs)fixed.observePair(a,b);
 let tested=0,exact=0,fixedCorrect=0,totalSteps=0;
 for(let x=4;x<=11;x++)for(let y=5;y<=10;y++){
   const goals=[{index:0,value:x},{index:2,value:y}],r=m.plan("2 * 3 = 6.",goals),
     baseline=fixed.plan("2 * 3 = 6.",goals);
   assert.ok(r.found,JSON.stringify({x,y,r}));
   assert.deepEqual(digits(r.predicted),[x,y,x*y],JSON.stringify(r));
   assert.equal(r.steps,x-2+y-3);
   assert.equal(r.referenceAnswerProvided,false);
   assert.ok(pairs.flat().every(row=>row!==r.predicted));
   exact++;tested++;totalSteps+=r.steps;
   fixedCorrect+=+(baseline.found&&digits(baseline.predicted)[2]===x*y);
 }
 assert.equal(exact,48);
 assert.ok(fixedCorrect<exact/3,JSON.stringify({fixedCorrect,exact}));
 console.log("UNSEEN_NONLINEAR_TEXT_MAZE",JSON.stringify({
  goalCount:tested,stateDependentCorrect:exact,fixedAxisCorrect:fixedCorrect,
  meanPathLength:totalSteps/tested,outputAnswerProvided:false}));
});
test("local movement axes COMMUTE on novel states: two routes have the same resultant solution shape",()=>{
 const m=trained(),s="5 * 6 = 30.",t=tokenizeObservation(s),model=m.discover(s);
 const a=model.operators.find(x=>x.primary===0&&x.step===1);
 const b=model.operators.find(x=>x.primary===1&&x.step===1);
 assert.ok(a&&b);
 const ab=m.apply(m.apply(t,a,model),b,model);
 const ba=m.apply(m.apply(t,b,model),a,model);
 assert.deepEqual(ab,ba);
 assert.deepEqual(digits(ab.join(" ")),[6,7,42]);
 console.log("LEARNED_CONTEXT_VECTOR_FIELDS_COMMUTE",JSON.stringify({
  before:s,axis1Then2:ab.join(" "),axis2Then1:ba.join(" "),sameState:true}));
});
test("without evidence across DIFFERENT contexts, nonlinear axes stay incorrectly constant: identifiability control",()=>{
 const sparse=trained([pairs[0],pairs[2]]),rich=trained();
 const goal=[{index:0,value:8},{index:2,value:7}];
 const a=sparse.plan("2 * 3 = 6.",goal),b=rich.plan("2 * 3 = 6.",goal);
 assert.ok(a.found&&b.found);
 assert.notEqual(digits(a.predicted)[2],56);
 assert.equal(digits(b.predicted)[2],56);
 console.log("STATE_DEPENDENCE_REQUIRES_CONTRAST_EVIDENCE",JSON.stringify({
  sparseObservedPairs:2,sparsePrediction:a.predicted,
  richObservedPairs:rich.observations,richPrediction:b.predicted}));
});
test("stochastic world moves along learned CONTEXT axes: observed replanning beats blindly following an initial route",()=>{
 const m=trained(),start="2 * 3 = 6.",goals=[{index:0,value:9},{index:2,value:8}],
  first=m.plan(start,goals);
 assert.ok(first.found);
 let closed=0,open=0,invalid=0,disturbances=0;
 for(let seed=1;seed<=50;seed++){
  for(const mode of ["closed","open"]){
    const rand=seedRng(seed),model=m.discover(start),actions=model.operators;
    let tokens=tokenizeObservation(start),ok=false;
    for(let i=0;i<(mode==="closed"?85:first.actions.length);i++){
      const plan=mode==="closed"?m.plan(tokens.join(" ").replace(/\s+([.!?])/g,"$1"),goals):first;
      if(mode==="closed"&&!plan.found)break;
      const move=mode==="closed"?plan.actions[0]:first.actions[i];
      if(!move)break;
      const next=m.apply(tokens,move,model);if(!next)break;
      tokens=next;
      if(rand()<.35){
        const op=actions[Math.floor(rand()*actions.length)];
        const newTokens=m.apply(tokens,op,model);
        if(newTokens){tokens=newTokens;disturbances++;}
      }
      const vals=digits(tokens.join(" "));
      invalid+=+(vals[0]*vals[1]!==vals[2]);
      if(mode==="closed"&&vals[0]===9&&vals[1]===8){ok=true;break;}
    }
    if(mode==="open"){const vals=digits(tokens.join(" "));ok=vals[0]===9&&vals[1]===8;}
    if(mode==="closed")closed+=+ok;else open+=+ok;
  }
 }
 assert.equal(invalid,0);
 assert.ok(closed>open,JSON.stringify({closed,open}));
 console.log("NONLINEAR_STOCHASTIC_REPLAN",JSON.stringify({
  episodes:50,closed,open,disturbances,offManifoldWorldStates:invalid}));
});

test("non-commuting learned axes expose PATH DEPENDENCE: the same visible goal coordinates can hide distinct states",()=>{
 const m=new StateDependentTextAxes({maxValue:200});
 const contextPairs=[
  ["2 @ 3 ~ 6.","3 @ 3 ~ 9."], // axis-X increment changes dependent value by Y
  ["2 @ 4 ~ 8.","3 @ 4 ~ 12."],
  ["2 @ 3 ~ 6.","2 @ 4 ~ 10."], // axis-Y increment changes dependent by 2X
  ["3 @ 3 ~ 9.","3 @ 4 ~ 15."]
 ];
 for(const [a,b] of contextPairs)assert.equal(m.observePair(a,b).learned,true);
 const start="5 @ 6 ~ 30.",t=tokenizeObservation(start),model=m.discover(start);
 assert.equal(model.ready,true,JSON.stringify(model));
 const X=model.operators.find(o=>o.primary===0&&o.step===1);
 const Y=model.operators.find(o=>o.primary===1&&o.step===1);
 assert.ok(X&&Y);
 const xy=m.apply(m.apply(t,X,model),Y,model);
 const yx=m.apply(m.apply(t,Y,model),X,model);
 const numericA=digits(xy.join(" ")),numericB=digits(yx.join(" "));
 assert.deepEqual(numericA.slice(0,2),numericB.slice(0,2));
 assert.notEqual(numericA[2],numericB[2]);
 assert.equal(Math.abs(numericA[2]-numericB[2]),1);
 console.log("NONCOMMUTATIVE_TEXT_TRANSFORMATIONS",JSON.stringify({
   startingState:start,XY:xy.join(" "),YX:yx.join(" "),
   sameInputCoordinates:true,differentDependentCoordinate:true,
   pathOrderDiscrepancy:numericA[2]-numericB[2],
   implication:"A route can carry state/history that visible input coordinate goals alone do not specify",
   notQuantumEvidence:true
 }));
});
