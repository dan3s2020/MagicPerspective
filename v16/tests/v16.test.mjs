import test from 'node:test';
import assert from 'node:assert/strict';
import {Organism, makeMaze, optimalActions, evaluate, seedOf, SEEDS, RNG} from '../web/engine.mjs';

test('maze has a reachable goal and optimal actions decrease distance', () => {
  const w = makeMaze(seedOf(SEEDS.train, 1), 9);
  assert.ok(w.dist[w.start] > 0 && Number.isFinite(w.dist[w.start]));
  assert.ok(optimalActions(w, w.start).length >= 1);
});
test('recorded life yields frames with everything the UI draws', () => {
  const org = new Organism({seed: 1, bodies: true}), w = makeMaze(seedOf(SEEDS.train, 2), 7);
  const {frames} = org.live(w, {record: true});
  const f = frames[1] || frames[0];
  for (const k of ['pos', 'h', 'pi', 'probs', 'move', 'plan', 'obs', 'opt']) assert.ok(k in f, k);
  assert.equal(f.h.length, org.H); assert.equal(f.pi.length, org.L);
});
test('both A+B and the control learn to solve unseen mazes', () => {
  for (const bodies of [true, false]) {
    const org = new Organism({seed: 3, bodies}), rng = new RNG(5), before = evaluate(org, {count: 20}).solved;
    for (let e = 0; e < 600; e++) org.live(makeMaze(seedOf(SEEDS.train, e), [7, 9][e % 2]), {learn: true, rng});
    const after = evaluate(org, {count: 20}).solved;
    assert.ok(after > before && after >= 0.5, `bodies=${bodies}: ${before} -> ${after}`);
  }
});
