// Living graph — starts EMPTY. No target, no action, no world node and no edge is given.
// Every node is born from experience: a symbol the first time the stream shows it, a perception of A when A buds it,
// a perspective of C when C first acts through it. Every edge is born from something that happened and fades if it
// stops happening. The brain is the discovered arrangement (search-rules.mjs), trained live in this page.
//
// Geometry is not drawn, it is lived: every symbol has a position on a D-dimensional torus (every axis a circle) that
// moves only by what it lives through (pulled toward what it follows, pushed away from random symbols = polarity noise).
// Perceptions and perspectives sit where what they perceive lives. Concepts are regions where symbols condense.
// The screen is a cut-and-project of the infinite periodic space (view5.mjs): pan forever on any of the 5 axes,
// zoom out forever; zoom in until the section can no longer stay full and you enter the node at the centre — inside
// is the world of what followed it in the lived stream, again an infinite torus, one character deeper each time.
import {TextExperiment} from "../../epistemic-text/engine.mjs";
import {distC} from "../torus.mjs";
import {EmergentChain, argmax} from "../emergent.mjs";
import {PLANES, rotation, applyT, prepare, images, plan, wrap1, wrapD} from "./view5.mjs";
import {NestView, PLANES6, rotation6} from "./nestview.mjs";
import {chooseVisibleGraph} from "./live-follow.mjs";
const mazeLabel = c => { const i = [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15].indexOf(c); return i < 0 ? null : i < 4 ? "◆" + "αβγδ"[i] : "▶" + (i - 4); };   // the exercise's raw symbols: no meaning given

const ctxAt = (d, i) => Array.from({length: 4}, (_, j) => d[(i - j - 1 + d.length) % d.length]);
const histAt = (d, i) => Array.from({length: 12}, (_, j) => (i - j - 1 >= 0 ? d[i - j - 1] : 32));
const ch = c => c === 32 ? "␣" : c === 10 ? "⏎" : c < 32 || c === 127 ? mazeLabel(c) || "·" : String.fromCharCode(c);
const $ = id => document.getElementById(id);
const val = id => +$(id).value;
const cLabel = id => { const [k, m] = id.split(":"); let pos = ""; for (let i = 0; i < 4; i++) if (+m & (1 << i)) pos += i + 1; return "C·" + k[0].replace("c", "k") + pos; };
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

let corpus, e, chain, data, t = 0, running = false, nodes, edges, recent, strip, D, geo, rand, groups = [], real5;
const COL = {sym: "#7cc9ff", C: "#f5b301", A: "#ff4d6d", self: "#ffffff", world: "rgba(124,201,255,.18)", see: "rgba(245,179,1,.5)",
  feel: "rgba(255,77,109,.5)", bud: "rgba(255,255,255,.5)", trust: "rgba(61,220,132,.8)",
  align: "rgba(61,220,132,.3)", miss: "rgba(255,77,109,.35)", is: "rgba(255,255,255,.9)", moves: "rgba(245,179,1,.9)", attract: "rgba(61,220,132,.95)", repel: "rgba(255,77,109,.95)"};

// ---------- life ----------
function reset() {
  D = val("dims"); rand = rng(7);
  e = new TextExperiment({corpus}); data = e.training; t = 0;
  chain = new EmergentChain({depth: 1, off: ["R2", "R4"], budEvery: val("bud"), maxWires: val("wires"), empty: true, fold: false, seed: 3});
  nodes = new Map(); edges = new Map(); recent = {C: [], F: []}; strip = []; groups = [];
  geo = {U: new Map(), V: new Map(), B: new Map()}; if (typeof occ !== "undefined") occ.clear(); if (typeof view !== "undefined") { view.path = ""; view.zlog = 0; view.dirty = true; }
  $("evalOut").textContent = "—"; $("writeOut").textContent = "—"; $("groups").textContent = "încă niciun concept";
  $("dimsNow").textContent = D; stats();
}
const vec = () => Array.from({length: D}, () => rand());                    // a point anywhere on the torus
function node(id, type, label) { let n = nodes.get(id); if (!n) { n = {id, type, label, act: 1, born: performance.now(), bt: t, jit: vec()}; nodes.set(id, n); } return n; }
function edge(a, b, kind, dw = 1) { const k = a + ">" + b; let x = edges.get(k); if (!x) { x = {a, b, kind, w: 0}; edges.set(k, x); } x.w += dw; x.hot = 1; }
const fire = id => { const n = nodes.get(id); if (n) n.act = 1; };

function geoLearn(x, y) {                                                   // polarity on the torus
  // pulled toward what it follows, pushed from random contexts (noise), each symbol carries its own frequency bias
  // (so no axis is spent on "how common am I"), and positions repel each other a little (nothing stacks on one point)
  const lr = val("glr"), neg = val("gnoise"), sig = z => 1 / (1 + Math.exp(-z)), TAU = 2 * Math.PI;
  for (const s of [x, y]) if (!geo.U.has(s)) { geo.U.set(s, vec()); geo.V.set(s, vec()); geo.B.set(s, 0); }
  const upd = (u, v, label) => { let sc = 0; for (let i = 0; i < D; i++) sc += Math.cos(TAU * (u[i] - v[i])); const gr = lr * (label - sig(sc + geo.B.get(y)));
    geo.B.set(y, geo.B.get(y) + gr); for (let i = 0; i < D; i++) { const sn = Math.sin(TAU * (u[i] - v[i])); u[i] = wrap1(u[i] - gr * sn); v[i] = wrap1(v[i] + gr * sn); } };
  const U = geo.U.get(y); upd(U, geo.V.get(x), 1);
  for (let k = 0; k < neg; k++) { const z = data[Math.floor(rand() * data.length)]; if (geo.V.has(z)) upd(U, geo.V.get(z), 0); }
  const z = data[Math.floor(rand() * data.length)], uz = geo.U.get(z);
  if (uz && z !== y) for (let i = 0; i < D; i++) { const f = lr * val("repel") * Math.sin(TAU * wrapD(U[i] - uz[i])) / TAU; U[i] = wrap1(U[i] + f); uz[i] = wrap1(uz[i] - f); }
}

function step(show) {
  const i = (4 + t) % data.length, ctx = ctxAt(data, i), y = data[i];
  let h = histAt(data, i); const q = val("pnoise"); if (q) h = h.map(x => (rand() < q ? data[Math.floor(rand() * data.length)] : x));
  const m = chain.play(e, ctx, h, false, {temp: val("ltemp")});           // decided before the byte is seen
  const cByte = m.seq[0].byte, fin = argmax(m.out), cWire = "c:" + e.c.active;
  chain.learn(h, y, m); e.a.update(ctx, y); e.b.update(ctx, y); e.c.observe(ctx, y); t++;
  geoLearn(ctx[0], y);
  if (show) { flow.push({a: ctx[0], b: y, t0: frame}); if (flow.length > 160) flow.shift(); }   // aether passing through a wire
  recent.C.push(cByte === y); recent.F.push(fin === y); if (recent.C.length > 1000) { recent.C.shift(); recent.F.shift(); }
  node("s:" + y, "sym", ch(y)); if (nodes.has("s:" + ctx[0])) edge("s:" + ctx[0], "s:" + y, "world", .2);
  node(cWire, "C", cLabel(cWire.slice(2))); if (cByte === y) edge(cWire, "s:" + y, "see", .3);
  const A = chain.A[0];
  for (const w of A.wires) { const id = "a:" + w.id; if (!nodes.has(id)) { node(id, "A", "A·" + w.L); if (w.parent) edge("a:" + w.parent.id, id, "bud", 2); } }
  if (show) {
    fire("s:" + y); fire(cWire); let best = null, bw = 0;
    for (const w of A.wires) { const d = w.dist(h, cByte); if (!d) continue; const k = argmax(d);
      if (k === y) { edge("a:" + w.id, "s:" + y, "feel", .6); fire("a:" + w.id); if (d[k] > bw) { bw = d[k]; best = w; } } }
    if (best && cByte !== y && fin === y) edge("a:" + best.id, cWire, "trust", 2);
  }
  strip.push({y, ok: fin === y, fixed: cByte !== y && fin === y, broke: cByte === y && fin !== y}); if (strip.length > 90) strip.shift();
}

// ---------- concepts: regions where symbols condense (no number of groups given) ----------
const tdist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) { const d = wrapD(a[i] - b[i]); s += d * d; } return Math.sqrt(s); };
function findConcepts() {
  const syms = [...geo.U.keys()].filter(s => nodes.has("s:" + s)); if (syms.length < 6) return;
  const P = syms.map(s => geo.U.get(s)), n = P.length, dist = [];
  for (let i = 0; i < n; i++) { dist[i] = []; for (let j = 0; j < n; j++) dist[i][j] = tdist(P[i], P[j]); }
  const all = []; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) all.push(dist[i][j]); all.sort((a, b) => a - b);
  const thr = all[Math.floor(all.length / 2)] * val("cthr");
  let G = syms.map((_, i) => [i]);
  for (;;) { let best = null, bd = thr;
    for (let a = 0; a < G.length; a++) for (let b = a + 1; b < G.length; b++) { let s = 0; for (const x of G[a]) for (const y of G[b]) s += dist[x][y]; s /= G[a].length * G[b].length; if (s < bd) { bd = s; best = [a, b]; } }
    if (!best) break; G[best[0]] = G[best[0]].concat(G[best[1]]); G.splice(best[1], 1); }
  G.sort((a, b) => b.length - a.length);
  groups = G.filter(g => g.length >= 2).map(g => g.map(i => syms[i]));
  const hue = new Map(); groups.forEach((g, k) => g.forEach(s => hue.set(s, (k * 137.5) % 360)));
  for (const nd of nodes.values()) if (nd.type === "sym") nd.hue = hue.get(+nd.id.slice(2));
  // purity against classes the graph never saw (letters / digits / punctuation), vs the same group sizes by chance
  const cls = c => c === 32 || c === 10 ? "spațiu" : c >= 48 && c <= 57 ? "cifră" : c >= 65 && c <= 90 ? "majusculă" : /[aeiou]/.test(String.fromCharCode(c)) ? "vocală" : c >= 97 && c <= 122 ? "consoană" : "semn";
  const pur = gs => gs.reduce((s, g) => { const c = {}; for (const x of g) c[cls(x)] = (c[cls(x)] || 0) + 1; return s + Math.max(...Object.values(c)); }, 0);
  const flat = groups.flat(), sh = [...flat].sort(() => rand() - .5); let k = 0; const shG = groups.map(g => g.map(() => sh[k++]));
  $("groups").innerHTML = `<div class="dim">${groups.length} concepte · puritate față de clase nevăzute <b>${(100 * pur(groups) / flat.length).toFixed(0)}%</b> (la întâmplare ${(100 * pur(shG) / flat.length).toFixed(0)}%)</div>` +
    groups.slice(0, 12).map(g => `<span class="grp" style="--h:${hue.get(g[0])}">${g.map(ch).join("").replace(/</g, "&lt;")}</span>`).join(" ");
}

