// MagicPerspective V16 — the living fabric in the maze.
// The FABRIC (graph) is the only thing that learns a representation: L levels α … Ω of leaky units on a ring (α and Ω are
// neighbours). The world enters at α through concept nodes (free / wall / outside for each of the 3×3 cells around,
// the direction of the target, the last action and whether it moved).
//  A lives at α and ACTS: it reads α and the levels B lets it see, chooses up/right/down/left, and predicts whether the move
//    will go through. The difference between that prediction and what the world did (its resistance) re-enters α.
//  B lives at Ω and chooses the PERSPECTIVE (which levels A sees) and holds the SHAPE of the way: the next K moves, drawn on
//    the maze before they happen. Its perspective re-enters Ω.
//  CONTROL: the same fabric without A and B bodies (actions, move-prediction and plan read straight from the whole state).
// Teacher (training only): the optimal moves from where the organism stands (every shortest route is correct) and one
// shortest route for the plan; the true outcome of each move for the move prediction. At evaluation it only scores.
import {T, param, matmul, add, mul, tanh, sigmoid, concat, slice, pick, logSoftmax, softmax, nllSet, bceLogit, sumAll, backward, Adam} from './autograd.mjs';

export class RNG { constructor(s = 1) { this.s = (s >>> 0) || 1; } next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; } int(n) { return Math.floor(this.next() * n); } }
export const ACTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const ACTION_NAMES = ['sus', 'dreapta', 'jos', 'stânga'];

// ---------------- the world ----------------
export function makeMaze(seed, n = 7, braid = 0.3) {
  const r = new RNG(seed), wall = new Uint8Array(n * n).fill(1), st = [n + 1]; wall[n + 1] = 0;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = r.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  while (st.length) { const i = st[st.length - 1], x = i % n, y = (i / n) | 0; let moved = false;
    for (const [dx, dy] of shuffle(ACTIONS.slice())) { const X = x + 2 * dx, Y = y + 2 * dy; if (X < 1 || Y < 1 || X > n - 2 || Y > n - 2 || !wall[Y * n + X]) continue; wall[(y + dy) * n + x + dx] = 0; wall[Y * n + X] = 0; st.push(Y * n + X); moved = true; break; }
    if (!moved) st.pop(); }
  for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) { const i = y * n + x; if (wall[i] && r.next() < braid && ((!wall[i - 1] && !wall[i + 1]) || (!wall[i - n] && !wall[i + n]))) wall[i] = 0; }
  const floor = [...wall.keys()].filter(i => !wall[i]); let start, goal, t = 0;
  do { start = floor[r.int(floor.length)]; goal = floor[r.int(floor.length)]; t++; } while ((bfs(n, wall, goal)[start] < n - 1 || start === goal) && t < 300);
  return {seed, n, wall, start, goal, dist: bfs(n, wall, goal)};
}
export function bfs(n, wall, from) { const d = new Int32Array(n * n).fill(1e9), q = [from]; d[from] = 0;
  for (let k = 0; k < q.length; k++) { const i = q[k], x = i % n, y = (i / n) | 0; for (const [dx, dy] of ACTIONS) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= n || Y >= n) continue; const j = Y * n + X; if (wall[j] || d[j] < 1e9) continue; d[j] = d[i] + 1; q.push(j); } } return d; }
const nextCell = (w, pos, a) => { const n = w.n, x = pos % n + ACTIONS[a][0], y = ((pos / n) | 0) + ACTIONS[a][1]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };
export function optimalActions(w, pos) { const out = []; for (let a = 0; a < 4; a++) { const j = nextCell(w, pos, a); if (j >= 0 && !w.wall[j] && w.dist[j] === w.dist[pos] - 1) out.push(a); } return out; }
export function teacherPath(w, pos, K) { const out = []; let p = pos; for (let k = 0; k < K && p !== w.goal; k++) { const a = optimalActions(w, p)[0]; out.push(a); p = nextCell(w, p, a); } return out; }
// what the organism perceives: for each of the 9 cells around it, one of three concepts (free / wall / outside);
// the direction of the target relative to itself; its own last action; whether that action moved it
export const D = 27 + 2 + 4 + 1;
export function observe(w, pos, lastA, moved) {
  const n = w.n, x = pos % n, y = (pos / n) | 0, o = new Float64Array(D); let k = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy, out = X < 0 || Y < 0 || X >= n || Y >= n; o[k * 3 + (out ? 2 : w.wall[Y * n + X] ? 1 : 0)] = 1; k++; }
  o[27] = ((w.goal % n) - x) / n; o[28] = (((w.goal / n) | 0) - y) / n; if (lastA >= 0) o[29 + lastA] = 1; o[33] = moved ? 1 : 0;
  return o;
}

