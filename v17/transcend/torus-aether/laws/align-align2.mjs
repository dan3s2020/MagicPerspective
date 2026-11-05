// Research: a graph that aligns itself to the context and loses nothing.
// Memory = every lived exercise, whole (nothing dissolved). At every moment the graph aligns the present context
// (everything read so far, read backwards) with ALL its past at once: the deepest alignment and every shallower one,
// plus the alignment with the exercise it is living now. Which alignment to follow is itself learned from experience
// (trust per depth, like the trust in the shape of the solution in the labyrinths).
// Measured on unseen exercises, curriculum from the shortest to the longest, at growing amounts of experience.
import fs from "node:fs";

const asc = s => { const o = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; o.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return o; };
const load = f => fs.readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l)).map(x => asc("Q: " + x.question + "\nA: " + x.answer + "\n\n"));
const D = process.env.GSM || process.argv[2] || "gsm/grade_school_math/data";
const train = load(D + "/train.jsonl").sort((a, b) => a.length - b.length);   // curriculum: smallest first
const testAll = load(D + "/test.jsonl").sort((a, b) => a.length - b.length);
const NT = +(process.env.NT || 240), test = Array.from({length: NT}, (_, i) => testAll[Math.floor(i * testAll.length / NT)]);
const answerStart = ex => { for (let i = 0; i < ex.length - 2; i++) if (ex[i] === 10 && ex[i + 1] === 65 && ex[i + 2] === 58) return i + 3; return 0; };

// ---- suffix array over the REVERSED memory (so a context read backwards is a prefix: ranges nest as it deepens) ----
function suffixArray(s) {                                                    // prefix doubling with radix sort
  const n = s.length; let sa = new Int32Array(n), rk = new Int32Array(n), tmp = new Int32Array(n), cnt;
  for (let i = 0; i < n; i++) { sa[i] = i; rk[i] = s[i]; }
  const sortBy = (k, key, maxv) => { cnt = new Int32Array(maxv + 2); const out = new Int32Array(n);
    for (let i = 0; i < n; i++) cnt[key(sa[i]) + 1]++; for (let i = 1; i < cnt.length; i++) cnt[i] += cnt[i - 1];
    for (let i = 0; i < n; i++) out[cnt[key(sa[i])]++] = sa[i]; sa = out; };
  let maxv = 256;
  for (let k = 1; ; k <<= 1) {
    const second = i => (i + k < n ? rk[i + k] + 1 : 0); sortBy(k, second, maxv + 1); sortBy(k, i => rk[i], maxv);
    tmp[sa[0]] = 0; let r = 0;
    for (let i = 1; i < n; i++) { const a = sa[i - 1], b = sa[i]; if (rk[a] !== rk[b] || second(a) !== second(b)) r++; tmp[b] = r; }
    [rk, tmp] = [tmp, rk]; maxv = r; if (r === n - 1) break; }
  return sa;
}
class Memory {
  constructor(exs) { const tot = exs.reduce((a, e) => a + e.length, 0); this.T = new Uint8Array(tot); let p = 0; for (const e of exs) { this.T.set(e, p); p += e.length; }
    const n = tot; this.R = new Uint8Array(n); for (let i = 0; i < n; i++) this.R[i] = this.T[n - 1 - i]; this.sa = suffixArray(this.R); this.n = n; }
  // all alignments of the context ending before position i of h: [{k, lo, hi}] deepest last
  align(h, i, maxK = 400) {
    const {R, sa, n} = this; let lo = 0, hi = n; const out = [];
    for (let k = 0; k < maxK && i - 1 - k >= 0; k++) { const c = h[i - 1 - k];
      let a = lo, b = hi; while (a < b) { const m = (a + b) >> 1, p = sa[m] + k; if ((p < n ? R[p] : -1) < c) a = m + 1; else b = m; } const nlo = a;
      b = hi; while (a < b) { const m = (a + b) >> 1, p = sa[m] + k; if ((p < n ? R[p] : -1) <= c) a = m + 1; else b = m; }
      if (a <= nlo) break; lo = nlo; hi = a; out.push({k: k + 1, lo, hi}); }
    return out; }
  next(al, cap = 4096) {                                                     // what came after the aligned pasts (counts)
    const {R, sa} = this, d = new Map(), step = Math.max(1, Math.floor((al.hi - al.lo) / cap)); let tot = 0;
    for (let x = al.lo; x < al.hi; x += step) { const p = sa[x]; if (p === 0) continue; const y = R[p - 1]; d.set(y, (d.get(y) || 0) + 1); tot++; }
    return {d, tot}; }
}
// alignment inside the exercise being lived (the exercise joins the memory as it is read): a suffix automaton of the
// exercise so far; the longest suffix of the present that happened earlier = the link of the last state
class SelfMem {
  constructor() { this.len = [0]; this.link = [-1]; this.next = [new Map()]; this.first = [-1]; this.last = 0; this.h = []; }
  add(c) { const {len, link, next, first} = this, cur = len.length, pos = this.h.length; this.h.push(c);
    len.push(len[this.last] + 1); link.push(0); next.push(new Map()); first.push(pos); let p = this.last;
    while (p !== -1 && !next[p].has(c)) { next[p].set(c, cur); p = link[p]; }
    if (p !== -1) { const q = next[p].get(c);
      if (len[p] + 1 === len[q]) link[cur] = q;
      else { const cl = len.length; len.push(len[p] + 1); link.push(link[q]); next.push(new Map(next[q])); first.push(first[q]);
        while (p !== -1 && next[p].get(c) === q) { next[p].set(c, cl); p = link[p]; } link[q] = cl; link[cur] = cl; } }
    this.last = cur; }
  align() { const s = this.link[this.last]; if (s <= 0 || this.len[s] === 0) return null; const at = this.first[s]; return at + 1 < this.h.length ? {k: this.len[s], y: this.h[at + 1]} : null; }
}

