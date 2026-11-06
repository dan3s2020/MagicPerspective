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
    if (this.lazy) return;                                                  // fed by the card: indexed only when it is read
    if (this.n - this.bigTo > Math.max(20000, this.bigTo / 4)) { this.big = new Index(this.buf, 0, this.n); this.bigTo = this.n; this.small = null; this.smallTo = this.n; }
    else if (this.n - this.smallTo > 2000) { this.small = new Index(this.buf, this.bigTo, this.n); this.smallTo = this.n; } }
  // alignments, deepest first: from the big index, then the small one (the newest past)
  ready(full = false) { if (this.lazy && this.n > 1 && this.bigTo !== this.n && (full || this.n - this.bigTo > Math.max(20000, this.bigTo / 4))) { this.big = new Index(this.buf, 0, this.n); this.bigTo = this.n; this.small = null; } }   // reading: everything; living: when it grew by a quarter
  props(h, i, src, depthN, cap, out) { this.ready();
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
  align() { const s = this.link[this.last]; if (s <= 0 || this.len[s] === 0) return null; const at = this.first[s]; return at + 1 < this.h.length ? {k: this.len[s], y: this.h[at + 1], far: this.h.length - 1 - at} : null; }
}

export {Memory as AlignMemory, Index as AlignIndex, SelfMem};
export class AligningGraph {
  constructor({g = 8, depth = 6, formDepth = 4, cap = 1024, window = 4096} = {}) {
    Object.assign(this, {g, depth, formDepth, cap, window});
    this.mem = new Memory(); this.fmem = new Memory(true); this.trust = new Map(); this.begin();
    this.hits = 0; this.seen = 0; this.lived = 0;
    // knowing itself and improving itself: next to how it reads now (g = how sharply it follows the alignments it trusts,
    // form = how much it believes the form against the concrete), it reads the same moments with variations of itself;
    // after every window it becomes the variation that guessed best what it had not seen yet (G_t → G_{t+1})
    this.formW = 1; this.meta = {window: 20000, n: 0, hits: new Map(), history: []}; this.imagineEvery = 31; this.imagineK = 48; this.imag = null;
  }
  variants() { const g = this.g, f = this.formW; return [[g, f], [g / 2, f], [g * 2, f], [g, f / 2], [g, Math.min(4, f * 2)]]; }
  improve(P, y) { const M = this.meta; if (!M || !P.length) return; const vs = this.variants(), keep = [this.g, this.formW];
    for (const [g, f] of vs) { this.g = g; this.formW = f; const k = g + "|" + f; M.hits.set(k, (M.hits.get(k) || 0) + (this.predict(P) === y)); }
    [this.g, this.formW] = keep; M.n++;
    if (M.n >= M.window) { const base = M.hits.get(keep.join("|")) || 0; let best = keep, bh = base;
      for (const [g, f] of vs) { const h = M.hits.get(g + "|" + f) || 0; if (h > bh * 1.002) { bh = h; best = [g, f]; } }
      if (best !== keep) { M.history.push({at: this.lived, from: {g: keep[0], form: keep[1]}, to: {g: best[0], form: best[1]}, before: +(base / M.n).toFixed(4), after: +(bh / M.n).toFixed(4)}); [this.g, this.formW] = best; }
      M.n = 0; M.hits = new Map(); } }
  // what it knows about how it works: how far each kind of alignment can be trusted, by depth
  selfModel() { const out = {}; for (const [k, t] of this.trust) { const [src] = k.split(":"); const o = out[src] || (out[src] = {right: 0, tried: 0}); o.right += t[0]; o.tried += t[1]; }
    for (const o of Object.values(out)) o.trust = +(o.right / Math.max(1, o.tried)).toFixed(3);
    return {sources: out, g: this.g, form: this.formW, history: (this.meta?.history || []).slice(-12)}; }
  begin() { this.h = []; this.fh = []; this.self = new SelfMem(); this.fself = new SelfMem(); }   // a new exercise starts
  key(p) { return p.src + ":" + Math.min(p.d, 12) + ":" + (p.sup < 2 ? 0 : p.sup < 8 ? 1 : p.sup < 64 ? 2 : 3) + (p.far != null && this.farKey !== false ? ":" + Math.min(9, Math.floor(Math.log2(1 + p.far))) : "") + (p.cc ? ":c" : ""); }   // :c = it is living a world of control symbols (not text): trust is earned apart   // for its own exercise: also how far back the alignment points
  tr(k) { const t = this.trust.get((this.imagining ? "w|" : "") + k); return t ? (t[0] + 1) / (t[1] + 2) : (this.imagining ? this.tr0(k) : .5); }
  tr0(k) { const t = this.trust.get(k); return t ? (t[0] + 1) / (t[1] + 2) : .5; }   // before it has imagined anything, what it trusts when reading
  // everything that aligns with the present proposes; the trust earned decides
  proposals(h = this.h, fh = this.fh, self = this.self, fself = this.fself) {
    const i = h.length, P = [];
    this.mem.props(h, i, "mem", this.depth, this.cap, P);
    const s = self.align(); if (s) P.push({src: "self", d: Math.min(s.k, 12), sup: 1, y: s.y, dist: new Map([[s.y, 1]]), tot: 1, k: s.k, far: s.far});
    this.fmem.props(fh, i, "form", this.formDepth, this.cap, P);
    const f = fself.align(); if (f) P.push({src: "fself", d: Math.min(f.k, 12), sup: 1, y: f.y, dist: new Map([[f.y, 1]]), tot: 1, k: f.k, far: f.far});
    const last = h[i - 1]; if (last !== undefined && ((last < 32 && last !== 10 && last !== 9) || last === 127)) for (const p of P) p.cc = 1;
    return P; }
  distribution(P) {
    const score = new Map(), add = (y, v) => score.set(y, (score.get(y) || 0) + v); let digitMass = 0;
    for (const p of P) { const isForm = p.src[0] === "f", w = Math.pow(this.tr(this.key(p)), this.g) * (isForm ? (this.formW ?? 1) : 1);
      for (const [y, v] of p.dist) { const q = w * v / p.tot; if (isForm && y === DIG) digitMass += q; else add(y, q); } }
    if (digitMass) { let dz = 0; for (const [y, v] of score) if (isD(y)) dz += v;           // the form says "a number here"; which one, the concrete alignments say
      if (dz) for (const [y, v] of [...score]) { if (isD(y)) add(y, digitMass * v / dz); } else add(DIG, digitMass); }
    return score; }
  predict(P = this.proposals()) { let y = 32, b = -1; for (const [z, v] of this.distribution(P)) if (v > b) { b = v; y = z; } return y; }
  // live one symbol: predict it first, then see it, earn trust, keep it forever
  live(y, opts = null) {
    const P = this.proposals(), guess = opts && (opts.T || opts.noise) ? this.choose(this.distribution(P), opts) : this.predict(P);
    this.seen++; this.hits += guess === y; this.lived++; if (this.meta) this.improve(P, y);
    // its own imagination, checked against reality (as the shape of the solution in the labyrinths): every so often it
    // writes ahead from its own expectations only; as the real symbols come, each alignment it followed while imagining
    // earns or loses the trust it gets WHEN it imagines (writing uses that trust, reading the other)
    if (this.imag) { const s = this.imag.steps[this.imag.at++]; if (s && this.imag.ok) { for (const p of s) { const k = "w|" + this.key(p), t = this.trust.get(k) || [0, 0]; t[0] += p.y === (p.src[0] === "f" && isD(y) ? DIG : y); t[1]++; this.trust.set(k, t); } if (s.guess !== y) this.imag.ok = this.imag.at < 3; }
      if (this.imag.at >= this.imag.steps.length) this.imag = null; }
    if (!this.imag && this.imagineEvery && this.lived % this.imagineEvery === 0) this.imag = {steps: this.imagineAhead(this.imagineK), at: 0, ok: true};
    for (const p of P) { const k = this.key(p), t = this.trust.get(k) || [0, 0]; t[0] += p.y === (p.src[0] === "f" && isD(y) ? DIG : y); t[1]++; this.trust.set(k, t); }
    let src = null, bw = -1; for (const p of P) if (p.y === guess) { const w = this.tr(this.key(p)); if (w > bw) { bw = w; src = p.src; } }   // which alignment it followed
    this.see(y); return {guess, src}; }
  imagineAhead(K) {                                                       // write K symbols ahead from its own expectations (nothing is learned here)
    const h = this.h.slice(-this.window), fh = this.fh.slice(-this.window), self = new SelfMem(), fself = new SelfMem(), steps = [];
    for (let i = 0; i < h.length; i++) { self.add(h[i]); fself.add(fh[i]); }
    this.imagining = true; for (let k = 0; k < K; k++) { const P = this.proposals(h, fh, self, fself), g = this.predict(P); P.guess = g; steps.push(P); h.push(g); fh.push(form(g)); self.add(g); fself.add(form(g)); }
    this.imagining = false; return steps; }
  see(y) { this.h.push(y); this.fh.push(form(y)); this.self.add(y); this.fself.add(form(y)); this.mem.push(y); this.fmem.push(y);
    if (this.h.length > this.window * 2) this.recenter(); }
  recenter() { const keep = this.h.slice(-this.window); this.begin(); for (const y of keep) { this.h.push(y); this.fh.push(form(y)); this.self.add(y); this.fself.add(form(y)); } }
  // a batch lived on the card (gpu/text_gpu.py): add the totals — the trust each kind of alignment earned, how often
  // it guessed right, how its variations did — and keep every exercise in memory
  absorb(R, exs) {
    this.mem.lazy = this.fmem.lazy = true;
    for (const [name, right, tried] of R.trust) { const t = this.trust.get(name) || [0, 0]; t[0] += right; t[1] += tried; this.trust.set(name, t); }
    this.hits += R.hits; this.seen += R.seen; this.lived += R.seen;
    if (this.meta && R.variants?.length) { const M = this.meta, vs = this.variants(), keep = [this.g, this.formW], base = R.hits; let best = keep, bh = base;
      vs.forEach(([g, f], i) => { if (R.variants[i] > bh * 1.002) { bh = R.variants[i]; best = [g, f]; } });
      if (best !== keep) { M.history.push({at: this.lived, from: {g: keep[0], form: keep[1]}, to: {g: best[0], form: best[1]}, before: +(base / R.seen).toFixed(4), after: +(bh / R.seen).toFixed(4)}); [this.g, this.formW] = best; } }
    for (const e of exs) for (const y of e) { this.mem.push(y); this.fmem.push(y); }
  }
  trustForCard() { const out = []; for (const [k, t] of this.trust) { if (k.includes("n:") || k.endsWith(":c")) continue; out.push([k, t[0], t[1]]); } return out; }
  accuracy() { if (this.seen) this.last = this.hits / this.seen; this.hits = this.seen = 0; return this.last ?? null; }   // since it was last asked (the last one when nothing was lived)
  // frozen: read a text it never lived, guessing every next symbol (its own exercise-memory, nothing learned)
  // T = 0: always the most trusted symbol (determinism); T > 0: drawn from the trusted distribution (randomness);
  // noise: every candidate's weight shaken by up to ±noise before choosing (the hallucination comes from there)
  choose(d, {T = 0, noise = 0, rand = Math.random} = {}) {
    let best = 32, bv = -1; const w = [];
    for (const [c, v0] of d) { const v = noise ? v0 * Math.max(0, 1 + noise * (2 * rand() - 1)) : v0; if (v > bv) { bv = v; best = c; } w.push([c, v]); }
    if (!T) return best; let z = 0; for (const x of w) { x[1] = Math.pow(x[1], 1 / T); z += x[1]; } let r = rand() * z; for (const [c, x] of w) { r -= x; if (r <= 0) return c; } return best; }
  readFrozen(bytes, onStep, opts = {}) { this.mem.ready(true); this.fmem.ready(true);
    const h = [], fh = [], self = new SelfMem(), fself = new SelfMem(); let ok = 0;
    for (let i = 0; i < bytes.length; i++) { const P = this.proposals(h, fh, self, fself), d = this.distribution(P), g = this.choose(d, opts), y = bytes[i]; ok += g === y; onStep?.(i, y, g, d);
      h.push(y); fh.push(form(y)); self.add(y); fself.add(form(y)); }
    return ok / Math.max(1, bytes.length); }
  // writing: follow its own alignment, symbol after symbol (temperature over the trusted distribution)
  write(prompt, {max = 400, T = 0, rand = Math.random, stop = null, loopPenalty = 0, loopWindow = 24} = {}) { this.mem.ready(true); this.fmem.ready(true);
    const h = [], fh = [], self = new SelfMem(), fself = new SelfMem(), push = y => { h.push(y); fh.push(form(y)); self.add(y); fself.add(form(y)); };
    for (const y of prompt) push(y); const out = []; this.imagining = true;
    // Research-only optional loop resistance. The default (loopPenalty=0) preserves original V17 output exactly.
    const resistance = Math.max(0, Number(loopPenalty) || 0), span = Math.max(4, Math.min(96, Math.floor(loopWindow) || 24));
    const repeats = resistance > 0 ? new Map() : null;
    const ending = (last = null) => String.fromCharCode(...h.slice(last === null ? -span : 1 - span), ...(last === null ? [] : [last]));
    if (repeats) for (let i = span - 1; i < h.length; i++) {
      const key = String.fromCharCode(...h.slice(i - span + 1, i + 1));
      repeats.set(key, (repeats.get(key) || 0) + 1);
    }
    for (let k = 0; k < max; k++) {
      const original = this.distribution(this.proposals(h, fh, self, fself));
      const d = repeats ? new Map([...original].map(([z,v]) => [z, v / (1 + resistance * (repeats.get(ending(z)) || 0))])) : original;
      let y = 32;
      if (!T) { let b = -1; for (const [z, v] of d) if (v > b) { b = v; y = z; } }
      else { let z = 0; const w = [...d].map(([c, v]) => { const x = Math.pow(v, 1 / T); z += x; return [c, x]; }); let r = rand() * z; for (const [c, x] of w) { r -= x; if (r <= 0) { y = c; break; } } }
      if (stop && stop(y, out)) break; out.push(y); push(y);
      if (repeats && h.length >= span) {
        const key = ending();
        repeats.set(key, (repeats.get(key) || 0) + 1);
      }
    }
    this.imagining = false; return out; }
}
