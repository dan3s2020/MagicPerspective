// One organism: the aligning graph that keeps everything, one body for every world, the person's determinism/noise
// controls acting on the living brain, evaluations that draw new worlds, nothing deleted, the field still learning.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";
import {AligningGraph} from "../transcend/torus-aether/align.mjs";
import {bodyEffect} from "../transcend/torus-aether/worlds/exercise.mjs";

const text = fs.readFileSync(new URL("../docs/TORUS_AETHER_ABC_20261104.md", import.meta.url), "utf8");
const bytes = Array.from(text, ch => { const c = ch.charCodeAt(0); return c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63; });

test("the aligning graph predicts unseen text better as it lives more, and keeps every symbol", () => {
  const g = new AligningGraph(), train = bytes.slice(0, 28000), held = bytes.slice(30000, 33000);
  for (const y of train.slice(0, 6000)) g.live(y); const early = g.readFrozen(held);
  for (const y of train.slice(6000)) g.live(y); const late = g.readFrozen(held);
  assert.equal(g.mem.n, train.length); assert.equal(g.lived, train.length);
  assert.ok(late > early, `${early} -> ${late}`); assert.ok(late > .4, String(late));
});

test("temperature and noise make reading stochastic; at 0 it is deterministic", () => {
  const g = new AligningGraph(); for (const y of bytes.slice(0, 15000)) g.live(y); const held = bytes.slice(20000, 21500);
  assert.equal(g.readFrozen(held), g.readFrozen(held));
  const a = g.readFrozen(held, null, {T: 1, noise: .5}), b = g.readFrozen(held, null, {T: 1, noise: .5});
  assert.notEqual(a, b);
});

test("one brain: field learns, aligning graph lives, body is shared, saved and restored the same", () => {
  const b = new Brain({rules: "winner", c: {}, seed: 11});
  for (const y of bytes.slice(0, 12000)) { b.live(y); b.chars++; }
  for (let i = 0; i < 25; i++) b.playMaze(false);
  const t = b.test(bytes.slice(30000, 32000));
  assert.ok(t.field > .2, "field " + t.field); assert.ok(t.aligned > .3, "aligned " + t.aligned);
  const moved = [0, 1, 2, 3, 4, 5, 6, 7].filter(o => bodyEffect(b.body, o)); assert.equal(moved.length, 4, "body knows its 4 moves");
  b.tWorld(); assert.equal(b.causal.body, b.body); assert.equal(b.causal.moves().length, 4, "the transformation world reads the same body");
  const f = path.join(os.tmpdir(), "organism-" + process.pid + ".v8"); b.save(f); const c = Brain.load(f); fs.unlinkSync(f);
  const held = bytes.slice(32000, 33000); assert.equal(c.align.readFrozen(held), b.align.readFrozen(held)); assert.equal(c.body, c.causal.body);
});

test("the person's controls act on the living brain", () => {
  const b = new Brain({rules: "winner", c: {}, seed: 11}); b.tWorld();
  b.setControls({gnoise: 6, glr: .05, repel: .1, pnoise: .2, ltemp: .4});
  assert.equal(b.trace.geo.neg, 6); assert.equal(b.trace.geo.lr, .05); assert.equal(b.trace.geo.repel, .1);
  assert.equal(b.disc.noise, .2); assert.equal(b.disc.temp, .4); assert.equal(b.causal.noise, .2);
  for (const y of bytes.slice(0, 3000)) b.live(y); assert.deepEqual(Array.from(b.align.mem.buf.slice(0, 3000)), bytes.slice(0, 3000), "noise in perception never corrupts what is kept");
});

test("evaluations draw new unseen worlds every time", () => {
  const b = new Brain({rules: "winner", c: {}, seed: 11}); for (let i = 0; i < 20; i++) b.playMaze(false);
  const x = b.examMazes([9], 1), y = b.examMazes([9], 1);
  assert.notEqual(x.seed, y.seed); assert.notDeepEqual(x.mazes[0].wall, y.mazes[0].wall);
});

test("nothing is deleted: links of the drawn graph only dim", () => {
  const b = new Brain({rules: "winner", c: {}, seed: 11}); let before = 0;
  for (let i = 0; i < 9000; i++) { b.live(bytes[i], i % 50 === 0); if (i === 4000) before = b.trace.edges.size; }
  assert.ok(b.trace.edges.size >= before);
});

test("it improves itself: variations of how it reads are tried on what it has not seen yet, and the history is kept", () => {
  const g = new AligningGraph(); g.meta.window = 3000; for (const y of bytes.slice(0, 34000)) g.live(y);
  const M = g.selfModel(); assert.ok(M.sources.mem && M.sources.self); assert.ok(Array.isArray(M.history));
  for (const h of M.history) assert.ok(h.after > h.before);
});
