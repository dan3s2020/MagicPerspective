// node bench.mjs [sigma] [eta] [lambda]   — measures every organism on the held-out last 15% of the stream (prequential)
import {CORPUS} from './web/corpus.js';
import {prepare, Loop, bestFrozen, ORGS} from './web/engine.mjs';
const rotate = Number(process.argv[2] || 0), mode = process.argv[3] || 'grad'; const sigma = 1, eta = mode === 'pull' ? .4 : .05, lambda = .12, gamma = .5, beta = 3;
const d = prepare(CORPUS, rotate), t0 = Date.now();
const fz = bestFrozen(d, {mode, sigma, eta, lambda, gamma, beta});
const L = new Loop(d, {mode, sigma, eta, lambda, gamma, beta, frozenTheta: fz.theta});
while (L.step());
const s = L.summary();
import {writeFileSync, mkdirSync} from 'node:fs'; mkdirSync('results', {recursive: true}); writeFileSync(`results/bench-${mode}-rotate${rotate}.json`, JSON.stringify({mode, rotate, sigma, eta, lambda, gamma, frozenTheta: fz.theta, wraps: L.wraps, summary: s}, null, 1));
console.log(`mode ${mode} · chars ${d.text.length} vocab ${d.vocab.length} test from ${d.cut} · frozen θ=${fz.theta} · wraps α↔Ω ${L.wraps} · ${Date.now() - t0} ms`);
for (const k of ORGS) console.log(k.padEnd(9), 'test bits/char', s[k].test_bpc.toFixed(4), ' acc', (100 * s[k].test_acc).toFixed(2) + '%', '| train', s[k].train_bpc.toFixed(4));
