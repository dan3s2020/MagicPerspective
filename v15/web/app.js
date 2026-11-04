const $ = id => document.getElementById(id);
const api = async (p, b) => { const r = await fetch(p, b === undefined ? {} : {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(b)}); const j = await r.json(); if (!r.ok) throw Error(j.error || r.status); return j; };
const esc = s => String(s).replace(/[&<>]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]));
let S = null, lastPi = [], lastAct = [], lastSur = [];
const bind = (id, f, fmt = v => v) => { const e = $(id), o = $(id + 'o'); const u = () => { o.textContent = fmt(Number(e.value)); f && f(Number(e.value)); }; e.oninput = u; u(); };
bind('noise', null, v => v.toFixed(2)); bind('temp', null, v => v.toFixed(2)); bind('maxlen', null, v => String(v));
bind('par', null, v => String(v)); bind('tnoise', null, v => v.toFixed(2));
$('par').onchange = () => api('/api/config', {parallel: Number($('par').value)}).catch(() => {});
$('tnoise').onchange = () => api('/api/config', {noise: Number($('tnoise').value)}).catch(() => {});

function ctx(cv) { const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return {g, w: r.width, h: r.height}; }

async function send() {
  const text = $('msg').value.trim(); if (!text) return; $('send').disabled = true;
  const me = document.createElement('div'); me.className = 'msg me'; me.textContent = text; $('chat').append(me);
  const it = document.createElement('div'); it.className = 'msg it'; it.innerHTML = '<div class="shape">își prezice forma…</div><span class="txt"></span>'; $('chat').append(it);
  $('chat').scrollTop = 1e9;
  try {
    const {id} = await api('/api/chat', {text, temp: Number($('temp').value), noise: Number($('noise').value), max_len: Number($('maxlen').value)});
    for (;;) { await new Promise(r => setTimeout(r, 150)); const j = await api('/api/chat?id=' + id);
      it.querySelector('.txt').textContent = j.text; lastPi = j.pi || []; lastAct = j.act || []; lastSur = j.sur || []; drawLoop();
      if (j.shape) it.querySelector('.shape').innerHTML = `forma ținută de B înainte de prima literă a lui A: <b>~${j.shape.length} caractere</b> · ` + j.shape.bytes.slice(0, 32).map(([c, p]) => `<i style="opacity:${0.35 + 0.65 * p}">${esc(c === ' ' ? '␣' : c)}</i>`).join('');
      $('chat').scrollTop = 1e9;
      if (j.done) { if (j.error) it.querySelector('.txt').textContent += '\n[eroare: ' + j.error + ']'; break; } }
  } catch (e) { it.querySelector('.txt').textContent = 'eroare: ' + e.message; }
  $('send').disabled = false;
}
$('send').onclick = send; $('msg').addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });
$('clear').onclick = () => { $('chat').innerHTML = ''; };

function drawLoop() { const {g, w, h} = ctx($('loop')); g.fillStyle = '#0b1622'; g.fillRect(0, 0, w, h); const P = lastPi, A = lastAct; if (!P.length) return;
  const L = P[0].length, n = P.length, cw = Math.max(1, (w - 40) / n), rh = (h - 26) / L;
  for (let i = 0; i < n; i++) { const s = lastSur[i] ?? 0; g.fillStyle = `rgba(255,77,109,${Math.min(1, s / 4)})`; g.fillRect(30 + i * cw, h - 12, Math.max(1, cw - 0.5), 8); }
  g.fillStyle = '#ff4d6d'; g.fillText('A', 8, h - 4); g.font = '11px ui-monospace,Menlo,Consolas,monospace';
  const names = ['α', '2', '3', '4', '5', 'Ω'].slice(0, L); if (L > 6) names.length = L;
  for (let l = 0; l < L; l++) { const y = h - 18 - (l + 1) * rh; g.fillStyle = '#8aa1b4'; g.fillText(l === 0 ? 'α' : l === L - 1 ? 'Ω' : String(l + 1), 6, y + rh * 0.7);
    for (let i = 0; i < n; i++) { const a = A[i] ? Math.min(1, A[i][l] * 1.5) : 0, p = P[i][l];
      g.fillStyle = `rgba(94,200,255,${0.08 + 0.5 * a})`; g.fillRect(30 + i * cw, y, Math.max(1, cw - 0.5), rh - 1);
      if (p > 0.05) { g.fillStyle = `rgba(245,179,1,${Math.min(1, p * 1.2)})`; g.fillRect(30 + i * cw, y + rh * 0.25, Math.max(1, cw - 0.5), rh * 0.5); } } } }

