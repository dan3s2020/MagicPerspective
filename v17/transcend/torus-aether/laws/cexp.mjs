// C's laws: does its attention want more dimensions, and does a cost of changing perspective give it stable laws?
// A faithful copy of engine.mjs EpistemicText (same candidates, keys, validation every 7th, reframe every 28, score
// penalty .003/position, promotion margin, new position every 112 episodes) with the cap / margin / window / growth rule
// as parameters. node cexp.mjs <text> <cap> <margin> <window> <growth: time|pressure>
import fs from "node:fs";
const [file, capS, marginS, winS, growth, ntS] = process.argv.slice(2), CAP = +capS, MARGIN = +marginS, WIN = +winS;
const raw = fs.readFileSync(file, "utf8"), A0 = Array.from(raw, c => { const x = c.charCodeAt(0); return x === 13 ? 32 : x < 127 ? x : 63; });
const h0 = Math.floor(A0.length * .85), NT = +ntS || h0, A = A0.slice(Math.max(0, h0 - NT)), n0 = Math.min(NT, h0), HO = A.slice(n0);
const cat = n => n === 32 ? "s" : n === 10 ? "l" : n >= 48 && n <= 57 ? "n" : n >= 65 && n <= 90 ? "U" : n >= 97 && n <= 122 ? "w" : "o";
const feat = (n, k) => n < 0 ? "_" : k === "class" ? cat(n) : k === "fold" ? String.fromCharCode(n >= 65 && n <= 90 ? n + 32 : n) : String.fromCharCode(n);
const cands = L => { const a = []; for (let m = 1; m < (1 << L); m++) for (const kind of ["exact", "fold", "class"]) a.push({m, kind, id: kind + ":" + m, w: m.toString(2).replaceAll("0", "").length, top: 31 - Math.clz32(m)}); return a; };
const key = (ctx, p) => { let s = ""; for (let i = 0; i < CAP; i++) if (p.m & (1 << i)) s += feat(ctx[i], p.kind) + "|"; return s; };
class Cnt { constructor() { this.e = new Map(); this.tot = new Float64Array(128); }
  prior() { let k = 32, b = 0; for (let i = 0; i < 128; i++) if (this.tot[i] > b) { b = this.tot[i]; k = i; } return k; }
  predict(k, fb) { const r = this.e.get(k); if (!r || r.n < 2) return fb; let best = fb, bv = -1; for (const [y, v] of r.c) if (v > bv) { bv = v; best = y; } return best; }
  update(k, y) { let r = this.e.get(k); if (!r) this.e.set(k, r = {n: 0, c: new Map()}); r.n++; r.c.set(y, (r.c.get(y) || 0) + 1); this.tot[y]++; } }
let lag = 1, active = "exact:1", eps = 0, promos = 0, pressure = 0; const models = new Map(), base = new Cnt(), val = []; let C = cands(1);
const model = p => models.get(p.id) || (models.set(p.id, new Cnt()), models.get(p.id));
const pred = (ctx, p) => { const m = models.get(p.id); return m ? m.predict(key(ctx, p), base.prior()) : base.prior(); };
function reframe() {
  if (val.length < 8) return;
  const sc = C.map((p, j) => { let h = 0; for (const v of val) h += v.pr[j] === v.y; const acc = h / val.length; return {p, acc, score: acc - .003 * p.w}; });
  sc.sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id)); const best = sc[0], old = sc.find(s => s.p.id === active);
  if (best.p.id !== active && best.score > (old?.score ?? 0) + MARGIN && best.acc >= .2) { active = best.p.id; promos++; }
  // pressure: the active perspective needs the oldest position it is allowed → a new position is born
  const ap = C.find(p => p.id === active); pressure = ap && ap.top === lag - 1 ? pressure + 1 : 0;
}
const ctxAt = i => Array.from({length: CAP}, (_, j) => (i - j - 1 >= 0 ? A[i - j - 1] : -1));
for (let i = 0; i < n0; i++) {
  eps++; const ctx = ctxAt(i).map((v, j) => (j < lag ? v : -1)), y = A[i];
  if (eps % 7 === 0) { val.push({pr: C.map(p => pred(ctx, p)), y}); if (val.length > WIN) val.shift(); }
  else { base.update("*", y); for (const p of C) model(p).update(key(ctx, p), y); }
  const grow = growth === "pressure" ? pressure >= 4 : eps % 112 === 0;
  if (grow && lag < CAP) { lag++; C = cands(lag); val.length = 0; pressure = 0; }
  if (eps % 28 === 0) reframe();
}
let hit = 0; const ap = C.find(p => p.id === active); for (let i = n0; i < A.length; i++) hit += pred(ctxAt(i), ap) === A[i];
// the best single perspective in hindsight (an upper bound for C's choice)
let bestH = 0, bestId = ""; for (const p of C) { let h = 0; for (let i = n0; i < A.length; i += 3) h += pred(ctxAt(i), p) === A[i]; const a = h / Math.ceil(HO.length / 3); if (a > bestH) { bestH = a; bestId = p.id; } }
// C as an entity of many beliefs at once: the K perspectives with the best record vote, each by its record
const rec = C.map((p, j) => { let h = 0; for (const v of val) h += v.pr[j] === v.y; return {p, acc: val.length ? h / val.length : 0}; }).sort((a, b) => b.acc - a.acc);
const many = {}; for (const K of [1, 3, 5, 10, 20, C.length]) { const top = rec.slice(0, K); let hh = 0;
  for (let i = n0; i < A.length; i++) { const ctx = ctxAt(i), vote = new Map(); for (const {p, acc} of top) { const y = pred(ctx, p); vote.set(y, (vote.get(y) || 0) + acc * acc); }
    let b = -1, bv = -1; for (const [y, v] of vote) if (v > bv) { bv = v; b = y; } hh += b === A[i]; } many["K" + K] = +(hh / HO.length).toFixed(4); }
console.log(JSON.stringify({many, file: file.split("/").pop(), ntrain: n0, cap: CAP, margin: MARGIN, win: WIN, growth, lag, active, promotions: promos, heldout: +(hit / HO.length).toFixed(4), hindsightBest: bestId, hindsightAcc: +bestH.toFixed(4)}));
