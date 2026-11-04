"""Read-only spacetime window queries over PortalEngine's existing trace SQLite table.

Time is an observed trace id (strict database insertion order), never a guessed
wall-clock time. Existing GNN weights, checkpoints, graph, and trace schema stay
unchanged. All returned samples correspond to actual stored events.
"""
from __future__ import annotations

import json


def _int(value, default, low, high):
    try:
        number = int(value)
    except (ValueError, TypeError, OverflowError):
        number = default
    return max(low, min(high, number))


def metadata(db):
    first, last, count = db.execute(
        'SELECT MIN(id), MAX(id), COUNT(*) FROM trace').fetchone()
    return {'schema': 'magic.spacetime.5d.v1', 'time_unit': 'recorded_event_index',
            'first': first or 0, 'last': last or 0, 'total': count,
            'has_wall_clock_time': False, 'has_gaps': bool(count and last - first + 1 != count),
            'source': 'SQLite trace; append order; never inferred timestamps'}


def _frame(identifier, raw):
    frame = json.loads(raw)
    # The full original event is available in the DB. Return only the evidence
    # required for visualizing a real activation, decision or update.
    return {
        'trace_id': identifier, 'event_seq': frame.get('event_seq'),
        'global_step': frame.get('global_step'), 'step': frame.get('step'),
        'domain': frame.get('domain'), 'world_hash': frame.get('world_hash'),
        'action': frame.get('action'), 'actual': frame.get('actual'),
        'prediction': frame.get('prediction'), 'error': frame.get('error'),
        'update_norm': frame.get('update_norm'), 'loss': frame.get('loss'),
        'active': frame.get('active', []), 'messages': frame.get('messages', []),
        'activations': frame.get('activations', []),
        'growth': frame.get('growth', {}), 'reward': frame.get('reward'),
    }


def window(db, start, end, bins=64, max_events=96):
    """Exact histogram + actual samples; no invented frames or false coverage.

    Narrow intervals return EVERY recorded frame (up to the hard event cap).
    Wide intervals return one actual frame per nonempty time bucket (the first
    entry by recorded id) and clearly mark them as a sparse sample.
    """
    meta = metadata(db)
    if not meta['total']:
        return {'schema': meta['schema'], 'start': 0, 'end': 0, 'bins': [],
                'events': [], 'visible_total': 0, 'sampled': False,
                'complete': True, 'time_unit': meta['time_unit']}
    last = meta['last']
    start = _int(start, meta['first'], meta['first'], last)
    end = _int(end, last, start, last)
    bins = _int(bins, 64, 4, 128)
    max_events = _int(max_events, 96, 8, 256)
    length = end - start + 1
    distribution = []
    representatives = []
    total = 0
    for i in range(bins):
        low = start + (i * length) // bins
        high = start + ((i + 1) * length) // bins - 1
        if high < low:
            distribution.append({'start': low, 'end': high, 'count': 0})
            continue
        count, first = db.execute(
            'SELECT COUNT(*), MIN(id) FROM trace WHERE id BETWEEN ? AND ?',
            (low, high)).fetchone()
        total += count
        distribution.append({'start': low, 'end': high, 'count': count})
        if first is not None:
            representatives.append(first)
    # Complete exact replay when possible. Otherwise use indexed, real samples.
    complete = total <= max_events
    if complete:
        rows = db.execute(
            'SELECT id, frame FROM trace WHERE id BETWEEN ? AND ? ORDER BY id',
            (start, end)).fetchall()
    else:
        # Spread at most max_events genuine samples across non-empty buckets.
        chosen = []
        if len(representatives) <= max_events:
            chosen = representatives
        else:
            indices = [(i * (len(representatives) - 1)) // (max_events - 1)
                       for i in range(max_events)]
            chosen = [representatives[i] for i in dict.fromkeys(indices)]
        # Do not turn the sample into fictitious event rows.
        rows = []
        for identifier in chosen:
            row = db.execute('SELECT id,frame FROM trace WHERE id=?',
                             (identifier,)).fetchone()
            if row is not None:
                rows.append(row)
    return {'schema': meta['schema'], 'start': start, 'end': end,
            'bins': distribution, 'events': [_frame(*row) for row in rows],
            'visible_total': total, 'sampled': not complete,
            'complete': complete, 'time_unit': meta['time_unit']}
