// The torus-aether brain on MagicPerspective V16's labyrinths: lives E teacher episodes, then 100 unseen labyrinths
// (sizes 7, 9, 11, V16's test seeds), each on a fresh copy of the trained brain so nothing is learned from the test.
// node laws/labyrinth.mjs <episodes> [winner|stable+many]
import os from "node:os";
import path from "node:path";
import {Brain} from "../devour/brain.mjs";
import {makeMaze, SEEDS, seedOf, RNG} from "../worlds/labyrinth.mjs";
const [E = "1000", arm = "stable+many"] = process.argv.slice(2);
const C = {winner: {}, "stable+many": {margin: .05, window: 400, many: 12}}[arm];
const b = new Brain({rules: {depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, maxWires: 32, fold: false}, c: C}), r = new RNG(5), rand = () => r.next();
for (let i = 0; i < +E; i++) b.playLabyrinth(makeMaze(seedOf(SEEDS.train, i), [7, 9][i % 2]), {teach: true, rand, shape: 0});
const file = path.join(os.tmpdir(), "labyrinth-frozen.v8"); b.save(file); const rows = [];
for (let i = 0; i < 100; i++) rows.push(Brain.load(file).playLabyrinth(makeMaze(seedOf(SEEDS.test, i), [7, 9, 11][i % 3]), {teach: false}));
const av = a => a.reduce((p, v) => p + v, 0) / a.length, ok = rows.filter(x => x.solved);
console.log(JSON.stringify({arm, episodes: +E, solved: av(rows.map(x => x.solved ? 1 : 0)), stepsPerOptimal: av(ok.map(x => x.steps / x.optimal)), shapeAtStart: av(rows.map(x => x.first))}));
