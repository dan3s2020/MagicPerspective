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
