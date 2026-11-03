// MagicPerspective V11 — the Portal UI. Everything drawn comes from recorded frames of the real network: activations (h),
// shape (p), uncertainty (U), the chosen action, the world's resistance, the persistent label nodes. Nothing is synthetic.
const $ = id => document.getElementById(id);
const FAM_COL = {maze2d:'#f5b301', maze3d:'#ffd166', dynamic:'#ff9f1c', graph:'#5ec8ff', sat:'#22d3ee', symbols:'#9b7cff', car:'#ff6b9a', text:'#7bd389', voter:'#e0e6ff'};
const C = {gold:'#f5b301', violet:'#9b7cff', ice:'#5ec8ff', cyan:'#22d3ee', red:'#ff3b5c', green:'#22c55e', orange:'#ff8a00', white:'#ffffff'};
let S = null, EP = null, idx = 0, playing = false, layout = 'latent', dim4 = false, spin = true, live = false, LAB = null;
let yaw = 0.6, pitch = 0.35, zoom = 1, animStart = performance.now(), lastUpdates = 0, coreFlash = 0, liveTimer = null;
const api = async (p, b) => { const r = await fetch(p, b === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(b)}); const j = await r.json(); if (!r.ok) throw Error(j.error || r.status); return j; };
const fx = (v, d = 3) => v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d).replace('.', ',');
const pct = v => v == null ? '—' : Math.round(v * 100) + '%';
function ctx(cv) { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); const W = Math.max(10, r.width), H = Math.max(10, r.height);
  if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return {g, w: W, h: H}; }
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// ---------------- 3D camera ----------------
function rot([x, y, z]) { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const X = cy * x + sy * z, Z = -sy * x + cy * z; return [X, cp * y - sp * Z, sp * y + cp * Z]; }
function proj(p, w, h) { const [x, y, z] = rot(p), d = 3.2 / zoom, s = Math.min(w, h) * 0.42 * (d / (d + z)); return {x: w / 2 + x * s, y: h / 2 + y * s, z, s: d / (d + z)}; }

// ---------------- node placement ----------------
function worldPos(fr, i, n) {
  const W = EP.world, fam = EP.family;
  if (W.kind === 'grid') { const N = W.n, c = [i % N, Math.floor(i / N) % N, Math.floor(i / (N * N))];
    return W.dims === 2 ? [(c[0] / (N - 1) - .5) * 1.8, (c[1] / (N - 1) - .5) * 1.8, 0] : [(c[0] / (N - 1) - .5) * 1.6, (c[1] / (N - 1) - .5) * 1.6, (c[2] / (N - 1) - .5) * 1.6]; }
  if (fam === 'car') { const s = fr.view.order[i], N = W.n, c = Math.floor(s / 12), h = Math.floor((s % 12) / 3), v = s % 3;
    const dx = [0, 1, 0, -1][h] * .18, dy = [-1, 0, 1, 0][h] * .18; return [((c % N) / (N - 1) - .5) * 1.8 + dx, (Math.floor(c / N) / (N - 1) - .5) * 1.8 + dy, (v - 1) * .45]; }
  if (W.kind === 'states' || W.kind === 'sat' || W.kind === 'symbols') { const s = fr.view.order[i], N = W.kind === 'symbols' ? W.strings.length : W.N, a = 2 * Math.PI * s / N;
    return [Math.cos(a) * .95, Math.sin(a) * .95, ((s * 7919) % 97 / 97 - .5) * .5]; }
  if (W.kind === 'text') { const a = 2 * Math.PI * i / n; return [Math.cos(a) * .95, Math.sin(a) * .95, 0]; }
  if (W.kind === 'voter') { const NI = 12, NV = 5; if (i < NI) return [(i / (NI - 1) - .5) * 1.8, -.75, 0]; if (i < NI + NV) return [((i - NI) / (NV - 1) - .5) * 1.4, 0, 0];
    if (i === NI + NV) return [-.4, .75, 0]; if (i === NI + NV + 1) return [.4, .75, 0]; return [0, -1.2, 0]; }
  return [0, 0, 0]; }
function keyOf(fr, i) { return fr.view && fr.view.order ? fr.view.order[i] : i; }
function positions(fr) { const n = fr.p.length, out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = layout === 'latent' && fr.h3 ? fr.h3[i].map(v => v * .78) : worldPos(fr, i, n);
  return out; }
function hops(fr) { const n = fr.p.length, adj = Array.from({length: n}, () => []); for (const [a, b] of fr.edges || []) { adj[a].push(b); adj[b].push(a); }
  const d = new Array(n).fill(99), q = [fr.self ?? 0]; d[fr.self ?? 0] = 0; for (let k = 0; k < q.length; k++) for (const j of adj[q[k]]) if (d[j] > d[q[k]] + 1) { d[j] = d[q[k]] + 1; q.push(j); }
  return {d, adj}; }

