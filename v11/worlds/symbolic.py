"""Text and the yes/no voter (2026-11-03-USER-POLYMATH: "LABIRINT, YES/NO VOTER/TEXT/SYMBOLS GAMES/ETC";
2026-11-03-USER-14M: "forma solutiei grafului care da raspuns text-ul cu eroarea cat mai mica").

text   The corpus is real text that exists in this repository: the Verbatim conversation itself. Every character is a label node
       of the abstract network ("se mapeaza random in graf prin labels"). The exercise: given what was written so far, answer the
       next characters. The shape of the solution is the path of the answer through the graph of characters; the world answers
       each emitted character with the true one (the consequence), and the error is counted per character.
voter  Yes/No voter: 12 hidden yes/no inputs, 5 voters each listening to 3 inputs (majority), the outcome is the voters' majority.
       The organism may ask for inputs (each costs a step) and must answer yes or no. The shape of the solution is the certificate:
       the inputs and voters that decide the answer, plus the answer (message 4: verify / address / shape)."""
import glob
import hashlib
import os
from itertools import combinations, product
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
_CORPUS = None


def corpus():
    global _CORPUS
    if _CORPUS is None:
        parts = [open(os.path.join(ROOT, 'CONVERSATIE_COMPLETA_DIN_CONTEXT.md'), encoding='utf-8').read()]
        for f in sorted(glob.glob(os.path.join(ROOT, 'verbatim', '*-USER-VERBATIM.txt'))):
            parts.append(open(f, encoding='utf-8').read())
        text = '\n'.join(parts).lower()
        from collections import Counter
        cnt = Counter(text); keep = {c for c, k in cnt.items() if k >= 20}
        text = ''.join(c if c in keep else '?' for c in text)
        vocab = sorted(set(text)); ix = {c: i for i, c in enumerate(vocab)}
        cut = int(len(text) * 0.85)
        train = text[:cut]
        V = len(vocab); B = np.zeros((V, V), np.float64); T = {}
        for a, b in zip(train, train[1:]): B[ix[a], ix[b]] += 1
        for a, b, c in zip(train, train[1:], train[2:]): T.setdefault((ix[a], ix[b]), np.zeros(V))[ix[c]] += 1
        U = np.bincount([ix[c] for c in train], minlength=V).astype(np.float64)
        _CORPUS = dict(text=text, vocab=vocab, ix=ix, cut=cut, B=B, T=T, U=U / U.sum())
    return _CORPUS


class TextWorld:
    family = 'text'
    def __init__(self, seed, k=6, split='train'):
        C = corpus(); r = np.random.default_rng(seed); text = C['text']
        lo, hi = (64, C['cut'] - k - 1) if split == 'train' else (C['cut'] + 64, len(text) - k - 1)
        p = int(r.integers(lo, hi))
        self.context = text[p - 64:p]; self.answer = text[p:p + k]; self.k = k; self.seed = seed

    def content_hash(self):
        return hashlib.sha256(f'text|{self.context}|{self.answer}'.encode()).hexdigest()


