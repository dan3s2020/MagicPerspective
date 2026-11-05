// The form it has, TRANSFORMED by what it lives (verbatim 2026-11-05 21:53: "nu trebuie să tot schimbi ce avem, ci să
// transformi"). Its form starts as the attraction field it already has (worlds/form.mjs potential); every attempt
// transforms it: value = −potential + w·φ, with w learned by TD from what happened, φ = the potential's own parts and
// the geometry of its relations (itself→object, object→target: outer and inner product). Before it has lived anything
// it acts exactly as before. Same protocols as laws/form.mjs (combinations never seen + impossible) and laws/geo-form.mjs.
import {makeLevel, TWorld, TSEEDS, ANY} from "../worlds/transform.mjs";
import {liveTask} from "../worlds/causal.mjs";
import {FormOrganism} from "../worlds/form.mjs";
import {RNG} from "../worlds/labyrinth.mjs";

export class TransformingForm extends FormOrganism {
  constructor(seed, {geo = true, alpha = .02, gamma = .95, imagine = 0} = {}) { super(seed); Object.assign(this, {geo, alpha, gamma, imagine}); this.w = null; }
  feats(b, n, goal) {
    const P = this.potential(b, n, goal), pot = P >= 1e6 ? 60 : Math.min(60, P), at = this.findSelf(b), R = this.roles();
    let wrong = 0, a = 0, c = 0, e = 0, f = 0, best = 1e9;
    for (let g = 0; g < b.length; g++) { if (goal[g] === ANY || b[g] === goal[g]) continue; wrong++;
      if (at >= 0) for (let i = 0; i < b.length; i++) if (R.push.has(b[i])) { const d = Math.abs(g % n - i % n) + Math.abs(((g / n) | 0) - ((i / n) | 0)); if (d < best) { best = d;
        a = (i % n - at % n) / n; c = (((i / n) | 0) - ((at / n) | 0)) / n; e = (g % n - i % n) / n; f = (((g / n) | 0) - ((i / n) | 0)) / n; } } }
    const phi = [1, pot / 20, P >= 1e6 ? 1 : 0, wrong / 3];
    return this.geo ? phi.concat([a * f - c * e, a * e + c * f, Math.abs(a * f - c * e)]) : phi;
  }
  V(b, n, goal) { const phi = this.feats(b, n, goal); if (!this.w) this.w = new Array(phi.length).fill(0); let v = -phi[1] * 20; for (let i = 0; i < phi.length; i++) v += this.w[i] * phi[i]; return {v, phi}; }
  // before acting, it walks its own form inside itself (one imagined line, its learned transformations, no search):
  // what happens there (a trap, a dead end, the form reached) transforms its form before it acts for real
  imagineAlong(b, n, goal, K) { let cur = b, seen = new Map();
    for (let k = 0; k < K; k++) { const at = this.findSelf(cur); if (at < 0) return; let best = null;
      for (const o of this.moves()) { const p = this.predict(cur, n, at, o); if (!p) continue; const key = p.b.join(","), done = p.b.every((v, i) => goal[i] === ANY || goal[i] === v);
        const v = done ? 1e6 : this.V(p.b, n, goal).v - 2 * (seen.get(key) || 0); if (!best || v > best.v) best = {p, v, done, key}; }
      if (!best) return; this.tdStep(cur, best.p.b, n, goal); if (best.done) return; seen.set(best.key, (seen.get(best.key) || 0) + 1); cur = best.p.b; } }
  tdStep(before, after, n, goal) { const A = this.V(before, n, goal), done = after.every((v, i) => goal[i] === ANY || goal[i] === v);
    const target = done ? 0 : -1 + this.gamma * this.V(after, n, goal).v, err = Math.max(-20, Math.min(20, target - A.v)); for (let i = 0; i < A.phi.length; i++) this.w[i] += this.alpha * err * A.phi[i]; }
  choose(b, n, goal) {
    const at = this.findSelf(b), M = this.moves();
    if (this.imagine && at >= 0 && M.length >= 4) this.imagineAlong(b, n, goal, this.imagine);
    if (this.noise && this.r.next() < this.noise) return {o: this.r.int(8), how: "noise", at};
    if (at < 0 || M.length < 4) return FormOrganism.prototype.choose.call(this, b, n, goal);
    const key = b.join(","); this.visits ||= new Map(); this.visits.set(key, (this.visits.get(key) || 0) + 1);
    const here = this.V(b, n, goal).v, opts = [];
    for (const o of M) { const p = this.predict(b, n, at, o);
      if (!p) { opts.push({o, v: here + .5, how: "curious"}); continue; }
      const k2 = p.b.join(","), done = p.b.every((v, i) => goal[i] === ANY || goal[i] === v);
      opts.push({o, v: done ? 1e6 : this.V(p.b, n, goal).v - 2 * (this.visits.get(k2) || 0) - (k2 === key ? 1 : 0), how: "form"}); }
    const P0 = this.potential(b, n, goal);                                   // its limitation, as before: nothing it understands can bring the form about, nothing untried is left
    if (P0 >= 1e6 && !opts.some(x => x.how === "curious") && M.every(o => { const p = this.predict(b, n, at, o); return !p || this.potential(p.b, n, goal) >= 1e6; })) { this.stuck = (this.stuck || 0) + 1; if (this.stuck > 2 * n) return {o: null, how: "limitation", at}; } else this.stuck = 0;
    const bestV = Math.max(...opts.map(x => x.v)), T = this.temp ?? .15, w = opts.map(x => Math.exp((x.v - bestV) / Math.max(1e-6, T))); let r = this.r.next() * w.reduce((s, x) => s + x, 0);
    for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return {o: opts[i].o, how: opts[i].how, at}; } return {o: opts[0].o, how: opts[0].how, at};
  }
  learn(before, after, n, at, o, goal) { super.learn(before, after, n, at, o, goal);
    if (!goal || this.findSelf(before) < 0) return; const A = this.V(before, n, goal), done = after.every((v, i) => goal[i] === ANY || goal[i] === v);
    const target = done ? 0 : -1 + this.gamma * this.V(after, n, goal).v, err = Math.max(-20, Math.min(20, target - A.v));   // what happened transforms its form (TD)
    for (let i = 0; i < A.phi.length; i++) this.w[i] += this.alpha * err * A.phi[i]; }
}

