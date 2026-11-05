// node transcend/torus-aether/measure-entangled.mjs [steps] [text-file ...]
// Entangled A/B + C perspectives flowing through the aether market. Causal proof: LIVE vs MASKED OTHER channel
// with the same frozen parameters on held-out text.
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {TextExperiment} from "../epistemic-text/engine.mjs";
import {distA, distB, distC, Aether, wireDists, wireNames} from "./torus.mjs";
import {EntangledPair, ComplementaryPair, MASK, argmax} from "./entangled.mjs";
import {corpusFromText, repoDocsCorpus} from "./measure.mjs";

// the word being typed: bytes since the last space/newline, up to 12, all already in the stream
export const wordAt = (d, i) => { let w = ""; for (let j = i - 1; j >= 0 && i - j <= 12; j--) { const c = d[j]; if (c === 32 || c === 10) break; w = String.fromCharCode(c) + w; } return w; };
const ctxAt = (d, i) => Array.from({length: 4}, (_, j) => d[(i - j - 1 + d.length) % d.length]);
const names = () => ["A", "B", "A~ent", "B~ent", ...wireNames().slice(2)];
function wiresEnt(e, pair, ctx, I) {
  const W = wireDists(e, ctx);
  return [W[0], W[1], pair.beliefA(e, ctx, I.b), pair.beliefB(e, ctx, I.a), ...W.slice(2)];
}

export function runEntangled({corpus = null, steps = 40000, evalLimit = 2000} = {}) {
  const e = new TextExperiment({corpus}), pair = new EntangledPair();
  const market = new Aether({mode: "crystal", beta: 0.5}), plain = new Aether({mode: "crystal", beta: 0.5});
  const data = e.training;
  for (let t = 0; t < steps; t++) {
    const i = (4 + t) % data.length, ctx = ctxAt(data, i), y = data[i];
    const I = pair.intents(e, ctx);                       // both show their intent; nobody has seen y
    market.learn(wiresEnt(e, pair, ctx, I), ctx, y);      // y revealed from here on
    plain.learn(wireDists(e, ctx), ctx, y);
    pair.learn(ctx, y, I);
    e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y);
  }
  // frozen held-out: same parameters, OTHER channel LIVE vs MASKED
  const H = e.holdout, keys = ["A", "B", "C", "aether (no entanglement)", "A~ent", "B~ent", "aether + entangled"];
  const res = {LIVE: {}, MASKED: {}};
  for (const mode of ["LIVE", "MASKED"]) for (const k of keys) res[mode][k] = {hit: 0, bits: 0};
  let n = 0, rescued = 0, bWrong = 0;
  for (let i = 4; i < H.length && n < evalLimit; i++, n++) {
    const ctx = ctxAt(H, i), y = H[i], I = pair.intents(e, ctx);
    for (const mode of ["LIVE", "MASKED"]) {
      const J = mode === "LIVE" ? I : {a: MASK, b: MASK}, D = wiresEnt(e, pair, ctx, J);
      const P = {A: D[0], B: D[1], C: distC(e.c, ctx), "aether (no entanglement)": plain.predict(wireDists(e, ctx), ctx),
        "A~ent": D[2], "B~ent": D[3], "aether + entangled": market.predict(D, ctx)};
      for (const k of keys) { res[mode][k].hit += argmax(P[k]) === y; res[mode][k].bits += -Math.log2(P[k][y]); }
      if (mode === "LIVE" && I.b !== y) { bWrong++; if (argmax(D[2]) === y) rescued++; }
    }
  }
  const fmt = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {acc: v.hit / n, bits: v.bits / n}]));
  return {samples: n, steps, LIVE: fmt(res.LIVE), MASKED: fmt(res.MASKED), bWrong, rescuedByA: rescued,
    flow: market.top(names(), 6), coupled: pair.stats()};
}

