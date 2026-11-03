"""python bench.py --families maze2d --episodes 1500 --parallel 16 --seed 7 --count 48
Trains ONE network (with the shape organ) and the same network without it (next-step only) on the same unique worlds,
then measures everything on unseen worlds against the untrained network and the references without learning."""
import argparse, json, time, sys, os
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine.portal import Brain
from engine.backend import make_backend
from engine.life import run_episodes, evaluate, seed_of, SEEDS
from worlds import FAMILIES

ap = argparse.ArgumentParser()
ap.add_argument('--families', default='maze2d'); ap.add_argument('--episodes', type=int, default=1500)
ap.add_argument('--parallel', type=int, default=16); ap.add_argument('--seed', type=int, default=7)
ap.add_argument('--count', type=int, default=48); ap.add_argument('--lr', type=float, default=0.003)
ap.add_argument('--C', type=int, default=16); ap.add_argument('--device', default='auto'); ap.add_argument('--control', type=int, default=1)
ap.add_argument('--source', default='q'); ap.add_argument('--test-sizes', default=''); ap.add_argument('--save', default=''); ap.add_argument('--out', default='')
a = ap.parse_args()
be = make_backend(a.device); fams = a.families.split(',')
if a.test_sizes:
    for f in fams: FAMILIES[f]['test_sizes'] = [int(x) for x in a.test_sizes.split(',')]
print('device', be.name, flush=True)
specs = []
for i in range(a.episodes):
    fam = fams[i % len(fams)]; S = FAMILIES[fam]['sizes']
    specs.append((fam, seed_of(SEEDS['train'] + 17 * a.seed, i), S[(i // len(fams)) % len(S)]))
t0 = time.time()
organ = Brain(C=a.C, seed=a.seed, lr=a.lr, backend=be)
rng = np.random.default_rng(a.seed)
n = [0]
def prog(e):
    n[0] += 1
    if n[0] % 250 == 0: print('organ', n[0], f'{time.time()-t0:.0f}s', flush=True)
run_episodes(organ, specs, 'organ', learn=True, parallel=a.parallel, explore=0.1, rng=rng, on_done=prog, source=a.source)
others = {'untrained': Brain(C=a.C, seed=a.seed + 1, backend=be)}
if a.control:
    ctrl = Brain(C=a.C, seed=a.seed, lr=a.lr, backend=be)
    run_episodes(ctrl, specs, 'next-step', learn=True, parallel=a.parallel, explore=0.1, rng=np.random.default_rng(a.seed), source='q')
    others['next-step'] = ctrl
print('trained', f'{time.time()-t0:.0f}s', flush=True)
if a.save:
    organ.save(a.save)
    if a.control: others['next-step'].save(a.save.replace('.npz', '-control.npz'))
res = evaluate(organ, fams, count=a.count, others=others)
for fam, r in res.items():
    print('==', fam)
    for m, v in r.items():
        print(f"{m:10s} bce0 {v['bce0']:.3f} f1_0 {v['f1_0']:.3f} valid0 {v['valid0']:.2f} ratio {v['ratio'] if v['ratio'] is None else round(v['ratio'],3)} solved {v['solved']:.2f} bce25 {v['bce25']:.3f} bce50 {v['bce50']:.3f} bce75 {v['bce75']:.3f}")
print('s', round(time.time() - t0))
if a.out:
    json.dump(dict(args=vars(a), device=be.name, results=res), open(a.out, 'w'), indent=1)
