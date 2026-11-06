"""TEXT LIVED ON THE CARD (the same principle as the labyrinths): every exercise of a batch is lived at once.
For every position of every exercise, the present context (read backwards, as far as it goes) is aligned with ALL the
past at once (suffix array of the reversed memory, kept on the card): the deepest alignment and the shallower ones,
the same at the level of form (every digit one symbol), and inside the exercise itself (its own earlier parts).
Before every symbol the graph predicts (blending what each alignment proposes, weighted by the trust the brain has
earned), then sees the symbol: each kind of alignment earns or loses trust. Only the TOTALS go back to the brain on the
CPU (trust right/tried per kind, hits of the brain and of its variations); the exercises join the memory here and
there. Mirrors align.mjs (AligningGraph) exactly where it can; where it cannot (the longest earlier match inside the
exercise is found at lengths 1, 2, 4 … 64, not exactly) it says so."""
import numpy as np
import os
import time
try:
    import torch
    HAVE_TORCH = True
except Exception:
    HAVE_TORCH = False

DIG = 48
SRC = ["mem", "self", "form", "fself"]          # key ids, the same names as align.mjs

def key_id(src, d, supb, farb):                  # one integer per kind of alignment (align.mjs key(p))
    return ((src * 13 + min(d, 12)) * 4 + supb) * 11 + farb   # farb 10 = none

def name_id(name):
    p = name.split(":"); return key_id(SRC.index(p[0]), int(p[1]), int(p[2]), int(p[3]) if len(p) > 3 else 10)

def key_name(kid):
    farb = kid % 11; r = kid // 11; supb = r % 4; r //= 4; d = r % 13; src = r // 13
    return SRC[src] + ":" + str(d) + ":" + str(supb) + ("" if farb == 10 else ":" + str(farb))

class X:                                         # numpy or torch, the same calls
    def __init__(self, device):
        self.t = HAVE_TORCH and device != "numpy"; self.dev = device if self.t else "cpu"
    def arr(self, a, dt=np.int64):
        if self.t: return torch.as_tensor(np.asarray(a), dtype={np.int64: torch.int64, np.int32: torch.int32, np.float32: torch.float32, np.uint8: torch.uint8, bool: torch.bool}[dt], device=self.dev)
        return np.asarray(a, dtype=dt)
    def tonp(self, a): return a.cpu().numpy() if self.t else a
    def zeros(self, shape, dt=np.int64): return self.arr(np.zeros(shape, dtype=dt), dt) if self.t else np.zeros(shape, dtype=dt)
    def i64(self, a): return a.long() if self.t else a.astype(np.int64)
    def f32(self, a): return a.float() if self.t else a.astype(np.float32)
    def where(self, c, a, b): return torch.where(c, a, b) if self.t else np.where(c, a, b)
    def clip(self, a, lo, hi): return a.clamp(lo, hi) if self.t else np.clip(a, lo, hi)
    def argsort(self, a): return torch.argsort(a, stable=True) if self.t else np.argsort(a, kind="stable")
    def add_at(self, acc, idx, val):
        if self.t: acc.index_put_((idx,), val, accumulate=True)
        else: np.add.at(acc, idx, val)
    def argmax1(self, a): return a.argmax(dim=1) if self.t else a.argmax(axis=1)
    def maxv1(self, a): return a.max(dim=1).values if self.t else a.max(axis=1)
    def cat(self, xs): return torch.cat(xs) if self.t else np.concatenate(xs)
    def arange(self, n): return torch.arange(n, device=self.dev) if self.t else np.arange(n)
    def sync(self):
        if self.t and str(self.dev).startswith("cuda"): torch.cuda.synchronize()

