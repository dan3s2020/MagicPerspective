// V16 — the living fabric. Everything drawn comes from the organism: its learned weights (edges, spring strengths),
// its activations at every step (node glow, particles), B's perspective (gold halos), A's choices and resistance.
import {Organism, makeMaze, evaluate, seedOf, SEEDS, RNG, ACTIONS} from './engine.mjs';

const $ = id => document.getElementById(id);
const LEVEL_COL = ['#7cc9ff', '#36d1c4', '#a78bfa', '#f5b301'];
const CONCEPT = {free: {name: 'liber', col: '#dfe9f5'}, wall: {name: 'perete', col: '#6f84a3'}, out: {name: 'în afară', col: '#2d3a4f'}};
const ARROWS = ['↑', '→', '↓', '←'];
let orgs = {ab: new Organism({seed: 7, bodies: true}), ctrl: new Organism({seed: 7, bodies: false})};
let who = 'ab', world = null, frames = [], fi = 0, playing = true, speed = 5, lastAdv = 0, training = false, trainEp = 0, curve = [], rngA = new RNG(11), rngC = new RNG(11);

// ---------------- the graph: nodes and their physics ----------------
let nodes = [], byId = {}, edges = [], particles = [], waves = [], drag = null;
function buildGraph() {
  const org = orgs[who], L = org.L, U = org.U, H = org.H; nodes = []; byId = {};
  const add = (id, type, x, y, extra = {}) => { const n = {id, type, x: x + (Math.random() - .5) * .05, y: y + (Math.random() - .5) * .05, vx: 0, vy: 0, act: 0, ...extra}; nodes.push(n); byId[id] = n; return n; };
  // the loop of levels: anchors on a ring (α left, Ω next to it at the top: they are neighbours)
  const anchor = l => { const a = Math.PI + 2 * Math.PI * l / L * -1; return [0.05 + 0.42 * Math.cos(a), 0.0 + 0.42 * Math.sin(a)]; };
  for (let i = 0; i < H; i++) { const l = Math.floor(i / U), [ax, ay] = anchor(l); add('u' + i, 'unit', ax, ay, {level: l, anchor: [ax, ay]}); }
  for (let c = 0; c < 9; c++) add('c' + c, 'cell', -1.05 + (c % 3) * 0.09, -0.15 + Math.floor(c / 3) * 0.09, {anchor: [-1.05 + (c % 3) * 0.09, -0.15 + Math.floor(c / 3) * 0.09], cell: c});
  add('free', 'concept', -0.92, -0.45, {anchor: [-0.92, -0.45], key: 'free'}); add('wall', 'concept', -0.92, 0.38, {anchor: [-0.92, 0.38], key: 'wall'}); add('out', 'concept', -1.1, 0.5, {anchor: [-1.1, 0.5], key: 'out'});
  add('target', 'target', -0.7, -0.62, {anchor: [-0.7, -0.62]});
  add('A', 'A', -0.42, 0.28, {anchor: [-0.42, 0.28]});
  if (org.bodies) add('B', 'B', 0.05, -0.64, {anchor: [0.05, -0.64]});
  for (let a = 0; a < 4; a++) add('act' + a, 'action', -0.62 + a * 0.13, 0.62, {anchor: [-0.62 + a * 0.13, 0.62], a});
  refreshEdges();
}
// edges from the LEARNED weights: re-read regularly, so the graph reorganizes while the organism learns
function refreshEdges() {
  const org = orgs[who], P = org.P, L = org.L, U = org.U, H = org.H; edges = [];
  const W = P.W.d, mask = org.mask.d, cand = [];
  for (let i = 0; i < H; i++) for (let j = 0; j < H; j++) if (i !== j && mask[i * H + j]) cand.push([Math.abs(W[i * H + j]), i, j, W[i * H + j]]);
  cand.sort((a, b) => b[0] - a[0]); const mx = cand[0]?.[0] || 1;
  for (const [m, i, j, w] of cand.slice(0, 150)) edges.push({a: 'u' + i, b: 'u' + j, w: m / mx, sign: Math.sign(w), kind: 'ring'});
  const Ux = P.Ux.d;   // the world's concepts enter α
  const fr = frames[fi];
  for (let c = 0; c < 9; c++) { const k = fr ? (fr.obs[c * 3] ? 0 : fr.obs[c * 3 + 1] ? 1 : 2) : 0, row = (c * 3 + k) * U, s = [];
    for (let u = 0; u < U; u++) s.push([Math.abs(Ux[row + u]), u]); s.sort((a, b) => b[0] - a[0]);
    for (const [m, u] of s.slice(0, 2)) edges.push({a: 'c' + c, b: 'u' + u, w: Math.min(1, m * 1.5), kind: 'world'});
    edges.push({a: 'c' + c, b: ['free', 'wall', 'out'][k], w: 0.6, kind: 'concept'}); }
  const tg = []; for (let u = 0; u < U; u++) tg.push([Math.hypot(Ux[27 * U + u], Ux[28 * U + u]), u]); tg.sort((a, b) => b[0] - a[0]);
  for (const [m, u] of tg.slice(0, 4)) edges.push({a: 'target', b: 'u' + u, w: Math.min(1, m), kind: 'target'});
  if (org.bodies) {
    const rowN = (M, cols, r) => { let s = 0; for (let c = 0; c < cols; c++) s += M.d[r * cols + c] ** 2; return Math.sqrt(s); };
    const a1 = []; for (let u = 0; u < U; u++) a1.push(rowN(P.Wa1, 24, u)); const am = Math.max(...a1);
    a1.forEach((v, u) => edges.push({a: 'u' + u, b: 'A', w: v / am, kind: 'toA'}));
    const b1 = []; for (let u = 0; u < U; u++) b1.push(rowN(P.Wb1, 16, u)); const bm = Math.max(...b1);
    b1.forEach((v, u) => edges.push({a: 'u' + ((L - 1) * U + u), b: 'B', w: v / bm, kind: 'toB'}));
  } else {
    const a1 = []; for (let u = 0; u < H; u++) { let s = 0; for (let c = 0; c < 24; c++) s += P.Wc1.d[u * 24 + c] ** 2; a1.push([Math.sqrt(s), u]); }
    a1.sort((x, y) => y[0] - x[0]); const am = a1[0][0]; for (const [v, u] of a1.slice(0, 20)) edges.push({a: 'u' + u, b: 'A', w: v / am, kind: 'toA'});
  }
  for (let a = 0; a < 4; a++) edges.push({a: 'A', b: 'act' + a, w: 0.7, kind: 'act'});
}
function physics() {
  const N = nodes.length;
  for (let i = 0; i < N; i++) { const p = nodes[i]; for (let j = i + 1; j < N; j++) { const q = nodes[j]; let dx = q.x - p.x, dy = q.y - p.y, d2 = dx * dx + dy * dy + 1e-4;
    if (d2 > 0.25) continue; const f = 0.00012 / d2; dx *= f; dy *= f; p.vx -= dx; p.vy -= dy; q.vx += dx; q.vy += dy; } }
  for (const e of edges) { const p = byId[e.a], q = byId[e.b]; if (!p || !q) continue; const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) + 1e-6;
    const rest = 0.1 + 0.2 / (1 + 3 * e.w), k = 0.004 * (0.3 + e.w), f = k * (d - rest) / d; p.vx += f * dx; p.vy += f * dy; q.vx -= f * dx; q.vy -= f * dy; }
  // nodes active at the same moment attract each other: the active shape gathers (the island)
  const act = nodes.filter(n => n.type === 'unit' && n.act > 0.55);
  for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) { const p = act[i], q = act[j], dx = q.x - p.x, dy = q.y - p.y, f = 0.0006 * p.act * q.act; p.vx += f * dx; p.vy += f * dy; q.vx -= f * dx; q.vy -= f * dy; }
  for (const n of nodes) { if (n.anchor) { const k = n.type === 'unit' ? 0.0025 : 0.02; n.vx += k * (n.anchor[0] - n.x); n.vy += k * (n.anchor[1] - n.y); }
    if (drag && drag.n === n) continue; n.vx *= 0.86; n.vy *= 0.86; n.x += n.vx; n.y += n.vy; }
}

