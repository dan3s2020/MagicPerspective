// The 2D maps (map-cells: two cubes must both pass the checkpoint; direct, bend, s-curve, backtrack, maze-zigzag,
// spiral) as a world the same brain devours. The world speaks its own language of symbols — the brain gets no target,
// no meaning of the actions and no map: only what each cube feels, what was done, and what the world answered.
//   per joint step: for each cube its walls (16) and the way it last moved (5), then the two actions (4), then for
//   each cube whether the world accepted the push or resisted (2); an episode starts with ◇ and ends with ✓ or ✗.
// The symbols are 30 control codes (never present in text), so text and maps live in one stream and one graph.
// Acting comes from the lived stream (Precedent): in the lived past, after this context, which action was followed by
// success soonest, and by the least resistance on the way — read from the deepest context lived often enough.
import {createMapCellsWorld, stepMapCellsWorld, mapLearnerSensors, mapObserverLayout} from "../../../map-cells/map-world.js";

const CODES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 127];
export const SYM = {wall: CODES.slice(0, 16), went: CODES.slice(16, 21), act: CODES.slice(21, 25), moved: CODES[25], blocked: CODES[26], win: CODES[27], fail: CODES[28], start: CODES[29]};
export const MAZE_SYMBOLS = new Set(CODES);
export const mazeLabel = c => { const i = CODES.indexOf(c); if (i < 0) return null;
  if (i < 16) return "▦" + i.toString(16); if (i < 21) return ["·", "→", "←", "↓", "↑"][i - 16]; if (i < 25) return "a" + (i - 21);
  return ["○", "●", "✓", "✗", "◇"][i - 25]; };

export class Precedent {
  constructor({depth = 8, gamma = .97, resist = .05, explore = .6} = {}) { Object.assign(this, {depth, gamma, resist, explore}); this.t = new Map(); this.total = 0; }
  stats(key) { let s = this.t.get(key); if (!s) this.t.set(key, s = {n: [0, 0, 0, 0], v: [0, 0, 0, 0]}); return s; }
  // the deepest context lived at least a few times decides; actions never tried there are tried first, then the best record
  choose(stream, rand) {
    for (let L = Math.min(this.depth, stream.length); L >= 1; L--) {
      const s = this.t.get(stream.slice(-L).join(",")); if (!s) continue; const N = s.n.reduce((a, b) => a + b, 0); if (N < 4 && L > 1) continue;
      let best = 0, bv = -Infinity; for (let a = 0; a < 4; a++) { const v = s.n[a] ? s.v[a] / s.n[a] + this.explore * Math.sqrt(Math.log(N + 1) / s.n[a]) : 1e9 + rand(); if (v > bv) { bv = v; best = a; } }
      return {a: best, L};
    }
    return {a: Math.floor(rand() * 4), L: 0};
  }
  // after an episode: every decision is credited with how soon success followed and the resistance met right after it
  learn(decisions, success, T) {
    for (const d of decisions) { const credit = (success ? Math.pow(this.gamma, T - d.step) : 0) + (d.moved ? this.resist : -this.resist);
      for (let L = 1; L <= Math.min(this.depth, d.ctx.length); L++) { const s = this.stats(d.ctx.slice(-L).join(",")); s.n[d.a]++; s.v[d.a] += credit; } }
    this.total++;
  }
}

const wallSym = (S) => SYM.wall[(S[0] > .5 ? 1 : 0) | (S[1] > .5 ? 2 : 0) | (S[2] > .5 ? 4 : 0) | (S[3] > .5 ? 8 : 0)];
const wentSym = (S) => { const x = S[6], y = S[7]; if (Math.abs(x) < .25 && Math.abs(y) < .25) return SYM.went[0]; return Math.abs(x) >= Math.abs(y) ? SYM.went[x > 0 ? 1 : 2] : SYM.went[y > 0 ? 3 : 4]; };

// play one map: live(y) feeds every symbol to the brain as it happens; returns what happened (and the path for the UI)
export function playMaze(index, precedent, live, rand, {split = "train", record = false} = {}) {
  const w = createMapCellsWorld(index, {split}), stream = [], decisions = [], path = [];
  const say = y => { stream.push(y); live(y); };
  say(SYM.start);
  while (!w.success && !w.failure) {
    for (let i = 0; i < 2; i++) { const S = mapLearnerSensors(w, i); say(wallSym(S)); say(wentSym(S)); }
    const acts = [];
    for (let i = 0; i < 2; i++) { const c = precedent.choose(stream, rand); acts.push(c.a); decisions.push({ctx: stream.slice(-precedent.depth), a: c.a, step: w.jointStep, cell: i}); say(SYM.act[c.a]); }
    const r = stepMapCellsWorld(w, acts);
    for (let i = 0; i < 2; i++) { const moved = r.accepted[i]; decisions[decisions.length - 2 + i].moved = moved; say(moved ? SYM.moved : SYM.blocked); }
    if (record) path.push(w.cubes.map(c => [c.x, c.y]));
  }
  say(w.success ? SYM.win : SYM.fail);
  precedent.learn(decisions, w.success, w.jointStep);
  return {success: !!w.success, steps: w.jointStep, kind: w.mapCellsSpec.mapKind, failure: w.failure, layout: record ? mapObserverLayout(w) : null, path};
}

// observer only (never shown to the brain): how many legal moves the body still needs from where it is to the checkpoint
import {mechanicalCandidates, actionResultCubes} from "../../../vendor/v9_host/src/ego-v9-vectric4v8-qanda-brsi1/mechanics-2d-v8.js";
import {isPassed} from "../../../vendor/v9_host/src/ego-v9-vectric4v8-qanda-brsi1/world.js";
export function movesLeft(index, cubes, {split = "train"} = {}) {
  const w = createMapCellsWorld(index, {split}), key = c => c.map(q => q.x + "," + q.y).join("|"), start = cubes.map(q => ({...w.cubes[0], ...q}));
  const seen = new Map([[key(start), 0]]), q = [start]; let h = 0;
  while (h < q.length && seen.size < 200000) { const cur = q[h++], d = seen.get(key(cur)); w.cubes = cur.map(c => ({...c}));
    if (cur.every(c => isPassed(w, c))) return d;
    for (let a = 0; a < 2; a++) { w.cubes = cur.map(c => ({...c})); for (const cand of mechanicalCandidates(w, a)) { w.cubes = cur.map(c => ({...c})); const nx = actionResultCubes(w, cand), k = key(nx); if (!seen.has(k)) { seen.set(k, d + 1); q.push(nx); } } } }
  return null;
}
