import test from 'node:test';import assert from 'node:assert/strict';
import {CausalNet} from '../engine/model.mjs';
import {TOOLS,createWorld,senseProbes,encodeContext,features,generateTask} from '../engine/world.mjs';
import {makeBelief,causalPrediction,hybridPrediction,observeExtra,inferTrainingSamples} from '../engine/hybrid.mjs';
import {evaluateHybrid} from '../engine/comparison.mjs';
import {testPlan} from '../engine/training.mjs';

test('hybrid never reads the privileged evaluator secret; only measured actions',()=>{
 const w=createWorld(193),sealed={
  intervene:w.intervene,teacher(){throw Error('PRIVILEGED TEACHER MUST NOT BE READ')}
 };
 const events=TOOLS.flatMap(tool=>[[0,0],[1,2],[3,5]].map(state=>sealed.intervene(state,tool)));
 const context=encodeContext(events),belief=makeBelief(events);
 const net=new CausalNet(17),result=hybridPrediction(net,belief,[2,4],'amber',context);
 assert.equal(result.state.length,2);
 const generated=inferTrainingSamples(events,context,{perTool:18});
 assert.ok(generated.samples.length>0);
 for(const sample of generated.samples){
  assert.equal(sample.input.length,23);
  assert.equal(sample.provenance,'inferred-consensus');
  assert.deepEqual(sample.target,
   sealed.intervene([
    Math.round(sample.input[0]*6),Math.round(sample.input[1]*6)],
    TOOLS[sample.input.slice(2,5).indexOf(1)]
   ).to);
 }
});

test('contradictory evidence makes causal organ abstain rather than manufacture truth',()=>{
 const w=createWorld(79),observed=senseProbes(w),organ=makeBelief(observed);
 organ.observe({tool:'amber',from:observed[0].from,to:[6,6]});
 const x=causalPrediction(organ,[4,2],'amber');
 assert.equal(x.state,null);
 assert.equal(x.source,'abstain');
 const neural=new CausalNet(17);
 assert.equal(hybridPrediction(neural,organ,[4,2],'amber',encodeContext(observed)).source,'neural-fallback');
});

test('active probes are genuine interventions, not teacher rules or repeated measurements',()=>{
 const world=createWorld(6005),organ=makeBelief(senseProbes(world)),before=organ.events.amber.length+
   organ.events.violet.length+organ.events.cobalt.length;
 const added=observeExtra(world,organ,{extra:5,mode:'active',seed:6006});
 assert.equal(added.length,5);
 assert.equal(organ.events.amber.length+organ.events.violet.length+organ.events.cobalt.length,before+5);
 const keys=added.map(e=>e.tool+'@'+e.from.join(','));
 assert.equal(new Set(keys).size,5);
});

test('hybrid comparison uses equal held-out state sets and equal extra observation budgets',()=>{
 const net=new CausalNet(17),before=JSON.stringify(net.snapshot());
 const report=evaluateHybrid(net,{worlds:20,extra:2,seed:6400021,goalsPerWorld:2});
 assert.equal(report.worlds,20);
 const m=report.models;
 assert.equal(m['neural-only'].observationsPerWorld,9);
 assert.equal(m['hybrid-probes'].observationsPerWorld,9);
 assert.equal(m['hybrid-active'].observationsPerWorld,11);
 assert.equal(m['hybrid-random'].observationsPerWorld,11);
 const counts=Object.values(m).map(x=>x.transitions);
 assert.equal(new Set(counts).size,1);
 assert.ok(m['hybrid-active'].exactTransition>m['neural-only'].exactTransition,
   JSON.stringify(m));
 assert.equal(JSON.stringify(net.snapshot()),before,'Evaluation modified neural weights');
});

test('untrained causal organ and learned neural fallback remain separately attributable',()=>{
 const net=new CausalNet(17),world=createWorld(7017);
 const events=senseProbes(world),context=encodeContext(events),organ=makeBelief(events);
 const task=generateTask(world,7717);
 const trial=testPlan(world,task,(state,tool)=>hybridPrediction(net,organ,state,tool,context).state);
 assert.ok(trial.actions.every(a=>TOOLS.includes(a)));
 assert.deepEqual(trial.goal,task.goal);
});
