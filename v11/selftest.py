"""Checks that the chosen device computes the network exactly like the NumPy reference (forward AND hand-written gradients),
and measures the speed of one parallel training pass. Exit code 0 = OK.   python selftest.py --device cuda"""
import argparse, sys, os, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine.backend import make_backend, NumpyBackend
from engine.portal import Brain, batch_graphs
from engine.life import Episode, seed_of
from worlds import FAMILIES

ap = argparse.ArgumentParser(); ap.add_argument('--device', default='cuda'); ap.add_argument('--parallel', type=int, default=64)
a = ap.parse_args()
try:
    be = make_backend(a.device)
except Exception as ex:
    print('DEVICE ERROR:', ex); sys.exit(2)
print('device:', be.name)
ref = Brain(seed=11, backend=NumpyBackend())
eps = [Episode(f, seed_of(77, i), FAMILIES[f]['sizes'][0]) for i, f in enumerate(['maze2d', 'sat', 'text', 'voter', 'car', 'maze3d'])]
items = [e.mind.graph() for e in eps]
G, offs = batch_graphs(ref, items)
dev = Brain(seed=11, backend=be)
dev.labels = dict(ref.labels); dev.label_meta = list(ref.label_meta)
for k in ref.P: dev.P[k] = be.asarray(ref.P[k]); dev.G[k] = be.zeros(tuple(ref.P[k].shape)); dev.M[k] = be.zeros(tuple(ref.P[k].shape)); dev.V[k] = be.zeros(tuple(ref.P[k].shape))
rng = np.random.default_rng(3); N = G['N']
y = (rng.random(N) < .3).astype(np.float32); yn = (rng.random(N) < .1).astype(np.float32); mask = np.ones(N, np.float32)
sw = dict(w=[1.0] * len(items), shape=[1.0] * len(items))
o1 = ref.forward(G); l1 = ref.backward(o1, y, mask, yn, G['wid'], len(items), sw)
o2 = dev.forward(G); l2 = dev.backward(o2, y, mask, yn, G['wid'], len(items), sw)
worst = max(float(np.abs(be.to_numpy(o2[k]) - o1[k]).max()) for k in ('p', 'U', 'q'))
gw = max(float(np.abs(be.to_numpy(dev.G[k]) - ref.G[k]).max() / (np.abs(ref.G[k]).max() + 1e-6)) for k in ref.P)
print(f'forward max diff {worst:.2e} · gradient max relative diff {gw:.2e} · loss {l1:.5f} vs {l2:.5f}')
ok = worst < 1e-3 and gw < 1e-2
# speed of one parallel pass (network only) with `parallel` worlds
big = [Episode('maze2d', seed_of(91, i), 9) for i in range(a.parallel)]
Gb, _ = batch_graphs(dev, [e.mind.graph() for e in big])
Nb = Gb['N']; yb = np.zeros(Nb, np.float32); mb = np.ones(Nb, np.float32); swb = dict(w=[1.0] * a.parallel, shape=[1.0] * a.parallel)
for rep in range(2):
    t = time.time(); ob = dev.forward(Gb); dev.backward(ob, yb, mb, yb, Gb['wid'], a.parallel, swb); dev.G = {k: v * 0 for k, v in dev.G.items()}
    if hasattr(be, 't') and str(be.device).startswith('cuda'): be.t.cuda.synchronize()
    dt = time.time() - t
print(f'one training pass over {a.parallel} parallel 9x9 mazes ({Nb} nodes): {dt*1000:.0f} ms')
print('SELFTEST', 'OK' if ok else 'FAILED'); sys.exit(0 if ok else 1)
