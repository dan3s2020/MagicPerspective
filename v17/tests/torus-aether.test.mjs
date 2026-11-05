import test from "node:test";
import assert from "node:assert/strict";
import {execSync} from "node:child_process";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {TextExperiment} from "../transcend/epistemic-text/engine.mjs";
import {distA, distB, distC, Torus, Aether, wireDists, run} from "../transcend/torus-aether/torus.mjs";

const argmax = v => v.indexOf(Math.max(...v));
const ctxAt = (d, i) => Array.from({length: 4}, (_, j) => d[(i - j - 1 + d.length) % d.length]);

test("engine.mjs is untouched by this branch", () => {   // the canonical epistemic-text (OctopusV2 cba83b0), byte for byte
  const root = fileURLToPath(new URL("../transcend/epistemic-text/", import.meta.url)), files = [];
  const walk = d => { for (const f of fs.readdirSync(d, {withFileTypes: true})) f.isDirectory() ? walk(path.join(d, f.name)) : files.push(path.join(d, f.name)); }; walk(root);
  const lines = files.map(f => createHash("sha256").update(fs.readFileSync(f, "latin1").replace(/\r\n/g, "\n"), "latin1").digest("hex") + "  " + path.relative(path.dirname(path.dirname(root)), f).split(path.sep).join("/") + "\n");
  lines.sort();
  assert.equal(createHash("sha256").update(lines.join("")).digest("hex"), "76325b2203008fddf3e93cb6c5974a2daab210b494327df452101c56c05970c8");
});

test("beliefs read from A/B/C agree with their own decisions", () => {
  const e = new TextExperiment(); e.step(3000);
  let n = 0, a = 0, b = 0, c = 0;
  for (let i = 4; i < e.holdout.length; i++, n++) {
    const ctx = ctxAt(e.holdout, i);
    a += argmax(distA(e.a, ctx)) === e.a.predict(ctx);
    b += argmax(distB(e.b, ctx)) === e.b.predict(ctx);
    c += argmax(distC(e.c, ctx)) === e.c.predict(ctx);
  }
  assert.ok(a / n > 0.97 && b / n > 0.97 && c / n > 0.97, `A ${a}/${n} B ${b}/${n} C ${c}/${n}`);
});

test("beliefs are distributions (aether is conserved)", () => {
  const e = new TextExperiment(); e.step(500); const ctx = ctxAt(e.training, 10);
  for (const d of [distA(e.a, ctx), distB(e.b, ctx), distC(e.c, ctx), ...wireDists(e, ctx)])
    assert.ok(Math.abs(d.reduce((s, x) => s + x, 0) - 1) < 1e-9);
  const T = new Torus({mode: "crystal"}), X = new Aether();
  const P1 = T.predict(distA(e.a, ctx), distB(e.b, ctx), distC(e.c, ctx), ctx), P2 = X.predict(wireDists(e, ctx), ctx);
  assert.ok(Math.abs(P1.reduce((s, x) => s + x, 0) - 1) < 1e-9 && Math.abs(P2.reduce((s, x) => s + x, 0) - 1) < 1e-9);
});

test("no peek: held-out evaluation is frozen and learners are trained exactly as the engine trains them", () => {
  const T = new Torus({mode: "crystal"}), X = new Aether();
  const r = run({steps: 2000, tori: {T}, aethers: {X}});
  const ref = new TextExperiment(); ref.step(2000);
  const ev = ref.evaluate(2000);
  assert.equal(r.accuracy.A, ev.accuracy.A); assert.equal(r.accuracy.B, ev.accuracy.B); assert.equal(r.accuracy.C, ev.accuracy.C);
  // predicting never moves the angles or the flow
  const snap = () => JSON.stringify([[...T.angles].filter(([, a]) => a.n), [...X.points].filter(([, p]) => p.n)]);
  const before = snap();
  for (let i = 4; i < 200; i++) { const ctx = ctxAt(ref.holdout, i);
    T.predict(distA(ref.a, ctx), distB(ref.b, ctx), distC(ref.c, ctx), ctx); X.predict(wireDists(ref, ctx), ctx); }
  assert.equal(snap(), before);
});

import {ComplementaryPair, MASK as M2} from "../transcend/torus-aether/entangled.mjs";
test("entangled pair: MASKED gives each organism exactly its own belief; learning only after the byte", () => {
  const e = new TextExperiment(); e.step(1500);
  for (const seeker of ["B", "C"]) {
    const pair = new ComplementaryPair({seeker});
    for (let i = 4; i < 1500; i++) { const ctx = ctxAt(e.training, i); const m = pair.play(e, ctx, false, "w"); pair.learn(ctx, e.training[i], m); }
    for (let i = 4; i < 200; i++) {
      const ctx = ctxAt(e.holdout, i), m = pair.play(e, ctx, true, "w");
      assert.deepEqual(m.pa, distA(e.a, ctx));
      assert.deepEqual(m.pb, seeker === "C" ? distC(e.c, ctx) : distB(e.b, ctx));
    }
    // play() never reads the true byte: same output whatever byte follows
    const ctx = ctxAt(e.holdout, 50); assert.deepEqual(pair.play(e, ctx, false, "w"), pair.play(e, ctx, false, "w"));
  }
});

import {EmergentChain} from "../transcend/torus-aether/emergent.mjs";
test("emergent chain: MASKED is exactly C; aether conserved inside every A; perception grows from one wire", () => {
  const e = new TextExperiment(); e.step(1500); const ch = new EmergentChain({depth: 2});
  const hist = (d, i) => Array.from({length: 12}, (_, j) => (i - j - 1 >= 0 ? d[i - j - 1] : 32));
  for (let i = 4; i < 3000; i++) { const k = i % e.training.length, ctx = ctxAt(e.training, k), h = hist(e.training, k);
    const m = ch.play(e, ctx, h); ch.learn(h, e.training[k], m); }
  for (let i = 4; i < 100; i++) { const ctx = ctxAt(e.holdout, i); assert.deepEqual(ch.play(e, ctx, hist(e.holdout, i), true).out, distC(e.c, ctx)); }
  for (const A of ch.A) { assert.ok(Math.abs(A.wires.reduce((s, w) => s + w.flow, 0) - 1) < 1e-9); }
  assert.ok(ch.A[0].wires.length > 1, "A1 budded new perception");
});
