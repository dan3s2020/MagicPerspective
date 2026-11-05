// TORUS-AETHER A/B/C — isolated research layer over transcend/epistemic-text/engine.mjs (engine unchanged).
//
// Construction (Portal 0D -> 2D (+) 2D = 4D):
//   plane A (X,Y)  : A's belief, weight r1^2 = cos^2(eta)
//   plane B (Z,W)  : B's belief, weight r2^2 = sin^2(eta)
//   point A+B      : the "field" F = cos^2(eta)*P_A + sin^2(eta)*P_B   (r1^2 + r2^2 = 1 always)
//   C              : reads the field and its own perspective; a second angle chi mixes F with C:
//                    P = cos^2(chi)*F + sin^2(chi)*P_C
// "Aether" = probability mass that flows through the wires (A, B, C beliefs) and is conserved (sums to 1).
// The angles are learned online by gradient on log-likelihood (solve et coagula), never peeking: every
// prediction is made before the true byte is seen, and learners update only after it.
//
// Two placements of the angles:
//   global : one (eta, chi) for the whole torus
//   field  : one (eta, chi) per point of the market = per previous character (the field varies over the surface)

import {TextExperiment, splitCorpus} from "../epistemic-text/engine.mjs";

const N = 128, ALPHA = 0.05;
const context = (data, i) => Array.from({length: 4}, (_, j) => data[(i - j - 1 + data.length) % data.length]);
const txt = a => a.map(x => String.fromCharCode(x)).join("");

// ---- beliefs read from the learners' own counts (read-only) ----
function norm(v) { let s = 0; for (const x of v) s += x; return v.map(x => x / s); }
function rowDist(row) {                                                       // dense rows (engine.mjs) or sparse rows (lean-c.mjs)
  if (row && row.k) { const v = new Array(N).fill(ALPHA); for (let j = 0; j < row.k.length; j++) v[row.k[j]] += row.c[j]; return norm(v); }
  const v = new Array(N); for (let i = 0; i < N; i++) v[i] = (row ? row.val[i] : 0) + ALPHA; return norm(v); }
export function distA(cells, ctx) {
  const p1 = []; for (let i = 0; i < 8; i++) { const c = cells.table[i][(ctx[0] >> i) & 1]; p1.push(c[1] / (c[0] + c[1])); }
  const v = new Array(N);
  for (let y = 0; y < N; y++) { let p = 1; for (let i = 0; i < 8; i++) p *= (y >> i) & 1 ? p1[i] : 1 - p1[i]; v[y] = p + 1e-9; }
  return norm(v);
}
export function distB(b, ctx) { // same decision path as HierarchicalText.predict, as a distribution
  const hk = txt(ctx.slice(0, 2)), hr = b.higher.entries.get(hk);
  if (hr?.n >= 3) return rowDist(hr);
  const lr = b.local.entries.get(txt(ctx.slice(0, 1)));
  if (lr?.n >= 3) return rowDist(lr);
  return distA(b.cells, ctx);
}
const category = n => n === 32 ? "space" : n === 10 ? "line" : n >= 48 && n <= 57 ? "num" :
  n >= 65 && n <= 90 ? "upper" : n >= 97 && n <= 122 ? "lower" : "other";
const feature = (n, kind) => kind === "class" ? category(n) : kind === "fold" ?
  String.fromCharCode(n >= 65 && n <= 90 ? n + 32 : n) : String.fromCharCode(n);
const key = (ctx, p) => { const o = []; for (let i = 0; i < 4; i++) if (p.mask & (1 << i)) o.push(feature(ctx[i], p.kind)); return o.join("|"); };
export function distC(c, ctx) { // active perspective, as a distribution (same row C.predict reads)
  if (c.top?.length) {                                                          // C as an entity of many beliefs: its best perspectives together, each by its record
    const out = new Array(N).fill(0); let z = 0;
    for (const t of c.top) { const r = c.models[t.id]?.entries.get(c.key ? c.key(ctx, t) : key(ctx, t)), d = r && r.n >= 2 ? rowDist(r) : rowDist({val: c.base.total});
      for (let i = 0; i < N; i++) out[i] += t.w * d[i]; z += t.w; }
    return out.map(v => v / z);
  }
  const [kind, m] = c.active.split(":"), p = {kind, mask: +m}, model = c.models[c.active];
  const row = model?.entries.get(c.key ? c.key(ctx, p) : key(ctx, p));   // a C that sees more positions has its own key
  if (row && row.n >= 2) return rowDist(row);
  return rowDist({val: c.base.total});
}
const argmax = v => { let k = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i; return k; };