// ---------------- a recorded life ----------------
function newWorld() {
  const n = Number($('size').value), seed = seedOf(SEEDS.test + 777, Math.floor(Math.random() * 1e6));
  world = makeMaze(seed, n); const res = orgs[who].live(world, {record: true}); frames = res.frames; fi = 0; buildGraph(); onFrame();
}
function onFrame() {
  const fr = frames[fi], org = orgs[who]; if (!fr) return;
  for (let i = 0; i < org.H; i++) byId['u' + i].act = Math.min(1, Math.abs(fr.h[i]) * 1.3);
  byId.A.act = 1; for (let a = 0; a < 4; a++) byId['act' + a].act = fr.probs[a];
  if (fi % 4 === 0) refreshEdges();
  // particles: the world enters α (cyan), messages travel around the loop (white), α → A (red), Ω → B (gold), A → action
  for (const e of edges) { const p = byId[e.a];
    const s = e.kind === 'world' ? 0.8 * e.w : e.kind === 'ring' ? 0.5 * e.w * (p?.act || 0) : e.kind === 'toA' ? 0.6 * e.w * (p?.act || 0) : e.kind === 'toB' ? 0.6 * e.w * (p?.act || 0) : e.kind === 'target' ? 0.5 * e.w : 0;
    if (Math.random() < s) particles.push({a: e.a, b: e.b, t: 0, v: 0.025 + 0.02 * Math.random(), kind: e.kind}); }
  if (fr.a >= 0) particles.push({a: 'A', b: 'act' + fr.a, t: 0, v: 0.035, kind: 'act', big: true});
  if (!fr.ok || fr.resist > 0.5) { waves.push({id: 'A', t: 0, col: '#ff4d6d'}); for (let u = 0; u < org.U; u++) if (Math.random() < 0.5) particles.push({a: 'A', b: 'u' + u, t: 0, v: 0.03, kind: 'resist'}); }
  if (fi === frames.length - 1 && fr.pos === world.goal) waves.push({id: 'target', t: 0, col: '#3ddc84'});
  probsView(); mazeView();
}

