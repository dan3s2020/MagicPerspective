import {T, param, matmul, add, sub, mul, tanh, sigmoid, scale, concat, slice, logSoftmax, softmax, nllSet, bceLogit, sumAll, backward} from '../web/autograd.mjs';
let s = 1; const rng = () => (s = (s * 16807) % 2147483647) / 2147483647;
const W = param(5, 4, 1, rng), U = param(3, 4, 1, rng), b = param(1, 4, .5, rng), V = param(8, 3, 1, rng), w2 = param(4, 1, 1, rng);
const x = T.of([0.3, -0.7, 0.9, 0.1, -0.4]), y = T.of([0.5, 0.2, -0.3]);
const f = () => { const h = tanh(add(add(matmul(x, W), matmul(y, U)), b)); const k = sigmoid(slice(h, 1, 2));
  const z = concat([h, mul(h, k)]); const lp = logSoftmax(matmul(z, V)); const pr = softmax(matmul(h, slice(V, 0, 3).r ? matmul(T.of([1,0,0,0,0,0,0,0],1,8), V) : V));
  return sumAll([nllSet(lp, [0, 2]), bceLogit(matmul(sub(h, scale(h, .3)), w2), 1), nllSet(logSoftmax(matmul(mul(h, h), slice(W, 0, 4))), [1])]); };
const L = f(); backward(L); let worst = 0;
for (const P of [W, U, b, V, w2]) for (let i = 0; i < P.d.length; i++) { const ana = P.g ? P.g[i] : 0, o = P.d[i]; P.d[i] = o + 1e-6; const a = f().d[0]; P.d[i] = o - 1e-6; const c = f().d[0]; P.d[i] = o;
  const num = (a - c) / 2e-6; worst = Math.max(worst, Math.abs(num - ana) / Math.max(1e-6, Math.abs(num) + Math.abs(ana))); }
console.log('worst relative error', worst.toExponential(2)); if (worst > 1e-4) process.exit(1);