// ---------- seeing the infinite torus ----------
const cv = $("g"), g = cv.getContext("2d");
const ang = new Array(15).fill(0), cam = [0, 0, 0, 0, 0], view = {zlog: 0, path: "", fade: 1, dirty: true, mode: "inside"};
let cache = null;
const occ = new Map();                                                        // where a context occurred in the lived stream
function occurrences(c) {
  if (occ.has(c)) return occ.get(c);
  let r; if (c.length === 1) { r = []; for (let i = 0; i < data.length; i++) if (data[i] === c.charCodeAt(0)) r.push(i); }
  else { const par = occurrences(c.slice(0, -1)), last = c.charCodeAt(c.length - 1), L = c.length - 1; r = par.filter(i => data[(i + L) % data.length] === last); }
  occ.set(c, r); return r;
}
const circMean = (pts, ws) => [0, 1, 2, 3, 4].map(i => { let sx = 0, sy = 0; pts.forEach((p, k) => { sx += ws[k] * Math.cos(2 * Math.PI * p[i]); sy += ws[k] * Math.sin(2 * Math.PI * p[i]); }); return wrap1(Math.atan2(sy, sx) / (2 * Math.PI)); });
function scene() {                                                           // items of the current level, with their torus points
  const items = [], index = new Map();
  if (!view.path) {
    for (const n of nodes.values()) if (n.type === "sym") { const u = geo.U.get(+n.id.slice(2)); if (u) { index.set(n.id, items.length); items.push({id: n.id, n, p: u.slice(0, 5), w: 1}); } }
    for (const n of nodes.values()) if (n.type !== "sym") {
      const pts = [], ws = []; for (const x of edges.values()) { const o = x.a === n.id ? x.b : x.b === n.id ? x.a : null; const k = o && index.get(o); if (k !== undefined && k !== null && items[k].n.type === "sym") { pts.push(items[k].p); ws.push(x.w); } }
      const p = pts.length ? circMean(pts, ws).map((v, i) => wrap1(v + (n.jit[i] - .5) * .04)) : n.jit.slice(0, 5);
      index.set(n.id, items.length); items.push({id: n.id, n, p, w: 1});
    }
    for (const it of items) it.nb = [];
    for (const x of edges.values()) { const a = index.get(x.a), b = index.get(x.b); if (a === undefined || b === undefined) continue; items[a].nb.push({b, w: x.w, kind: x.kind}); }
    for (const it of items) it.nb = it.nb.sort((u, v) => v.w - u.w).slice(0, 3);
  } else {
    // inside a context: its lived future — the symbols that came in the next 8 steps after every time it occurred,
    // weighted by nearness, linked in the order they really came
    const o = occurrences(view.path), L = view.path.length, wt = new Map(), seq = new Map();
    const imm = new Set();
    for (const i of o) { let prev = null; for (let dd = 0; dd < 8; dd++) { const y = data[(i + L + dd) % data.length]; if (!dd) imm.add(y);
      wt.set(y, (wt.get(y) || 0) + Math.pow(.7, dd) / o.length); if (prev !== null && prev !== y) seq.set(prev + ">" + y, (seq.get(prev + ">" + y) || 0) + 1); prev = y; } }
    const tot = [...wt.values()].reduce((a2, b2) => a2 + b2, 0);
    for (const [y, w] of wt) { const u = geo.U.get(y), n = nodes.get("s:" + y); if (!u || !n) continue; index.set(n.id, items.length); items.push({id: n.id, n, p: u.slice(0, 5), w: w / tot, next: imm.has(y)}); }
    for (const it of items) it.nb = [];
    for (const [k, c] of seq) { const [a2, b2] = k.split(">"), ia = index.get("s:" + a2), ib = index.get("s:" + b2); if (ia !== undefined && ib !== undefined) items[ia].nb.push({b: ib, w: c, kind: "see"}); }
    for (const it of items) it.nb = it.nb.sort((u, v) => v.w - u.w).slice(0, 3);
  }
  return items;
}
const S0 = () => Math.min(cv.clientWidth, cv.clientHeight) / 1.6;
const scale = () => S0() * Math.exp(view.zlog);
function idealT(n, hw, hh) { return Math.cbrt(val("density") / (32 * Math.max(1, n) * hw * hh)) * val("thickMul"); }
function hwFor(n, tWant) { const r = cv.clientHeight / cv.clientWidth; return Math.sqrt(val("density") * val("thickMul") ** 3 / (32 * Math.max(1, n) * tWant ** 3 * r)); }
const TMAX = 1.2;
function compute() {
  const W = cv.clientWidth, H = cv.clientHeight, M = rotation(ang), P = prepare(M), S = scale(), hw = W / 2 / S * 1.15, hh = H / 2 / S * 1.15;
  const items = scene(), n = items.length; if (!n) return {M, items, ims: [], S, t: 0, hw, hh, n, tIdeal: 0};
  const pl = plan(P, n, hw, hh, val("density"), val("thickMul"), TMAX);
  return {M, P, items, ims: images(items, cam, P, hw, hh, pl.t, pl.m, 5000), S, t: pl.t, m: pl.m, hw, hh, n, tIdeal: idealT(n, hw, hh)};
}
// THE LOOP OF SCALE. Zooming out of the whole graph you see the torus from outside; zooming further out the body
// shrinks to one point, and that point is the smallest organisation in the graph: a context that happened exactly
// once in the lived stream. Its inside is the future of that moment, which (the stream being a circle) is the whole
// stream again. Zooming out of it climbs back level by level to the whole graph. Zooming in runs the same circle the
// other way. Space wraps on every axis, scale wraps too.
function uniqueContextAtCamera() {                                            // the smallest organisation where you are looking
  let best = null, bd = Infinity;
  for (const [sym, u] of geo.U) { let d = 0; for (let i = 0; i < 5; i++) d += wrapD(u[i] - cam[i]) ** 2; if (d < bd && nodes.has("s:" + sym)) { bd = d; best = sym; } }
  if (best === null) return "";
  const i0 = data.indexOf(best); let c = String.fromCharCode(best);
  while (occurrences(c).length > 1 && c.length < 60) c += String.fromCharCode(data[(i0 + c.length) % data.length]);
  return c;
}
function toOutside(zl) { view.mode = "outside"; view.zlog = zl; view.fade = 0; view.dirty = true; }
function enterOrLeave(c) {                                                   // the zoom has no end in either direction
  const W = cv.clientWidth, H = cv.clientHeight;
  if (view.path && c.tIdeal > TMAX * 1.3 && occurrences(view.path).length === 1) { toOutside(Math.log(.045)); return; }   // the smallest holds the whole
  if (!view.path && c.hw > 3.5) { toOutside(Math.log(2.6)); return; }       // far enough out of the whole: see its body
  if (c.tIdeal > TMAX * 1.3 && c.ims.length) {                               // too deep for this level: enter the node at the centre
    // only a symbol that really came right after this context can be entered (the context grows by what truly followed)
    let best = null, bd = Infinity; for (const im of c.ims) { const it = c.items[im.it]; if (it.n.type !== "sym" || (view.path && !it.next)) continue; const d = im.q[0] ** 2 + im.q[1] ** 2; if (d < bd) { bd = d; best = it; } }
    if (!best) return;
    const chr = String.fromCharCode(+best.id.slice(2)); view.path += chr; for (let i = 0; i < 5; i++) cam[i] = best.p[i];
    const n = scene().length; view.zlog = Math.log(W / 2 / hwFor(n, .55) / S0()); view.fade = 0; view.dirty = true;
  } else if (view.path && (c.tIdeal < .28 || !c.items.length)) {                                   // far enough out: back to the level that holds this one
    const chr = view.path.slice(-1); view.path = view.path.slice(0, -1); const u = geo.U.get(chr.charCodeAt(0)); if (u) for (let i = 0; i < 5; i++) cam[i] = u[i];
    const n = scene().length; view.zlog = Math.log(W / 2 / hwFor(n, TMAX * 1.1) / S0()); view.fade = 0; view.dirty = true;
  }
}
function screenOf(q, c, W, H) {
  let f = 1; if ($("persp").checked && c.t > 0) { const d = val("cam"); for (let j = 2; j < 5; j++) f *= d / (d - .5 * q[j] / c.t); }
  const fp = Math.pow(f, .3); return {x: W / 2 + q[0] * c.S * fp, y: H / 2 + q[1] * c.S * fp, f};
}
// ---------- the same torus seen from outside: the five circles closed into one body ----------
// T⁵ = five circles. Seen from inside it is the endless space above; seen from outside it is the generalized Clifford
// torus: every axis is a circle of its own in a plane of its own, (cos 2πθ, sin 2πθ), so the body lives on the sphere
// S⁹ in 10 dimensions (the donut of the first picture is the same thing with two circles in 4 dimensions).
// A pair of axes is a 2-torus inside it — 10 pairs, 10 donuts. The slider of a pair turns the two circles into each
// other (a rotation of their two complex planes), the body is then projected stereographically from S⁹ and seen in
// perspective. Wires are not straight lines: every connection follows the torus the short way round, so the flow of
// the stream winds around the circles exactly like the (p,q) wires around the donut.
const flow = [];
let knot = null;
function embed(p, M) {                                                       // torus point → rotated point of S⁹
  const z = [0, 1, 2, 3, 4].map(i => [Math.cos(2 * Math.PI * p[i]) / Math.sqrt(5), Math.sin(2 * Math.PI * p[i]) / Math.sqrt(5)]);
  const re = z.map(c => c[0]), im = z.map(c => c[1]);
  const r2 = M.map(row => row.reduce((s2, x, j) => s2 + x * re[j], 0)), i2 = M.map(row => row.reduce((s2, x, j) => s2 + x * im[j], 0));
  return [r2[0], i2[0], r2[1], i2[1], r2[2], i2[2], r2[3], i2[3], r2[4], i2[4]];
}
function outsideXY(v, W, H, S) {                                             // stereographic S⁹ → R⁹, then perspective to the screen
  const den = Math.max(.05, 1 - v[9] * .92), x = v[0] / den, y = v[1] / den, z = (v[2] + v[4] * .6 + v[6] * .35) / den, d = val("cam") + 1.5;
  const f = d / (d - z); return {x: W / 2 + x * S * f, y: H / 2 + y * S * f, f};
}
function windings() {                                                        // the whole lived stream as one closed wire
  const k = [0, 0, 0, 0, 0];
  for (let i = 0; i < data.length; i++) { const a = geo.U.get(data[i]), b = geo.U.get(data[(i + 1) % data.length]); if (!a || !b) continue; for (let j = 0; j < 5; j++) k[j] += wrapD(b[j] - a[j]); }
  return k.map(Math.round);
}
function drawOutside(W, H) {
  const zs = Math.exp(view.zlog);
  if (zs > 3.2) { view.mode = "inside"; view.path = ""; view.zlog = Math.log(W / 2 / 2.6 / S0()); view.fade = 0; view.dirty = true; return; }   // into the body: the whole graph
  if (zs < .035) {                                                             // the body is now a point: it is the smallest organisation
    view.mode = "inside"; view.path = uniqueContextAtCamera(); const n = scene().length || 1;
    view.zlog = Math.log(W / 2 / hwFor(n, TMAX * 1.1) / S0()); view.fade = 0; view.dirty = true; return; }
  g.globalAlpha = 1; view.fade = Math.min(1, view.fade + .06);
  const M = rotation(ang), S = Math.min(W, H) * .5 * Math.exp(view.zlog), items = (() => { const p2 = view.path; view.path = ""; const it = scene(); view.path = p2; return it; })();
  const proj = it => outsideXY(embed(it.p, M), W, H, S);
  // the five generating circles through the centre of mass of the graph (one per axis): the body's own wires
  const centre = [0, 1, 2, 3, 4].map(i => { let sx = 0, sy = 0; for (const it of items) { sx += Math.cos(2 * Math.PI * it.p[i]); sy += Math.sin(2 * Math.PI * it.p[i]); } return wrap1(Math.atan2(sy, sx) / (2 * Math.PI)); });
  const axisCol = ["#ff6b6b", "#ffd166", "#06d6a0", "#4cc9f0", "#c77dff"];
  for (let ax = 0; ax < 5; ax++) { g.strokeStyle = axisCol[ax]; g.globalAlpha = .35; g.lineWidth = 1.5; g.beginPath();
    for (let k = 0; k <= 96; k++) { const p = centre.slice(); p[ax] = wrap1(centre[ax] + k / 96); const P = outsideXY(embed(p, M), W, H, S); k ? g.lineTo(P.x, P.y) : g.moveTo(P.x, P.y); } g.stroke(); }
  // wires: every connection follows the torus the short way round
  const top = [...edges.values()].sort((a, b) => b.w - a.w).slice(0, 700), at = new Map(items.map(it => [it.id, it]));
  for (const x of top) { const a = at.get(x.a), b = at.get(x.b); if (!a || !b) continue; const dl = [0, 1, 2, 3, 4].map(i => wrapD(b.p[i] - a.p[i]));
    g.strokeStyle = COL[x.kind] || COL.world; g.globalAlpha = Math.min(.8, .12 + Math.log1p(x.w) / 6); g.lineWidth = Math.min(2.2, .4 + Math.log1p(x.w) / 3); g.beginPath();
    for (let k = 0; k <= 10; k++) { const P = outsideXY(embed(a.p.map((v, i) => v + dl[i] * k / 10), M), W, H, S); k ? g.lineTo(P.x, P.y) : g.moveTo(P.x, P.y); } g.stroke(); }
  // the aether: what the stream is passing through right now, travelling along its wire
  for (const fl of flow) { const age = (frame - fl.t0) / 40; if (age > 1) continue; const a = geo.U.get(fl.a), b = geo.U.get(fl.b); if (!a || !b) continue;
    const P = outsideXY(embed(a.map((v, i) => v + wrapD(b[i] - v) * age).slice(0, 5), M), W, H, S);
    g.globalAlpha = 1 - age; g.fillStyle = "#fff"; g.shadowColor = "#bdf"; g.shadowBlur = 12; g.beginPath(); g.arc(P.x, P.y, 2.6, 0, 7); g.fill(); g.shadowBlur = 0; }
  const pts = items.map(it => ({it, ...proj(it)})).sort((a, b) => a.f - b.f);
  for (const P of pts) { const n = P.it.n, r = (n.type === "sym" ? 5 : 8) * Math.min(2.5, Math.max(.4, P.f)), col = n.type === "sym" && n.hue !== undefined ? `hsl(${n.hue},85%,65%)` : COL[n.type];
    g.globalAlpha = Math.min(1, .35 + .5 * P.f); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 4 + 14 * n.act; g.beginPath(); g.arc(P.x, P.y, r, 0, 7); g.fill(); g.shadowBlur = 0;
    if (P.f > .9) { g.fillStyle = "#fff"; g.font = "10px ui-monospace,monospace"; g.textAlign = "center"; g.fillText(n.label, P.x, P.y - r - 3); } }
  if (view.fade < 1) { g.globalAlpha = 1 - view.fade; g.fillStyle = "#000"; g.fillRect(0, 0, W, H); }
  g.globalAlpha = 1;
  if (frame % 10 === 0) {
    if (!knot || frame % 120 === 0) knot = windings();
    const names = ["X", "Y", "Z", "W", "V"], pairs = []; PLANES.forEach(([i, j, nm]) => { if (knot[i] || knot[j]) pairs.push(`${nm} (${knot[i]},${knot[j]})`); });
    $("where").innerHTML = `din afară: corpul închis al celor 5 cercuri (tor Clifford generalizat, pe sfera din 10 dimensiuni). Zoom înăuntru: tot graful. Zoom în afară: corpul devine cel mai mic context unic al lumii trăite.<br>` +
      `textul trăit, parcurs o dată, e un singur fir închis care se înfășoară de <b class="ctx">${knot.map((k, i) => names[i] + " " + k).join(" · ")}</b> ori în jurul fiecărui cerc` +
      (pairs.length ? `<br><span class="dim">pe fiecare pereche de axe (cele 10 gogoși): ${pairs.slice(0, 10).join(" · ")}</span>` : "");
    $("visible").innerHTML = `cercurile colorate sunt cele 5 axe ale corpului: ${names.map((nm, i) => `<b style="color:${axisCol[i]}">${nm}</b>`).join(" ")} · punctele albe sunt aetherul care trece acum prin fire`;
    $("matrix").innerHTML = M.map(row => row.map(v => `<span>${v.toFixed(2)}</span>`).join("")).join("");
  }
}

