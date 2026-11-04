// A minimal reverse-mode automatic differentiation for row vectors and matrices (Float64), enough for V16's fabric.
// Every value is a T (r×c). Operations record their parents and a backward function; backward() walks them in reverse.
export class T {
  constructor(data, r, c, parents = null, back = null) { this.d = data; this.r = r; this.c = c; this.p = parents; this.b = back; this.g = null; }
  static zeros(r, c) { return new T(new Float64Array(r * c), r, c); }
  static of(arr, r = 1, c = arr.length) { return new T(Float64Array.from(arr), r, c); }
  grad() { if (!this.g) this.g = new Float64Array(this.d.length); return this.g; }
}
export function param(r, c, scale, rng) { const t = T.zeros(r, c); for (let i = 0; i < t.d.length; i++) t.d[i] = (rng() * 2 - 1) * scale; t.isParam = true; return t; }

export function matmul(a, b) {             // (r×k)(k×c)
  const r = a.r, k = a.c, c = b.c, o = new Float64Array(r * c);
  for (let i = 0; i < r; i++) for (let j = 0; j < k; j++) { const av = a.d[i * k + j]; if (!av) continue; const bo = j * c, oo = i * c; for (let q = 0; q < c; q++) o[oo + q] += av * b.d[bo + q]; }
  return new T(o, r, c, [a, b], (out) => {
    const g = out.g, ga = a.p || a.isParam || a.needs ? a.grad() : null, gb = b.grad();
    for (let i = 0; i < r; i++) for (let j = 0; j < k; j++) { const av = a.d[i * k + j], bo = j * c, oo = i * c; let s = 0;
      for (let q = 0; q < c; q++) { s += g[oo + q] * b.d[bo + q]; if (av) gb[bo + q] += av * g[oo + q]; }
      if (ga) ga[i * k + j] += s; }
  });
}
function binary(a, b, f, dfa, dfb) {       // same shape, or b is 1×c broadcast over rows, or b is 1×1 scalar
  const n = a.d.length, bc = b.d.length, o = new Float64Array(n);
  const bi = bc === n ? (i => i) : bc === 1 ? (() => 0) : (i => i % a.c);
  for (let i = 0; i < n; i++) o[i] = f(a.d[i], b.d[bi(i)]);
  return new T(o, a.r, a.c, [a, b], (out) => { const g = out.g, ga = a.grad(), gb = b.grad();
    for (let i = 0; i < n; i++) { ga[i] += g[i] * dfa(a.d[i], b.d[bi(i)]); gb[bi(i)] += g[i] * dfb(a.d[i], b.d[bi(i)]); } });
}
export const add = (a, b) => binary(a, b, (x, y) => x + y, () => 1, () => 1);
export const sub = (a, b) => binary(a, b, (x, y) => x - y, () => 1, () => -1);
export const mul = (a, b) => binary(a, b, (x, y) => x * y, (x, y) => y, (x) => x);
function unary(a, f, df) { const o = a.d.map(f); return new T(o, a.r, a.c, [a], (out) => { const g = out.g, ga = a.grad(); for (let i = 0; i < o.length; i++) ga[i] += g[i] * df(a.d[i], o[i]); }); }
export const tanh = a => unary(a, Math.tanh, (x, y) => 1 - y * y);
export const sigmoid = a => unary(a, x => 1 / (1 + Math.exp(-x)), (x, y) => y * (1 - y));
export const scale = (a, k) => unary(a, x => x * k, () => k);
export function concat(list) { const r = list[0].r, c = list.reduce((s, t) => s + t.c, 0), o = new Float64Array(r * c); let off = 0;
  for (const t of list) { for (let i = 0; i < r; i++) for (let j = 0; j < t.c; j++) o[i * c + off + j] = t.d[i * t.c + j]; off += t.c; }
  return new T(o, r, c, list, (out) => { let off2 = 0; for (const t of list) { const gt = t.grad(); for (let i = 0; i < r; i++) for (let j = 0; j < t.c; j++) gt[i * t.c + j] += out.g[i * c + off2 + j]; off2 += t.c; } }); }
