// node dimexp.mjs <text> <trainChars> <D> <seed>
// Field of lived moments (chaos-game points on the learned geometry) read by k nearest moments.
// Measures, on unseen text: accuracy for fixed field widths k, for a thermostat (C picks k so the predicted entropy is
// closest to a target chosen on a validation slice) and for online choice (C picks the k with the best recent record).
import fs from "node:fs";
import {Geometry} from "../concepts.mjs";
const [file, NT, Dd, sd, rp, ng, mode] = process.argv.slice(2), D = +Dd, Ntrain = +NT, seed = +sd, repel = +rp, neg = +ng;
const txt = Array.from(fs.readFileSync(file, "utf8"), c => { const x = c.charCodeAt(0); return x === 13 ? 32 : x < 127 ? x : 63; });
const hold = Math.floor(txt.length * .85), T = txt.slice(Math.max(0, hold - Ntrain), hold), V = txt.slice(hold, hold + 2000), H = txt.slice(hold + 2000, hold + 4000);
const geo = new Geometry({D, every: 1e9, seed, repel, neg});
if (mode === "uniform") { const syms = [], orig = geo.learn.bind(geo);   // the vacuum pushes every symbol equally, not in proportion to how often it occurs
  geo.learn = function (x, y) { for (const s of [x, y]) if (!this.U.has(s)) syms.push(s); this.seen = syms.slice(); orig(x, y); }; }
 for (let ep = 0; ep < 3; ep++) for (let i = 1; i < T.length; i++) geo.learn(T[i - 1], T[i]);
const place = y => geo.U.get(y) || new Array(D).fill(.5), lam = .75;
const N = T.length, P = new Float32Array(N * D), NX = new Uint8Array(N), x = new Float64Array(D).fill(.5);
const step = y => { const p = place(y); for (let i = 0; i < D; i++) x[i] += lam * (p[i] - x[i]); };
for (const y of T.slice(0, 200)) step(y);
for (let t = 0; t < N; t++) { for (let i = 0; i < D; i++) P[t * D + i] = x[i]; NX[t] = T[t]; step(T[t]); }
const uni = new Float64Array(128); for (const y of T) uni[y]++; for (let i = 0; i < 128; i++) uni[i] = (uni[i] + .1) / (N + 12.8);
const KS = [1, 3, 6, 12, 24, 48, 96, 0];                                   // 0 = infinite width: the primal symbol frequencies
const KMAX = 96, bd = new Float64Array(KMAX), bi = new Int32Array(KMAX);
function knn() {                                                              // brute force top-KMAX
  let n = 0;
  for (let t = 0; t < N; t++) { let s = 0; const o = t * D; for (let i = 0; i < D; i++) { const d = P[o + i] - x[i]; s += d * d; }
    if (n < KMAX) { let j = n++; while (j > 0 && bd[j - 1] > s) { bd[j] = bd[j - 1]; bi[j] = bi[j - 1]; j--; } bd[j] = s; bi[j] = t; }
    else if (s < bd[KMAX - 1]) { let j = KMAX - 1; while (j > 0 && bd[j - 1] > s) { bd[j] = bd[j - 1]; bi[j] = bi[j - 1]; j--; } bd[j] = s; bi[j] = t; } }
}
function dists() {                                                            // distribution for every width
  knn(); const out = [];
  for (const k of KS) {
    if (!k) { out.push(uni); continue; }
    const h = Math.max(1e-12, bd[Math.min(k - 1, 3)]), p = new Float64Array(128); let z = 0;
    for (let j = 0; j < k; j++) { const w = Math.exp(-bd[j] / h); p[NX[bi[j]]] += w; z += w; }
    for (let i = 0; i < 128; i++) p[i] = .97 * p[i] / z + .03 * uni[i]; out.push(p);
  }
  return out;
}
const ent = p => { let s = 0; for (const v of p) if (v > 0) s -= v * Math.log2(v); return s; };
const am = p => { let b = 0; for (let i = 1; i < 128; i++) if (p[i] > p[b]) b = i; return b; };
function run(S) { const rows = []; for (const y of S) { const ds = dists(); rows.push({y, hit: ds.map(p => am(p) === y), H: ds.map(ent), bits: ds.map(p => -Math.log2(p[y]))}); step(y); } return rows; }
// x continues from the end of training into validation, then test (both never added as moments)
const val = run(V), test = run(H);
const acc = (rows, f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
const fixed = KS.map((_, j) => acc(test, r => r.hit[j]));
// thermostat: target entropy chosen on validation
let bestT = 0, bestA = -1; for (let tgt = .2; tgt <= 5; tgt += .1) { const a = acc(val, r => { let j = 0, d = 1e9; r.H.forEach((h, i) => { if (Math.abs(h - tgt) < d) { d = Math.abs(h - tgt); j = i; } }); return r.hit[j]; }); if (a > bestA) { bestA = a; bestT = tgt; } }
const thermo = acc(test, r => { let j = 0, d = 1e9; r.H.forEach((h, i) => { if (Math.abs(h - bestT) < d) { d = Math.abs(h - bestT); j = i; } }); return r.hit[j]; });
// online: the width with the best record over the last 200 steps (decided before seeing y)
const rec = KS.map(() => []); let on = 0; for (const r of [...val, ...test].slice(-test.length - 200)) { }
{ const all = [...val, ...test], sc = KS.map(() => 0), win = []; let n = 0;
  for (let t = 0; t < all.length; t++) { const r = all[t]; let j = 0; for (let i = 1; i < KS.length; i++) if (sc[i] > sc[j]) j = i;
    if (t >= val.length) { on += r.hit[j]; n++; } r.hit.forEach((h, i) => sc[i] += h); win.push(r); if (win.length > 200) { const o = win.shift(); o.hit.forEach((h, i) => sc[i] -= h); } }
  on /= n; }
const bestFixedVal = KS.map((_, j) => acc(val, r => r.hit[j])), jv = bestFixedVal.indexOf(Math.max(...bestFixedVal));
const cntS = new Map(); for (const y of T) cntS.set(y, (cntS.get(y) || 0) + 1);
const wd = v => v - Math.round(v), dd = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + wd(v - b[i]) ** 2, 0)), SY = [...cntS.keys()].filter(s => cntS.get(s) >= 20 && geo.U.has(s));
const pts = SY.map(s => [Math.log(cntS.get(s)), SY.reduce((t, o) => t + (o === s ? 0 : dd(geo.U.get(s), geo.U.get(o))), 0) / (SY.length - 1)]);
const mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length; let sa = 0, sb = 0, sc = 0; for (const [a, b] of pts) { sa += (a - mx) * (b - my); sb += (a - mx) ** 2; sc += (b - my) ** 2; }
console.log(JSON.stringify({mode: mode || "freq", massCorr: +(sa / Math.sqrt(sb * sc)).toFixed(3), file: file.split("/").pop(), Ntrain: N, D, seed, repel, neg, fixed: Object.fromEntries(KS.map((k, j) => [k || "inf", +fixed[j].toFixed(4)])),
  fixedChosenOnVal: +fixed[jv].toFixed(4), kVal: KS[jv], thermo: +thermo.toFixed(4), target: +bestT.toFixed(1), online: +on.toFixed(4)}));
