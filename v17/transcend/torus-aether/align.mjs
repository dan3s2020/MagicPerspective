// THE GRAPH THAT ALIGNS ITSELF TO THE CONTEXT, AND LOSES NOTHING (research: laws/align*.mjs, docs "Aligning graph").
// Everything lived stays: every symbol of every world, in order. At each moment the whole present context (read
// backwards, as far as it goes) is aligned with ALL the past at once: the deepest alignment and the shallower ones,
// the alignment with the exercise being lived now (its own earlier parts), and the same at the level of FORM (every
// digit the same symbol: the structure of a solution, whatever the numbers). What followed each alignment proposes
// what comes now. Which alignment to follow, when, is learned from experience: before every symbol it predicts, then
// sees what came, and each kind of alignment (source, depth, how much past supports it) earns or loses trust.
// The past is indexed as suffix arrays of the reversed memory: a big one rebuilt when the memory has grown by a
// quarter, and a small one over the newest part rebuilt often, so nothing lived is ever outside the alignment.

const DIG = 48, isD = c => c >= 48 && c <= 57, form = c => (isD(c) ? DIG : c);

function suffixArray(s, n) {                                                // prefix doubling with radix sort, s reversed memory
  let sa = new Int32Array(n), rk = new Int32Array(n), tmp = new Int32Array(n);
  for (let i = 0; i < n; i++) { sa[i] = i; rk[i] = s[i]; }
  const sortBy = (key, maxv) => { const cnt = new Int32Array(maxv + 2), out = new Int32Array(n);
    for (let i = 0; i < n; i++) cnt[key(sa[i]) + 1]++; for (let i = 1; i < cnt.length; i++) cnt[i] += cnt[i - 1];
    for (let i = 0; i < n; i++) out[cnt[key(sa[i])]++] = sa[i]; sa = out; };
  let maxv = 256;
  for (let k = 1; n > 1; k <<= 1) {
    const second = i => (i + k < n ? rk[i + k] + 1 : 0); sortBy(second, maxv + 1); sortBy(i => rk[i], maxv);
    tmp[sa[0]] = 0; let r = 0;
    for (let i = 1; i < n; i++) { const a = sa[i - 1], b = sa[i]; if (rk[a] !== rk[b] || second(a) !== second(b)) r++; tmp[b] = r; }
    [rk, tmp] = [tmp, rk]; maxv = r; if (r === n - 1) break; }
  return sa;
}
// one index over memory[from, to): R = that slice reversed
class Index {
  constructor(mem, from, to) { const n = to - from; this.n = n; this.R = new Uint8Array(n); for (let i = 0; i < n; i++) this.R[i] = mem[to - 1 - i]; this.sa = suffixArray(this.R, n); }
  align(h, i, maxK = 256) {                                                 // every alignment of h[..i) with this past, deepest last
    const {R, sa, n} = this; let lo = 0, hi = n; const out = [];
    for (let k = 0; k < maxK && i - 1 - k >= 0; k++) { const c = h[i - 1 - k];
      let a = lo, b = hi; while (a < b) { const m = (a + b) >> 1, p = sa[m] + k; if ((p < n ? R[p] : -1) < c) a = m + 1; else b = m; } const nlo = a;
      b = hi; while (a < b) { const m = (a + b) >> 1, p = sa[m] + k; if ((p < n ? R[p] : -1) <= c) a = m + 1; else b = m; }
      if (a <= nlo) break; lo = nlo; hi = a; out.push({k: k + 1, lo, hi}); }
    return out; }
  next(al, d, cap) {                                                        // what came after those pasts
    const {R, sa} = this, step = Math.max(1, Math.floor((al.hi - al.lo) / cap)); let tot = 0;
    for (let x = al.lo; x < al.hi; x += step) { const p = sa[x]; if (p === 0) continue; const y = R[p - 1]; d.set(y, (d.get(y) || 0) + 1); tot++; }
    return tot; }
}
// a memory that keeps every symbol, aligned through a big index and a small index over the newest part
class Memory {
  constructor(isForm = false) { this.isForm = isForm; this.buf = new Uint8Array(1 << 16); this.n = 0; this.big = null; this.bigTo = 0; this.small = null; this.smallTo = 0; }
  push(y) { if (this.n === this.buf.length) { const b = new Uint8Array(this.buf.length * 2); b.set(this.buf); this.buf = b; } this.buf[this.n++] = this.isForm ? form(y) : y;
    if (this.n - this.bigTo > Math.max(20000, this.bigTo / 4)) { this.big = new Index(this.buf, 0, this.n); this.bigTo = this.n; this.small = null; this.smallTo = this.n; }
    else if (this.n - this.smallTo > 2000) { this.small = new Index(this.buf, this.bigTo, this.n); this.smallTo = this.n; } }
  // alignments, deepest first: from the big index, then the small one (the newest past)
  props(h, i, src, depthN, cap, out) {
    for (const ix of [this.big, this.small]) { if (!ix) continue; const al = ix.align(h, i), K = al.length;
      for (let d = 0; d < Math.min(K, depthN); d++) { const a = al[K - 1 - d], m = new Map(), tot = ix.next(a, m, cap); if (!tot) continue;
        let y = -1, c = 0; for (const [z, v] of m) if (v > c) { c = v; y = z; } out.push({src: src + (ix === this.small ? "n" : ""), d, sup: a.hi - a.lo, y, dist: m, tot, k: a.k}); } }
    return out; }
}
// the exercise being lived, as a suffix automaton: the longest part of the present that already happened in it
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

