"""TEXT LIVED ON THE CARD (the same principle as the labyrinths): every exercise of a batch is lived at once.
For every position of every exercise, the present context (read backwards, as far as it goes) is aligned with ALL the
past at once (suffix array of the reversed memory, kept on the card): the deepest alignment and the shallower ones,
the same at the level of form (every digit one symbol), and inside the exercise itself (its own earlier parts).
Before every symbol the graph predicts (blending what each alignment proposes, weighted by the trust the brain has
earned), then sees the symbol: each kind of alignment earns or loses trust. Only the TOTALS go back to the brain on the
CPU (trust right/tried per kind, hits of the brain and of its variations); the exercises join the memory here and
there. Mirrors align.mjs (AligningGraph) exactly where it can; where it cannot (the longest earlier match inside the
exercise is found at lengths 1, 2, 4 … 64, not exactly) it says so."""
import ctypes
import pathlib
import numpy as np
try:
    import torch
    HAVE_TORCH = True
except Exception:
    HAVE_TORCH = False

DIG = 48
SRC = ["mem", "self", "form", "fself"]          # key ids, the same names as align.mjs
_EXACT_HISTOGRAM = None

def exact_histogram_available():
    """Load the prebuilt placement-only CUDA kernel; absence keeps exact slow path."""
    global _EXACT_HISTOGRAM
    if _EXACT_HISTOGRAM is False: return False
    if _EXACT_HISTOGRAM is None:
        dll = pathlib.Path(__file__).with_name("exact_histogram_cuda.dll")
        if not dll.exists():
            _EXACT_HISTOGRAM = False
            return False
        try:
            lib = ctypes.CDLL(str(dll))
            fn = lib.mp_exact_weighted_histogram
            fn.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
                           ctypes.c_void_p, ctypes.c_int, ctypes.c_int,
                           ctypes.c_int, ctypes.c_void_p]
            fn.restype = ctypes.c_int
            _EXACT_HISTOGRAM = (lib, fn)
        except OSError:
            _EXACT_HISTOGRAM = False
    return bool(_EXACT_HISTOGRAM)

