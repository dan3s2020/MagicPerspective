// THE CAUSAL TRANSFORMATION LOOP (as described): perceive reality → discover structure → form an intention → imagine
// transformations → act and measure → repeat until the target state is reached or the organism identifies a limitation.
// It learns an approximate transition model P(S_{t+1} | S_t, do(a_t)) from its own interventions only:
//  · STRUCTURE: which symbol is itself (the singleton that changes place when it acts — and every symbol it becomes when
//    it stands on something), what each output does to it, and the REWRITE RULES of the world: when output o is done
//    with these symbols at itself, one step ahead and two steps ahead, what those three cells become and what changes
//    elsewhere (a change elsewhere is how it finds switches and doors: some persist, some reverse when it leaves, some
//    make a barrier passable). Rules are kept per output, then pooled over every output that moves it (what holds for
//    one direction is tried for the others), then without the farthest cell when that cell never changed.
//  · INTENTION: the desired configuration (the same raw symbols, "any" elsewhere) — a future to bring about.
//  · IMAGINATION: counterfactual search over its own model: every sequence of interventions, their predicted
//    consequences, until a predicted state matches the intention (the transformation ΔS = S_desired − S_current).
//  · ACT AND MEASURE: it does the first intervention, compares what happened with what it predicted (a failed causal
//    prediction is counted and corrects the rule), and imagines again.
//  · CURIOSITY: when imagination finds no way but there are situations whose consequences it has never seen, it goes
//    and tries them. LIMITATION: when no way exists and nothing untried is reachable, it says so and stops.
import {RNG} from "./labyrinth.mjs";
import {ANY} from "./transform.mjs";