// ---- the torus ----
export class Torus {
  constructor({mode = "global", lr = 0.05, eta0 = Math.PI / 4, chi0 = Math.PI / 4, useC = true, crystal = 20} = {}) {
    Object.assign(this, {mode, lr, eta0, chi0, useC, crystal}); this.angles = new Map();
  }
  get(k, parent) {
    let a = this.angles.get(k);
    if (!a) { a = {eta: parent ? parent.eta : this.eta0, chi: parent ? parent.chi : this.chi0, n: 0}; this.angles.set(k, a); }
    return a;
  }
  // the points of the market that this context touches, coarse -> fine
  chain(ctx) {
    if (this.mode === "global") return [this.get("*")];
    if (this.mode === "field") return [this.get(ctx[0])];
    // crystal: global -> 1 char -> 2 chars; a finer point is born from its parent and is used only once it
    // has carried enough flow (coagula); until then the coarser point speaks.
    const g = this.get("*"), p1 = this.get("1:" + ctx[0], g), p2 = this.get("2:" + ctx[0] + "," + ctx[1], p1);
    return [g, p1, p2];
  }
  slot(ctx) {
    const c = this.chain(ctx); let s = c[0];
    for (const a of c) if (a.n >= (this.crystal ?? 20) || a === c[0]) s = a;
    return s;
  }
  mix(pa, pb, pc, a) {
    const wa = Math.cos(a.eta) ** 2, wb = 1 - wa, wf = this.useC ? Math.cos(a.chi) ** 2 : 1, wc = 1 - wf;
    const out = new Array(N);
    for (let i = 0; i < N; i++) out[i] = wf * (wa * pa[i] + wb * pb[i]) + wc * pc[i];
    return out;
  }
  predict(pa, pb, pc, ctx) { return this.mix(pa, pb, pc, this.slot(ctx)); }
  learn(pa, pb, pc, ctx, y) { for (const a of this.chain(ctx)) this.learnAt(a, pa, pb, pc, y); }
  learnAt(a, pa, pb, pc, y) { // gradient ascent on log P(y); called only after y is revealed
    const wa = Math.cos(a.eta) ** 2, wf = this.useC ? Math.cos(a.chi) ** 2 : 1;
    const F = wa * pa[y] + (1 - wa) * pb[y], P = wf * F + (1 - wf) * pc[y];
    const dEta = wf * (pa[y] - pb[y]) * -Math.sin(2 * a.eta) / P;
    const dChi = this.useC ? (F - pc[y]) * -Math.sin(2 * a.chi) / P : 0;
    a.eta = Math.min(Math.PI / 2, Math.max(0, a.eta + this.lr * dEta));
    a.chi = Math.min(Math.PI / 2, Math.max(0, a.chi + this.lr * dChi)); a.n++;
  }
  summary() {
    const rows = [...this.angles.values()].filter(a => a.n > 0); if (!rows.length) return null;
    const avg = f => rows.reduce((s, a) => s + f(a) * a.n, 0) / rows.reduce((s, a) => s + a.n, 0);
    return {points: rows.length, Ashare: avg(a => Math.cos(a.eta) ** 2), Cshare: this.useC ? avg(a => Math.sin(a.chi) ** 2) : 0};
  }
}

