// The labyrinths of MagicPerspective V16 (dan3s2020/MagicPerspective, v16/web/engine.mjs: same maze generator, same
// sizes, same unseen test seeds, same step limit, same teacher) lived by the torus-aether brain.
// The labyrinth speaks its own symbols, so it lives in the same stream and the same graph as the text:
//   every step: what is to the north, east, south, west (a wall, a free cell never visited, a free cell already
//   visited), where the target is (8 directions), then the move, then whether the world let it move.
// Training is like reading: the brain lives the teacher's moves (with some moves of its own, so it also lives how to
// come back from mistakes — exactly V16's way: the teacher exists only in training). Acting is like writing: the
// brain's next symbol after what it perceives is its move. The shape of the solution: before moving, the brain writes
// its next 6 moves ahead in its own imagination (perceptions included), never seeing the maze it has not walked.
const CODES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127];
export const LSYM = {dir: [0, 1, 2, 3].map(d => CODES.slice(d * 3, d * 3 + 3)), goal: CODES.slice(12, 21), act: CODES.slice(21, 25), moved: CODES[25], blocked: CODES[26], start: CODES[27], win: CODES[28], fail: CODES[29]};
export const LAB_SYMBOLS = new Set(CODES);
export const labLabel = c => { const i = CODES.indexOf(c); if (i < 0) return null;
  if (i < 12) return "NESW"[(i / 3) | 0] + ["▮", "□", "▪"][i % 3]; if (i < 21) return ["↖", "↑", "↗", "←", "◎", "→", "↙", "↓", "↘"][i - 12];
  if (i < 25) return ["⇧", "⇨", "⇩", "⇦"][i - 21]; return ["●", "○", "◇", "✓", "✗"][i - 25]; };

// ---- V16's world, unchanged ----
export class RNG { constructor(s = 1) { this.s = (s >>> 0) || 1; } next() { let x = this.s; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.s = x >>> 0; return this.s / 4294967296; } int(n) { return Math.floor(this.next() * n); } }
export const ACTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
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
export const nextCell = (w, pos, a) => { const n = w.n, x = pos % n + ACTIONS[a][0], y = ((pos / n) | 0) + ACTIONS[a][1]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };
export function optimalActions(w, pos) { const out = []; for (let a = 0; a < 4; a++) { const j = nextCell(w, pos, a); if (j >= 0 && !w.wall[j] && w.dist[j] === w.dist[pos] - 1) out.push(a); } return out; }
export const SEEDS = {train: 1000003, test: 3000017};
export const seedOf = (b, i) => ((b >>> 0) + i * 7919) >>> 0;

// ---- what the brain perceives, as symbols ----
function perceive(w, pos, visits) {
  const out = [];
  for (let d = 0; d < 4; d++) { const j = nextCell(w, pos, d); out.push(LSYM.dir[d][j < 0 || w.wall[j] ? 0 : visits[j] ? 2 : 1]); }
  const n = w.n, dx = (w.goal % n) - (pos % n), dy = ((w.goal / n) | 0) - ((pos / n) | 0), sx = Math.sign(dx), sy = Math.sign(dy);
  out.push(LSYM.goal[(sy + 1) * 3 + (sx + 1)]); return out;
}
// brain: {live(y), predict() → distribution over the next symbol (128), imagine(): a copy-free way to look ahead}
// teach: the teacher's move is lived (with probability 1 − explore), learn = the brain learns from what it lives
export function playLabyrinth(w, brain, {teach = false, explore = .3, rand = Math.random, limit = null, shape = 6, record = false} = {}) {
  let pos = w.start, steps = 0, bumps = 0, first = null; const visits = new Uint16Array(w.n * w.n); visits[pos]++; const path = [pos], shapes = [];
  const lim = limit ?? 3 * w.dist[w.start] + 15;
  brain.live(LSYM.start);
  while (pos !== w.goal && steps < lim) {
    for (const s of perceive(w, pos, visits)) brain.live(s);
    const p = brain.predict(), pa = LSYM.act.map(s => p[s] + 1e-9);
    if (shape && (steps === 0 || record)) { const plan = brain.imagine(shape, w, pos, visits); if (steps === 0) first = planScore(w, pos, plan); if (record) shapes.push(plan); }
    // as V16's organisms: they remember where they have been and avoid going round in circles
    const pr = pa.map((v, a) => { const j = nextCell(w, pos, a); return v * (j >= 0 ? Math.pow(0.55, Math.min(visits[j] || 0, 4)) : 1); });
    let a = pr.indexOf(Math.max(...pr)); if (a < 0) a = Math.floor(rand() * 4);   // a brain that has learned nothing yet
    if (teach) { const opt = optimalActions(w, pos); if (rand() >= explore && opt.length) a = opt[0]; else a = Math.floor(rand() * 4); }
    brain.live(LSYM.act[a]);
    const j = nextCell(w, pos, a), ok = j >= 0 && !w.wall[j];
    brain.live(ok ? LSYM.moved : LSYM.blocked);
    if (!ok) bumps++; else { pos = j; visits[pos]++; path.push(pos); }
    steps++;
  }
  brain.live(pos === w.goal ? LSYM.win : LSYM.fail);
  return {solved: pos === w.goal, steps, optimal: w.dist[w.start], bumps, first, path, shapes, n: w.n, seed: w.seed};
}
export function planScore(w, pos, plan) { let p = pos, good = 0, n = 0;
  for (const a of plan) { if (p === w.goal) break; n++; const j = nextCell(w, p, a); if (j >= 0 && !w.wall[j] && w.dist[j] === w.dist[p] - 1) { good++; p = j; } else break; }
  return n ? good / n : 1; }
// the brain imagines its next moves: it writes its own move, then what it expects to perceive after it, from its
// own predictions only (the maze it has not walked is never read)
export { perceive };
