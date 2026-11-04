// node bench.mjs [episodes] [seed]  — A and B in the fabric vs the same fabric without bodies, same mazes, held-out test mazes
import {Organism, makeMaze, evaluate, seedOf, SEEDS, RNG} from './web/engine.mjs';
import {writeFileSync, mkdirSync} from 'node:fs';
const E = Number(process.argv[2] || 3000), seed = Number(process.argv[3] || 7), t0 = Date.now();
const ab = new Organism({seed, bodies: true}), ct = new Organism({seed, bodies: false});
const ra = new RNG(seed), rc = new RNG(seed), curve = [];
for (let i = 0; i < E; i++) { const sz = [7, 9][i % 2];
  ab.live(makeMaze(seedOf(SEEDS.train + seed, i), sz), {learn: true, rng: ra}); ct.live(makeMaze(seedOf(SEEDS.train + seed, i), sz), {learn: true, rng: rc});
  if ((i + 1) % Math.max(1, E / 6) === 0) { const a = evaluate(ab, {count: 30}), c = evaluate(ct, {count: 30}); curve.push({ep: i + 1, ab: a, ctrl: c});
    console.log(`${i + 1} ep · A+B: rezolvate ${(100 * a.solved).toFixed(0)}% pași/optim ${a.ratio?.toFixed(2)} plan0 ${a.plan0.toFixed(2)} | martor: ${(100 * c.solved).toFixed(0)}% ${c.ratio?.toFixed(2)} plan0 ${c.plan0.toFixed(2)} · ${((Date.now() - t0) / 1000).toFixed(0)} s`); } }
const fa = evaluate(ab, {count: 100, sizes: [7, 9, 11]}), fc = evaluate(ct, {count: 100, sizes: [7, 9, 11]});
console.log('FINAL (100 labirinturi nevăzute 7/9/11) A+B', JSON.stringify(fa), '\n                                       martor', JSON.stringify(fc));
mkdirSync('results', {recursive: true}); writeFileSync(`results/bench-${E}-s${seed}.json`, JSON.stringify({E, seed, curve, final: {ab: fa, ctrl: fc}}, null, 1));
