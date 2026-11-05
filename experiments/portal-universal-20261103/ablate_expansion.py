"""Controlled, persistent ablation of the real Portal engine with matched world seeds.

No temporary or overwritten checkpoints, no synthetic success claims.
Run on local CPU or the actual NVIDIA CUDA device; the script reports data.
"""
from __future__ import annotations
import argparse
import json
import random
import torch
from pathlib import Path
from engine import PortalEngine, KINDS
from corpus import Corpus, ingest

CONDITIONS = {
    'baseline': None,
    'expanded_no_noise': (0.0, 0.0),
    'local_noise': (0.08, 0.0),
    'shared_noise': (0.0, 0.08),
    'both_noises': (0.08, 0.08)
}


def run_condition(root, name, noise, args, domains):
    path = root / name
    if path.exists():
        raise FileExistsError('Refusing to overwrite an existing experimental run: ' + str(path))
    path.mkdir(parents=True)
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    engine = PortalEngine(path, args.device, capacity=args.capacity)
    try:
        if 'text' in domains:
            meta=ingest(Path(args.corpus), path/'corpora')
            engine.corpus=Corpus(meta['path'])
        if noise is not None:
            engine.enable_expansion({'max_levels': args.max_levels,
                                     'local_noise':noise[0],
                                     'shared_noise':noise[1],
                                     'seed':args.seed})
        for _ in range(args.rounds):
            engine.episode_many(domains, batch_size=args.batch_size,
                                epsilon=args.epsilon, capture=True)
        tested=engine.evaluate(domains, count=args.eval_worlds, seed=args.eval_seed)
        status=engine.status()
        results={
            'condition':name,'actual_training_episodes':status['episodes'],
            'unique_sqlite_tasks':status['unique_worlds_verified_sqlite'],
            'actual_gradient_steps':status['steps'],
            'training_loss':status['loss'],
            'training_error':status['prediction_error'],
            'heldout':tested['trained'],
            'heldout_seed':tested['heldout_seed'],
            'noise':noise,
            'expansion':status['perspective_expansion'],
            'checkpoint':str(path/'brain.pt'),
            'limitations':('No quantum state, no verified fractality, no '
                            'independent physical dimension; compare '
                            'held-out rewards across controlled seeds.')
        }
        (path/'report.json').write_text(
            json.dumps(results,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
        return results
    finally:
        engine.close()
        if engine.corpus is not None and hasattr(engine.corpus,'close'):
            engine.corpus.close()


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--data-dir',required=True,help='New dedicated directory. Never overwrite runs.')
    parser.add_argument('--device',choices=('cpu','cuda'),default='cpu')
    parser.add_argument('--domains',default='maze3d,network,symbols,yesno,car')
    parser.add_argument('--corpus',default=None)
    parser.add_argument('--rounds',type=int,default=20)
    parser.add_argument('--batch-size',type=int,default=5)
    parser.add_argument('--eval-worlds',type=int,default=24)
    parser.add_argument('--eval-seed',type=int,default=2000000000)
    parser.add_argument('--seed',type=int,default=2917)
    parser.add_argument('--capacity',type=int,default=8192)
    parser.add_argument('--max-levels',type=int,default=3)
    parser.add_argument('--epsilon',type=float,default=.18)
    args=parser.parse_args()
    domains=args.domains.split(',')
    if not domains or any(d not in KINDS for d in domains):
        parser.error('Unknown domain')
    if 'text' in domains and (not args.corpus or not Path(args.corpus).is_file()):
        parser.error('Text requires a real --corpus file')
    if args.rounds<1 or not 1<=args.batch_size<=64 or not 1<=args.eval_worlds<=128:
        parser.error('Invalid training or evaluation count')
    if not 1<=args.max_levels<=8 or not 0<=args.epsilon<=1:
        parser.error('Invalid perspective or epsilon')
    if args.device=='cuda' and not torch.cuda.is_available():
        parser.error('CUDA is unavailable (no fake GPU acceptance)')
    root=Path(args.data_dir)
    if root.exists():
        parser.error('Refusing to overwrite existing results: '+str(root))
    root.mkdir(parents=True)
    reports=[]
    for name,noise in CONDITIONS.items():
        result=run_condition(root,name,noise,args,domains)
        reports.append(result)
        print(json.dumps({'condition':name,'heldout':result['heldout'],
                          'episodes':result['actual_training_episodes']}),
              flush=True)
    (root/'comparison.json').write_text(
        json.dumps({'schema':'magic.perspective.ablation.v1',
                    'domains':domains,'same_initial_torch_seed':args.seed,
                    'same_world_seed_sequence':True,
                    'same_heldout_seed':args.eval_seed,
                    'reports':reports,'interpretation':'Measured differences only; '
                    'results do not prove positive transfer or quantum coherence'},
                   indent=2,ensure_ascii=False)+'\n',encoding='utf-8')


if __name__=='__main__':
    main()