class TextMind:
    def __init__(self, w):
        C = corpus(); self.w = w; self.C = C; self.V = len(C['vocab']); self.N = self.V
        self.ctx = [C['ix'][c] for c in w.context]; self.t = 0; self.correct = 0
        self.ans = [C['ix'][c] for c in w.answer]
        B = C['B']; s, d = np.nonzero(B + B.T)
        self.edges = (s.astype(np.int64), d.astype(np.int64))
        self.adj = [[] for _ in range(self.V)]
        for a, b in zip(*np.nonzero(B)): self.adj[int(a)].append(int(b))
        self.visits = np.zeros(self.V, np.int32)

    @property
    def pos(self): return self.ctx[-1]

    def dist(self):
        C = self.C; a = self.ctx[-1]; b2 = C['B'][a]; bp = b2 / max(1.0, b2.sum())
        t = C['T'].get((self.ctx[-2], a)); tp = t / max(1.0, t.sum()) if t is not None else np.zeros(self.V)
        return bp, tp

    def graph(self):
        C = self.C; voc = C['vocab']; bp, tp = self.dist()
        inctx = np.bincount(self.ctx, minlength=self.V) / len(self.ctx)
        rec = np.zeros(self.V)
        for d, c in enumerate(reversed(self.ctx)):
            if rec[c] == 0: rec[c] = 1.0 / (1 + d)
        lab = [[f'text/char:{voc[i]}'] + (['text/in-context'] if inctx[i] > 0 else []) for i in range(self.V)]
        lab[self.pos].append('text/self')
        X = np.stack([bp, tp, C['U'] * 5, inctx * 5, rec], 1).astype(np.float32)
        return dict(n=self.V, X=X, labels=lab, family='text', edges=self.edges, K=6)

    def mask(self): return np.ones(self.V, np.float32)
    def self_index(self): return self.pos

    def options(self):
        nxt = self.adj[self.pos] or list(range(self.V))
        return [(j, j, True) for j in nxt]

    def act(self, a):
        true = self.ans[self.t]; ok = a == true
        self.correct += int(ok); self.ctx.append(true); self.t += 1   # the world answers with the true character
        return True, not ok, False

    def done(self): return self.t >= self.w.k
    def accuracy(self): return self.correct / self.w.k

    def target(self):
        rest = self.ans[self.t:]
        y = np.zeros(self.V, np.float32); y[rest] = 1
        yn = np.zeros(self.V, np.float32)
        if rest: yn[rest[0]] = 1
        return y, yn, max(1, len(rest))

    def decode(self, p):
        line = [self.pos]; at = self.pos
        for _ in range(self.w.k - self.t):
            nxt = self.adj[at]
            if not nxt: break
            at = max(nxt, key=lambda j: p[j]); line.append(at)
        return line

    def valid(self, line): return line[1:] == self.ans[self.t:]

    def classic(self):
        """Without learning: the most frequent next character, chained (bigram model of the same reading)."""
        p = np.zeros(self.V, np.float32); at = self.pos; B = self.C['B']
        for k in range(self.w.k - self.t):
            at = int(B[at].argmax()); p[at] = max(p[at], 1.0 - 0.1 * k)
        return p

    def line(self): return None

    def view(self):
        voc = self.C['vocab']
        return dict(context=self.w.context + self.w.answer[:self.t], answer=self.w.answer, t=self.t, vocab=voc, correct=self.correct)


# ---------------------------------------------------------------------------------------------------------------------
class VoterWorld:
    family = 'voter'
    NI, NV = 12, 5
    def __init__(self, seed):
        r = np.random.default_rng(seed); self.seed = seed
        self.bits = (r.random(self.NI) < 0.5).astype(np.int64)
        self.listen = [sorted(int(x) for x in r.permutation(self.NI)[:3]) for _ in range(self.NV)]
        self.votes = [int(sum(self.bits[i] for i in L) >= 2) for L in self.listen]
        self.outcome = int(sum(self.votes) >= 3)

    def content_hash(self):
        return hashlib.sha256(f'voter|{self.bits.tolist()}|{self.listen}'.encode()).hexdigest()


