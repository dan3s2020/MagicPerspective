import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {NestView, rotation6} from "../transcend/torus-aether/ui/nestview.mjs";
import {MomentSpace} from "../transcend/torus-aether/fractal.mjs";

const text = fs.readdirSync("docs").filter(f => f.endsWith(".md")).sort().map(f => fs.readFileSync("docs/" + f, "utf8")).join("\n").slice(0, 60000);
const data = Array.from(text, c => Math.min(127, c.charCodeAt(0)));
let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
const syms = [...new Set(data)], U = new Map(syms.map(c => [c, [rnd(), rnd(), rnd(), rnd(), rnd()]]));
const top = syms.map(c => ({id: "s:" + c, kind: "sym", sym: c, p: U.get(c)}));
const edges = []; { const cnt = new Map(); for (let i = 1; i < data.length; i++) { const k = "s:" + data[i - 1] + ">s:" + data[i]; cnt.set(k, (cnt.get(k) || 0) + 1); }
  for (const [k, n] of cnt) if (n > 20) { const [a, b] = k.split(">"); edges.push({a, b, kind: "world", w: n / 100}); } }
const make = () => { const v = new NestView(); v.setWorld({data, U, top, edges}); v.setRotation(rotation6(Array.from({length: 15}, (_, i) => .3 * i))); return v; };

test("branching and renormalization are exact inverses: a node's weight is shared by its lived descendants", () => {
  const v = make();
  for (const w of ["e", "he", "the", " the", "ion", "s"]) {
    const n = v.positions(w).length, kids = v.children(0, w).filter(r => r.real), sum = kids.reduce((a, r) => a + r.n, 0);
    assert.equal(sum, n - (v.positions(w).includes(0) ? 1 : 0), w);
    for (const r of kids) { const P = v.parentOf(0, r.into.w); assert.equal(P.w, w); assert.equal(P.r, r); }    // closing a descendant gives back its node
  }
});
test("the zoom never jumps: every node moves exactly as the zoom says, across every change of frame, in and out", () => {
  const v = make(), W = 900, H = 700, mx = W / 2 + 37, my = H / 2 - 21; let worst = 0, changes = 0, maxDepth = 0;
  const step = f => { const before = new Map(v.render(W, H).discs.map(d => [d.key, d])), k0 = v.cam.k + "|" + v.cam.w; v.zoom(f, mx, my, W, H);
    if (v.cam.k + "|" + v.cam.w !== k0) changes++;
    for (const d of v.render(W, H).discs) { const b = before.get(d.key); if (!b) continue; const ex = mx + (b.x - mx) * f - v.moved[0], ey = my + (b.y - my) * f - v.moved[1];   // the gentle drift is a pan the test knows about
      if (Math.abs(ex) < 5 * W && Math.abs(ey) < 5 * H) worst = Math.max(worst, Math.hypot(d.x - ex, d.y - ey)); }
    maxDepth = Math.max(maxDepth, v.cam.w.length); };
  for (let k = 0; k < 500; k++) step(1.12);
  const inChanges = changes; for (let k = 0; k < 1500; k++) step(1 / 1.12);
  assert.ok(worst < .5, "largest jump of a node on screen: " + worst.toFixed(4) + " px");
  assert.ok(inChanges > 10 && changes > inChanges + 10, "frames changed in: " + inChanges + ", total: " + changes);
  assert.ok(maxDepth > 15, "went deep into the past: " + maxDepth);
  assert.ok(v.cam.k > 5, "kept going out through the lived past: " + v.cam.k);
  assert.ok(Math.abs(Math.log10(v.cam.S)) < 5, "numbers stay well-scaled: S=" + v.cam.S);
});
test("moment space: what came next after the nearest lived moments", () => {
  const M = new MomentSpace({lambda: .75, k: 12}), x = [.5, .5, .5, .5, .5], P = new Map([...new Set(data)].map(c => [c, [rnd(), rnd(), rnd(), rnd(), rnd()]]));
  for (let i = 0; i < 40000; i++) { M.add(x, data[i]); M.step(x, P.get(data[i])); }
  let hit = 0; for (let i = 40000; i < 42000; i++) { const p = M.ask(x); if (p && p.indexOf(Math.max(...p)) === data[i]) hit++; M.step(x, P.get(data[i])); }
  assert.ok(hit / 2000 > .35, "predicts unseen text: " + hit / 2000);
});
