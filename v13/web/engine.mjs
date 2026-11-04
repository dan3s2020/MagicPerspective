// MagicPerspective V13 — Bucla perspectivei (the perspective loop).
//
// What the conversation asked (2026-11-04):
//  * A, B, C are each a FORM of perspective; the geometry lets them move ("bend") their perspective higher or lower;
//  * "inelele sunt făcute să poți să te plimbi prin spațiul interior lor de la cea mai mare perspectivă la cea mai mică,
//    adică de la omega la alfa, trecând prin tot ... dar cea mică alfa își continuă drumul direct spre cea mare omega";
//  * "loop" — α does not end: what happens at α re-enters Ω.
//
// Here, on a real text stream (the Verbatim conversation of this repository), a perspective is a SCALE of looking at the
// past: α sees 1 character back, the next levels 2, 3, 4, 6 characters, and Ω, the widest, sees whole words (the previous
// word and the word being written). Every level is learned by counting what followed what (all organisms live the same
// stream, so the level memories are identical; they differ ONLY in how they choose and move their perspective).
//
// Organisms
//  A        — only α (the cell, no higher view).
//  B        — a fixed ladder α → Ω1 → Ω2 (1, 2, 3 characters), blend weights learned, structure fixed, one direction.
//  C        — the perspective constructor of the A/B/C Text Discovery: every 28 characters it promotes the single level that
//             was best on its own recent validation window.
//  L        — THE LOOP: a perspective position θ on a ring of levels α … Ω with α and Ω adjacent (α continues directly into Ω).
//             After every character the world's answer gives each level its resistance (−log P of the truth); that result
//             re-enters the loop and bends θ toward the scales that are working now. The prediction is the view around θ.
//  L-cut    — the same, but the ring is cut into a line: α does not continue into Ω.
//  L-frozen — the same view, but θ never moves (no feedback): the best fixed position, chosen on the training part.
//  free     — reference: an unconstrained adaptive blend of all levels (no geometry), to show what the loop costs or gains.
export const LEVELS = [
  {id: 'α', name: 'α · 1 caracter', n: 1},
  {id: '2', name: '2 caractere', n: 2},
  {id: '3', name: '3 caractere', n: 3},
  {id: '4', name: '4 caractere', n: 4},
  {id: '6', name: '6 caractere', n: 6},
  {id: 'Ω', name: 'Ω · cuvinte', n: 0},
];
const M = LEVELS.length;
export const ORGS = ['A', 'B', 'C', 'L', 'L-cut', 'L-frozen', 'free'];

export function prepare(raw, rotate = 0) {
  let text = raw.toLowerCase();
  if (rotate) { const k = Math.floor(text.length * rotate); text = text.slice(k) + '\n' + text.slice(0, k); }   // another split of the same text
  const cnt = new Map(); for (const ch of text) cnt.set(ch, (cnt.get(ch) || 0) + 1);
  const keep = new Set([...cnt].filter(([, k]) => k >= 5).map(([c]) => c));
  const clean = [...text].map(c => keep.has(c) ? c : '?').join('');
  const vocab = [...new Set(clean)].sort(); const ix = new Map(vocab.map((c, i) => [c, i]));
  return {text: clean, vocab, ix, ids: Int32Array.from([...clean].map(c => ix.get(c))), cut: Math.floor(clean.length * 0.85)};
}

const isWord = c => /[a-zăâîșşțţ0-9]/.test(c);