export function runComplementary({corpus = null, steps = 40000, evalLimit = 2000, word = true, seeker = "B"} = {}) {
  const e = new TextExperiment({corpus}), pair = new ComplementaryPair({word, seeker});
  const market = new Aether({mode: "crystal", beta: 0.5}), plain = new Aether({mode: "crystal", beta: 0.5});
  const wires = (ctx, m) => { const W = wireDists(e, ctx); return [W[0], W[1], m.pa, m.pb, ...W.slice(2)]; };
  const data = e.training;
  for (let t = 0; t < steps; t++) {
    const i = (4 + t) % data.length, ctx = ctxAt(data, i), y = data[i];
    const m = pair.play(e, ctx, false, wordAt(data, i));  // B shows, A answers, B re-reads; nobody has seen y
    market.learn(wires(ctx, m), ctx, y);                  // y revealed from here on
    plain.learn(wireDists(e, ctx), ctx, y);
    pair.learn(ctx, y, m);
    e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y);
  }
  const H = e.holdout, keys = ["A", "B", "C", "aether (no entanglement)", "A~ent", "B~ent", "aether + entangled"];
  const res = {LIVE: {}, MASKED: {}};
  for (const mode of ["LIVE", "MASKED"]) for (const k of keys) res[mode][k] = {hit: 0, bits: 0};
  let n = 0, bWrong = 0, rescuedB = 0, rescuedM = 0, aRightWhenBWrong = 0, examples = [];
  const ch = c => c === 32 ? "␣" : c === 10 ? "⏎" : String.fromCharCode(c);
  for (let i = 4; i < H.length && n < evalLimit; i++, n++) {
    const ctx = ctxAt(H, i), y = H[i];
    for (const mode of ["LIVE", "MASKED"]) {
      const m = pair.play(e, ctx, mode === "MASKED", wordAt(H, i)), D = wires(ctx, m);
      const P = {A: D[0], B: D[1], C: distC(e.c, ctx), "aether (no entanglement)": plain.predict(wireDists(e, ctx), ctx),
        "A~ent": m.pa, "B~ent": m.pb, "aether + entangled": market.predict(D, ctx)};
      for (const k of keys) { res[mode][k].hit += argmax(P[k]) === y; res[mode][k].bits += -Math.log2(P[k][y]); }
      if (mode === "LIVE" && m.b !== y) {
        bWrong++; aRightWhenBWrong += m.a === y;
        if (argmax(m.pb) === y) { rescuedB++; if (examples.length < 6 && i > 200)
          examples.push(`"${[...ctx].reverse().map(ch).join("")}" real "${ch(y)}": B showed "${ch(m.b)}", A answered "${ch(m.a)}", B re-read -> "${ch(argmax(m.pb))}"`); }
        rescuedM += argmax(P["aether + entangled"]) === y;
      }
    }
  }
  const fmt = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {acc: v.hit / n, bits: v.bits / n}]));
  return {samples: n, steps, LIVE: fmt(res.LIVE), MASKED: fmt(res.MASKED), bWrong, rescuedByA: aRightWhenBWrong,
    rescuedB, rescuedM, examples, flow: market.top(names(), 6), coupled: pair.stats()};
}

