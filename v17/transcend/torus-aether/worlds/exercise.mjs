// THE WHOLE EXERCISE, NOTHING EXPLAINED. The labyrinths of MagicPerspective V16 (same generator, same unseen test seeds,
// same step limit), but the brain is told nothing:
//  · it sees the whole exercise as a retina: every cell shows one raw symbol (4 kinds: what will turn out to be floor,
//    wall, target and itself — the symbols carry no meaning and nothing marks which one is "me");
//  · it can emit any of 8 output symbols; the world reacts to 4 of them (each moves something, in a direction the
//    brain does not know; the mapping is different for every brain) and ignores the other 4;
//  · no teacher, no direction to the target, no reward signal except that the exercise ends and a new one appears.
// What the brain discovers, from what happens:
//  1. WHO IT IS and WHAT ITS MOVES DO: after each output, which kind of symbol changed place, and by how much;
//     the kind that moves when it acts is itself, each output's displacement is what that output does;
//  2. WHAT THE WORLD IS: pushing itself into a cell of some kind and not moving = that kind REPELS (resistance);
//     moving into it = it lets through;
//  3. WHAT THE GOAL IS: the kind it entered when the exercise ended ATTRACTS;
//  4. THE SHAPE OF THE SOLUTION: attraction spreads from what attracts through what lets through (repelled by what
//     repels) over the whole exercise; the path that climbs it from itself is the whole trajectory, predicted before
//     the first move. Predicting the whole trajectory right from the start ends the exercise sooner: that is the
//     reward, and the brain learns how far to trust its predicted shape versus exploring.
import {makeMaze, nextCell, seedOf, SEEDS, RNG, ACTIONS} from "./labyrinth.mjs";

export const KIND = {floor: 0, wall: 1, target: 2, self: 3};               // for the world and the observer only
const SYMS = [1, 2, 3, 4];                                                   // the raw symbols the retina shows (control codes, never in text; no meaning)
const OUTS = [5, 6, 7, 8, 11, 12, 14, 15];                                  // the 8 symbols the brain can emit
export const EX_SYMBOLS = new Set([...SYMS, ...OUTS]);
// ONE BODY: what each of its outputs does to itself, learned in whichever world it acted; every world reads it
export const bodyAdd = (body, o, dx, dy, n = 1) => { if (!body) return; const m = body[o] || (body[o] = new Map()), k = dx + "," + dy; m.set(k, (m.get(k) || 0) + n); };
export const bodyEffect = (body, o) => { const m = body?.[o]; if (!m) return null; let best = null, bc = 0, tot = 0; for (const [k, c] of m) { tot += c; if (c > bc) { bc = c; best = k; } }
  return best && bc >= 3 && bc / tot > .8 ? best.split(",").map(Number) : null; };


