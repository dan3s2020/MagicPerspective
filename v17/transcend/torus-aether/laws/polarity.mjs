// Do concepts attract or repel? node polarity.mjs <text>
// In SPACE: are the condensed concepts farther apart than random groups of the same sizes would be (repulsion)?
// In TIME: after a concept is lived, does the same concept come next more often than its share (attraction) or less
// (repulsion — a concept calls its opposite, like N and S)? Which concept pairs call each other most?
import fs from "node:fs";
import {Geometry} from "../concepts.mjs";
const T = Array.from(fs.readFileSync(process.argv[2], "utf8"), c => { const x = c.charCodeAt(0); return x === 13 ? 32 : x < 127 ? x : 63; });
const geo = new Geometry({D: 5, every: 1e9}); for (let ep = 0; ep < 3; ep++) for (let i = 1; i < T.length; i++) geo.learn(T[i - 1], T[i]);
geo.regroup();
const con = s => geo.concept(s), wrapD = x => x - Math.round(x);
const groups = new Map(); for (const s of geo.U.keys()) { const c = con(s); if (c == null) continue; (groups.get(c) || groups.set(c, []).get(c)).push(s); }
const G = [...groups.values()].filter(g => g.length >= 2);
const centroid = g => [0, 1, 2, 3, 4].map(i => { let x = 0, y = 0; for (const s of g) { x += Math.cos(2 * Math.PI * geo.U.get(s)[i]); y += Math.sin(2 * Math.PI * geo.U.get(s)[i]); } return Math.atan2(y, x) / (2 * Math.PI); });
const meanSep = gs => { const cs = gs.map(centroid); let t = 0, n = 0; for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) { t += Math.sqrt(cs[a].reduce((s, v, i) => s + wrapD(v - cs[b][i]) ** 2, 0)); n++; } return t / n; };
let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
const flat = G.flat(), real = meanSep(G); let rand = 0; for (let k = 0; k < 50; k++) { const sh = [...flat].sort(() => rnd() - .5); let j = 0; rand += meanSep(G.map(g => g.map(() => sh[j++]))) / 50; }
// time
const ci = new Map(); G.forEach((g, k) => g.forEach(s => ci.set(s, k)));
const cnt = new Array(G.length).fill(0), M = G.map(() => new Array(G.length).fill(0)); let n = 0;
for (let i = 1; i < T.length; i++) { const a = ci.get(T[i - 1]), b = ci.get(T[i]); if (a === undefined || b === undefined) continue; M[a][b]++; cnt[a]++; n++; }
const share = G.map((_, b) => M.reduce((s, row) => s + row[b], 0) / n);
const self = G.map((g, k) => ({c: g.map(s => String.fromCharCode(s)).join("").replace(/\n/g, "⏎").slice(0, 14), share: +share[k].toFixed(3), sameNext: cnt[k] ? +(M[k][k] / cnt[k]).toFixed(3) : 0, lift: cnt[k] ? +((M[k][k] / cnt[k]) / share[k]).toFixed(2) : 0}));
const pairs = []; for (let a = 0; a < G.length; a++) for (let b = 0; b < G.length; b++) if (a !== b && cnt[a] > 200) pairs.push({from: self[a].c, to: self[b].c, lift: +((M[a][b] / cnt[a]) / share[b]).toFixed(2)});
pairs.sort((x, y) => y.lift - x.lift);
console.log(JSON.stringify({file: process.argv[2].split("/").pop(), concepts: G.length, spaceSeparation: +real.toFixed(3), randomGroups: +rand.toFixed(3), self, strongestCalls: pairs.slice(0, 6)}));
