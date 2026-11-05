// node transcend/torus-aether/measure-emergent.mjs [steps] [text-file ...]
// C alone vs C <-> A with hand-given word perception vs the emergent chain (6 rules) of depth 1..3.
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {TextExperiment} from "../epistemic-text/engine.mjs";
import {distC} from "./torus.mjs";
import {ComplementaryPair} from "./entangled.mjs";
import {EmergentChain, argmax} from "./emergent.mjs";
import {corpusFromText, repoDocsCorpus} from "./measure.mjs";
import {wordAt} from "./measure-entangled.mjs";

const ctxAt = (d, i) => Array.from({length: 4}, (_, j) => d[(i - j - 1 + d.length) % d.length]);
const histAt = (d, i) => Array.from({length: 32}, (_, j) => (i - j - 1 >= 0 ? d[i - j - 1] : 32));   // exact wires use at most 12

export function runEmergent({corpus = null, steps = 40000, evalLimit = 2000, depths = [1, 2, 3], configs = null} = {}) {
  const e = new TextExperiment({corpus}), word = new ComplementaryPair({seeker: "C"});
  const chains = configs ? Object.fromEntries(Object.entries(configs).map(([k, o]) => [k, new EmergentChain(o)]))
    : Object.fromEntries(depths.map(d => ["chain" + d, new EmergentChain({depth: d})]));
  const data = e.training;
  for (let t = 0; t < steps; t++) {
    const i = (4 + t) % data.length, ctx = ctxAt(data, i), y = data[i], h = histAt(data, i);
    const mw = word.play(e, ctx, false, wordAt(data, i));
    const mc = Object.fromEntries(Object.entries(chains).map(([k, ch]) => [k, ch.play(e, ctx, h, false, {temp: ch.temp})]));
    word.learn(ctx, y, mw); for (const [k, ch] of Object.entries(chains)) ch.learn(h, y, mc[k]);   // y revealed
    e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y);
  }
  const H = e.holdout, keys = ["C", "C~A (word given)", ...Object.keys(chains)];
  const res = {LIVE: {}, MASKED: {}}; for (const m in res) for (const k of keys) res[m][k] = {hit: 0, bits: 0};
  let n = 0;
  for (let i = 4; i < H.length && n < evalLimit; i++, n++) {
    const ctx = ctxAt(H, i), y = H[i], h = histAt(H, i);
    for (const mode of ["LIVE", "MASKED"]) {
      const masked = mode === "MASKED", P = {C: distC(e.c, ctx), "C~A (word given)": word.play(e, ctx, masked, wordAt(H, i)).pb};
      for (const [k, ch] of Object.entries(chains)) P[k] = ch.play(e, ctx, h, masked).out;
      for (const k of keys) { res[mode][k].hit += argmax(P[k]) === y; res[mode][k].bits += -Math.log2(P[k][y]); }
    }
  }
  const fmt = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {acc: v.hit / n, bits: v.bits / n}]));
  return {samples: n, steps, LIVE: fmt(res.LIVE), MASKED: fmt(res.MASKED),
    forms: Object.fromEntries(Object.entries(chains).map(([k, ch]) => [k, ch.form()]))};
}

export const show = (name, r) => {
  console.log(`\n== ${name}  steps=${r.steps} heldout=${r.samples}`);
  console.log("".padEnd(20) + "LIVE".padStart(16) + "MASKED".padStart(18));
  for (const k of Object.keys(r.LIVE)) { const f = v => `${(100 * v.acc).toFixed(1).padStart(5)}% ${v.bits.toFixed(2)}b`;
    console.log(k.padEnd(20) + f(r.LIVE[k]).padStart(16) + f(r.MASKED[k]).padStart(18)); }
  for (const [k, f] of Object.entries(r.forms)) for (const line of f) console.log(`   ${k} ${line}`);
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const steps = +(process.argv[2] || 40000), files = process.argv.slice(3);
  if (!files.length) show("real prose (repo docs)", runEmergent({corpus: repoDocsCorpus(), steps}));
  else for (const f of files) show(f, runEmergent({corpus: corpusFromText(fs.readFileSync(f, "utf8")), steps}));
}