// ---------- the main view: the graph that contains itself (nestview.mjs) ----------
// The same graph as always (symbols, A's perceptions, C's perspectives, the wires between them, the aether), but every
// node holds the graph one step further into the past: zoom in and a node opens into the contexts that really came
// before it (the way the graph buds), zoom out and the contexts close back into it; out of the whole, the whole is the
// inside of the moment just lived. One rule for every scale: the transition is the zoom itself. Time is the 6th axis
// (how long ago, on a logarithmic clock); turn it into the screen with the T planes.
const nv = new NestView();
const NEST = () => !$("torusView").checked;
let nvKey = "", nvAt = -1;
function drawNest(W, H) {
  const lived = LIVE ? data : t !== nvAt && (frame % 60 === 0 || !nv.data.length) ? data.slice(0, Math.min(t, data.length)) : nv.data;
  if (!lived || lived.length < 50 || !geo.U.size) { g.fillStyle = "#4a6075"; g.font = "15px system-ui"; g.textAlign = "center"; g.fillText("aștept primele momente trăite…", W / 2, H / 2); return; }
  if (lived !== nv.data || frame % 30 === 0) { nvAt = t;
    const prev = view.path; view.path = ""; const items = scene(); view.path = prev;
    const top = items.map(it => ({id: it.id, kind: it.n.type === "sym" ? "sym" : it.n.type, sym: it.n.type === "sym" ? +it.id.slice(2) : undefined, p: it.p, born: it.n.bt, node: it.n}));
    nv.setWorld({data: lived, U: geo.U, top, edges: [...edges.values()], now: t}); nvKey = ""; }
  const key = ang.map(a2 => a2.toFixed(3)).join(","); if (key !== nvKey) { nv.setRotation(rotation6(ang)); nvKey = key; }
  const {discs, lines, frames} = nv.render(W, H);
  const nodeOf = d => d.it?.node || nodes.get("s:" + d.sym), focus = $("focusLive").checked;
  // the regions of the open nodes: the faint rim of a node that is now seen from inside
  for (const F of frames) { if (F.r > 4 * Math.max(W, H)) continue; g.globalAlpha = .18 * F.alpha * (F.real ? 1 : .5); g.strokeStyle = F.real ? "#9fd8ff" : "#4d6a80"; g.lineWidth = 1;
    g.setLineDash(F.real ? [] : [4, 4]); g.beginPath(); g.arc(F.x, F.y, F.r, 0, 7); g.stroke(); g.setLineDash([]); }
  for (const L of lines) { g.strokeStyle = COL[L.kind] || COL.world; g.globalAlpha = L.alpha * (focus ? .35 : 1) * Math.min(1, .15 + Math.log1p(L.w) / 5);
    g.lineWidth = Math.min(2.5, .4 + Math.log1p(L.w) / 3); g.beginPath(); g.moveTo(L.x1, L.y1); g.lineTo(L.x2, L.y2); g.stroke(); }
  const N0 = Math.max(2, lived.length), fresh = d => focus ? Math.max(.06, 1 - Math.log1p(d.age ?? N0) / Math.log1p(Math.min(N0, 3000))) : 1;
  if (focus) nv.follow();
  for (const d of discs) { d.alpha *= fresh(d); const n = nodeOf(d), type = n?.type || "sym", col = type === "sym" && n?.hue !== undefined ? `hsl(${n.hue},85%,${d.real ? 65 : 45}%)` : COL[type] || "#7cc9ff", act = n?.act || 0;
    g.globalAlpha = d.alpha * (d.real ? .55 + .45 * Math.max(.4, act) : .35); g.fillStyle = col; g.shadowColor = col; g.shadowBlur = d.real ? 4 + 14 * act : 0;
    g.beginPath(); g.arc(d.x, d.y, d.r, 0, 7); if (d.real) g.fill(); else { g.strokeStyle = col; g.lineWidth = 1.2; g.stroke(); } g.shadowBlur = 0;
    if (n?.err && performance.now() - n.err < 1200) { const k = (performance.now() - n.err) / 1200; g.globalAlpha = d.alpha * (1 - k); g.strokeStyle = "#ff4d6d"; g.lineWidth = 2; g.beginPath(); g.arc(d.x, d.y, d.r + 4 + 14 * k, 0, 7); g.stroke(); }   // impulse: prediction ≠ reality
    if (d.r > 4 || discs.length < 300) { g.globalAlpha = d.alpha * (d.real ? 1 : .55); g.fillStyle = "#fff"; g.font = (type === "sym" ? "11px " : "bold 10px ") + "ui-monospace,monospace"; g.textAlign = "center";
      const txt = type !== "sym" ? n?.label || "" : d.label ? d.label.split("").map(c2 => ch(c2.charCodeAt(0))).join("") : n?.label || "";
      g.fillText(txt.length > 18 ? "…" + txt.slice(-18) : txt, d.x, d.y - d.r - 4); } }
  for (const F of frames) if (F.r > 60 && F.r < 2 * Math.max(W, H) && F.label) { g.globalAlpha = .7 * F.alpha; g.fillStyle = F.real ? "#cfe8ff" : "#7d93a6"; g.font = "13px ui-monospace,monospace"; g.textAlign = "center";
    const t2 = F.label.split("").map(c2 => ch(c2.charCodeAt(0))).join(""); g.fillText("«" + (t2.length > 30 ? "…" + t2.slice(-30) : t2) + "»", F.x, F.y - F.r - 6); }
  g.globalAlpha = .5; g.strokeStyle = "#fff"; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2 - 6, H / 2); g.lineTo(W / 2 + 6, H / 2); g.moveTo(W / 2, H / 2 - 6); g.lineTo(W / 2, H / 2 + 6); g.stroke(); g.globalAlpha = 1;
  if (frame % 10 === 0) { const c = nv.cam, w = c.w.split("").map(c2 => ch(c2.charCodeAt(0))).join("").replace(/</g, "&lt;"), n = c.w ? nv.positions(c.w).length : 0;
    $("where").innerHTML = (c.w ? `în interiorul nodului <b class="ctx">«${w.length > 60 ? "…" + w.slice(-60) : w}»</b> — ${c.w.length} caractere în trecut, ${n ? n + " momente trăite" : "dincolo de ce a trăit: continuarea grafului (contur punctat)"}`
      : "tot graful: fiecare nod conține graful mai departe în trecut; zoom înăuntru îl deschide, zoom în afară îl închide la loc") +
      (c.k ? `<br><span class="dim">și tot graful e interiorul momentului trăit acum ${c.k} pași (trecutul lui e toată lumea trăită)</span>` : "");
    $("visible").textContent = `${discs.length} noduri · ${lines.length} fire pe ecran · ${lived.length.toLocaleString()} momente trăite`;
    $("matrix").innerHTML = rotation6(ang).map(row => row.map(v => `<span>${v.toFixed(2)}</span>`).join("")).join(""); }
}