export class Loop {
  constructor(data, opts = {}) {
    this.d = data; this.V = data.vocab.length;
    this.o = Object.assign({mode: 'grad', sigma: 1.0, eta: 0.05, lambda: 0.12, gamma: 0.5, beta: 1.0, frozenTheta: null}, opts);
    this.mem = LEVELS.map(() => new Map());
    this.uni = new Float64Array(this.V).fill(1); this.uniTot = this.V;
    this.t = 7;
    // organism state
    this.B = {g: new Float64Array(3)};
    this.C = {pick: 0, hist: []};
    this.s = new Float64Array(M);                  // recent reliability of each level (−resistance), shared feedback signal
    this.theta = {L: 5, 'L-cut': 5, 'L-frozen': this.o.frozenTheta ?? 5};
    this.free = {s: new Float64Array(M)};
    this.stats = Object.fromEntries(ORGS.map(k => [k, {bits: 0, hit: 0, n: 0, tbits: 0, thit: 0, tn: 0}]));
    this.wraps = 0; this.throat = 0; this.last = null;
  }
  key(level, t) {
    const T = this.d.text;
    if (LEVELS[level].n) return T.slice(t - LEVELS[level].n, t);
    let i = t; while (i > 0 && isWord(T[i - 1])) i--;              // current partial word
    let j = i; while (j > 0 && !isWord(T[j - 1])) j--; let k = j; while (k > 0 && isWord(T[k - 1])) k--;
    return T.slice(k, j) + '|' + T.slice(i, t);                    // previous word | word being written
  }
  dist(level, key) {
    const V = this.V, e = this.mem[level].get(key), p = new Float64Array(V), a = 0.6;
    const tot = e ? e.tot : 0;
    for (let c = 0; c < V; c++) p[c] = ((e ? e.c[c] : 0) + a * this.uni[c] / this.uniTot) / (tot + a);
    return p;
  }
  learn(t, keys) {
    const y = this.d.ids[t];
    for (let l = 0; l < M; l++) { let e = this.mem[l].get(keys[l]); if (!e) { e = {c: new Float64Array(this.V), tot: 0}; this.mem[l].set(keys[l], e); } e.c[y]++; e.tot++; }
    this.uni[y]++; this.uniTot++;
  }
  static ringD(l, th, ring) { let d = l - th; if (ring) { d = ((d % M) + M) % M; if (d > M / 2) d -= M; } return d; }
  kernel(th, ring) { const k = new Float64Array(M); let z = 0; for (let l = 0; l < M; l++) { const d = Loop.ringD(l, th, ring); k[l] = Math.exp(-d * d / (2 * this.o.sigma ** 2)); z += k[l]; } for (let l = 0; l < M; l++) k[l] /= z; return k; }
  mix(P, w) { const p = new Float64Array(this.V); for (let l = 0; l < P.length; l++) if (w[l]) for (let c = 0; c < this.V; c++) p[c] += w[l] * P[l][c]; return p; }