// ---------------- drawing ----------------
const PCOL = {world: '#22d3ee', ring: '#e8f4ff', toA: '#ff4d6d', toB: '#f5b301', target: '#3ddc84', act: '#22d3ee', resist: '#ff4d6d'};
function view(cv) { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(r.width * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return {g, w: r.width, h: r.height}; }
let T2S = null;
function draw(now) {
  const {g, w, h} = view($('g')); g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
  const s = Math.min(w / 2.5, h / 1.65), cx = w * 0.53, cy = h * 0.53, X = n => cx + n.x * s, Y = n => cy + n.y * s; T2S = {s, cx, cy};
  const fr = frames[fi], org = orgs[who];
  g.globalCompositeOperation = 'lighter';
  // edges
  for (const e of edges) { const p = byId[e.a], q = byId[e.b]; if (!p || !q) continue;
    const col = e.kind === 'ring' ? (e.sign > 0 ? '200,225,255' : '160,140,255') : e.kind === 'world' ? '34,211,238' : e.kind === 'concept' ? '160,175,200' : e.kind === 'toA' ? '255,77,109' : e.kind === 'toB' ? '245,179,1' : e.kind === 'target' ? '61,220,132' : '34,211,238';
    g.strokeStyle = `rgba(${col},${0.05 + 0.3 * e.w})`; g.lineWidth = 0.5 + 1.5 * e.w; g.beginPath(); g.moveTo(X(p), Y(p)); g.lineTo(X(q), Y(q)); g.stroke(); }
  // B's perspective: gold beams from B to the levels it lets A see, and gold halos on those levels
  if (org.bodies && fr) { const B = byId.B;
    for (let l = 0; l < org.L; l++) { const us = nodes.filter(n => n.type === 'unit' && n.level === l), mx = us.reduce((a, n) => a + n.x, 0) / us.length, my = us.reduce((a, n) => a + n.y, 0) / us.length;
      g.strokeStyle = `rgba(245,179,1,${0.08 + 0.7 * fr.pi[l]})`; g.lineWidth = 1 + 6 * fr.pi[l]; g.beginPath(); g.moveTo(X(B), Y(B)); g.lineTo(cx + mx * s, cy + my * s); g.stroke();
      for (const n of us) { g.fillStyle = `rgba(245,179,1,${0.12 * fr.pi[l]})`; g.beginPath(); g.arc(X(n), Y(n), 14, 0, 7); g.fill(); } } }
  // particles
  particles = particles.filter(p => p.t < 1);
  for (const p of particles) { const a = byId[p.a], b = byId[p.b]; if (!a || !b) { p.t = 1; continue; } p.t += p.v * speedFactor();
    const x = X(a) + (X(b) - X(a)) * p.t, y = Y(a) + (Y(b) - Y(a)) * p.t, r = p.big ? 5 : 2.2;
    const gr = g.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, PCOL[p.kind]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 3, 0, 7); g.fill(); }
  // nodes
  for (const n of nodes) { const x = X(n), y = Y(n);
    if (n.type === 'unit') { const c = LEVEL_COL[n.level], r = 3 + 6 * n.act; const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.6); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.25 + 0.75 * n.act; g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.6, 0, 7); g.fill(); g.globalAlpha = 1; g.fillStyle = c; g.beginPath(); g.arc(x, y, r * 0.6, 0, 7); g.fill(); }
    else if (n.type === 'cell') { const k = fr ? (fr.obs[n.cell * 3] ? 'free' : fr.obs[n.cell * 3 + 1] ? 'wall' : 'out') : 'free'; g.globalCompositeOperation = 'source-over';
      g.fillStyle = CONCEPT[k].col; g.fillRect(x - 7, y - 7, 14, 14); if (n.cell === 4) { g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } g.globalCompositeOperation = 'lighter'; }
    else if (n.type === 'concept') { const c = CONCEPT[n.key]; g.globalCompositeOperation = 'source-over'; g.fillStyle = c.col; g.beginPath(); g.arc(x, y, 11, 0, 7); g.fill();
      g.fillStyle = '#cfe0f5'; g.font = '12px system-ui'; g.fillText(c.name, x + 14, y + 4); g.globalCompositeOperation = 'lighter'; }
    else if (n.type === 'target') { const pul = 9 + 3 * Math.sin(now / 300); g.fillStyle = 'rgba(61,220,132,.9)'; star(g, x, y, pul); g.fillStyle = '#9ff0c4'; g.font = '12px system-ui'; g.fillText('țintă', x + 14, y + 4); }
    else if (n.type === 'A' || n.type === 'B') { const c = n.type === 'A' ? '#ff4d6d' : '#f5b301', r = 15; const gr = g.createRadialGradient(x, y, 0, x, y, r * 2.2); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 2.2, 0, 7); g.fill(); g.globalCompositeOperation = 'source-over'; g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = '#000'; g.font = 'bold 14px system-ui'; g.fillText(org.bodies ? n.type : 'cap', x - (org.bodies ? 5 : 11), y + 5); g.globalCompositeOperation = 'lighter'; }
    else if (n.type === 'action') { const pr = n.act, chosen = fr && fr.a === n.a, r = 8 + 12 * pr;
      g.fillStyle = `rgba(34,211,238,${0.2 + 0.8 * pr})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); if (chosen) { g.strokeStyle = fr.ok ? '#22d3ee' : '#ff4d6d'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r + 4, 0, 7); g.stroke(); }
      g.globalCompositeOperation = 'source-over'; g.fillStyle = '#001018'; g.font = 'bold 14px system-ui'; g.fillText(ARROWS[n.a], x - 6, y + 5); g.globalCompositeOperation = 'lighter'; } }
  // level labels
  for (let l = 0; l < org.L; l++) { const us = nodes.filter(n => n.type === 'unit' && n.level === l), mx = us.reduce((a, n) => a + n.x, 0) / us.length, my = us.reduce((a, n) => a + n.y, 0) / us.length;
    g.fillStyle = LEVEL_COL[l]; g.font = 'bold 13px system-ui'; g.fillText(l === 0 ? 'α' : l === org.L - 1 ? 'Ω' : String(l + 1), cx + mx * s + 26, cy + my * s - 26); }
  // waves: resistance (red) and arrival (green)
  waves = waves.filter(wv => wv.t < 1); for (const wv of waves) { const n = byId[wv.id]; if (!n) continue; wv.t += 0.03; g.strokeStyle = wv.col; g.globalAlpha = 1 - wv.t; g.lineWidth = 3; g.beginPath(); g.arc(X(n), Y(n), 10 + 80 * wv.t, 0, 7); g.stroke(); g.globalAlpha = 1; }
  g.globalCompositeOperation = 'source-over';
}
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a)); } g.closePath(); g.fill(); }
const speedFactor = () => 0.6 + speed / 8;

function mazeView() {
  const {g, w, h} = view($('maze')); g.fillStyle = '#0a121c'; g.fillRect(0, 0, w, h); if (!world) return;
  const n = world.n, c = Math.min(w, h) / n, fr = frames[fi];
  const seen = new Set(); for (let k = 0; k <= fi; k++) { const p = frames[k].pos, x = p % n, y = (p / n) | 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < n && Y < n) seen.add(Y * n + X); } }
  for (let i = 0; i < n * n; i++) { const x = i % n, y = (i / n) | 0; g.fillStyle = world.wall[i] ? '#3a4a63' : '#dfe9f5'; g.fillRect(x * c + .5, y * c + .5, c - 1, c - 1);
    if (!seen.has(i)) { g.fillStyle = 'rgba(5,10,18,.55)'; g.fillRect(x * c + .5, y * c + .5, c - 1, c - 1); } }
  const ctr = p => [(p % n + .5) * c, (((p / n) | 0) + .5) * c];
  g.strokeStyle = 'rgba(255,77,109,.45)'; g.lineWidth = c * .18; g.lineCap = 'round'; g.beginPath(); for (let k = 0; k <= fi; k++) { const [x, y] = ctr(frames[k].pos); k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  // B's shape of the way: its next K moves, before they happen
  if (fr && fr.plan.length) { let p = fr.pos; g.strokeStyle = '#f5b301'; g.setLineDash([c * .25, c * .18]); g.lineWidth = c * .1; g.beginPath(); let [x, y] = ctr(p); g.moveTo(x, y);
    for (const a of fr.plan) { const X = p % n + ACTIONS[a][0], Y = ((p / n) | 0) + ACTIONS[a][1]; if (X < 0 || Y < 0 || X >= n || Y >= n) break; p = Y * n + X; [x, y] = ctr(p); g.lineTo(x, y); if (world.wall[p]) break; } g.stroke(); g.setLineDash([]); }
  const [tx, ty] = ctr(world.goal); g.fillStyle = '#3ddc84'; star(g, tx, ty, c * .38);
  if (fr) { const [ax, ay] = ctr(fr.pos); g.fillStyle = '#ff4d6d'; g.beginPath(); g.arc(ax, ay, c * .3, 0, 7); g.fill(); if (fr.a >= 0) { g.strokeStyle = fr.ok ? '#22d3ee' : '#ff4d6d'; g.lineWidth = 3; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + ACTIONS[fr.a][0] * c * .55, ay + ACTIONS[fr.a][1] * c * .55); g.stroke(); } }
}
function probsView() { const fr = frames[fi]; if (!fr) return;
  $('probs').innerHTML = fr.probs.map((p, a) => `<div class="${fr.a === a ? 'chosen' : ''} ${fr.opt.includes(a) ? 'opt' : ''}">${ARROWS[a]} ${(100 * p).toFixed(0)}%<br><span style="color:#8aa1b4">trece: ${(100 * fr.move[a]).toFixed(0)}%</span></div>`).join(''); }

// ---------------- training in the page ----------------
function trainSome(ms) { const t0 = performance.now();
  while (performance.now() - t0 < ms) { const sz = [7, 9][trainEp % 2], seed = seedOf(SEEDS.train, trainEp);
    orgs.ab.live(makeMaze(seed, sz), {learn: true, rng: rngA}); orgs.ctrl.live(makeMaze(seed, sz), {learn: true, rng: rngC}); trainEp++;
    if (trainEp % 300 === 0) { curve.push({ep: trainEp, ab: evaluate(orgs.ab, {count: 30}), ctrl: evaluate(orgs.ctrl, {count: 30})}); statView(); curveView(); } } }
function statView() { const c = curve.at(-1); const f = x => x == null ? '—' : x.toFixed(2);
  $('stat').innerHTML = `${training ? '<b>ANTRENEAZĂ</b>' : 'oprit'} · ${trainEp} labirinturi unice trăite (de fiecare)\n` +
    (c ? `A și B: rezolvate <b>${(100 * c.ab.solved).toFixed(0)}%</b> · pași/optim ${f(c.ab.ratio)} · forma lui B la pasul 0 ${f(c.ab.plan0)}\nmartor: rezolvate <b>${(100 * c.ctrl.solved).toFixed(0)}%</b> · pași/optim ${f(c.ctrl.ratio)} · forma la pasul 0 ${f(c.ctrl.plan0)}` : 'încă nicio măsurătoare (la fiecare 300 de episoade, pe 30 de labirinturi nevăzute)'); }
function curveView() { const {g, w, h} = view($('curve')); g.fillStyle = '#0a121c'; g.fillRect(0, 0, w, h); if (curve.length < 1) return;
  const X = i => 10 + (w - 20) * (curve.length === 1 ? 0.5 : i / (curve.length - 1)), Y = v => h - 10 - (h - 20) * v;
  for (const [k, col] of [['ctrl', '#8a96a3'], ['ab', '#f5b301']]) { g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); curve.forEach((c, i) => i ? g.lineTo(X(i), Y(c[k].solved)) : g.moveTo(X(i), Y(c[k].solved))); g.stroke();
    g.fillStyle = col; curve.forEach((c, i) => { g.beginPath(); g.arc(X(i), Y(c[k].solved), 2.5, 0, 7); g.fill(); }); }
  g.fillStyle = '#8aa1b4'; g.font = '11px ui-monospace,monospace'; g.fillText('100%', 12, 18); g.fillText('0%', 12, h - 12); }

// ---------------- loop and controls ----------------
function frameLoop(now) {
  if (training) trainSome(12);
  if (playing && frames.length && now - lastAdv > 1000 / speed) { lastAdv = now; if (fi < frames.length - 1) { fi++; onFrame(); } else { newWorld(); } }
  physics(); draw(now); requestAnimationFrame(frameLoop);
}
$('legend').innerHTML = [['#7cc9ff', 'α (cel mai rapid)'], ['#36d1c4', 'nivelul 2'], ['#a78bfa', 'nivelul 3'], ['#f5b301', 'Ω (cel mai larg) · B · perspectiva lui B'], ['#ff4d6d', 'A · rezistența lui A'], ['#22d3ee', 'lumea intră în α · acțiunea'], ['#3ddc84', 'ținta'], ['#e8f4ff', 'mesaje pe buclă']].map(([c, t]) => `<span><i style="--c:${c}"></i>${t}</span>`).join('');
$('new').onclick = newWorld; $('play').onclick = () => { playing = !playing; $('play').textContent = playing ? 'Pauză' : 'Pornește'; };
$('stepb').onclick = () => { playing = false; $('play').textContent = 'Pornește'; if (fi < frames.length - 1) { fi++; onFrame(); } };
$('who').onchange = () => { who = $('who').value; newWorld(); };
$('speed').oninput = () => { speed = Number($('speed').value); $('speedo').textContent = speed; }; $('speed').oninput();
$('train').onclick = () => { training = !training; $('train').textContent = training ? 'Oprește antrenarea' : 'Pornește antrenarea'; $('train').classList.toggle('on', training); statView(); };
$('reset').onclick = () => { orgs = {ab: new Organism({seed: 7, bodies: true}), ctrl: new Organism({seed: 7, bodies: false})}; trainEp = 0; curve = []; statView(); curveView(); newWorld(); };
const cv = $('g');
cv.addEventListener('pointerdown', e => { if (!T2S) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left - T2S.cx) / T2S.s, y = (e.clientY - r.top - T2S.cy) / T2S.s;
  let best = null, bd = 0.004; for (const n of nodes) { const d = (n.x - x) ** 2 + (n.y - y) ** 2; if (d < bd) { bd = d; best = n; } } if (best) { drag = {n: best}; cv.setPointerCapture(e.pointerId); } });
cv.addEventListener('pointermove', e => { if (!drag) return; const r = cv.getBoundingClientRect(); drag.n.x = (e.clientX - r.left - T2S.cx) / T2S.s; drag.n.y = (e.clientY - r.top - T2S.cy) / T2S.s; drag.n.vx = drag.n.vy = 0; });
cv.addEventListener('pointerup', () => drag = null);
statView(); newWorld(); requestAnimationFrame(frameLoop);
