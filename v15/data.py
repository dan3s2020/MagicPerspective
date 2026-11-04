"""The world (the game) in which V14 trains: OpenThoughts3-style conversations.

Each row of the parquet files has `conversations`: a list of messages {"from": "human"|"gpt"|..., "value": text}
(also tolerated: {"role", "content"}). One EPISODE of the game is one conversation:
    [Q] question bytes [A] answer bytes [E]
The organism reads the question, then — before writing anything — predicts the shape of its answer (length and the bytes
it will use), then writes the answer byte by byte. The teacher (the real answer) gives the exact error of every byte and of
the shape. The graph is the same in every episode; only the text that flows through it changes.
"""
import glob
import os
import random

import numpy as np

from model import Q_TOK, A_TOK, E_TOK


def _msg(m):
    if isinstance(m, dict):
        who = str(m.get('from', m.get('role', ''))).lower()
        txt = m.get('value', m.get('content', ''))
        return who, '' if txt is None else str(txt)
    return '', str(m)


def pairs_from_conversation(conv):
    """All (question, answer) pairs: a human/user turn followed by the next assistant turn."""
    msgs = [_msg(m) for m in (conv if isinstance(conv, (list, tuple)) else list(conv))]
    out = []
    for i in range(len(msgs) - 1):
        if msgs[i][0] in ('human', 'user') and msgs[i + 1][0] not in ('human', 'user', 'system'):
            if msgs[i][1].strip() and msgs[i + 1][1].strip():
                out.append((msgs[i][1], msgs[i + 1][1]))
    return out


def load_pairs(path, limit=None, log=print):
    """path: a .parquet file, a folder of them, or a .jsonl file. Returns a list of (question, answer)."""
    files = sorted(glob.glob(os.path.join(path, '*.parquet'))) if os.path.isdir(path) else [path]
    pairs = []
    for f in files:
        if f.endswith('.jsonl'):
            import json
            for line in open(f, encoding='utf-8'):
                row = json.loads(line)
                pairs += pairs_from_conversation(row.get('conversations', row.get('messages', [])))
        else:
            import pyarrow.parquet as pq
            pf = pq.ParquetFile(f)
            cols = pf.schema_arrow.names
            col = 'conversations' if 'conversations' in cols else 'messages' if 'messages' in cols else None
            if col is None:
                raise ValueError(f'{f}: no "conversations" column (columns: {cols})')
            for batch in pf.iter_batches(columns=[col], batch_size=256):
                for conv in batch.column(0).to_pylist():
                    pairs += pairs_from_conversation(conv or [])
                    if limit and len(pairs) >= limit:
                        break
                if limit and len(pairs) >= limit:
                    break
        log(f'{os.path.basename(f)}: {len(pairs)} conversații până acum')
        if limit and len(pairs) >= limit:
            break
    return pairs


def encode_episode(q, a, max_q=1024, max_a=3072):
    qb = q.encode('utf-8', 'replace')[-max_q:]
    ab = a.encode('utf-8', 'replace')[:max_a]
    toks = np.concatenate([[Q_TOK], np.frombuffer(qb, np.uint8), [A_TOK], np.frombuffer(ab, np.uint8), [E_TOK]]).astype(np.int64)
    bag = np.zeros(256, np.float32); bag[np.unique(np.frombuffer(ab, np.uint8))] = 1
    return toks, len(qb) + 1, len(ab), bag          # position of A_TOK = len(qb)+1


class Stream:
    """B parallel worlds (rows), each a continuous stream of different episodes, cut in chunks of T tokens.
    Returns x, y (next token), loss mask (only the answer and its end are scored), reset (new episode starts),
    and the shape targets at every A marker."""
    def __init__(self, pairs, B, T, seed=0, max_q=1024, max_a=3072):
        self.pairs, self.B, self.T = pairs, B, T
        self.rng = random.Random(seed); self.order = list(range(len(pairs))); self.rng.shuffle(self.order)
        self.next_i = 0; self.max_q, self.max_a = max_q, max_a
        self.rows = [self._new() for _ in range(B)]
        self.episodes_started = 0

    def _new(self):
        if self.next_i >= len(self.order):
            self.rng.shuffle(self.order); self.next_i = 0
        i = self.order[self.next_i]; self.next_i += 1
        toks, apos, alen, bag = encode_episode(*self.pairs[i], self.max_q, self.max_a)
        self.episodes_started = getattr(self, 'episodes_started', 0) + 1
        return dict(toks=toks, p=0, apos=apos, alen=alen, bag=bag, idx=i)

    def resize(self, B):
        while len(self.rows) < B: self.rows.append(self._new())
        self.rows = self.rows[:B]; self.B = B

    def next(self):
        B, T = self.B, self.T
        x = np.zeros((B, T), np.int64); y = np.zeros((B, T), np.int64); m = np.zeros((B, T), np.float32); r = np.zeros((B, T), np.float32)
        shp = []                                   # (b, t, log length, bag)
        for b in range(B):
            t = 0
            while t < T:
                row = self.rows[b]
                if row['p'] >= len(row['toks']) - 1:
                    self.rows[b] = row = self._new()
                if row['p'] == 0: r[b, t] = 1
                n = min(T - t, len(row['toks']) - 1 - row['p'])
                seg = row['toks'][row['p']:row['p'] + n + 1]
                x[b, t:t + n] = seg[:-1]; y[b, t:t + n] = seg[1:]
                ap = row['apos']                     # targets after the A marker are answer bytes / end
                for k in range(n):
                    pos = row['p'] + k
                    if pos >= ap: m[b, t + k] = 1
                    if pos == ap: shp.append((b, t + k, np.log1p(row['alen']), row['bag']))
                row['p'] += n; t += n
        return x, y, m, r, shp


def held_out(pairs, frac=0.02, seed=1234):
    rng = random.Random(seed); idx = list(range(len(pairs))); rng.shuffle(idx)
    k = max(1, int(len(pairs) * frac))
    val = [pairs[i] for i in idx[:k]]; train = [pairs[i] for i in idx[k:]]
    return train, val
