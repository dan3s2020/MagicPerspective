// What laws emerged in the universe the graph builds from what it devours? node laws.mjs <text>
import fs from "node:fs";
import {Geometry} from "../concepts.mjs";
import {corpusFromText} from "../measure.mjs";
import {TextExperiment} from "../../epistemic-text/engine.mjs";
const file = process.argv[2], raw = fs.readFileSync(file, "utf8");
const T = Array.from(raw, c => { const x = c.charCodeAt(0); return x === 13 ? 32 : x < 127 ? x : 63; }), N = T.length, S = String.fromCharCode(...T);
const fit = pts => { const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let a = 0, b = 0, c = 0; for (const [x, y] of pts) { a += (x - mx) * (y - my); b += (x - mx) ** 2; c += (y - my) ** 2; } return {slope: a / b, r2: a * a / (b * c)}; };
const out = {file: file.split("/").pop(), chars: N};
// 1. EXPANSION: distinct contexts of length L as experience grows (Heaps): D(n) ∝ n^β
out.expansion = {}; for (const L of [1, 2, 3, 4, 6, 8, 12]) { const seen = new Set(), pts = []; let next = 1000;
  for (let i = L; i <= N; i++) { seen.add(S.slice(i - L, i)); if (i === next) { pts.push([Math.log(i), Math.log(seen.size)]); next = Math.floor(next * 1.5); } }
  const f = fit(pts.slice(2)); out.expansion["L" + L] = {beta: +f.slope.toFixed(3), r2: +f.r2.toFixed(3), distinct: seen.size}; }
// 2. MASS SPECTRUM: rank-frequency of contexts (Zipf): f(r) ∝ r^-α
out.mass = {}; for (const L of [1, 3, 6]) { const c = new Map(); for (let i = L; i <= N; i++) { const k = S.slice(i - L, i); c.set(k, (c.get(k) || 0) + 1); }
  const f = [...c.values()].sort((a, b) => b - a), pts = []; for (let r = 1; r <= f.length; r = Math.ceil(r * 1.3)) if (f[r - 1] > 1) pts.push([Math.log(r), Math.log(f[r - 1])]);
  const z = fit(pts); out.mass["L" + L] = {alpha: +(-z.slope).toFixed(3), r2: +z.r2.toFixed(3)}; }
// 3. SELF-SIMILARITY under renormalization: lived branching (pasts per context) at each depth
out.branching = {}; for (const L of [1, 2, 3, 4, 5, 6]) { const ch = new Map(); for (let i = L; i < N; i++) { const k = S.slice(i - L + 1, i + 1); let s = ch.get(k); if (!s) ch.set(k, s = new Set()); s.add(T[i - L]); }
  const v = [...ch.values()].map(s => s.size), m = v.reduce((a, b) => a + b, 0) / v.length, sd = Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
  out.branching["L" + L] = {mean: +m.toFixed(2), cv: +(sd / m).toFixed(2), single: +(v.filter(x => x === 1).length / v.length).toFixed(2)}; }
// 4. GRAVITY: learned geometry — do symbols that belong together sit close? distance vs association (PMI), and mass vs centrality
const geo = new Geometry({D: 5, every: 1e9}); for (let ep = 0; ep < 3; ep++) for (let i = 1; i < N; i++) geo.learn(T[i - 1], T[i]);
const cnt = new Map(), pair = new Map(); for (let i = 1; i < N; i++) { cnt.set(T[i], (cnt.get(T[i]) || 0) + 1); const k = T[i - 1] * 128 + T[i]; pair.set(k, (pair.get(k) || 0) + 1); }
const wrapD = x => x - Math.round(x), dist = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + wrapD(v - b[i]) ** 2, 0));
const syms = [...cnt.keys()].filter(s => cnt.get(s) >= 20), bins = Array.from({length: 8}, () => [0, 0]);
for (const a of syms) for (const b of syms) if (a < b) { const pab = ((pair.get(a * 128 + b) || 0) + (pair.get(b * 128 + a) || 0) + .5) / (2 * N), pmi = Math.log(pab / ((cnt.get(a) / N) * (cnt.get(b) / N)));
  const d = dist(geo.U.get(a), geo.U.get(b)), j = Math.min(7, Math.floor(d / .14)); bins[j][0] += pmi; bins[j][1]++; }
out.gravity = {pmiByDistance: bins.map((b, j) => b[1] ? `${(j * .14).toFixed(2)}:${(b[0] / b[1]).toFixed(2)}(${b[1]})` : null).filter(Boolean)};
const cen = syms.map(s => [Math.log(cnt.get(s)), syms.reduce((t, o) => t + (o === s ? 0 : dist(geo.U.get(s), geo.U.get(o))), 0) / (syms.length - 1)]);
const mc = fit(cen); out.gravity.massVsMeanDistance = {slope: +mc.slope.toFixed(4), r2: +mc.r2.toFixed(3)};
// 5. ARROW OF TIME: is the past as predictable from the future as the future from the past? (same counting model, both directions)
const ctxAcc = (A, L) => { const m = new Map(), n0 = Math.floor(A.length * .85); let hit = 0, n = 0;
  for (let i = L; i < A.length; i++) { const k = A.slice(i - L, i).join(","), y = A[i];
    if (i >= n0) { const d = m.get(k); if (d) { let b = -1, bv = -1; for (const [s, v] of d) if (v > bv) { bv = v; b = s; } hit += b === y; } n++; }
    else { let d = m.get(k); if (!d) m.set(k, d = new Map()); d.set(y, (d.get(y) || 0) + 1); } } return hit / n; };
// same material both ways: learn on the first 85%, test on the last 15% — forward as written, backward each part reversed
const n0 = Math.floor(N * .85), bw = [...T.slice(0, n0).reverse(), ...T.slice(n0).reverse()];
out.arrow = {}; for (const L of [1, 2, 3, 4, 6]) out.arrow["L" + L] = {forward: +ctxAcc(T, L).toFixed(4), backward: +ctxAcc(bw, L).toFixed(4)};
// 6. SYMMETRIES that C discovers (perspectives it promotes: fold = upper/lower case symmetry, class = letter-kind symmetry, masks = which positions matter)
const e = new TextExperiment({corpus: corpusFromText(raw)}), d = e.training; const ctxAt = (i) => [1, 2, 3, 4].map(j => d[(i - j + d.length) % d.length]);
for (let t = 0; t < Math.min(120000, 3 * d.length); t++) { const i = (4 + t) % d.length; e.c.observe(ctxAt(i), d[i]); }
const kinds = {}; for (const x of e.c.discoveries) { const k = x.to.split(":")[0]; kinds[k] = (kinds[k] || 0) + 1; }
const masks = {}; for (const x of e.c.discoveries) { const m = +x.to.split(":")[1]; for (let i = 0; i < 4; i++) if (m & (1 << i)) masks["pos" + (i + 1)] = (masks["pos" + (i + 1)] || 0) + 1; }
out.symmetries = {final: e.c.active, promotions: e.c.discoveries.length, toKind: kinds, positionsUsed: masks};
console.log(JSON.stringify(out));