// ---------------- the living graph ----------------
let cache = {i: -1, P: null, prevP: null, H: null};
function drawPortal(now) {
  const {g, w, h} = ctx($('portal')); g.fillStyle = '#04070f'; g.fillRect(0, 0, w, h);
  const bg = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * .7); bg.addColorStop(0, 'rgba(40,60,120,.18)'); bg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (spin && !drag) yaw += 0.0025;
  if (!EP || !EP.frames.length) { g.fillStyle = '#9fb0cf'; g.font = '14px Inter, system-ui, sans-serif'; g.fillText('Alege o lume și apasă „Lume nouă”.', 20, 40); return; }
  const fr = EP.frames[idx], prev = idx > 0 ? EP.frames[idx - 1] : null, n = fr.p.length;
  if (cache.i !== idx || cache.layout !== layout || cache.ep !== EP) {
    const P = positions(fr); let prevP = null;
    if (prev && cache.P && cache.ep === EP) { const m = new Map(); const pp = positions(prev); for (let i = 0; i < prev.p.length; i++) m.set(keyOf(prev, i), pp[i]); prevP = P.map((_, i) => m.get(keyOf(fr, i)) || P[i]); }
    cache = {i: idx, layout, ep: EP, P, prevP, H: hops(fr)}; }
  const el = (now - animStart) / (700 / speed()), u = Math.min(1, el), ease = u * u * (3 - 2 * u);
  const P = cache.P.map((p, i) => cache.prevP ? p.map((v, k) => cache.prevP[i][k] + (v - cache.prevP[i][k]) * ease) : p);
  const Q = P.map(p => proj(p, w, h)), {d: hop, adj} = cache.H;
  // core: persistent label nodes (the part of the graph that stays across all worlds)
  const core = []; if (LAB && LAB.nodes.length) { for (const L of LAB.nodes) core.push({...L, q: proj(L.pos.map(v => v * .32), w, h)}); }
  const coreById = new Map(core.map(c => [c.id, c]));
  if (core.length) { const flash = Math.max(0, coreFlash - now) / 900;
    for (const m of LAB.merges.slice(0, 120)) { const a = coreById.get(m.a), b = coreById.get(m.b); if (!a || !b) continue; g.strokeStyle = rgba('#cfd8ff', .25 * m.sim); g.lineWidth = 1; g.beginPath(); g.moveTo(a.q.x, a.q.y); g.lineTo(b.q.x, b.q.y); g.stroke(); }
    for (const c of core) { const r = 1.6 + Math.min(4, Math.log10(1 + c.uses)) * .9, col = FAM_COL[c.family] || '#cfd8ff';
      g.fillStyle = rgba(col, .75); g.beginPath(); g.arc(c.q.x, c.q.y, r * c.q.s, 0, 7); g.fill();
      if (flash > 0) { g.strokeStyle = rgba(C.orange, flash * .8); g.lineWidth = 2; g.beginPath(); g.arc(c.q.x, c.q.y, r * 2.4, 0, 7); g.stroke(); } } }
  // links label -> instance (only for the strongest nodes of the shape, to keep it readable)
  if (core.length && fr.label_ids) { g.lineWidth = .6;
    for (let i = 0; i < n; i++) { if (fr.p[i] < .55 && i !== fr.self) continue; for (const id of fr.label_ids[i] || []) { const c = coreById.get(id); if (!c) continue;
      g.strokeStyle = rgba(FAM_COL[EP.family] || '#cfd8ff', .12 + .25 * fr.p[i]); g.beginPath(); g.moveTo(c.q.x, c.q.y); g.lineTo(Q[i].x, Q[i].y); g.stroke(); } } }
  // 4D: the shapes of the previous steps stay behind along the time axis
  if (dim4) { const back = Math.min(8, idx), tdir = [0, 0, 0.32]; let lastC = null;
    for (let k = back; k >= 1; k--) { const F = EP.frames[idx - k], PP = positions(F); let cx = 0, cy = 0, cz = 0, cn = 0;
      for (let i = 0; i < F.p.length; i++) { if (F.p[i] < .5) continue; const p = PP[i].map((v, j) => v + tdir[j] * k), q = proj(p, w, h);
        g.fillStyle = rgba(C.gold, .05 + .25 * (1 - k / (back + 1)) * F.p[i]); g.beginPath(); g.arc(q.x, q.y, 2.2 * q.s, 0, 7); g.fill(); cx += p[0]; cy += p[1]; cz += p[2]; cn++; }
      if (cn) { const q = proj([cx / cn, cy / cn, cz / cn], w, h); if (lastC) { g.strokeStyle = rgba(C.white, .45); g.lineWidth = 1.2; g.beginPath(); g.moveTo(lastC.x, lastC.y); g.lineTo(q.x, q.y); g.stroke(); } lastC = q; } }
    let cx = 0, cy = 0, cz = 0, cn = 0; for (let i = 0; i < n; i++) if (fr.p[i] >= .5) { cx += P[i][0]; cy += P[i][1]; cz += P[i][2]; cn++; }
    if (cn && lastC) { const q = proj([cx / cn, cy / cn, cz / cn], w, h); g.strokeStyle = rgba(C.white, .7); g.beginPath(); g.moveTo(lastC.x, lastC.y); g.lineTo(q.x, q.y); g.stroke(); } }
  // edges
  for (const [a, b] of fr.edges || []) { const s = Math.min(fr.p[a], fr.p[b]); g.strokeStyle = s > .5 ? rgba(C.gold, .18 + .5 * s) : rgba('#3d5a99', .22); g.lineWidth = s > .5 ? 1.4 : .7;
    g.beginPath(); g.moveTo(Q[a].x, Q[a].y); g.lineTo(Q[b].x, Q[b].y); g.stroke(); }
  // walked trail
  const trail = []; for (let k = Math.max(0, idx - 30); k <= idx; k++) { const F = EP.frames[k]; trail.push(F); }
  if (layout === 'world' && trail.length > 1) { g.strokeStyle = rgba(C.white, .55); g.lineWidth = 2; g.beginPath(); let started = false;
    for (const F of trail) { const p = proj(worldPos(F, F.self ?? 0, F.p.length), w, h); if (!started) { g.moveTo(p.x, p.y); started = true; } else g.lineTo(p.x, p.y); } g.stroke(); }
  // nodes, back to front; activation spreads one hop per round from "me" (how the rule actually computes)
  const order = [...Q.keys()].sort((a, b) => Q[b].z - Q[a].z), wave = el * 6;
  const R = fr.rounds || 8;
  for (const i of order) { const q = Q[i], on = fr.onset ? Math.max(0, Math.min(1, el * 1.6 * R / 2 - fr.onset[i] / 2 + .5)) : Math.max(0, Math.min(1, wave - hop[i] * .6)), act = (fr.act ? fr.act[i] : .3) * on, p = fr.p[i], U = fr.U ? fr.U[i] : 0, r = (2 + 3 * act + 2.5 * p) * q.s;
    if (U > .25) { g.fillStyle = rgba(C.violet, .08 + .3 * (U - .25)); g.beginPath(); g.arc(q.x, q.y, r * 2.6, 0, 7); g.fill(); }
    if (p > .35) { const pulse = .85 + .15 * Math.sin(now / 260 + i); g.fillStyle = rgba(C.gold, .12 * p * pulse * on + .05); g.beginPath(); g.arc(q.x, q.y, r * 3.2, 0, 7); g.fill(); }
    g.fillStyle = p > .5 ? rgba(C.gold, .55 + .45 * p * on) : rgba(C.ice, .18 + .7 * act); g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.fill(); }
  // me, and the goal
  const me = Q[fr.self ?? 0]; g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.beginPath(); g.arc(me.x, me.y, 9 * me.s, 0, 7); g.stroke();
  // decision: cyan comet from me to the imagined consequence
  if (fr.choice != null && Q[fr.choice]) { const t = Math.min(1, el / .5), a = Q[fr.self ?? 0], b = Q[fr.choice], x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
    const gr = g.createLinearGradient(a.x, a.y, x, y); gr.addColorStop(0, rgba(C.cyan, 0)); gr.addColorStop(1, rgba(C.cyan, .95)); g.strokeStyle = gr; g.lineWidth = 3; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(x, y); g.stroke();
    g.fillStyle = C.cyan; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }
  // resistance of the world: a red wave from where the prediction met reality, travelling along the links
  if (prev && prev.resist && prev.choice != null) { const src = keyOf(prev, prev.choice); let at = -1; for (let i = 0; i < n; i++) if (keyOf(fr, i) === src) { at = i; break; }
    if (at < 0) at = fr.self ?? 0; const t = el, q = Q[at]; g.strokeStyle = rgba(C.red, Math.max(0, .9 - t * .6)); g.lineWidth = 3; g.beginPath(); g.arc(q.x, q.y, 6 + 60 * t, 0, 7); g.stroke();
    const dist = new Map([[at, 0]]), qq = [at]; for (let k = 0; k < qq.length; k++) { const v = qq[k]; if (dist.get(v) >= 3) continue; for (const j of adj[v]) if (!dist.has(j)) { dist.set(j, dist.get(v) + 1); qq.push(j); } }
    for (const [v, dd] of dist) { const a = Math.max(0, 1 - Math.abs(t * 4 - dd)) * .9; if (a <= 0) continue; g.fillStyle = rgba(C.red, a); g.beginPath(); g.arc(Q[v].x, Q[v].y, 4 * Q[v].s + 2, 0, 7); g.fill(); } }
  const shape = fr.p.filter(v => v > .5).length, mU = fr.U ? fr.U.reduce((a, b) => a + b, 0) / n : null;
  $('hud').innerHTML = `<b>${S?.families?.[EP.family]?.title || EP.family}</b> · pasul ${fr.step}<br>noduri în lume: ${n} · noduri persistente: ${LAB ? LAB.nodes.length : '—'}<br>forma (aurii): ${shape} · incertitudine medie: ${fx(mU, 2)}<br>rezistențe până acum: ${fr.resistance}${live ? '<br><b style="color:#ff8a00">LIVE · antrenare</b> · actualizări ' + lastUpdates : ''}`;
}
const speed = () => Number($('speed').value) / 3;