function curve() { const {g, w, h} = ctx($('curve')); g.fillStyle = '#0b1622'; g.fillRect(0, 0, w, h); const H = S?.history || []; if (H.length < 2) { g.fillStyle = '#8aa1b4'; g.font = '13px system-ui'; g.fillText('Curba apare după primii pași de antrenare.', 12, 24); return; }
  const lo = 0, hi = Math.max(3, Math.min(8.5, Math.max(...H.map(r => r.train_bpb)))), X = i => 34 + (w - 44) * i / (H.length - 1), Y = v => h - 18 - (h - 28) * (Math.min(hi, v) - lo) / (hi - lo);
  g.strokeStyle = '#22303e'; g.fillStyle = '#8aa1b4'; g.font = '11px ui-monospace,Menlo,Consolas,monospace';
  for (let v = 0; v <= hi; v += 1) { g.beginPath(); g.moveTo(34, Y(v)); g.lineTo(w - 10, Y(v)); g.stroke(); g.fillText(String(v), 8, Y(v) + 4); }
  g.strokeStyle = '#e6f3ff'; g.lineWidth = 1.6; g.beginPath(); H.forEach((r, i) => i ? g.lineTo(X(i), Y(r.train_bpb)) : g.moveTo(X(i), Y(r.train_bpb))); g.stroke();
  if (H.some(r => r.ctrl_bpb != null)) { g.strokeStyle = '#7d8b99'; g.lineWidth = 1.4; g.beginPath(); let st = false; H.forEach((r, i) => { if (r.ctrl_bpb == null) return; st ? g.lineTo(X(i), Y(r.ctrl_bpb)) : g.moveTo(X(i), Y(r.ctrl_bpb)); st = true; }); g.stroke(); }
  H.forEach((r, i) => { if (r.val_bpb != null) { g.fillStyle = '#f5b301'; g.beginPath(); g.arc(X(i), Y(r.val_bpb), 3.5, 0, 7); g.fill(); }
    if (r.ctrl_val_bpb != null) { g.fillStyle = '#9aa7b4'; g.beginPath(); g.arc(X(i), Y(r.ctrl_val_bpb), 3, 0, 7); g.fill(); } }); }

async function refresh() { try { S = await api('/api/state'); } catch { $('dev').textContent = 'serverul nu răspunde'; return; }
  $('dev').textContent = `${S.devname} · ${S.params.toLocaleString('ro-RO')} parametri · ${S.cfg.levels} niveluri α…Ω`;
  $('note').textContent = S.note; if (!$('file').value) $('file').value = S.data_file || '';
  $('data').textContent = S.data;
  const last = S.history.at(-1), val = [...S.history].reverse().find(r => r.val_bpb != null), t = S.train;
  $('stat').textContent = `${t.running ? 'ANTRENEAZĂ' : 'oprit'} · pasul ${S.step.toLocaleString('ro-RO')} · ${S.episodes.toLocaleString('ro-RO')} conversații trăite · ${(S.bytes / 1e6).toFixed(1)} MB de text citit\n` +
    `${(t.rate / 1000).toFixed(1)} KB/s · ${S.cfg.parallel} lumi în paralel · zgomot ${S.cfg.noise}\n` +
    `A și B — antrenare: ${last ? last.train_bpb.toFixed(3) : '—'} · ținute deoparte: ${val ? val.val_bpb.toFixed(3) : '—'} biți/byte · forma: ${last ? last.shape.toFixed(3) : '—'}\n` +
    `martor  — antrenare: ${last && last.ctrl_bpb != null ? last.ctrl_bpb.toFixed(3) : '—'} · ținute deoparte: ${val && val.ctrl_val_bpb != null ? val.ctrl_val_bpb.toFixed(3) : '—'} biți/byte` + (t.error ? `\nEROARE: ${t.error}` : '');
  $('start').disabled = t.running; $('stop').disabled = !t.running;
  $('samples').innerHTML = (S.samples || []).slice().reverse().map(s => `<div><b style="color:#f5b301">pasul ${s.step}</b> · ~${s.shape.length} caractere prezise\n<span style="color:#8aa1b4">întrebare: …${esc(s.q.slice(-160))}</span>\n${esc(s.a)}</div>`).join('') || '<div class="small">Apare la fiecare 500 de pași: o întrebare ținută deoparte și ce răspunde singur.</div>';
  curve(); }
$('load').onclick = () => api('/api/load', {path: $('file').value}).then(refresh).catch(e => alert(e.message));
$('ctrl').onchange = () => api('/api/config', {control: $('ctrl').checked}).catch(() => {});
$('start').onclick = () => api('/api/train', {}).then(refresh).catch(e => alert(e.message));
$('stop').onclick = () => api('/api/stop', {}).then(refresh);
$('save').onclick = () => api('/api/save', {}).then(() => alert('Salvat.')).catch(e => alert(e.message));
refresh(); setInterval(refresh, 2500); addEventListener('resize', () => { curve(); drawLoop(); });
