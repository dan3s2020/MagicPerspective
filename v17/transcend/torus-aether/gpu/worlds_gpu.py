"""Many worlds at once on the GPU, for ONE brain (transcend/torus-aether).
The brain (Node) stays as it is and keeps learning the same way; this process only runs the worlds in parallel:
  * the labyrinth exercise (worlds/exercise.mjs): the worlds AND the decisions made with what the brain had discovered
    at the start of the batch (who it is, what its outputs do, what lets through, what attracts) — attraction spreads
    through the whole batch of labyrinths at once on the card;
  * the transformation world (worlds/transform.mjs): the worlds' physics for every world at once; the decisions
    (imagination over the brain's own model) come from Node at every step.
Afterwards Node gives every world's experience to the same brain, one world after another.
Settings, all chosen by the person: the device (cuda:0, cuda:1, cpu), how much VRAM it may take (GB), how much of the
GPU's time it may use (%), how many worlds at once (no limit written here — only the VRAM decides).
Talks to Node by one JSON object per line on stdin / stdout.
The same code runs on numpy (no GPU) so it can be checked against the JavaScript worlds without a card."""
import sys, json, time, math

try:
    import torch
    HAVE_TORCH = True
except Exception:
    HAVE_TORCH = False
import numpy as np

# ---------------------------------------------------------------- backend (torch on the card, or numpy to check)
class Back:
    def __init__(self, device="cpu"):
        if device.startswith("cuda") and not HAVE_TORCH:          # no CPU fallback: asked for the card, the card or an error
            raise RuntimeError("PyTorch is not installed in " + sys.executable + " - CUDA requested, no CPU fallback (run START_V17.ps1 -Gpu cuda:0)")
        self.torch = HAVE_TORCH and device != "numpy"
        self.device = device if self.torch else "numpy"
        if self.torch and device.startswith("cuda") and not torch.cuda.is_available():
            raise RuntimeError("torch.cuda.is_available() is false in " + sys.executable + " (PyTorch " + torch.__version__ + ") - no CPU fallback")
    def arr(self, a, dtype="i"):
        if self.torch: return torch.tensor(a, dtype=torch.int64 if dtype == "i" else torch.float32 if dtype == "f" else torch.bool, device=self.device)
        return np.array(a, dtype=np.int64 if dtype == "i" else np.float32 if dtype == "f" else bool)
    def zeros(self, shape, dtype="f"):
        if self.torch: return torch.zeros(shape, dtype=torch.float32 if dtype == "f" else torch.int64 if dtype == "i" else torch.bool, device=self.device)
        return np.zeros(shape, dtype=np.float32 if dtype == "f" else np.int64 if dtype == "i" else bool)
    def where(self, c, a, b): return torch.where(c, a, b) if self.torch else np.where(c, a, b)
    def maximum(self, a, b): return torch.maximum(a, b) if self.torch else np.maximum(a, b)
    def stack(self, xs, dim): return torch.stack(xs, dim) if self.torch else np.stack(xs, dim)
    def argmax(self, x, dim): return torch.argmax(x, dim) if self.torch else np.argmax(x, dim)   # both: first maximum
    def amax(self, x, dim): return torch.amax(x, dim) if self.torch else np.max(x, dim)
    def any(self, x): return bool(x.any())
    def rand(self, shape, gen):
        if self.torch: return torch.rand(shape, generator=gen, device=self.device)
        return gen.random(shape).astype(np.float32)
    def gen(self, seed):
        if self.torch: g = torch.Generator(device=self.device); g.manual_seed(int(seed)); return g
        return np.random.default_rng(int(seed))
    def tolist(self, x): return x.tolist()
    def sync(self):
        if self.torch and self.device.startswith("cuda"): torch.cuda.synchronize()

# ---------------------------------------------------------------- the labyrinths (same generator as JavaScript)
M32 = 0xFFFFFFFF
class RNG:                                                  # worlds/labyrinth.mjs RNG, bit for bit
    def __init__(self, s): self.s = (s & M32) or 1
    def next(self):
        x = self.s; x ^= (x << 13) & M32; x ^= x >> 17; x ^= (x << 5) & M32; self.s = x & M32; return self.s / 4294967296
    def int(self, n): return int(math.floor(self.next() * n))
ACTIONS = [(0, -1), (1, 0), (0, 1), (-1, 0)]
def bfs(n, wall, frm):
    d = [10 ** 9] * (n * n); q = [frm]; d[frm] = 0; k = 0
    while k < len(q):
        i = q[k]; k += 1; x, y = i % n, i // n
        for dx, dy in ACTIONS:
            X, Y = x + dx, y + dy
            if X < 0 or Y < 0 or X >= n or Y >= n: continue
            j = Y * n + X
            if wall[j] or d[j] < 10 ** 9: continue
            d[j] = d[i] + 1; q.append(j)
    return d
