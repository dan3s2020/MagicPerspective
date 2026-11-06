import test from 'node:test';
import assert from 'node:assert/strict';
import {Discoverer,KIND} from '../../v17/transcend/torus-aether/worlds/exercise.mjs';
import {makeMaze,ACTIONS} from '../../v17/transcend/torus-aether/worlds/labyrinth.mjs';
import {ObservedQAAtlas,wordF1} from './atlas.mjs';

const seeded=()=>{
  const d=new Discoverer(11);
  // Structural test only. Real run learns these values by living original mazes.
  d.endIn[KIND.target]=50;d.enter[KIND.target]=1;
  d.pass[KIND.floor]=100;d.block[KIND.floor]=1;
  d.pass[KIND.wall]=1;d.block[KIND.wall]=100;
  return d;
};
// IMPORTANT: Preserve all 4 directional slots when testing algorithm equivalence.
function directionalGrid(n){
  return Array.from({length:n*n},(_,i)=>ACTIONS.map(([dx,dy])=>{
    const x=i%n+dx,y=Math.floor(i/n)+dy;
    return x<0||y<0||x>=n||y>=n?null:y*n+x;
  }).map(j=>j??-1));
}
test('unchanged native Discoverer.shape is identical on 2D grid and explicit graph ports',()=>{
  for(let seed=10;seed<40;seed++){
    const w=makeMaze(seed,9);
    const ret=Array.from(w.wall,v=>v?KIND.wall:KIND.floor);
    ret[w.goal]=KIND.target;ret[w.start]=KIND.self;
    const d=seeded();
    const legacy=d.shape(ret,w.n,w.start);
    // Original 2D graph neighbor slots may be -1 for an out-of-bounds move;
    // graph extension accepts only real observed edges; compare by preserving
    // relative action slots via self-loop on invalid edges (V[self] is never > V[self]).
    const adj=directionalGrid(w.n).map((xs,i)=>xs.map(j=>j<0?i:j));
    const viaGraph=d.shape(ret,w.n,w.start,adj);
    assert.deepEqual(viaGraph,legacy,'seed '+seed);
  }
});
test('learned observed Q/A graph is navigated by ORIGINAL shape, not a replacement planner',()=>{
  const a=new ObservedQAAtlas();
  a.observe('Where is the archive?','The archive is inside the library. It is on the second floor.',12);
  a.observe('What is a bicycle?','A bicycle is a two wheeled vehicle.',13);
  const d=seeded();
  const result=a.plan('Please tell me where the archive is located',d,{candidates:2});
  assert.equal(result.ok,true);
  assert.ok(result.steps.some(s=>s.label.includes('archive')));
  assert.ok(result.graphEdges>0);
  assert.ok(result.steps.length>=4);
  assert.equal(result.answer,a.examples[0].answer);
  assert.equal(result.evidenceIndex,12);
});
test('held-out sources never enter graph without explicit observation',()=>{
  const a=new ObservedQAAtlas();
  a.observe('What is a catalyst?','A substance changing reaction rate',11);
  assert.equal(a.examples.some(x=>x.sourceIndex===99),false);
  const g=a.build('what is a catalyst');
  assert.ok(g.sourceIndices.every(x=>x!==99));
});
test('no invented semantic generalization from an unrelated question',()=>{
  const a=new ObservedQAAtlas();
  a.observe('Which city has the red tower?','City A has the tower',5);
  const out=a.plan('Explain protein folding quantum mechanics',seeded());
  assert.equal(out.ok,false);
  assert.equal(out.answer,undefined);
});
test('F1 scores observed words with multiplicity',()=>{
  assert.equal(wordF1('cat cat dog','cat dog'),.8);
});
