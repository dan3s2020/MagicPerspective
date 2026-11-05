import fs from "node:fs";
import {AligningGraph} from "../align.mjs";
const asc = s => { const o = []; for (const ch of s) { const c = ch.charCodeAt(0); if (c === 13) continue; o.push(c === 9 || c === 10 || (c >= 32 && c < 127) ? c : 63); } return o; };
const D = (process.env.GSM || "gsm/grade_school_math/data");
const load = f => fs.readFileSync(f, "utf8").trim().split("\n").map(l => JSON.parse(l)).map(x => asc("Q: " + x.question + "\nA: " + x.answer + "\n\n"));
const train = load(D + "/train.jsonl").sort((a, b) => a.length - b.length), testAll = load(D + "/test.jsonl").sort((a, b) => a.length - b.length);
const NT = +(process.env.NT || 240), test = Array.from({length: NT}, (_, i) => testAll[Math.floor(i * testAll.length / NT)]);
const aS = ex => { for (let i = 0; i < ex.length - 2; i++) if (ex[i] === 10 && ex[i + 1] === 65 && ex[i + 2] === 58) return i + 3; return 0; };
const g = new AligningGraph(); let done = 0; const t0 = performance.now();
for (const N of (process.env.SIZES || "1000").split(",").map(Number)) {
  for (; done < N; done++) { g.begin(); for (const y of train[done]) g.live(y); }
  const live = g.accuracy(); let ok = 0, n = 0;
  for (const ex of test) { const a0 = aS(ex); g.readFrozen(ex, (i, y, gg) => { if (i >= a0) { ok += y === gg; n++; } }); }
  console.log(JSON.stringify({exercises: N, lived: g.lived, liveAcc: +live.toFixed(4), unseenAnswer: +(ok / n).toFixed(4), sec: +((performance.now() - t0) / 1000).toFixed(0), heapMB: (process.memoryUsage().heapUsed / 1e6) | 0}));
}
