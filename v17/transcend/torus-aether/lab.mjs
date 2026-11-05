// node transcend/torus-aether/lab.mjs <experiment> <corpus-file> [steps]
//   perceive : noise in what A perceives while living (each past byte replaced by a random byte of the stream with
//              probability q) — evaluation is clean. Looks for a stochastic resonance in learning.
//   write    : the trained graph writes freely at temperature T. Measures loops (repeated 8-grams) vs nonsense
//              (5-grams that never occur in the language) — looks for the resonance between order and chaos.
//   ouroboros: the graph also reads its own writing and learns from it, one written byte per lived byte.
//              arms: lived only · own writing at T 0 · own writing at T 0.6 · own writing at T 0.6 anchored (a
//              written byte is learned only if the 5 bytes ending with it really occur in the lived stream; otherwise
//              the dream dissolves and restarts from a lived moment). Measures held-out accuracy and free-writing loops.
//   concepts : each symbol lives in an n-dimensional space and moves only by what it lives through (pulled toward
//              the symbols it follows, pushed away from random ones = noise). Groups are then found with no number of
//              groups given (merge while closer than the space's typical distance). Purity is checked against
//              letter/digit/punctuation classes the graph never saw.
import fs from "node:fs";
import {TextExperiment} from "../epistemic-text/engine.mjs";
import {EmergentChain, argmax} from "./emergent.mjs";
import {corpusFromText} from "./measure.mjs";

const RULES = {depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, fold: false};
const ctxAt = (d, i) => Array.from({length: 4}, (_, j) => d[(i - j - 1 + d.length) % d.length]);
const histAt = (d, i) => Array.from({length: 12}, (_, j) => (i - j - 1 >= 0 ? d[i - j - 1] : 32));
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

function train(corpus, steps, q = 0, seed = 7) {
  const e = new TextExperiment({corpus}), ch = new EmergentChain(RULES), d = e.training, r = rng(seed);
  for (let t = 0; t < steps; t++) {
    const i = (4 + t) % d.length, ctx = ctxAt(d, i), y = d[i];
    let h = histAt(d, i); if (q) h = h.map(x => (r() < q ? d[Math.floor(r() * d.length)] : x));   // noisy perception
    const m = ch.play(e, ctx, h); ch.learn(h, y, m); e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y);
  }
  return {e, ch};
}
function heldout({e, ch}) {
  const H = e.holdout; let n = 0, hit = 0, bits = 0;
  for (let i = 4; i < H.length && n < 2000; i++, n++) { const p = ch.play(e, ctxAt(H, i), histAt(H, i)).out; hit += argmax(p) === H[i]; bits -= Math.log2(p[H[i]]); }
  return {acc: hit / n, bits: bits / n};
}

const [exp, file, stepsArg] = process.argv.slice(2), steps = +(stepsArg || 40000);
const corpus = corpusFromText(fs.readFileSync(file, "utf8")), name = file.split(/[\\/]/).pop();

if (exp === "perceive") {
  for (const q of [0, 0.01, 0.03, 0.06, 0.1, 0.2]) { const r = heldout(train(corpus, steps, q));
    console.log(JSON.stringify({exp, file: name, q, acc: r.acc, bits: r.bits})); }
}

if (exp === "write") {
  const S = train(corpus, steps), all = S.e.training.concat(S.e.holdout), real = new Set();
  for (let i = 0; i + 5 <= all.length; i++) real.add(String.fromCharCode(...all.slice(i, i + 5)));
  for (const T of [0, 0.2, 0.4, 0.6, 0.8, 1, 1.3, 1.7]) {
    const r = rng(11), out = S.e.holdout.slice(0, 12), N = 3000;
    S.ch.rand = r;
    for (let k = 0; k < N; k++) { const i = out.length, p = S.ch.play(S.e, ctxAt(out, i), histAt(out, i)).out; out.push(S.ch.pick(p, T)); }
    const gen = out.slice(12), g8 = new Map(); let rep = 0, realHits = 0, n5 = 0;
    for (let i = 0; i + 8 <= gen.length; i++) { const k = String.fromCharCode(...gen.slice(i, i + 8)); if (g8.has(k)) rep++; g8.set(k, 1); }
    for (let i = 0; i + 5 <= gen.length; i++, n5++) realHits += real.has(String.fromCharCode(...gen.slice(i, i + 5)));
    const loops = rep / (gen.length - 7), realness = realHits / n5;
    console.log(JSON.stringify({exp, file: name, T, loops, realness, alive: realness * (1 - loops),
      sample: String.fromCharCode(...gen.slice(400, 560)).replace(/\n/g, " ")}));
  }
}