function draw() {
  const dpr = devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== W * dpr) { cv.width = W * dpr; cv.height = H * dpr; view.dirty = true; }
  g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  if (!nodes.size) { g.fillStyle = "#4a6075"; g.font = "15px system-ui"; g.textAlign = "center";
    g.fillText("Graful e gol. Nimic nu e dat: niciun nod, nicio linie, nicio geometrie.", W / 2, H / 2 - 10);
    g.fillText("Apasă Start: tot ce vei vedea e absorbit din experiență.", W / 2, H / 2 + 14); return; }
  if (NEST()) return drawNest(W, H);
  if (view.mode === "outside") return drawOutside(W, H);
  if (view.dirty || !cache || frame % 3 === 0) { cache = compute(); enterOrLeave(cache); if (view.dirty) cache = compute(); view.dirty = false; }
  const c = cache; view.fade = Math.min(1, view.fade + .06);
  const pts = c.ims.map(im => ({im, ...screenOf(im.q, c, W, H)}));
  // edges: from every visible image to the nearest image of its neighbour, if that image is in the section too
  let drawn = 0;
  for (const P of pts) { if (drawn > 5000) break; const it = c.items[P.im.it];
    for (const nb of it.nb) { const jt = c.items[nb.b]; if (!jt) continue;
      const dl = [0, 1, 2, 3, 4].map(i => wrapD(jt.p[i] - it.p[i])), rq = c.M.map(row => row.reduce((s, x, j) => s + x * dl[j], 0)), q = P.im.q.map((v, i) => v + rq[i]);
      if (Math.abs(q[2]) > c.t || Math.abs(q[3]) > c.t || Math.abs(q[4]) > c.t) continue;
      const B = screenOf(q, c, W, H); g.strokeStyle = COL[nb.kind] || COL.world; g.globalAlpha = view.fade * Math.min(1, .15 + Math.log1p(nb.w) / 5);
      g.lineWidth = Math.min(2.5, .4 + Math.log1p(nb.w) / 3); g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(B.x, B.y); g.stroke(); drawn++; } }
  pts.sort((a, b) => a.f - b.f);
  const zs = Math.min(2.4, Math.max(.7, Math.pow(c.S / S0(), .22))), labels = pts.length < 420;
  for (const P of pts) {
    const it = c.items[P.im.it], n = it.n, base = n.type === "sym" ? 6 : 9, wf = view.path ? .7 + 2.2 * Math.sqrt(it.w) : 1;
    const r = base * zs * wf * Math.min(2.2, Math.max(.45, P.f)), col = n.type === "sym" && n.hue !== undefined ? `hsl(${n.hue},85%,65%)` : COL[n.type];
    g.globalAlpha = view.fade * Math.min(1, .35 + .45 * P.f) * (.6 + .4 * Math.max(.4, n.act)); g.shadowColor = col; g.shadowBlur = 4 + 14 * n.act; g.fillStyle = col;
    g.beginPath(); g.arc(P.x, P.y, r, 0, 7); g.fill(); g.shadowBlur = 0;
    if (labels || Math.hypot(P.x - W / 2, P.y - H / 2) < 140) { g.fillStyle = "#fff"; g.font = (n.type === "sym" ? "11px " : "bold 10px ") + "ui-monospace,monospace"; g.textAlign = "center"; g.fillText(n.label, P.x, P.y - r - 4); }
  }
  g.globalAlpha = .5; g.strokeStyle = "#fff"; g.lineWidth = 1; g.beginPath(); g.moveTo(W / 2 - 6, H / 2); g.lineTo(W / 2 + 6, H / 2); g.moveTo(W / 2, H / 2 - 6); g.lineTo(W / 2, H / 2 + 6); g.stroke(); g.globalAlpha = 1;
  if (frame % 10 === 0) {
    $("matrix").innerHTML = c.M.map(row => row.map(v => `<span>${v.toFixed(2)}</span>`).join("")).join("");
    const shown = view.path.split("").map(x => ch(x.charCodeAt(0))).join("");
    let next = ""; if (view.path) { let c2 = view.path; for (let k = 0; k < 24; k++) { const o2 = occurrences(c2), L2 = c2.length, cn = new Map(); for (const i of o2) { const y = data[(i + L2) % data.length]; cn.set(y, (cn.get(y) || 0) + 1); }
      let by = null, bc = 0; for (const [y, cc] of cn) if (cc > bc) { bc = cc; by = y; } if (by === null) break; next += ch(by); c2 += String.fromCharCode(by); } }
    $("where").innerHTML = view.path ? `adâncime <b>${view.path.length}</b> · în interiorul lui <b class="ctx">«${shown.replace(/</g, "&lt;")}»</b> (${occurrences(view.path).length} întâlniri în lumea trăită${occurrences(view.path).length === 1 ? " — cel mai mic context: mai înăuntru e întregul, văzut din afară" : ""})<br>drumul cel mai umblat mai departe: <b class="ctx">${next.replace(/</g, "&lt;")}</b>` : "tot graful, din interior. Mai în afară îi vezi corpul.";
    $("visible").textContent = `${c.ims.length} imagini reale pe ecran · secțiune ${c.t.toFixed(3)} · zoom în nivel ×${Math.exp(view.zlog).toPrecision(3)}${c.m > 1 ? ` · detaliu 1/${c.m}` : ""} · cameră (${cam.map(v => wrap1(v).toFixed(2)).join(", ")})`;
  }
}

// ---------- proof and free writing ----------
function evaluate() {
  if (LIVE) { const T2 = liveSnap?.test, p2 = v => (100 * v).toFixed(1) + "%";
    $("evalOut").innerHTML = T2 ? `${T2.n} caractere nevăzute, testate de trainer cu parametrii înghețați<br>graful LIVE <b style="color:var(--green)">${p2(T2.live)}</b> · graful MASKED <b>${p2(T2.masked)}</b> · C singur <b>${p2(T2.C)}</b> · ${T2.bits.toFixed(2)} biți` +
      (T2.field != null ? `<br>câmpul momentelor trăite <b>${p2(T2.field)}</b> · graful + câmpul împreună <b style="color:var(--green)">${p2(T2.together)}</b>` : "") : "aștept primul test al trainerului"; return; }
  const T = val("ttemp"), H = e.holdout, hit = {C: 0, det: 0, live: 0, masked: 0}, keep = chain.rand; let n = 0;
  chain.rand = rng((Math.random() * 2 ** 32) >>> 0);                         // a new draw every test
  for (let i = 4; i < H.length && n < 2000; i++, n++) { const ctx = ctxAt(H, i), y = H[i], h = histAt(H, i);
    const live = chain.play(e, ctx, h).out, masked = chain.play(e, ctx, h, true).out;
    hit.C += argmax(distC(e.c, ctx)) === y; hit.det += argmax(live) === y;
    hit.live += chain.pick(live, T) === y; hit.masked += chain.pick(masked, T) === y; }
  chain.rand = keep;
  const p = v => (100 * v / n).toFixed(1) + "%";
  $("evalOut").innerHTML = `${n} caractere pe care nu le-a văzut niciodată, temperatura <b>${T.toFixed(2)}</b><br>` +
    `graful LIVE <b style="color:var(--green)">${p(hit.live)}</b> · graful MASKED <b>${p(hit.masked)}</b>` +
    `<br><span class="dim">la T=0 (fără halucinație): graful ${p(hit.det)} · C singur ${p(hit.C)}. La T&gt;0 fiecare test dă alt rezultat.</span>`;
}
function write() {
  if (LIVE) { $("writeOut").textContent = "scrie…";                        // the graph in the trainer writes freely, at the writing temperature
    fetch("/chat", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({w: liveW, history: [], opts: {T: val("wtemp"), max: 1200, stopBlank: false}})}).then(r => r.json()).then(r => {
      $("writeOut").innerHTML = r.error ? r.error : `T ${(+val("wtemp")).toFixed(2)} · graful #${liveW}<div class="gen">${String(r.text).replace(/</g, "&lt;").replace(/\n/g, " ⏎ ")}</div>`; }).catch(err => $("writeOut").textContent = err.message);
    return; }
  const T = val("wtemp"), out = e.holdout.slice(0, 12), N = 1200, keep = chain.rand; chain.rand = rng((Math.random() * 2 ** 32) >>> 0);
  for (let k = 0; k < N; k++) { const i = out.length, p = chain.play(e, ctxAt(out, i), histAt(out, i)).out; out.push(chain.pick(p, T)); }
  chain.rand = keep;
  const gen = out.slice(12), seen = new Set(); let rep = 0, realH = 0, n5 = 0;
  for (let i = 0; i + 8 <= gen.length; i++) { const k = String.fromCharCode(...gen.slice(i, i + 8)); if (seen.has(k)) rep++; seen.add(k); }
  for (let i = 0; i + 5 <= gen.length; i++, n5++) realH += real5.has(String.fromCharCode(...gen.slice(i, i + 5)));
  const loops = rep / (gen.length - 7), realness = realH / n5;
  $("writeOut").innerHTML = `T ${T.toFixed(2)} · buclă <b>${(100 * loops).toFixed(0)}%</b> · limbaj real <b>${(100 * realness).toFixed(0)}%</b> · viu <b style="color:var(--green)">${(100 * realness * (1 - loops)).toFixed(0)}%</b>` +
    `<div class="gen">${String.fromCharCode(...gen.slice(0, 420)).replace(/</g, "&lt;").replace(/\n/g, " ")}</div>`;
}

function stats() {
  const rate = a => a.length ? (100 * a.reduce((s, v) => s + v, 0) / a.length).toFixed(1) + "%" : "—";
  let s = 0, c = 0, a = 0; for (const n of nodes.values()) n.type === "sym" ? s++ : n.type === "C" ? c++ : a++;
  $("steps").textContent = t.toLocaleString(); $("symbols").textContent = s; $("cw").textContent = c; $("aw").textContent = a;
  $("edges").textContent = edges.size; $("accC").textContent = LIVE ? (liveSnap ? (100 * liveSnap.accC).toFixed(1) + "%" : "—") : rate(recent.C); $("accF").textContent = LIVE ? (liveSnap ? (100 * liveSnap.accF).toFixed(1) + "%" : "—") : rate(recent.F); $("accAl").textContent = LIVE && liveSnap?.accAlign != null ? (100 * liveSnap.accAlign).toFixed(1) + "%" : "—"; const mapOnly = LIVE && Array.isArray(liveSnap?.worlds) && liveSnap.worlds.length === 1 && liveSnap.worlds[0] === "maptext";
  if (mapOnly) {
    $("accC").textContent = "N/A"; $("accF").textContent = "N/A"; $("accAl").textContent = "N/A";
    $("selfModel").textContent = "Acest graf primește predominant mișcări binare, nu răspunsuri în limbaj. Scorurile de caractere și încredere nu indică învățarea navigării. Traseul curent este calculat de un algoritm prestabilit.";
  } else if (LIVE && liveSnap?.selfModel && frame % 30 === 0) { const M = liveSnap.selfModel, nm = {mem: "tot trecutul", memn: "trecutul cel mai nou", self: "exercițiul de acum", form: "forma (trecutul)", formn: "forma (cel mai nou)", fself: "forma exercițiului de acum"};
    $("selfModel").innerHTML = "cât se poate încrede în fiecare fel de aliniere (a prezis înainte, apoi a văzut): " + Object.entries(M.sources).map(([k, o]) => `${nm[k] || k} <b>${(100 * o.trust).toFixed(1)}%</b>`).join(" · ") +
      `<br>cum citește acum: urmează alinierile de încredere cu ascuțimea <b>${M.g}</b>, forma cântărește <b>${M.form}</b>` +
      (M.history.length ? "<br>schimbări făcute de el însuși (G<sub>t</sub> → G<sub>t+1</sub>, adoptate doar dacă ghicesc mai bine ce n-a văzut): " + M.history.map(h => `la ${h.at.toLocaleString()}: ascuțime ${h.from.g}→${h.to.g}, formă ${h.from.form}→${h.to.form} (${(100 * h.before).toFixed(1)}%→${(100 * h.after).toFixed(1)}%)`).join("; ") : "<br>încă nicio schimbare a lui însuși: nicio variantă n-a ghicit mai bine"); }
  $("form").textContent = LIVE ? (liveSnap?.form || "încă nicio percepție") : chain.A[0].wires.length ? chain.A[0].form() : "încă nicio percepție";
  $("strip").innerHTML = strip.map(s => `<span class="${s.fixed ? "fix" : s.broke ? "brk" : s.ok ? "ok" : "no"}">${ch(s.y).replace("<", "&lt;")}</span>`).join("");
}
let frame = 0;
function loop() {
  if (LIVE && frame % 90 === 0) evaluate();
  if (LIVE) { drawMaze(); drawTrans(); }
  if (running) { const k = val("speed"); for (let i = 0; i < k; i++) step(i === k - 1); }
  for (const n of nodes.values()) n.act *= .93;
  for (const [k, x] of edges) { x.w *= .9995; x.hot *= .9; if (x.w < .05) edges.delete(k); }
  if ($("spin").checked) { const sp = val("spinSpeed") * .01; PLANES6.forEach((_, k) => { if ($("auto" + k).checked) { ang[k] = (ang[k] + sp) % 6.2832; $("rot" + k).value = ang[k]; $("rot" + k + "Out").textContent = ang[k].toFixed(2); view.dirty = true; } }); }
  const fly = val("fly");
  if (NEST()) { if (fly) nv.zoom(Math.exp(fly * .03), cv.clientWidth / 2, cv.clientHeight / 2, cv.clientWidth, cv.clientHeight);
    const tx = val("tx"), ty = val("ty"); if (tx || ty) nv.pan(-tx * 4, -ty * 4); }
  else if (fly) { view.zlog += fly * .02; view.dirty = true; }
  ["tx", "ty", "tz", "tw", "tv"].forEach((id, i) => { const v = val(id); if (v) { cam[i] = wrap1(cam[i] + v * .004); view.dirty = true; } });
  draw(); frame++;
  if (frame % 6 === 0) stats(); if (frame % 60 === 0 && running) findConcepts();
  requestAnimationFrame(loop);
}