export function slice(a, c0, c1) { const c = c1 - c0, o = new Float64Array(a.r * c);
  for (let i = 0; i < a.r; i++) for (let j = 0; j < c; j++) o[i * c + j] = a.d[i * a.c + c0 + j];
  return new T(o, a.r, c, [a], (out) => { const ga = a.grad(); for (let i = 0; i < a.r; i++) for (let j = 0; j < c; j++) ga[i * a.c + c0 + j] += out.g[i * c + j]; }); }
export function pick(a, j) { return slice(a, j, j + 1); }
export function logSoftmax(a) {            // row vector 1×c
  const m = Math.max(...a.d); let z = 0; for (const v of a.d) z += Math.exp(v - m); const lz = m + Math.log(z), o = a.d.map(v => v - lz);
  return new T(o, a.r, a.c, [a], (out) => { const ga = a.grad(); let s = 0; for (const v of out.g) s += v; for (let i = 0; i < o.length; i++) ga[i] += out.g[i] - Math.exp(o[i]) * s; }); }
export function softmax(a) { const ls = logSoftmax(a); return unary(ls, Math.exp, (x, y) => y); }
// −log Σ_{i∈set} p_i from log-probabilities (several correct answers are all accepted)
export function nllSet(lp, set) { const m = Math.max(...set.map(i => lp.d[i])); let z = 0; for (const i of set) z += Math.exp(lp.d[i] - m); const val = -(m + Math.log(z));
  return new T(Float64Array.of(val), 1, 1, [lp], (out) => { const g = lp.grad(); for (const i of set) g[i] += -out.g[0] * Math.exp(lp.d[i] - m) / z; }); }
export function bceLogit(x, y) {           // x 1×1 logit, y in {0,1}
  const v = x.d[0], val = Math.max(v, 0) - v * y + Math.log(1 + Math.exp(-Math.abs(v)));
  return new T(Float64Array.of(val), 1, 1, [x], (out) => { x.grad()[0] += out.g[0] * (1 / (1 + Math.exp(-v)) - y); }); }
export function sumAll(list) { let s = 0; for (const t of list) s += t.d[0];
  return new T(Float64Array.of(s), 1, 1, list, (out) => { for (const t of list) t.grad()[0] += out.g[0]; }); }
export const constant = t => { const c = new T(t.d.slice(), t.r, t.c); return c; };

export function backward(loss) {
  const order = [], seen = new Set();
  const visit = (t) => { if (seen.has(t)) return; seen.add(t); if (t.p) for (const q of t.p) visit(q); order.push(t); };
  // iterative DFS to avoid deep recursion on long episodes
  const stack = [[loss, 0]];
  while (stack.length) { const top = stack[stack.length - 1], [t, i] = top;
    if (i === 0 && seen.has(t)) { stack.pop(); continue; }
    if (i === 0) seen.add(t);
    if (t.p && i < t.p.length) { top[1]++; const q = t.p[i]; if (!seen.has(q)) stack.push([q, 0]); }
    else { order.push(t); stack.pop(); } }
  loss.grad()[0] = 1;
  for (let k = order.length - 1; k >= 0; k--) { const t = order[k]; if (t.b && t.g) t.b(t); }
}

export class Adam {
  constructor(params, lr = 0.003) { this.ps = params; this.lr = lr; this.t = 0; this.m = params.map(p => new Float64Array(p.d.length)); this.v = params.map(p => new Float64Array(p.d.length)); }
  step(clip = 1) { this.t++; const b1 = .9, b2 = .999, c1 = 1 - b1 ** this.t, c2 = 1 - b2 ** this.t;
    this.ps.forEach((p, k) => { if (!p.g) return; const m = this.m[k], v = this.v[k];
      for (let i = 0; i < p.d.length; i++) { let g = Math.max(-clip, Math.min(clip, p.g[i])); m[i] = b1 * m[i] + (1 - b1) * g; v[i] = b2 * v[i] + (1 - b2) * g * g; p.d[i] -= this.lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + 1e-8); }
      p.g = null; }); }
  zero() { for (const p of this.ps) p.g = null; }
}
