// Baseline: the current V17 brain (stable+many) lives the same curriculum and is tested frozen on the same unseen exercises
import fs from "node:fs";
import {Brain} from "../devour/brain.mjs";
import {argmax} from "../emergent.mjs";
const asc = s => { const o = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; o.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return o; };
const load = f => fs.readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l)).map(x => asc("Q: " + x.question + "\nA: " + x.answer + "\n\n"));
const D = (process.env.GSM || "gsm/grade_school_math/data"), train = load(D + "/train.jsonl").sort((a, b) => a.length - b.length), testAll = load(D + "/test.jsonl").sort((a, b) => a.length - b.length);
const NT = +(process.env.NT || 240), test = Array.from({length: NT}, (_, i) => testAll[Math.floor(i * testAll.length / NT)]);
const answerStart = ex => { for (let i = 0; i < ex.length - 2; i++) if (ex[i] === 10 && ex[i + 1] === 65 && ex[i + 2] === 58) return i + 3; return 0; };
const buckets = [0, 300, 450, 650, 900, 2000], sizes = (process.env.SIZES || "500,1000,2000,4000,7473").split(",").map(Number);
const b = new Brain({rules: "winner", c: {margin: .05, window: 400, many: 12}, seed: 11}); let done = 0; const t0 = performance.now();
for (const N of sizes) {
  for (; done < N; done++) for (const y of train[done]) { b.live(y); b.chars++; }
  const per = buckets.slice(1).map(() => ({ok: 0, n: 0, aok: 0, an: 0}));
  for (const ex of test) { const p = per[buckets.findIndex((v, j) => ex.length < buckets[j + 1])], a0 = answerStart(ex);
    for (let i = 1; i < ex.length; i++) { const L = b.chain.play(b.e, b.ctxOf(ex, i), b.histOf(ex, i)).out, ok = argmax(L) === ex[i]; p.ok += ok; p.n++; if (i >= a0) { p.aok += ok; p.an++; } } }
  const all = per.reduce((s, x) => ({ok: s.ok + x.ok, n: s.n + x.n, aok: s.aok + x.aok, an: s.an + x.an}), {ok: 0, n: 0, aok: 0, an: 0});
  console.log(JSON.stringify({exercises: N, chars: b.chars, sec: +((performance.now() - t0) / 1000).toFixed(0), brain: {all: all.ok / all.n, answer: all.aok / all.an, byLen: per.map(x => +(x.aok / Math.max(1, x.an)).toFixed(4))}}));
}