// ---------- controls ----------
// rotation sliders for the 15 planes (the 10 of the learned axes + the 5 that turn time T into them), each with its own auto-rotate box
$("planes").innerHTML = PLANES6.map(([, , nm], k) => `<div class="sl"><label for="rot${k}">${nm} <input id="auto${k}" type="checkbox" ${["XW", "YV", "ZV", "WV"].includes(nm) ? "checked" : ""} title="rotește singur"></label><input id="rot${k}" type="range" min="0" max="6.2832" step="0.01" value="0"><span id="rot${k}Out" class="dim">0.00</span></div>`).join("");
PLANES6.forEach((_, k) => $("rot" + k).addEventListener("input", () => { ang[k] = +$("rot" + k).value; $("rot" + k + "Out").textContent = ang[k].toFixed(2); view.dirty = true; }));
$("resetRot").onclick = () => { PLANES6.forEach((_, k) => { ang[k] = 0; $("rot" + k).value = 0; $("rot" + k + "Out").textContent = "0.00"; }); view.dirty = true; };
$("zin").onclick = () => { if (NEST()) return nv.zoom(2, cv.clientWidth / 2, cv.clientHeight / 2, cv.clientWidth, cv.clientHeight); view.zlog += Math.log(2); view.dirty = true; };
$("zout").onclick = () => { if (NEST()) return nv.zoom(.5, cv.clientWidth / 2, cv.clientHeight / 2, cv.clientWidth, cv.clientHeight); view.zlog -= Math.log(2); view.dirty = true; };
$("still").onclick = () => { for (const id of ["fly", "tx", "ty", "tz", "tw", "tv"]) { $(id).value = 0; $(id + "Out").textContent = "0"; } };
$("home").onclick = () => { nv.cam = {k: 0, w: "", x: 0, y: 0, S: 300}; nv.placed = false; nv.last = null; view.mode = "inside"; view.path = ""; view.zlog = 0; cam.fill(0); view.dirty = true; };
cv.addEventListener("wheel", ev => { ev.preventDefault(); const r = cv.getBoundingClientRect(), mx = ev.clientX - r.left - cv.clientWidth / 2, my = ev.clientY - r.top - cv.clientHeight / 2;
  if (NEST()) return nv.zoom(Math.exp(-ev.deltaY * .0015), mx + cv.clientWidth / 2, my + cv.clientHeight / 2, cv.clientWidth, cv.clientHeight);
  const S1 = scale(); view.zlog -= ev.deltaY * .0015; const S2 = scale();
  const d = applyT(rotation(ang), [mx / S1 - mx / S2, my / S1 - my / S2, 0, 0, 0]); for (let i = 0; i < 5; i++) cam[i] = wrap1(cam[i] + d[i]); view.dirty = true; }, {passive: false});
let dragAt = null;
cv.addEventListener("pointerdown", ev => { dragAt = [ev.clientX, ev.clientY]; cv.setPointerCapture(ev.pointerId); });
cv.addEventListener("pointermove", ev => { if (!dragAt) return; const S = scale(), dx = ev.clientX - dragAt[0], dy = ev.clientY - dragAt[1]; dragAt = [ev.clientX, ev.clientY];
  if (NEST()) return nv.pan(dx, dy);
  const d = applyT(rotation(ang), [-dx / S, -dy / S, 0, 0, 0]); for (let i = 0; i < 5; i++) cam[i] = wrap1(cam[i] + d[i]); view.dirty = true; });
cv.addEventListener("pointerup", () => dragAt = null);
for (const id of ["speed", "wtemp", "ttemp", "ltemp", "pnoise", "gnoise", "glr", "repel", "cthr", "cam", "density", "thickMul", "fly", "tx", "ty", "tz", "tw", "tv", "spinSpeed", "dims", "bud", "wires"])
  $(id).addEventListener("input", () => { $(id + "Out").textContent = (+$(id).value).toString(); view.dirty = true; });
$("run").onclick = () => { running = !running; $("run").textContent = running ? "Pauză" : "Start"; };
$("reset").onclick = () => reset();
$("eval").onclick = () => { if (!LIVE) return evaluate();                   // live: unseen exercises drawn at random, at the test temperature, in the Evaluare tab
  $("tabEval").click(); $("evKind").value = liveSnap?.worlds?.length === 1 && liveSnap.worlds[0] === "maptext" ? "maptext" : "text"; $("evKind").onchange(); $("evT").value = val("ttemp"); $("evTOut").textContent = val("ttemp"); $("evGo").click(); };