  // one character: every organism predicts BEFORE seeing it, then the world answers, then everybody learns
  step(record = false) {
    // Never read beyond the corpus after a completed run or a restored checkpoint.
    if (this.t >= this.d.ids.length) return false;
    const t = this.t, y = this.d.ids[t], test = t >= this.d.cut, o = this.o;
    const keys = LEVELS.map((_, l) => this.key(l, t)), P = keys.map((k, l) => this.dist(l, k));
    // how familiar each scale is RIGHT NOW (how often this context was lived before) — known before the answer
    const fam = keys.map((k, l) => { const e = this.mem[l].get(k); const n = e ? e.tot : 0; return Math.log((n + 0.5) / (n + 8)); });
    // where the perspective wants to be now: the scale that is both familiar here and reliable lately (the loop's feedback)
    let star = 0, bestV = -1e9; for (let l = 0; l < M; l++) { const v = this.s[l] + o.gamma * fam[l]; if (v > bestV) { bestV = v; star = l; } }
    const out = {};
    out.A = P[0];
    const gb = this.B.g, eb = [Math.exp(gb[0]), Math.exp(gb[1]), Math.exp(gb[2])], zb = eb[0] + eb[1] + eb[2], wb = eb.map(v => v / zb);
    out.B = this.mix(P.slice(0, 3), wb);
    out.C = P[this.C.pick];
    const kL = this.kernel(this.theta.L, true), kC = this.kernel(this.theta['L-cut'], false), kF = this.kernel(this.theta['L-frozen'], true);
    const view = k => { const w = k.map((v, l) => v * Math.exp(o.gamma * fam[l])); const z = w.reduce((a, b) => a + b, 0); return w.map(v => v / z); };
    out.L = this.mix(P, view(kL)); out['L-cut'] = this.mix(P, view(kC)); out['L-frozen'] = this.mix(P, view(kF));
    const ef = Array.from(this.free.s, (v, l) => Math.exp(2.5 * v + o.gamma * fam[l])), zf = ef.reduce((a, b) => a + b, 0); const wf = ef.map(v => v / zf);
    out.free = this.mix(P, wf);
    // score
    for (const k of ORGS) { const p = out[k], st = this.stats[k]; const b = -Math.log2(Math.max(1e-12, p[y])); let am = 0; for (let c = 1; c < this.V; c++) if (p[c] > p[am]) am = c;
      if (test) { st.tbits += b; st.thit += am === y ? 1 : 0; st.tn++; } else { st.bits += b; st.hit += am === y ? 1 : 0; st.n++; } }
    // the world's answer: resistance of every level, which re-enters the loop
    const res = P.map(p => -Math.log(Math.max(1e-12, p[y])));
    for (let l = 0; l < M; l++) { this.s[l] = (1 - o.lambda) * this.s[l] - o.lambda * res[l]; this.free.s[l] = this.s[l]; }
    // B: learned weights of its fixed ladder (gradient of log-loss), no use of the recent resistance
    const pb = out.B[y]; for (let i = 0; i < 3; i++) gb[i] += 0.02 * wb[i] * (P[i][y] / Math.max(1e-12, pb) - 1);
    // C: promotes the level that was best on its recent internal validation window
    this.C.hist.push(res); if (this.C.hist.length > 224) this.C.hist.shift();
    if (t % 28 === 0) { const sum = new Float64Array(M); for (const r of this.C.hist) for (let l = 0; l < M; l++) sum[l] += r[l]; let b = 0; for (let l = 1; l < M; l++) if (sum[l] < sum[b]) b = l; this.C.pick = b; }
    // L / L-cut: bend θ toward the scales that work now. Mode 'grad': slow gradient of the recent reliability seen through
    // the view. Mode 'pull': each character, θ is pulled toward the centre of the scales that are reliable lately AND
    // familiar right now; on the loop that centre is a circular mean (α and Ω are neighbours), on the cut line an ordinary mean.
    const before = this.theta.L;
    for (const [name, ring, k] of [['L', true, kL], ['L-cut', false, kC]]) {
      const th = this.theta[name]; let nt;
      if (o.mode === 'pull') {
        const w = this.s.map((v, l) => Math.exp(o.beta * v + o.gamma * fam[l])); let cx = 0, cy = 0, m = 0, z = 0;
        for (let l = 0; l < M; l++) { const a = 2 * Math.PI * l / M; cx += w[l] * Math.cos(a); cy += w[l] * Math.sin(a); m += w[l] * l; z += w[l]; }
        const target = ring ? ((Math.atan2(cy, cx) / (2 * Math.PI) * M) % M + M) % M : m / z;
        nt = th + o.eta * Loop.ringD(target, th, ring);
      } else {
        let J = 0; for (let l = 0; l < M; l++) J += k[l] * this.s[l];
        let g = 0; for (let l = 0; l < M; l++) g += k[l] * (this.s[l] - J) * Loop.ringD(l, th, ring) / o.sigma ** 2;
        nt = th + o.eta * Math.max(-0.6, Math.min(0.6, g));
      }
      nt = ring ? ((nt % M) + M) % M : Math.max(0, Math.min(M - 1, nt));
      this.theta[name] = nt;
    }
    // passage through the throat: θ crossed directly between α and Ω
    const a = before, b = this.theta.L; const crossed = (a > M - 1 && b < 1) || (a < 1 && b > M - 1);
    if (crossed) this.wraps++;
    this.throat = 0.9 * this.throat + (crossed ? 1 : 0);
    if (record) this.last = {t, y, ch: this.d.text[t], keys, res, P, out, theta: {...this.theta}, kL, wb, pickC: this.C.pick, crossed, s: Array.from(this.s), star, fam};
    this.learn(t, keys); this.t++;
    return t < this.d.ids.length - 1;
  }

