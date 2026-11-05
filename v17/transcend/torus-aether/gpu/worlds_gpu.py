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

# ---------------------------------------------------------------- the server: settings, throttle, commands
class Server:
    def __init__(self): self.B = Back("numpy" if not HAVE_TORCH else "cpu"); self.util = 100; self.tb = None
    def init(self, m):
        dev = m.get("device", "cuda:0"); self.B = Back(dev); self.util = max(1, min(100, float(m.get("util", 100))))
        info = {"device": self.B.device, "torch": HAVE_TORCH}
        if self.B.torch and dev.startswith("cuda"):
            idx = int(dev.split(":")[1]) if ":" in dev else 0; total = torch.cuda.get_device_properties(idx).total_memory
            vram = float(m.get("vram", 0)) * 1e9
            if vram > 0: torch.cuda.set_per_process_memory_fraction(min(1.0, vram / total), idx)
            info.update(name=torch.cuda.get_device_name(idx), totalGB=round(total / 1e9, 2), vramGB=round(min(vram, total) / 1e9, 2) if vram > 0 else round(total / 1e9, 2))
        return info
    def throttle(self, busy):                                 # the GPU works busy seconds, then rests so the average is util %
        if self.util < 100: time.sleep(busy * (100 / self.util - 1))
    def handle(self, m):
        t0 = time.time(); c = m["cmd"]
        if self.B.torch and str(self.B.device).startswith("cuda"): torch.cuda.reset_peak_memory_stats()   # VRAM is measured as this command's peak (the batch's tensors are freed when it ends)
        if c == "init": r = self.init(m)
        elif c == "exercise": r = {"worlds": exercise_batch(self.B, m["worlds"], m["knows"], m.get("seed", 1))}
        elif c == "t_reset": self.tb = TBatch(self.B, m["levels"], m["moves"]); r = {"boards": self.tb.boards()}
        elif c == "t_step": self.tb.step(m["outputs"]); r = {"boards": self.tb.boards()}
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
        except Exception as e: r = {"error": repr(e)}
        r["id"] = m.get("id"); sys.stdout.write(json.dumps(r) + "\n"); sys.stdout.flush()
