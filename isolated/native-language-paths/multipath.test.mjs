import test from 'node:test';
import assert from 'node:assert/strict';
import {Discoverer,KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';
import {ObservedQAAtlas} from './atlas.mjs';
import {exactShortestPaths,discountedGoalOccupancy,nativeAttractionField,inspectNativeVsSuccessor} from './multipath.mjs';
function disc(){
  const d=new Discoverer(11);
  // A structural unit-test fixture only; REAL corpus run learns these from
  // actual V17 maze episodes before evaluating the language graph.
  d.endIn[KIND.target]=100;d.enter[KIND.target]=1;
  d.pass[KIND.floor]=1000;d.block[KIND.floor]=1;
  d.pass[KIND.wall]=1;d.block[KIND.wall]=1000;
  return d;
}
function branching(){
  const labels=['S','A','B','C','deadA','E','F','G','deadB','T'];
  const adj=[[1,2],[3,4],[5,6,7,8],[9],[],[9],[9],[9],[],[]];
  const nodes=labels.map((label,i)=>({label,kind:i===0?KIND.self:i===9?KIND.target:KIND.floor}));
  return {nodes,adj};
}
test('exact shortest path multiplicity is distinct from successor occupancy',()=>{
  const g=branching(),p=exactShortestPaths(g),s=discountedGoalOccupancy(g);
  assert.equal(p.distance,3);
  assert.equal(p.count,'4');
  assert.equal(p.choices.find(x=>x.to===1).shortestCount,'1');
  assert.equal(p.choices.find(x=>x.to===2).shortestCount,'3');
  assert.ok(s.values[2]>s.values[1],JSON.stringify(s.values));
});
test('optional successor channel changes only a genuinely tied native field step',()=>{
  const g=branching(),d=disc();
  const out=inspectNativeVsSuccessor(g,d);
  assert.equal(out.native.reached,true);
  assert.equal(out.successorTie.reached,true);
  assert.equal(out.native.path[1],1);
  assert.equal(out.successorTie.path[1],2);
  assert.ok(out.successorTie.changedSteps>=1);
  assert.ok(out.successorTie.actualTieSteps>=1);
  assert.equal(out.shortest.count,'4');
  const f=nativeAttractionField(g,d);
  assert.equal(f.values[1],f.values[2]);
  assert.deepEqual(out.native.actions,d.shape(g.nodes.map(x=>x.kind),0,0,g.adj));
});
test('no goal means no fabricated path or shortest count',()=>{
  const g={nodes:[{kind:KIND.self},{kind:KIND.floor}],adj:[[1],[]]};
  const r=inspectNativeVsSuccessor(g,disc());
  assert.equal(r.native.reached,false);
  assert.equal(r.successorTie.reached,false);
  assert.equal(r.shortest.count,'0');
  assert.equal(r.shortest.length,null);
});
test('cycles do not cause infinite paths; only shortest action sequences are counted',()=>{
  const g={nodes:[{kind:KIND.self},{kind:KIND.floor},{kind:KIND.floor},{kind:KIND.target}],
    adj:[[1,2],[0,3],[3],[3]]};
  const r=inspectNativeVsSuccessor(g,disc());
  assert.equal(r.shortest.length,2);
  assert.equal(r.shortest.count,'2');
  assert.equal(new Set(r.successorTie.path).size,r.successorTie.path.length);
});
test('real-corpus atlas shape and path-count integration cannot read an unseen answer',()=>{
  const a=new ObservedQAAtlas();
  a.observe('Where is the archive?','The archive is in the library.',10);
  a.observe('Where is the library?','It is on the second floor.',11);
  const g=a.build('Where is the archive located?');
  assert.ok(g.nodes.length>1);
  const r=inspectNativeVsSuccessor(g,disc());
  assert.equal(r.native.reached,true);
  assert.ok(r.shortest.count!=='0');
  assert.deepEqual(g.sourceIndices.every(index=>index!==99),true);
});
test('invalid graph edge is refused instead of allowing a hidden oracle',()=>{
  assert.throws(()=>exactShortestPaths({nodes:[{kind:KIND.target}],adj:[[2]]}));
});
