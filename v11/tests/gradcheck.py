import sys; sys.path.insert(0, ".")
import sys, numpy as np
import engine.backend as _bk
class _NP64:
    def __getattr__(s, k): return np.float64 if k == "float32" else getattr(np, k)
_bk.np = _NP64()
sys.path.insert(0, '.')
from engine.portal import Brain, batch_graphs

def rand_graph(rng, n, fam):
    E = set()
    for i in range(n):
        for j in rng.choice(n, 2, replace=False):
            if j != i: E.add((int(i), int(j))); E.add((int(j), int(i)))
    s = [a for a, _ in sorted(E)]; d = [b for _, b in sorted(E)]
    return dict(n=n, X=rng.standard_normal((n, 5)).astype(np.float32), labels=[[f'{fam}/a'] if i % 2 else [f'{fam}/b', f'{fam}/c'] for i in range(n)],
                family=fam, edges=(np.array(s), np.array(d)), K=3 + n % 3)

rng = np.random.default_rng(1)
b = Brain(C=6, F=5, seed=3)
items = [rand_graph(rng, 7, 'f1'), rand_graph(rng, 9, 'f2')]
G, offs = batch_graphs(b, items)
N = G['N']; y = (rng.random(N) < .4).astype(np.float32); yn = (rng.random(N) < .2).astype(np.float32); mask = (rng.random(N) < .9).astype(np.float32)
sw = dict(w=[1.0, 2.0], shape=[1.0, 1.0])
out = b.forward(G); tfix = np.abs(out['p'] - y)

def objective():
    o = b.forward(G); p, U, q = o['p'], o['U'], o['q']
    wid = G['wid']; cnt = np.maximum(np.bincount(wid, mask, 2), 1); ws = mask * (np.array(sw['w']) / cnt)[wid]
    e = 1e-6; pc = np.clip(p, e, 1 - e); qc = np.clip(q, e, 1 - e)
    L = -(ws * (y * np.log(pc) + (1 - y) * np.log(1 - pc))).sum() + (ws * (U - tfix) ** 2).sum()
    pos = np.bincount(wid, mask * yn, 2); wp1 = np.clip((cnt - pos) / np.maximum(pos, 1), 1, 20)
    wq = mask * (yn * wp1[wid] + 1 - yn); tw2 = np.bincount(wid, wq, 2); wq = wq * (np.array(sw['w']) / tw2)[wid]
    return L - (wq * (yn * np.log(qc) + (1 - yn) * np.log(1 - qc))).sum()

b.backward(out, y, mask, yn, G['wid'], 2, sw)
worst = 0
for k in ['L', 'W0', 'b0', 'W', 'b', 'wp', 'wu', 'wq', 'bp']:
    Pk = b.P[k]; flat = Pk.reshape(-1); gflat = b.G[k].reshape(-1)
    for i in rng.choice(flat.size, min(6, flat.size), replace=False):
        old = flat[i]; h = 1e-3
        flat[i] = old + h; Lp = objective(); flat[i] = old - h; Lm = objective(); flat[i] = old
        num = (Lp - Lm) / (2 * h); ana = gflat[i]
        rel = abs(num - ana) / max(1e-4, abs(num) + abs(ana)); worst = max(worst, rel)
        if rel > 0.05: print('MISMATCH', k, i, num, ana)
print('worst relative error', round(float(worst), 4))