// ---------------- the real world (only the observer sees it) ----------------
function drawWorld() { const {g, w, h} = ctx($('world')); g.fillStyle = '#0e1730'; g.fillRect(0, 0, w, h);
  if (!EP || !EP.frames.length) return; const W = EP.world, fr = EP.frames[idx], fam = EP.family;
  const truthG = new Set((fr.truth || []).map(i => keyOf(fr, i))), lineG = (fr.line || []).map(i => keyOf(fr, i));
  if (W.kind === 'grid' || fam === 'car') {
    const N = W.n, layers = W.dims === 3 ? N : 1, cols = Math.ceil(Math.sqrt(layers)), cell = Math.min(w, h) / (cols * N + (cols - 1) * 1.2);
    const at = (c, L) => { const lx = L % cols, ly = Math.floor(L / cols); return [lx * (N + 1.2) * cell + (c % N) * cell, ly * (N + 1.2) * cell + Math.floor(c / N) * cell]; };
    const cellOf = s => fam === 'car' ? Math.floor(s / 12) : s;
    for (let L = 0; L < layers; L++) for (let c = 0; c < N * N; c++) { const i = c + L * N * N, [x, y] = at(c, L); const wall = W.wall[fam === 'car' ? c : i];
      g.fillStyle = wall ? '#2a3550' : '#dfe7f5'; g.fillRect(x + .5, y + .5, cell - 1, cell - 1);
      const kn = fam === 'car' ? fr.view?.cells?.[c] : fr.cells?.[i]; if (kn === -1 || kn === undefined) { g.fillStyle = 'rgba(14,23,48,.35)'; g.fillRect(x + .5, y + .5, cell - 1, cell - 1); } }
    const mark = (s, col, r) => { const c = cellOf(s), L = fam === 'car' ? 0 : Math.floor(c / (N * N)), [x, y] = at(c % (N * N), L); g.fillStyle = col; g.beginPath(); g.arc(x + cell / 2, y + cell / 2, cell * r, 0, 7); g.fill(); };
    for (const s of truthG) mark(s, rgba(C.green, .55), .22);
    for (const s of lineG.slice(1)) mark(s, rgba(C.gold, .9), .14);
    for (let k = 0; k <= idx; k++) mark(EP.frames[k].pos, rgba('#7a8bb0', .5), .1);
    mark(fam === 'car' ? W.goal_cell * 12 : W.goal, '#1f3a93', .36); mark(fr.pos, '#0b7a75', .34);
    if (fam === 'car') { const s = fr.pos, hd = Math.floor((s % 12) / 3), v = s % 3, c = Math.floor(s / 12), [x, y] = at(c, 0); g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + cell / 2, y + cell / 2); g.lineTo(x + cell / 2 + [0, 1, 0, -1][hd] * cell * .45, y + cell / 2 + [-1, 0, 1, 0][hd] * cell * .45); g.stroke(); g.fillStyle = '#fff'; g.font = '11px "JetBrains Mono", ui-monospace, monospace'; g.fillText('v' + v, x + 2, y + 11); }
    return; }
  if (W.kind === 'states' || W.kind === 'sat' || W.kind === 'symbols') { const N = W.kind === 'symbols' ? W.strings.length : W.N, R = Math.min(w, h) * .42, cx = w / 2, cy = h / 2;
    const pc = s => s.toString(2).split('').filter(c => c === '1').length;
    if (W.kind === 'sat' && !W._rank) { W._rank = new Map(); const cols = {}; for (let s = 0; s < N; s++) (cols[pc(s)] ||= []).push(s); for (const k in cols) cols[k].forEach((s, j) => W._rank.set(s, (j + .5) / cols[k].length)); }
    const pt = s => W.kind === 'sat' ? [cx + (pc(s) / W.v - .5) * w * .85, 16 + W._rank.get(s) * (h - 52)] : [cx + Math.cos(2 * Math.PI * s / N) * R, cy + Math.sin(2 * Math.PI * s / N) * R];
    for (const [a, b] of fr.view?.edges || []) { const A = pt(fr.view.order[a]), B = pt(fr.view.order[b]); g.strokeStyle = 'rgba(94,200,255,.18)'; g.beginPath(); g.moveTo(...A); g.lineTo(...B); g.stroke(); }
    for (let s = 0; s < N; s++) { const [x, y] = pt(s); g.fillStyle = W.kind === 'states' && W.forbid[s] ? '#ff3b5c' : W.kind === 'sat' ? rgba('#9fb0cf', .25 + .5 * (1 - Math.min(1, W.viol[s] / 4))) : 'rgba(159,176,207,.35)';
      g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
    for (const s of truthG) { const [x, y] = pt(s); g.strokeStyle = C.green; g.lineWidth = 2; g.beginPath(); g.arc(x, y, 6, 0, 7); g.stroke(); }
    g.strokeStyle = C.gold; g.lineWidth = 2.4; g.beginPath(); lineG.forEach((s, k) => { const [x, y] = pt(s); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
    for (const s of (W.goals || [])) { const [x, y] = pt(s); g.fillStyle = '#1f3a93'; g.beginPath(); g.arc(x, y, 6, 0, 7); g.fill(); }
    const [px, py] = pt(fr.pos); g.fillStyle = '#0b7a75'; g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill();
    g.fillStyle = '#cfd8ff'; g.font = '12px "JetBrains Mono", ui-monospace, monospace';
    if (W.kind === 'symbols') { g.fillText('acum: ' + W.strings[fr.pos] + '   ținta: ' + W.goal, 10, h - 26); g.fillText('reguli ascunse: ' + W.rules.join('  '), 10, h - 10); }
    if (W.kind === 'states') g.fillText('operatori ascunși: ' + W.ops.join('  '), 10, h - 10);
    if (W.kind === 'sat') g.fillText(`${W.v} variabile · ${W.clauses} clauze · coloane = câți de 1`, 10, h - 10);
    return; }
  if (W.kind === 'text') { const v = fr.view, voc = v.vocab; g.font = '15px "JetBrains Mono", ui-monospace, monospace'; g.fillStyle = '#9fb0cf';
    const ctxt = v.context.slice(-60).replace(/\n/g, '⏎'); wrap(g, ctxt, 10, 26, w - 20, 20);
    g.fillStyle = '#cfd8ff'; g.fillText('răspuns adevărat:', 10, h - 92); g.fillStyle = C.green; g.fillText(W.answer.replace(/\n/g, '⏎'), 170, h - 92);
    const pred = (fr.line || []).slice(1).map(i => voc[i]).join(''); g.fillStyle = '#cfd8ff'; g.fillText('forma prezisă acum:', 10, h - 64); g.fillStyle = C.gold; g.fillText((W.answer.slice(0, v.t) + pred).replace(/\n/g, '⏎'), 170, h - 64);
    g.fillStyle = '#cfd8ff'; g.fillText(`corecte până acum: ${v.correct}/${v.t}`, 10, h - 36); return; }
  if (W.kind === 'voter') { const v = fr.view, NI = 12, NV = 5, X = i => 20 + i * (w - 40) / (NI - 1), VX = k => 50 + k * (w - 100) / (NV - 1);
    for (let k = 0; k < NV; k++) for (const i of W.listen[k]) { g.strokeStyle = 'rgba(159,176,207,.25)'; g.beginPath(); g.moveTo(X(i), h * .25); g.lineTo(VX(k), h * .55); g.stroke(); }
    for (let i = 0; i < NI; i++) { const kn = v.known[i]; g.fillStyle = kn < 0 ? '#2a3550' : kn ? '#dfe7f5' : '#556'; g.beginPath(); g.arc(X(i), h * .25, 9, 0, 7); g.fill();
      g.fillStyle = rgba(C.green, .35); g.font = '11px "JetBrains Mono", ui-monospace, monospace'; g.fillText(W.bits[i], X(i) - 3, h * .25 - 14);
      if (truthG.has(i)) { g.strokeStyle = C.green; g.lineWidth = 2; g.beginPath(); g.arc(X(i), h * .25, 12, 0, 7); g.stroke(); } }
    for (let k = 0; k < NV; k++) { g.fillStyle = W.votes[k] ? '#c9f2d4' : '#f2c9cf'; g.fillRect(VX(k) - 14, h * .55 - 10, 28, 20); if (truthG.has(NI + k)) { g.strokeStyle = C.green; g.strokeRect(VX(k) - 17, h * .55 - 13, 34, 26); } }
    g.font = '14px "Space Grotesk", system-ui, sans-serif'; g.fillStyle = W.outcome ? C.green : '#9fb0cf'; g.fillText('DA', w * .35, h * .82); g.fillStyle = !W.outcome ? C.green : '#9fb0cf'; g.fillText('NU', w * .6, h * .82);
    g.fillStyle = '#cfd8ff'; g.font = '12px "JetBrains Mono", ui-monospace, monospace'; g.fillText(v.answered == null ? 'încă nu a răspuns' : 'a răspuns: ' + (v.answered ? 'DA' : 'NU'), 10, h - 10); }
}
function wrap(g, t, x, y, W, lh) { let line = ''; for (const ch of t) { if (g.measureText(line + ch).width > W) { g.fillText(line, x, y); y += lh; line = ''; } line += ch; } g.fillText(line, x, y); }

// ---------------- numbers, timeline ----------------
function setFrame(i) { if (!EP) return; idx = Math.max(0, Math.min(EP.frames.length - 1, i)); animStart = performance.now(); $('scrub').value = idx; $('scrub-out').textContent = 'pasul ' + EP.frames[idx].step;
  const fr = EP.frames[idx]; $('n-bce').textContent = fx(fr.bce); $('n-f1').textContent = pct(EP.frames[0].f1); $('n-res').textContent = fr.resistance;
  $('n-ratio').textContent = EP.summary ? (EP.summary.solved ? fx(EP.summary.steps / EP.summary.optimal, 2) + '×' : 'nerezolvat') + (EP.summary.accuracy != null ? ' · ' + pct(EP.summary.accuracy) + ' corect' : '') : '—';
  drawWorld(); errCurve(); }
function errCurve() { const {g, w, h} = ctx($('errc')); g.fillStyle = '#0e1730'; g.fillRect(0, 0, w, h); if (!EP || !EP.frames.length) return;
  const F = EP.frames, mx = Math.max(.1, ...F.map(f => f.bce)), X = i => 8 + (w - 16) * i / Math.max(1, F.length - 1), Y = v => h - 8 - (h - 16) * v / mx;
  g.strokeStyle = C.gold; g.lineWidth = 2; g.beginPath(); F.forEach((f, i) => i ? g.lineTo(X(i), Y(f.bce)) : g.moveTo(X(i), Y(f.bce))); g.stroke();
  F.forEach((f, i) => { if (f.resist) { g.fillStyle = C.red; g.beginPath(); g.arc(X(i), Y(f.bce), 3, 0, 7); g.fill(); } });
  g.strokeStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(X(idx), 4); g.lineTo(X(idx), h - 4); g.stroke(); }
async function show() { stopLive(); const fam = $('family').value, size = Number($('size').value) || 0;
  $('show').disabled = true; try { EP = await api('/api/show', {family: fam, size, who: $('who').value}); $('scrub').max = EP.frames.length - 1; setFrame(0); play(true); LAB = await api('/api/labels'); drawCore(); }
  catch (e) { alert(e.message); } finally { $('show').disabled = false; } }
function play(on) { playing = on; $('play').textContent = playing ? '❚❚' : '▶'; }
setInterval(() => { if (!playing || !EP || live) return; if (performance.now() - animStart > 900 / speed()) { if (idx < EP.frames.length - 1) setFrame(idx + 1); else play(false); } }, 50);

// ---------------- live training view ----------------
function stopLive() { live = false; $('live').setAttribute('aria-pressed', 'false'); clearInterval(liveTimer); }
async function pollLive() { try { const L = await api('/api/live'); if (!L.frames.length) return; const fr = L.frames.at(-1);
  if (L.updates !== lastUpdates) { coreFlash = performance.now() + 900; lastUpdates = L.updates; }
  if (!EP || EP.family !== fr.family || EP.liveKey !== fr.family) { EP = {family: fr.family, world: null, frames: [], liveKey: fr.family}; }
  EP.frames = L.frames.filter(f => f.family === fr.family); EP.world = EP.world || {kind: guessKind(fr.family), n: Math.round(Math.sqrt(fr.p.length)), dims: 2};
  idx = EP.frames.length - 1; animStart = performance.now(); } catch (e) {} }
function guessKind(f) { return ['maze2d', 'dynamic', 'maze3d'].includes(f) ? 'grid' : f === 'sat' ? 'sat' : f === 'text' ? 'text' : f === 'voter' ? 'voter' : f === 'car' ? 'car' : 'states'; }

// ---------------- training panel ----------------
function famBoxes() { const box = $('fams'); box.innerHTML = '';
  for (const [k, f] of Object.entries(S.families)) { const l = document.createElement('label'); l.innerHTML = `<input type="checkbox" value="${k}" ${S.train.families.includes(k) ? 'checked' : ''}><i style="--c:${FAM_COL[k]}"></i>${f.title}`; box.append(l); } }
function curves() { const {g, w, h} = ctx($('curves')); g.fillStyle = '#0b1226'; g.fillRect(0, 0, w, h); const H = S.history || []; if (!H.length) { g.fillStyle = '#9fb0cf'; g.font = '13px Inter, system-ui, sans-serif'; g.fillText('Încă nu există măsurători de verificare.', 14, 30); return; }
  const L = 36, R = w - 10, T = 10, B = h - 24, mx = Math.max(1, ...H.map(x => x.exercises)), ymax = Math.max(.8, ...H.map(x => x.bce0 || 0));
  g.strokeStyle = '#22304f'; g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke(); g.fillStyle = '#9fb0cf'; g.font = '11px "JetBrains Mono", ui-monospace, monospace'; g.fillText(fx(ymax, 1), 4, T + 8); g.fillText('0', 20, B); g.fillText('exerciții trăite: ' + mx, R - 150, h - 6);
  const by = {}; for (const x of H) (by[x.family] ||= []).push(x);
  for (const [f, arr] of Object.entries(by)) { g.strokeStyle = FAM_COL[f] || '#fff'; g.lineWidth = 1.6; g.beginPath(); arr.forEach((x, k) => { const X = L + (R - L) * x.exercises / mx, Y = B - (B - T) * Math.min(1, (x.bce0 || 0) / ymax); k ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke(); } }
function trainStat() { const t = S.train, led = S.ledger || {}; $('train').disabled = t.running; $('stop').disabled = !t.running;
  const lines = [`${t.running ? 'RULEAZĂ' : 'oprit'} · ${S.device} · ${t.parallel} lumi în paralel · ${fx(t.rate, 1)} lumi/s · actualizări de greutăți ${S.brain.updates} · noduri persistente ${S.brain.labels}`];
  for (const [k, f] of Object.entries(S.families)) { const c = led[k]; if (c) lines.push(`${f.title.padEnd(38)} lumi unice ${String(c.unique).padStart(7)} · rezolvate ${pct(c.solved / Math.max(1, c.unique))}`); }
  if (t.error) lines.push('EROARE: ' + t.error); $('trainstat').textContent = lines.join('\n');
  const total = Object.values(led).reduce((a, c) => a + c.unique, 0); $('counts').textContent = `${total.toLocaleString('ro-RO')} lumi unice trăite`; }

// ---------------- polymath core ----------------
let coreYaw = 0;
function drawCore() { const {g, w, h} = ctx($('core')); g.fillStyle = '#04070f'; g.fillRect(0, 0, w, h); if (!LAB) return; coreYaw += .004;
  const P = L => { const [x, y, z] = L.pos, c = Math.cos(coreYaw), s = Math.sin(coreYaw), X = c * x + s * z, Z = -s * x + c * z, d = 3 / (3 + Z); return {x: w / 2 + X * Math.min(w, h) * .4 * d, y: h / 2 + y * Math.min(w, h) * .4 * d, d}; };
  const pts = new Map(LAB.nodes.map(L => [L.id, P(L)]));
  const mxl = Math.max(1, ...(LAB.links || []).map(l => l.n)); for (const l of LAB.links || []) { const a = pts.get(l.a), b = pts.get(l.b); if (!a || !b) continue; g.strokeStyle = rgba('#5ec8ff', .08 + .3 * l.n / mxl); g.lineWidth = .8; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  for (const m of LAB.merges) { const a = pts.get(m.a), b = pts.get(m.b); g.strokeStyle = rgba('#ffffff', .15 + .5 * (m.sim - .8) / .2); g.lineWidth = 1; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); }
  for (const L of LAB.nodes) { const p = pts.get(L.id), r = (2 + Math.min(5, Math.log10(1 + L.uses))) * p.d; g.fillStyle = FAM_COL[L.family] || '#fff'; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); }
  g.fillStyle = '#9fb0cf'; g.font = '12px "JetBrains Mono", ui-monospace, monospace'; g.fillText(`${LAB.nodes.length} noduri persistente · ${LAB.merges.length} punți între lumi diferite`, 10, h - 10); }
function mergesList() { if (!LAB) return; const id = new Map(LAB.nodes.map(n => [n.id, n]));
  const famOf = f => S?.families?.[f]?.title || f;
  $('merges').innerHTML = LAB.merges.length ? '<p><b>Noduri din lumi diferite pe care rețeaua le-a făcut asemănătoare</b> (asemănare cosinus a vectorilor învățați &gt; 0,8):</p>' + LAB.merges.slice(0, 60).map(m => { const a = id.get(m.a), b = id.get(m.b);
    return `<div><b>${a.label}</b> ↔ <b>${b.label}</b> · ${fx(m.sim, 2)}</div>`; }).join('') : '<p>Încă nicio punte: nodurile din lumi diferite au rămas separate.</p>'; }

// ---------------- tests ----------------
const NAMES = {organ: 'cu organul formei', 'next-step': 'fără organul formei', untrained: 'neantrenat', classic: 'clasic', line: 'linie dreaptă', base: 'constantă'};
function tests() { const T = (S.tests || []).at(-1); const V = $('verdicts'), TB = $('tables'); V.innerHTML = ''; TB.innerHTML = ''; if (!T) { V.innerHTML = '<div>Încă nu au rulat testele.</div>'; return; }
  const add = (cls, txt) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; V.append(d); };
  add('', `Rulat ${T.date} · ${T.device} · ${T.exercises} exerciții trăite · ${T.labels} noduri persistente · ${T.merges} punți între lumi`);
  for (const [fam, r] of Object.entries(T.results)) { const o = r.organ, ns = r['next-step'], un = r.untrained, cl = r.classic, bs = r.base, ti = S.families[fam]?.title || fam;
    const refs = [un, bs, cl, r.line].filter(Boolean).map(x => x.bce0), d1 = o.bce0 < Math.min(...refs);
    add(d1 ? 'ok' : 'no', `${ti} · D1 forma înainte de mișcare: eroare ${fx(o.bce0)} față de ${fx(Math.min(...refs))} (cea mai bună referință fără organ) și ${fx(ns?.bce0)} (aceeași rețea fără organul formei)`);
    if (o.accuracy != null) add(o.accuracy > (cl.accuracy ?? 0) ? 'ok' : 'no', `${ti} · caractere corecte: ${pct(o.accuracy)} față de ${pct(cl.accuracy)} (bigram clasic) și ${pct(ns?.accuracy)} (fără organ)`);
    else { const d2 = o.solved >= (ns?.solved ?? 0) - .02 && (o.ratio ?? 99) < (ns?.ratio ?? 99); add(d2 ? 'ok' : (o.ratio ?? 99) < (ns?.ratio ?? 99) * 1.1 ? 'mid' : 'no', `${ti} · D2 navigare: rezolvate ${pct(o.solved)}, pași/optim ${fx(o.ratio, 2)}× față de ${pct(ns?.solved)} / ${fx(ns?.ratio, 2)}× fără organ și ${pct(cl.solved)} / ${fx(cl.ratio, 2)}× clasic`); }
    add(o.bce50 < o.bce0 ? 'ok' : 'no', `${ti} · D3 corecție prin rezistență: eroarea formei ${fx(o.bce0)} → ${fx(o.bce50)} la jumătatea drumului`);
    if (o.ucorr != null) add(o.ucorr > .1 ? 'ok' : 'no', `${ti} · D7 incertitudinea: corelația dintre incertitudinea declarată și eroarea reală este ${fx(o.ucorr, 2)}. Pozitivă înseamnă că știe unde nu știe.`);
    if (o.island) add(o.island.shape_stability > o.island.random_stability ? 'ok' : 'no', `${ti} · Insula: forma activată își păstrează semnătura de la un pas la altul (${fx(o.island.shape_stability, 2)}) față de mulțimi aleatoare de aceeași mărime (${fx(o.island.random_stability, 2)}), în timp ce se deplasează ${fx(o.island.shape_motion, 2)} pe pas în spațiul latent.`);
    const tb = document.createElement('table'); tb.innerHTML = `<caption style="color:${FAM_COL[fam]}">${ti}</caption><tr><th></th><th>eroare 0</th><th>F1 0</th><th>eroare ½</th><th>pași/optim</th><th>rezolvate</th>${o.accuracy != null ? '<th>corecte</th>' : ''}</tr>` +
      Object.entries(r).map(([m, x]) => `<tr><td>${NAMES[m] || m}</td><td>${fx(x.bce0)}</td><td>${pct(x.f1_0)}</td><td>${fx(x.bce50)}</td><td>${fx(x.ratio, 2)}</td><td>${pct(x.solved)}</td>${o.accuracy != null ? `<td>${pct(x.accuracy)}</td>` : ''}</tr>`).join(''); TB.append(tb); }
  $('teststat').textContent = S.test_task?.running ? 'rulează…' : ''; }

// ---------------- wiring ----------------
async function refresh() { try { S = await api('/api/state'); } catch (e) { $('device').textContent = 'server oprit'; return; }
  $('device').textContent = S.device; $('device').classList.toggle('cuda', S.device.startsWith('cuda'));
  if (!$('family').options.length) { for (const [k, f] of Object.entries(S.families)) $('family').add(new Option(f.title, k)); sizes(); famBoxes(); $('parallel').value = S.train.parallel; $('par-out').textContent = S.train.parallel; }
  trainStat(); curves(); tests(); }
function sizes() { const f = S.families[$('family').value]; $('size').innerHTML = ''; for (const s of [...new Set([...f.sizes, ...f.test_sizes])]) $('size').add(new Option(s || '—', s)); $('size').disabled = f.test_sizes.length < 2 && !f.sizes[0]; }
$('family').onchange = sizes; $('show').onclick = show; $('play').onclick = () => { if (EP && idx >= EP.frames.length - 1) setFrame(0); play(!playing); };
$('scrub').oninput = e => { play(false); setFrame(Number(e.target.value)); };
document.querySelectorAll('.seg').forEach(b => b.onclick = () => { document.querySelectorAll('.seg').forEach(x => x.classList.toggle('on', x === b)); layout = b.dataset.layout; cache.i = -1; });
$('dim4').onclick = () => { dim4 = !dim4; $('dim4').setAttribute('aria-pressed', dim4); };
$('spin').onclick = () => { spin = !spin; $('spin').setAttribute('aria-pressed', spin); };
$('live').onclick = () => { if (live) return stopLive(); live = true; play(false); $('live').setAttribute('aria-pressed', 'true'); liveTimer = setInterval(async () => { await pollLive(); if (Math.random() < .2) { LAB = await api('/api/labels'); } }, 900); };
$('parallel').oninput = e => { $('par-out').textContent = e.target.value; }; $('parallel').onchange = e => api('/api/parallel', {parallel: Number(e.target.value)}).catch(() => {});
$('fams').onchange = () => { const f = [...$('fams').querySelectorAll('input:checked')].map(x => x.value); if (S.train.running) api('/api/families', {families: f}); };
$('train').onclick = async () => { const f = [...$('fams').querySelectorAll('input:checked')].map(x => x.value); try { await api('/api/train', {families: f, parallel: Number($('parallel').value), control: $('ctrl').checked}); refresh(); } catch (e) { alert(e.message); } };
$('stop').onclick = () => api('/api/stop', {}).then(refresh);
$('test').onclick = async () => { try { await api('/api/test', {count: Number($('tcount').value), families: [...$('fams').querySelectorAll('input:checked')].map(x => x.value)}); $('teststat').textContent = 'rulează…'; } catch (e) { alert(e.message); } };
let drag = null; $('portal').addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY}; $('portal').setPointerCapture(e.pointerId); });
$('portal').addEventListener('pointermove', e => { if (!drag) return; yaw += (e.clientX - drag.x) * .008; pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - drag.y) * .008)); drag = {x: e.clientX, y: e.clientY}; });
$('portal').addEventListener('pointerup', () => drag = null); $('portal').addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(.5, Math.min(3, zoom * (e.deltaY < 0 ? 1.1 : .9))); }, {passive: false});
function loop(now) { drawPortal(now); if (live && EP?.world) drawWorldLive(); drawCore(); requestAnimationFrame(loop); }
function drawWorldLive() { if (!EP.frames.length) return; const fr = EP.frames[idx]; $('n-bce').textContent = fx(fr.bce); $('n-res').textContent = fr.resistance; $('n-f1').textContent = '—'; $('n-ratio').textContent = 'live';
  const {g, w, h} = ctx($('world')); g.fillStyle = '#0e1730'; g.fillRect(0, 0, w, h); g.fillStyle = '#9fb0cf'; g.font = '13px Inter, system-ui, sans-serif';
  wrap(g, `Antrenare live: ${S?.families?.[EP.family]?.title || EP.family}. Profesorul vede harta și corectează forma la fiecare pas. Harta nu e trimisă aici; o vezi complet cu „Lume nouă”.`, 14, 30, w - 28, 20); }
await refresh(); setInterval(refresh, 3000); LAB = await api('/api/labels').catch(() => null); mergesList(); setInterval(async () => { LAB = await api('/api/labels').catch(() => LAB); mergesList(); }, 15000);
requestAnimationFrame(loop); show();
