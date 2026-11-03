"""Transfer and the polymath (messages 49, 53, 55; 2026-11-03-USER-POLYMATH):
does living OTHER worlds in the same abstract network help (or hurt) a world, compared with a specialist that lived only that
world, with the same number of episodes in it?  And: what does a network that never saw a world do there at first sight?

python transfer.py specialists --episodes 300 --seed 7          (one specialist per world)
python transfer.py zeroshot --target sat --episodes 2400 --seed 7  (all worlds except the target, then the target at first sight)"""
import argparse, json, os, sys, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from engine.portal import Brain
from engine.life import run_episodes, evaluate, seed_of, SEEDS
from worlds import FAMILIES

ap = argparse.ArgumentParser(); ap.add_argument('what'); ap.add_argument('--episodes', type=int, default=300); ap.add_argument('--seed', type=int, default=7)
ap.add_argument('--target', default='sat'); ap.add_argument('--count', type=int, default=16); ap.add_argument('--parallel', type=int, default=4)
ap.add_argument('--families', default=','.join(FAMILIES)); ap.add_argument('--after', type=int, default=100)
a = ap.parse_args(); fams = a.families.split(','); t0 = time.time(); out = dict(args=vars(a))
os.makedirs('results', exist_ok=True)

def specs_for(flist, n, salt):
    return [(flist[i % len(flist)], seed_of(SEEDS['train'] + 17 * a.seed + salt, i), FAMILIES[flist[i % len(flist)]]['sizes'][(i // len(flist)) % len(FAMILIES[flist[i % len(flist)]]['sizes'])]) for i in range(n)]

if a.what == 'specialists':
    for fam in fams:
        b = Brain(seed=a.seed)
        run_episodes(b, specs_for([fam], a.episodes, 0), 'organ', learn=True, parallel=a.parallel, explore=.1, rng=np.random.default_rng(a.seed))
        r = evaluate(b, [fam], count=a.count, modes=('organ',))[fam]['organ']
        out[fam] = r; print(fam, json.dumps({k: (round(v, 3) if isinstance(v, float) else v) for k, v in r.items() if k != 'bySize'}), f'{time.time()-t0:.0f}s', flush=True)
        json.dump(out, open(f'results/specialists-{a.episodes}-s{a.seed}.json', 'w'), indent=1)
elif a.what == 'zeroshot':
    others = [f for f in fams if f != a.target]
    vet = Brain(seed=a.seed)
    run_episodes(vet, specs_for(others, a.episodes, 0), 'organ', learn=True, parallel=a.parallel, explore=.1, rng=np.random.default_rng(a.seed))
    fresh = Brain(seed=a.seed + 100)
    rows = []
    for k in [0, a.after]:
        if k:
            sp = specs_for([a.target], k, 999)
            run_episodes(vet, sp, 'organ', learn=True, parallel=a.parallel, explore=.1, rng=np.random.default_rng(1))
            run_episodes(fresh, sp, 'organ', learn=True, parallel=a.parallel, explore=.1, rng=np.random.default_rng(1))
        rv = evaluate(vet, [a.target], count=a.count, modes=('organ',))[a.target]['organ']; rf = evaluate(fresh, [a.target], count=a.count, modes=('organ',))[a.target]['organ']
        rows.append(dict(episodes_in_target=k, veteran=rv, fresh=rf))
        print(a.target, k, 'veteran', round(rv['bce0'], 3), rv['f1_0'] and round(rv['f1_0'], 3), rv['ratio'] and round(rv['ratio'], 2), round(rv['solved'], 2),
              '| fresh', round(rf['bce0'], 3), rf['f1_0'] and round(rf['f1_0'], 3), rf['ratio'] and round(rf['ratio'], 2), round(rf['solved'], 2), f'{time.time()-t0:.0f}s', flush=True)
    out['rows'] = rows
    json.dump(out, open(f'results/zeroshot-{a.target}-{a.episodes}-s{a.seed}.json', 'w'), indent=1, default=str)
