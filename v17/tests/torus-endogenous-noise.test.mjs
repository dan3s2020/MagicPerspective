import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {Brain} from '../transcend/torus-aether/devour/brain.mjs';
import {NoiseAgency} from '../transcend/torus-aether/worlds/noise-agency.mjs';

test('organism selects its own noise site, strength and zero; learns from observed outcomes', () => {
  const N = new NoiseAgency(17), seen = new Set();
  for (let i = 0; i < 280; i++) {
    const d = N.decide({domain:'text',known:true,planned:true});
    seen.add(d.site);
    assert.ok(d.strength >= 0 && d.strength <= 1);
    // A controlled observation generator where visual perspective variation
    // helps the local task; this verifies policy ADAPTATION, not real-world success.
    N.learn(d, {correct: d.site === 'perception'});
  }
  const status = N.status();
  assert.ok(seen.has('none'), 'zero noise must be a real selectable action');
  assert.ok(seen.has('perception'), 'perception portal must be sampled');
  assert.ok(seen.has('imagination'), 'imagination portal must be sampled');
  assert.ok(status.bySite.perception > status.bySite.none,
    'policy must prefer historically more useful perceptual noise to none');
  assert.equal(status.decisions, 280);
  assert.equal(status.noiseChoices, 280 - status.bySite.none);
  assert.ok(status.contexts['text:known:plan'].some(v=>v.reward !== null));
});

test('actual 2D maze and causal transformation physically use, update and save one noise brain', {timeout:90000}, () => {
  const b = new Brain({rules:'winner',seed:19});
  const N = b.enableEndogenousNoise();
  b.setControls({pnoise:0,gnoise:0,ltemp:0}); // not a hidden external slider
  for (const y of Array.from('A B A B B A A B\n'.repeat(20), c=>c.charCodeAt(0))) b.live(y);
  const pre = N.total;
  assert.ok(pre > 0, 'real text training must update the endogenous policy');
  for (let i=0;i<4;i++) b.playMaze(false);
  assert.ok(N.total > pre, 'actual labyrinth steps must update the same policy');
  assert.ok(N.bySite.none > 0 && N.noisy > 0, 'its learned choices include no noise and nonzero noise');
  const afterMaze = N.total;
  b.playTransform(false);
  assert.ok(N.total > afterMaze, 'causal transformation steps must update same organism policy');
  const domains = new Set(N.recent.map(x=>x.domain));
  assert.ok(domains.has('transform'), 'last real decisions came from actual transformation');
  assert.ok(N.policy.has('text:known:plan') || N.policy.has('text:known:search'));
  assert.ok([...N.policy.keys()].some(k=>k.startsWith('maze:')));
  assert.ok([...N.policy.keys()].some(k=>k.startsWith('transform:')));
  const frozenBefore = N.total;
  b.test([65, 66, 65, 66, 65, 66, 65, 66]);
  b.testMazes(1);
  assert.equal(N.total, frozenBefore, 'frozen tests must not change organism-owned noise policy');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-noise-check-'));
  try {
    const file = path.join(tmp,'brain.v8');
    b.save(file);
    const recovered = Brain.load(file);
    assert.ok(recovered.noiseAgent instanceof NoiseAgency);
    assert.deepEqual(recovered.noiseAgent.status(), b.noiseAgent.status());
    const choice = {domain:'maze',known:true,planned:false};
    assert.deepEqual(recovered.noiseAgent.decide(choice), b.noiseAgent.decide(choice),
      'noise RNG and learned policy must continue exactly after checkpoint');
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
});

test('noise affects actual choices without altering real world observations', () => {
  const N = new NoiseAgency(7);
  const original = [1,2,3,4,5,6,7,8,9], snap = original.slice();
  const changed = N.perceive(original, {site:'perception',strength:1});
  assert.deepEqual(original,snap);
  assert.notStrictEqual(changed,original);
  let overrode=false;
  for(let i=0;i<8;i++) if(N.output(0,8,{site:'action',strength:1})!==0)overrode=true;
  assert.equal(overrode,true,'chosen action noise must modify an emitted action');
  assert.equal(N.output(3,8,{site:'none',strength:0}),3,'zero noise must leave action unchanged');
});