export class CausalOrganism {
  constructor(seed = 1, {cap = 40000} = {}) {
    this.selfKinds = new Set(); this.fx = Array.from({length: 8}, () => new Map()); this.tries = new Array(8).fill(0);
    this.rules = new Map(); this.far = new Map(); this.r = new RNG(seed + 31); this.cap = cap; this.failed = 0; this.predicted = 0;
  }
  // ---- structure ----
  effect(o) { let best = null, bc = 0, tot = 0; for (const [k, c] of this.fx[o]) { if (!Array.isArray(k)) continue; tot += c; if (c > bc) { bc = c; best = k; } }   // tries where nothing moved say nothing about the direction
    return Array.isArray(best) && bc >= 2 && bc / tot > .6 ? best : null; }            // a displacement (as cell offset dx,dy) or null
  moves() { return [0, 1, 2, 3, 4, 5, 6, 7].filter(o => this.effect(o)); }
  findSelf(b) { let at = -1; for (let i = 0; i < b.length; i++) if (this.selfKinds.has(b[i])) { if (at >= 0) return -1; at = i; } return at; }
  cell(n, i, e, k) { const x = i % n + k * e[0], y = ((i / n) | 0) + k * e[1]; return x < 0 || y < 0 || x >= n || y >= n ? -1 : y * n + x; }
  keyOf(b, n, at, o) { const e = this.effect(o); if (!e) return null; const c = [0, 1, 2].map(k => this.cell(n, at, e, k)); return {c, k: c.map(i => i < 0 ? -1 : b[i])}; }
  // the rule for doing o here: the most frequent consequence seen in this situation (per output, pooled, shorter)
  rule(o, k) { const tries = [o + "|" + k.join(","), "M|" + k.join(","), o + "|" + k[0] + "," + k[1] + ",?", "M|" + k[0] + "," + k[1] + ",?"];
    for (const t of tries) { const m = this.rules.get(t); if (!m) continue;
      // without the farthest cell only when it has been seen not to matter: one consequence, whatever stood there (3 kinds at least)
      if (t.endsWith("?") && (m.size !== 1 || (this.far.get(t)?.size || 0) < 3)) continue;
      let best = null, bc = 0; for (const [sig, c] of m) if (c > bc) { bc = c; best = sig; } if (best) return JSON.parse(best); }
    return null; }
  predict(b, n, at, o) {                                                       // the imagined consequence of do(o) here, or null if never seen
    const K = this.keyOf(b, n, at, o); if (!K) return null; const R = this.rule(o, K.k); if (!R) return null;
    const nb = b.slice(); R.loc.forEach((v, j) => { if (v !== null && K.c[j] >= 0) nb[K.c[j]] = v; });
    if (R.glob.length) { const g = new Map(R.glob), set = new Set(K.c.filter((c, j) => R.loc[j] !== null && c >= 0));   // changes elsewhere reach every cell the rule does not set itself
      for (let i = 0; i < nb.length; i++) if (!set.has(i) && g.has(b[i])) nb[i] = g.get(b[i]); }
    return {b: nb, at: R.moved ? K.c[1] : at};
  }
  learn(before, after, n, at, o) {                                             // what really happened after do(o)
    this.tries[o]++; const changed = []; for (let i = 0; i < before.length; i++) if (before[i] !== after[i]) changed.push(i);
    // who it is and what o does: a singleton symbol that left one cell and a symbol that appeared one step away
    if (at < 0 || !this.selfKinds.size) {
      for (const i of changed) for (const j of changed) { const dx = (j % n) - (i % n), dy = ((j / n) | 0) - ((i / n) | 0);
        if (Math.abs(dx) + Math.abs(dy) === 1 && before.filter(v => v === before[i]).length === 1 && after[j] === before[i] && after[i] !== before[i]) {
          this.selfKinds.add(before[i]); const key = [dx, dy]; this.addFx(o, key); return; } }
      return;
    }
    const e = this.effect(o);
    if (!e) { const tgt = changed.find(j => Math.abs((j % n) - (at % n)) + Math.abs(((j / n) | 0) - ((at / n) | 0)) === 1 && this.selfKinds.has(after[j]));
      if (tgt !== undefined) this.addFx(o, [(tgt % n) - (at % n), ((tgt / n) | 0) - ((at / n) | 0)]); else if (!changed.length) this.fx[o].set("none", (this.fx[o].get("none") || 0) + 1);
      return; }
    const c = [0, 1, 2].map(k => this.cell(n, at, e, k)), moved = c[1] >= 0 && changed.includes(c[1]) && !this.selfKinds.has(before[c[1]]) && changed.includes(at);
    if (moved) { this.selfKinds.add(after[c[1]]); this.addFx(o, e); }
    const glob = new Map(); for (const i of changed) if (!c.includes(i)) glob.set(before[i], after[i]);
    const loc = c.map((i, j) => i < 0 ? null : j === 2 && glob.get(before[i]) === after[i] && before[i] !== after[i] ? null : after[i]);
    const sig = JSON.stringify({loc, glob: [...glob].sort(), moved}), k = c.map(i => i < 0 ? -1 : before[i]);
    const add = key => { let m = this.rules.get(key); if (!m) this.rules.set(key, m = new Map()); m.set(sig, (m.get(sig) || 0) + 1); };
    add(o + "|" + k.join(",")); add("M|" + k.join(","));
    if (loc[2] === k[2] || loc[2] === null) { const sig2 = JSON.stringify({loc: [loc[0], loc[1], null], glob: [...glob].sort(), moved}); for (const key of [o + "|" + k[0] + "," + k[1] + ",?", "M|" + k[0] + "," + k[1] + ",?"]) { let m = this.rules.get(key); if (!m) this.rules.set(key, m = new Map()); m.set(sig2, (m.get(sig2) || 0) + 1);
      let f = this.far.get(key); if (!f) this.far.set(key, f = new Set()); f.add(k[2]); } }
    else for (const key of [o + "|" + k[0] + "," + k[1] + ",?", "M|" + k[0] + "," + k[1] + ",?"]) { let m = this.rules.get(key); if (!m) this.rules.set(key, m = new Map()); m.set("x" + k[2], 1); }   // here the farthest cell mattered
  }
  addFx(o, e) { const m = this.fx[o], k = e; let hit = null; for (const kk of m.keys()) if (Array.isArray(kk) && kk[0] === k[0] && kk[1] === k[1]) hit = kk; m.set(hit || k, (m.get(hit || k) || 0) + 1); }
  // ---- intention and imagination ----
  matches(b, goal) { for (let i = 0; i < b.length; i++) if (goal[i] !== ANY && goal[i] !== b[i]) return false; return true; }
  imagine(b, n, at, goal) {                                                    // counterfactual search over its own model
    const M = this.moves(), start = {b, at, path: []}, seen = new Set([b.join(",")]), q = [start]; let frontier = null;
    for (let h = 0; h < q.length && seen.size < this.cap; h++) { const s = q[h];
      if (this.matches(s.b, goal)) return {plan: s.path};
      for (const o of M) { const p = this.predict(s.b, n, s.at, o);
        if (!p) { if (!frontier) frontier = {plan: s.path.concat([o]), unknown: true}; continue; }       // a consequence it has never seen
        const k = p.b.join(","); if (seen.has(k)) continue; seen.add(k); q.push({b: p.b, at: p.at, path: s.path.concat([o])}); } }
    if (frontier) return frontier;
    return seen.size >= this.cap ? {plan: null, undecided: true} : {plan: null, limitation: true};
  }
  // ---- one step of the loop ----
  choose(b, n, goal) {
    const at = this.findSelf(b), M = this.moves();
    if (at < 0 || M.length < 4) {                                              // it does not know yet who it is or what it can do
      const order = [0, 1, 2, 3, 4, 5, 6, 7].sort((x, y) => (this.effect(x) ? 1 : 0) - (this.effect(y) ? 1 : 0) || this.tries[x] - this.tries[y] || this.r.next() - .5);
      return {o: order[0], how: "explore", at}; }
    const im = this.imagine(b, n, at, goal);
    if (im.limitation) return {o: null, how: "limitation", at};
    if (!im.plan || !im.plan.length) return {o: M[this.r.int(M.length)], how: "explore", at};
    return {o: im.plan[0], how: im.unknown ? "curious" : "plan", at, planLen: im.plan.length, plan: im.plan};
  }
}

