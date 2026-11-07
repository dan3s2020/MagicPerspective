import test from "node:test";
import assert from "node:assert/strict";
import {ObservedCausalField} from "../transcend/torus-aether/worlds/observed-causal-field.mjs";
import {VeilAether} from "../transcend/torus-aether/worlds/veil-aether.mjs";

const steps=[
 {domain:"transform",before:[0,0,0],action:"X",after:[1,0,0]},
 {domain:"transform",before:[1,0,0],action:"Y",after:[1,1,3]},
 {domain:"transform",before:[0,0,0],action:"Y",after:[0,1,0]},
 {domain:"transform",before:[0,1,0],action:"X",after:[1,1,4]}
];
test("real observed action order is noncommutative: AB and BA have different effects",()=>{
 const m=new ObservedCausalField();
 for(const s of steps)m.observe(s);
 const w=m.noncommuting();
 assert.equal(w.length,1);
 assert.equal(w[0].orderMatters,true);
 assert.deepEqual(w[0].actions,["X","Y"]);
 const plan=m.plan("transform",[0,0,0],[1,1,3]);
 assert.equal(plan.found,true);
 assert.equal(plan.path.length,3);
 assert.equal(plan.math.distance,2);
 assert.ok(plan.math.residual<1e-12);
 assert.ok(plan.math.shortestObserved&&plan.math.strictlyUphill);
 assert.equal(m.plan("transform",[0,0,0],[9,9,9]).found,false);
 const frozen=JSON.stringify(m.export());
 m.plan("transform",[0,0,0],[1,1,4]);
 assert.equal(JSON.stringify(m.export()),frozen,"Never train on the answer during frozen planning");
 console.log("V21_ORDER_DEPENDENT_ACTIONS",JSON.stringify({
   witnessedNoncommuting:w.length,goalDistance:plan.math.distance,residual:plan.math.residual
 }));
});
test("stochastic action outcomes are empirical and normalized, no fixed 2048 physics asserted",()=>{
 const m=new ObservedCausalField();
 for(let j=0;j<8;j++)m.observe({domain:"maze",before:[0,0],action:"north",after:[0,1]});
 for(let j=0;j<2;j++)m.observe({domain:"maze",before:[0,0],action:"north",after:[0,0]});
 const options=m.alternatives("maze",[0,0],"north");
 assert.equal(options.length,2);
 assert.ok(Math.abs(options[0].p-.8)<1e-12);
 assert.ok(Math.abs(options[1].p-.2)<1e-12);
 const report=m.snapshot();
 assert.equal(report.stochasticBranches.length,1);
 assert.ok(report.stochasticBranches[0].entropyBits>0.72);
 assert.ok(report.stochasticBranches[0].entropyBits<0.73);
 assert.equal(report.semanticTransferVerified,false);
});
test("axes are fitted per observed action, not labeled as hidden physical dimensions",()=>{
 const m=new ObservedCausalField();
 for(const step of steps)m.observe(step);
 const report=m.snapshot();
 const x=report.actualActionAxes.filter(z=>z.action==="transform:X");
 const y=report.actualActionAxes.filter(z=>z.action==="transform:Y");
 assert.equal(x.length,1);assert.equal(y.length,1);
 assert.ok(x[0].changedCoordinateEvidence.some(row=>row[0]===0));
 assert.ok(y[0].changedCoordinateEvidence.some(row=>row[0]===1));
 assert.equal(report.actionControlVerified,false);
});
test("same checkpoint captures original V17 physical action evidence and V21 contextual text, no phantom edges",()=>{
 const v=new VeilAether();
 v.observeTokens(["She","is","calm","."]);
 const count=v.edges.size;
 for(const e of steps)v.observeExperience(e);
 const s=v.snapshot();
 assert.equal(v.edges.size,count,"Physical effects must not become invented corpus edges");
 assert.equal(s.domainEvents.transform,4);
 assert.equal(s.causalField.counts.transform,4);
 assert.equal(s.causalField.observedNoncommuting.length,1);
 assert.deepEqual(VeilAether.restore(v.export()).snapshot(),s);
});
test("bounded observations cannot grow hidden memory forever",()=>{
 const m=new ObservedCausalField({maxStates:8,maxEdges:8});
 for(let i=0;i<40;i++)m.observe({domain:"text",before:"before"+i,action:"edit",after:"after"+i});
 assert.ok(m.nodes.length<=8);assert.ok(m.edges.size<=8);
 assert.ok(m.omittedNodes>0);
 const copy=ObservedCausalField.restore(m.export());
 assert.deepEqual(copy.snapshot(),m.snapshot());
});
