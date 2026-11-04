// node --test tests/   (from v13/)
import test from 'node:test'; import assert from 'node:assert/strict';
import {CORPUS} from '../web/corpus.js'; import {prepare, Loop, LEVELS, ORGS} from '../web/engine.mjs';
const d = prepare(CORPUS.slice(0, 6000));
test('the loop: α and Ω are neighbours on the ring, far apart on the cut line', () => {
  assert.equal(Math.abs(Loop.ringD(0, LEVELS.length - 1, true)), 1); assert.equal(Math.abs(Loop.ringD(0, LEVELS.length - 1, false)), LEVELS.length - 1); });
test('every organism predicts a proper distribution BEFORE the character is learned', () => {
  const L = new Loop(d); for (let i = 0; i < 300; i++) L.step(); L.step(true); const s = L.last;
  for (const k of ORGS) { const z = s.out[k].reduce((a, b) => a + b, 0); assert.ok(Math.abs(z - 1) < 1e-9, k); }
  // the true character's context entry did not yet contain this character when predicting
  const L2 = new Loop(d); for (let i = 0; i < 300; i++) L2.step(); const t = L2.t, key = L2.key(1, t), e = L2.mem[1].get(key), before = e ? e.c[d.ids[t]] : 0;
  L2.step(true); assert.equal(L2.mem[1].get(key).c[d.ids[t]], before + 1); });
test('same stream, same result (deterministic)', () => {
  const a = new Loop(d), b = new Loop(d); for (let i = 0; i < 2000; i++) { a.step(); b.step(); }
  assert.deepEqual(a.summary(), b.summary()); });
test('the perspective of L moves (it bends), the frozen one does not', () => {
  const L = new Loop(d, {frozenTheta: 2.5}); const th0 = L.theta.L; for (let i = 0; i < 3000; i++) L.step();
  assert.notEqual(L.theta.L, th0); assert.equal(L.theta['L-frozen'], 2.5); });
test('the cut line never crosses from α to Ω', () => {
  const L = new Loop(d, {mode: 'pull', eta: 0.8}); let prev = L.theta['L-cut'];
  for (let i = 0; i < 3000; i++) { L.step(); const now = L.theta['L-cut']; assert.ok(Math.abs(now - prev) <= 0.8 * (LEVELS.length - 1) + 1e-9); assert.ok(now >= 0 && now <= LEVELS.length - 1); prev = now; } });

test('checkpoints restore all learned counts, weights, perspectives, and scores without replay', () => {
  const original = new Loop(d, {sigma: 1.1, eta: 0.08});
  for (let i = 0; i < 950; i++) original.step(true);
  const snapshot = JSON.parse(JSON.stringify(original.snapshot()));
  assert.equal(snapshot.t, original.t);
  assert.ok(snapshot.mem.some(level => level.length > 0));
  const restored = Loop.restore(d, snapshot);
  assert.deepEqual(restored.summary(), original.summary());
  assert.deepEqual([...restored.uni], [...original.uni]);
  assert.deepEqual([...restored.s], [...original.s]);
  assert.deepEqual(restored.theta, original.theta);
  assert.deepEqual(restored.snapshot(), snapshot);
  for (let i = 0; i < 150; i++) {
    original.step(true); restored.step(true);
    assert.deepEqual(restored.summary(), original.summary());
    assert.deepEqual(restored.theta, original.theta);
    for (const k of ORGS) assert.deepEqual([...restored.last.out[k]], [...original.last.out[k]]);
  }
});
test('wrong corpus and corrupted checkpoints do not restore silently', () => {
  const engine = new Loop(d); for (let i = 0; i < 100; i++) engine.step();
  const snapshot = engine.snapshot();
  assert.throws(() => Loop.restore(prepare(CORPUS.slice(0, 4500)), snapshot), /incompatibil/);
  const broken = JSON.parse(JSON.stringify(snapshot));
  broken.mem[0][0][2].push([1000000, 1]);
  assert.throws(() => Loop.restore(d, broken), /incompatibil/);
});
test('the engine learns next-character regularities, instead of just moving colored points', () => {
  const simple = prepare('abc'.repeat(2100));
  const engine = new Loop(simple);
  for (let i = 0; i < 120; i++) engine.step();
  const earlyBpc = engine.stats.A.bits / engine.stats.A.n;
  while (engine.t < simple.cut) engine.step();
  const before = engine.stats.A.bits, n = engine.stats.A.n;
  for (let i = 0; i < 120; i++) engine.step();
  const laterBpc = (engine.stats.A.tbits / engine.stats.A.tn);
  assert.ok(earlyBpc > laterBpc + 0.1, `A should learn a predictable stream: ${earlyBpc} vs ${laterBpc}`);
  assert.ok(engine.stats.A.n === n && engine.stats.A.bits === before, 'test data must be scored separately');
});
test('a completed or restored stream cannot read past the last character', () => {
  const simple = prepare('abc'.repeat(100));
  const engine = new Loop(simple);
  while (engine.step()) {}
  assert.equal(engine.t, simple.ids.length);
  assert.equal(engine.step(), false);
  assert.equal(Loop.restore(simple, engine.snapshot()).step(), false);
});