if (process.argv[1].endsWith("form-transform.mjs")) {
  const [E = "300", SEED = "1", WHICH = "combo"] = process.argv.slice(2);
  const mapping = seed => { const r = new RNG(seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o.slice(0, 4); };
  const moves = mapping(+SEED), clone = a => { const c = Object.assign(Object.create(Object.getPrototypeOf(a)), structuredClone(a)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
  const TRAIN = WHICH === "object" ? [["object"]] : [["object"], ["self"], ["door"]], TEST = WHICH === "object" ? [["object"]] : [["object", "self"], ["self", "door"], ["object", "door"]];
  const train = [], test = [], impossible = [];
  for (let i = 0; train.length < +E; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: TRAIN[i % TRAIN.length]}); if (L) train.push(L); }
  for (let i = 0; test.length < 90; i++) { const L = makeLevel(TSEEDS.test + (WHICH === "object" ? 3000000 : 0) + i * 7919, {goals: TEST[i % TEST.length]}); if (L) test.push(L); }
  for (let i = 0; impossible.length < 20; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) impossible.push(L); }
  const go = (L, a, o) => { a.begin?.(); return liveTask(L, new TWorld(L, moves), a, o); };
  const IM = +(process.env.IMAGINE || 0), list = IM ? [["its form, transformed by what it lives and what it imagines along it", new TransformingForm(+SEED, {imagine: IM})]] : [["its form, transformed by what it lives", new TransformingForm(+SEED)], ["its form, not transformed (as before)", new FormOrganism(+SEED)]];
  for (const [name, agent] of list) {
    let won = 0; for (const L of train) for (let k = 0; k < 3; k++) { if (go(L, agent).solved) { won++; break; } }
    const rows = test.map(L => go(L, clone(agent), {learn: true})), imp = impossible.map(L => go(L, clone(agent), {learn: true})), ok = rows.filter(r => r.solved);
    console.log(JSON.stringify({agent: name, test: WHICH, trainSolvedWithin3: won + "/" + train.length, unseen: +(ok.length / rows.length).toFixed(3), stepsPerOptimal: ok.length ? +(ok.reduce((s, r) => s + r.steps / r.optimal, 0) / ok.length).toFixed(2) : null, impossibleSaid: imp.filter(r => r.said).length + "/20", w: agent.w?.map(x => +x.toFixed(2))}));
  }
}