$("write").onclick = () => write();
$("wtemp").addEventListener("change", () => { if (t) write(); });
// ---------- live: the graph devouring a world on the trainer (devour.mjs), not in this page ----------
const LIVE = new URLSearchParams(location.search).has("live");
const initialLiveParams = new URLSearchParams(location.search);
let liveW = +(initialLiveParams.get("w") || 0), liveSnap = null;
let liveSelectionLocked = initialLiveParams.has("w");
function applySnap(gs) {
  D = 5; geo.U = new Map(gs.U); const keep = new Set();
  for (const [id, type, label, act, born, err] of gs.nodes) { const n = node(id, type, label); n.label = label; if (born !== undefined) n.bt = born; n.act = Math.max(n.act, act); if (err) n.err = performance.now(); keep.add(id); }
  for (const id of [...nodes.keys()]) if (!keep.has(id)) nodes.delete(id);
  edges = new Map(gs.edges.map(([a2, b2, kind, w, label]) => [a2 + ">" + b2 + (["is", "attract", "repel", "moves", "align", "miss"].includes(kind) ? ">" + kind : ""), {a: a2, b: b2, kind, w, label, hot: 1}]));
  if (typeof gs.text === "string" && (gs.text !== (liveSnap?.text || "") || !data.length)) { data = Array.from(gs.text, c2 => c2.charCodeAt(0)); occ.clear(); knot = null; }
  flow.length = 0; gs.flow.forEach((p2, i) => flow.push({a: p2[0], b: p2[1], t0: frame - (gs.flow.length - i) * .3}));
  strip = gs.strip.map(([y, ok, fixed, broke]) => ({y, ok, fixed, broke})); t = gs.lived ?? gs.chars; liveSnap = gs; view.dirty = true; findConcepts();
  if (gs.shared) renderShared(gs.shared);   // t: every step lived (text characters and every world's symbols)
}
// Draw measured PyTorch training vectors, NOT fabricated graph nodes or arbitrary 5D geometry.
function renderShared(S) {
  const box = $("sharedBox"), info = $("sharedOut"), canvas = $("sharedCv");
  if (!box || !info || !canvas) return;
  box.hidden = false;
  const R = S.training, domains = S.domains || {};
  const n = `observate maze ${domains.maze || 0} · transform ${domains.transform || 0} · text ${domains.text || 0} · în coadă ${S.queued || 0}`;
  info.textContent = R?.step ?
    `${n} | model ${R.device} · actualizări ${R.step} · eroare înainte de update ${R.preUpdatePredictionLoss} · identitate ${R.identityBaselineLoss}` :
    n + (S.error ? " | " + S.error : " | fără update PyTorch încă");
  const g2 = canvas.getContext("2d"), W = canvas.width, H = canvas.height;
  g2.clearRect(0, 0, W, H); g2.fillStyle = "#061524"; g2.fillRect(0, 0, W, H);
  g2.strokeStyle = "#20334c"; g2.lineWidth = 1;
  g2.beginPath(); g2.moveTo(0, H/2); g2.lineTo(W,H/2); g2.moveTo(W/2,0); g2.lineTo(W/2,H); g2.stroke();
  const t = R?.trace;
  if (!t || ![t.before,t.predicted,t.observed].every(v=>Array.isArray(v)&&v.length>=2&&v.every(Number.isFinite))) {
    g2.fillStyle = "#8baecf"; g2.font = "13px sans-serif"; g2.fillText("Date neuronale măsurate vor apărea după un batch real.", 16, H/2-12); return;
  }
  const v = [t.before,t.predicted,t.observed];
  const magn = Math.max(.0001,...v.flatMap(z=>[Math.abs(z[0]),Math.abs(z[1])]));
  const px = z => [W/2+z[0]*(W*.38/magn),H/2-z[1]*(H*.38/magn)];
  const pts = v.map(px);
  g2.strokeStyle="#ffaa56";g2.lineWidth=2;g2.beginPath();g2.moveTo(...pts[0]);g2.lineTo(...pts[1]);g2.stroke();
  g2.strokeStyle="#52d6a5";g2.beginPath();g2.moveTo(...pts[0]);g2.lineTo(...pts[2]);g2.stroke();
  const colors=["#f6c660","#f46faa","#5ee0b0"],names=["Înainte","Prezis","Observat"];
  pts.forEach(([x,y],i)=>{g2.beginPath();g2.arc(x,y,5,0,Math.PI*2);g2.fillStyle=colors[i];g2.fill();g2.font="12px sans-serif";g2.fillText(names[i],Math.min(W-70,x+7),Math.max(12,y-7));});
}
$("sharedEvalGo").onclick = async () => {
  if (!LIVE) return;
  const out = $("sharedEvalOut"), button = $("sharedEvalGo");
  button.disabled = true; out.textContent = "Evaluare înghețată pe experiențe reale nevăzute...";
  try {
    const resp = await fetch("/shared-eval?w=" + liveW, {method: "POST", cache: "no-store"});
    const r = await resp.json();
    if (r.error) throw Error(r.error);
    out.textContent = "FROZEN " + (r.frozen ? "da" : "nu") + " · exemple " + r.examples +
      " · eroare " + r.loss + " · identitate " + r.identityBaselineLoss +
      " · domenii " + JSON.stringify(r.perDomain || {}) +
      " · observații " + JSON.stringify(r.counts || {});
  } catch (err) { out.textContent = "Evaluare nereușită: " + err.message; }
  finally { button.disabled = false; }
};
// the map the same brain is living: walls, checkpoint band, and the path of its two cubes in the last episode
let mazeShown = null, mazeT0 = 0;
function drawMaze() {
  const M = liveSnap?.maze, box = $("mazeBox"); if (!M) { box.hidden = true; return; } box.hidden = false;
  const p2 = v => v == null ? "—" : (100 * v).toFixed(0) + "%", L = M.last, T = M.test;
  const K = M.knows, yes = (b, t) => `<span style="color:${b ? "var(--green)" : "#7d93a6"}">${b ? "✓" : "…"} ${t}</span>`;
  $("mazeOut").innerHTML = `exerciții trăite <b>${M.played}</b> (nimic explicat, fără profesor) · <b>test pe ${T?.n || 30} nevăzute: rezolvate ${p2(T?.solved)}</b>, pași/optim ${T?.ratio ? T.ratio.toFixed(2) : "—"}, toată traiectoria prezisă din start ${p2(T?.shape)}` +
    (K ? `<br>a descoperit: ${yes(K.self, "care simbol e el")} · ${yes(K.moves === 4, `ce fac ieșirile lui (${K.moves} din 8 îl mișcă)`)} · ${yes(K.wallRepels, "ce respinge")} · ${yes(K.targetAttracts, "ce atrage (scopul)")}` : "") +
    (L ? `<br>exercițiul #${L.i} (${L.kind}): ${L.solved ? "<b style='color:var(--green)'>a ajuns</b>" : "nu a ajuns"} în ${L.steps} pași (optim ${L.optimal}) · linia aurie = toată traiectoria pe care o prezice` : "");
  if (!L?.wall) return; if (mazeShown !== L) { mazeShown = L; mazeT0 = performance.now(); }
  const c = $("mazeCv"), g2 = c.getContext("2d"), n = L.n, s2 = Math.min(c.width, c.height) / n, ox = (c.width - n * s2) / 2, cx = i => ox + (i % n + .5) * s2, cy = i => ((i / n | 0) + .5) * s2;
  g2.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < n * n; i++) { g2.fillStyle = L.wall[i] ? "#1d2b3a" : "#070b10"; g2.fillRect(ox + (i % n) * s2, (i / n | 0) * s2, s2 - 1, s2 - 1); }
  g2.fillStyle = "rgba(61,220,132,.8)"; g2.beginPath(); g2.arc(cx(L.goal), cy(L.goal), s2 * .32, 0, 7); g2.fill();
  const k = Math.min(L.path.length - 1, Math.floor((performance.now() - mazeT0) / 220));
  g2.strokeStyle = "rgba(124,201,255,.75)"; g2.lineWidth = Math.max(2, s2 * .12); g2.beginPath(); for (let i = 0; i <= k; i++) i ? g2.lineTo(cx(L.path[i]), cy(L.path[i])) : g2.moveTo(cx(L.path[i]), cy(L.path[i])); g2.stroke();
  const at = L.path[k], plan = L.shapes?.[Math.min(k, (L.shapes?.length || 1) - 1)] || null;
  if (plan) { g2.strokeStyle = "rgba(245,179,1,.9)"; g2.setLineDash([5, 4]); g2.lineWidth = 2; g2.beginPath(); let p = at; g2.moveTo(cx(p), cy(p));
    for (const a of plan) { const d = [[0, -1], [1, 0], [0, 1], [-1, 0]][a], x = p % n + d[0], y = (p / n | 0) + d[1]; if (x < 0 || y < 0 || x >= n || y >= n) break; p = y * n + x; g2.lineTo(cx(p), cy(p)); } g2.stroke(); g2.setLineDash([]); }
  g2.fillStyle = "#ff4d6d"; g2.beginPath(); g2.arc(cx(at), cy(at), s2 * .3, 0, 7); g2.fill();
}
// the transformation world: the board as raw symbols (a colour each, no names), the desired configuration outlined
let transShown = null, transT0 = 0;
function drawTrans() {
  const M = liveSnap?.transform, box = $("transBox"); if (!M) { box.hidden = true; return; } box.hidden = false;
  const p2 = v => v == null ? "—" : (100 * v).toFixed(0) + "%", T = M.test, L = M.last;
  $("transOut").innerHTML = `sarcini trăite <b>${M.played}</b> (rezolvate ${M.won}) · <b>configurații nevăzute: rezolvate ${p2(T?.solved)}</b>, pași/optim ${T?.ratio ? T.ratio.toFixed(2) : "—"}, predicții cauzale greșite ${p2(T?.failedRate)}, imposibile recunoscute ${T ? T.saidLimitation + "/" + T.impossible : "—"}` +
    (T?.knows ? `<br>a descoperit: ${T.knows.self} forme ale lui însuși · ${T.knows.moves} ieșiri care îl mișcă · ${T.knows.rules} reguli de transformare` : "") +
    (L ? `<br>sarcina #${L.i} (${L.goals.join(" + ")}): ${L.solved ? "<b style='color:var(--green)'>configurația dorită atinsă</b>" : L.said ? "a spus: imposibil de aici" : "neterminată"} în ${L.steps} pași (optim ${L.optimal}) · conturul punctat = configurația dorită` : "");
  if (!L?.frames?.length) return; if (transShown !== L) { transShown = L; transT0 = performance.now(); }
  const c = $("transCv"), g2 = c.getContext("2d"), n = L.n, s2 = Math.min(c.width, c.height) / n, ox = (c.width - n * s2) / 2, k = Math.min(L.frames.length - 1, Math.floor((performance.now() - transT0) / 260)), F = L.frames[k];
  const hue = v => v === 0 ? "#0b1118" : v === 1 ? "#24384c" : `hsl(${(v * 47) % 360},70%,${45 + (v % 3) * 8}%)`;
  g2.clearRect(0, 0, c.width, c.height);
  for (let i = 0; i < n * n; i++) { g2.fillStyle = hue(F.b[i]); g2.fillRect(ox + (i % n) * s2 + 1, (i / n | 0) * s2 + 1, s2 - 2, s2 - 2); }
  for (let i = 0; i < n * n; i++) if (L.goal[i] !== 17) { g2.strokeStyle = hue(L.goal[i]); g2.lineWidth = 3; g2.setLineDash([4, 3]); g2.strokeRect(ox + (i % n) * s2 + 3, (i / n | 0) * s2 + 3, s2 - 6, s2 - 6); g2.setLineDash([]); }
}
async function pullSelectedGraph() {
  const indicator = $("viewerStatus");
  try {
    const r = await fetch("/graph?w=" + liveW, {cache: "no-store"});
    if (!r.ok) {
      if (indicator) indicator.textContent = "Graful #" + liveW + " nu are încă o captură; caut un graf activ...";
      return false;
    }
    const gs = await r.json();
    if (!Array.isArray(gs.nodes)) return false;
    applySnap(gs);
    const M = gs.wholeMap, mbox = $("wholeMapBox");
    if (mbox) {
      mbox.hidden = !M;
      if (M) {
        const l = M.last;
        $("wholeMapOut").textContent = "Lumi absorbite: " + M.episodes + " | Rezolvate: " + M.solved +
         " | Succes: " + (100 * M.solveRate).toFixed(1) + "% | Ondă medie: " + M.meanWavePasses.toFixed(1) + "\n" +
         (l ? "Ultima lume: " + l.dimensions + "D, " + l.states + " stări, " + l.walls + " ziduri; " +
            l.steps + " pași / optim " + l.optimal + "; cursorul a emis: " + l.movementCharacters +
            "; traseu cunoscut înainte de primul caracter: " + l.plannedBeforeFirstCharacter +
            "\nMecanism: " + (M.plannerMode || "planificator pe harta completa") +
            (l.finalState ? "\nStarea finală a personajului: " + l.finalState : "") +
            "\nCALEA INTERNĂ (calculată înainte de mișcare):\n" + (l.internalPlannedStates || []).join(" → ") +
            "\nMIȘCĂRILE CURSORULUI:\n" + (l.movementTrace || []).map(v => v.step + ". " + v.from + " → " + v.to +
              " [" + v.nextCharacter + "]").join("\n") : "");
      }
    }
    const C = gs.selfCode, box = $("codeBox");
    if (box) {
      box.hidden = !C;
      if (C) {
        const pc = n => n == null ? "—" : (100 * n).toFixed(1) + "%";
        $("codeOut").textContent = "Trăite: " + C.episodes + " · portaluri: " + C.portalCost + " · predicții: " + pc(C.predictionAccuracy) +
          " · încuietoare: " + (C.unlocked ? "DESCHISĂ" : "ÎNCUIATĂ") + " · test nevăzut: " + pc(C.lockAccuracy) + " vs control " + pc(C.baseline) +
          " · modificări aprobate: " + C.codeEdits.length +
          (C.audit ? " · cod pe intrări nevăzute: " + pc(C.audit.heldoutInputs?.accuracy) +
          " · parametri noi: " + pc(C.audit.newParameterValues?.accuracy) +
          " · control permutat: " + pc(C.audit.permutedGeneLabels?.accuracy) : "");
        $("codeTrail").textContent = (C.portals || []).map(x => "#" + x.episode + " " + x.from + " → " + x.to +
          " | prezis " + (x.prediction ?? "?") + " observat " + x.observed).join("\n");
      }
    }
    const batch = gs.gpu?.batch;
    if (indicator) indicator.textContent = "VIZUALIZEZI GRAFUL #" + liveW +
      " · " + gs.nodes.length + " noduri · " + (gs.lived || 0).toLocaleString() +
      " momente · " + (data?.length || 0).toLocaleString() + " simboluri în viewer" +
      (batch ? " · " + batch.phase + " " + batch.done + "/" + batch.total : "");
    return true;
  } catch (err) {
    if (indicator) indicator.textContent = "Vizualizator #" + liveW + ": " + err.message;
    return false;
  }
}
async function livePull() {
  await pullSelectedGraph();
  try { const L = await (await fetch("/graphs", {cache: "no-store"})).json(); const p2 = v => v == null ? "—" : (100 * v).toFixed(1) + "%";
    const visible = chooseVisibleGraph(L.graphs, liveW, liveSelectionLocked);
    if (visible !== liveW) { liveW = visible; clearLive(); await pullSelectedGraph(); }
    $("corpus").textContent = `lumea pe care o devorează: ${L.world}`;
    // one card per graph: its own score in every world it lives, its state, and its own controls
    const pc = v => v == null ? "—" : (100 * v).toFixed(1) + "%";
    $("liveList").innerHTML = L.graphs.map(gr => `<div class="lgc${gr.w === liveW ? " on" : ""}" data-w="${gr.w}">
      <div class="t"><b>#${gr.w} ${gr.arm}</b> <span class="st${gr.status === "antrenează" ? " run" : ""}">${gr.status}</span>${gr.error ? ` · <span style="color:#ff4d6d">${String(gr.error).replace(/</g,"&lt;")}</span>` : ""} · ${gr.chars < 1e6 ? (gr.chars / 1e3).toFixed(1) + "k" : (gr.chars / 1e6).toFixed(2) + "M"}</div>
      <div class="sc">${gr.worlds.includes("text") ? `<span>text nevăzut</span><span>graful aliniat <b style='color:var(--green)'>${pc(gr.test?.aligned)}</b> · graf vechi <b>${pc(gr.test?.live)}</b> · cu câmpul <b>${pc(gr.test?.together)}</b> · C ${pc(gr.test?.C)}</span>` : ""}
        ${gr.worlds.includes("maze") ? `<span>labirinturi</span><span>nevăzute rezolvate <b>${pc(gr.maze?.test?.solved)}</b> · pași/optim ${gr.maze?.test?.ratio ? gr.maze.test.ratio.toFixed(2) : "—"} · forma ${pc(gr.maze?.test?.shape)} · trăite ${gr.maze?.played ?? 0}</span>` : ""}</div>
        ${gr.worlds.includes("transform") ? `<span>transformări</span><span>configurații nevăzute rezolvate <b>${pc(gr.transform?.test?.solved)}</b> · pași/optim ${gr.transform?.test?.ratio ? gr.transform.test.ratio.toFixed(2) : "—"} · predicții greșite ${pc(gr.transform?.test?.failedRate)} · imposibile recunoscute ${gr.transform?.test ? gr.transform.test.saidLimitation + "/" + gr.transform.test.impossible : "—"}</span>` : ""}
        ${gr.gpu ? `<span>GPU</span><span>${gr.gpu.error ? `<b style="color:#ff4d6d">${gr.gpu.error.slice(0, 120)}</b>` : `${gr.gpu.info?.name || gr.gpu.info?.device || gr.gpu.settings.device} · ${gr.gpu.maze?.batch ?? (gr.gpu.settings.worlds || gr.gpu.info?.autoWorlds || "auto")} lumi odată${gr.gpu.maze?.cardMs != null ? ` · lotul pe placă ${gr.gpu.maze.cardMs} ms, adunat în creier ${gr.gpu.maze.mergeMs} ms` : ""}${gr.gpu.text ? ` · text: ${gr.gpu.text.batch} exerciții pe lot, pe placă ${(gr.gpu.text.cardMs / 1000).toFixed(1)} s, adunate în creier ${gr.gpu.text.mergeMs} ms, ghicit în lot ${(100 * gr.gpu.text.acc).toFixed(1)}%` : ""} · ${gr.gpu.settings.util}% · VRAM ${gr.gpu.maze?.vramUsedGB ?? gr.gpu.transform?.vramUsedGB ?? "—"} / ${gr.gpu.settings.vram ? gr.gpu.settings.vram.toFixed(1) : (gr.gpu.info?.totalGB ?? "—")} GB${gr.gpu.batch ? ` · lot acum: ${gr.gpu.batch.phase} ${gr.gpu.batch.done}/${gr.gpu.batch.total}` : ""}`}</span>` : ""}
      <div class="bt"><button data-do="start" title="pornește / continuă antrenarea">▶</button><button data-do="pause" title="pauză">⏸</button><button data-do="save" title="salvează acum">💾</button><button data-do="reset" title="pornește de la 0">${armedNow(gr.w + "reset") ? "sigur?" : "⟲"}</button><button data-do="remove" title="scoate graful">${armedNow(gr.w + "remove") ? "sigur?" : "✕"}</button></div></div>`).join("");
    for (const c of $("liveList").querySelectorAll(".lgc")) {
      c.querySelector(".t").onclick = () => {
        liveW = +c.dataset.w; liveSelectionLocked = true;
        const url = new URL(location.href); url.searchParams.set("w", String(liveW));
        history.replaceState(null, "", url);
        nodes.clear(); edges.clear(); liveSnap = null; data = []; view.path = ""; view.mode = "inside"; nv.cam = {k: 0, w: "", x: 0, y: 0, S: 300}; nv.placed = false; livePull();
      };
      for (const b of c.querySelectorAll("button")) b.onclick = async ev => { ev.stopPropagation(); const act = b.dataset.do;
        if ((act === "reset" || act === "remove") && !armedNow(c.dataset.w + act)) { armed.set(c.dataset.w + act, performance.now() + 4000); b.textContent = "sigur?"; return; }
        armed.delete(c.dataset.w + act);
        await control(act, +c.dataset.w); if (act === "reset" && +c.dataset.w === liveW) clearLive(); }; }
    if (L.gpu && !gpuShown) { gpuShown = true; if (![...$("gpuDev").options].some(o => o.value === L.gpu.device)) $("gpuDev").add(new Option(L.gpu.device, L.gpu.device)); $("gpuDev").value = L.gpu.device; $("gpuWorlds").value = L.gpu.worlds; $("gpuTextBatch").value = L.gpu.textBatch || 8; $("gpuVram").value = L.gpu.vram; $("gpuUtil").value = L.gpu.util; $("gpuUtilOut").textContent = L.gpu.util; }
    if (!$("addArm").options.length && L.arms) $("addArm").innerHTML = L.arms.map(a => `<option${a === "stable+many" ? " selected" : ""}>${a}</option>`).join("");
  } catch { $("corpus").textContent = "trainerul nu răspunde"; }
}
const armed = new Map(), armedNow = k => (armed.get(String(k)) || 0) > performance.now();   // a reset or removal asks once more before it happens
const clearLive = () => { nodes.clear(); edges.clear(); liveSnap = null; data = []; nv.cam = {k: 0, w: "", x: 0, y: 0, S: 300}; nv.placed = false; };
async function control(act, w) { await fetch("/control?do=" + act + (w == null ? "" : "&w=" + w), {method: "POST"}).catch(() => {}); livePull(); }
$("liveReset").onclick = async () => { if (!confirmReset()) return; await control("reset"); clearLive(); };
$("allStart").onclick = () => control("start"); $("allPause").onclick = () => control("pause"); $("allSave").onclick = () => control("save");
$("gpuUtil").oninput = () => $("gpuUtilOut").textContent = $("gpuUtil").value;
$("gpuApply").onclick = async () => {
  try {
    const r = await fetch(`/gpu?device=${$("gpuDev").value}&worlds=${Math.max(0, +$("gpuWorlds").value | 0)}&textBatch=${Math.max(1, Math.min(128, +$("gpuTextBatch").value | 0))}&vram=${+$("gpuVram").value}&util=${+$("gpuUtil").value}`, {method: "POST"});
    if (!r.ok) {
      const detail = await r.json().catch(() => ({reason: "GPU settings rejected"}));
      alert(detail.reason || ("GPU settings rejected: HTTP " + r.status));
    }
  } catch (err) { alert("Nu pot aplica setările GPU: " + err.message); }
  livePull();
};
let gpuShown = false;
$("addGraph").onclick = async () => { const worlds = [$("addText").checked && "text", $("addMaze").checked && "maze", $("addTrans").checked && "transform", $("addCode").checked && "code", $("addMapText").checked && "maptext"].filter(Boolean); if (!worlds.length) return;
  await fetch(`/add?arm=${encodeURIComponent($("addArm").value)}&worlds=${worlds.join(",")}`, {method: "POST"}).catch(() => {}); livePull(); };