// TRIAD: A explores the rejections of both seekers (B and C), each seeker re-reads A; all of it flows into the
// aether market together with every perspective C generated. LIVE vs MASKED cuts every OTHER channel at once.
export function runTriad({corpus = null, steps = 40000, evalLimit = 2000} = {}) {
  const e = new TextExperiment({corpus}), pB = new ComplementaryPair({seeker: "B"}), pC = new ComplementaryPair({seeker: "C"});
  const market = new Aether({mode: "crystal", beta: 0.5}), plain = new Aether({mode: "crystal", beta: 0.5});
  const wires = (ctx, mb, mc) => { const W = wireDists(e, ctx); return [W[0], W[1], mb.pa, mb.pb, mc.pa, mc.pb, ...W.slice(2)]; };
  const wnames = ["A", "B", "A~B", "B~A", "A~C", "C~A", ...wireNames().slice(2)];
  const data = e.training;
  for (let t = 0; t < steps; t++) {
    const i = (4 + t) % data.length, ctx = ctxAt(data, i), y = data[i], w = wordAt(data, i);
    const mb = pB.play(e, ctx, false, w), mc = pC.play(e, ctx, false, w);   // nobody has seen y
    market.learn(wires(ctx, mb, mc), ctx, y); plain.learn(wireDists(e, ctx), ctx, y);   // y revealed
    pB.learn(ctx, y, mb); pC.learn(ctx, y, mc);
    e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y);
  }
  const H = e.holdout, keys = ["B", "C", "aether (no entanglement)", "B~A", "C~A", "aether + triad"];
  const res = {LIVE: {}, MASKED: {}}; for (const m of ["LIVE", "MASKED"]) for (const k of keys) res[m][k] = {hit: 0, bits: 0};
  let n = 0, cWrong = 0, cFixed = 0, mFixed = 0, mBroke = 0;
  for (let i = 4; i < H.length && n < evalLimit; i++, n++) {
    const ctx = ctxAt(H, i), y = H[i], w = wordAt(H, i);
    for (const mode of ["LIVE", "MASKED"]) {
      const masked = mode === "MASKED", mb = pB.play(e, ctx, masked, w), mc = pC.play(e, ctx, masked, w);
      const P = {B: distB(e.b, ctx), C: distC(e.c, ctx), "aether (no entanglement)": plain.predict(wireDists(e, ctx), ctx),
        "B~A": mb.pb, "C~A": mc.pb, "aether + triad": market.predict(wires(ctx, mb, mc), ctx)};
      for (const k of keys) { res[mode][k].hit += argmax(P[k]) === y; res[mode][k].bits += -Math.log2(P[k][y]); }
      if (!masked) { const c = e.c.predict(ctx), mk = argmax(P["aether + triad"]) === y;
        if (c !== y) { cWrong++; cFixed += argmax(mc.pb) === y; mFixed += mk; } else mBroke += !mk; }
    }
  }
  const fmt = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, {acc: v.hit / n, bits: v.bits / n}]));
  return {samples: n, steps, LIVE: fmt(res.LIVE), MASKED: fmt(res.MASKED), cWrong, cFixed, mFixed, mBroke,
    flow: market.top(wnames, 7)};
}

const show = (name, r) => {
  console.log(`\n== ${name}  steps=${r.steps} heldout=${r.samples}`);
  console.log("".padEnd(26) + "LIVE".padStart(18) + "MASKED".padStart(20));
  for (const k of Object.keys(r.LIVE)) {
    const L = r.LIVE[k], M = r.MASKED[k], f = v => `${(100 * v.acc).toFixed(1).padStart(5)}% ${v.bits.toFixed(2)}b`;
    console.log(k.padEnd(26) + f(L).padStart(18) + f(M).padStart(20));
  }
  if (r.cWrong !== undefined) console.log(`C alone was wrong ${r.cWrong} times; C after reading A fixed ${r.cFixed}; ` +
    `the triad market fixed ${r.mFixed} and broke ${r.mBroke} that C had right (net ${r.mFixed - r.mBroke >= 0 ? "+" : ""}${r.mFixed - r.mBroke})`);
  else console.log(`B's visible intent was wrong ${r.bWrong} times; A's shown byte was the right one ${r.rescuedByA} of those` +
    (r.rescuedB !== undefined ? `; B after reading A: ${r.rescuedB}; market: ${r.rescuedM}` : ""));
  for (const x of r.examples || []) console.log("   " + x);
  console.log(`aether flow: ${r.flow}`);
};
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), flag = args.find(a => a.startsWith("--")) || "--triad", rest = args.filter(a => !a.startsWith("--"));
  const steps = +(rest[0] || 40000), files = rest.slice(1);
  const go = {"--mirror": runEntangled, "--pair": runComplementary, "--triad": runTriad}[flag];
  const tag = " [" + flag.slice(2) + "]";
  if (!files.length) show("real prose (repo docs)" + tag, go({corpus: repoDocsCorpus(), steps}));
  else for (const f of files) show(f + tag, go({corpus: corpusFromText(fs.readFileSync(f, "utf8")), steps}));
}
