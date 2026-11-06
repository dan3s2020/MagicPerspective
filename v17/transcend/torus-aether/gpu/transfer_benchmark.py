"""Episode-disjoint, equal-update V17 shared transformation transfer audit.

Consumes ONLY opt-in actual (before, action, after) training events from
-TraceTransformations, then splits complete episodes before *any* model update.
Scores observable next-state prediction, not language comprehension or path success.
"""
import argparse
import hashlib
import json
import random
from collections import defaultdict
from pathlib import Path

from shared_perspective import SharedPerspective, DOMAINS

ALLOWED = {'domain', 'before', 'action', 'after', 'context', 'episode'}


def read_trace(path, limit=50000):
    rows = []
    for line_number, line in enumerate(Path(path).open(encoding='utf-8'), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except ValueError as exc:
            raise ValueError(f'Invalid JSONL line {line_number}: {exc}') from exc
        if not isinstance(row, dict) or not set(row).issubset(ALLOWED):
            raise ValueError(f'Forbidden fields at line {line_number}')
        if row.get('domain') not in DOMAINS or not isinstance(row.get('episode'), str):
            raise ValueError(f'Missing domain/episode at line {line_number}')
        if not row['episode'].startswith(row['domain'] + ':'):
            raise ValueError(f'Episode/domain mismatch at line {line_number}')
        if not isinstance(row.get('action'), str) or not isinstance(row.get('before'), (str, list)) or not isinstance(row.get('after'), (str, list)):
            raise ValueError(f'Invalid observed transition at line {line_number}')
        rows.append(row)
        if len(rows) >= limit:
            break
    if not rows:
        raise ValueError('No recorded actual transitions')
    return rows


def split_episodes(rows, seed=20261106, held_fraction=.2):
    if not 0 < held_fraction < .5:
        raise ValueError('Held-out fraction must be between 0 and 0.5')
    train, held, counts = [], [], {}
    for domain in DOMAINS:
        grouped = defaultdict(list)
        for row in rows:
            if row['domain'] == domain:
                grouped[row['episode']].append(row)
        groups = sorted(grouped)
        if len(groups) < 3:
            counts[domain] = {'episodes': len(groups), 'error': 'need at least 3 independent recorded episodes'}
            continue
        r = random.Random(seed + list(DOMAINS).index(domain))
        r.shuffle(groups)
        n_held = max(1, round(len(groups) * held_fraction))
        held_ids = set(groups[:n_held])
        for key, events in grouped.items():
            (held if key in held_ids else train).extend(events)
        counts[domain] = {'episodes': len(groups),
                          'trainEpisodes': len(groups) - len(held_ids),
                          'heldoutEpisodes': len(held_ids),
                          'trainEvents': sum(len(grouped[g]) for g in groups if g not in held_ids),
                          'heldoutEvents': sum(len(grouped[g]) for g in held_ids)}
    train_episodes = {r['episode'] for r in train}
    held_episodes = {r['episode'] for r in held}
    if train_episodes & held_episodes:
        raise AssertionError('Episode leakage')
    return train, held, counts


def sample_batch(pool, rng, n):
    return [pool[rng.randrange(len(pool))] for _ in range(n)]


def permuted_actions(pool, seed):
    # Fixed domain-local derangement. Labels change but observed states do not.
    by_domain = defaultdict(set)
    for row in pool:
        by_domain[row['domain']].add(row['action'])
    perm = {}
    for domain, actions in by_domain.items():
        names = sorted(actions)
        for i, action in enumerate(names):
            perm[(domain, action)] = names[(i + 1) % len(names)] if len(names) > 1 else 'scrambled:' + action
    return [{**r, 'action': perm[(r['domain'], r['action'])]} for r in pool]


def audit(rows, target='text', steps=80, batch=16, seed=20261106, device='cpu'):
    if target not in DOMAINS:
        raise ValueError('Unknown target domain')
    if steps < 1 or not 1 <= batch <= 512:
        raise ValueError('Invalid compute budget')
    train, held, split = split_episodes(rows, seed)
    target_train = [r for r in train if r['domain'] == target]
    target_held = [r for r in held if r['domain'] == target]
    sources = [r for r in train if r['domain'] != target]
    if not target_train or not target_held or not sources:
        raise ValueError('Need disjoint target episodes and source-domain observations')
    pools = {'shared_adaptive': train, 'shared_no_noise': train,
             'target_only': target_train, 'source_only': sources,
             'shuffled_actions': permuted_actions(train, seed)}
    models = {name: SharedPerspective(device, seed=seed % 100000) for name in pools}
    baseline = models['shared_adaptive'].evaluate(target_held)
    # Every comparison gets identical update count/batch size, but target-only
    # revisits its smaller data pool. Disclose sample exposures as well.
    for name, pool in pools.items():
        rng = random.Random(seed + 417)
        for _ in range(steps):
            models[name].train(sample_batch(pool, rng, batch),
                               adaptive_noise=(name == 'shared_adaptive'))
    frozen = {}
    for name, model in models.items():
        score = model.evaluate(target_held)
        frozen[name] = {**score, 'trainPoolEvents': len(pools[name]),
                        'trainDomainCounts': {d: sum(r['domain'] == d for r in pools[name]) for d in DOMAINS},
                        'trainingExposures': steps * batch,
                        'noiseUpdates': model.noise_updates,
                        'noiseLevel': round(model.noise, 6)}
    shared_loss = frozen['shared_adaptive']['loss']
    target_loss = frozen['target_only']['loss']
    return {'protocol': 'actual observed V17 transitions, episode-disjoint held-out, no oracle',
            'target': target, 'device': device, 'seed': seed,
            'stepsPerArm': steps, 'batchPerStep': batch,
            'episodes': split, 'targetHeldoutEvents': len(target_held),
            'initialUntrained': baseline, 'frozen': frozen,
            'relativeTransferVsTargetOnly': round((target_loss - shared_loss) / max(1e-12, target_loss), 6),
            'conclusion': 'NEXT_STATE_PREDICTION_ONLY_NOT_LANGUAGE_UNDERSTANDING',
            'limitations': ['Same optimizer updates, but different unique training observations',
                            'Source-only is zero-target-example, not a language comprehension test',
                            'Task correctness, path optimality and confidence intervals require separate evaluations']}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--trace', required=True)
    p.add_argument('--target', choices=DOMAINS, default='text')
    p.add_argument('--device', default='cpu')
    p.add_argument('--steps', type=int, default=80)
    p.add_argument('--batch', type=int, default=16)
    p.add_argument('--seed', type=int, default=20261106)
    p.add_argument('--out', default=None)
    args = p.parse_args()
    result = audit(read_trace(args.trace), target=args.target, steps=args.steps,
                   batch=args.batch, seed=args.seed, device=args.device)
    encoded = json.dumps(result, indent=2, ensure_ascii=False)
    if args.out:
        Path(args.out).write_text(encoded + '\n', encoding='utf-8')
    print(encoded)


if __name__ == '__main__':
    main()
