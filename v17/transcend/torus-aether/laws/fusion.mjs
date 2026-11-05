// Fusion: should every context be its own node, or should contexts that lead to the same future be ONE node?
// (causal states, Crutchfield & Young; CSSR, Shalizi & Klinkner) — node laws/fusion.mjs <text> [maxL] [threshold]
// Contexts are added from short to long. A longer context is fused into the node of its shorter parent when what
// follows it is not distinguishably different; otherwise into any existing node whose future it matches; only if
// it matches none does a new node appear. A node pools the counts of everything fused into it, so a context seen
// once borrows what its node has lived elsewhere (generalization). Compared on unseen text with the plain way
// (deepest context seen at least twice decides, every context its own node).
import fs from "node:fs";
const [file, LS = "6", THS = "3"] = process.argv.slice(2), MAXL = +LS, TH = +THS;
const A = Array.from(fs.readFileSync(file, "utf8"), c => { const x = c.charCodeAt(0); return x === 13 ? 32 : x < 127 ? x : 63; });
const n0 = Math.floor(A.length * .85), T = A.slice(0, n0), H = A.slice(n0);
const S = String.fromCharCode(...T), cnt = new Map();                      // context → Map(next → count)
for (let L = 0; L <= MAXL; L++) for (let i = L; i < S.length; i++) { const k = S.slice(i - L, i); let m = cnt.get(k); if (!m) cnt.set(k, m = new Map()); m.set(T[i], (m.get(T[i]) || 0) + 1); }
const tot = m => { let s = 0; for (const v of m.values()) s += v; return s; };
// are two futures distinguishable? (G-test style: 2·Σ obs·ln(obs/exp) against a threshold that grows with support)
function gstat(a, b) { const na = tot(a), nb = tot(b); if (!na || !nb) return [0, 1]; let g = 0; const keys = new Set([...a.keys(), ...b.keys()]);
  for (const y of keys) { const x = a.get(y) || 0, z = b.get(y) || 0, p = (x + z) / (na + nb); if (x) g += x * Math.log(x / (p * na)); if (z) g += z * Math.log(z / (p * nb)); }
  return [2 * g, TH * Math.max(1, keys.size - 1)]; }
const differ = (a, b) => { const [g, t] = gstat(a, b); return g > t; };
// build the nodes
const state = new Map(), nodes = [];                                       // context → node index; node = pooled counts
const pool = (ni, m) => { const P = nodes[ni]; for (const [y, v] of m) P.set(y, (P.get(y) || 0) + v); };
for (let L = 0; L <= MAXL; L++) for (const [k, m] of cnt) { if (k.length !== L) continue;
  if (!L) { nodes.push(new Map(m)); state.set(k, 0); continue; }
  const parent = state.get(k.slice(1)); if (parent === undefined) continue;
  if (!differ(m, cnt.get(k.slice(1)))) { state.set(k, parent); continue; }   // the same future as its parent: the same node
  let best = -1, bg = Infinity; for (let i = 0; i < nodes.length; i++) { const [g, t] = gstat(m, nodes[i]); if (g <= t && g / t < bg) { bg = g / t; best = i; } }   // the nearest node it cannot be told apart from
  if (best >= 0) { state.set(k, best); pool(best, m); } else { nodes.push(new Map(m)); state.set(k, nodes.length - 1); } }
const argmaxM = m => { let b = 32, bv = -1; for (const [y, v] of m) if (v > bv) { bv = v; b = y; } return b; };
let plain = 0, fused = 0, hybrid = 0, N = 0;
for (let i = MAXL; i < H.length; i++, N++) {
  const ctx = L => String.fromCharCode(...H.slice(i - L, i));
  let p = null; for (let L = MAXL; L >= 0; L--) { const m = cnt.get(ctx(L)); if (m && tot(m) >= 2) { p = m; break; } } plain += argmaxM(p || cnt.get("")) === H[i];
  let q = null; for (let L = MAXL; L >= 0; L--) { const s = state.get(ctx(L)); if (s !== undefined) { q = nodes[s]; break; } } fused += argmaxM(q) === H[i];
  // where the context was lived enough, its own counts; where it is rare, the node it was fused into
  let r = null; for (let L = MAXL; L >= 0; L--) { const m = cnt.get(ctx(L)); if (!m) continue; r = tot(m) >= 2 && (state.get(ctx(L)) === undefined || tot(m) >= 5) ? m : nodes[state.get(ctx(L))] || m; break; } hybrid += argmaxM(r) === H[i];
}
const contexts = [...state.keys()].length;
console.log(JSON.stringify({file: file.split("/").pop(), maxL: MAXL, threshold: TH, plain: +(plain / N).toFixed(4), fused: +(fused / N).toFixed(4), hybrid: +(hybrid / N).toFixed(4), contextNodes: cnt.size, fusedNodes: nodes.length, contextsPlaced: contexts}));
