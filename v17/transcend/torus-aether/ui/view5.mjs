// The lived space is a 5-torus: every axis is a circle of length 1, so leaving through one side is entering through
// the other (like Snake, on every axis at once). Seen from inside, the torus is an infinite periodic space: every node
// has an image at p + k for every integer vector k. What you see is a cut-and-project of that infinite space:
//   rotate the 5 axes (any of the 10 planes), keep the 2 first rotated axes as the screen, and keep only the images
//   whose 3 other rotated coordinates fall inside a window of half-thickness t (the section).
// For a generic rotation the screen is then filled forever, without an edge, never exactly repeating (this is how
// quasicrystals come out of a higher-dimensional lattice). The window thickness follows the zoom so the screen always
// holds about the same number of real images: zoom out → thinner section over a wider area, zoom in → thicker
// section over a smaller area. Nothing is placed by hand: positions are the learned torus coordinates.
export const PLANES = [[0, 1, "XY"], [0, 2, "XZ"], [0, 3, "XW"], [0, 4, "XV"], [1, 2, "YZ"], [1, 3, "YW"], [1, 4, "YV"], [2, 3, "ZW"], [2, 4, "ZV"], [3, 4, "WV"]];
export const wrap1 = x => x - Math.floor(x);
export const wrapD = x => x - Math.round(x);                                  // shortest way around a circle, in [-0.5, 0.5]

export function rotation(ang) {                                               // M: rotated = M · v
  let M = Array.from({length: 5}, (_, i) => Array.from({length: 5}, (_, j) => +(i === j)));
  PLANES.forEach(([a, b], k) => { if (!ang[k]) return; const c = Math.cos(ang[k]), s = Math.sin(ang[k]);
    const ra = M[a].slice(), rb = M[b].slice(); for (let j = 0; j < 5; j++) { M[a][j] = c * ra[j] - s * rb[j]; M[b][j] = s * ra[j] + c * rb[j]; } });
  return M;
}
export const applyT = (M, v) => [0, 1, 2, 3, 4].map(j => M.reduce((s, row, i) => s + row[j] * v[i], 0));   // Mᵀ · v

function det3(m) { return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]); }
function inv3(m) { const d = det3(m), c = (i, j) => { const r = [0, 1, 2].filter(x => x !== i), s = [0, 1, 2].filter(x => x !== j);
  return ((i + j) % 2 ? -1 : 1) * (m[r[0]][s[0]] * m[r[1]][s[1]] - m[r[0]][s[1]] * m[r[1]][s[0]]); };
  return [0, 1, 2].map(i => [0, 1, 2].map(j => c(j, i) / d)); }
const mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, x, k) => s + x * B[k][j], 0)));

// split the 5 lattice directions into 2 "free" (a) and 3 "solved" (b) ones, choosing the best-conditioned split
export function prepare(M) {
  let best = null;
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
    const a = [i, j], b = [0, 1, 2, 3, 4].filter(x => x !== i && x !== j), Hb = [2, 3, 4].map(r => b.map(c => M[r][c])), d = Math.abs(det3(Hb));
    if (!best || d > best.d) best = {a, b, d, Hb};
  }
  const {a, b, Hb} = best, HbInv = inv3(Hb), Ha = [2, 3, 4].map(r => a.map(c => M[r][c]));
  const Pa = [0, 1].map(r => a.map(c => M[r][c])), Pb = [0, 1].map(r => b.map(c => M[r][c]));
  const G = mul(HbInv, Ha), PbG = mul(Pb, G), Q = [[Pa[0][0] - PbG[0][0], Pa[0][1] - PbG[0][1]], [Pa[1][0] - PbG[1][0], Pa[1][1] - PbG[1][1]]];
  const dq = Q[0][0] * Q[1][1] - Q[0][1] * Q[1][0], Qinv = [[Q[1][1] / dq, -Q[0][1] / dq], [-Q[1][0] / dq, Q[0][0] / dq]];
  return {M, a, b, Hb, HbInv, Ha, Pa, Pb, G, Q, Qinv, detQ: Math.abs(dq)};
}

