// THE GRAPH THAT CONTAINS ITSELF — one rule for every scale, so the zoom has no modes and no jumps.
//
// What we took from the research (understood, not copied):
//  · graph-directed IFS (Mauldin & Williams 1988): every node owns a region, every link from a node to what it holds
//    is a contraction that places a smaller copy inside it — the graph itself generates the fractal;
//  · geometric branching growth (Zheng, García-Pérez, Boguñá, Serrano, PNAS 2021): zooming in, a node unfolds into its
//    descendants placed around it in the same learned geometry, each kept inside half the gap to its nearest neighbour
//    (so territories never cross), the weight of the parent is shared by its descendants (z = z⁺ + z⁻), and the links
//    of the descendants are inherited from the links of their ancestors;
//  · geometric renormalization (García-Pérez, Allard, Serrano, Boguñá, Nat. Phys. 2018): zooming out, nodes close in
//    the geometry merge into one supernode whose links are the union of its members' links — the inverse operation.
//
// How it is OUR graph: the graph grows by budding — a perception of length L buds one of length L+1, a context grows by
// one character of the lived past. So the descendants of a node w (a context: the moments that ended in w) are the
// contexts x·w that were really lived, weighted by how often; merging them back (dropping the oldest character) gives
// w again with the very same weight. Branching and renormalization are exactly inverse here, by construction.
// Every node is placed by what it learned: its 5 torus coordinates (concepts.mjs / the page's geometry) and, as a 6th
// coordinate, TIME — how long ago it was last lived, on a logarithmic clock (the recent past sharp, the far past
// compressed). The 6 axes turn in any of the 15 planes, so time can be turned into the screen and zoomed like space.
//
// Zooming out never ends either: the node of the moment just lived holds the whole lived past (its past IS the whole
// stream), so the whole graph is itself the inside of that node in a bigger whole — the same graph again — and
// further out the moment before, and so on through the lived stream. The camera always lives in the frame of one
// node (rebasing, as deep Mandelbrot explorers do), so the numbers never run out.
export class NestView {
  constructor() { this.cam = {k: 0, w: "", x: 0, y: 0, S: 300}; this.data = []; this.top = []; this.kids = new Map(); this.occ = new Map(); this.M = null; this.placed = false; }
  setWorld({data, U, top, edges, now}) {
    if (data !== this.data) { this.data = data; this.occ.clear(); }
    this.U = U; this.top = top; this.edges = [...edges].sort((a, b) => b.w - a.w).slice(0, 900); this.now = now ?? data.length; this.kids.clear(); this.last = null;
    this.world = new Map(); for (const x of edges) if (x.kind === "world") this.world.set(x.a + ">" + x.b, x.w);
  }
  setRotation(M) { this.M = M; for (const C of this.kids.values()) this.place(C); this.last = null; }   // turning only moves, it never re-learns                // 6×6
  positions(w) {                                                                     // where context w starts in the lived stream
    if (this.occ.has(w)) return this.occ.get(w);
    let r; if (w.length === 1) { r = []; const c = w.charCodeAt(0); for (let i = 0; i < this.data.length; i++) if (this.data[i] === c) r.push(i); }
    else { const a = w.charCodeAt(0); r = this.positions(w.slice(1)).filter(i => i > 0 && this.data[i - 1] === a).map(i => i - 1); }
    if (this.occ.size > 200000) this.occ.clear(); this.occ.set(w, r); return r;
  }
  tau(age) { return Math.log1p(Math.max(0, age)) / Math.log1p(Math.max(2, this.data.length)); }   // the logarithmic clock
  chain(k) { const d = this.data; return d[(d.length - k + d.length * 4) % d.length]; }          // the moment lived k steps ago (k ≥ 1)
  // the descendants of frame (k, w): where they sit in this frame (o), how much they are shrunk (s), their weight
  children(k, w) {
    const key = k + "|" + w; let C = this.kids.get(key); if (C) return C;
    const raw = [], wrapD = x => x - Math.round(x), N = this.data.length;
    const mean5 = pts => [0, 1, 2, 3, 4].map(i => { let sx = 0, sy = 0; for (const [p, m] of pts) { sx += m * Math.cos(2 * Math.PI * p[i]); sy += m * Math.sin(2 * Math.PI * p[i]); } return Math.atan2(sy, sx) / (2 * Math.PI); });
    if (!w) {                                                                         // the whole: the graph as it lives now
      for (const it of this.top) {
        if (it.kind === "sym") { const pos = this.positions(String.fromCharCode(it.sym)), n = pos.length;
          raw.push({id: it.id, it, sym: it.sym, n: Math.max(n, .5), real: n > 0, age: n ? N - 1 - pos[n - 1] : N, p: this.U.get(it.sym) || it.p,
            into: k > 0 && it.sym === this.chain(k) ? {k: k - 1, w: ""} : {k, w: String.fromCharCode(it.sym)}}); }
        else raw.push({id: it.id, it, n: .5, real: true, age: this.now - (it.born ?? this.now), p: it.p, into: null});
      }
    } else {                                                                          // a context: the pasts that really came before it
      // where the lived past is thin (lived only a few times), the pasts that came before its shorter contexts are added
      // too, faintly — the graph's own continuation, so every scale keeps showing a graph (marked as not lived)
      let u = w, real = true; const seen = new Set();
      while (u && (real || raw.length < 6)) {
        const cnt = new Map(), last = new Map(); for (const i of this.positions(u)) if (i > 0) { const a = this.data[i - 1]; cnt.set(a, (cnt.get(a) || 0) + 1); last.set(a, i - 1); }
        let tot = 0; for (const n of cnt.values()) tot += n;
        for (const [a, n] of [...cnt].sort((x, y) => y[1] - x[1])) { if (seen.has(a) || (!real && raw.length >= 8)) continue; const p = this.U.get(a); if (!p) continue; seen.add(a);
          raw.push({id: "c:" + String.fromCharCode(a) + w, sym: a, n: real ? n : .3 * n / tot, real, age: real ? N - 1 - (last.get(a) + w.length) : N, p, into: {k, w: String.fromCharCode(a) + w}}); }
        u = u.slice(1); real = false;                                                  // beyond what was lived: the graph's own continuation
      }
    }
    // 6D place of every descendant, relative to the frame's centre: 5 learned torus axes + the logarithmic clock
    const m = raw.filter(r => r.p).map(r => [r.p, r.n]), c5 = m.length ? mean5(m) : [0, 0, 0, 0, 0];
    let tw = 0, tz = 0; for (const r of raw) { r.t = this.tau(r.age); tw += r.n; tz += r.n * r.t; } const tm = tw ? tz / tw : 0;
    for (const r of raw) r.v = [...[0, 1, 2, 3, 4].map(i => wrapD((r.p?.[i] ?? 0) - c5[i])), r.t - tm];
    let mx = 0; for (const r of raw) mx = Math.max(mx, Math.hypot(...r.v)); const z = mx > 1e-9 ? .8 / mx : 0;
    for (const r of raw) r.v = r.v.map(x => x * z);
    // territory: half the gap to the nearest descendant (in 6D, so it does not change when the view turns)
    for (const r of raw) { let d = Infinity; for (const q of raw) if (q !== r) d = Math.min(d, Math.hypot(...r.v.map((x, i) => x - q.v[i])));
      r.s = raw.length === 1 ? .45 : Math.min(.22, Math.max(.012, .45 * d)); }
    let nmax = 0; for (const r of raw) nmax = Math.max(nmax, r.n); for (const r of raw) r.share = r.n / nmax;
    C = raw; this.place(C); if (this.kids.size > 50000) this.kids.clear(); this.kids.set(key, C); return C;
  }
  place(C) { const M = this.M; for (const r of C) r.o = M ? [M[0].reduce((s, x, j) => s + x * r.v[j], 0), M[1].reduce((s, x, j) => s + x * r.v[j], 0)] : [r.v[0], r.v[1]]; }
  parentOf(k, w) {                                                                    // the frame that holds this one, and how
    if (w) { const pw = w.slice(1), ch = this.children(k, pw).find(r => r.into && r.into.k === k && r.into.w === w); return ch ? {k, w: pw, r: ch} : null; }
    const ch = this.children(k + 1, "").find(r => r.into && r.into.k === k && r.into.w === ""); return ch ? {k: k + 1, w: "", r: ch} : null;
  }
  // keep the camera in the frame of the node it looks at
  normalize(W, H) {
    const c = this.cam, view = Math.max(W, H);
    if (c.S < .4 * view) { const P = this.parentOf(c.k, c.w); if (!P) return false;
      c.x = P.r.o[0] + P.r.s * c.x; c.y = P.r.o[1] + P.r.s * c.y; c.S /= P.r.s; c.k = P.k; c.w = P.w; return true; }
    let best = null, bd = Infinity;
    const kids = this.children(c.k, c.w), anyReal = kids.some(r => r.into && r.real);   // while a lived past exists here, only it is entered
    for (const r of kids) { if (!r.into || (anyReal && !r.real)) continue; const d = Math.hypot(c.x - r.o[0], c.y - r.o[1]); if (d < r.s && d / r.s < bd) { bd = d / r.s; best = r; } }
    if (best && best.s * c.S > 1.2 * view) { c.x = (c.x - best.o[0]) / best.s; c.y = (c.y - best.o[1]) / best.s; c.S *= best.s; c.k = best.into.k; c.w = best.into.w; return true; }
    return false;
  }
  drift(view, gx, gy, f) {                                                            // the lived past nearest to where you zoom draws the eye
    // a pan just faster than the zoom widens the distance, toward the centre of the nearest lived past, so the point you
    // zoom into slides onto it and every next frame opens right where you are — the eye slides, it never jumps
    const c = this.cam; let near = null, nd = Infinity; const kids = this.children(c.k, c.w), anyReal = kids.some(r => r.into && r.real);
    for (const r of kids) { if (!r.into || (anyReal && !r.real)) continue; const d = Math.hypot(gx - r.o[0], gy - r.o[1]) / r.s; if (d < nd) { nd = d; near = r; } }
    if (!near || nd < .15) return [0, 0];
    const k = Math.min(.5, 1.5 * (1 - 1 / f)), dx = k * (near.o[0] - gx), dy = k * (near.o[1] - gy); c.x += dx; c.y += dy; return [dx * c.S, dy * c.S];
  }
  zoom(f, mx, my, W, H) { const c = this.cam, gx = c.x + (mx - W / 2) / c.S, gy = c.y + (my - H / 2) / c.S; c.S *= f;
    c.x = gx - (mx - W / 2) / c.S; c.y = gy - (my - H / 2) / c.S; this.moved = f > 1 ? this.drift(Math.max(W, H), gx, gy, f) : [0, 0]; for (let i = 0; i < 64 && this.normalize(W, H); i++); this.last = null; }
  // the eye slides (a few percent per frame, never a jump) toward the descendant lived most recently: where training is now
  follow() { const c = this.cam; let near = null; for (const r of this.children(c.k, c.w)) if (r.into && r.real && (!near || r.age < near.age)) near = r;
    if (near) { c.x += .04 * (near.o[0] - c.x); c.y += .04 * (near.o[1] - c.y); this.last = null; } }
  pan(dx, dy) { this.cam.x -= dx / this.cam.S; this.cam.y -= dy / this.cam.S; this.last = null; }
  // everything on screen: discs (nodes) and lines (links), each with the alpha of the scale it belongs to.
  // A node whose territory grows past P0 pixels fades into its descendants (the same graph, one step further into the
  // past); far out, descendants fade back into the node — the transition is continuous in the zoom, never a switch.
  render(W, H, maxDiscs = 3500) {
    const c = this.cam; if (!this.data.length || !this.top.length) return {discs: [], lines: [], frames: []};
    if (!this.placed) { this.placed = true; c.S = .45 * Math.min(W, H); }
    for (let i = 0; i < 64 && this.normalize(W, H); i++);
    const key = [W, H, c.k, c.w, c.x, c.y, c.S].join("|"); if (this.last?.key === key) return this.last.res;
    const P0 = 70, sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
    // start one frame up, so what surrounds the current frame is drawn too
    let T = [1, 0, 0], fk = c.k, fw = c.w;
    for (let up = 0; up < 1; up++) { const P = this.parentOf(fk, fw); if (!P) break; T = [T[0] / P.r.s, T[1] - T[0] * P.r.o[0] / P.r.s, T[2] - T[0] * P.r.o[1] / P.r.s];
      // T maps the parent's coordinates into the camera frame: x_cam = T₀·(x_parent − o)/s + T₁
      fk = P.k; fw = P.w; }
    const sx = x => W / 2 + (x - c.x) * c.S, sy = y => H / 2 + (y - c.y) * c.S;
    const discs = [], lines = [], frames = [], heap = [];
    const push = n => { heap.push(n); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p].rho >= heap[i].rho) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (;;) { const a = 2 * i + 1, b = a + 1; let m = i;
      if (a < heap.length && heap[a].rho > heap[m].rho) m = a; if (b < heap.length && heap[b].rho > heap[m].rho) m = b; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    push({k: fk, w: fw, T, rho: T[0] * c.S, alpha: 1, real: true, label: fw});
    while (heap.length && discs.length < maxDiscs) {
      const F = pop(), kids = this.children(F.k, F.w), cx = sx(F.T[1]), cy = sy(F.T[2]), R = F.T[0] * c.S;   // frame disc on screen
      if (cx + R < 0 || cy + R < 0 || cx - R > W || cy - R > H) continue;
      if (F.w || F.k) frames.push({x: cx, y: cy, r: R, label: F.w, k: F.k, alpha: F.alpha, real: F.real});
      const at = new Map();
      for (const r of kids) {
        const T2 = [F.T[0] * r.s, F.T[1] + F.T[0] * r.o[0], F.T[2] + F.T[0] * r.o[1]], x = sx(T2[1]), y = sy(T2[2]), rho = T2[0] * c.S;
        at.set(r.id, [x, y]); if (x + rho < -40 || y + rho < -40 || x - rho > W + 40 || y - rho > H + 40) continue;
        const open = r.into ? sm((rho - P0) / P0) : 0, a = F.alpha;
        const rad = Math.min(30, Math.max(1.5, rho * .33 * (.35 + .65 * Math.sqrt(r.share))));
        if (a * (1 - open) > .02) discs.push({x, y, r: rad, id: r.id, key: F.k + "|" + F.w + "|" + r.id, age: r.age, it: r.it, sym: r.sym, label: r.into?.w ?? null, real: F.real && r.real, alpha: a * (1 - open), rho, chain: r.into && r.into.w === "" && !r.into.k ? 0 : r.into && r.into.w === "" ? 1 : null});
        if (open > 0 && r.into) push({k: r.into.k, w: r.into.w, T: T2, rho, alpha: a * open, real: F.real && r.real});
      }
      // links of this scale, inherited: the graph's own links at the whole; inside a context, the lived links between
      // the pasts that came before it (a link between two ancestors is a link between their descendants)
      const LA = F.alpha * .9; if (LA < .03) continue;
      if (!F.w) { for (const e of this.edges) { const A = at.get(e.a), B = at.get(e.b); if (A && B && lines.length < 6000) lines.push({x1: A[0], y1: A[1], x2: B[0], y2: B[1], kind: e.kind, w: e.w, alpha: LA}); } }
      else { const K = kids.length > 24 ? [...kids].sort((a, b) => b.n - a.n).slice(0, 24) : kids; for (const r of K) for (const q of K) { if (r === q) continue; const wt = this.world.get("s:" + r.sym + ">s:" + q.sym); if (!wt) continue;
        const A = at.get(r.id), B = at.get(q.id); lines.push({x1: A[0], y1: A[1], x2: B[0], y2: B[1], kind: "world", w: wt, alpha: LA * (F.real ? 1 : .5)}); } }
    }
    const res = {discs, lines, frames}; this.last = {key, res}; return res;
  }
}

// 6D rotation: the 10 planes of the 5 learned axes and the 5 planes that turn time into each of them
export const PLANES6 = [[0, 1, "XY"], [0, 2, "XZ"], [0, 3, "XW"], [0, 4, "XV"], [1, 2, "YZ"], [1, 3, "YW"], [1, 4, "YV"], [2, 3, "ZW"], [2, 4, "ZV"], [3, 4, "WV"],
  [0, 5, "XT"], [1, 5, "YT"], [2, 5, "ZT"], [3, 5, "WT"], [4, 5, "VT"]];
export function rotation6(ang) {
  const M = Array.from({length: 6}, (_, i) => Array.from({length: 6}, (_, j) => +(i === j)));
  PLANES6.forEach(([a, b], k) => { if (!ang[k]) return; const c = Math.cos(ang[k]), s = Math.sin(ang[k]);
    const ra = M[a].slice(), rb = M[b].slice(); for (let j = 0; j < 6; j++) { M[a][j] = c * ra[j] - s * rb[j]; M[b][j] = s * ra[j] + c * rb[j]; } });
  return M;
}
