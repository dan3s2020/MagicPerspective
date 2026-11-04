// V13 visualizer: everything drawn is the real state of the engine at the current character.
import {CORPUS} from './corpus.js';
import {prepare, Loop, LEVELS, ORGS} from './engine.mjs';

const $ = id => document.getElementById(id);
const M = LEVELS.length, TAU = Math.PI * 2;
const COL = {A: '#ff6b6b', B: '#ffb347', C: '#ffd93d', L: '#f5f5f5', 'L-cut': '#5ec8ff', 'L-frozen': '#9b7cff', free: '#3ddc84'};
const NAME = {A: 'A · doar α', B: 'B · scara fixă α→Ω₁→Ω₂', C: 'C · alege o perspectivă', L: 'L · bucla', 'L-cut': 'L tăiată (linie)', 'L-frozen': 'L înghețată', free: 'amestec liber (referință)'};
const data = prepare(CORPUS);
let opts = {mode: 'grad', sigma: 1, eta: 0.05, gamma: 0.5, lambda: 0.12, frozenTheta: 2.5};
let E = new Loop(data, opts), playing = true, speed = 6, trails = {}, ticks = {}, flash = 0, curve = [];
let runId = 0, fullBusy = false;

// ---------------- the torus: poloidal circle = scale of perspective, toroidal angle = organism ----------------
const R = 1.0, r = 0.92;   // close to a horn torus: the hole closes into a throat
// level index → poloidal angle: top half from Ω (outer equator, 0) down to α (throat, π); the bottom half is the direct return
const phiOf = th => th <= M - 1 ? Math.PI - Math.PI * th / (M - 1) : 2 * Math.PI - Math.PI * (th - (M - 1));
const psiOf = k => TAU * k / ORGS.length + 0.25;
const pt = (psi, phi, lift = 0) => { const rr = r + lift; return [(R + rr * Math.cos(phi)) * Math.cos(psi), rr * Math.sin(phi), (R + rr * Math.cos(phi)) * Math.sin(psi)]; };
let yaw = 0.6, pitch = -0.42, zoom = 1, spin = true;
function proj(p, w, h) { const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const x = cy * p[0] + sy * p[2], z = -sy * p[0] + cy * p[2], y = cp * p[1] - sp * z, z2 = sp * p[1] + cp * z, d = 5.2, q = d / (d + z2), s = Math.min(w, h * 0.9) * (w < 640 ? 0.24 : 0.2) * zoom;
  return [w / 2 + x * s * q, h * (w < 640 ? 0.62 : 0.58) - y * s * q, q, z2]; }

// where each organism is looking now (a position on the loop of scales)
function where(k) {
  const L = E.last; if (!L) return 2.5;
  if (k === 'A') return 0;
  if (k === 'B') return L.wb[0] * 0 + L.wb[1] * 1 + L.wb[2] * 2;
  if (k === 'C') return L.pickC;
  if (k === 'free') { const w = E.free.s.map(v => Math.exp(2.5 * v)); let cx = 0, cy = 0; w.forEach((v, l) => { cx += v * Math.cos(TAU * l / M); cy += v * Math.sin(TAU * l / M); }); return ((Math.atan2(cy, cx) / TAU * M) % M + M) % M; }
  return E.theta[k];
}

