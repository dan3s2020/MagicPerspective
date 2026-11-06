import test from 'node:test';
import assert from 'node:assert/strict';
import {LearnedCognitiveMap,tokenizeWorld} from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';

const train=()=>{
 const map=new LearnedCognitiveMap();
 for(const s of ['She is happy.','She is tired.','He is tired.','He is calm.'])map.observeWorld(s);
 return map;
};
const goal={slots:{0:'She',2:'calm'}};

test('the complete corpus is absorbed before planning; the held-out answer is never observed',()=>{
 const m=train();
 assert.equal(m.examples.size,4);
 assert.equal(m.examples.has(tokenizeWorld('She is calm.').join('\u001f')),false);
 const r=m.formSolution('He is calm.',goal);
 assert.equal(r.found,true);
 assert.equal(r.novelGoal,true);
 assert.equal(r.plannedBeforeAction,true);
 assert.equal(r.path.length,1);
 assert.equal(r.world.targets.length,1);
 assert.equal(r.planningLaw,'ORIGINAL_V17_ATTRACTION_0.97');
});
test('the organism moves only after its full internal shape is discovered',()=>{
 const m=train(),p=m.formSolution('He is calm.',goal);
 assert.equal(m.report().realObservedActions,0);
 const result=m.execute(p,{step:(_state,_action,predicted)=>({after:predicted,accepted:true})});
 assert.equal(result.solved,true);
 assert.equal(result.final.join(' '),'She is calm .');
 assert.equal(m.report().realObservedActions,1);
});
test('a real rejected action becomes a wall; no oracle goal injected into training',()=>{
 const m=train(),p=m.formSolution('He is calm.',goal);
 const fail=m.execute(p,{step:(state)=>({after:state,accepted:false})});
 assert.equal(fail.solved,false);
 assert.equal(m.report().rejectedActions,1);
 const after=m.formSolution('He is calm.',goal);
 // Another route may exist, just like in a real labyrinth; only the ACTUAL
 // failed transition is blocked, not the entire candidate world.
 if(after.found)assert.ok(after.path[0].action!==p.path[0].action,
   'The failed action must never be silently reused at the same state');
});
test('the world does NOT label unobserved sentences as invalid walls',()=>{
 const m=train(),r=m.formSolution('He is calm.',goal);
 assert.ok(r.world.unseenStates>0);
 assert.equal(m.report().rejectedActions,0);
});
test('the same original actor can contribute real observed cross-domain samples',()=>{
 const m=train(),p=m.formSolution('He is calm.',goal),events=[];
 const r=m.execute(p,{brain:{observeShared:x=>events.push(x)},
  step:(_s,_a,pred)=>({after:pred,accepted:true})});
 assert.equal(r.solved,true);
 assert.equal(events.length,1);
 assert.equal(events[0].domain,'text');
 assert.equal(events[0].after.join(' '),'She is calm .');
});
test('successor occupancy looks beyond one next symbol and respects discount',()=>{
 const m=train(),p=m.formSolution('He is calm.',goal);
 const sr=m.successor(p.world,{gammas:[.2,.5,.8],horizon:10});
 assert.equal(sr.length,3);
 assert.ok(sr[0].goalOccupancyAtStart<sr[1].goalOccupancyAtStart);
 assert.ok(sr[1].goalOccupancyAtStart<sr[2].goalOccupancyAtStart);
});
test('checkpoint serializes and restores the original learned graph without retraining',()=>{
 const m=train(),a=m.formSolution('He is calm.',goal),x=LearnedCognitiveMap.restore(m.export()),b=x.formSolution('He is calm.',goal);
 assert.deepEqual(a.path.map(t=>t.action),b.path.map(t=>t.action));
 assert.equal(x.report().inducedActionRules,m.report().inducedActionRules);
});
test('permuted or destroyed structural evidence removes the successful path',()=>{
 const m=train(),r=m.formSolution('He is calm.',goal);assert.equal(r.found,true);
 m.rules.clear();
 assert.equal(m.formSolution('He is calm.',goal).found,false);
});
test('no goal answer, unsupported sample source, or unbounded world allocation is accepted',()=>{
 const m=train();
 assert.throws(()=>m.formSolution('He is calm.',{}),/constraints/);
 assert.throws(()=>m.buildWorld('He is calm.',goal,{maxNodes:20001}),/limits/);
 assert.throws(()=>m.observeIntervention({before:'He is calm.',action:'fiction',after:'She is calm.',accepted:true}),/not learned/);
});
test('a direct exact-memory lookup cannot solve the novel held-out answer',()=>{
 const m=train();
 assert.equal(m.examples.has(tokenizeWorld('She is calm.').join('\u001f')),false);
 assert.equal(m.formSolution('He is calm.',goal).found,true);
});