function confirmReset() { const b = $("liveReset"); if (b.dataset.armed) { delete b.dataset.armed; b.textContent = "⟲ Reset toate la 0"; return true; }
  b.dataset.armed = 1; b.textContent = "Sigur? apasă încă o dată"; setTimeout(() => { delete b.dataset.armed; b.textContent = "⟲ Reset toate la 0"; }, 4000); return false; }
function bootLive() {
  D = 5; rand = rng(7); nodes = new Map(); edges = new Map(); recent = {C: [], F: []}; strip = []; groups = []; geo = {U: new Map(), V: new Map(), B: new Map()}; data = [];
  chain = {A: [{wires: [], form: () => liveSnap?.form || ""}]}; running = false;
  $("livePanel").hidden = false; document.body.classList.add("live");
  livePull(); setInterval(livePull, 1500); loop();
}
if (LIVE) bootLive(); else
fetch("/corpus").then(r => r.json()).then(c => {
  corpus = c; $("corpus").textContent = `${c.name} · ${c.train.length} rânduri din care învață · ${c.held.length} rânduri ținute nevăzute`;
  const all = (c.train.join("\n") + "\n" + c.held.join("\n")); real5 = new Set(); for (let i = 0; i + 5 <= all.length; i++) real5.add(all.slice(i, i + 5));
  reset(); loop();
}).catch(err => { $("corpus").textContent = "Nu pot încărca /corpus: " + err; });

// ---- talking to the graph: the conversation goes to the selected graph (POST /chat), which writes the answer itself ----
{ let talk = []; const log = $("chatLog"), esc = t => t.replace(/[&<]/g, c => c === "&" ? "&amp;" : "&lt;");
  const add = (cls, html) => { const d = document.createElement("div"); d.className = "msg " + cls; d.innerHTML = html; log.append(d); log.scrollTop = log.scrollHeight; return d; };
  for (const id of ["cTemp", "cMax", "cHist"]) { const el = $(id), out = $(id + "Out"); el.oninput = () => out.textContent = el.value; }
  $("chatTab").onclick = () => { $("chatPane").classList.toggle("on"); $("chatW").textContent = "#" + liveW; $("chatIn").focus(); };
  $("chatClose").onclick = () => $("chatPane").classList.remove("on");
  $("chatClear").onclick = () => { talk = []; log.innerHTML = ""; };
  $("chatIn").onkeydown = ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); $("chatForm").requestSubmit(); } };
  $("chatForm").onsubmit = async ev => { ev.preventDefault(); const text = $("chatIn").value.trim(); if (!text) return;
    $("chatIn").value = ""; $("chatW").textContent = "#" + liveW; add("you", esc(text)); talk.push(["you", text]);
    if (!LIVE) { add("err", "Chat-ul vorbește cu grafurile din trainer: pornește START_V17.ps1 și deschide pagina lui."); return; }
    if (liveSnap?.worlds?.length === 1 && liveSnap.worlds[0] === "maptext") {
      add("err", "Acest creier a trăit numai labirinturi binare. Chatul de text încă nu a învățat limba naturală; răspunsurile repetate nu sunt soluții ale labirintului.");
      talk.pop(); return;
    }
    const opts = {T: +$("cTemp").value, max: +$("cMax").value, stopBlank: $("cStop").checked, learn: $("cLearn").checked}, keep = +$("cHist").value;
    const wait = add("him", "<span class='dim'>scrie…</span>"); $("chatSend").disabled = true;
    try { const r = await (await fetch("/chat", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({w: liveW, history: talk.slice(-(2 * keep + 1)), opts})})).json();
      if (r.error) { wait.className = "msg err"; wait.textContent = r.error; talk.pop(); }
      else { wait.innerHTML = esc(r.text || "(nimic)") + `<small>graful #${liveW} · T ${r.T} · ${r.text.length} simboluri${r.fromSave ? " · oprit: răspunde din ultimul save" : opts.learn ? " · a trăit conversația" : ""}</small>`; talk.push(["him", r.text]); } }
    catch (err) { wait.className = "msg err"; wait.textContent = "nu am putut ajunge la trainer: " + err.message; talk.pop(); }
    $("chatSend").disabled = false; };
}

