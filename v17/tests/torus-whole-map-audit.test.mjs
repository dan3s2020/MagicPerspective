import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateWholeMapBaseline} from '../transcend/torus-aether/worlds/whole-map-audit.mjs';

test('frozen map benchmark does not claim the mathematic planner learned paths',()=>{
  const a=evaluateWholeMapBaseline({count:12,seed:98,dimensions:[5,6,7]});
  assert.equal(a.mode,'REFERENCE_ALGORITHM_ONLY');
  assert.equal(a.learnedNavigationAccuracy,null);
  assert.equal(a.modelLearnedWorldFromText,false);
  assert.equal(a.count,12);
  assert.equal(a.cases.length,12);
  assert.equal(a.solved,12);
  assert.equal(a.optimalRate,1);
  assert.ok(a.cases.every(x=>x.internalPathBeforeFirstMove&&x.collisions===0));
});
test('fresh maps and changed seeds are independent benchmark configurations',()=>{
  const a=evaluateWholeMapBaseline({count:4,seed:101});
  const b=evaluateWholeMapBaseline({count:4,seed:101});
  const c=evaluateWholeMapBaseline({count:4,seed:102});
  const strip=x=>x.cases.map(v=>({seed:v.seed,nodes:v.nodes,walls:v.walls,steps:v.steps,optimal:v.optimal}));
  assert.deepEqual(strip(a),strip(b));
  assert.notDeepEqual(strip(a),strip(c));
});
test('fails closed when larger atlas or invalid probe count would be needed',()=>{
  assert.throws(()=>evaluateWholeMapBaseline({count:200}),/count must/);
  assert.throws(()=>evaluateWholeMapBaseline({count:4,dimensions:[11]}),/Invalid test/);
});
