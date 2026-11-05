// The GPU worlds (gpu/worlds_gpu.py) must be the same worlds and make the same decisions as the JavaScript ones.
// Runs the Python process on its numpy backend (no card needed); on the card the same code runs on PyTorch.
import test from "node:test";
import assert from "node:assert/strict";
import {GpuWorlds} from "../transcend/torus-aether/gpu/client.mjs";
import {makeMaze, SEEDS, seedOf, RNG} from "../transcend/torus-aether/worlds/labyrinth.mjs";
import {Discoverer, playExercise} from "../transcend/torus-aether/worlds/exercise.mjs";
import {makeLevel, TWorld, TSEEDS} from "../transcend/torus-aether/worlds/transform.mjs";
import {Brain} from "../transcend/torus-aether/devour/brain.mjs";

test("GPU worlds = JavaScript worlds: same labyrinths, same decisions, same physics; batches consolidated into one brain", async () => {
  const g = new GpuWorlds({device: "numpy"}); await g.ready;
  try {
    const items = []; for (let i = 0; i < 60; i++) items.push([seedOf(SEEDS.train, i), [7, 9, 11][i % 3]]);
    const pm = (await g.call({cmd: "maze_check", items})).mazes;
    items.forEach(([s, n], k) => { const j = makeMaze(s, n); assert.equal(Array.from(j.wall).join() + j.start + "|" + j.goal, pm[k].wall.join() + pm[k].start + "|" + pm[k].goal); });
    const D = new Discoverer(3); for (let i = 0; i < 30; i++) playExercise(makeMaze(seedOf(SEEDS.train, i), [7, 9][i % 2]), D);
    const b = new Brain({rules: {depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, maxWires: 32, fold: false}}); b.disc = D;
    const worlds = []; for (let i = 0; i < 30; i++) worlds.push({seed: seedOf(SEEDS.test, i), n: [7, 9, 11][i % 3]});
    const r = await g.call({cmd: "exercise", worlds, knows: b.knowsForGpu(), seed: 5});
    worlds.forEach((w, k) => { const c = Object.assign(Object.create(Discoverer.prototype), structuredClone(D)); c.r = Object.assign(Object.create(RNG.prototype), c.r);
      const outs = [], orig = c.choose.bind(c); c.choose = (...a) => { const x = orig(...a); outs.push(x.o); return x; }; playExercise(makeMaze(w.seed, w.n), c);
      assert.equal(outs.join(), r.worlds[k].outputs.join(), "labyrinth " + k); });
    const moves = [3, 6, 1, 4], levels = []; for (let i = 0; levels.length < 20; i++) { const L = makeLevel(TSEEDS.train + i * 7919, {goals: [["object"], ["self"], ["door"]][i % 3]}); if (L) levels.push(L); }
    await g.call({cmd: "t_reset", levels: levels.map(L => ({n: L.n, terr: L.terr, self: L.self, boxes: L.boxes})), moves});
    const js = levels.map(L => new TWorld(L, moves)), rr = new RNG(9);
    for (let t = 0; t < 60; t++) { const outs = levels.map(() => rr.int(8)); js.forEach((w, k) => w.step(outs[k])); const bs = (await g.call({cmd: "t_step", outputs: outs})).boards; js.forEach((w, k) => assert.equal(w.board().join(), bs[k].join())); }
    const B2 = new Brain({rules: {depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, maxWires: 32, fold: false}});
    const s = await B2.playMazesGPU(g, 48); assert.equal(s.differ, 0, "every GPU world lived again identically by the brain"); assert.equal(B2.mazes.played, 48);
  } finally { g.close(); }
});