// the controller the experiment compares with: it learns only the immediate reward of each action (how many cells of
// the desired configuration an action makes right, now), from the same perception of itself and its neighbourhood
export class ImmediateController {
  constructor(seed = 1) { this.org = new CausalOrganism(seed); this.q = new Map(); this.r = new RNG(seed + 77); }
  key(b, n, at, o) { const K = this.org.keyOf(b, n, at, o); return o + "|" + (K ? K.k.join(",") : "?"); }
  choose(b, n, goal) { const at = this.org.findSelf(b); if (at < 0 || this.org.moves().length < 4) return this.org.choose(b, n, goal);
    if (this.r.next() < .1) return {o: this.r.int(8), how: "explore", at};
    let best = 0, bv = -Infinity; for (let o = 0; o < 8; o++) { const s = this.q.get(this.key(b, n, at, o)), v = s ? s[0] / s[1] : 1 + this.r.next() * .01; if (v > bv) { bv = v; best = o; } }
    return {o: best, how: "reward", at}; }
  learn(before, after, n, at, o, goal) { this.org.learn(before, after, n, at, o);
    const score = b => b.reduce((s, v, i) => s + (goal[i] !== ANY && goal[i] === v ? 1 : 0), 0), rw = score(after) - score(before) + (this.org.matches(after, goal) ? 5 : 0) - .02;
    if (at < 0) return; const k = this.key(before, n, at, o), s = this.q.get(k) || [0, 0]; s[0] += rw; s[1]++; this.q.set(k, s); }
}

// one task: the organism lives it until the configuration is reached, it states a limitation, or time runs out
export function liveTask(level, world, agent, {limit = null, record = false, learn = true} = {}) {
  const n = level.n, goal = level.goal, lim = limit ?? 4 * (level.optimal || 20) + 40; let steps = 0, failed = 0, predicted = 0, how = {}, said = null, firstPlan = null; const frames = [];
  if (record) frames.push({b: world.board()});
  while (!world.reached() && steps < lim) {
    const b = world.board(), c = agent.choose(b, n, goal); how[c.how] = (how[c.how] || 0) + 1;
    if (steps === 0 && c.plan && c.how === "plan") firstPlan = c.plan.length;
    if (c.how === "limitation") { said = "limitation"; break; }
    const org = agent.org || agent, guess = c.at >= 0 ? org.predict(b, n, c.at, c.o) : null;
    world.step(c.o); const a = world.board(); steps++;
    if (guess) { predicted++; if (guess.b.some((v, i) => v !== a[i])) failed++; }
    if (learn) agent.learn(b, a, n, c.at, c.o, goal);
    if (record) frames.push({b: a, o: c.o, how: c.how, plan: c.plan ? c.plan.slice(0, 40) : null});
  }
  return {solved: world.reached(), steps, optimal: level.optimal ?? null, failed, predicted, how, said, firstPlan, frames, n};
}