def make_maze(seed, n=7, braid=0.3):
    r = RNG(seed); wall = [1] * (n * n); st = [n + 1]; wall[n + 1] = 0
    def shuffle(a):
        for i in range(len(a) - 1, 0, -1):
            j = r.int(i + 1); a[i], a[j] = a[j], a[i]
        return a
    while st:
        i = st[-1]; x, y = i % n, i // n; moved = False
        for dx, dy in shuffle(list(ACTIONS)):
            X, Y = x + 2 * dx, y + 2 * dy
            if X < 1 or Y < 1 or X > n - 2 or Y > n - 2 or not wall[Y * n + X]: continue
            wall[(y + dy) * n + x + dx] = 0; wall[Y * n + X] = 0; st.append(Y * n + X); moved = True; break
        if not moved: st.pop()
    for y in range(1, n - 1):
        for x in range(1, n - 1):
            i = y * n + x
            if wall[i] and r.next() < braid and ((not wall[i - 1] and not wall[i + 1]) or (not wall[i - n] and not wall[i + n])): wall[i] = 0
    floor = [i for i in range(n * n) if not wall[i]]; t = 0
    while True:
        start = floor[r.int(len(floor))]; goal = floor[r.int(len(floor))]; t += 1
        if not ((bfs(n, wall, goal)[start] < n - 1 or start == goal) and t < 300): break
    return {"seed": seed, "n": n, "wall": wall, "start": start, "goal": goal, "dist": bfs(n, wall, goal)}

