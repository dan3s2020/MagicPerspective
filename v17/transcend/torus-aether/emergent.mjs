// EMERGENT CHAIN — six local rules, nothing else designed by hand:
//  R1 SHOW        an organism exposes only the byte it intends and how firmly (its intent vector).
//  R2 RESISTANCE  the next organism in the chain learns only where the previous one was rejected (y != shown byte).
//  R3 TRUST       going back down the chain, each organism re-reads its successor's shown byte by learned trust.
//  R4 FLOW        aether is conserved inside an organism: wires that believed the truth thicken, a small leak keeps
//                 every wire alive.
//  R5 BUDDING     the wire carrying the most flow buds a child that sees one byte further back (or the same bytes
//                 folded); the child is born with half the parent's flow and speaks with the parent's voice until
//                 it has its own experience.
//  R6 DISSOLUTION a wire that has lived long enough to be judged (maturity) and still carries almost no flow
//                 dissolves; its children pass to its parent. Default threshold = 2*leak/wires (gentle). A strong
//                 metabolism (die=0.01, with or without grace) was measured and is weaker: see docs.
// The chain starts with C (engine.mjs, untouched) as the first seeker: C -> A1 -> A2 -> ... Each A starts with a
// single wire that sees one byte. No peek: everything is decided before the byte; learning happens after.
import {distB, distC} from "./torus.mjs";
import {Geometry} from "./concepts.mjs";

const N = 128, ALPHA = 0.05;
export const argmax = v => { let k = 0; for (let i = 1; i < v.length; i++) if (v[i] > v[k]) k = i; return k; };
const fold = c => (c >= 65 && c <= 90 ? c + 32 : c);
// rows are sparse (only the bytes that really followed): {n, k: [bytes], c: [counts]} — same distribution as a dense row
const rowDist = r => { const z = r.n + N * ALPHA, v = new Array(N).fill(ALPHA / z); for (let j = 0; j < r.k.length; j++) v[r.k[j]] = (r.c[j] + ALPHA) / z; return v; };

// TIME. Two clocks besides the even tick of bytes:
//  event clock: the past is cut where the lived transition is rare (a boundary falls between a and b when b
//    followed a less often than transitions usually are); "event:k" sees the last k events, whole.
//  log clock (scale-invariant): bins 1 | 2 | 3-4 | 5-8 | 9-16 | 17-32 bytes back; the first two exact, older bins keep
//    what was in them but not its order — the further back, the blurrier.
export class EventClock {
  constructor() { this.uni = new Map(); this.big = new Map(); this.mean = .3; }
  learn(a, b) { this.uni.set(a, (this.uni.get(a) || 0) + 1); const k = a * 256 + b; this.big.set(k, (this.big.get(k) || 0) + 1);
    this.mean += .001 * (this.tp(a, b) - this.mean); }
  tp(a, b) { const u = this.uni.get(a); return u ? (this.big.get(a * 256 + b) || 0) / u : 0; }
  events(hist, k) { let s = "", n = 0; for (let j = 0; j < hist.length - 1 && n < k; j++) { s += String.fromCharCode(hist[j]); if (this.tp(hist[j + 1], hist[j]) < this.mean) { s += "/"; n++; } } return s; }
}
const BINS = [[0, 1], [1, 2], [2, 4], [4, 8], [8, 16], [16, 32]];
function logBins(hist, k) { let s = ""; for (let b = 0; b < k && b < BINS.length; b++) { const [lo, hi] = BINS[b], part = hist.slice(lo, Math.min(hi, hist.length));
  s += (b < 2 ? String.fromCharCode(...part) : String.fromCharCode(...[...part].sort((x, y) => x - y))) + "/"; } return s; }

