// The form of the solution as part of itself vs the causal loop's search, on the SAME tasks (laws/transform.mjs protocol):
// trained on single kinds, tested on unseen arrangements with combinations never encountered, plus impossible ones.
import {makeLevel, TWorld, TSEEDS} from "../worlds/transform.mjs";
import {CausalOrganism, liveTask} from "../worlds/causal.mjs";
import {FormOrganism} from "../worlds/form.mjs";
import {RNG} from "../worlds/labyrinth.mjs";
const [E = "300", SEED = "1", NTEST = "90"] = process.argv.slice(2);
const mapping = seed => { const r = new RNG(seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o.slice(0, 4); };
const moves = mapping(+SEED), clone = a => { const c = Object.assign(Object.create(Object.getPrototypeOf(a)), structuredClone(a)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
const TRAIN = [["object"], ["self"], ["door"]], TEST = [["object", "self"], ["self", "door"], ["object", "door"]];
const train = [], test = [], impossible = [];
for (let i = 0; train.length < +E; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: TRAIN[i % 3]}); if (L) train.push(L); }
for (let i = 0; test.length < +NTEST; i++) { const L = makeLevel(TSEEDS.test + i * 7919, {goals: TEST[i % 3]}); if (L) test.push(L); }
for (let i = 0; impossible.length < 20; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) impossible.push(L); }
const go = (L, a, o) => { a.begin?.(); return liveTask(L, new TWorld(L, moves), a, o); };
function run(name, agent) {
  let won = 0; const t0 = performance.now();
  for (let i = 0; i < train.length; i++) won += go(train[i], agent).solved;
  const rows = test.map(L => go(L, clone(agent), {learn: true})), imp = impossible.map(L => go(L, clone(agent), {learn: true}));
  const av = a => a.length ? a.reduce((p, v) => p + v, 0) / a.length : NaN, ok = rows.filter(r => r.solved);
  console.log(JSON.stringify({agent: name, trainSolved: won + "/" + train.length, test: {solved: +av(rows.map(r => r.solved ? 1 : 0)).toFixed(3), stepsPerOptimal: +av(ok.map(r => r.steps / r.optimal)).toFixed(2), wronglySaidLimitation: rows.filter(r => r.said).length},
    impossible: {n: imp.length, saidLimitation: imp.filter(r => r.said).length, meanSteps: +av(imp.filter(r => r.said).map(r => r.steps)).toFixed(1)}, seconds: +((performance.now() - t0) / 1000).toFixed(0)}));
}
if (!process.env.ONLY || process.env.ONLY === "form") run("form inside itself (no search)", new FormOrganism(+SEED));
if (!process.env.ONLY || process.env.ONLY === "search") run("causal loop (searches sequences)", new CausalOrganism(+SEED));