export class Discoverer {
  constructor(seed = 1) {
    const r = new RNG(seed * 2654435761 + 7), order = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [order[i], order[j]] = [order[j], order[i]]; }
    this.world = {moves: order.slice(0, 4), seed};                         // the world's physics for this brain (never read by the brain's choices)
    this.disp = Array.from({length: 8}, () => new Map());                  // output → Map("kind|dx|dy" → count)
    this.tries = new Array(8).fill(0); this.pass = [1, 1, 1, 1]; this.block = [1, 1, 1, 1]; this.enter = [1, 1, 1, 1]; this.endIn = [0, 0, 0, 0];
    this.trust = {plan: [1, 2], explore: [1, 2]}; this.r = new RNG(seed + 99); this.episodes = 0;
  }
  // ---- what it has discovered ----
  self() {                                                                   // the kind whose place changes when it acts
    const score = [0, 0, 0, 0]; for (const m of this.disp) for (const [k, c] of m) { const [kind, dx, dy] = k.split("|").map(Number); if (dx || dy) score[kind] += c; }
    const best = score.indexOf(Math.max(...score)); return score[best] >= 3 ? best : -1; }
  effect(o) {                                                                // what output o does to itself: [dx, dy] or null
    const s = this.self(); if (s < 0) return null; let best = null, bc = 0, tot = 0;
    for (const [k, c] of this.disp[o]) { const [kind, dx, dy] = k.split("|").map(Number); if (kind !== s || (!dx && !dy)) continue; tot += c; if (c > bc) { bc = c; best = [dx, dy]; } }
    return best && bc >= 2 && bc / tot > .6 ? best : bodyEffect(this.body, o); }   // when it did move, it always moved this way (blocked tries say nothing about the direction); else what its body learned elsewhere
  conduct(kind) { return this.pass[kind] / (this.pass[kind] + this.block[kind]); }
  attract(kind) { return this.endIn[kind] / this.enter[kind]; }
  // ---- the shape of the solution: attraction spread over the exercise, climbed from itself ----
  shape(ret, n, me) {
    const att = [0, 1, 2, 3].map(k => this.attract(k)), cond = [0, 1, 2, 3].map(k => this.conduct(k)), V = new Float64Array(n * n);
    let any = false; for (let i = 0; i < n * n; i++) if (att[ret[i]] > .2 && i !== me) { V[i] = att[ret[i]]; any = true; }
    if (!any) return null;
    for (let it = 0; it < 2 * n * n; it++) { let ch = false;
      for (let i = 0; i < n * n; i++) { const k = ret[i]; if (att[k] > .2 && i !== me) continue; const c = i === me ? 1 : cond[k]; if (c < .5) continue;
        let b = 0; for (let a = 0; a < 4; a++) { const j = nextStep(n, i, a); if (j >= 0 && V[j] > b) b = V[j]; } const v = .97 * c * b; if (v > V[i] + 1e-12) { V[i] = v; ch = true; } }
      if (!ch) break; }
    const path = []; let p = me; const seen = new Set([p]);
    for (let k = 0; k < n * n; k++) { let best = -1, bv = V[p]; const up = []; for (let a = 0; a < 4; a++) { const j = nextStep(n, p, a); if (j >= 0 && !seen.has(j) && V[j] > V[p]) up.push([a, V[j]]); if (j >= 0 && !seen.has(j) && V[j] > bv) { bv = V[j]; best = a; } }
      if (this.temp && up.length > 1) { let z = 0; const w = up.map(([a, v]) => { const q = Math.exp((v - bv) / (this.temp * .03 * bv + 1e-12)); z += q; return [a, q]; }); let r = this.r.next() * z; for (const [a, q] of w) { r -= q; if (r <= 0) { best = a; break; } } }   // alive: among ways that climb almost as well, it does not always take the same one
      if (best < 0) break; path.push(best); p = nextStep(n, p, best); seen.add(p); if (att[ret[p]] > .2) break; }
    return path.length ? path : null;
  }
  // ---- choosing what to emit ----
  choose(ret, n, me, visits, plan) {
    if (this.noise && this.r.next() < this.noise) return {o: this.r.int(8), how: "noise"};   // the person's noise: sometimes it acts at random
    const outs = [0, 1, 2, 3, 4, 5, 6, 7], eff = outs.map(o => this.effect(o));
    const tp = this.trust.plan[0] / this.trust.plan[1], te = this.trust.explore[0] / this.trust.explore[1];
    if (plan && plan.length && tp >= te * .9) { const d = ACTIONS[plan[0]], o = outs.find(o => eff[o] && eff[o][0] === d[0] && eff[o][1] === d[1]); if (o !== undefined) return {o, how: "plan"}; }
    // explore: outputs never tried first; then the known moves toward cells it has not been in, through what lets through
    const untried = outs.filter(o => this.tries[o] < 3); if (untried.length) return {o: untried[this.r.int(untried.length)], how: "explore"};
    let best = [], bv = -Infinity; const cand = [];
    for (const o of outs) { const e = eff[o]; if (!e) { const v = .7 / (1 + this.tries[o] / 15) + .05 * this.r.next(); cand.push([o, v]); if (v > bv) { bv = v; best = [o]; } continue; }   // what this output does is still unknown: curiosity
      const x = me % n + e[0], y = ((me / n) | 0) + e[1]; if (x < 0 || y < 0 || x >= n || y >= n) continue; const j = y * n + x;
      const v = this.conduct(ret[j]) - .3 * Math.min(visits[j] || 0, 5) + .2 * this.attract(ret[j]) + .05 * this.r.next(); cand.push([o, v]); if (v > bv) { bv = v; best = [o]; } }
    if (this.temp && cand.length > 1) { let z = 0; const w = cand.map(([o, v]) => { const q = Math.exp((v - bv) / this.temp); z += q; return [o, q]; }); let r = this.r.next() * z; for (const [o, q] of w) { r -= q; if (r <= 0) return {o, how: "explore"}; } }   // temperature: not always the best-looking
    if (best.length) return {o: best[0], how: "explore"};
    return {o: this.r.int(8), how: "explore"};
  }
  learnStep(before, after, n, o, meBefore) {
    this.tries[o]++; const moved = [];                                       // which kinds changed place, and by how much
    const self = this.self();
    for (let k = 0; k < 4; k++) { const a = before.indexOf(k), b = after.indexOf(k); if (a >= 0 && b >= 0 && a !== b && countOf(before, k) === 1) moved.push([k, (b % n) - (a % n), ((b / n) | 0) - ((a / n) | 0)]); }
    if (!moved.length) { const m = this.disp[o]; for (let k = 0; k < 4; k++) if (countOf(before, k) === 1) { const key = k + "|0|0"; m.set(key, (m.get(key) || 0) + 1); } }
    for (const [k, dx, dy] of moved) { const key = k + "|" + dx + "|" + dy; this.disp[o].set(key, (this.disp[o].get(key) || 0) + 1); if (k === self) bodyAdd(this.body, o, dx, dy); }
    // resistance: it pushed itself toward a cell and did not move → that cell's kind repels; moved into it → lets through
    const e = this.effect(o); if (self >= 0 && e && meBefore >= 0) { const x = meBefore % n + e[0], y = ((meBefore / n) | 0) + e[1];
      if (x >= 0 && y >= 0 && x < n && y < n) { const k = before[y * n + x]; if (moved.some(m => m[0] === self)) { this.pass[k]++; this.enter[k]++; this.lastEntered = k; } else this.block[k]++; } }
  }
  // a whole batch of exercises lived on the card (gpu/worlds_gpu.py exercise_learn_batch): only the totals of what
  // happened are added, exactly what learnStep/endEpisode would have added one step at a time
  absorb(L) { const SELF = 3, TARGET = 2;
    for (let o = 0; o < 8; o++) { this.tries[o] += L.tries[o]; const m = this.disp[o];
      for (let a = 0; a < 3; a++) for (let c = 0; c < 3; c++) { const v = L.move[o][a][c]; if (!v) continue; const dx = a - 1, dy = c - 1, key = SELF + "|" + dx + "|" + dy; m.set(key, (m.get(key) || 0) + v); if (dx || dy) bodyAdd(this.body, o, dx, dy, v); }
      if (L.still[o]) for (const k of [TARGET, SELF]) { const key = k + "|0|0"; m.set(key, (m.get(key) || 0) + L.still[o]); } }
    for (let k = 0; k < 4; k++) { this.pass[k] += L.pass[k]; this.block[k] += L.block[k]; this.enter[k] += L.enter[k]; this.endIn[k] += L.endIn[k]; }
    this.trust.plan[0] += L.trust.plan[0]; this.trust.plan[1] += L.trust.plan[1]; this.trust.explore[0] += L.trust.explore[0]; this.trust.explore[1] += L.trust.explore[1];
    this.episodes += L.trust.plan[1] + L.trust.explore[1]; }
  endEpisode(solved, howCounts) { this.episodes++;                           // the exercise ended: what it entered last attracts
    if (solved && this.lastEntered !== undefined) this.endIn[this.lastEntered]++;
    const f = solved ? 1 : 0; if (howCounts.plan > howCounts.explore) { this.trust.plan[0] += f; this.trust.plan[1]++; } else { this.trust.explore[0] += f; this.trust.explore[1]++; } }
}
const nextStep = (n, i, a) => { const x = i % n + ACTIONS[a][0], y = ((i / n) | 0) + ACTIONS[a][1]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; };
const countOf = (arr, k) => { let c = 0; for (const v of arr) if (v === k) c++; return c; };