def exact_weighted_histogram(ys, weights, scores, digit_mass, form_source):
    if not exact_histogram_available(): return False
    ys = ys.contiguous(); weights = weights.contiguous()
    stream = torch.cuda.current_stream(ys.device).cuda_stream
    status = _EXACT_HISTOGRAM[1](
        ctypes.c_void_p(ys.data_ptr()), ctypes.c_void_p(weights.data_ptr()),
        ctypes.c_void_p(scores.data_ptr()), ctypes.c_void_p(digit_mass.data_ptr()),
        ys.shape[0], ys.shape[1], int(bool(form_source)), ctypes.c_void_p(stream))
    if status: raise RuntimeError("exact ordered CUDA histogram launch failed: %d" % status)
    return True

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
    def __init__(self, X_, mem, progress=None):  # mem: original native symbols on the selected device
        n = len(mem); self.n = n; X = X_
        R = mem.flip(0) if X.t else mem[::-1].copy(); self.R = R
        rk = X.i64(R) + 1; sa = None; k = 1
        turns = 0
        maximum_turns = max(1, int(np.ceil(np.log2(max(1, n)))) + 1)
        while True:                              # prefix doubling: sort by (rank[i], rank[i+k])
            sec = X.cat([rk[k:], X.zeros(min(k, n), np.int64)]) if n > k else X.zeros(n, np.int64)
            keyv = rk * (max(n, 256) + 2) + sec; sa = X.argsort(keyv); ks = keyv[sa]
            new = X.zeros(n, np.int64); diff = X.i64(ks[1:] != ks[:-1]); csum = diff.cumsum(0) if X.t else np.cumsum(diff)
            new[sa[1:]] = csum + 1; new[sa[0]] = 1; rk = new
            turns += 1
            if progress is not None: progress(turns, maximum_turns, 'suffix-index')
            if int(rk.max()) >= n or k >= n: break
            k *= 2
        self.sa = sa
        # Exact lexicographic base-129 prefixes (ASCII+1, 0 = end of memory).
        # All depths 1..8 fit signed int64: 129**8 < 2**63. Because sa
        # is lexicographic, every prefix-code array is ALREADY sorted.
        # 8 * n * int64 is bounded, e.g. 4 MiB for n=65536.
        self.fast_prefix = []
        packed = X.zeros(n, np.int64)
        for depth in range(min(8, n)):
            p = sa + depth
            digit = X.where(p < n, R[X.clip(p, 0, n - 1)] + 1, X.zeros(n, np.int64))
            packed = packed * 129 + digit
            self.fast_prefix.append(packed)
        nxt = X.zeros(n, np.int64) - 1; pos = sa; ok = pos > 0; nxt[ok] = R[pos[ok] - 1]; self.nxt = nxt   # what followed each aligned past
    def align(self, X, ctx, maxK):
        """ctx: (Q, maxK) symbols read backwards (-2 = beyond the start). Returns lo, hi: (Q, maxK) ranges (empty = lo==hi)."""
        Q = ctx.shape[0]; n = self.n; lo = X.zeros(Q, np.int64); hi = X.zeros(Q, np.int64) + n
        LO = X.zeros((Q, maxK), np.int64); HI = X.zeros((Q, maxK), np.int64); R = self.R; sa = self.sa
        # PREVIOUS implementation used two Python-driven binary searches
        # at EACH depth, each checking GPU scalar booleans in an inner loop:
        # up to 2 * 64 * ceil(log2(n)) host↔GPU synchronization barriers.
        # The exact first eight lexicographic prefixes are now found with
        # native batched CUDA searchsorted (or NumPy searchsorted in CPU test).
        # The older exact suffix search remains for rare >8-character matches.
        prefix = X.zeros(Q, np.int64)
        alive = ctx[:, 0] >= 0
        fast = min(maxK, len(self.fast_prefix), ctx.shape[1])
        for k in range(fast):
            # Preserve exact old LO/HI padding semantics: once the entire
            # batch loses its matching prefix, untouched depths stay ZERO.
            # At most eight scalar checks, versus hundreds per query before.
            if not bool(alive.any()): break
            c = ctx[:, k]
            prefix = prefix * 129 + X.where(c >= 0, c + 1, X.zeros(Q, np.int64))
            keys = self.fast_prefix[k]
            if X.t:
                nlo = torch.searchsorted(keys, prefix.contiguous(), right=False)
                nhi = torch.searchsorted(keys, prefix.contiguous(), right=True)
            else:
                nlo = np.searchsorted(keys, prefix, side="left")
                nhi = np.searchsorted(keys, prefix, side="right")
            ok = alive & (c >= 0) & (nhi > nlo)
            lo = X.where(ok, nlo, lo)
            hi = X.where(ok, nhi, lo)
            LO[:, k] = lo
            HI[:, k] = X.where(ok, hi, lo)
            alive = ok
        steps = max(1, int(np.ceil(np.log2(n + 1))) + 1)
        for k in range(fast, maxK):
            c = ctx[:, k]; alive = (hi > lo) & (c >= 0)
            if not bool(alive.any()): break
            def bound(strict):
                a = lo.clone() if X.t else lo.copy(); b = hi.clone() if X.t else hi.copy()
                # The original per-step bool(go.any()) synchronizes CUDA to
                # the CPU in EVERY binary-search iteration. For a 43k-char
                # document and hundreds of batches this causes large amounts
                # of idle GPU time. On CUDA, execute the exact fixed upper
                # bound of steps asynchronously; inactive lanes are masked
                # and preserve EXACT original lo/hi results. NumPy and
                # CPU-Torch retain the previous early-exit behavior.
                for _ in range(steps):
                    go = a < b
                    if not (X.t and str(X.dev).startswith("cuda")) and not bool(go.any()): break
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
    KEY_COUNT = 4 * 13 * 4 * 11
    def __init__(self, device, depth=6, form_depth=4, maxK=64, S=64, max_memory=65536):
        self.X = X(device); self.depth, self.form_depth, self.maxK, self.S = depth, form_depth, maxK, S
        self.max_memory = max(256, int(max_memory))
        self.total_seen = 0
        self._fraction_lut = None
        self._self = {} # never reuse per-exercise suffix automata across native Brains
        self.mem = self.X.zeros(0, np.int64); self.fmem = self.X.zeros(0, np.int64); self.big = None; self.fbig = None; self.indexed = 0
    def append(self, exs, progress=None):
        X = self.X; raw = np.concatenate([np.asarray(e, dtype=np.int64) for e in exs]) if exs else np.zeros(0, np.int64)
        if not len(raw): return
        # The complete AligningGraph memory and learned trust remain on the Node side.
        # Only the recent bounded working set is indexed on CUDA; report both counts.
        flat = X.arr(raw[-self.max_memory:])
        recent = X.cat([self.mem[-max(0, self.max_memory - len(flat)):] if len(flat) < self.max_memory else X.zeros(0, np.int64), flat])
        recent = recent[-self.max_memory:]
        f_recent = form_of(X, recent)
        # Transactional: if suffix-index construction OOMs, keep the previous model.
        if progress is not None: progress(0, 1, 'indexing-memory')
        big = Index(X, recent, progress=(lambda done, total, phase: progress(done, total, 'indexing-memory')) if progress else None)
        if progress is not None: progress(0, 1, 'indexing-form')
        fbig = Index(X, f_recent, progress=(lambda done, total, phase: progress(done, total, 'indexing-form')) if progress else None)
        if progress is not None: progress(1, 1, 'indexing-complete')
        self.mem, self.fmem, self.big, self.fbig = recent, f_recent, big, fbig
        self.indexed = len(recent); self.total_seen += len(raw)
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
    def _cuda_empirical(self, ys, form_source=False):
        """Exact old repeated-q histogram, with integer CUDA counting.

        The lookup table is built by the same sequence of FP32 additions as
        the former j-loop, so this removes kernel-launch overhead without
        replacing the arithmetic with count/total (which can round
        differently).
        """
        X = self.X; Q, width = ys.shape
        if self._fraction_lut is None:
            den = torch.arange(self.S + 1, dtype=torch.float32, device=X.dev)
            q = torch.where(den > 0, 1.0 / den, torch.zeros_like(den))
            lut = torch.zeros((self.S + 1, self.S + 1), dtype=torch.float32, device=X.dev)
            for n in range(1, self.S + 1):
                lut[:, n] = lut[:, n - 1] + q
            self._fraction_lut = lut
        valid = ys >= 0
        symbols = ys.clamp(0, 128)
        counts = torch.zeros((Q, 129), dtype=torch.int64, device=X.dev)
        counts.scatter_add_(1, symbols, valid.to(torch.int64))
        totals = valid.to(torch.int64).sum(1).clamp(1, self.S)
        base = self._fraction_lut[totals[:, None], counts.clamp(0, self.S)]
        if form_source:
            digit_mass = base[:, DIG].clone()
            base[:, DIG] = 0
        else:
            digit_mass = torch.zeros(Q, dtype=torch.float32, device=X.dev)
        return base, digit_mass
    def live(self, exs, trust, g=8.0, formW=1.0, variants=(), chunk=4096, progress=None):
        """exs: exercises (lists of symbols) lived now. trust: {key_id: [right, tried]}. Returns the totals."""
        X = self.X; flat = []; owner = []; posin = []; self._self = {}
        for e_i, e in enumerate(exs):
            for i in range(1, len(e)): flat.append(i); owner.append(e_i)
        T_right = {}; T_tried = {}; hits = 0; vhits = [0] * len(variants); total = len(flat)
        # On CUDA these exact integer totals stay on the card for the complete
        # batch.  The old path copied kid/right to NumPy for every proposal,
        # forcing thousands of device synchronizations.  first_group retains
        # the original dict insertion order: chunks, then proposals, with the
        # keys sorted by np.unique inside each proposal.
        cuda = X.t and str(X.dev).startswith("cuda")
        if cuda:
            T_right_card = torch.zeros(self.KEY_COUNT, dtype=torch.int64, device=X.dev)
            T_tried_card = torch.zeros(self.KEY_COUNT, dtype=torch.int64, device=X.dev)
            T_first_group = torch.full((self.KEY_COUNT,), 2**62, dtype=torch.int64, device=X.dev)
            hits_card = torch.zeros((), dtype=torch.int64, device=X.dev)
            vhits_card = torch.zeros(len(variants), dtype=torch.int64, device=X.dev)
            # Keep the real exercises on the card and gather every reversed
            # context there.  Previously Python rebuilt Q x 64 contexts one
            # row at a time and copied each chunk to CUDA.
            lengths = np.asarray([len(e) for e in exs], dtype=np.int64)
            starts = np.concatenate([np.zeros(1, dtype=np.int64), np.cumsum(lengths)[:-1]])
            starts_card_all = X.arr(starts)
            exercise_card = X.arr(np.concatenate([np.asarray(e, dtype=np.int64) for e in exs]))
            reverse_depth = torch.arange(self.maxK, dtype=torch.int64, device=X.dev)[None, :]
        if progress is not None: progress(0, total, 'preparing-real-text')
        names = [x for x in trust if not x[0].endswith(":c")]; trust = [(name_id(nm), r, t) for nm, r, t in names if nm.split(":")[0] in SRC]
        tk = np.array([k for k, _, _ in trust], dtype=np.int64); tv = np.array([(r + 1) / (t + 2) for _, r, t in trust], dtype=np.float32)
        lut = np.full(4 * 13 * 4 * 11 + 1, .5, dtype=np.float32); lut[tk] = tv; LUT = X.arr(lut, np.float32)
        for c0 in range(0, total, chunk):
            Pi = flat[c0:c0 + chunk]; Oi = owner[c0:c0 + chunk]; Q = len(Pi)
            ctx = None if cuda else np.full((Q, self.maxK), -2, dtype=np.int64)
            ys_true = None if cuda else np.zeros(Q, dtype=np.int64)
            # inside the exercise: the longest earlier match of the present (lengths 1,2,4..64), the symbol after it, how far back
            sy = np.full(Q, -1, dtype=np.int64); sk = np.zeros(Q, dtype=np.int64); sfar = np.zeros(Q, dtype=np.int64)
            fsy = np.full(Q, -1, dtype=np.int64); fsk = np.zeros(Q, dtype=np.int64); fsfar = np.zeros(Q, dtype=np.int64)
            if cuda:
                owners_card = X.arr(Oi)
                local_pos = X.arr(Pi)
                starts_card = starts_card_all[owners_card]
                global_pos = starts_card + local_pos
                gather = global_pos[:, None] - 1 - reverse_depth
                valid_context = gather >= starts_card[:, None]
                CX = torch.where(valid_context,
                    exercise_card[gather.clamp(0, len(exercise_card) - 1)],
                    torch.full((Q, self.maxK), -2, dtype=torch.int64, device=X.dev))
                Y = exercise_card[global_pos]
            else:
                for q, (i, o) in enumerate(zip(Pi, Oi)):
                    e = exs[o]; L = min(i, self.maxK); ctx[q, :L] = e[i - L:i][::-1] if L else []; ys_true[q] = e[i]
            for q, (i, o) in enumerate(zip(Pi, Oi)):
                h = self._selfidx(exs, o, progress=progress); r = h.get(i)
                if r: sy[q], sk[q], sfar[q], fsy[q], fsk[q], fsfar[q] = r
            if not cuda:
                CX = X.arr(ctx); Y = X.arr(ys_true)
            FCX = form_of(X, CX); FY = form_of(X, Y)
            props = self._proposals(CX, FCX)
            # the self alignments as proposals with one symbol
            for src, yy, kk, ff in ((1, sy, sk, sfar), (3, fsy, fsk, fsfar)):
                ok = X.arr(yy >= 0, bool); ys = X.arr(yy)[:, None]; props.append((src, X.arr(np.minimum(kk, 12)), ok, X.zeros(Q, np.int64) + 1, ys, X.arr(np.minimum(9, np.floor(np.log2(1 + ff)).astype(np.int64)))))
            # trust totals per kind, and the blended guess (with the trust it has) and its variations
            # The same memory proposals are evaluated with several g/formW
            # variants. Building the 129-symbol distribution inside EACH
            # variant repeated the same 64-symbol scatter up to six times.
            # Precompute the exact per-proposal empirical histogram ONCE;
            # only its learned trust weight changes across variants.
            rows = X.arange(Q)
            prepared = []
            for p in props:
                src, d, ok, sup, ys = p[:5]
                farb = p[5] if len(p) > 5 else None
                kid = self._kid(src, d, sup, farb, Q)
                valid = ys >= 0
                cnt = X.f32(valid).sum(1)
                cnt = X.where(cnt > 0, cnt, cnt + 1)
                if cuda:
                    base, digit_mass = self._cuda_empirical(ys, src >= 2)
                else:
                    base = X.zeros((Q, 129), np.float32)
                    digit_mass = X.zeros(Q, np.float32)
                    for j in range(ys.shape[1]):
                        yj = X.clip(ys[:, j], 0, 128)
                        q = X.where(valid[:, j], 1.0 / cnt, X.zeros(Q, np.float32))
                        if src >= 2:
                            isd = yj == DIG
                            digit_mass += X.where(isd, q, X.zeros(Q, np.float32))
                            q = X.where(isd, X.zeros(Q, np.float32), q)
                        base[rows, yj] += q
                prepared.append((src, ok, kid, base, digit_mass))
            def blend(gv, fw):
                S = X.zeros((Q, 129), np.float32)
                dmass = X.zeros(Q, np.float32)
                for src, ok, kid, base, one_digit_mass in prepared:
                    w = LUT[kid] ** gv * (fw if src >= 2 else 1.0)
                    w = X.where(ok, w, X.zeros(Q, np.float32))
                    S += base * w[:, None]
                    dmass += one_digit_mass * w
                dig = S[:, 48:58]; dz = dig.sum(1); has = dz > 0
                share = X.where(has[:, None],
                    dig / X.where(has, dz, dz + 1)[:, None],
                    X.zeros(dig.shape, np.float32))
                S[:, 48:58] = dig + dmass[:, None] * share
                S[:, DIG] = S[:, DIG] + X.where(has,
                    X.zeros(Q, np.float32), dmass)
                return X.argmax1(S[:, :128])
            guess = blend(g, formW)
            if cuda: hits_card += X.i64(guess == Y).sum()
            else: hits += int((guess == Y).sum())
            for vi, (gv, fw) in enumerate(variants):
                score = X.i64(blend(gv, fw) == Y).sum()
                if cuda: vhits_card[vi] += score
                else: vhits[vi] += int(score)
            for prop_i, p in enumerate(props):
                src, d, ok, sup, ys = p[:5]; farb = p[5] if len(p) > 5 else None
                kid = self._kid(src, d, sup, farb, Q); top = self._top(ys); want = FY if src >= 2 else Y
                right = X.i64((top == want) & ok); okc = X.i64(ok)
                if cuda:
                    kn = kid[ok]
                    if kn.numel():
                        T_right_card += torch.bincount(kn, weights=right[ok], minlength=self.KEY_COUNT).to(torch.int64)
                        T_tried_card += torch.bincount(kn, minlength=self.KEY_COUNT)
                        # Preserve the original configured 256-character
                        # update-list insertion order even when a larger CUDA
                        # execution chunk combines several such logical
                        # groups. This makes chunk size a placement/performance
                        # choice only, never a learned-state ordering change.
                        rows_present = torch.nonzero(ok, as_tuple=False).flatten()
                        logical_chunk = min(chunk, 256)
                        groups = ((c0 + rows_present) // logical_chunk) * len(props) + prop_i
                        first = torch.full((self.KEY_COUNT,), 2**62,
                                           dtype=torch.int64, device=X.dev)
                        first.scatter_reduce_(0, kn, groups, reduce="amin", include_self=True)
                        T_first_group = torch.minimum(T_first_group, first)
                else:
                    kn = X.tonp(kid[ok]); rn = X.tonp(right[ok])
                    if len(kn): u, inv = np.unique(kn, return_inverse=True); rr = np.bincount(inv, weights=rn).astype(np.int64); tt = np.bincount(inv).astype(np.int64)
                    else: u, rr, tt = [], [], []
                    for k_, r_, t_ in zip(u, rr, tt): T_right[int(k_)] = T_right.get(int(k_), 0) + int(r_); T_tried[int(k_)] = T_tried.get(int(k_), 0) + int(t_)
            if progress is not None: progress(c0 + Q, total, 'alignment')
        if cuda:
            card = torch.stack([T_right_card, T_tried_card, T_first_group], dim=1).cpu().numpy()
            order = sorted(np.flatnonzero(card[:, 1]), key=lambda k: (int(card[k, 2]), int(k)))
            for k in order:
                T_right[int(k)] = int(card[k, 0]); T_tried[int(k)] = int(card[k, 1])
            hits = int(hits_card.cpu()); vhits = vhits_card.cpu().tolist()
        # imagining: from every 31st moment it writes 48 symbols ahead from its own expectations (all at once); as the real
        # symbols are compared, each alignment it followed while imagining earns or loses the trust it gets WHEN it imagines
        W_right, W_tried = self._imagine(exs, names, g, formW, progress=progress, batch=max(32, min(256, chunk)))
        if progress is not None: progress(0, 1, 'indexing')
        self.X.sync(); self.append(exs, progress=progress); self._self = {}
        if progress is not None: progress(1, 1, 'completed')
        return {"trust": [[key_name(k), T_right[k], T_tried[k]] for k in T_tried] + [["w|" + key_name(k), W_right[k], W_tried[k]] for k in W_tried], "hits": hits, "seen": total, "variants": vhits, "memory": int(len(self.mem)), "textWindowChars": self.max_memory, "totalCardChars": self.total_seen}
    def _imagine(self, exs, trust, g, formW, every=31, K=48, progress=None, batch=128):
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
        cuda = X.t and str(X.dev).startswith("cuda")
        if cuda:
            W_right_card = torch.zeros(self.KEY_COUNT, dtype=torch.int64, device=X.dev)
            W_tried_card = torch.zeros(self.KEY_COUNT, dtype=torch.int64, device=X.dev)
            W_first_group = torch.full((self.KEY_COUNT,), 2**62, dtype=torch.int64, device=X.dev)
        for c0 in range(0, len(starts), batch):
            St = starts[c0:c0 + batch]; Rn = len(St); ctx = np.full((Rn, self.maxK), -2, dtype=np.int64)
            for r, (o, i) in enumerate(St): e = exs[o]; L = min(i, self.maxK); ctx[r, :L] = e[i - L:i][::-1]
            CX = X.arr(ctx); ok = X.arr(np.ones(Rn, dtype=bool), bool) if cuda else np.ones(Rn, dtype=bool)
            for step in range(K):
                if progress is not None and step % 8 == 0: progress(c0 * K + step * Rn, len(starts) * K, 'imagination')
                real = np.array([exs[o][i + step] if i + step < len(exs[o]) else -1 for (o, i) in St], dtype=np.int64)
                real_card = X.arr(real)
                act = ok & ((real_card >= 0) if cuda else (real >= 0))
                if not bool(act.any()): break
                props = self._proposals(CX, form_of(X, CX)); Y = real_card; FY = form_of(X, Y)
                Sx = X.zeros((Rn, 129), np.float32); dmass = X.zeros(Rn, np.float32)
                for prop_i, (src, d, okp, sup, ys) in enumerate(props):
                    kid = self._kid(src, d, sup, None, Rn); w = LUT[kid] ** g * (formW if src >= 2 else 1.0); w = X.where(okp, w, X.zeros(Rn, np.float32))
                    valid = ys >= 0; cnt = X.f32(valid).sum(1); cnt = X.where(cnt > 0, cnt, cnt + 1)
                    fused = cuda and exact_weighted_histogram(ys, w, Sx, dmass, src >= 2)
                    if not fused:
                        for j in range(ys.shape[1]):
                            yj = X.clip(ys[:, j], 0, 128); q = X.where(valid[:, j], w / cnt, X.zeros(Rn, np.float32))
                            if src >= 2: isd = yj == DIG; dmass = dmass + X.where(isd, q, X.zeros(Rn, np.float32)); q = X.where(isd, X.zeros(Rn, np.float32), q)
                            Sx[X.arange(Rn), yj] += q
                    top = self._top(ys); want = FY if src >= 2 else Y; m = okp & (act if cuda else X.arr(act, bool))
                    if cuda:
                        kn = kid[m]; rn = X.i64(top == want)[m]
                        if kn.numel():
                            W_right_card += torch.bincount(kn, weights=rn, minlength=self.KEY_COUNT).to(torch.int64)
                            W_tried_card += torch.bincount(kn, minlength=self.KEY_COUNT)
                            present = torch.bincount(kn, minlength=self.KEY_COUNT) > 0
                            group = ((c0 // batch) * K + step) * len(props) + prop_i
                            W_first_group = torch.where(present & (W_first_group > group), group, W_first_group)
                    else:
                        kn = X.tonp(kid[m]); rn = X.tonp(X.i64(top == want)[m])
                        if len(kn):
                            u, inv = np.unique(kn, return_inverse=True); rr = np.bincount(inv, weights=rn).astype(np.int64); tt = np.bincount(inv).astype(np.int64)
                            for k_, r_, t_ in zip(u, rr, tt): W_right[int(k_)] = W_right.get(int(k_), 0) + int(r_); W_tried[int(k_)] = W_tried.get(int(k_), 0) + int(t_)
                dig = Sx[:, 48:58]; dz = dig.sum(1); has = dz > 0
                Sx[:, 48:58] = dig + dmass[:, None] * X.where(has[:, None], dig / X.where(has, dz, dz + 1)[:, None], X.zeros(dig.shape, np.float32))
                guess = X.argmax1(Sx[:, :128])
                if cuda:
                    ok = ok & ~((guess != real_card) & (step >= 2))
                    CX = torch.cat([guess[:, None], CX[:, :-1]], dim=1)
                else:
                    guess = X.tonp(guess)
                    ok = ok & ~((guess != real) & (step >= 2))                      # once its imagination left reality (after the first 3), the rest says nothing
                    cn = X.tonp(CX); cn = np.concatenate([guess[:, None], cn[:, :-1]], axis=1); CX = X.arr(cn)
        if cuda:
            card = torch.stack([W_right_card, W_tried_card, W_first_group], dim=1).cpu().numpy()
            order = sorted(np.flatnonzero(card[:, 1]), key=lambda k: (int(card[k, 2]), int(k)))
            for k in order:
                W_right[int(k)] = int(card[k, 0]); W_tried[int(k)] = int(card[k, 1])
        if progress is not None: progress(len(starts) * K, len(starts) * K, 'imagination')
        return W_right, W_tried
    def _top(self, ys):                          # the most frequent symbol among what followed (the proposal's guess)
        X = self.X; Q, S = ys.shape
        if S == 1: return ys[:, 0]
        if X.t and str(X.dev).startswith("cuda"):
            oh = torch.zeros((Q, 129), dtype=torch.int64, device=X.dev)
            oh.scatter_add_(1, ys.clamp(0, 128), (ys >= 0).to(torch.int64))
            return oh[:, :128].argmax(dim=1)
        oh = X.zeros((Q, 129), np.float32);
        for j in range(S): oh[X.arange(Q), X.clip(ys[:, j], 0, 128)] += X.f32(ys[:, j] >= 0)
        return X.argmax1(oh[:, :128])
    def _kid(self, src, d, sup, farb, Q):
        X = self.X; dd = d if not isinstance(d, int) else X.zeros(Q, np.int64) + d
        sb = X.where(sup < 2, X.zeros(Q, np.int64), X.where(sup < 8, X.zeros(Q, np.int64) + 1, X.where(sup < 64, X.zeros(Q, np.int64) + 2, X.zeros(Q, np.int64) + 3)))
        fb = farb if farb is not None else X.zeros(Q, np.int64) + 10
        return ((src * 13 + X.clip(dd, 0, 12)) * 4 + sb) * 11 + fb
    _self = {}
    def _selfidx(self, exs, o, progress=None):   # same original per-exercise automaton; only reports actual scanning positions
        if o in self._self: return self._self[o]
        e = exs[o]
        if progress is not None: progress(0, 2 * len(e), 'self-index')
        fe = [DIG if 48 <= c <= 57 else c for c in e]
        def scan(seq, stage):
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
                if progress is not None and (pos + 1) % 8192 == 0:
                    progress(stage * len(seq) + pos + 1, 2 * len(seq), 'self-index')
            if progress is not None: progress((stage + 1) * len(seq), 2 * len(seq), 'self-index')
            return res
        a = scan(e, 0); f = scan(fe, 1); out = {}
        for i in range(1, len(e)):
            x, y = a.get(i), f.get(i)
            if x or y: out[i] = (x[0] if x else -1, x[1] if x else 0, x[2] if x else 0, y[0] if y else -1, y[1] if y else 0, y[2] if y else 0)
        self._self[o] = out; return out