// ---- the Evaluare tab: a copy from the save, on the CPU, on unseen labyrinths / text / desired configurations; first attempt ----
{ let R = null, kind = "maze", cur = 0, t0 = 0, evAgainNow = false, textPage = 0;
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]], pct = v => v == null ? "—" : (100 * v).toFixed(1) + "%", side = document.querySelector("aside.side");
  $("tabTrain").onclick = () => { side.classList.remove("evalOn"); $("tabTrain").classList.add("on"); $("tabEval").classList.remove("on"); };
  $("tabEval").onclick = () => { side.classList.add("evalOn"); $("tabEval").classList.add("on"); $("tabTrain").classList.remove("on"); $("evW").textContent = "#" + liveW; };
  $("evKind").onchange = () => { for (const el of document.querySelectorAll("#evalPane [data-k]")) el.hidden = el.dataset.k !== $("evKind").value; };
  const items = () => !R ? [] : kind === "maze" ? R.mazes : kind === "transform" ? R.tasks : R.exercises || [];
  for (const id of ["evT", "evNoise"]) $(id).oninput = () => $(id + "Out").textContent = $(id).value;
  const show = i => { const L = items(); if (!L.length) return; cur = (i + L.length) % L.length; textPage = 0; t0 = performance.now(); table(); if (kind === "text") textView(); };
  const table = () => { const L = items(); if (!L.length) { $("evalTab").innerHTML = ""; return; }
    if (kind === "text") { $("evalTab").innerHTML = "<table><tr><th align=left>exercițiu</th><th>răspunsul (soluția) ghicit</th><th>tot exercițiul</th><th>graful vechi, pe răspuns</th><th>forma scrisă înainte</th></tr>" + L.map((m, i) => `<tr data-i="${i}" style="cursor:pointer;${i === cur ? "color:var(--gold)" : ""}"><td>${m.n} caractere</td><td align=center><b>${pct(m.answer)}</b></td><td align=center>${pct(m.all)}</td><td align=center>${pct(m.oldAnswer)}</td><td align=center>${pct(m.shapeSame)}</td></tr>`).join("") + "</table>";
      for (const tr of $("evalTab").querySelectorAll("tr[data-i]")) tr.onclick = () => show(+tr.dataset.i); return; }
    $("evalTab").innerHTML = kind === "maze"
      ? "<table><tr><th align=left>labirint</th><th>forma prezisă înainte</th><th>a ajuns</th><th>pași / optim</th><th>pași după formă / explorare</th></tr>" + L.map((m, i) => `<tr data-i="${i}" style="cursor:pointer;${i === cur ? "color:var(--gold)" : ""}"><td>${m.n}×${m.n}</td><td align=center>${pct(m.first)}</td><td align=center>${m.solved ? "<b style='color:var(--green)'>da</b>" : "nu"}</td><td align=center>${m.steps} / ${m.optimal}</td><td align=center>${m.how?.plan ?? 0} / ${m.how?.explore ?? 0}</td></tr>`).join("") + "</table>"
      : "<table><tr><th align=left>sarcina</th><th>rezultat</th><th>pași / optim</th><th>predicții greșite</th></tr>" + L.map((m, i) => `<tr data-i="${i}" style="cursor:pointer;${i === cur ? "color:var(--gold)" : ""}"><td>${m.impossible ? "imposibilă" : m.goals.join(" + ")} ${m.n}×${m.n}</td><td align=center>${m.impossible ? (m.said ? "<b style='color:var(--green)'>a spus: imposibil</b>" : "n-a recunoscut") : m.solved ? "<b style='color:var(--green)'>atinsă</b>" : m.said ? "a spus imposibil" : "nu"}</td><td align=center>${m.steps} / ${m.optimal ?? "—"}</td><td align=center>${m.predicted ? m.failed + "/" + m.predicted : "—"}</td></tr>`).join("") + "</table>";
    for (const tr of $("evalTab").querySelectorAll("tr[data-i]")) tr.onclick = () => show(+tr.dataset.i); };
  const textView = () => {
    const X = kind === "text" && R.exercises ? R.exercises[cur] : R, T = X.rows || [], a0 = X.a0 ?? -1;
    const esc = c => c === 60 ? "&lt;" : c === 38 ? "&amp;" : c === 10 ? "⏎\n" : c < 32 || c > 126 ? "·" : String.fromCharCode(c);
    // Evaluation is performed on ALL selected characters. Only DOM rendering is paged to prevent
    // thousands of spans from freezing the main viewer with 100k+ character exercises.
    const PAGE = 2048, pages = Math.max(1, Math.ceil(T.length / PAGE));
    textPage = Math.max(0, Math.min(pages - 1, textPage));
    const start = textPage * PAGE, end = Math.min(T.length, start + PAGE);
    const nav = T.length > PAGE ?
      `<div class="row" style="margin:7px 0"><button type="button" data-text-nav="prev" ${!textPage ? "disabled" : ""}>◀ caractere</button><span class="dim">${(start + 1).toLocaleString()}–${end.toLocaleString()} / ${T.length.toLocaleString()} · pagina ${textPage + 1}/${pages}</span><button type="button" data-text-nav="next" ${textPage === pages - 1 ? "disabled" : ""}>caractere ▶</button>${a0 >= 0 ? '<button type="button" data-text-nav="answer">▸ răspuns</button>' : ""}</div>` : "";
    const visible = T.slice(start, end).map(([y, g], i) => (start + i === a0 ? `<b style="color:var(--gold)">▸ </b>` : "") + `<span class="${y === g ? "eh" : "em"}" title="a ghicit: ${esc(g)}">${esc(y)}</span>`).join("");
    const shape = X.shape != null ? `<div style="margin-top:10px;color:var(--gold)">forma soluției, scrisă de el din întrebare, ÎNAINTE să vadă răspunsul (${(100 * (X.shapeSame || 0)).toFixed(0)}% din caractere la locul lor):</div><div style="color:#e6c56a">${Array.from(X.shape, c => esc(c.charCodeAt(0))).join("")}</div>` : "";
    $("evalText").innerHTML = nav + visible + shape;
    for (const button of $("evalText").querySelectorAll("button[data-text-nav]")) button.onclick = () => {
      const direction = button.dataset.textNav;
      textPage = direction === "prev" ? textPage - 1 : direction === "next" ? textPage + 1 : Math.floor(Math.max(0, a0) / PAGE);
      textView();
    };
  };
  $("evGo").onclick = async () => {
    if (!LIVE) { $("evOut").textContent = "Evaluarea rulează pe grafurile din trainer (START_V17.ps1)."; return; }
    const again = evAgainNow; evAgainNow = false; if (!again) kind = $("evKind").value;
    if (kind === "maptext") {
      $("evW").textContent = "#" + liveW;
      $("evGo").disabled = true;
      $("evCv").hidden = true; $("evalText").hidden = true;
      $("evOut").textContent = "Testez doar algoritmul prestabilit pe hărți generate separat; nu este o evaluare a unui navigator învățat.";
      try {
        const seed = again && R?.seed != null ? R.seed : (Math.floor(Date.now() / 1000) >>> 0);
        const response = await fetch("/maptext-audit?w=" + liveW + "&count=16&seed=" + seed, {cache: "no-store"});
        const result = await response.json();
        if (result.error) { $("evOut").textContent = result.error; R = null; }
        else {
          R = result;
          $("evOut").textContent = "ALGORITM PRESTABILIT: " + result.solved + "/" + result.count +
            " hărți rezolvate; " + (100 * result.optimalRate).toFixed(1) +
            "% trasee optime; " + result.totalMillis.toFixed(1) +
            " ms. TEST DE ÎNVĂȚARE: NEDISPONIBIL — nu există încă un model care construiește singur căile.";
          $("evalTab").textContent = result.cases.map((c,i) => "#" + (i+1) + " " + c.dimensions +
            "D · " + c.nodes + " stări · " + c.walls + " ziduri · " + c.steps +
            " pași / optim " + c.optimal + " · coliziuni " + c.collisions).join("\n");
          $("evalTab").style.whiteSpace = "pre-wrap";
        }
      } catch (err) { $("evOut").textContent = "Eroare test hărți N-D: " + err.message; R = null; }
      $("evGo").disabled = false;
      return;
    }
    const opts = kind === "maze" ? {sizes: $("evSizes").value.split(",").map(Number).filter(n => n >= 5 && n % 2 && n <= 61), per: +$("evPer").value || 1}
      : kind === "text" ? {text: $("evTextIn").value, count: +$("evNum").value || 12, max: $("evMax").value === "" ? 20000 : Number($("evMax").value)} : {count: +$("evCount").value || 12, impossible: +$("evImp").value || 0};
    opts.T = +$("evT").value; opts.noise = +$("evNoise").value; if (again && R) { opts.again = true; if (R.seed != null) opts.seed = R.seed; if (kind === "maze") opts.sizes = R.mazes.map(m => m.n).filter((v, i, A) => A.indexOf(v) === i); }
    $("evW").textContent = "#" + liveW; $("evOut").textContent = "graful #" + liveW + " se salvează și copia lui dă evaluarea pe CPU…"; $("evGo").disabled = true; R = null; $("evalTab").innerHTML = "";
    try { const r = await (await fetch("/eval", {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({w: liveW, kind, opts})})).json();
      if (r.error) $("evOut").textContent = r.error;
      else { R = r; const head = `graful #${r.w}, după ${(r.lived || 0).toLocaleString()} pași trăiți: `;
        $("evCv").hidden = kind === "text"; $("evalText").hidden = kind !== "text"; $("evT").value = r.T ?? $("evT").value;
        if (kind === "maze") { const ok = r.mazes.filter(m => m.solved).length, sh = r.mazes.reduce((a, m) => a + (m.first || 0), 0) / r.mazes.length;
          $("evOut").innerHTML = head + `<b>${ok}/${r.mazes.length} rezolvate din prima</b> · forma prezisă dinainte, în medie <b>${pct(sh)}</b> corectă · auriu punctat = ce prezice înainte de prima mișcare, albastru = pe unde a mers` + (r.mind ? `<br><span class="dim">încrederea în formă ${r.mind.trust.plan[0]}/${r.mind.trust.plan[1]} · în explorare ${r.mind.trust.explore[0]}/${r.mind.trust.explore[1]} (urmează forma doar dacă prima ≥ 0.9 × a doua) · ieșiri al căror efect îl știe: ${r.mind.effects.map((e, o) => e ? "▶" + o + "→(" + e + ")" : null).filter(Boolean).join(" ") || "niciuna"}${r.mind.gpu ? ` · ultimul lot GPU: ${r.mind.gpu.batch} lumi, ${r.mind.gpu.differ ?? 0} unde rezultatul de pe placă diferă de cel trăit` : ""}</span>` : ""); }
        else if (kind === "transform") { const T = r.tasks.filter(t => !t.impossible), I = r.tasks.filter(t => t.impossible), pred = T.reduce((a, t) => a + t.predicted, 0);
          $("evOut").innerHTML = head + `<b>${T.filter(t => t.solved).length}/${T.length} configurații nevăzute atinse din prima</b> · predicții cauzale greșite ${pred ? pct(T.reduce((a, t) => a + t.failed, 0) / pred) : "—"} · imposibile recunoscute ${I.filter(t => t.said).length}/${I.length} · conturul punctat = configurația dorită`; }
        else { $("evOut").innerHTML = head + `${r.exercises.length} ${r.source}, de la cel mai mic la cel mai mare, temperatura ${r.T}, zgomot ${r.noise}: <b>răspunsul (soluția) ghicit din prima ${pct(r.answer)}</b> · tot exercițiul ${pct(r.all)} · graful vechi pe răspuns ${pct(r.oldAnswer)}<br><span class="dim">verde = ghicit, roșu = greșit, ▸ = de aici începe răspunsul; ține mouse-ul pe o literă: ce a ghicit în locul ei. Fiecare apăsare trage alte exerciții.</span>`; }
        show(0); } }
    catch (err) { $("evOut").textContent = "nu am putut ajunge la trainer: " + err.message; }
    $("evGo").disabled = false; };
  $("evAgain").onclick = () => { if (!R) return; evAgainNow = true; $("evGo").click(); };
  $("evPrev").onclick = () => show(cur - 1); $("evNext").onclick = () => show(cur + 1);
  const hue = v => v === 0 ? "#0b1118" : v === 1 ? "#24384c" : `hsl(${(v * 47) % 360},70%,${45 + (v % 3) * 8}%)`;
  const draw = () => { requestAnimationFrame(draw); if (!R || kind === "text" || !side.classList.contains("evalOn")) return; const L = items()[cur]; if (!L) return;
    const c = $("evCv"), g = c.getContext("2d"), n = L.n, s = Math.min(c.width, c.height) / n, ox = (c.width - n * s) / 2, sp = +$("evSpeed").value, el = performance.now() - t0;
    const cx = i => ox + (i % n + .5) * s, cy = i => ((i / n | 0) + .5) * s; g.clearRect(0, 0, c.width, c.height);
    if (kind === "maze") { const hold = 1800, k = el < hold ? 0 : Math.min(L.path.length - 1, Math.floor((el - hold) / sp));
      for (let i = 0; i < n * n; i++) { g.fillStyle = L.wall[i] ? "#1d2b3a" : "#070b10"; g.fillRect(ox + (i % n) * s, (i / n | 0) * s, s - .5, s - .5); }
      g.fillStyle = "rgba(61,220,132,.85)"; g.beginPath(); g.arc(cx(L.goal), cy(L.goal), s * .34, 0, 7); g.fill();
      const line = (from, plan, style, w, dash) => { if (!plan) return; g.strokeStyle = style; g.lineWidth = w; g.setLineDash(dash); g.beginPath(); let p = from; g.moveTo(cx(p), cy(p));
        for (const a of plan) { const x = p % n + DIRS[a][0], y = (p / n | 0) + DIRS[a][1]; if (x < 0 || y < 0 || x >= n || y >= n) break; p = y * n + x; g.lineTo(cx(p), cy(p)); } g.stroke(); g.setLineDash([]); };
      if (el < hold) line(L.start, L.shapes[0], "rgba(245,179,1,.95)", Math.max(2, s * .16), [6, 4]);
      else { line(L.start, L.shapes[0], "rgba(245,179,1,.25)", Math.max(1.5, s * .08), [4, 4]);
        g.strokeStyle = "rgba(124,201,255,.85)"; g.lineWidth = Math.max(2, s * .14); g.beginPath(); for (let i = 0; i <= k; i++) i ? g.lineTo(cx(L.path[i]), cy(L.path[i])) : g.moveTo(cx(L.path[i]), cy(L.path[i])); g.stroke();
        line(L.path[k], L.shapes[Math.min(k, L.shapes.length - 1)], "rgba(245,179,1,.9)", 2, [5, 4]); }
      g.fillStyle = "#ff4d6d"; g.beginPath(); g.arc(cx(L.path[k]), cy(L.path[k]), s * .32, 0, 7); g.fill();
      g.fillStyle = "#e6f3ff"; g.font = "13px system-ui"; g.fillText(`${n}×${n} · ${el < hold ? "forma prezisă înainte de prima mișcare" : `pasul ${k} / ${L.steps} (optim ${L.optimal})`}`, 8, c.height - 8);
      if (el > hold + sp * (L.path.length + 6) && cur < R.mazes.length - 1) show(cur + 1); }
    else { const k = Math.min(L.frames.length - 1, Math.floor(el / sp)), F = L.frames[k].b;
      for (let i = 0; i < n * n; i++) { g.fillStyle = hue(F[i]); g.fillRect(ox + (i % n) * s + 1, (i / n | 0) * s + 1, s - 2, s - 2);
        if (L.goal[i] !== 17) { g.strokeStyle = hue(L.goal[i]); g.lineWidth = 3; g.setLineDash([4, 3]); g.strokeRect(ox + (i % n) * s + 3, (i / n | 0) * s + 3, s - 6, s - 6); g.setLineDash([]); } }
      g.fillStyle = "#e6f3ff"; g.font = "13px system-ui"; g.fillText(`${L.impossible ? "imposibilă" : L.goals.join(" + ")} · pasul ${k} / ${L.steps}${L.frames[k].how ? " · " + L.frames[k].how : ""}`, 8, c.height - 8);
      if (el > sp * (L.frames.length + 8) && cur < R.tasks.length - 1) show(cur + 1); } };
  requestAnimationFrame(draw); }

// ---- determinism ↔ randomness, noise: in live mode every slider acts on the graph that is learning ----
{ const keys = ["ltemp", "pnoise", "gnoise", "glr", "repel", "wtemp", "ttemp"]; let timer = null, shownFor = -1;
  const send = () => { const q = keys.map(k => k + "=" + encodeURIComponent($(k).value)).join("&");
    fetch(`/controls?${$("ctlAll").checked ? "" : "w=" + liveW + "&"}${q}`, {method: "POST"}).then(r => r.json()).then(r => {
      $("ctlOut").textContent = `aplicat grafului ${r.graphs.map(w => "#" + w).join(", ")}: ` + Object.entries(r.applied).map(([k, v]) => k + " " + v).join(" · "); }).catch(err => $("ctlOut").textContent = err.message); };
  if (LIVE) for (const k of keys) $(k).addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(send, 350); });
  // when a graph is chosen, the sliders show what that graph lives with
  setInterval(() => { if (!LIVE || !liveSnap?.controls || shownFor === liveW) return; shownFor = liveW;
    for (const k of keys) if (liveSnap.controls[k] != null) { $(k).value = liveSnap.controls[k]; const o = $(k + "Out"); if (o) o.textContent = liveSnap.controls[k]; } }, 500);
}
