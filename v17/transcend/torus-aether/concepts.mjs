// Emergent concepts, the same mechanism the living-graph page shows: every symbol lives on a 5-torus and moves only by
// what it lives through (pulled toward what it follows, pushed from random contexts, its own frequency bias, mild
// mutual repulsion). Concepts are the regions where symbols condense — found with no number of groups given.
// Concept ids are kept stable across regroupings (a new group inherits the id of the old group it overlaps most).
const TAU = 2 * Math.PI, wrap1 = x => x - Math.floor(x), wrapD = x => x - Math.round(x), sig = z => 1 / (1 + Math.exp(-z));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

export class Geometry {
  constructor({D = 5, lr = .03, neg = 3, repel = .3, thr = .5, every = 10000, seed = 7} = {}) {
    Object.assign(this, {D, lr, neg, repel, thr, every}); this.r = rng(seed);
    this.U = new Map(); this.V = new Map(); this.B = new Map(); this.seen = []; this.n = 0; this.cid = new Map(); this.nextId = 0;
  }
  vec() { return Array.from({length: this.D}, () => this.r()); }
  learn(x, y) {
    const {D, lr} = this;
    for (const s of [x, y]) if (!this.U.has(s)) { this.U.set(s, this.vec()); this.V.set(s, this.vec()); this.B.set(s, 0); }
    this.seen.push(y); if (this.seen.length > 20000) this.seen.splice(0, 10000);
    const upd = (u, v, label) => { let sc = 0; for (let i = 0; i < D; i++) sc += Math.cos(TAU * (u[i] - v[i])); const g = lr * (label - sig(sc + this.B.get(y)));
      this.B.set(y, this.B.get(y) + g); for (let i = 0; i < D; i++) { const sn = Math.sin(TAU * (u[i] - v[i])); u[i] = wrap1(u[i] - g * sn); v[i] = wrap1(v[i] + g * sn); } };
    const U = this.U.get(y); upd(U, this.V.get(x), 1);
    for (let k = 0; k < this.neg; k++) { const z = this.seen[Math.floor(this.r() * this.seen.length)]; upd(U, this.V.get(z), 0); }
    const z = this.seen[Math.floor(this.r() * this.seen.length)], uz = this.U.get(z);
    if (z !== y) for (let i = 0; i < D; i++) { const f = lr * this.repel * Math.sin(TAU * wrapD(U[i] - uz[i])) / TAU; U[i] = wrap1(U[i] + f); uz[i] = wrap1(uz[i] - f); }
    if (++this.n % this.every === 0) this.regroup();
  }
  regroup() {
    const syms = [...this.U.keys()], P = syms.map(s => this.U.get(s)), n = P.length; if (n < 6) return;
    const dist = (a, b) => { let s = 0; for (let i = 0; i < this.D; i++) { const d = wrapD(a[i] - b[i]); s += d * d; } return Math.sqrt(s); };
    const M = P.map(a => P.map(b => dist(a, b))), all = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) all.push(M[i][j]); all.sort((a, b) => a - b);
    const thr = all[Math.floor(all.length / 2)] * this.thr; let G = syms.map((_, i) => [i]);
    for (;;) { let best = null, bd = thr;
      for (let a = 0; a < G.length; a++) for (let b = a + 1; b < G.length; b++) { let s = 0; for (const x of G[a]) for (const y of G[b]) s += M[x][y]; s /= G[a].length * G[b].length; if (s < bd) { bd = s; best = [a, b]; } }
      if (!best) break; G[best[0]] = G[best[0]].concat(G[best[1]]); G.splice(best[1], 1); }
    const old = this.cid, fresh = new Map(), used = new Set();
    for (const g of G.sort((a, b) => b.length - a.length)) {
      const votes = new Map(); for (const i of g) { const o = old.get(syms[i]); if (o !== undefined) votes.set(o, (votes.get(o) || 0) + 1); }
      let id = null, bv = 0; for (const [o, v] of votes) if (v > bv && !used.has(o)) { bv = v; id = o; }
      if (id === null) id = this.nextId++; used.add(id); for (const i of g) fresh.set(syms[i], id);
    }
    this.cid = fresh;
  }
  concept(sym) { const c = this.cid.get(sym); return c === undefined ? "s" + sym : "c" + c; }   // unknown yet: itself
}
