import test from 'node:test';
import assert from 'node:assert/strict';
import {finitePoint,geometryMap,rollingState,fromFrozenEvaluation,fromNativeChat,fromLiveTraining} from './text-journey5d.mjs';
const geom=[...Array(128)].map((_,c)=>[c,[0.11+c*.0004,0.2+c*.0005,0.3+c*.0006,0.4+c*.0003,0.5+c*.0002]]);
test('learned V17 coordinates, not fabricated embedding',()=>{
 const m=geometryMap(geom);assert.equal(m.size,128);assert.equal(finitePoint(m.get(65)),true);
 const state=rollingState([65,66,67],m);assert.equal(state.valid,true);assert.equal(state.u.length,5);
 assert.equal(rollingState([1234],m).valid,false);
});
test('frozen evaluation preserves distinct open-loop, teacher-forced and observed paths',()=>{
 // prompt Q:A: then truth 'BA', initial rollout 'BC'. Online guesses 'B','B'.
 const truth=[81,58,10,65,58,66,65],guesses=[81,58,10,65,58,66,66];
 const ex={rows:truth.map((c,i)=>[c,guesses[i]]),a0:5,shape:'BC',shapeSame:.5,
   replans:[{at:1,source:'align.write/teacher-forced',preview:'A'}]};
 const J=fromFrozenEvaluation(ex,geom);
 assert.deepEqual(J.observed,[66,65]);assert.deepEqual(J.shape,[66,67]);
 assert.equal(J.firstDeparture,1);assert.deepEqual(J.errorIndices,[1]);
 assert.equal(J.plan.length,3);assert.equal(J.actual.length,3);assert.equal(J.online.length,2);
 assert.equal(J.replans[0].points.length,2);
});
test('missing real geometry never draws synthetic coordinate',()=>{
 const J=fromFrozenEvaluation({rows:[[81,65],[65,66]],a0:1,shape:'A'},[]);
 assert.equal(J.plan[1].valid,false);assert.equal(J.actual[1].valid,false);
});
test('native chat uses actual operator path and does not invent alternative',()=>{
 const R={text:'She is calm.',gear:{used:true,goal:{0:'She'},route:[{before:'He is calm',after:'She is calm',slot:0,evidence:2}],steps:[{at:0,predicted:'S',executed:'S'}]}};
 const J=fromNativeChat(R,geom,'Describe She');assert.equal(J.mode,'native-chat');
 assert.equal(J.macro.length,1);assert.equal(J.alternatives.length,0);assert.equal(J.actual.length,R.text.length+1);
});

test('live training trace distinguishes CUDA C/A replay from online align and records only actual events',()=>{
 const T=[[100,65,66,66,'chain-gpu-replay'],[101,66,66,65,'align-online']];
 const J=fromLiveTraining(T,geom);assert.equal(J.mode,'live-training');assert.equal(J.replay,1);
 assert.equal(J.aligned,1);assert.deepEqual(J.observed,[65,66]);assert.deepEqual(J.errorIndices,[0]);
});
