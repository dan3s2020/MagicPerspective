// THE FRACTAL OF LIVED MOMENTS (chaos-game representation, Jeffrey 1990, driven by the graph's own geometry).
// Every symbol s has a place p_s (learned by concepts.mjs Geometry, or random corners for comparison). Every lived
// moment is a point: when s is lived, the point moves the fraction λ of the way toward p_s:  x ← x + λ (p_s − x).
// So a moment's place holds its whole past: the last symbol at scale λ, the one before at λ(1−λ), … — near past sharp,
// far past ever finer (scale-invariant time). All moments ending in "a" lie in a's region, inside it those ending in
// "ta" in a smaller copy, and so on forever: zooming in continuously descends into longer contexts; the self-similarity
// comes from the iteration itself, as in the Mandelbrot set.
// MomentSpace keeps the lived moments (point → what came next) in a grid index and answers: what came next after the
// moments nearest to this one? Near in this space = alike in recent past, alike by concept further back.
export class MomentSpace {
  constructor({D = 5, lambda = .5, cell = .02, k = 24, cap = 400000} = {}) {
    Object.assign(this, {D, lambda, cell, k, cap}); this.pts = []; this.next = []; this.grid = new Map();
  }
  step(x, p) { const l = this.lambda; for (let i = 0; i < this.D; i++) x[i] += l * (p[i] - x[i]); return x; }
  key(x, s = this.cell) { let k = ""; for (let i = 0; i < this.D; i++) k += Math.floor(x[i] / s) + ","; return k; }
  add(x, y) {
    if (this.pts.length >= this.cap) return; const id = this.pts.length; this.pts.push(Float32Array.from(x)); this.next.push(y);
    const k = this.key(x); let b = this.grid.get(k); if (!b) { b = []; this.grid.set(k, b); } b.push(id);
  }
  // distribution of what followed the k nearest lived moments (searching outward ring by ring in the grid)
  ask(x, N = 128) {
    const c = x.map(v => Math.floor(v / this.cell)), found = [];
    for (let r = 0; r <= 3 && found.length < this.k; r++) {
      const visit = (dim, off) => { if (dim === this.D) { if (off.some(o => Math.abs(o) === r) || r === 0) { const b = this.grid.get(off.map((o, i) => c[i] + o).join(",") + ","); if (b) for (const id of b) found.push(id); } return; }
        for (let o = -r; o <= r; o++) { off[dim] = o; visit(dim + 1, off); } };
      if (r <= 1 || found.length < this.k) visit(0, new Array(this.D).fill(0));
    }
    if (!found.length) return null;
    const d = found.map(id => { let s = 0; const p = this.pts[id]; for (let i = 0; i < this.D; i++) { const t = p[i] - x[i]; s += t * t; } return [s, id]; }).sort((a, b) => a[0] - b[0]).slice(0, this.k);
    const out = new Array(N).fill(0), h = Math.max(1e-12, d[Math.min(d.length - 1, 3)][0]); let z = 0;
    for (const [s, id] of d) { const w = Math.exp(-s / h); out[this.next[id]] += w; z += w; }
    return out.map(v => v / z);
  }
}

// The field as part of the mind, while the graph keeps devouring: every lived moment is added to the field as it
// happens; the learned places keep moving, so now and then the field is rebuilt from the recent lived stream with the
// places as they are now (validated offline: graph + field averaged, λ=.75, k=12, +4.7 points on 4 clean worlds).
export class LivedField {
  constructor({lambda = .75, k = 12, keep = 200000, rebuildEvery = 50000} = {}) {
    Object.assign(this, {lambda, k, keep, rebuildEvery}); this.ring = []; this.since = 0; this.reset();
  }
  reset() { this.M = new MomentSpace({D: 5, lambda: this.lambda, k: this.k, cap: this.keep * 2}); this.x = new Array(5).fill(.5); }
  live(y, place) {                                                        // one lived byte
    this.M.add(this.x, y); this.M.step(this.x, place(y)); this.ring.push(y); if (this.ring.length > this.keep * 1.5) this.ring.splice(0, this.ring.length - this.keep);
    if (++this.since >= this.rebuildEvery) this.rebuild(place);
  }
  rebuild(place) { this.since = 0; this.reset(); const r = this.ring.slice(-this.keep);
    for (let i = 0; i < Math.min(200, r.length); i++) this.M.step(this.x, place(r[i]));
    for (const y of r) { this.M.add(this.x, y); this.M.step(this.x, place(y)); } }
  // read a text it has not lived: the field's prediction before every byte (the field does not learn from it)
  // (the field is rebuilt first with the places as they are now, so the lived moments and the query share one geometry)
  read(bytes, place) { this.rebuild(place); const x = new Array(5).fill(.5), out = []; for (const y of bytes) { out.push(this.M.ask(x)); this.M.step(x, place(y)); } return out; }
}
