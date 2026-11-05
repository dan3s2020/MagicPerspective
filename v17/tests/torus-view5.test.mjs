import test from "node:test";
import assert from "node:assert/strict";
import {rotation, prepare, images, plan} from "../transcend/torus-aether/ui/view5.mjs";

let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
const items = Array.from({length: 60}, () => ({p: [r(), r(), r(), r(), r()]}));
const M = rotation(Array.from({length: 10}, () => r() * 6.28)), P = prepare(M), cam = [r(), r(), r(), r(), r()];

test("cut-and-project finds exactly the images a brute-force search finds", () => {
  const hw = .8, hh = .5, t = .3, fast = images(items, cam, P, hw, hh, t, 1, 1e9); let brute = 0; const R = 5;
  for (const it of items) { const d = it.p.map((x, i) => x - cam[i]);
    for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) for (let c = -R; c <= R; c++) for (let e = -R; e <= R; e++) for (let f = -R; f <= R; f++) {
      const v = [d[0] + a, d[1] + b, d[2] + c, d[3] + e, d[4] + f], q = M.map(row => row.reduce((s2, x, j) => s2 + x * v[j], 0));
      if (Math.abs(q[0]) <= hw && Math.abs(q[1]) <= hh && Math.abs(q[2]) <= t && Math.abs(q[3]) <= t && Math.abs(q[4]) <= t) brute++; } }
  assert.equal(fast.length, brute);
});
test("every axis wraps: one full turn of the camera shows the same picture", () => {
  const key = L => L.map(o => o.it + ":" + o.q.map(x => x.toFixed(6)).join(",")).sort().join("|"), base = key(images(items, cam, P, .8, .5, .3, 1, 1e9));
  for (let ax = 0; ax < 5; ax++) { const c2 = cam.slice(); c2[ax] += 1; assert.equal(key(images(items, c2, P, .8, .5, .3, 1, 1e9)), base); }
});
test("zooming out never runs out of graph and stays bounded in work", () => {
  for (const z of [1, 10, 1e3, 1e6, 1e9]) { const pl = plan(P, items.length, z, z * .65, 400), t0 = performance.now(), im = images(items, cam, P, z, z * .65, pl.t, pl.m, 20000);
    assert.ok(im.length > 10, `half-width ${z}: ${im.length} images`); assert.ok(performance.now() - t0 < 500); }
});