// ---- the form: the same past seen at another level of abstraction (every digit the same symbol) ----
const DIG = 48, isD = c => c >= 48 && c <= 57, abs = a => a.map(c => isD(c) ? DIG : c);
class Aligner2 {
  constructor() { this.trust = new Map(); this.g = +(process.env.G || 3); }
  key(src, d, sup) { return src + ":" + Math.min(d, 12) + ":" + (sup < 2 ? 0 : sup < 8 ? 1 : sup < 64 ? 2 : 3); }
  tr(k) { const t = this.trust.get(k); return t ? (t[0] + 1) / (t[1] + 2) : .5; }
  props(mem, h, i, src, depthN = 6) { const out = [], al = mem.align(h, i), K = al.length;
    for (let d = 0; d < Math.min(K, depthN); d++) { const a = al[K - 1 - d], {d: m, tot} = mem.next(a); if (!tot) continue; let y = -1, c = 0; for (const [z, v] of m) if (v > c) { c = v; y = z; }
      out.push({src, d, sup: a.hi - a.lo, y, dist: m, tot}); } return out; }
  predict(W, h, i, opts) {
    let P = this.props(W.mem, h, i, "mem");
    if (opts.self && this.self) { const s = this.self.align(); if (s) P.push({src: "self", d: Math.min(s.k, 12), sup: 1, y: s.y, dist: new Map([[s.y, 1]]), tot: 1}); }
    if (opts.form) { const ha = W.habs; P = P.concat(this.props(W.amem, ha, i, "form", 4));
      if (this.aself) { const s = this.aself.align(); if (s) P.push({src: "fself", d: Math.min(s.k, 12), sup: 1, y: s.y, dist: new Map([[s.y, 1]]), tot: 1}); } }
    const score = new Map(), add = (y, v) => score.set(y, (score.get(y) || 0) + v);
    let digitMass = 0;
    for (const p of P) { const w = Math.pow(this.tr(this.key(p.src, p.d, p.sup)), this.g);
      for (const [y, v] of p.dist) { const q = w * v / p.tot; if ((p.src === "form" || p.src === "fself") && y === DIG) digitMass += q; else add(y, q); } }
    if (digitMass) { let dz = 0; for (const [y, v] of score) if (isD(y)) dz += v;   // the form says "a number here": which one, the concrete alignments say
      if (dz) for (const [y, v] of [...score]) { if (isD(y)) add(y, digitMass * v / dz); } else add(DIG, digitMass); }
    let y = 32, b = -1; for (const [z, v] of score) if (v > b) { b = v; y = z; } return {y, P}; }
  learn(P, y) { for (const p of P) { const t = this.trust.get(this.key(p.src, p.d, p.sup)) || [0, 0]; const yy = (p.src === "form" || p.src === "fself") && isD(y) ? DIG : y; t[0] += p.y === yy; t[1]++; this.trust.set(this.key(p.src, p.d, p.sup), t); } }
}
const buckets = [0, 300, 450, 650, 900, 2000];
function live(W, ag, ex, opts, onStep) { W.habs = abs(ex); ag.self = new SelfMem(); ag.aself = new SelfMem(); ag.self.add(ex[0]); ag.aself.add(W.habs[0]);
  for (let i = 1; i < ex.length; i++) { onStep(i); ag.self.add(ex[i]); ag.aself.add(W.habs[i]); } }
function evaluate(W, ag, opts) {
  const per = buckets.slice(1).map(() => ({aok: 0, an: 0})); let ok = 0, n = 0;
  for (const ex of test) { const b = per[buckets.findIndex((v, j) => ex.length < buckets[j + 1])], a0 = answerStart(ex);
    live(W, ag, ex, opts, i => { const r = ag.predict(W, ex, i, opts), hit = r.y === ex[i]; ok += hit; n++; if (i >= a0) { b.aok += hit; b.an++; } }); }
  const A = per.reduce((s, x) => ({aok: s.aok + x.aok, an: s.an + x.an}), {aok: 0, an: 0});
  return {all: +(ok / n).toFixed(4), answer: +(A.aok / A.an).toFixed(4), byLen: per.map(x => +(x.aok / Math.max(1, x.an)).toFixed(4))};
}
const world = exs => ({mem: new Memory(exs), amem: new Memory(exs.map(abs))});
const sizes = (process.env.SIZES || "1000,4000").split(",").map(Number);
for (const N of sizes) {
  const t0 = performance.now(), seen = train.slice(0, N), k = Math.max(1, Math.floor(N * .9)), WA = world(seen.slice(0, k)), W = world(seen), row = {exercises: N};
  for (const [name, opts] of [["self", {self: true}], ["self+form", {self: true, form: true}]]) {
    const ag = new Aligner2(); for (const ex of seen.slice(k)) live(WA, ag, ex, opts, i => { if (i % 3 === 0) { const r = ag.predict(WA, ex, i, opts); ag.learn(r.P, ex[i]); } });
    row[name] = evaluate(W, ag, opts); }
  console.log(JSON.stringify({...row, sec: +((performance.now() - t0) / 1000).toFixed(1)}));
}
