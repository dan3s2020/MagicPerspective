// Validates the devouring mind exactly as devour/worker.mjs lives it (one pass, everything learned online: the graph,
// C, the geometry, the field rebuilt as the places move), on one world: learn on the first 85%, test on the rest.
// node mind.mjs <text> <arm: winner|stable|grow|stable+grow>
import fs from "node:fs";
import {LeanC} from "../lean-c.mjs";
import {distC} from "../torus.mjs";
import {EmergentChain, argmax} from "../emergent.mjs";
import {GraphTrace} from "../devour/trace.mjs";
import {LivedField} from "../fractal.mjs";
const [file, arm = "winner"] = process.argv.slice(2);
const CL = {winner: {}, stable: {margin: .05, window: 400}, grow: {cap: 6}, "stable+grow": {cap: 6, margin: .05, window: 400}, many: {many: 12}, "stable+many": {margin: .05, window: 400, many: 12}}[arm];
const A = Array.from(fs.readFileSync(file, "utf8"), c => { const x = c.charCodeAt(0); return x === 13 ? 32 : x === 9 || x === 10 || (x >= 32 && x < 127) ? x : 63; });
const n0 = Math.floor(A.length * .85), H = A.slice(n0);
const e = {c: new LeanC(CL)}, chain = new EmergentChain({depth: 1, off: ["R2", "R4"], budEvery: 100, empty: true, maxWires: 32, fold: false, seed: 11}), trace = new GraphTrace(), field = new LivedField();
const place = y => trace.geo.U.get(y) || [.5, .5, .5, .5, .5], CTX = e.c.cap;
const ctxOf = (b, i) => Array.from({length: CTX}, (_, j) => (i - j - 1 >= 0 ? b[i - j - 1] : 32)), histOf = (b, i) => Array.from({length: 32}, (_, j) => (i - j - 1 >= 0 ? b[i - j - 1] : 32));
for (let i = 0; i < n0; i++) { const ctx = ctxOf(A, i), h = histOf(A, i), y = A[i], m = chain.play(e, ctx, h);
  chain.learn(h, y, m); e.c.observe(ctx, y); trace.record(e, chain, ctx, h, y, m, "c:" + e.c.active, false); field.live(y, place); }
let c = 0, g = 0, f = 0, t = 0, N = 0; const F = field.read(H, place);
for (let i = 4; i < H.length; i++, N++) { const ctx = ctxOf(H, i), h = histOf(H, i), y = H[i], L = chain.play(e, ctx, h).out, p = F[i];
  c += argmax(distC(e.c, ctx)) === y; g += argmax(L) === y; f += p ? argmax(p) === y : 0; t += argmax(p ? L.map((v, j) => .5 * v + .5 * p[j]) : L) === y; }
const r = v => +(v / N).toFixed(4);
console.log(JSON.stringify({file: file.split("/").pop(), arm, graph: r(g), field: r(f), together: r(t), C: r(c), cActive: e.c.active, cLag: e.c.maxLag, cFlips: e.c.promotions}));