// all images of all items inside the view (half-extent hw × hh, torus units) and inside the section (half-thickness t)
// stride m > 1 keeps only every m-th row of the free lattice directions (level of detail when zoomed far out)
export function images(items, cam, P, hw, hh, t, m = 1, budget = 4000) {
  const {M, a, b, HbInv, Ha, Hb, Pa, Pb, G, Qinv} = P, out = [];
  const e = HbInv.map(r => r.reduce((s, x) => s + Math.abs(x), 0) * t + .5);
  const slack = Pb.map(r => r.reduce((s, x, i) => s + Math.abs(x) * (e[i] + .5), 0));
  for (let it = 0; it < items.length && out.length < budget; it++) {
    const p = items[it].p, d = [0, 1, 2, 3, 4].map(i => p[i] - cam[i]);
    const base = M.map(row => row.reduce((s, x, j) => s + x * d[j], 0)), bh = base.slice(2), bp = base.slice(0, 2);
    const kb0 = HbInv.map(r => -r.reduce((s, x, j) => s + x * bh[j], 0));
    const off = [bp[0] + Pb[0].reduce((s, x, i) => s + x * kb0[i], 0), bp[1] + Pb[1].reduce((s, x, i) => s + x * kb0[i], 0)];
    let lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const vx = sx * (hw + slack[0]) - off[0], vy = sy * (hh + slack[1]) - off[1];
      const k = [Qinv[0][0] * vx + Qinv[0][1] * vy, Qinv[1][0] * vx + Qinv[1][1] * vy];
      for (let r = 0; r < 2; r++) { lo[r] = Math.min(lo[r], k[r]); hi[r] = Math.max(hi[r], k[r]); }
    }
    const s0 = Math.ceil(lo[0] / m) * m, s1 = Math.ceil(lo[1] / m) * m;
    for (let k0 = s0; k0 <= hi[0]; k0 += m) for (let k1 = s1; k1 <= hi[1]; k1 += m) {
      const kbs = [0, 1, 2].map(i => kb0[i] - G[i][0] * k0 - G[i][1] * k1);
      const r0 = [Math.ceil(kbs[0] - e[0]), Math.floor(kbs[0] + e[0])], r1 = [Math.ceil(kbs[1] - e[1]), Math.floor(kbs[1] + e[1])], r2 = [Math.ceil(kbs[2] - e[2]), Math.floor(kbs[2] + e[2])];
      const c0 = [0, 1, 2].map(r => bh[r] + Ha[r][0] * k0 + Ha[r][1] * k1);
      for (let b0 = r0[0]; b0 <= r0[1]; b0++) for (let b1 = r1[0]; b1 <= r1[1]; b1++) {
        // the third solved direction is not scanned: its admissible integers come straight from the 3 section limits
        let lo2 = r2[0], hi2 = r2[1];
        for (let r = 0; r < 3 && lo2 <= hi2; r++) { const c = c0[r] + Hb[r][0] * b0 + Hb[r][1] * b1, k = Hb[r][2];
          if (Math.abs(k) < 1e-12) { if (Math.abs(c) > t) lo2 = 1, hi2 = 0; continue; }
          const u = (-t - c) / k, v = (t - c) / k; lo2 = Math.max(lo2, Math.ceil(Math.min(u, v) - 1e-12)); hi2 = Math.min(hi2, Math.floor(Math.max(u, v) + 1e-12)); }
        for (let b2 = lo2; b2 <= hi2; b2++) {
        const h = [0, 1, 2].map(r => c0[r] + Hb[r][0] * b0 + Hb[r][1] * b1 + Hb[r][2] * b2);
        if (Math.abs(h[0]) > t || Math.abs(h[1]) > t || Math.abs(h[2]) > t) continue;
        const x = bp[0] + Pa[0][0] * k0 + Pa[0][1] * k1 + Pb[0][0] * b0 + Pb[0][1] * b1 + Pb[0][2] * b2;
        const y = bp[1] + Pa[1][0] * k0 + Pa[1][1] * k1 + Pb[1][0] * b0 + Pb[1][1] * b1 + Pb[1][2] * b2;
        if (Math.abs(x) > hw || Math.abs(y) > hh) continue;
        out.push({it, q: [x, y, h[0], h[1], h[2]]});
      } }
    }
  }
  return out;
}

// choose the section thickness and level of detail for a view so that about `target` real images are visible
export function plan(P, n, hw, hh, target, mul = 1, tmax = 2) {
  const area = 4 * hw * hh / P.detQ * n;                                      // free-lattice rows scanned at stride 1
  const m = Math.max(1, Math.ceil(Math.sqrt(area / 6000)));
  const t = Math.min(tmax, mul * Math.cbrt(target * m * m / (32 * n * hw * hh)));
  return {m, t};
}
