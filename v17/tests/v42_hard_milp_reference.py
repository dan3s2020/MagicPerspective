"""Independent deterministic 3-SAT reference using SciPy/HiGHS binary MILP.

Reconstructs the 100-variable test formulas from their published seeds using
Python's hashlib, not the JavaScript generator or any V42 solver outputs.
Exit nonzero on proof mismatch or a timeout. Requires numpy and scipy.
Run: python v17/tests/v42_hard_milp_reference.py
"""
from __future__ import annotations
import hashlib
import json
import time
import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp
from scipy.sparse import lil_matrix


def cryptorand(seed):
    counter = 0
    while True:
        raw = hashlib.sha256(
            f"MagicPerspective-hard3sat-v1|{seed}|{counter}".encode()
        ).digest()
        counter += 1
        yield int.from_bytes(raw[:4], 'little')


def clauses_from_seed(seed, n=100, m=426):
    stream = cryptorand(seed)

    def pick(bound):
        lim = (2**32) - ((2**32) % bound)
        while True:
            v = next(stream)
            if v < lim:
                return v % bound

    output = []
    seen = set()
    while len(output) < m:
        variables = []
        while len(variables) < 3:
            v = pick(n) + 1
            if v not in variables:
                variables.append(v)
        variables.sort()
        clause = [v if pick(2) else -v for v in variables]
        key = tuple(clause)
        if key in seen:
            continue
        seen.add(key)
        output.append(clause)
    return output


def run_milp(seed, n=100, m=426, timeout=5.0):
    clauses = clauses_from_seed(seed, n, m)
    formula = json.dumps({'n': n, 'clauses': clauses}, separators=(',', ':'))
    sha16 = hashlib.sha256(formula.encode()).hexdigest()[:16]
    coefficients = lil_matrix((m, n), dtype=np.float64)
    lower = np.empty(m, dtype=np.float64)
    for i, clause in enumerate(clauses):
        lower[i] = 1 - sum(l < 0 for l in clause)
        for lit in clause:
            coefficients[i, abs(lit)-1] = 1 if lit > 0 else -1
    start = time.perf_counter()
    result = milp(
        c=np.zeros(n), integrality=np.ones(n),
        bounds=Bounds(np.zeros(n), np.ones(n)),
        constraints=LinearConstraint(coefficients.tocsr(), lower, np.inf),
        options={'time_limit': timeout}
    )
    elapsed = round(1000*(time.perf_counter()-start), 3)
    label = 'SAT' if result.status == 0 and result.x is not None else (
        'UNSAT' if result.status == 2 else 'UNKNOWN'
    )
    verified = False
    if label == 'SAT':
        bits = np.rint(result.x).astype(np.int64)
        verified = all(any(bits[abs(lit)-1] == int(lit > 0) for lit in c)
                       for c in clauses)
        assert verified, 'HiGHS returned an invalid SAT witness'
    return {'seed': seed, 'n': n, 'm': m, 'hash': sha16,
            'status': label, 'milliseconds': elapsed,
            'solverStatusCode': int(result.status),
            'witnessVerified': verified}


if __name__ == '__main__':
    from argparse import ArgumentParser
    parser = ArgumentParser()
    parser.add_argument('--time-limit', type=float, default=5.0)
    args = parser.parse_args()
    reports = [run_milp(seed, timeout=args.time_limit)
               for seed in range(20262001, 20262011)]
    for report in reports:
        print('INDEPENDENT_HIGHS_3SAT ' + json.dumps(report), flush=True)
    assert sum(r['status'] == 'SAT' for r in reports) == 5
    assert sum(r['status'] == 'UNSAT' for r in reports) == 5
    print('INDEPENDENT_HIGHS_HOLDOUT_PASS 10/10', flush=True)