class VoterMind:
    """Nodes: 12 inputs, 5 voters, YES, NO, and the organism itself (it asks and answers)."""
    def __init__(self, w):
        self.w = w; NI, NV = w.NI, w.NV; self.NI, self.NV = NI, NV
        self.YES, self.NO, self.SELF = NI + NV, NI + NV + 1, NI + NV + 2; self.N = NI + NV + 3
        self.known = np.full(NI, -1, np.int64); self.answered = None; self.visits = np.zeros(self.N, np.int32)
        s, d = [], []
        for v, L in enumerate(w.listen):
            for i in L: s += [i, NI + v]; d += [NI + v, i]
            for o in (self.YES, self.NO): s += [NI + v, o]; d += [o, NI + v]
        for i in range(NI): s += [i, self.SELF]; d += [self.SELF, i]
        for o in (self.YES, self.NO): s += [o, self.SELF]; d += [self.SELF, o]
        self.edges = (np.array(s, np.int64), np.array(d, np.int64))
        self.pos = self.SELF

    def graph(self):
        lab = []
        for i in range(self.NI):
            lab.append(['voter/input-' + ('unknown' if self.known[i] < 0 else str(int(self.known[i])))])
        lab += [['voter/voter'] for _ in range(self.NV)] + [['voter/yes'], ['voter/no'], ['voter/self']]
        X = np.zeros((self.N, 1), np.float32)
        return dict(n=self.N, X=X, labels=lab, family='voter', edges=self.edges, K=6)

    def mask(self): return np.ones(self.N, np.float32)
    def self_index(self): return self.SELF

    def options(self):
        return [(i, i, True) for i in range(self.NI) if self.known[i] < 0] + [(self.NI, self.YES, True), (self.NI + 1, self.NO, True)]

    def act(self, a):
        if a < self.NI:
            self.known[a] = self.w.bits[a]; self.visits[a] += 1; return True, False, False
        self.answered = 1 if a == self.NI else 0
        return True, self.answered != self.w.outcome, False

    def done(self): return self.answered is not None and self.answered == self.w.outcome
    def finished_wrong(self): return self.answered is not None and self.answered != self.w.outcome

    def certificates(self):
        """All minimum certificates of the true outcome given what is known (cost = inputs still to ask)."""
        w = self.w; o = w.outcome
        agree = [v for v in range(self.NV) if w.votes[v] == o]
        best, union_i, union_v = 10 ** 9, set(), set()
        for vs in combinations(agree, 3):
            choices = [[pair for pair in combinations(w.listen[v], 2) if all(w.bits[i] == o for i in pair)] for v in vs]
            for pick in product(*choices):
                ins = set(i for pair in pick for i in pair); cost = sum(1 for i in ins if self.known[i] < 0)
                if cost < best: best, union_i, union_v = cost, set(ins), set(vs)
                elif cost == best: union_i |= ins; union_v |= set(vs)
        return best, union_i, union_v

    def target(self):
        best, ins, vs = self.certificates(); o = self.YES if self.w.outcome else self.NO
        y = np.zeros(self.N, np.float32)
        for i in ins: y[i] = 1
        for v in vs: y[self.NI + v] = 1
        y[o] = 1
        yn = np.zeros(self.N, np.float32)
        if best == 0: yn[o] = 1
        else:
            for i in ins:
                if self.known[i] < 0: yn[i] = 1
        return y, yn, best + 1

    def decode(self, p):
        line = [self.SELF]
        for i in sorted([i for i in range(self.NI) if self.known[i] < 0 and p[i] > 0.5], key=lambda i: -p[i]): line.append(i)
        line.append(self.YES if p[self.YES] >= p[self.NO] else self.NO); return line

    def valid(self, line):
        ans = 1 if line[-1] == self.YES else 0
        if ans != self.w.outcome: return False
        known = set(i for i in range(self.NI) if self.known[i] >= 0) | set(line[1:-1])
        dec = [v for v, L in enumerate(self.w.listen) if sum(1 for i in L if i in known and self.w.bits[i] == ans) >= 2]
        return len(dec) >= 3

    def classic(self):
        """Without learning: ask every unknown input of every voter not yet decided."""
        p = np.zeros(self.N, np.float32)
        for v, L in enumerate(self.w.listen):
            k = [self.known[i] for i in L if self.known[i] >= 0]
            if max(k.count(0), k.count(1)) >= 2: continue
            for i in L:
                if self.known[i] < 0: p[i] = 1
        dec = [int(sum(1 for i in L if self.known[i] == 1) >= 2) if max(sum(1 for i in L if self.known[i] == b) for b in (0, 1)) >= 2 else -1 for L in self.w.listen]
        if dec.count(1) >= 3: p[self.YES] = 1
        elif dec.count(0) >= 3: p[self.NO] = 1
        return p

    def line(self): return None

    def view(self):
        return dict(known=self.known.tolist(), listen=self.w.listen, answered=self.answered, NI=self.NI, NV=self.NV)