let WID = 0;
export class Wire {
  constructor(kind, L, parent = null, flow = 1) { Object.assign(this, {kind, L, parent, flow, age: 0, id: ++WID}); this.rows = new Map(); }
  name() { return this.kind === "blend" ? "blend:" + this.k + "/" + this.L : this.kind + ":" + this.L; }
  // kind "concept": the past seen through the emergent concepts of the geometry (Geometry.concept), not exact bytes
  // kind "blend": the nearest k bytes exact, the older ones seen through their concepts (near sharp, far blurred)
  key(hist, show) {
    if (this.kind === "event") return this.clock.events(hist, this.L) + "|" + show;
    if (this.kind === "log") return logBins(hist, this.L) + "|" + show;
    let s = ""; for (let j = 0; j < this.L; j++) s += this.kind === "concept" || (this.kind === "blend" && j >= this.k) ? this.geo.concept(hist[j]) + "," : String.fromCharCode(this.kind === "fold" ? fold(hist[j]) : hist[j]); return s + "|" + show; }
  // precedent rule: an exact wire with no precedent here improvises through its concept twin (same length) before
  // falling back to its parent
  dist(hist, show) { const r = this.rows.get(this.key(hist, show)); if (r && r.n >= 2) return rowDist(r);
    if (this.alt) { const a = this.alt.rows.get(this.alt.key(hist, show)); if (a && a.n >= 2) return rowDist(a); }
    return this.parent ? this.parent.dist(hist, show) : null; }
  add(hist, show, y) { const k = this.key(hist, show); let r = this.rows.get(k);
    if (r === undefined) { this.rows.set(k, y); return; }                                       // first case: just the byte
    if (typeof r === "number") { r = {n: 1, k: [r], c: [1]}; this.rows.set(k, r); }
    const j = r.k.indexOf(y); if (j < 0) { r.k.push(y); r.c.push(1); } else r.c[j]++; r.n++; }
}

