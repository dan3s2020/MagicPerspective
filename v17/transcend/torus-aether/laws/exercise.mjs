// The whole exercise, nothing explained (worlds/exercise.mjs): how fast a brain discovers itself, its moves, what repels,
// what attracts, and how well it then solves 100 unseen labyrinths. node laws/exercise.mjs <exercises> <brain seed>
import {Discoverer, playExercise, makeMaze, seedOf, SEEDS} from "../worlds/exercise.mjs";
import {RNG} from "../worlds/labyrinth.mjs";
const [E = "300", seed = "1"] = process.argv.slice(2);
const D = new Discoverer(+seed); const clone = () => { const c = Object.assign(Object.create(Discoverer.prototype), structuredClone(D)); c.r = Object.assign(Object.create(RNG.prototype), c.r); return c; };
const test = () => { const rows = []; for (let i = 0; i < 100; i++) rows.push(playExercise(makeMaze(seedOf(SEEDS.test, i), [7, 9, 11][i % 3]), clone()));
  const av = a => a.length ? a.reduce((p, v) => p + v, 0) / a.length : NaN, ok = rows.filter(r => r.solved);
  return `solved ${(100 * av(rows.map(r => r.solved ? 1 : 0))).toFixed(0)}% · steps/optimal ${av(ok.map(r => r.steps / r.optimal)).toFixed(2)} · whole trajectory predicted at start ${(100 * av(rows.map(r => r.first))).toFixed(0)}%`; };
console.log("before any experience:", test());
let won = 0;
for (let i = 0; i < +E; i++) { const r = playExercise(makeMaze(seedOf(SEEDS.train, i), [7, 9][i % 2]), D); won += r.solved;
  if ([0, 4, 9, 29, 99, 299, 999].includes(i)) console.log(`after ${i + 1}: knows self ${r.knows.self} · moves found ${r.knows.moves} · wall repels ${r.knows.wallRepels} · target attracts ${r.knows.targetAttracts} · solved so far ${won}/${i + 1} · trust plan ${(D.trust.plan[0] / D.trust.plan[1]).toFixed(2)} explore ${(D.trust.explore[0] / D.trust.explore[1]).toFixed(2)}`); }
console.log(`after ${E}:`, test());
