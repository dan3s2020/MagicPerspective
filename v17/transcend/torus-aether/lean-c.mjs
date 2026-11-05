// C (the epistemic perspective builder of transcend/epistemic-text/engine.mjs) with the same decisions, stored lean:
// every row keeps only the bytes that really followed ({n, k:[bytes], c:[counts]}) instead of 128 slots, so a graph can
// devour millions of characters. engine.mjs is not modified; tests/torus-devour.test.mjs checks that LeanC predicts and
// promotes exactly like EpistemicText.
import {candidates} from "../epistemic-text/engine.mjs";

const rate = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
export class SparseCounter {
  constructor() { this.entries = new Map(); this.total = Array(128).fill(0); this.updates = 0; }
  prior() { let k = 32, b = 0; for (let i = 0; i < 128; i++) if (this.total[i] > b) { b = this.total[i]; k = i; } return k; }
  predict(key, fallback = this.prior(), minimum = 2) {
    const row = this.entries.get(key); if (!row || typeof row === "number" || row.n < minimum) return fallback;   // a number = one case seen
    let k = fallback, b = -1;                                   // same scan as the dense row: first maximum by byte order
    for (let j = 0; j < row.k.length; j++) { const c = row.c[j], y = row.k[j]; if (c > b || (c === b && y < k)) { b = c; k = y; } }
    if (b <= 0) return fallback; return k;
  }
  update(key, y) { let row = this.entries.get(key);
    if (row === undefined) { this.entries.set(key, y); this.total[y]++; this.updates++; return; }          // first case: just the byte
    if (typeof row === "number") { row = {n: 1, k: [row], c: [1]}; this.entries.set(key, row); }
    const j = row.k.indexOf(y); if (j < 0) { row.k.push(y); row.c.push(1); } else row.c[j]++; row.n++; this.total[y]++; this.updates++; }
}
const category = n => n === 32 ? "space" : n === 10 ? "line" : n >= 48 && n <= 57 ? "num" : n >= 65 && n <= 90 ? "upper" : n >= 97 && n <= 122 ? "lower" : "other";
const feature = (n, kind) => kind === "class" ? category(n) : kind === "fold" ? String.fromCharCode(n >= 65 && n <= 90 ? n + 32 : n) : String.fromCharCode(n);
const keyN = (ctx, p, n) => { const out = []; for (let i = 0; i < n; i++) if (p.mask & (1 << i)) out.push(feature(ctx[i], p.kind)); return out.join("|"); };

// Options (defaults = the engine exactly): cap — how many past positions C may come to see (the engine: 4; more lets its
// attention grow with experience, one position every 112 episodes); margin and window — how much evidence a new
// perspective needs before C switches (a cost of changing its laws: .05 and 400 cut 54–117 flips to 3–5 at ±1 point).
export class LeanC {
  constructor({cap = 4, margin = .018, window = 100, many = 0} = {}) { Object.assign(this, {cap, margin, window, many});
    this.maxLag = 1; this.models = {}; this.base = new SparseCounter(); this.active = "exact:1"; this.episodes = 0; this.validation = []; this.promotions = 0; }
  key(ctx, p) { return keyN(ctx, p, this.cap); }
  model(p) { return this.models[p.id] || (this.models[p.id] = new SparseCounter()); }
  predictCandidate(ctx, p) { const m = this.models[p.id]; return m ? m.predict(this.key(ctx, p), this.base.prior(), 2) : this.base.prior(); }
  predict(ctx, {ablate = false} = {}) { const id = ablate ? "class:1" : this.active;
    const p = candidates(this.maxLag).find(x => x.id === id) || candidates(this.maxLag)[0]; return this.predictCandidate(ctx, p); }
  observe(ctx, y) {
    this.episodes++;
    const observed = ctx.slice(0, this.maxLag).concat(Array(this.cap - this.maxLag).fill(-1)), programs = candidates(this.maxLag);
    if (this.episodes % 7 === 0) { this.validation.push({predictions: programs.map(p => ({id: p.id, value: this.predictCandidate(observed, p)})), y}); if (this.validation.length > this.window) this.validation.shift(); }
    else { this.base.update("*", y); for (const p of programs) this.model(p).update(this.key(observed, p), y); }
    if (this.episodes % 112 === 0 && this.maxLag < this.cap) { this.maxLag++; this.validation = []; }
    if (this.episodes % 28 === 0) this.reframe();
  }
  reframe() {
    if (this.validation.length < 8) return;
    const scores = candidates(this.maxLag).map(p => { const compatible = this.validation.filter(x => x.predictions.some(v => v.id === p.id));
      const acc = rate(compatible.map(x => Number(x.predictions.find(z => z.id === p.id).value === x.y)));
      return {p, acc, score: acc - .003 * p.mask.toString(2).replaceAll("0", "").length}; });
    scores.sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id));
    if (this.many) this.top = [...scores].sort((a, b) => b.acc - a.acc).slice(0, this.many).map(s => ({id: s.p.id, kind: s.p.kind, mask: s.p.mask, w: s.acc * s.acc}));   // many beliefs: the best K, each by its record
    const best = scores[0], old = scores.find(s => s.p.id === this.active);
    if (best.p.id !== this.active && best.score > (old?.score ?? 0) + this.margin && best.acc >= .2) { this.active = best.p.id; this.promotions++; }
  }
}