function draw(now) {
  const cv = $('torus'), d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  if (spin && !drag) yaw += 0.0018;
  g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  // the white mesh of the torus (meridians and parallels), like the reference drawings
  const seg = (a, b, col, wdt) => { g.strokeStyle = col; g.lineWidth = wdt; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };
  for (let i = 0; i < 48; i++) { const psi = TAU * i / 48; let prev = null;
    for (let j = 0; j <= 64; j++) { const p = proj(pt(psi, TAU * j / 64), W, H); if (prev) seg(prev, p, `rgba(210,235,255,${0.05 + 0.1 * Math.max(0, (prev[2] + p[2]) / 2 - 0.75)})`, 0.7); prev = p; } }
  for (let j = 0; j < 24; j++) { const phi = TAU * j / 24; let prev = null;
    for (let i = 0; i <= 96; i++) { const p = proj(pt(TAU * i / 96, phi), W, H); if (prev) seg(prev, p, `rgba(210,235,255,${0.04 + 0.08 * Math.max(0, (prev[2] + p[2]) / 2 - 0.75)})`, 0.6); prev = p; } }
  // the levels of perspective: one bright parallel per level, labelled
  g.font = '12px ui-monospace,Menlo,Consolas,monospace';
  LEVELS.forEach((L, l) => { const phi = phiOf(l), rel = E.last ? Math.exp(E.s[l]) : 0.3; let prev = null;
    for (let i = 0; i <= 120; i++) { const p = proj(pt(TAU * i / 120, phi, 0.004), W, H); if (prev) seg(prev, p, `rgba(245,179,1,${0.08 + 0.5 * rel})`, 1.4); prev = p; }
    const lp = proj(pt(-0.35, phi, 0.12), W, H); g.fillStyle = 'rgba(255,230,160,.9)'; g.fillText(L.id, lp[0], lp[1]); });
  // the throat: the direct passage α → Ω (bottom half). It flashes when the loop's perspective goes through it.
  flash *= 0.94; const tp = proj([0, 0, 0], W, H);
  const tg = g.createRadialGradient(tp[0], tp[1], 2, tp[0], tp[1], 40 + 60 * flash); tg.addColorStop(0, `rgba(255,255,255,${0.15 + 0.7 * flash})`); tg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = tg; g.beginPath(); g.arc(tp[0], tp[1], 100, 0, TAU); g.fill();
  // organisms: their meridian, their view (glow along the scales), their trail and where they look now
  ORGS.forEach((k, ki) => { const psi = psiOf(ki), col = COL[k];
    let prev = null; for (let j = 0; j <= 80; j++) { const p = proj(pt(psi, TAU * j / 80, 0.01), W, H); if (prev) seg(prev, p, col + '55', 1.2); prev = p; }
    const tr = trails[k] || []; for (let i = 1; i < tr.length; i++) { const a = proj(pt(psi, phiOf(tr[i - 1]), 0.03), W, H), b = proj(pt(psi, phiOf(tr[i]), 0.03), W, H);
      if (Math.abs(tr[i] - tr[i - 1]) > 2) continue; seg(a, b, col + Math.round(40 + 160 * i / tr.length).toString(16).padStart(2, '0'), 2.2); }
    const th = where(k), p = proj(pt(psi, phiOf(th), 0.05), W, H), tick = ticks[k] || 0;
    const rg = g.createRadialGradient(p[0], p[1], 1, p[0], p[1], 18 * p[2]); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.beginPath(); g.arc(p[0], p[1], 18 * p[2], 0, TAU); g.fill();
    g.fillStyle = col; g.beginPath(); g.arc(p[0], p[1], 4.5 * p[2], 0, TAU); g.fill();
    if (tick > 0.02) { g.strokeStyle = `rgba(255,77,109,${tick})`; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], (8 + 16 * (1 - tick)) * p[2], 0, TAU); g.stroke(); ticks[k] = tick * 0.9; }
    const lp = proj(pt(psi, -0.25, 0.32), W, H); g.globalCompositeOperation = 'source-over'; g.fillStyle = col; g.fillText(k, lp[0] - 8, lp[1]); g.globalCompositeOperation = 'lighter'; });
  g.globalCompositeOperation = 'source-over';
  $('throat').innerHTML = `treceri α ↔ Ω ale buclei L: <b>${E.wraps}</b><br>${flash > 0.3 ? 'TRECE PRIN GÂT' : ''}`;
}

// ---------------- side panels ----------------
function streamView() { const L = E.last, T = data.text, t = L ? L.t : E.t;
  if (!L) {
    $('stream').textContent = '— (următorul caracter nu a fost încă prezis)';
  } else {
    const past = T.slice(Math.max(0, t - 70), t).replace(/\n/g, '⏎'), ch = T[t] === '\n' ? '⏎' : T[t];
    $('stream').innerHTML = `<span class="past">${esc(past)}</span><span class="now">${esc(ch)}</span>`;
  }
  const processed = Math.max(0, E.t - 7);
  $('pos').textContent = `${processed.toLocaleString('ro-RO')} caractere procesate din ${(data.text.length - 7).toLocaleString('ro-RO')} · ${E.t >= data.ids.length ? 'TERMINAT' : E.t >= data.cut ? 'TEST ONLINE' : 'ANTRENARE'}`;
}
const esc = s => s.replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
function table() { const L = E.last, s = E.summary(); const vc = data.vocab;
  const rows = ORGS.map(k => { const p = L ? L.out[k] : null; let am = 0; if (p) for (let c = 1; c < p.length; c++) if (p[c] > p[am]) am = c;
    const guess = p ? (vc[am] === '\n' ? '⏎' : vc[am] === ' ' ? '␣' : vc[am]) : '', ok = L && am === L.y;
    const tr = s[k].train_bpc, te = s[k].test_bpc;
    return `<tr><td><span class="dot" style="background:${COL[k]}"></span>${NAME[k]}</td><td class="${ok ? 'ok' : 'no'}">${esc(guess)}</td><td>${tr == null ? '—' : tr.toFixed(3)}</td><td>${te == null ? '—' : te.toFixed(3)}</td></tr>`; });
  $('tab').innerHTML = `<tr><th></th><th>ghicește</th><th>antrenare</th><th>test</th></tr>` + rows.join(''); }
