"""Grid worlds in 2 or 3 dimensions: the 2D labyrinth (messages 38, 55), the 3D labyrinth ("forma solutiei intr-un labirint 3d",
2026-11-03-USER-14M) and the 2D labyrinth whose doors open and close by themselves (message 38.5: "lumi 2D cu reguli schimbatoare").
The full map belongs to the world and to the teacher only. The organism gets: its local window (3x3 or 3x3x3), whether its own
action moved it, and the goal's position relative to itself (message 38 table)."""
import hashlib
from collections import deque
import numpy as np


class GridMaze:
    def __init__(self, seed, n, dims=2, braid=0.3, dynamic=False):
        if n < 5 or n % 2 == 0:
            raise ValueError('odd size >= 5')
        self.seed, self.n, self.dims, self.dynamic = seed, n, dims, dynamic
        self.N = n ** dims
        r = np.random.default_rng(seed)
        self.rng = r
        self.steps_ = [s for d in range(dims) for s in (-(n ** d), n ** d)]  # action k: axis k//2, sign
        wall = np.ones(self.N, np.uint8)
        start0 = self.idx([1] * dims); wall[start0] = 0; st = [start0]
        while st:
            i = st[-1]; c = self.coord(i); moved = False
            for k in r.permutation(2 * dims):
                ax, sg = k // 2, (1 if k % 2 else -1)
                c2 = list(c); c2[ax] += 2 * sg
                if min(c2) < 1 or max(c2) > n - 2: continue
                j = self.idx(c2)
                if not wall[j]: continue
                c1 = list(c); c1[ax] += sg
                wall[self.idx(c1)] = 0; wall[j] = 0; st.append(j); moved = True; break
            if not moved: st.pop()
        # several valid routes (message 38: a valid route is not penalised for differing from the teacher's)
        for i in range(self.N):
            c = self.coord(i)
            if not wall[i] or min(c) < 1 or max(c) > n - 2: continue
            if r.random() < braid:
                for ax in range(dims):
                    a = list(c); b = list(c); a[ax] -= 1; b[ax] += 1
                    if not wall[self.idx(a)] and not wall[self.idx(b)]:
                        wall[i] = 0; break
        self.wall = wall
        floor = np.flatnonzero(wall == 0)
        for _ in range(300):
            s, g = int(r.choice(floor)), int(r.choice(floor))
            if s != g and self.bfs(s)[g] >= n: break
        self.start, self.goal = s, g
        if dynamic:   # doors: cells between two rooms, which the world opens/closes by itself
            self.doors = [i for i in range(self.N) if 0 < min(self.coord(i)) and max(self.coord(i)) < n - 1 and sum(self.coord(i)) % 2 == 1]

    def coord(self, i):
        return [(i // self.n ** d) % self.n for d in range(self.dims)]

    def idx(self, c):
        return sum(int(c[d]) * self.n ** d for d in range(self.dims))

    def neighbours(self, i):
        c = self.coord(i); out = []
        for k in range(2 * self.dims):
            ax, sg = k // 2, (1 if k % 2 else -1)
            v = c[ax] + sg
            out.append(i + sg * self.n ** ax if 0 <= v < self.n else -1)
        return out

    def bfs(self, src, wall=None):
        wall = self.wall if wall is None else wall
        d = np.full(self.N, 10 ** 9, np.int64); d[src] = 0; q = deque([src])
        while q:
            i = q.popleft()
            for j in self.neighbours(i):
                if j >= 0 and not wall[j] and d[j] > d[i] + 1:
                    d[j] = d[i] + 1; q.append(j)
        return d

    def teacher(self, frm):
        """Every cell on SOME shortest route to the goal: all valid optimal routes, not one."""
        a = self.bfs(frm); b = self.bfs(self.goal); D = a[self.goal]
        return ((a + b == D) & (self.wall == 0)).astype(np.float32), int(D)

    def observe(self, pos):
        c = self.coord(pos); patch = {}
        for off in np.ndindex(*([3] * self.dims)):
            cc = [c[d] + off[d] - 1 for d in range(self.dims)]
            if min(cc) < 0 or max(cc) >= self.n: continue
            j = self.idx(cc); patch[j] = int(self.wall[j])
        g = self.coord(self.goal)
        return patch, [g[d] - c[d] for d in range(self.dims)]

    def step(self, pos, a):
        j = self.neighbours(pos)[a]
        if j < 0 or self.wall[j]: return pos, False
        return j, True

    def tick(self, pos):
        """C3 / A10: the world changes by itself, independently of the organism."""
        if not self.dynamic or self.rng.random() > 0.35: return None
        i = int(self.rng.choice(self.doors))
        if i in (pos, self.goal): return None
        self.wall[i] ^= 1
        if self.bfs(pos)[self.goal] >= 10 ** 9:
            self.wall[i] ^= 1; return None
        return i

    def content_hash(self):
        h = hashlib.sha256(); h.update(f'grid{self.dims}|{self.n}|{self.dynamic}|{self.start}|{self.goal}|'.encode()); h.update(self.wall.tobytes())
        return h.hexdigest()


class GridMind:
    """The organism's perspective of a grid world: what it saw (free / wall / never seen), where it is (path integration),
    and the goal hint. Laid into the abstract network as instance nodes, each tied to its labels."""
    def __init__(self, w, family):
        self.w, self.family = w, family
        self.n, self.dims, self.N = w.n, w.dims, w.N
        self.cells = np.full(self.N, -1, np.int8)     # -1 never seen, 0 free, 1 wall
        self.visits = np.zeros(self.N, np.int32)
        self.pos = w.start; self.external = 0
        patch, rel = w.observe(self.pos)
        c = w.coord(self.pos)
        self.goal = w.idx([c[d] + rel[d] for d in range(self.dims)])
        self.absorb(patch)
        nb = [w.neighbours(i) for i in range(self.N)]
        s = [i for i in range(self.N) for j in nb[i] if j >= 0]; d = [j for i in range(self.N) for j in nb[i] if j >= 0]
        self.edges = (np.asarray(d, np.int64), np.asarray(s, np.int64))
        self.nb = nb
        self.K = max(8, int(round(2.2 * self.n * (1.0 if self.dims == 2 else 1.3))))
        C = np.array([w.coord(i) for i in range(self.N)], np.float32)
        self.C = C

    def absorb(self, patch):
        for j, v in patch.items():
            if self.cells[j] != -1 and self.cells[j] != v: self.external += 1   # A10: changed by the world, not by me
            self.cells[j] = v
        self.visits[self.pos] += 1

    def graph(self):
        n, F = self.n, self.dims
        lab = [[f'{self.family}/' + ('unknown' if v < 0 else 'wall' if v == 1 else 'free')] for v in self.cells]
        lab[self.pos].append(f'{self.family}/self'); lab[self.goal].append(f'{self.family}/goal')
        C = self.C; s = C[self.pos]; g = C[self.goal]
        X = np.concatenate([(g - C) / n, (s - C) / n, np.cos(np.pi * (C - s))], 1)
        return dict(n=self.N, X=X.astype(np.float32), labels=lab, family=self.family, edges=self.edges, K=self.K)

    def mask(self):
        return (self.cells != 1).astype(np.float32)

    def self_index(self):
        return self.pos

    def options(self):
        out = []
        for a, j in enumerate(self.nb[self.pos]):
            if j < 0: continue
            out.append((a, j, self.cells[j] != 1))
        return out

    def move(self, a, moved, newpos):
        self.pos = newpos

    def done(self):
        return self.pos == self.goal

    def classic(self):
        """Classic navigation with the same limited observations: shortest routes on the known map, unknown assumed free."""
        wall = (self.cells == 1).astype(np.uint8)
        a = self.w.bfs(self.pos, wall); b = self.w.bfs(self.goal, wall); D = a[self.goal]
        return ((a + b == D) & (wall == 0)).astype(np.float32)

    def line(self):
        """No-learning reference: a straight band towards the goal."""
        C = self.C; s = C[self.pos]; g = C[self.goal]; v = g - s; L2 = max(1e-9, float(v @ v))
        t = np.clip(((C - s) @ v) / L2, 0, 1)[:, None]; d = np.linalg.norm(C - (s + t * v), axis=1)
        p = np.exp(-d * d / 2); p[self.cells == 1] = 0; return p.astype(np.float32)

    def decode(self, p):
        """The visible line: follow the shape greedily from where I stand (no revisits)."""
        line = [self.pos]; seen = {self.pos}; at = self.pos
        for _ in range(self.N):
            if at == self.goal: break
            best, bv = -1, -1.0
            for j in self.nb[at]:
                if j < 0 or j in seen or self.cells[j] == 1: continue
                if p[j] > bv: bv, best = p[j], j
            if best < 0: break
            line.append(best); seen.add(best); at = best
        return line

    def target(self):
        y, D = self.w.teacher(self.pos)
        yn = np.zeros(self.N, np.float32); d = self.w.bfs(self.goal)
        for j in self.nb[self.pos]:
            if j >= 0 and not self.w.wall[j] and d[j] == d[self.pos] - 1: yn[j] = 1
        return y, yn, D

    def valid(self, line):
        return line[-1] == self.goal and all(not self.w.wall[i] for i in line)


def make_family(name):
    if name == 'maze2d':
        return lambda seed, size=None: GridMaze(seed, size or 7, 2)
    if name == 'maze3d':
        return lambda seed, size=None: GridMaze(seed, size or 5, 3)
    if name == 'dynamic':
        return lambda seed, size=None: GridMaze(seed, size or 9, 2, dynamic=True)
    raise KeyError(name)


def _act(self, a):
    """Do the action in the real world; return (moved, resistance, world_changed). Resistance: imagined consequence vs real one."""
    j = self.nb[self.pos][a]
    will = j >= 0 and self.cells[j] != 1
    newpos, moved = self.w.step(self.pos, a)
    self.pos = newpos
    ch = self.w.tick(self.pos)
    self.absorb(self.w.observe(self.pos)[0])
    return moved, will != moved, ch is not None


GridMind.act = _act