// ---- Aether: flow through ALL wires at once ----
// Wires = A, B and every perspective C has generated (C trains all of them; it only *promotes* one).
// Each point of the market holds how much aether flows through each wire. After the true byte is revealed,
// flow through a wire is multiplied by how much that wire believed in it (least resistance: wires that carry
// the truth thicken = coagula), then renormalised; a small leak keeps every wire alive (solve).
import {candidates} from "../epistemic-text/engine.mjs";
export function wireDists(e, ctx) {
  const out = [distA(e.a, ctx), distB(e.b, ctx)], base = rowDist({val: e.c.base.total});
  for (const p of candidates(4)) {
    const m = e.c.models[p.id], row = m?.entries.get(key(ctx, p));
    out.push(row && row.n >= 2 ? rowDist(row) : base);
  }
  return out;
}
export const wireNames = () => ["A", "B", ...candidates(4).map(p => "C/" + p.id)];
export class Aether {
  constructor({mode = "crystal", beta = 1, leak = 0.002, crystal = 20} = {}) {
    Object.assign(this, {mode, beta, leak, crystal}); this.points = new Map();
  }
  get(k, K, parent) {
    let p = this.points.get(k);
    if (!p) { p = {w: parent ? parent.w.slice() : new Array(K).fill(1 / K), n: 0}; this.points.set(k, p); }
    return p;
  }
  chain(ctx, K) {
    const g = this.get("*", K); if (this.mode === "global") return [g];
    const p1 = this.get("1:" + ctx[0], K, g); if (this.mode === "field") return [p1];
    return [g, p1, this.get("2:" + ctx[0] + "," + ctx[1], K, p1)];
  }
  slot(ctx, K) { const c = this.chain(ctx, K); let s = c[0]; for (const a of c) if (a.n >= this.crystal || a === c[0]) s = a; return s; }
  predict(D, ctx) {
    const w = this.slot(ctx, D.length).w, out = new Array(N).fill(0);
    for (let k = 0; k < D.length; k++) { const wk = w[k], d = D[k]; if (wk < 1e-6) continue; for (let i = 0; i < N; i++) out[i] += wk * d[i]; }
    return out;
  }
  learn(D, ctx, y) {
    const K = D.length;
    for (const p of this.chain(ctx, K)) {
      let z = 0; for (let k = 0; k < K; k++) { p.w[k] *= D[k][y] ** this.beta; z += p.w[k]; }
      for (let k = 0; k < K; k++) p.w[k] = (1 - this.leak) * p.w[k] / z + this.leak / K;
      p.n++;
    }
  }
  top(names, n = 3) { // strongest wires, averaged over the market by flow carried
    const acc = new Array(names.length).fill(0); let tot = 0;
    for (const p of this.points.values()) if (p.n) { for (let k = 0; k < acc.length; k++) acc[k] += p.w[k] * p.n; tot += p.n; }
    return acc.map((v, k) => [names[k], v / tot]).sort((a, b) => b[1] - a[1]).slice(0, n)
      .map(([k, v]) => `${k} ${(100 * v).toFixed(0)}%`).join(", ");
  }
}

// ---- experiment: A, B, C learn exactly as in engine.mjs; tori only read and mix their beliefs ----
export function run({corpus = null, steps = 5000, seed = 20261030, tori = {}, aethers = {}, evalLimit = 2000} = {}) {
  const e = new TextExperiment({seed, corpus});
  const data = e.training, useWires = Object.keys(aethers).length > 0;
  for (let t = 0; t < steps; t++) {
    const idx = (4 + t) % data.length, ctx = context(data, idx), y = data[idx];
    const pa = distA(e.a, ctx), pb = distB(e.b, ctx), pc = distC(e.c, ctx);
    for (const T of Object.values(tori)) T.learn(pa, pb, pc, ctx, y); // y revealed now, after all predictions
    if (useWires) { const D = wireDists(e, ctx); for (const X of Object.values(aethers)) X.learn(D, ctx, y); }
    e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y);
  }
  // frozen held-out evaluation (no learning)
  const H = e.holdout, names = ["A", "B", "C", ...Object.keys(tori), ...Object.keys(aethers)];
  const hit = Object.fromEntries(names.map(k => [k, 0])), nll = Object.fromEntries(names.map(k => [k, 0]));
  let n = 0;
  for (let i = 4; i < H.length && n < evalLimit; i++, n++) {
    const ctx = context(H, i), y = H[i], pa = distA(e.a, ctx), pb = distB(e.b, ctx), pc = distC(e.c, ctx);
    const P = {A: pa, B: pb, C: pc}; for (const [k, T] of Object.entries(tori)) P[k] = T.predict(pa, pb, pc, ctx);
    if (useWires) { const D = wireDists(e, ctx); for (const [k, X] of Object.entries(aethers)) P[k] = X.predict(D, ctx); }
    for (const k of names) { hit[k] += Number(argmax(P[k]) === y); nll[k] += -Math.log2(P[k][y]); }
    // sanity: argmax of our belief must match the learners' own predictions
    if (argmax(pb) !== e.b.predict(ctx) && n < 3) {/* ties possible; checked in tests */}
  }
  return {samples: n, steps, perspective: e.c.active,
    accuracy: Object.fromEntries(names.map(k => [k, hit[k] / n])),
    bitsPerChar: Object.fromEntries(names.map(k => [k, nll[k] / n])),
    angles: Object.fromEntries(Object.entries(tori).map(([k, T]) => [k, T.summary()])),
    wires: Object.fromEntries(Object.entries(aethers).map(([k, X]) => [k, X.top(wireNames())]))};
}
export {splitCorpus};