def exercise_batch(B, worlds, K, seed):
    """worlds: [{seed, n}], K: what the brain knows at the start of the batch. Returns every world's outputs."""
    if not worlds:
        raise ValueError("GPU labyrinth request has zero worlds; --gpu-worlds 0 must resolve to a positive autoWorlds count")
    mz = [make_maze(w["seed"], w["n"]) for w in worlds]; N = len(mz); P = max(m["n"] for m in mz)
    FLOOR, WALL, TARGET, SELF = 0, 1, 2, 3
    kind = np.full((N, P, P), -1, dtype=np.int64)                   # -1 = outside the exercise
    for b, m in enumerate(mz):
        n = m["n"]; g = np.array(m["wall"]).reshape(n, n); kind[b, :n, :n] = np.where(g == 1, WALL, FLOOR)
        kind[b, m["goal"] // n, m["goal"] % n] = TARGET
    pos = np.array([[m["start"] // m["n"], m["start"] % m["n"]] for m in mz])
    lim = np.array([3 * m["dist"][m["start"]] + 15 for m in mz]); nn = np.array([m["n"] for m in mz])
    goal = np.array([[m["goal"] // m["n"], m["goal"] % m["n"]] for m in mz])
    kind_t = B.arr(kind); conduct = B.arr(K["conduct"] + [0.0], "f"); attract = B.arr(K["attract"] + [0.0], "f")
    eff = K["effect"]; self_kind = K["self"]; tries = K["tries"]; moves = K["moves"]
    tp = K["trust"]["plan"][0] / K["trust"]["plan"][1]; te = K["trust"]["explore"][0] / K["trust"]["explore"][1]
    gen = B.gen(seed); outputs = [[] for _ in range(N)]; visits = np.zeros((N, P, P), dtype=np.int64)
    for b in range(N): visits[b, pos[b, 0], pos[b, 1]] = 1
    active = np.ones(N, dtype=bool); steps = np.zeros(N, dtype=np.int64)
    untried = [o for o in range(8) if tries[o] < 3]
    while active.any():
        cur = kind.copy()
        for b in range(N): cur[b, pos[b, 0], pos[b, 1]] = SELF
        # the shape of the solution: attraction spreading through what lets through, for every world at once
        plan_dir = np.full(N, -1)
        if self_kind == SELF and max(K["attract"]) > .2:
            c = B.arr(cur); me = (c == SELF)
            att = attract[B.where(c < 0, B.arr(4), c)]; cnd = conduct[B.where(c < 0, B.arr(4), c)]
            src = (att > .2) & ~me
            V = B.where(src, att, B.zeros(cur.shape)); upd = (~src) & B.where(me, B.arr(True, "b"), cnd >= .5) & (c >= 0)
            cell_c = B.where(me, B.zeros(cur.shape) + 1, cnd)
            for _ in range(2 * P * P):
                pad = B.zeros((N, P + 2, P + 2)); pad[:, 1:-1, 1:-1] = V
                nb = B.maximum(B.maximum(pad[:, :-2, 1:-1], pad[:, 2:, 1:-1]), B.maximum(pad[:, 1:-1, :-2], pad[:, 1:-1, 2:]))
                v = .97 * cell_c * nb; nV = B.where(upd & (v > V + 1e-12), v, V)
                if not B.any(nV != V): break
                V = nV
            Vn = np.array(B.tolist(V), dtype=np.float32)
            for b in range(N):
                if not active[b]: continue
                y, x = pos[b]; best, bv = -1, Vn[b, y, x]
                for a, (dx, dy) in enumerate(ACTIONS):
                    Y, X = y + dy, x + dx
                    if 0 <= X < nn[b] and 0 <= Y < nn[b] and Vn[b, Y, X] > bv: bv = Vn[b, Y, X]; best = a
                plan_dir[b] = best
        rnd = np.array(B.tolist(B.rand((N, 8), gen)))
        for b in range(N):
            if not active[b]: continue
            o = None
            if K.get("noise") and rnd[b, 1] < K["noise"]: o = int(rnd[b, 2] * 8) % 8      # the person's noise: sometimes it acts at random
            elif plan_dir[b] >= 0 and tp >= te * .9:
                d = ACTIONS[plan_dir[b]]
                for oo in range(8):
                    if eff[oo] and eff[oo][0] == d[0] and eff[oo][1] == d[1]: o = oo; break
            if o is None:                                          # exploring, as the brain does
                if untried: o = untried[int(rnd[b, 0] * len(untried)) % len(untried)]
                else:
                    best, bv = None, -1e9; y, x = pos[b]
                    for oo in range(8):
                        e = eff[oo]
                        if not e: v = .7 / (1 + tries[oo] / 15) + .05 * rnd[b, oo]
                        else:
                            X, Y = x + e[0], y + e[1]
                            if X < 0 or Y < 0 or X >= nn[b] or Y >= nn[b]: continue
                            kk = cur[b, Y, X]; v = K["conduct"][kk] - .3 * min(visits[b, Y, X], 5) + .2 * K["attract"][kk] + .05 * rnd[b, oo]
                        if v > bv: bv = v; best = oo
                    o = best if best is not None else int(rnd[b, 0] * 8) % 8
            outputs[b].append(int(o))
            if o in moves:                                           # the world's physics
                dx, dy = ACTIONS[moves.index(o)]; Y, X = pos[b, 0] + dy, pos[b, 1] + dx
                if 0 <= X < nn[b] and 0 <= Y < nn[b] and kind[b, Y, X] != WALL: pos[b] = (Y, X); visits[b, Y, X] += 1
            steps[b] += 1
            if (pos[b] == goal[b]).all() or steps[b] >= lim[b]: active[b] = False
    return [{"outputs": outputs[b], "solved": bool((pos[b] == goal[b]).all())} for b in range(N)]

# ---------------------------------------------------------------- the transformation world (same physics as JavaScript)
T_FLOOR, T_WALL, T_PLATE, T_LEVER, T_DOORP, T_DOORL = 0, 1, 2, 3, 4, 5
class TBatch:
    def __init__(self, B, levels, moves):
        if not levels:
            raise ValueError("t_reset received zero transformation worlds; --gpu-worlds 0 must resolve to autoWorlds before calling the Python engine")
        self.B = B; self.N = len(levels); self.n = np.array([L["n"] for L in levels]); P = int(self.n.max()); self.P = P
        terr = np.full((self.N, P * P), T_WALL, dtype=np.int64)
        for b, L in enumerate(levels):
            n = L["n"]
            for i, t in enumerate(L["terr"]): terr[b, (i // n) * P + (i % n)] = t
        self.terr = B.arr(terr); self.moves = moves
        to = lambda b, i: (i // levels[b]["n"]) * P + (i % levels[b]["n"])
        self.self = B.arr([to(b, L["self"]) for b, L in enumerate(levels)])
        self.boxes = B.arr([[to(b, i) for i in L["boxes"]] + [-1] * (2 - len(L["boxes"])) for b, L in enumerate(levels)])
        self.lever = B.arr([False] * self.N, "b")
    def occ_grid(self):
        B, N, P = self.B, self.N, self.P; idx = B.arr(list(range(P * P)))[None, :]
        s = (idx == self.self[:, None]); bx = (idx == self.boxes[:, 0:1]) | (idx == self.boxes[:, 1:2])
        return s, bx
    def door_open(self, s, bx):
        plate_occ = ((self.terr == T_PLATE) & (s | bx)).any(1)
        openP = plate_occ[:, None] | s | bx; openL = self.lever[:, None] | s | bx
        return B_where(self.B, self.terr == T_DOORP, openP, B_where(self.B, self.terr == T_DOORL, openL, self.B.arr(True, "b")))
    def passable(self, open_, cell):
        B = self.B; inside = (cell >= 0); c = B.where(inside, cell, B.arr(0))
        t = gather(B, self.terr, c); o = gather(B, open_, c)
        return inside & (t != T_WALL) & B.where((t == T_DOORP) | (t == T_DOORL), o, B.arr(True, "b"))
    def step(self, outputs):
        B, P = self.B, self.P; out = B.arr(outputs)
        dirs = [self.moves.index(o) if o in self.moves else -1 for o in outputs]; d = B.arr(dirs)
        dx = B.arr([ACTIONS[k][0] if k >= 0 else 0 for k in dirs]); dy = B.arr([ACTIONS[k][1] if k >= 0 else 0 for k in dirs])
        n = B.arr(list(self.n))
        def nxt(i):
            x = i % P + dx; y = i // P + dy
            ok = (d >= 0) & (x >= 0) & (y >= 0) & (x < n) & (y < n)
            return B.where(ok, y * P + x, B.arr(-1))
        s, bx = self.occ_grid(); open_ = self.door_open(s, bx)
        c1 = nxt(self.self); can1 = self.passable(open_, c1)
        hit0 = (self.boxes[:, 0] == c1) & (c1 >= 0); hit1 = (self.boxes[:, 1] == c1) & (c1 >= 0); hit = hit0 | hit1
        c2 = nxt(c1); c2c = B.where(c2 >= 0, c2, B.arr(0))
        free2 = self.passable(open_, c2) & (self.boxes[:, 0] != c2) & (self.boxes[:, 1] != c2) & (gather(B, self.terr, c2c) != T_LEVER)
        go = can1 & (~hit | free2)
        nb0 = B.where(go & hit0, c2, self.boxes[:, 0]); nb1 = B.where(go & hit1, c2, self.boxes[:, 1])
        self.boxes = B.stack([nb0, nb1], 1); self.self = B.where(go, c1, self.self)
        on_lever = go & (gather(B, self.terr, B.where(c1 >= 0, c1, B.arr(0))) == T_LEVER)
        self.lever = B.where(on_lever, ~self.lever, self.lever)
    def boards(self):                                         # what every world shows, cell by cell (SHOW in transform.mjs)
        B = self.B; s, bx = self.occ_grid(); open_ = self.door_open(s, bx); t = self.terr
        occ = B.where(s, B.arr(1), B.where(bx, B.arr(2), B.arr(0)))
        v = B.where(t == T_WALL, B.arr(1), B.arr(0))
        v = B.where(t == T_FLOOR, B.where(occ == 1, B.arr(2), B.where(occ == 2, B.arr(3), B.arr(0))), v)
        v = B.where(t == T_PLATE, B.where(occ == 1, B.arr(5), B.where(occ == 2, B.arr(6), B.arr(4))), v)
        v = B.where(t == T_LEVER, B.where(occ == 1, B.arr(8), B.arr(7)), v)
        v = B.where(t == T_DOORP, B.where(~open_, B.arr(9), B.where(occ == 1, B.arr(11), B.where(occ == 2, B.arr(12), B.arr(10)))), v)
        v = B.where(t == T_DOORL, B.where(~open_, B.arr(13), B.where(occ == 1, B.arr(15), B.where(occ == 2, B.arr(16), B.arr(14)))), v)
        V = np.array(B.tolist(v)); P = self.P
        return [[int(V[b, (i // n) * P + (i % n)]) for i in range(n * n)] for b, n in enumerate(self.n)]
def B_where(B, c, a, b): return B.where(c, a, b)
def gather(B, x, idx):                                         # x[b, idx[b]]
    if B.torch: return x.gather(1, idx[:, None])[:, 0]
    return x[np.arange(x.shape[0]), idx]

# ---------------------------------------------------------------- many labyrinths LIVED on the card: every world at once
def exercise_learn_batch(B, worlds, K, seed):
    """Every labyrinth of the batch lived at once, all as tensors: the decisions with what the brain knew at the start of
    the batch, the world's physics, and EVERYTHING the brain learns from what happens (what moved and how, what lets
    through, what blocks, what it entered when an exercise ended, how its trust in the shape of the solution did).
    The brain on the CPU only adds these totals (Discoverer.absorb). Same rules as worlds/exercise.mjs."""
    T = torch if B.torch else np
    def t(a, dt="i"): return B.arr(a, dt)
    def amax(x, d): return x.max(dim=d).values if B.torch else x.max(axis=d)
    def argm(x, d): return x.argmax(dim=d) if B.torch else x.argmax(axis=d)
    def clip(x, lo, hi): return x.clamp(lo, hi) if B.torch else np.clip(x, lo, hi)
    def add_at(acc, idx, val):                              # acc[idx] += val (repeated indices add up)
        if B.torch: acc.index_put_((idx,), val, accumulate=True)
        else: np.add.at(acc, idx, val)
    if not worlds:
        raise ValueError("GPU labyrinth request has zero worlds; --gpu-worlds 0 must resolve to a positive autoWorlds count")
    mz = [make_maze(w["seed"], w["n"]) for w in worlds]; N = len(mz); P = max(m["n"] for m in mz)
    FLOOR, WALL, TARGET, SELF = 0, 1, 2, 3
    kind_np = np.full((N, P, P), WALL, dtype=np.int64)          # outside a smaller exercise behaves as wall
    for b, m in enumerate(mz):
        n = m["n"]; kind_np[b, :n, :n] = np.where(np.array(m["wall"]).reshape(n, n) == 1, WALL, FLOOR); kind_np[b, m["goal"] // n, m["goal"] % n] = TARGET
    kind = t(kind_np); nn = t([m["n"] for m in mz])
    py = t([m["start"] // m["n"] for m in mz]); px = t([m["start"] % m["n"] for m in mz])
    gy = t([m["goal"] // m["n"] for m in mz]); gx = t([m["goal"] % m["n"] for m in mz])
    lim = t([3 * m["dist"][m["start"]] + 15 for m in mz]); optimal = [m["dist"][m["start"]] for m in mz]
    conduct = t(K["conduct"], "f"); attract = t(K["attract"], "f"); self_known = K["self"] == SELF
    eff = K["effect"]; known = t([1 if e else 0 for e in eff]); edx = t([e[0] if e else 0 for e in eff]); edy = t([e[1] if e else 0 for e in eff])
    moves = K["moves"]; dirOf = t([moves.index(o) if o in moves else -1 for o in range(8)])
    AX = t([0, 1, 0, -1]); AY = t([-1, 0, 1, 0])                  # ACTIONS
    dir2o = [-1] * 4
    for a, (dx, dy) in enumerate([(0, -1), (1, 0), (0, 1), (-1, 0)]):
        for o in range(8):
            if eff[o] and eff[o][0] == dx and eff[o][1] == dy: dir2o[a] = o; break
    dir2o = t(dir2o)
    tp = K["trust"]["plan"][0] / K["trust"]["plan"][1]; te = K["trust"]["explore"][0] / K["trust"]["explore"][1]
    use_plan = self_known and max(K["attract"]) > .2 and tp >= te * .9
    noise = float(K.get("noise") or 0)
    organism_policy = K.get("noisePolicy")
    if organism_policy:
        if organism_policy.get("version") != 1 or len(organism_policy.get("contexts", [])) != 4:
            raise ValueError("Organism noise policy has invalid shape")
        learned_probs = t(organism_policy["contexts"], "f")
        learned_strengths = t([x["strength"] for x in organism_policy["arms"]], "f")
        if tuple(learned_probs.shape) != (4, 7) or tuple(learned_strengths.shape) != (7,):
            raise ValueError("Each real GPU choice must have 7 organism-owned alternatives")
        noise = 0.0  # the external manual rate NEVER overrides the internal policy
        choice_count = B.zeros((4, 7), "i")
        choice_reward = B.zeros((4, 7), "f")
    gen = B.gen(seed); ar = T.arange(N, device=B.device) if B.torch else np.arange(N)
    tries = t([K["tries"]] * N); visits = B.zeros((N, P, P), "i"); visits[ar, py, px] = 1
    active = B.zeros(N, "b") | True if B.torch else np.ones(N, dtype=bool); steps = B.zeros(N, "i")
    last_in = t([-1] * N); n_plan = B.zeros(N, "i"); n_expl = B.zeros(N, "i"); solved = B.zeros(N, "b")
    # what the brain learns, added up over the whole batch
    L_tries = B.zeros(8, "i"); L_move = B.zeros((8, 3, 3), "i"); L_still = B.zeros(8, "i"); L_pass = B.zeros(4, "i"); L_block = B.zeros(4, "i"); L_enter = B.zeros(4, "i")
    rec = []                                                       # the first world, recorded (its outputs) for the brain's view
    while B.any(active):
        idx = T.nonzero(active).flatten() if B.torch else np.nonzero(active)[0]
        cy, cx, k_ = py[idx], px[idx], kind[idx]
        rnd = B.rand((len(idx), 12), gen)
        o = t([-1] * len(idx))
        # the shape of the solution: attraction spreading through what lets through, for every world at once
        if use_plan:
            cur = k_.clone() if B.torch else k_.copy(); M = len(idx); a2 = ar[:M]
            att = attract[cur]; cnd = conduct[cur]; me = B.zeros((M, P, P), "b"); me[a2, cy, cx] = True
            src = (att > .2) & ~me; V = B.where(src, att, B.zeros((M, P, P))); upd = (~src) & (me | (cnd >= .5)); cc = B.where(me, B.zeros((M, P, P)) + 1, cnd)
            for _ in range(2 * P * P):
                pad = B.zeros((M, P + 2, P + 2)); pad[:, 1:-1, 1:-1] = V
                nb = B.maximum(B.maximum(pad[:, :-2, 1:-1], pad[:, 2:, 1:-1]), B.maximum(pad[:, 1:-1, :-2], pad[:, 1:-1, 2:]))
                nV = B.where(upd & (.97 * cc * nb > V + 1e-12), .97 * cc * nb, V)
                if not B.any(nV != V): break
                V = nV
            Vp = B.zeros((M, P + 2, P + 2)) - 1; Vp[:, 1:-1, 1:-1] = V
            here = V[a2, cy, cx]; nbv = B.stack([Vp[a2, cy + 1 + AY[a], cx + 1 + AX[a]] for a in range(4)], 1)
            best = argm(nbv, 1); okp = amax(nbv, 1) > here
            po = dir2o[best]; take = okp & (po >= 0)
            o = B.where(take, po, o); n_plan[idx] += take.long() if B.torch else take.astype(np.int64)
        free = o < 0
        # exploring, as the brain does: outputs never tried first, then the known moves toward what lets through
        tr = tries[idx]; untried = tr < 3; any_un = untried.any(1) if B.torch else untried.any(axis=1)
        pick_un = argm(B.where(untried, rnd[:, :8], B.zeros(rnd[:, :8].shape) - 1), 1)
        ty = cy[:, None] + edy[None, :]; tx = cx[:, None] + edx[None, :]; inb = (ty >= 0) & (tx >= 0) & (ty < nn[idx][:, None]) & (tx < nn[idx][:, None])
        tyc = clip(ty, 0, P - 1); txc = clip(tx, 0, P - 1); a8 = ar[:len(idx)][:, None] * 0 + ar[:len(idx)][:, None]
        tk = k_[a8, tyc, txc]; tv = visits[idx][a8, tyc, txc]
        trf = tr.float() if B.torch else tr.astype(np.float32)
        tvf = clip(tv, 0, 5).float() if B.torch else clip(tv, 0, 5).astype(np.float32)
        v_known = conduct[tk] - .3 * tvf + .2 * attract[tk] + .05 * rnd[:, :8]
        v_unknown = .7 / (1 + trf / 15) + .05 * rnd[:, :8]
        val = B.where(known[None, :] == 1, B.where(inb, v_known, B.zeros(v_known.shape) - 1e9), v_unknown)
        pick_ex = argm(val, 1)
        ex = B.where(any_un, pick_un, pick_ex)
        o = B.where(free, ex, o); n_expl[idx] += free.long() if B.torch else free.astype(np.int64)
        if organism_policy:
            # Each ACTIVE world independently chooses where and how much noise
            # using the SAME learned policy as the original serialized Brain.
            # Context 0/1 = unknown body, 2/3 = known body, with plan flag.
            context_id = B.zeros(o.shape, "i") + (2 if self_known else 0)
            context_id = context_id + (~free).long() if B.torch else context_id + (~free).astype(np.int64)
            cdf = learned_probs[context_id].cumsum(1) if B.torch else np.cumsum(learned_probs[context_id], axis=1)
            u = rnd[:, 10:11]
            arm = (u >= cdf).sum(1) if B.torch else (u >= cdf).sum(axis=1)
            arm = clip(arm, 0, 6)
            strength = learned_strengths[arm]
            # PERCEPTION: perturb the interpretation of observed local
            # action values; the actual maze's walls and state never change.
            perceive = (arm == 1) | (arm == 2)
            perceived_scores = val + (rnd[:, :8] - .5) * strength[:, None] * 1.6
            perceived_output = argm(perceived_scores, 1)
            o = B.where(perceive, perceived_output, o)
            # IMAGINATION: explore a non-leading action in the same learned
            # global-to-local route, never read simulator optimal paths.
            if use_plan:
                offset = clip((rnd[:, 9] * 3).long() if B.torch else (rnd[:, 9] * 3).astype(np.int64), 0, 2) + 1
                other_plan = dir2o[(best + offset) % 4]
                imagine = ((arm == 3) | (arm == 4)) & (~free) & (rnd[:, 11] < strength) & (other_plan >= 0)
                o = B.where(imagine, other_plan, o)
            # ACTION: organism deliberately tests another physical output.
            act_noise = (arm == 5) | (arm == 6)
            random_out = clip((rnd[:, 9] * 8).long() if B.torch else (rnd[:, 9] * 8).astype(np.int64), 0, 7)
            o = B.where(act_noise & (rnd[:, 11] < strength), random_out, o)
        if noise:                                                  # the person's noise: sometimes it acts at random
            nz = rnd[:, 8] < noise; ro = clip((rnd[:, 9] * 8).long() if B.torch else (rnd[:, 9] * 8).astype(np.int64), 0, 7); o = B.where(nz, ro, o)
        if int(idx[0]) == 0: rec.append(int(o[0]))
        # the world's physics
        d = dirOf[o]; mv = d >= 0; dsafe = clip(d, 0, 3); ny = cy + B.where(mv, AY[dsafe], B.zeros(d.shape, "i")); nx = cx + B.where(mv, AX[dsafe], B.zeros(d.shape, "i"))
        okb = (ny >= 0) & (nx >= 0) & (ny < nn[idx]) & (nx < nn[idx]); nyc = clip(ny, 0, P - 1); nxc = clip(nx, 0, P - 1)
        moved = mv & okb & (k_[ar[:len(idx)], nyc, nxc] != WALL)
        # what the brain learns from this step (Discoverer.learnStep), added up
        add_at(L_tries, o, B.zeros(o.shape, "i") + 1)
        mdx = B.where(moved, nxc - cx, B.zeros(o.shape, "i")); mdy = B.where(moved, nyc - cy, B.zeros(o.shape, "i"))
        mi = o * 9 + (mdx + 1) * 3 + (mdy + 1)
        flatm = L_move.view(-1) if B.torch else L_move.reshape(-1)
        add_at(flatm, mi[moved], B.zeros(int(moved.sum()), "i") + 1)
        add_at(L_still, o[~moved], B.zeros(int((~moved).sum()), "i") + 1)
        if self_known:
            ek = known[o] == 1; ey = cy + edy[o]; exx = cx + edx[o]; eib = ek & (ey >= 0) & (exx >= 0) & (ey < nn[idx]) & (exx < nn[idx])
            kk = k_[ar[:len(idx)], clip(ey, 0, P - 1), clip(exx, 0, P - 1)]
            add_at(L_pass, kk[eib & moved], B.zeros(int((eib & moved).sum()), "i") + 1); add_at(L_enter, kk[eib & moved], B.zeros(int((eib & moved).sum()), "i") + 1)
            add_at(L_block, kk[eib & ~moved], B.zeros(int((eib & ~moved).sum()), "i") + 1)
            last = last_in[idx]; last_in[idx] = B.where(eib & moved, kk, last)
        tries[idx, o] += 1
        py[idx] = B.where(moved, nyc, cy); px[idx] = B.where(moved, nxc, cx); visits[idx, py[idx], px[idx]] += 1; steps[idx] += 1
        reached = (py[idx] == gy[idx]) & (px[idx] == gx[idx]); solved[idx] = reached
        if organism_policy:
            # Credit the REAL outcomes of these GPU actions to the chosen arm.
            # Novelty is measured before mutating the visit counter below;
            # movement and goal termination are empirical, not BFS teachers.
            was_unvisited = moved & (visits[idx, nyc, nxc] <= 1)
            r = B.where(moved, B.zeros(o.shape, "f") + .18, B.zeros(o.shape, "f") - .16)
            r = r + B.where(was_unvisited, B.zeros(o.shape, "f") + .06, B.zeros(o.shape, "f"))
            r = r + B.where(reached, B.zeros(o.shape, "f") + 2.0, B.zeros(o.shape, "f"))
            r = r - B.where(arm > 0, B.zeros(o.shape, "f") + .035, B.zeros(o.shape, "f"))
            flat_index = context_id * 7 + arm
            counts_flat = choice_count.view(-1) if B.torch else choice_count.reshape(-1)
            rewards_flat = choice_reward.view(-1) if B.torch else choice_reward.reshape(-1)
            add_at(counts_flat, flat_index, B.zeros(o.shape, "i") + 1)
            add_at(rewards_flat, flat_index, r)
        active[idx] = ~reached & (steps[idx] < lim[idx])
    # the end of every exercise (Discoverer.endEpisode): what it entered last attracts; the trust in the shape
    L_endIn = B.zeros(4, "i"); ok = solved & (last_in >= 0); add_at(L_endIn, last_in[ok], B.zeros(int(ok.sum()), "i") + 1)
    planw = n_plan > n_expl; sv = solved.long() if B.torch else solved.astype(np.int64)
    trust = {"plan": [int(sv[planw].sum()), int(planw.sum())], "explore": [int(sv[~planw].sum()), int((~planw).sum())]}
    tl = lambda x: B.tolist(x)
    return {"n": N, "solved": int(solved.sum()), "steps": int(steps.sum()), "optimal": sum(optimal),
            "learn": {"tries": tl(L_tries), "move": tl(L_move), "still": tl(L_still), "pass": tl(L_pass), "block": tl(L_block), "enter": tl(L_enter), "endIn": tl(L_endIn), "trust": trust},
            "record": {"seed": worlds[0]["seed"], "n": worlds[0]["n"], "outputs": rec},
            "noiseEvidence": {"version": 1, "counts": tl(choice_count), "rewards": tl(choice_reward)} if organism_policy else None}

# ---------------------------------------------------------------- the server: settings, throttle, commands
class Server:
    def __init__(self): self.B = Back("numpy" if not HAVE_TORCH else "cpu"); self.util = 100; self.tb = None; self.text = None; self.fast_text = None; self.shared = None; self.text_limit = 32768; self.text_chunk = 128
    def init(self, m):
        dev = m.get("device", "cuda:0"); self.B = Back(dev); self.util = max(1, min(100, float(m.get("util", 100))))
        info = {"device": self.B.device, "torch": HAVE_TORCH}
        if self.B.torch and dev.startswith("cuda"):
            idx = int(dev.split(":")[1]) if ":" in dev else 0; total = torch.cuda.get_device_properties(idx).total_memory
            requested = float(m.get("vram", 0)) * 1e9
            free, _ = torch.cuda.mem_get_info(idx)
            # Other CUDA users and display memory live outside the PyTorch process cap.
            # Keep a physical free-memory margin rather than promising the full nominal 4 GB.
            effective = min(requested if requested > 0 else free * .75, free * .75, total)
            if effective < 384e6:
                raise RuntimeError("Insufficient free CUDA memory for V17: %.2f GB free" % (free / 1e9))
            torch.cuda.set_per_process_memory_fraction(effective / total, idx)
            info.update(name=torch.cuda.get_device_name(idx), totalGB=round(total / 1e9, 2),
                        freeAtInitGB=round(free / 1e9, 3), vramGB=round(effective / 1e9, 3),
                        requestedVramGB=round(requested / 1e9, 3))
        # Physical free-memory-aware budget. Text exercises can be tens of thousands
        # of characters, so old "autoText=585 exercises" was a misleading estimate.
        budget = info.get("vramGB", 0) * 1e9 if dev.startswith("cuda") else 1e9
        self.text_limit = int(max(8192, min(65536, budget / 60000))) if dev.startswith("cuda") else 65536
        self.text_chunk = int(max(32, min(192, budget / 12000000)))
        # The old GPU auto setting selected 65,536 worlds even on a 4 GB card.
        # Keep the default modest; explicit world counts remain user-selectable.
        if dev.startswith("cuda"):
            auto_cap = 256 if budget <= 4e9 else 4096
            info["autoWorlds"] = int(max(16, min(auto_cap, budget * .4 / (11 * 11 * 14 * 8))))
        else:
            info["autoWorlds"] = 2048
        info["autoText"] = 2
        info["textMemoryWindow"] = self.text_limit
        info["textChunk"] = self.text_chunk
        return info
    def throttle(self, busy):                                 # the GPU works busy seconds, then rests so the average is util %
        if self.util < 100: time.sleep(busy * (100 / self.util - 1))
    def handle(self, m):
        t0 = time.time(); c = m["cmd"]
        if self.B.torch and str(self.B.device).startswith("cuda"): torch.cuda.reset_peak_memory_stats()   # VRAM is measured as this command's peak (the batch's tensors are freed when it ends)
        if c == "init": r = self.init(m)
        elif c == "exercise": r = {"worlds": exercise_batch(self.B, m["worlds"], m["knows"], m.get("seed", 1))}
        elif c == "exercise_learn": r = exercise_learn_batch(self.B, m["worlds"], m["knows"], m.get("seed", 1))
        elif c == "text_load":                                  # the brain's whole text memory, when the card (re)starts: nothing lived is missing here
            import base64
            from text_gpu import TextCard
            self.text = TextCard(self.B.device if self.B.torch else "numpy", max_memory=self.text_limit); raw = np.frombuffer(base64.b64decode(m["b64"]), dtype=np.uint8).astype(np.int64)
            if len(raw): self.text.append([raw])
            r = {"memory": int(len(self.text.mem))}
        elif c == "text_learn":                                 # text exercises lived on the card; only the totals go back
            if self.text is None:
                from text_gpu import TextCard
                self.text = TextCard(self.B.device if self.B.torch else "numpy", max_memory=self.text_limit)
            def text_progress(done, total, phase):
                if "id" in m:
                    sys.stdout.write(json.dumps({"id": m["id"], "type": "progress", "phase": phase,
                                                 "done": int(done), "total": int(total)}) + "\n")
                    sys.stdout.flush()
            chunk = max(32, min(512, int(m.get("chunk") or self.text_chunk)))
            while True:
                try:
                    r = self.text.live(m["exercises"], m.get("trust", []), m.get("g", 8.0),
                                       m.get("formW", 1.0), [tuple(v) for v in m.get("variants", [])],
                                       chunk=chunk, progress=text_progress)
                    r["textChunk"] = chunk
                    break
                except RuntimeError as exc:
                    if not (self.B.torch and str(self.B.device).startswith("cuda") and
                            "out of memory" in str(exc).lower() and chunk > 32):
                        raise
                    # A failed live() has not appended memory or changed Node's weights.
                    self.text._self = {}
                    torch.cuda.empty_cache()
                    chunk = max(32, chunk // 2)
                    text_progress(0, 1, "retry-smaller-cuda-chunk")
        elif c == "text_fast_init":
            from fast_text import StreamingFastText
            self.fast_text = StreamingFastText(self.B.device if self.B.torch else "numpy",
                                               checkpoint=m.get("checkpoint"),
                                               resume=bool(m.get("resume", False)))
            r = self.fast_text.status()
        elif c == "text_fast_train":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_train")
            r = self.fast_text.train(m["rows"])
            if "epoch" in m and "endOffset" in m:
                self.fast_text.cursor(int(m["epoch"]), int(m["endOffset"]))
                r["cursorEpoch"] = self.fast_text.cursor_epoch
                r["cursorOffset"] = self.fast_text.cursor_offset
        elif c == "text_fast_eval":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_eval")
            r = self.fast_text.evaluate(m["rows"])
        elif c == "text_fast_save":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_save")
            r = self.fast_text.save()
        elif c == "text_fast_status":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_status")
            r = self.fast_text.status()
        elif c == "text_fast_cursor":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_cursor")
            self.fast_text.cursor(int(m["epoch"]), int(m["offset"]))
            r = self.fast_text.status()
        elif c == "text_fast_graph":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_graph")
            r = self.fast_text.unified.graph(max_edges=min(200, max(1, int(m.get("maxEdges", 90)))))
        elif c == "text_fast_plan":
            if self.fast_text is None:
                raise RuntimeError("text_fast_init required before text_fast_plan")
            r = self.fast_text.unified.plan(str(m.get("start", "")),
                                            length=min(80, max(1, int(m.get("length", 48)))))
        elif c == "t_reset": self.tb = TBatch(self.B, m["levels"], m["moves"]); r = {"boards": self.tb.boards()}
        elif c == "t_step": self.tb.step(m["outputs"]); r = {"boards": self.tb.boards()}
        elif c in ("shared_load", "shared_train", "shared_eval", "shared_save"):
            from shared_perspective import SharedPerspective
            if self.shared is None:
                if not self.B.torch: raise RuntimeError("Shared learning requires a real PyTorch backend")
                self.shared = SharedPerspective(str(self.B.device), seed=int(m.get("seed", 11)))
            if c == "shared_load": r = self.shared.load(m["checkpoint"])
            elif c == "shared_train":
                r = self.shared.train(m["samples"], adaptive_noise=bool(m.get("adaptiveNoise", False)),
                                      noise_selection=m.get("noiseSelection"))
                if m.get("checkpoint"): r["checkpoint"] = self.shared.save(m["checkpoint"])
            elif c == "shared_eval": r = self.shared.evaluate(m["samples"])
            else: r = self.shared.save(m["checkpoint"])
        elif c == "maze_check": r = {"mazes": [make_maze(s, n) for s, n in m["items"]]}
        else: r = {"error": "unknown command " + c}
        self.B.sync(); busy = time.time() - t0; self.throttle(busy)
        if self.B.torch and str(self.B.device).startswith("cuda"): r["vramUsedGB"] = round(torch.cuda.max_memory_allocated() / 1e9, 4)
        r["busy"] = round(busy, 4); return r

def selftest(device):                                        # run by START_V17.ps1 before training: does the card really compute?
    S = Server(); info = S.handle({"cmd": "init", "device": device, "util": 100})
    if device.startswith("cuda") and not (S.B.torch and str(S.B.device).startswith("cuda")):
        print(json.dumps({"error": "not running on the card", "device": info})); return 1
    K = {"self": 3, "effect": [[0, -1], [1, 0], [0, 1], [-1, 0], None, None, None, None], "conduct": [1.0, 0.0, 1.0, 1.0], "attract": [0.0, 0.0, 1.0, 0.0],
         "trust": {"plan": [9, 10], "explore": [1, 10]}, "tries": [9] * 8, "moves": [0, 1, 2, 3]}
    t0 = time.time(); r = S.handle({"cmd": "exercise", "worlds": [{"seed": 1000003 + i * 7919, "n": [7, 9, 11][i % 3]} for i in range(512)], "knows": K, "seed": 1})
    ok = sum(w["solved"] for w in r["worlds"]); print(json.dumps({"device": info, "labyrinths": 512, "solved_with_known_rules": ok, "seconds": round(time.time() - t0, 2), "vramUsedGB": r.get("vramUsedGB")}))
    if device.startswith("cuda") and not r.get("vramUsedGB"):
        print(json.dumps({"error": "the batch did not allocate anything on the card"})); return 1
    return 0 if ok == 512 else 1

if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--selftest": sys.exit(selftest(sys.argv[2]))
    S = Server()
    for line in sys.stdin:
        line = line.strip()
        if not line: continue
        m = json.loads(line)
        try: r = S.handle(m)
        except Exception as e:
            import traceback
            r = {"error": repr(e), "traceback": traceback.format_exc(limit=12)}
        r["id"] = m.get("id"); sys.stdout.write(json.dumps(r) + "\n"); sys.stdout.flush()