function bars() { const measured = E.stats.A.n + E.stats.A.tn > 0;
  $('bars').innerHTML = LEVELS.map((L, l) => { const v = measured ? Math.exp(E.s[l]) : null;
    return `<span>${L.id}</span><span class="bar"><i style="width:${v === null ? 0 : Math.min(100, 100 * v / 0.6)}%"></i></span><span>${v === null ? '—' : v.toFixed(3)}</span>`; }).join(''); }
function curveView() { const cv = $('curve'), d = Math.min(2, devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight; if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); g.fillStyle = '#08111a'; g.fillRect(0, 0, W, H); if (curve.length < 2) return;
  const lo = 1.5, hi = 4.5, X = i => 6 + (W - 12) * i / (curve.length - 1), Y = v => H - 6 - (H - 12) * (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo);
  const cutI = curve.findIndex(c => c.t >= data.cut); if (cutI > 0) { g.fillStyle = 'rgba(245,179,1,.08)'; g.fillRect(X(cutI), 0, W - X(cutI), H); }
  for (const k of ORGS) { g.strokeStyle = COL[k]; g.lineWidth = k === 'L' ? 2 : 1.2; g.beginPath(); curve.forEach((c, i) => i ? g.lineTo(X(i), Y(c[k])) : g.moveTo(X(i), Y(c[k]))); g.stroke(); } }

// measured verdicts (from bench.mjs on both splits of the text; reproduced in REPORT.md)
const MEASURED = [
  ['ok', 'Bucla L ghicește textul mai bine decât A, B și C pe ambele împărțiri: 2,601 biți/caracter față de 2,808 (cel mai bun dintre ei, B); și 1,808 față de 2,032 (tot B).'],
  ['ok', 'Îndoirea perspectivei ajută puțin: L 2,601 față de L înghețată 2,607; și 1,808 față de 1,828. Câștigul e mic.'],
  ['mid', 'Trecerea directă α → Ω nu are un efect sigur la text: L 2,601 față de linia tăiată 2,605, dar 1,808 față de 1,806 pe a doua împărțire. În varianta lentă, perspectiva nici nu trece prin gât.'],
  ['no', 'Bucla rapidă (care trece des prin gât, de sute de ori) e mai slabă decât linia tăiată și decât L înghețată, pe ambele împărțiri. La text, sărirea directă de la α la Ω strică.'],
];
$('verdicts').innerHTML = MEASURED.map(([c, t]) => `<div class="verdict ${c}">${t}</div>`).join('');

// ---------------- loop ----------------
function advance(n) {
  for (let i = 0; i < n; i++) {
    if (E.t >= data.ids.length) { stop(); break; }
    const more = E.step(true); const L = E.last;
    for (const k of ORGS) { (trails[k] ||= []).push(where(k)); if (trails[k].length > 160) trails[k].shift(); let am = 0; const p = L.out[k]; for (let c = 1; c < p.length; c++) if (p[c] > p[am]) am = c; if (am !== L.y) ticks[k] = 1; }
    if (L.crossed) flash = 1;
    if (L.t % 200 === 0) { const s = E.summary(), c = {t: L.t}; for (const k of ORGS) { const st = E.stats[k]; c[k] = (st.bits + st.tbits) / Math.max(1, st.n + st.tn); } curve.push(c); }
    if (!more) { stop(); break; } }
}
let last = performance.now(), acc = 0;
function loop(now) { const dt = now - last; last = now;
  if (playing) { acc += speed * dt / 16.7; const n = Math.floor(acc); acc -= n; if (n) advance(n); }
  draw(now); if (Math.round(now / 120) % 2 === 0) { streamView(); table(); bars(); curveView(); } requestAnimationFrame(loop); }

