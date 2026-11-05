// Research (2026-11-05, the user's question): does the geometry of relations (the outer product / Plücker coordinate
// of two relation vectors, as in Grassmann flows) make the FORM of the solution learnable — formed inside it from what
// it lives, not written by us? Transformation world, task "an object there". It discovers who it is and what it can
// push (its own rules, as the causal loop); the form is a value it LEARNS from its attempts (TD), linear in its
// relations to things: raw (itself→object, object→target) or geometric (+ their outer product and inner product).
// Acting: among its moves, the one whose predicted consequence (its own learned rules) has the highest learned value.
// node laws/geo-form.mjs [train] [seed]
import {makeLevel, TWorld, TSEEDS, ANY} from "../worlds/transform.mjs";
import {CausalOrganism, liveTask} from "../worlds/causal.mjs";
import {FormOrganism} from "../worlds/form.mjs";
import {RNG} from "../worlds/labyrinth.mjs";

class GeoOrganism extends FormOrganism {
  constructor(seed, geo) { super(seed); this.geo = geo; this.w = null; this.alpha = .05; this.gamma = .95; }
  feats(b, n, goal) {
    const at = this.findSelf(b); if (at < 0) return null; const R = this.roles(), sx = at % n, sy = (at / n) | 0;
    let best = null;
    for (let g = 0; g < b.length; g++) { if (goal[g] === ANY || b[g] === goal[g]) continue;
      for (let i = 0; i < b.length; i++) { if (!R.push.has(b[i])) continue; const bx = i % n, by = (i / n) | 0, gx = g % n, gy = (g / n) | 0, d = Math.abs(gx - bx) + Math.abs(gy - by);
        if (!best || d < best.d) best = {d, sb: [(bx - sx) / n, (by - sy) / n], bg: [(gx - bx) / n, (gy - by) / n]}; } }
    if (!best) return null; const [a, c] = best.sb, [e, f] = best.bg;
    const raw = [1, a, c, e, f, Math.abs(a) + Math.abs(c), Math.abs(e) + Math.abs(f), a * a + c * c, e * e + f * f];
    return this.geo ? raw.concat([a * f - c * e, a * e + c * f, Math.abs(a * f - c * e)]) : raw;   // outer product (Plücker in 2D) and inner product of the two relations
  }
  V(phi) { if (!phi) return 0; if (!this.w) this.w = new Array(phi.length).fill(0); let v = 0; for (let i = 0; i < phi.length; i++) v += this.w[i] * phi[i]; return v; }
  choose(b, n, goal) {
    const at = this.findSelf(b), M = this.moves();
    if (at < 0 || M.length < 4) return CausalOrganism.prototype.choose.call(this, b, n, goal);
    const opts = []; for (const o of M) { const p = this.predict(b, n, at, o); opts.push({o, v: p ? (p.b.join() === b.join() ? -1e3 : (this.reachedB(p.b, goal) ? 10 : this.V(this.feats(p.b, n, goal)))) : this.V(this.feats(b, n, goal)) + .05, how: p ? "form" : "curious"}); }
    const best = Math.max(...opts.map(x => x.v)), T = .05, w = opts.map(x => Math.exp((x.v - best) / T)); let r = this.r.next() * w.reduce((s, x) => s + x, 0);
    for (let i = 0; i < opts.length; i++) { r -= w[i]; if (r <= 0) return {o: opts[i].o, how: opts[i].how, at}; } return {o: opts[0].o, how: opts[0].how, at};
  }
  reachedB(b, goal) { for (let i = 0; i < b.length; i++) if (goal[i] !== ANY && goal[i] !== b[i]) return false; return true; }
  learn(before, after, n, at, o, goal) { super.learn(before, after, n, at, o);
    if (!goal) return; const f0 = this.feats(before, n, goal); if (!f0) return; const done = this.reachedB(after, goal), f1 = done ? null : this.feats(after, n, goal);
    const target = (done ? 0 : -1) + (done ? 0 : this.gamma * this.V(f1)), err = target - this.V(f0); for (let i = 0; i < f0.length; i++) this.w[i] += this.alpha * err * f0[i]; }   // the form, learned from what happened (TD)
}

const [E = "300", SEED = "1"] = process.argv.slice(2);
const mapping = seed => { const r = new RNG(seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o.slice(0, 4); };
const moves = mapping(+SEED), clone = a => { const c = Object.assign(Object.create(Object.getPrototypeOf(a)), structuredClone(a)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
const train = [], test = [];
for (let i = 0; train.length < +E; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: ["object"]}); if (L) train.push(L); }
for (let i = 0; test.length < 90; i++) { const L = makeLevel(TSEEDS.test + 3000000 + i * 7919, {goals: ["object"]}); if (L) test.push(L); }
const go = (L, a, o) => { a.begin?.(); return liveTask(L, new TWorld(L, moves), a, o); };
for (const [name, agent] of [["geometric relations (+ outer/inner product), learned form", new GeoOrganism(+SEED, true)], ["raw relations, learned form", new GeoOrganism(+SEED, false)], ["form written by me (FormOrganism)", new FormOrganism(+SEED)], ["search (causal loop)", new CausalOrganism(+SEED)]]) {
  let won = 0; const t0 = performance.now(); for (const L of train) for (let k = 0; k < 3; k++) { const r = go(L, agent); if (r.solved) { won++; break; } }
  const rows = test.map(L => go(L, clone(agent), {learn: true})), ok = rows.filter(r => r.solved);
  console.log(JSON.stringify({agent: name, trainSolvedWithin3: won + "/" + train.length, unseen: +(ok.length / rows.length).toFixed(3), stepsPerOptimal: ok.length ? +(ok.reduce((s, r) => s + r.steps / r.optimal, 0) / ok.length).toFixed(2) : null, weights: agent.w ? agent.w.map(x => +x.toFixed(2)) : undefined, sec: +((performance.now() - t0) / 1000).toFixed(0)}));
}