class Index:                                     # suffix array of the REVERSED memory: a context read backwards is a prefix
    def __init__(self, X_, mem):                 # mem: int64 array of symbols (on the card)
        n = len(mem); self.n = n; X = X_
        R = mem.flip(0) if X.t else mem[::-1].copy(); self.R = R
        rk = X.i64(R) + 1; sa = None; k = 1
        while True:                              # prefix doubling: sort by (rank[i], rank[i+k])
            sec = X.cat([rk[k:], X.zeros(min(k, n), np.int64)]) if n > k else X.zeros(n, np.int64)
            keyv = rk * (max(n, 256) + 2) + sec; sa = X.argsort(keyv); ks = keyv[sa]
            new = X.zeros(n, np.int64); diff = X.i64(ks[1:] != ks[:-1]); csum = diff.cumsum(0) if X.t else np.cumsum(diff)
            new[sa[1:]] = csum + 1; new[sa[0]] = 1; rk = new
            if int(rk.max()) >= n or k >= n: break
            k *= 2
        self.sa = sa
        nxt = X.zeros(n, np.int64) - 1; pos = sa; ok = pos > 0; nxt[ok] = R[pos[ok] - 1]; self.nxt = nxt   # what followed each aligned past
    def align(self, X, ctx, maxK):
        """ctx: (Q, maxK) symbols read backwards (-2 = beyond the start). Returns lo, hi: (Q, maxK) ranges (empty = lo==hi)."""
        Q = ctx.shape[0]; n = self.n; lo = X.zeros(Q, np.int64); hi = X.zeros(Q, np.int64) + n
        LO = X.zeros((Q, maxK), np.int64); HI = X.zeros((Q, maxK), np.int64); R = self.R; sa = self.sa
        steps = max(1, int(np.ceil(np.log2(n + 1))) + 1)
        for k in range(maxK):
            c = ctx[:, k]; alive = (hi > lo) & (c >= 0)
            if not bool(alive.any()): break
            def bound(strict):
                a = lo.clone() if X.t else lo.copy(); b = hi.clone() if X.t else hi.copy()
                for _ in range(steps):
                    go = a < b
                    if not X.t and not bool(go.any()): break  # GPU: avoid a blocking host/device sync on every binary-search iteration
                    m = (a + b) // 2; p = sa[X.clip(m, 0, n - 1)] + k; v = X.where(p < n, R[X.clip(p, 0, n - 1)], X.zeros(Q, np.int64) - 1)
                    less = (v <= c) if strict else (v < c)
                    a = X.where(go & less, m + 1, a); b = X.where(go & ~less, m, b)
                return a
            nlo = bound(False); nhi = bound(True)
            ok = alive & (nhi > nlo)
            lo = X.where(ok, nlo, lo); hi = X.where(ok, nhi, lo)        # a query whose alignment ends keeps an empty range
            LO[:, k] = lo; HI[:, k] = X.where(ok, hi, lo)
        return LO, HI
    def sample_next(self, X, lo, hi, S=32):
        """(Q,) ranges -> (Q, S) symbols that followed up to S pasts spread over the range (-1 = none)"""
        span = hi - lo; Q = lo.shape[0]; j = X.arange(S)[None, :]
        idx = lo[:, None] + (span[:, None] * j) // S
        valid = (j < span[:, None]); y = self.nxt[X.clip(idx, 0, self.n - 1)]
        return X.where(valid, y, X.zeros(y.shape, np.int64) - 1)

def form_of(X, a): return X.where((a >= 48) & (a <= 57), X.zeros(a.shape, np.int64) + DIG, a)