export class EmergentA {
  // off: set of rules switched off for ablation ("R4","R5","R6"); "R5all" = no budding but every wire born at start
  constructor({beta = 0.5, leak = 0.002, budEvery = 400, maxWires = 16, maxL = 12, die = null, grace = 1, off = [], empty = false, fold = true, geo = null, improvise = "mix", clock = null, weigh = "flow"} = {}) {
    Object.assign(this, {beta, leak, budEvery, maxWires, maxL, die, grace, empty, fold, geo, improvise, clock, weigh}); this.off = new Set(off); this.learned = 0;
    // empty: A is born with no wire at all; its first wire is born from its first experience (it sees the byte just
    // before). fold=false: no built-in knowledge of letter case; perception is only "how far back I look".
    this.wires = empty ? [] : [new Wire("exact", 1)];
    if (this.off.has("R5all")) { this.wires = []; for (let L = 1; L <= maxL; L++) for (const k of ["exact", "fold"]) this.wires.push(new Wire(k, L));
      for (const w of this.wires) w.flow = 1 / this.wires.length; }
  }
  belief(hist, show) {                                                      // R4: mix by flow
    let out = null, z = 0;
    for (const w of this.wires) { if (w.silent) continue; const d = w.dist(hist, show); if (!d) continue;
      // choice of perspective at every moment: with weigh = "precedent" a wire speaks as loud as the precedent it has in
      // exactly this situation (n lived cases → n/(n+1)); without a precedent of its own it only whispers
      let wt = w.flow; if (this.weigh === "precedent") { const r = w.rows.get(w.key(hist, show)), n = r ? r.n : 0; wt *= n >= 2 ? n / (n + 1) * Math.log2(1 + n) : .05; }
      if (this.weigh === "deep") { const r = w.rows.get(w.key(hist, show)); wt *= r && r.n >= 2 ? 1 + w.L : .05; }
      out ??= new Array(N).fill(0); for (let i = 0; i < N; i++) out[i] += wt * d[i]; z += wt; }
    return out && out.map(x => x / z);
  }
  learn(hist, y, show) {                                                    // called only on rejections (R2)
    if (!this.wires.length) this.wires.push(new Wire("exact", 1));        // first experience gives birth to the first wire
    for (const w of this.wires) { const d = w.dist(hist, show); if (!this.off.has("R4")) w.flow *= (d ? d[y] : 1 / N) ** this.beta; w.age++; }
    for (const w of this.wires) w.add(hist, show, y);
    const z = this.wires.reduce((s, w) => s + w.flow, 0), W = this.wires.length;
    for (const w of this.wires) w.flow = (1 - this.leak) * w.flow / z + this.leak / W;
    if (++this.learned % this.budEvery === 0) { if (!this.off.has("R6")) this.dissolve(); if (!this.off.has("R5") && !this.off.has("R5all")) this.bud(); }
  }
  bud() {                                                                   // R5
    if (this.wires.length >= this.maxWires) return;
    const have = new Set(this.wires.map(w => w.name()));
    for (const p of [...this.wires].sort((a, b) => b.flow - a.flow)) {
      const k2 = this.fold === "concept" ? "concept" : "fold";
      // blend: an exact wire buds a twin that blurs its oldest byte into a concept; a blend wire reaches one byte
      // further back, blurred
      const tk = this.fold === "event" ? "event" : this.fold === "log" ? "log" : null, tStart = tk === "log" ? 3 : 1, tMax = tk === "log" ? 6 : 5;
      const opts = tk ? (p.kind === "exact" ? [["exact", p.L + 1], [tk, tStart]] : p.L < tMax ? [[tk, p.L + 1]] : []) : this.fold === "blend" ? (p.kind === "exact" ? [["exact", p.L + 1], ...(p.L >= 2 ? [["blend", p.L, p.L - 1]] : [])] : [["blend", p.L + 1, p.k]])
        : !this.fold ? [["exact", p.L + 1]] : p.kind === "exact" ? [["exact", p.L + 1], [k2, p.L]] : [[k2, p.L + 1]];
      const nm = ([k, L, kk]) => k === "blend" ? "blend:" + kk + "/" + L : k + ":" + L;
      const o = opts.find(x => x[1] <= this.maxL && !have.has(nm(x)));
      if (!o) continue;
      const child = new Wire(o[0], o[1], p, p.flow / 2); p.flow /= 2; child.geo = this.geo; child.clock = this.clock; if (o[0] === "blend") child.k = o[2]; this.wires.push(child);
      if (child.kind === "blend" && this.improvise === "precedent") {
        const twin = this.wires.find(w => w.kind === "exact" && w.L === child.L); if (twin && child.k === child.L - 1) { twin.alt = child; child.silent = true; } }
      if (child.kind === "concept" && this.improvise === "precedent") {                 // the twin: exact wire of the same length
        const twin = this.wires.find(w => w.kind === "exact" && w.L === child.L); if (twin) twin.alt = child; child.silent = true; }
      if (child.kind === "exact" && this.improvise === "precedent") { const c = this.wires.find(w => (w.kind === "concept" || (w.kind === "blend" && w.k === w.L - 1)) && w.L === child.L); if (c) child.alt = c; }
      return;
    }
  }
  dissolve() {                                                              // R6
    for (const w of [...this.wires]) if (this.wires.length > 1 && w.flow < (this.die ?? 2 * this.leak / this.wires.length) && w.age > this.grace * this.budEvery && w !== this.wires[0]) {
      this.wires = this.wires.filter(x => x !== w);
      for (const c of this.wires) if (c.parent === w) c.parent = w.parent;
      const z = this.wires.reduce((s, x) => s + x.flow, 0); for (const x of this.wires) x.flow /= z;
    }
  }
  form() { return [...this.wires].sort((a, b) => b.flow - a.flow).map(w => `${w.name()} ${(100 * w.flow).toFixed(0)}%`).join(", "); }
}

