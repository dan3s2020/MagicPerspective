import test from "node:test";
import assert from "node:assert/strict";
import {tokenizeObservation} from "../transcend/torus-aether/worlds/observed-transformations.mjs";
import {CoupledTextMaze} from "../research/text-hypermaze/coupled-axes.mjs";

function additiveWorld(D){
  const inputs=D-1;
  const values=Array(inputs).fill(1);
  const sentence=(vals)=>vals.join(" + ")+" = "+vals.reduce((a,b)=>a+b,0)+".";
  const start=sentence(values);
  const model=new CoupledTextMaze({maxValue:1000,maxExpanded:15000});
  for(let i=0;i<inputs;i++){
    const next=values.slice();next[i]++;
    const added=model.observePair(start,sentence(next));
    assert.equal(added.learned,true,JSON.stringify({D,i,added}));
  }
  const numericPositions=tokenizeObservation(start).flatMap((x,i)=>/^\d+$/.test(x)?[i]:[]);
  assert.equal(numericPositions.length,D);
  const goals=numericPositions.slice(0,-1).map(index=>({index,value:2}));
  const predicted=model.plan(start,goals,{maxSteps:D,maxExpanded:15000});
  return {D,inputAxes:inputs,learnedPairs:model.observations,
    rank:model.axesFor(start).transformationRank,
    invariantDimensions:model.axesFor(start).invariantDimension,
    predicted:predicted.found?predicted.predicted:null,
    expanded:predicted.expanded,steps:predicted.steps,
    actualLast:predicted.found?+tokenizeObservation(predicted.predicted)[numericPositions.at(-1)]:null,
    expectedLast:inputs*2,verified:predicted.found?model.execute(predicted).verified:false};
}
test("discover a low-dimensional CONSERVED SOLUTION SHAPE in numeric text states from 4D through 64D",()=>{
  const rows=[];
  for(const D of [4,8,16,32,64]){
    const row=additiveWorld(D);
    assert.equal(row.verified,true,JSON.stringify(row));
    assert.equal(row.rank,D-1);
    assert.equal(row.invariantDimensions,1);
    assert.equal(row.steps,D-1);
    assert.equal(row.actualLast,row.expectedLast);
    rows.push({...row,predicted:row.predicted?.slice(0,120)});
  }
  console.log("XD_TEXT_EQUATION_SOLUTION_MANIFOLD",JSON.stringify(rows));
});
test("fixed coupled movements FAIL on unseen multiplicative dependence: a useful falsification",()=>{
  const pairs=[
    ["2 * 3 = 6.","3 * 3 = 9."],
    ["2 * 3 = 6.","2 * 4 = 8."],
    ["3 * 3 = 9.","4 * 3 = 12."],
    ["2 * 4 = 8.","2 * 5 = 10."]
  ];
  const m=new CoupledTextMaze({maxValue:100});
  for(const [a,b] of pairs)assert.equal(m.observePair(a,b).learned,true);
  const result=m.plan("2 * 3 = 6.",[{index:0,value:5},{index:2,value:6}],
    {maxSteps:16,maxExpanded:10000});
  assert.ok(result.found,JSON.stringify(result));
  const t=tokenizeObservation(result.predicted),vals=[Number(t[0]),Number(t[2]),Number(t[4])];
  assert.deepEqual(vals.slice(0,2),[5,6]);
  assert.notEqual(vals[2],5*6,"constant translation axes do not learn a varying nonlinear product");
  console.log("FIXED_AXIS_NONLINEAR_FAILURE",JSON.stringify({
    observedPairs:m.observations,askedForInputs:[5,6],unseenTarget:30,
    predicted:result.predicted,correct:false,
    conclusion:"New hypothesis required: transformation direction depends on current state"}));
});