// ---------------- the fabric with A and B (or the control) ----------------
export class Organism {
  constructor({levels = 4, units = 16, K = 6, seed = 7, bodies = true, lr = 0.004} = {}) {
    const rng = (() => { const r = new RNG(seed); return () => r.next(); })();
    this.L = levels; this.U = units; this.H = levels * units; this.K = K; this.bodies = bodies;
    const U = units, H = this.H;
    this.P = {
      W: param(H, H, 1 / Math.sqrt(3 * U), rng), b: param(1, H, 0, rng), Ux: param(D, U, 1 / Math.sqrt(D), rng),
    };
    if (bodies) Object.assign(this.P, {
      Ua: param(1, U, 0.3, rng), Ub: param(levels, U, 0.3, rng),                                                  // A → α, B → Ω
      Wb1: param(2 * U, 16, 1 / Math.sqrt(2 * U), rng), Wb2: param(16, levels, 0.3, rng), Wp: param(2 * U, 4 * K, 1 / Math.sqrt(2 * U), rng),   // B
      Wa1: param(2 * U, 24, 1 / Math.sqrt(2 * U), rng), Wa2: param(24, 4, 0.3, rng), Wm: param(24, 4, 0.3, rng),                   // A
    }); else Object.assign(this.P, {
      Wc1: param(H, 24, 1 / Math.sqrt(H), rng), Wc2: param(24, 4, 0.3, rng), Wcm: param(24, 4, 0.3, rng), Wcp: param(H, 4 * K, 1 / Math.sqrt(H), rng),
    });
    const mask = new Float64Array(H * H);
    for (let i = 0; i < levels; i++) for (const jj of [i - 1, i, i + 1]) { const j = (jj + levels) % levels;
      for (let a = 0; a < U; a++) for (let c = 0; c < U; c++) mask[(i * U + a) * H + j * U + c] = 1; }   // W[from][to]: ring of scales
    this.mask = new T(mask, H, H);
    this.leak = new T(Float64Array.from({length: H}, (_, i) => 2 ** -Math.floor(i / U)), 1, H);
    this.keep = new T(this.leak.d.map(v => 1 - v), 1, H);
    this.opt = new Adam(Object.values(this.P), lr); this.updates = 0; this.episodes = 0;
  }
  start() { return {h: T.zeros(1, this.H), s: T.zeros(1, 1), pi: new T(new Float64Array(this.L).fill(1 / this.L), 1, this.L)}; }
  // one step of life: the observation enters, the fabric moves, B looks, A acts (returns everything needed to learn and to draw)
  step(st, obs, Wm) {
    const P = this.P, U = this.U, H = this.H, x = new T(obs, 1, D);
    let pre = add(matmul(st.h, Wm), P.b);
    let alpha = add(slice(pre, 0, U), matmul(x, P.Ux));
    let omega = slice(pre, H - U, H);
    if (this.bodies) { alpha = add(alpha, matmul(st.s, P.Ua)); omega = add(omega, matmul(st.pi, P.Ub)); }
    pre = concat([alpha, slice(pre, U, H - U), omega]);
    const h = add(mul(st.h, this.keep), mul(tanh(pre), this.leak));
    const blk = l => slice(h, l * U, (l + 1) * U);
    let pi, logits, moveLog, plan, look = null;
    if (this.bodies) {
      let mean = blk(0); for (let l = 1; l < this.L; l++) mean = add(mean, blk(l)); mean = mul(mean, T.of([1 / this.L]));
      const z = concat([blk(this.L - 1), mean]); const hb = tanh(matmul(z, P.Wb1));
      pi = softmax(matmul(hb, P.Wb2)); plan = matmul(z, P.Wp);                                          // B: perspective + shape
      let seen = mul(blk(0), pick(pi, 0)); for (let l = 1; l < this.L; l++) seen = add(seen, mul(blk(l), pick(pi, l)));
      const ha = tanh(matmul(concat([blk(0), seen]), P.Wa1)); logits = matmul(ha, P.Wa2); moveLog = matmul(ha, P.Wm); look = ha;  // A acts
    } else {
      const hc = tanh(matmul(h, P.Wc1)); logits = matmul(hc, P.Wc2); moveLog = matmul(hc, P.Wcm); plan = matmul(h, P.Wcp); pi = st.pi; look = hc;
    }
    return {h, pi, logits, moveLog, plan, x, look};
  }
  // a whole life in one maze. learn: teacher gives the exact errors. Returns the trajectory and (if record) frames to draw.
  live(w, {learn = false, explore = 0.1, rng = null, record = false, maxSteps = null} = {}) {
    const Wm = mul(this.P.W, this.mask); let st = this.start(), pos = w.start, lastA = -1, moved = false, steps = 0, bumps = 0;
    const visits = new Uint16Array(w.n * w.n); visits[pos]++; const losses = [], frames = [], path = [pos];
    const limit = maxSteps ?? 3 * w.dist[w.start] + 15; let first = null;
    while (pos !== w.goal && steps < limit) {
      const obs = observe(w, pos, lastA, moved), o = this.step(st, obs, Wm);
      const lp = logSoftmax(o.logits), opt = optimalActions(w, pos), tp = teacherPath(w, pos, this.K);
      // B's shape of the way: its K predicted moves, followed in the real maze (for scoring and drawing)
      const planA = []; for (let k = 0; k < this.K; k++) { const seg = o.plan.d.slice(4 * k, 4 * k + 4); planA.push(seg.indexOf(Math.max(...seg))); }
      if (steps === 0) first = planScore(w, pos, planA);
      // choose: A's distribution; organisms remember where they have been (path integration) and avoid going round in circles
      const pr = Array.from(lp.d, (v, a) => { const j = nextCell(w, pos, a); return Math.exp(v) * (j >= 0 ? Math.pow(0.55, Math.min(visits[j], 4)) : 1); });
      let a = pr.indexOf(Math.max(...pr));
      if (rng && rng.next() < explore) a = rng.int(4);
      else if (rng && learn) { let u = rng.next() * pr.reduce((s, v) => s + v, 0); for (let k = 0; k < 4; k++) { u -= pr[k]; if (u <= 0) { a = k; break; } } }
      const j = nextCell(w, pos, a), ok = j >= 0 && !w.wall[j];
      const pMove = 1 / (1 + Math.exp(-o.moveLog.d[a])), resist = Math.abs((ok ? 1 : 0) - pMove);
      if (learn) {
        const parts = [nllSet(lp, opt), mul(bceLogit(pick(o.moveLog, a), ok ? 1 : 0), T.of([0.5]))];
        tp.forEach((ta, k) => parts.push(mul(nllSet(logSoftmax(slice(o.plan, 4 * k, 4 * k + 4)), [ta]), T.of([0.3 / this.K]))));
        losses.push(sumAll(parts));
      }
      if (record) frames.push(frameOf(this, w, pos, o, a, ok, resist, planA, opt, steps));
      if (!ok) bumps++;
      if (ok) { pos = j; visits[pos]++; path.push(pos); }
      lastA = a; moved = ok; steps++;
      st = {h: o.h, pi: o.pi, s: T.of([resist])};
    }
    if (record) { const obs = observe(w, pos, lastA, moved), o = this.step(st, obs, Wm); frames.push(frameOf(this, w, pos, o, -1, true, 0, [], [], steps)); }
    if (learn && losses.length) { const L = mul(sumAll(losses), T.of([1 / losses.length])); backward(L); this.opt.step(); this.updates++; this.episodes++; }
    return {solved: pos === w.goal, steps, optimal: w.dist[w.start], bumps, path, frames, first};
  }
}
function planScore(w, pos, plan) { let p = pos, good = 0, n = 0;
  for (const a of plan) { if (p === w.goal) break; n++; const j = nextCell(w, p, a); if (j >= 0 && !w.wall[j] && w.dist[j] === w.dist[p] - 1) { good++; p = j; } else break; }
  return n ? good / n : 1; }