// R3: re-read own belief by how often, in this situation, own byte / successor's byte / something else was right
export class Trust {
  constructor() { this.t = new Map(); }
  key(p, own, s) { const q = x => Math.min(9, Math.floor(x * 10)); return q(p[own]) + "|" + q(s.firm); }
  reread(p, own, s) {
    if (!s || s.byte === own) return p;
    const t = this.t.get(this.key(p, own, s)); if (!t || t.n < 30) return p;
    const sO = (t.o + 1) / (t.n + 3), sS = (t.s + 1) / (t.n + 3), sR = 1 - sO - sS;
    let rest = 0; for (let i = 0; i < N; i++) if (i !== own && i !== s.byte) rest += p[i];
    return p.map((x, i) => i === own ? sO : i === s.byte ? sS : sR * x / rest);
  }
  learn(p, own, s, y) {
    if (!s || s.byte === own) return; const k = this.key(p, own, s); let t = this.t.get(k);
    if (!t) { t = {n: 0, o: 0, s: 0}; this.t.set(k, t); } t.n++; t.o += y === own; t.s += y === s.byte;
  }
}

export class EmergentChain {
  // off may also hold "R2" (A learns from every byte, not only rejections) and "R3" (no trust: 50/50 average)
  // temp: temperature of the shown bytes while living (training). 0 = each organism shows its single most likely byte
  // (deterministic); T > 0 = it shows a byte sampled from its belief sharpened/flattened by T (p^(1/T)).
  // Evaluation calls play(..., masked, {temp: 0}) or the default and stays deterministic unless asked.
  // fold: "concept" gives A wires that see the past through the emergent concepts of a Geometry the chain owns
  constructor({depth = 2, seeker = "C", temp = 0, seed = 1, ...opt} = {}) {
    if ((opt.fold === "concept" || opt.fold === "blend") && !opt.geo) opt.geo = new Geometry(opt.geoOpts || {});
    if (opt.fold === "event" && !opt.clock) opt.clock = new EventClock();
    this.clock = opt.clock || null;
    this.geo = opt.geo || null;
    this.off = new Set(opt.off || []); this.seeker = seeker; this.temp = temp;
    let a = seed >>> 0; this.rand = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    this.A = Array.from({length: depth}, () => new EmergentA(opt)); this.T = Array.from({length: depth}, () => new Trust());
  }
  pick(p, T) {
    if (!T) return argmax(p);
    let z = 0; const w = p.map(x => { const v = Math.pow(x, 1 / T); z += v; return v; });
    let r = this.rand() * z; for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return argmax(p);
  }
  play(e, ctx, hist, masked = false, {temp = 0} = {}) {
    const pC = this.seeker === "B" ? distB(e.b, ctx) : distC(e.c, ctx), seq = [{p: pC, byte: this.pick(pC, temp)}];   // R1: seeker shows
    if (!masked) for (const A of this.A) {                                 // forward: each answers its predecessor
      const prev = seq[seq.length - 1], p = A.belief(hist, prev.byte); if (!p) break;
      const b = this.pick(p, temp); seq.push({p, byte: b, firm: p[b]});
    }
    const fin = new Array(seq.length); fin[seq.length - 1] = seq[seq.length - 1].p;   // backward: R3
    for (let k = seq.length - 2; k >= 0; k--) {
      const f = fin[k + 1], sb = argmax(f);
      fin[k] = this.off.has("R3") ? seq[k].p.map((x, i) => (x + f[i]) / 2) : this.T[k].reread(seq[k].p, seq[k].byte, {byte: sb, firm: f[sb]});
    }
    return {seq, fin, out: fin[0]};
  }
  learn(hist, y, {seq, fin}) {
    if (this.geo) this.geo.learn(hist[0], y);
    if (this.clock) this.clock.learn(hist[0], y);
    for (let k = 0; k + 1 < seq.length || k < this.A.length; k++) {
      if (k >= seq.length) break;
      if (k < this.A.length && (y !== seq[k].byte || this.off.has("R2"))) this.A[k].learn(hist, y, seq[k].byte);   // R2
      if (k + 1 < seq.length) { const f = fin[k + 1], sb = argmax(f); this.T[k].learn(seq[k].p, seq[k].byte, {byte: sb, firm: f[sb]}, y); }
    }
  }
  form() { return this.A.map((A, k) => `A${k + 1}: ${A.form()}`); }
}
