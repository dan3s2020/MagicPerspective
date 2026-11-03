"""Decisive tests on saved brains:  python evalsaved.py results/polymath-s7.npz --count 16 --out results/polymath-2700-s7.json"""
import argparse, json, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine.portal import Brain
from engine.life import evaluate
from worlds import FAMILIES
ap = argparse.ArgumentParser(); ap.add_argument('brain'); ap.add_argument('--count', type=int, default=16); ap.add_argument('--out', default='')
ap.add_argument('--families', default=','.join(FAMILIES))
a = ap.parse_args(); t0 = time.time()
organ = Brain.load(a.brain); ctrl = Brain.load(a.brain.replace('.npz', '-control.npz')) if os.path.exists(a.brain.replace('.npz', '-control.npz')) else None
others = {'untrained': Brain(seed=8)}
if ctrl: others['next-step'] = ctrl
res = {}
for fam in a.families.split(','):
    res.update(evaluate(organ, [fam], count=a.count, others=others))
    r = res[fam]
    print('==', fam, f'{time.time()-t0:.0f}s', flush=True)
    for m, v in r.items():
        print(f"  {m:10s} bce0 {v['bce0']:.3f} f1_0 {v['f1_0']:.3f} solved {v['solved']:.2f} ratio {v['ratio'] and round(v['ratio'],2)} bce50 {v['bce50']:.3f} acc {v['accuracy'] and round(v['accuracy'],3)} ucorr {v.get('ucorr') and round(v['ucorr'],2)} island {v.get('island') and {k: round(x,3) for k,x in v['island'].items()}}", flush=True)
    if a.out: json.dump(dict(brain=a.brain, results=res, labels=len(organ.labels), exercises=organ.exercises), open(a.out, 'w'), indent=1)