class TextCard:
    def __init__(self, device, depth=6, form_depth=4, maxK=64, S=64):
        self.X = X(device); self.depth, self.form_depth, self.maxK, self.S = depth, form_depth, maxK, S
        self.mem = self.X.zeros(0, np.int64); self.fmem = self.X.zeros(0, np.int64); self.big = None; self.fbig = None; self.indexed = 0
    def append(self, exs):
        X = self.X; flat = X.arr(np.concatenate([np.asarray(e, dtype=np.int64) for e in exs]) if exs else np.zeros(0, np.int64))
        self.mem = X.cat([self.mem, flat]); self.fmem = X.cat([self.fmem, form_of(X, flat)])
        n = len(self.mem)
        if n > self.indexed:                                            # rebuilt after every batch: everything lived is aligned
            self.big = Index(X, self.mem); self.fbig = Index(X, self.fmem); self.indexed = n
    def _proposals(self, ctxs, fctxs):
        X = self.X; out = []
        for ix, cx, src, D in ((self.big, ctxs, 0, self.depth), (self.fbig, fctxs, 2, self.form_depth)):
            if ix is None: continue
            LO, HI = ix.align(X, cx, self.maxK); K = X.i64(HI > LO).sum(1)        # depth of the deepest alignment
            for d in range(D):
                kk = K - 1 - d; ok = kk >= 0; kc = X.clip(kk, 0, self.maxK - 1); r = X.arange(len(K))
                lo = LO[r, kc]; hi = HI[r, kc]; ys = ix.sample_next(X, lo, hi, self.S)
                out.append((src, d, ok, hi - lo, ys))
        return out
    def live(self, exs, trust, g=8.0, formW=1.0, variants=(), chunk=4096, progress=None):
        """exs: exercises (lists of symbols) lived now. trust: {key_id: [right, tried]}. Returns the totals."""
        profile = os.environ.get('MP_PROFILE_TEXT', '0') == '1'
        if profile: self.X.sync(); t_start = time.perf_counter()
        X = self.X; flat = []; owner = []; posin = []; self._self = {}
        for e_i, e in enumerate(exs):
            for i in range(1, len(e)): flat.append(i); owner.append(e_i)
        T_right = {}; T_tried = {}; hits = 0; vhits = [0] * len(variants); total = len(flat)
        names = [x for x in trust if not x[0].endswith(":c")]; trust = [(name_id(nm), r, t) for nm, r, t in names if nm.split(":")[0] in SRC]
        tk = np.array([k for k, _, _ in trust], dtype=np.int64); tv = np.array([(r + 1) / (t + 2) for _, r, t in trust], dtype=np.float32)
        lut = np.full(4 * 13 * 4 * 11 + 1, .5, dtype=np.float32); lut[tk] = tv; LUT = X.arr(lut, np.float32)
        for c0 in range(0, total, chunk):
            Pi = flat[c0:c0 + chunk]; Oi = owner[c0:c0 + chunk]; Q = len(Pi)
            ctx = np.full((Q, self.maxK), -2, dtype=np.int64); ys_true = np.zeros(Q, dtype=np.int64)
            # inside the exercise: the longest earlier match of the present (lengths 1,2,4..64), the symbol after it, how far back
            sy = np.full(Q, -1, dtype=np.int64); sk = np.zeros(Q, dtype=np.int64); sfar = np.zeros(Q, dtype=np.int64)
            fsy = np.full(Q, -1, dtype=np.int64); fsk = np.zeros(Q, dtype=np.int64); fsfar = np.zeros(Q, dtype=np.int64)
            for q, (i, o) in enumerate(zip(Pi, Oi)):
                e = exs[o]; L = min(i, self.maxK); ctx[q, :L] = e[i - 1::-1][:L] if i - 1 >= 0 else []; ys_true[q] = e[i]
            for q, (i, o) in enumerate(zip(Pi, Oi)):
                h = self._selfidx(exs, o); r = h.get(i)
                if r: sy[q], sk[q], sfar[q], fsy[q], fsk[q], fsfar[q] = r
            CX = X.arr(ctx); FCX = form_of(X, CX); Y = X.arr(ys_true); FY = form_of(X, Y)
            props = self._proposals(CX, FCX)
            # the self alignments as proposals with one symbol
            for src, yy, kk, ff in ((1, sy, sk, sfar), (3, fsy, fsk, fsfar)):
                ok = X.arr(yy >= 0, bool); ys = X.arr(yy)[:, None]; props.append((src, X.arr(np.minimum(kk, 12)), ok, X.zeros(Q, np.int64) + 1, ys, X.arr(np.minimum(9, np.floor(np.log2(1 + ff)).astype(np.int64)))))
            # trust totals per kind, and the blended guess (with the trust it has) and its variations
            score = {};
            def blend(gv, fw):
                S = X.zeros((Q, 129), np.float32); dmass = X.zeros(Q, np.float32)
                for p in props:
                    src, d, ok, sup, ys = p[:5]; farb = p[5] if len(p) > 5 else None
                    kid = self._kid(src, d, sup, farb, Q); w = LUT[kid] ** gv * (fw if src >= 2 else 1.0); w = X.where(ok, w, X.zeros(Q, np.float32))
                    valid = ys >= 0; cnt = X.f32(valid).sum(1); cnt = X.where(cnt > 0, cnt, cnt + 1)
                    for j in range(ys.shape[1]):
                        yj = X.clip(ys[:, j], 0, 128); m = valid[:, j]; q = X.where(m, w / cnt, X.zeros(Q, np.float32))
                        if src >= 2:
                            isd = yj == DIG; dmass = dmass + X.where(isd, q, X.zeros(Q, np.float32)); q = X.where(isd, X.zeros(Q, np.float32), q)
                        S[X.arange(Q), yj] += q
                dig = S[:, 48:58]; dz = dig.sum(1); has = dz > 0
                share = X.where(has[:, None], dig / X.where(has, dz, dz + 1)[:, None], X.zeros(dig.shape, np.float32))
                S[:, 48:58] = dig + dmass[:, None] * share; S[:, DIG] = S[:, DIG] + X.where(has, X.zeros(Q, np.float32), dmass)
                return X.argmax1(S[:, :128])
            guess = blend(g, formW); hits += int((guess == Y).sum())
            for vi, (gv, fw) in enumerate(variants): vhits[vi] += int((blend(gv, fw) == Y).sum())
            for p in props:
                src, d, ok, sup, ys = p[:5]; farb = p[5] if len(p) > 5 else None
                kid = self._kid(src, d, sup, farb, Q); top = self._top(ys); want = FY if src >= 2 else Y
                right = X.i64((top == want) & ok); okc = X.i64(ok)
                kn = X.tonp(kid[ok]); rn = X.tonp(right[ok])
                if len(kn): u, inv = np.unique(kn, return_inverse=True); rr = np.bincount(inv, weights=rn).astype(np.int64); tt = np.bincount(inv).astype(np.int64)
                else: u, rr, tt = [], [], []
                for k_, r_, t_ in zip(u, rr, tt): T_right[int(k_)] = T_right.get(int(k_), 0) + int(r_); T_tried[int(k_)] = T_tried.get(int(k_), 0) + int(t_)
        if progress is not None: progress(c0 + Q, total, 'alignment')
        # imagining: from every 31st moment it writes 48 symbols ahead from its own expectations (all at once); as the real
        # symbols are compared, each alignment it followed while imagining earns or loses the trust it gets WHEN it imagines
        if profile: self.X.sync(); t_alignment = time.perf_counter()
        W_right, W_tried = self._imagine(exs, names, g, formW, progress=progress)
        if profile: self.X.sync(); t_imagination = time.perf_counter()
        if progress is not None: progress(0, 1, 'indexing')
        self.X.sync(); self.append(exs); self._self = {}
        if profile: self.X.sync(); t_reindex = time.perf_counter()
        if progress is not None: progress(1, 1, 'completed')
        result = {"trust": [[key_name(k), T_right[k], T_tried[k]] for k in T_tried] + [["w|" + key_name(k), W_right[k], W_tried[k]] for k in W_tried], "hits": hits, "seen": total, "variants": vhits, "memory": int(len(self.mem))}
        if profile:
            result["phaseMs"] = {"alignment": round(1000 * (t_alignment - t_start), 2),
                                 "imagination": round(1000 * (t_imagination - t_alignment), 2),
                                 "reindex": round(1000 * (t_reindex - t_imagination), 2),
                                 "total": round(1000 * (t_reindex - t_start), 2),
                                 "indexedCharacters": len(self.mem), "batchCharacters": total}
        return result
    def _imagine(self, exs, trust, g, formW, every=31, K=48, progress=None):
        X = self.X; starts = [(o, i) for o, e in enumerate(exs) for i in range(every, len(e) - 1, every)]
        W_right, W_tried = {}, {}
        if not starts or self.big is None: return W_right, W_tried
        lut = np.full(4 * 13 * 4 * 11 + 1, .5, dtype=np.float32); wl = {}
        for nm, r, t in trust:
            if nm.startswith("w|"): wl[nm[2:]] = (r + 1) / (t + 2)
            elif nm.split(":")[0] in SRC: lut[name_id(nm)] = (r + 1) / (t + 2)
        for nm, v in wl.items():
            if nm.split(":")[0] in SRC: lut[name_id(nm)] = v                 # while imagining: what it learned to trust then, else what it trusts reading
        LUT = X.arr(lut, np.float32)
        for c0 in range(0, len(starts), 2048):
            St = starts[c0:c0 + 2048]; Rn = len(St); ctx = np.full((Rn, self.maxK), -2, dtype=np.int64)
            for r, (o, i) in enumerate(St): e = exs[o]; L = min(i, self.maxK); ctx[r, :L] = e[i - 1::-1][:L]
            CX = X.arr(ctx); ok = np.ones(Rn, dtype=bool)
            for step in range(K):
                if progress is not None and step % 8 == 0: progress(c0 * K + step * Rn, len(starts) * K, 'imagination')
                real = np.array([exs[o][i + step] if i + step < len(exs[o]) else -1 for (o, i) in St], dtype=np.int64)
                act = ok & (real >= 0)
                if not act.any(): break
                props = self._proposals(CX, form_of(X, CX)); Y = X.arr(real); FY = form_of(X, Y)
                Sx = X.zeros((Rn, 129), np.float32); dmass = X.zeros(Rn, np.float32)
                for src, d, okp, sup, ys in props:
                    kid = self._kid(src, d, sup, None, Rn); w = LUT[kid] ** g * (formW if src >= 2 else 1.0); w = X.where(okp, w, X.zeros(Rn, np.float32))
                    valid = ys >= 0; cnt = X.f32(valid).sum(1); cnt = X.where(cnt > 0, cnt, cnt + 1)
                    for j in range(ys.shape[1]):
                        yj = X.clip(ys[:, j], 0, 128); q = X.where(valid[:, j], w / cnt, X.zeros(Rn, np.float32))
                        if src >= 2: isd = yj == DIG; dmass = dmass + X.where(isd, q, X.zeros(Rn, np.float32)); q = X.where(isd, X.zeros(Rn, np.float32), q)
                        Sx[X.arange(Rn), yj] += q
                    top = self._top(ys); want = FY if src >= 2 else Y; m = okp & X.arr(act, bool)
                    kn = X.tonp(kid[m]); rn = X.tonp(X.i64(top == want)[m])
                    if len(kn):
                        u, inv = np.unique(kn, return_inverse=True); rr = np.bincount(inv, weights=rn).astype(np.int64); tt = np.bincount(inv).astype(np.int64)
                        for k_, r_, t_ in zip(u, rr, tt): W_right[int(k_)] = W_right.get(int(k_), 0) + int(r_); W_tried[int(k_)] = W_tried.get(int(k_), 0) + int(t_)
                dig = Sx[:, 48:58]; dz = dig.sum(1); has = dz > 0
                Sx[:, 48:58] = dig + dmass[:, None] * X.where(has[:, None], dig / X.where(has, dz, dz + 1)[:, None], X.zeros(dig.shape, np.float32))
                guess = X.tonp(X.argmax1(Sx[:, :128]))
                ok = ok & ~((guess != real) & (step >= 2))                      # once its imagination left reality (after the first 3), the rest says nothing
                cn = X.tonp(CX); cn = np.concatenate([guess[:, None], cn[:, :-1]], axis=1); CX = X.arr(cn)
        if progress is not None: progress(len(starts) * K, len(starts) * K, 'imagination')
        return W_right, W_tried
    def _top(self, ys):                          # the most frequent symbol among what followed (the proposal's guess)
        X = self.X; Q, S = ys.shape
        if S == 1: return ys[:, 0]
        oh = X.zeros((Q, 129), np.float32);
        for j in range(S): oh[X.arange(Q), X.clip(ys[:, j], 0, 128)] += X.f32(ys[:, j] >= 0)
        return X.argmax1(oh[:, :128])
    def _kid(self, src, d, sup, farb, Q):
        X = self.X; dd = d if not isinstance(d, int) else X.zeros(Q, np.int64) + d
        sb = X.where(sup < 2, X.zeros(Q, np.int64), X.where(sup < 8, X.zeros(Q, np.int64) + 1, X.where(sup < 64, X.zeros(Q, np.int64) + 2, X.zeros(Q, np.int64) + 3)))
        fb = farb if farb is not None else X.zeros(Q, np.int64) + 10
        return ((src * 13 + X.clip(dd, 0, 12)) * 4 + sb) * 11 + fb
    _self = {}
    def _selfidx(self, exs, o):                  # per exercise: for every position, the longest earlier part of it that happened before (exact, as align.mjs SelfMem)
        if o in self._self: return self._self[o]
        e = exs[o]; fe = [DIG if 48 <= c <= 57 else c for c in e]
        def scan(seq):
            ln = [0]; link = [-1]; nx = [{}]; first = [-1]; last = 0; res = {}
            for pos, c in enumerate(seq):
                if pos >= 1:                       # predicting seq[pos] from seq[:pos]: the link of the last state
                    st = link[last]
                    if st > 0 and ln[st] > 0 and first[st] + 1 < pos: res[pos] = (seq[first[st] + 1], ln[st], pos - 1 - first[st])
                cur = len(ln); ln.append(ln[last] + 1); link.append(0); nx.append({}); first.append(pos); p = last
                while p != -1 and c not in nx[p]: nx[p][c] = cur; p = link[p]
                if p != -1:
                    q = nx[p][c]
                    if ln[p] + 1 == ln[q]: link[cur] = q
                    else:
                        cl = len(ln); ln.append(ln[p] + 1); link.append(link[q]); nx.append(dict(nx[q])); first.append(first[q])
                        while p != -1 and nx[p].get(c) == q: nx[p][c] = cl; p = link[p]
                        link[q] = cl; link[cur] = cl
                last = cur
            return res
        a = scan(e); f = scan(fe); out = {}
        for i in range(1, len(e)):
            x, y = a.get(i), f.get(i)
            if x or y: out[i] = (x[0] if x else -1, x[1] if x else 0, x[2] if x else 0, y[0] if y else -1, y[1] if y else 0, y[2] if y else 0)
        self._self[o] = out; return out