if (exp === "concepts") {
  const d = corpus.train.join("\n").split("").map(c => c.charCodeAt(0)), syms = [...new Set(d)];
  const cls = c => c === 32 || c === 10 ? "space" : c >= 48 && c <= 57 ? "digit" : c >= 65 && c <= 90 ? "upper" :
    /[aeiou]/.test(String.fromCharCode(c)) ? "vowel" : c >= 97 && c <= 122 ? "consonant" : "punct";
  for (const D of [2, 3, 5, 10]) for (const noise of [0, 1, 3, 10]) {
    const r = rng(3), U = new Map(), V = new Map(), vec = () => Array.from({length: D}, () => (r() - .5) * .1);
    for (const s of syms) { U.set(s, vec()); V.set(s, vec()); }
    const lr = .05, sig = x => 1 / (1 + Math.exp(-x)), dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
    const step = (u, v, label) => { const g = lr * (label - sig(dot(u, v))); for (let i = 0; i < D; i++) { const ui = u[i]; u[i] += g * v[i]; v[i] += g * ui; } };
    for (let ep = 0; ep < 3; ep++) for (let i = 1; i < d.length; i++) {
      step(U.get(d[i]), V.get(d[i - 1]), 1);                                     // a symbol moves toward what it follows
      for (let k = 0; k < noise; k++) step(U.get(d[i]), V.get(d[Math.floor(r() * d.length)]), 0);   // noise pushes it away
      if (noise === 0) step(U.get(d[i]), V.get(d[i - 1]), 1);
    }
    // groups emerge: merge closest groups while they are closer than the median pairwise distance / 2
    const pts = syms.map(s => U.get(s).map(x => x)), norm = p => Math.hypot(...p) || 1, P = pts.map(p => p.map(x => x / norm(p)));
    const dist = (a, b) => Math.hypot(...a.map((x, i) => x - b[i]));
    const all = []; for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) all.push(dist(P[i], P[j]));
    all.sort((a, b) => a - b); const thr = all[Math.floor(all.length / 2)] / 2;
    let groups = P.map((p, i) => [i]);
    const gd = (A, B) => { let s = 0; for (const a of A) for (const b of B) s += dist(P[a], P[b]); return s / A.length / B.length; };
    for (;;) { let best = null, bd = thr; for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) { const x = gd(groups[a], groups[b]); if (x < bd) { bd = x; best = [a, b]; } }
      if (!best) break; groups[best[0]] = groups[best[0]].concat(groups[best[1]]); groups.splice(best[1], 1); }
    let pure = 0; for (const g of groups) { const c = {}; for (const i of g) c[cls(syms[i])] = (c[cls(syms[i])] || 0) + 1; pure += Math.max(...Object.values(c)); }
    // chance level: same group sizes, symbols shuffled
    const sh = syms.map((_, i) => i).sort(() => r() - .5); let chance = 0;
    for (const g of groups) { const c = {}; for (const i of g) { const k = cls(syms[sh[i]]); c[k] = (c[k] || 0) + 1; } chance += Math.max(...Object.values(c)); }
    const big = groups.filter(g => g.length >= 3).sort((a, b) => b.length - a.length).slice(0, 5)
      .map(g => g.map(i => String.fromCharCode(syms[i])).join("").replace(/\n/g, "⏎").replace(/ /g, "␣"));
    console.log(JSON.stringify({exp, file: name, D, noise, groups: groups.length, purity: pure / syms.length, chance: chance / syms.length, big}));
  }
}

if (exp === "ouroboros") {
  const real = new Set(); { const d = corpus.train.join("\n"); for (let i = 0; i + 5 <= d.length; i++) real.add(d.slice(i, i + 5)); }
  const writeTest = ({e, ch}) => {                                          // free writing at the resonance temperature
    const r = rng(23), out = e.holdout.slice(0, 12), keep = ch.rand; ch.rand = r;
    for (let k = 0; k < 1500; k++) { const i = out.length; out.push(ch.pick(ch.play(e, ctxAt(out, i), histAt(out, i)).out, .6)); }
    ch.rand = keep; const gen = out.slice(12), seen = new Set(); let rep = 0, rl = 0, n5 = 0;
    for (let i = 0; i + 8 <= gen.length; i++) { const k = String.fromCharCode(...gen.slice(i, i + 8)); if (seen.has(k)) rep++; seen.add(k); }
    for (let i = 0; i + 5 <= gen.length; i++, n5++) rl += real.has(String.fromCharCode(...gen.slice(i, i + 5)));
    return {loops: rep / (gen.length - 7), real: rl / n5, sample: String.fromCharCode(...gen.slice(300, 420)).replace(/\n/g, " ")};
  };
  const arms = [{name: "lived only"}, {name: "own writing T0", T: 0}, {name: "own writing T0.6", T: .6}, {name: "anchored T0.6", T: .6, anchor: true},
    {name: "anchored + no self-repeat", T: .6, anchor: true, fresh: true}];
  for (const arm of arms.filter(a => !process.argv[5] || process.argv[5].split(",").includes(a.name))) {
    const e = new TextExperiment({corpus}), ch = new EmergentChain({...RULES, seed: 5}), d = e.training, r = rng(17);
    let dream = null, learnedOwn = 0, dissolved = 0;
    const restart = () => { const i = 12 + Math.floor(r() * (d.length - 13)); dream = d.slice(i - 12, i); };
    for (let t = 0; t < steps; t++) {
      { const i = (4 + t) % d.length, ctx = ctxAt(d, i), y = d[i], h = histAt(d, i);   // one lived byte
        const m = ch.play(e, ctx, h); ch.learn(h, y, m); e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y); }
      if (arm.T === undefined) continue;
      if (!dream || dream.length > 400) restart();                                    // one written byte, read back as input
      const i = dream.length, ctx = ctxAt(dream, i), h = histAt(dream, i), m = ch.play(e, ctx, h);
      const y = ch.pick(m.out, arm.T);
      if (arm.anchor && !real.has(String.fromCharCode(...dream.slice(-4), y))) { dissolved++; restart(); continue; }
      if (arm.fresh && dream.length >= 20) { const tail = String.fromCharCode(...dream.slice(-7), y), body = String.fromCharCode(...dream.slice(0, -7));
        if (body.includes(tail)) { dissolved++; restart(); continue; } }                 // the dream repeats itself: it dissolves
      ch.learn(h, y, m); e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y); dream.push(y); learnedOwn++;
    }
    const S = {e, ch}, ho = heldout(S), w = writeTest(S);
    console.log(JSON.stringify({exp, file: name, arm: arm.name, acc: ho.acc, bits: ho.bits, learnedOwn, dissolved, loops: w.loops, real: w.real, sample: w.sample}));
  }
}
