// The experiment (MagicPerspective conversation, 2026-11-05): train on tasks with single kinds of desired configuration,
// test on NEW arrangements with desired configurations of kinds never encountered (combinations), plus impossible ones.
// Compared with a controller that learns only immediate action rewards. node laws/transform.mjs [train] [seed]
import {makeLevel, TWorld, TSEEDS} from "../worlds/transform.mjs";
import {CausalOrganism, ImmediateController, liveTask} from "../worlds/causal.mjs";
import {RNG} from "../worlds/labyrinth.mjs";
const [E = "300", SEED = "1"] = process.argv.slice(2);
const mapping = seed => { const r = new RNG(seed * 2654435761 + 7), o = [0, 1, 2, 3, 4, 5, 6, 7]; for (let i = 7; i > 0; i--) { const j = r.int(i + 1); [o[i], o[j]] = [o[j], o[i]]; } return o.slice(0, 4); };
const moves = mapping(+SEED), clone = a => { const c = Object.assign(Object.create(Object.getPrototypeOf(a)), structuredClone(a)); if (c.org) { c.org = Object.assign(Object.create(CausalOrganism.prototype), c.org); c.org.r = Object.assign(Object.create(RNG.prototype), c.org.r); } c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
const TRAIN = [["object"], ["self"], ["door"]], TEST = [["object", "self"], ["self", "door"], ["object", "door"]];
const train = [], test = [], impossible = [];
for (let i = 0; train.length < +E; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: TRAIN[i % 3]}); if (L) train.push(L); }
for (let i = 0; test.length < 90; i++) { const L = makeLevel(TSEEDS.test + i * 7919, {goals: TEST[i % 3]}); if (L) test.push(L); }
for (let i = 0; impossible.length < 20; i++) { const L = makeLevel(TSEEDS.test + 500000 + i * 7919, {goals: [["object"], ["self"]][i % 2], impossible: true}); if (L) impossible.push(L); }
function run(name, agent) {
  let won = 0; const t0 = performance.now();
  for (let i = 0; i < train.length; i++) won += liveTask(train[i], new TWorld(train[i], moves), agent).solved;
  const rows = test.map(L => liveTask(L, new TWorld(L, moves), clone(agent), {learn: true}));
  const imp = impossible.map(L => liveTask(L, new TWorld(L, moves), clone(agent), {learn: true}));
  const av = a => a.length ? a.reduce((p, v) => p + v, 0) / a.length : NaN, ok = rows.filter(r => r.solved);
  const pred = rows.reduce((s, r) => s + r.predicted, 0), fail = rows.reduce((s, r) => s + r.failed, 0);
  console.log(JSON.stringify({agent: name, trainTasks: train.length, trainSolved: won, test: {solved: +av(rows.map(r => r.solved ? 1 : 0)).toFixed(3), stepsPerOptimal: +av(ok.map(r => r.steps / r.optimal)).toFixed(2),
    causalPredictions: pred, failedCausal: fail, failedRate: pred ? +(fail / pred).toFixed(3) : null, wronglySaidLimitation: rows.filter(r => r.said).length},
    impossible: {n: imp.length, saidLimitation: imp.filter(r => r.said).length, meanStepsBeforeSaying: +av(imp.filter(r => r.said).map(r => r.steps)).toFixed(1)},
    seconds: +((performance.now() - t0) / 1000).toFixed(0)}));
}
run("causal transformation loop", new CausalOrganism(+SEED));
run("immediate-reward controller", new ImmediateController(+SEED));
