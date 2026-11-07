import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import { Discoverer as Original, KIND as OldKind } from '../transcend/torus-aether/worlds/exercise-v17-EXACT-ORIGINAL-SNAPSHOT.mjs';
import { Discoverer as Current, KIND } from '../transcend/torus-aether/worlds/exercise.mjs';
import { makeMaze } from '../transcend/torus-aether/worlds/labyrinth.mjs';
import { LearnedCognitiveMap, tokenizeWorld } from '../transcend/torus-aether/worlds/learned-cognitive-map.mjs';

test('original V17 source snapshot matches the historical Git blob byte-for-byte',()=>{
 const bytes=readFileSync(new URL('../transcend/torus-aether/worlds/exercise-v17-EXACT-ORIGINAL-SNAPSHOT.mjs',import.meta.url));
 const blob=createHash('sha1').update(Buffer.from('blob '+bytes.length+String.fromCharCode(0))).update(bytes).digest('hex');
 assert.equal(blob,'df194ecb6999cce36c15fb9f4f94d3a36ae22fcb');
});

// This is a non-negotiable source-level regression gate, not a claim of
// natural-language understanding. Any deviation from the original 2D
// V17 field/traversal is an error even when an unrelated N-D test passes.
test('original V17 Discoverer maze shape is byte-for-byte equivalent in output over 90 seeded worlds and three temperatures',()=>{
  assert.deepEqual(KIND,OldKind);
  for (let i=0;i<90;i++) {
    const n=[7,9,11,13,15][i%5], w=makeMaze(170001+i*7919,n);
    const retina=Array.from(w.wall,v=>v?KIND.wall:KIND.floor);
    retina[w.goal]=KIND.target;retina[w.start]=KIND.self;
    for (const temp of [0,.35,1.3]) {
      const a=new Original(41+i), b=new Current(41+i);
      a.pass=[2+i%3,1,3,4];b.pass=a.pass.slice();
      a.block=[1,10,1,1];b.block=a.block.slice();
      a.enter=[1,1,1,1];b.enter=a.enter.slice();
      a.endIn=[0,0,5,0];b.endIn=a.endIn.slice();
      a.temp=temp;b.temp=temp;
      assert.deepEqual(b.shape(retina,n,w.start),a.shape(retina,n,w.start),
        `V17 maze changed for seed ${i} n=${n} temp=${temp}`);
      assert.equal(b.r.s,a.r.s,'V17 random draw count changed');
    }
  }
});

const goal={slots:{0:'She',2:'calm'}};
const trained=()=>{
  const m=new LearnedCognitiveMap();
  for(const s of ['She is happy.','She is tired.','He is tired.','He is calm.'])m.observeWorld(s);
  return m;
};
test('native text map invokes exact original method; whole shape exists before action and has observed transformations',()=>{
  const m=trained(), before=JSON.stringify(m.export());
  const p=m.formSolution('He is calm.',goal,{seed:4105,temperature:0});
  assert.equal(p.directOriginalMethod,'Discoverer.shape');
  assert.equal(p.planningLaw,'ORIGINAL_V17_ATTRACTION_0.97');
  assert.equal(p.found,true);
  assert.ok(p.world.unseenStates>0);
  assert.ok(p.path.length>0);
  assert.ok(p.path.every(h=>p.world.neighbors[h.from].some(edge=>edge.to===h.to&&edge.action===h.action)));
  assert.deepEqual(m.export(),JSON.parse(before),'Frozen planning must not mutate learning state');
  assert.equal(m.examples.has(tokenizeWorld('She is calm.').join('\u001f')),false,
    'Do not call a memorized finished sentence a new solution');
});

test('temperature uses a reproducible independent RNG without changing brain learning state',()=>{
  const m=trained(), before=JSON.stringify(m.export());
  const args={seed:8081,temperature:1};
  const a=m.formSolution('He is calm.',goal,args),b=m.formSolution('He is calm.',goal,args);
  assert.deepEqual(a.path,b.path);
  assert.equal(a.noise,1);
  assert.equal(JSON.stringify(m.export()),before);
});

test('path failure is a wall, feedback is persisted and a damaged atlas cannot fake a solved route',()=>{
  const m=trained(),p=m.formSolution('He is calm.',goal,{temperature:0});
  const before=m.report().realObservedActions;
  const o=m.execute(p,{step:state=>({after:state,accepted:false})});
  assert.equal(o.solved,false);
  assert.ok(m.report().realObservedActions>before);
  const resumed=LearnedCognitiveMap.restore(m.export());
  const q=resumed.formSolution('He is calm.',goal,{temperature:0});
  if(q.found)assert.notEqual(q.path[0]?.action,p.path[0]?.action);
  resumed.rules.clear();
  assert.equal(resumed.formSolution('He is calm.',goal).found,false);
});

test('unknown-goal and missing learned corridor must abstain; target slots alone do not invent an answer',()=>{
  const m=trained();
  assert.equal(m.formSolution('He is calm.',{slots:{0:'UnobservedProperName',2:'calm'}}).found,false);
  assert.throws(()=>m.formSolution('He is calm.',{}),/constraints/);
  const blank=new LearnedCognitiveMap();
  assert.equal(blank.formSolution('He is calm.',goal).found,false);
});

test('native observed 2-step transformation route and cold checkpoint are consistent',()=>{
  const m=new LearnedCognitiveMap();
  m.observeExternalTransition({domain:'maze',before:[0,0],action:'right',after:[1,0]});
  m.observeExternalTransition({domain:'maze',before:[1,0],action:'up',after:[1,1]});
  const a=m.formObservedWorld('maze',[0,0],{slots:{0:1,1:1}});
  const b=LearnedCognitiveMap.restore(m.export()).formObservedWorld('maze',[0,0],{slots:{0:1,1:1}});
  assert.equal(a.found,true);
  assert.deepEqual(a.path,b.path);
  assert.equal(a.path.length,2);
  assert.deepEqual(a.path.map(p=>p.action),['right','up']);
});