const report = message => { $('checkpointStatus').textContent = message; };
function stop() { playing = false; $('play').textContent = 'Pornește'; $('play').classList.remove('on'); }
function refresh() { streamView(); table(); bars(); curveView(); }
function restart() {
  runId++; stop(); E = new Loop(data, opts);
  trails = {}; ticks = {}; curve = []; flash = 0; acc = 0;
  refresh(); report('Reset explicit: memoria și măsurătorile au fost șterse.');
}
function applyOptions(change) {
  opts = {...opts, ...change};
  Object.assign(E.o, change); // No silent destruction of the learned context counts.
  report('Parametrii se aplică de acum înainte. Memoria și progresul sunt păstrate.');
}
$('play').onclick = () => {
  if (fullBusy) return;
  if (E.t >= data.ids.length) { stop(); report('Flux încheiat. Poți salva creierul sau reseta explicit.'); return; }
  playing = !playing;
  $('play').textContent = playing ? 'Pauză' : 'Pornește';
  $('play').classList.toggle('on', playing);
};
$('stepb').onclick = () => { runId++; stop(); advance(1); refresh(); };
$('reset').onclick = restart;
$('full').onclick = async () => {
  if (fullBusy || E.t >= data.ids.length) return;
  fullBusy = true; stop(); const token = ++runId, t0 = performance.now();
  $('full').disabled = true; $('play').disabled = true;
  try {
    while (token === runId && E.t < data.ids.length) {
      advance(1500); refresh();
      $('full').textContent = `${Math.round(100 * E.t / data.ids.length)}%…`;
      await new Promise(r => setTimeout(r, 0));
    }
    report(token === runId && E.t >= data.ids.length ?
      'Flux complet. Rezultatele testului online sunt disponibile; salvează creierul.' :
      'Rularea accelerată a fost oprită.');
  } finally {
    $('full').textContent = 'Rulează tot textul';
    $('full').disabled = false; $('play').disabled = false;
    fullBusy = false; refresh();
  }
};
const bind = (id, f, fmt) => { const e = $(id), o = $(id + 'o'); const u = () => { o.textContent = fmt(Number(e.value)); }; e.oninput = u; e.onchange = () => { f(Number(e.value)); }; u(); };
bind('speed', v => speed = v, v => String(v)); $('speed').oninput = () => { speed = Number($('speed').value); $('speedo').textContent = speed; };
bind('sigma', v => applyOptions({sigma: v}), v => v.toFixed(2));
bind('eta', v => applyOptions({eta: v}), v => v.toFixed(2));
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
  document.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
  const eta = b.dataset.mode === 'pull' ? 0.4 : 0.05;
  applyOptions({mode: b.dataset.mode, eta}); $('eta').value = eta; $('etao').textContent = eta.toFixed(2);
});
// Save the real learned brain, not a visual placeholder. Save/load are explicit;
 // browsers do not silently discard progress when users export checkpoints.
$('save').onclick = () => {
  try {
    const file = {format: 'MagicPerspective-V13', version: 1, model: E.snapshot(), curve};
    const blob = new Blob([JSON.stringify(file)], {type: 'application/json'});
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `MagicPerspective_V13_brain_${E.t}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    report(`Checkpoint exportat la ${E.t.toLocaleString('ro-RO')} caractere. Păstrează fișierul pentru restaurare.`);
  } catch (err) { report(`Salvarea a eșuat: ${err.message}`); }
};
$('load').onclick = () => $('statefile').click();
$('statefile').onchange = async () => {
  const input = $('statefile'), file = input.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.format !== 'MagicPerspective-V13' || payload.version !== 1) throw new Error('Format necunoscut.');
    const restored = Loop.restore(data, payload.model); // validate BEFORE replacing the current engine
    runId++; stop(); E = restored; opts = {...E.o};
    trails = {}; ticks = {}; flash = 0; acc = 0;
    curve = Array.isArray(payload.curve) ? payload.curve : [];
    $('sigma').value = opts.sigma; $('sigmao').textContent = opts.sigma.toFixed(2);
    $('eta').value = opts.eta; $('etao').textContent = opts.eta.toFixed(2);
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === opts.mode));
    refresh(); report(`Creier restaurat la ${E.t.toLocaleString('ro-RO')} caractere, cu memoria și statisticile originale.`);
  } catch (err) { report(`Restaurarea a eșuat; memoria actuală este intactă. ${err.message}`); }
  finally { input.value = ''; }
};
refresh();
let drag = null; const cv = $('torus');
cv.addEventListener('pointerdown', e => { drag = {x: e.clientX, y: e.clientY}; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (!drag) return; yaw += (e.clientX - drag.x) * 0.008; pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - drag.y) * 0.008)); drag = {x: e.clientX, y: e.clientY}; });
cv.addEventListener('pointerup', () => drag = null);
cv.addEventListener('wheel', e => { e.preventDefault(); zoom = Math.max(0.5, Math.min(3, zoom * (e.deltaY < 0 ? 1.08 : 0.93))); }, {passive: false});
requestAnimationFrame(loop);
