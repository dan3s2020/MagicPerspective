// Smoke acceptance for the ORIGINAL V17 APIs used by the isolated real training mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import {Brain} from '../../v17/transcend/torus-aether/devour/brain.mjs';
test('real V17 text + labyrinth + transformation through one shared brain',()=>{
  const b=new Brain({seed:11,rules:{}});
  b.beginExercise();
  for(const y of Buffer.from('Q: 2+2?\nA: 4\n\n','ascii')){b.live(y);b.chars++;}
  assert.ok(b.lived>0);
  const m=b.playMaze(true);
  assert.equal(typeof m.solved,'boolean');
  assert.ok(m.wall.length===m.n*m.n);
  assert.ok(m.path.length>0);
  const t=b.playTransform(true);
  assert.equal(typeof t.solved,'boolean');
  assert.ok(Array.isArray(b.trans.last.frames));
  assert.ok(b.trace.nodes.size>0);
  assert.ok(b.trace.geo.U.size>0);
});
