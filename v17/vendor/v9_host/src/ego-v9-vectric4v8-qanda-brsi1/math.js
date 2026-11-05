export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
export function sigmoid(x) {
  const z = clamp(x, -30, 30);
  return 1 / (1 + Math.exp(-z));
}
export function softmax(logits) {
  let m = -Infinity;
  for (const v of logits) if (v > m) m = v;
  const out = new Float64Array(logits.length);
  let s = 0;
  for (let i = 0; i < logits.length; i++) {
    out[i] = Math.exp(clamp(logits[i] - m, -40, 40));
    s += out[i];
  }
  if (!(s > 0) || !Number.isFinite(s)) {
    out.fill(1 / Math.max(1, out.length));
    return out;
  }
  for (let i = 0; i < out.length; i++) out[i] /= s;
  return out;
}
export function entropy(probs) {
  let h = 0;
  for (const p of probs) if (p > 1e-15) h -= p * Math.log(p);
  return h;
}
export function dot2(ax, ay, bx, by) { return ax * bx + ay * by; }
export function norm2(x, y) { return Math.hypot(x, y); }
export function unit2(x, y) {
  const n = Math.hypot(x, y);
  return n > 1e-12 ? { x: x / n, y: y / n } : { x: 0, y: 0 };
}
export function mse(a, b) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return n ? s / n : 0;
}
export class RNG {
  constructor(seed = 1) {
    this.s = (seed >>> 0) || 1;
    this.haveSpare = false;
    this.spare = 0;
  }
  next() {
    let x = this.s;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(n) { return Math.floor(this.next() * n); }
  normal() {
    if (this.haveSpare) { this.haveSpare = false; return this.spare; }
    let u = 0, v = 0;
    while (u <= 1e-12) u = this.next();
    while (v <= 1e-12) v = this.next();
    const mag = Math.sqrt(-2 * Math.log(u));
    const a = 2 * Math.PI * v;
    this.spare = mag * Math.sin(a);
    this.haveSpare = true;
    return mag * Math.cos(a);
  }
}
export function sampleCategorical(probs, rng) {
  let u = rng.next();
  for (let i = 0; i < probs.length; i++) {
    u -= probs[i];
    if (u <= 0) return i;
  }
  return probs.length - 1;
}