  // Checkpoints store actual context counts, feedback, learned weights and evaluation
  // accumulators. Sparse counts keep the JSON small; nothing is re-trained on load.
  snapshot() {
    return {
      version: 1, signature: Loop.signature(this.d), t: this.t,
      options: {...this.o},
      mem: this.mem.map(m => [...m].map(([key, e]) => [
        key, e.tot, [...e.c].flatMap((count, id) => count ? [[id, count]] : [])
      ])),
      uni: [...this.uni], uniTot: this.uniTot,
      B: [...this.B.g], C: {pick: this.C.pick, hist: this.C.hist.map(row => [...row])},
      s: [...this.s], theta: {...this.theta}, free: [...this.free.s],
      stats: Object.fromEntries(ORGS.map(k => [k, {...this.stats[k]}])),
      wraps: this.wraps, throat: this.throat,
    };
  }
  static signature(data) {
    let hash = 2166136261;
    for (let i = 0; i < data.text.length; i++) {
      hash ^= data.text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return [data.text.length, data.cut, data.vocab.join(''), hash.toString(16)].join(':');
  }
  static restore(data, state) {
    const bad = () => { throw new Error('Checkpoint invalid sau incompatibil cu V13 / corpusul curent.'); };
    const nums = (v, n) => Array.isArray(v) && v.length === n && v.every(x => Number.isFinite(x));
    if (!state || state.version !== 1 || state.signature !== Loop.signature(data) ||
        !Number.isInteger(state.t) || state.t < 7 || state.t > data.ids.length ||
        !Array.isArray(state.mem) || state.mem.length !== M ||
        !nums(state.uni, data.vocab.length) || !Number.isFinite(state.uniTot) ||
        !nums(state.B, 3) || !state.C || !Number.isInteger(state.C.pick) ||
        state.C.pick < 0 || state.C.pick >= M || !Array.isArray(state.C.hist) ||
        state.C.hist.length > 224 || !state.C.hist.every(v => nums(v, M)) ||
        !nums(state.s, M) || !nums(state.free, M) ||
        !state.theta || !['L', 'L-cut', 'L-frozen'].every(k => Number.isFinite(state.theta[k])) ||
        !state.options || !['grad', 'pull'].includes(state.options.mode) ||
        !Number.isFinite(state.options.sigma) || state.options.sigma <= 0 ||
        !Number.isFinite(state.options.eta) || state.options.eta < 0 ||
        !Number.isFinite(state.options.lambda) || state.options.lambda < 0 || state.options.lambda > 1 ||
        !Number.isFinite(state.options.gamma) || !Number.isFinite(state.options.beta) ||
        !Number.isFinite(state.wraps) || !Number.isFinite(state.throat) ||
        !state.stats) bad();
    for (const k of ORGS) {
      const q = state.stats[k];
      if (!q || !['bits','hit','n','tbits','thit','tn'].every(p => Number.isFinite(q[p]) && q[p] >= 0)) bad();
    }
    const engine = new Loop(data, state.options);
    for (let l = 0; l < M; l++) {
      if (!Array.isArray(state.mem[l])) bad();
      for (const row of state.mem[l]) {
        if (!Array.isArray(row) || row.length !== 3 || typeof row[0] !== 'string' ||
            !Number.isInteger(row[1]) || row[1] < 0 || !Array.isArray(row[2])) bad();
        const counts = new Float64Array(engine.V);
        let total = 0;
        for (const pair of row[2]) {
          if (!Array.isArray(pair) || pair.length !== 2 ||
              !Number.isInteger(pair[0]) || pair[0] < 0 || pair[0] >= engine.V ||
              !Number.isFinite(pair[1]) || pair[1] <= 0) bad();
          counts[pair[0]] += pair[1]; total += pair[1];
        }
        if (total !== row[1] || engine.mem[l].has(row[0])) bad();
        engine.mem[l].set(row[0], {c: counts, tot: row[1]});
      }
    }
    engine.t = state.t; engine.uni.set(state.uni); engine.uniTot = state.uniTot;
    engine.B.g.set(state.B); engine.C = {pick: state.C.pick, hist: state.C.hist.map(row => [...row])};
    engine.s.set(state.s); engine.theta = {...state.theta};
    engine.free.s.set(state.free);
    engine.stats = Object.fromEntries(ORGS.map(k => [k, {...state.stats[k]}]));
    engine.wraps = state.wraps; engine.throat = state.throat;
    engine.last = null; // The next visible prediction must happen before the next true character.
    return engine;
  }
  summary() {
    const r = {};
    for (const k of ORGS) { const s = this.stats[k]; r[k] = {train_bpc: s.n ? s.bits / s.n : null, train_acc: s.n ? s.hit / s.n : null, test_bpc: s.tn ? s.tbits / s.tn : null, test_acc: s.tn ? s.thit / s.tn : null}; }
    return r;
  }
}

// best fixed θ for the "no bending" control, chosen on the training part only
export function bestFrozen(data, opts = {}) {
  let best = null;
  for (let th = 0; th < M; th += 0.5) {
    const L = new Loop(data, {...opts, frozenTheta: th});
    while (L.t < data.cut) L.step();
    const b = L.stats['L-frozen'].bits / L.stats['L-frozen'].n;
    if (!best || b < best.bpc) best = {theta: th, bpc: b};
  }
  return best;
}