function frameOf(org, w, pos, o, a, ok, resist, planA, opt, step) {
  const r3 = v => Math.round(v * 1000) / 1000;
  return {step, pos, a, ok, resist: r3(resist), h: Array.from(o.h.d, r3), pi: Array.from(o.pi.d, r3), probs: Array.from(softmax(o.logits).d, r3),
          move: Array.from(o.moveLog.d, v => r3(1 / (1 + Math.exp(-v)))), plan: planA, opt, obs: Array.from(o.x.d, r3), look: Array.from(o.look.d, r3)};
}

// ---------------- training and measuring ----------------
export const SEEDS = {train: 1000003, test: 3000017};
export const seedOf = (b, i) => ((b >>> 0) + i * 7919) >>> 0;
export function evaluate(org, {count = 40, sizes = [7, 9], seed = SEEDS.test} = {}) {
  const rows = []; for (let i = 0; i < count; i++) { const w = makeMaze(seedOf(seed, i), sizes[i % sizes.length]); rows.push(org.live(w)); }
  const solved = rows.filter(r => r.solved), avg = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  return {solved: avg(rows.map(r => r.solved ? 1 : 0)), ratio: avg(solved.map(r => r.steps / r.optimal)), bumps: avg(rows.map(r => r.bumps)), plan0: avg(rows.map(r => r.first))};
}