export {Memory as AlignMemory, Index as AlignIndex, SelfMem};
export class AligningGraph {
  constructor({g = 8, depth = 6, formDepth = 4, cap = 1024, window = 4096} = {}) {
    Object.assign(this, {g, depth, formDepth, cap, window});
    this.mem = new Memory(); this.fmem = new Memory(true); this.trust = new Map(); this.begin();
    this.hits = 0; this.seen = 0; this.lived = 0;
  }
  begin() { this.h = []; this.fh = []; this.self = new SelfMem(); this.fself = new SelfMem(); }   // a new exercise starts
  key(p) { return p.src + ":" + Math.min(p.d, 12) + ":" + (p.sup < 2 ? 0 : p.sup < 8 ? 1 : p.sup < 64 ? 2 : 3); }
  tr(k) { const t = this.trust.get(k); return t ? (t[0] + 1) / (t[1] + 2) : .5; }
  // everything that aligns with the present proposes; the trust earned decides
  proposals(h = this.h, fh = this.fh, self = this.self, fself = this.fself) {
    const i = h.length, P = [];
    this.mem.props(h, i, "mem", this.depth, this.cap, P);
    const s = self.align(); if (s) P.push({src: "self", d: Math.min(s.k, 12), sup: 1, y: s.y, dist: new Map([[s.y, 1]]), tot: 1, k: s.k});
    this.fmem.props(fh, i, "form", this.formDepth, this.cap, P);
    const f = fself.align(); if (f) P.push({src: "fself", d: Math.min(f.k, 12), sup: 1, y: f.y, dist: new Map([[f.y, 1]]), tot: 1, k: f.k});
    return P; }
  distribution(P) {
    const score = new Map(), add = (y, v) => score.set(y, (score.get(y) || 0) + v); let digitMass = 0;
    for (const p of P) { const w = Math.pow(this.tr(this.key(p)), this.g), isForm = p.src[0] === "f";
      for (const [y, v] of p.dist) { const q = w * v / p.tot; if (isForm && y === DIG) digitMass += q; else add(y, q); } }
    if (digitMass) { let dz = 0; for (const [y, v] of score) if (isD(y)) dz += v;           // the form says "a number here"; which one, the concrete alignments say
      if (dz) for (const [y, v] of [...score]) { if (isD(y)) add(y, digitMass * v / dz); } else add(DIG, digitMass); }
    return score; }
  predict(P = this.proposals()) { let y = 32, b = -1; for (const [z, v] of this.distribution(P)) if (v > b) { b = v; y = z; } return y; }
  // live one symbol: predict it first, then see it, earn trust, keep it forever
  live(y) {
    const P = this.proposals(), guess = this.predict(P);
    this.seen++; this.hits += guess === y; this.lived++;
    for (const p of P) { const k = this.key(p), t = this.trust.get(k) || [0, 0]; t[0] += p.y === (p.src[0] === "f" && isD(y) ? DIG : y); t[1]++; this.trust.set(k, t); }
    this.see(y); return guess === y; }
  see(y) { this.h.push(y); this.fh.push(form(y)); this.self.add(y); this.fself.add(form(y)); this.mem.push(y); this.fmem.push(y);
    if (this.h.length > this.window * 2) this.recenter(); }
  recenter() { const keep = this.h.slice(-this.window); this.begin(); for (const y of keep) { this.h.push(y); this.fh.push(form(y)); this.self.add(y); this.fself.add(form(y)); } }
  accuracy() { if (this.seen) this.last = this.hits / this.seen; this.hits = this.seen = 0; return this.last ?? null; }   // since it was last asked (the last one when nothing was lived)
  // frozen: read a text it never lived, guessing every next symbol (its own exercise-memory, nothing learned)
  readFrozen(bytes, onStep) {
    const h = [], fh = [], self = new SelfMem(), fself = new SelfMem(); let ok = 0;
    for (let i = 0; i < bytes.length; i++) { const P = this.proposals(h, fh, self, fself), g = this.predict(P), y = bytes[i]; ok += g === y; onStep?.(i, y, g);
      h.push(y); fh.push(form(y)); self.add(y); fself.add(form(y)); }
    return ok / Math.max(1, bytes.length); }
  // writing: follow its own alignment, symbol after symbol (temperature over the trusted distribution)
  write(prompt, {max = 400, T = 0, rand = Math.random, stop = null} = {}) {
    const h = [], fh = [], self = new SelfMem(), fself = new SelfMem(), push = y => { h.push(y); fh.push(form(y)); self.add(y); fself.add(form(y)); };
    for (const y of prompt) push(y); const out = [];
    for (let k = 0; k < max; k++) { const d = this.distribution(this.proposals(h, fh, self, fself)); let y = 32;
      if (!T) { let b = -1; for (const [z, v] of d) if (v > b) { b = v; y = z; } }
      else { let z = 0; const w = [...d].map(([c, v]) => { const x = Math.pow(v, 1 / T); z += x; return [c, x]; }); let r = rand() * z; for (const [c, x] of w) { r -= x; if (r <= 0) { y = c; break; } } }
      if (stop && stop(y, out)) break; out.push(y); push(y); }
    return out; }
}