// one exercise. live(sym) feeds every symbol to the brain's graph (the retina once, then every output and every change)
export function playExercise(w, D, live = () => {}, {record = false, outputs = null, onTransition = null} = {}) {   // outputs: decisions already made (by the GPU batch) to live again
  const n = w.n, ret = Array.from(w.wall, v => v ? KIND.wall : KIND.floor); ret[w.goal] = KIND.target; let pos = w.start; ret[pos] = KIND.self;
  const lim = 3 * w.dist[w.start] + 15, visits = new Uint16Array(n * n); visits[pos]++;
  for (const k of ret) live(SYMS[k]);                                        // the whole exercise, once
  const meNow = () => { const s = D.self(); if (s < 0) return -1; const i = ret.indexOf(s); return ret.lastIndexOf(s) === i ? i : -1; };
  let steps = 0, first = null; const how = {plan: 0, explore: 0, noise: 0}, path = [pos], shapes = [];
  while (pos !== w.goal && steps < lim) {
    const me = meNow(), plan = me >= 0 ? D.shape(ret, n, me) : null;
    if (steps === 0) first = plan ? planScore(w, pos, plan) : 0;
    if (record) shapes.push(plan ? (steps === 0 ? plan : plan.slice(0, 30)) : null);   // the first one whole: the shape predicted before any move
    const c = outputs ? {o: outputs[steps], how: plan && D.trust.plan[0] / D.trust.plan[1] >= D.trust.explore[0] / D.trust.explore[1] * .9 ? "plan" : "explore"} : D.choose(ret, n, me, visits, plan); how[c.how]++; live(OUTS[c.o]);
    if (outputs && c.o === undefined) break;
    const before = ret.slice(), dir = D.world.moves.indexOf(c.o);              // the world's physics
    if (dir >= 0) { const j = nextCell(w, pos, dir); if (j >= 0 && !w.wall[j]) { ret[pos] = KIND.floor; pos = j; ret[pos] = KIND.self; visits[pos]++; path.push(pos); } }
    D.learnStep(before, ret, n, c.o, me);
    if (onTransition) onTransition({before, after: ret.slice(), action: c.o, n});  // actual observation, never oracle distance
    for (let i = 0; i < n * n; i++) if (before[i] !== ret[i]) live(SYMS[ret[i]]);   // what changed
    steps++;
  }
  const solved = pos === w.goal; D.endEpisode(solved, how);
  return {solved, steps, optimal: w.dist[w.start], first, how, path, shapes, n, wall: Array.from(w.wall), start: w.start, goal: w.goal,
    knows: {self: D.self() === KIND.self, moves: [0, 1, 2, 3, 4, 5, 6, 7].filter(o => D.effect(o)).length, wallRepels: D.conduct(KIND.wall) < .5, targetAttracts: D.attract(KIND.target) > .2}};
}
function planScore(w, pos, plan) { let p = pos, good = 0, k = 0;
  for (const a of plan) { if (p === w.goal) break; k++; const j = nextCell(w, p, a); if (j >= 0 && !w.wall[j] && w.dist[j] === w.dist[p] - 1) { good++; p = j; } else break; }
  return k ? good / Math.max(k, w.dist[pos]) : 0; }
export {makeMaze, seedOf, SEEDS};
