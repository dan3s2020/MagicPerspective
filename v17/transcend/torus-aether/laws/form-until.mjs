// The same world until it does it, then the next (verbatim 2026-11-05 20:28). Every attempt is a fresh copy of the same
// task; the organism keeps everything it learned. Then the unseen test, as in laws/form.mjs.
import {makeLevel, TWorld, TSEEDS} from "../worlds/transform.mjs";
import {CausalOrganism, liveTask} from "../worlds/causal.mjs";
import {FormOrganism} from "../worlds/form.mjs";
import {RNG} from "../worlds/labyrinth.mjs";
const [E = "300", SEED = "1", NTEST = "90", CAP = "40"] = process.argv.slice(2);
const mapping = seed => { const r = new RNG(seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o.slice(0, 4); };
const moves = mapping(+SEED), clone = a => { const c = Object.assign(Object.create(Object.getPrototypeOf(a)), structuredClone(a)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
const TRAIN = [["object"], ["self"], ["door"]], TEST = [["object", "self"], ["self", "door"], ["object", "door"]];
const kind = L => L.goals.join("+") + (L.terr.includes(2) ? "+plate" : "") + (L.terr.includes(3) ? "+lever" : "");
const train = [], test = [], impossible = [];
for (let i = 0; train.length < +E; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: TRAIN[i % 3]}); if (L) train.push(L); }
for (let i = 0; test.length < +NTEST; i++) { const L = makeLevel(TSEEDS.test + i * 7919, {goals: TEST[i % 3]}); if (L) test.push(L); }
for (let i = 0; impossible.length < 20; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) impossible.push(L); }
const go = (L, a, o, world = null) => { a.begin?.(world); const r = liveTask(L, new TWorld(L, moves), a, o); a.end?.(r.solved); return r; };
const agent = process.env.AGENT === "search" ? new CausalOrganism(+SEED) : new FormOrganism(+SEED), tries = [], never = {}, byKind = {};
for (const L of train) { let k = 0, ok = false; while (!ok && k < +CAP) { k++; ok = go(L, agent, undefined, train.indexOf(L)).solved; }
  tries.push(k); const K = kind(L), s = byKind[K] || (byKind[K] = {tasks: 0, firstTry: 0, tries: 0, never: 0}); s.tasks++; s.firstTry += k === 1 && ok; s.tries += k; if (!ok) s.never++; }
const rows = test.map(L => go(L, clone(agent), {learn: true})), imp = impossible.map(L => go(L, clone(agent), {learn: true}));
const av = a => a.reduce((p, v) => p + v, 0) / a.length, last = tries.slice(-100);
console.log(JSON.stringify({agent: agent.constructor.name, train: {tasks: tries.length, solvedFirstTry: tries.filter(t => t === 1).length, meanTries: +av(tries).toFixed(2), meanTriesLast100: +av(last).toFixed(2), neverSolved: Object.values(byKind).reduce((s, x) => s + x.never, 0)},
  byKind, test: {solved: +av(rows.map(r => r.solved ? 1 : 0)).toFixed(3), wronglySaidLimitation: rows.filter(r => r.said).length}, impossible: {saidLimitation: imp.filter(r => r.said).length + "/" + imp.length}}, null, 1));
