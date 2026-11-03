"""Worlds that are not mazes (messages 38.5, 49, 53, 55; 2026-11-03-USER-14M: "fie este pus in alt joc, sa controleze o masina"):
the same abstract network, a different perspective. The organism's internal map is a graph of states built by IMAGINATION:
it learns each action's rule from the consequences it has seen (message 53: "Daca fac actiunea a in starea s, ce se schimba?")
and rolls the learned rules forward to picture states it never visited. Only imagined states enter the abstract network.

  graph    states 0..m-1, 4 hidden operators (x+a, x-a, x*b, x xor c, mod m), forbidden states (constraints)
  sat      a small 3-SAT with a planted solution; actions flip one variable; the world shows violated clauses here and one flip away
  symbols  strings over 3 letters rewritten by hidden rules (applied at the leftmost occurrence); reach the target string
  car      a car on a track: accelerate / brake / turn left / turn right / coast; it moves its speed in cells per step"""
import hashlib
from collections import deque
from itertools import product
import numpy as np


# ---------------------------------------------------------------------------------------------------------------------
class StateWorld:
    """Explicit hidden transition table nxt[s, a] (-1 = not allowed). Goals: a set of states."""
    def finish(self):
        N, A = self.nxt.shape
        self.N, self.A = N, A
        self.rev = [[] for _ in range(N)]
        for s in range(N):
            for a in range(A):
                t = int(self.nxt[s, a])
                if t >= 0 and t != s: self.rev[t].append(s)
        self.dgoal = self._bfs(list(self.goals), self.rev)

    def _bfs(self, srcs, adj):
        d = np.full(self.N, 10 ** 9, np.int64); q = deque()
        for s in srcs: d[s] = 0; q.append(s)
        while q:
            s = q.popleft()
            for t in adj[s]:
                if d[t] > d[s] + 1: d[t] = d[s] + 1; q.append(t)
        return d

    def dfrom(self, s):
        fwd = lambda u: [int(t) for t in self.nxt[u] if t >= 0 and t != u]
        d = np.full(self.N, 10 ** 9, np.int64); d[s] = 0; q = deque([s])
        while q:
            u = q.popleft()
            for t in fwd(u):
                if d[t] > d[u] + 1: d[t] = d[u] + 1; q.append(t)
        return d

    def teacher(self, s):
        """Every state on SOME shortest route from s to the nearest goals."""
        a = self.dfrom(s); best = int(self.dgoal[s])
        return ((a + self.dgoal) == best).astype(np.float32), best

    def content_hash(self):
        h = hashlib.sha256(); h.update(f'{self.family}|{self.start}|{sorted(self.goals)}|'.encode()); h.update(self.nxt.tobytes())
        return h.hexdigest()


class RuleLearner:
    """A8 / message 53: learns what each action does from consequences. Hypotheses are eliminated by evidence."""
    def __init__(self, A, hyps):
        self.hyp = [list(hyps) for _ in range(A)]; self.seen = [0] * A

    def observe(self, s, a, t):
        self.hyp[a] = [h for h in self.hyp[a] if h(s) == t]; self.seen[a] += 1

    def predict(self, s, a):
        if not self.seen[a] or not self.hyp[a]: return None
        return self.hyp[a][0](s)


class StateMind:
    """Perspective over a state world: known / blocked / never-seen states, learned rules, imagined reachable states."""
    def __init__(self, w, family, rules):
        self.w, self.family, self.rules = w, family, rules
        self.N = w.N; self.A = w.A
        self.status = np.full(w.N, -1, np.int8); self.visits = np.zeros(w.N, np.int32)
        self.pos = w.start; self.goal_known = w.goal_hint
        self.extra = {}
        self.absorb()
        self._img = None

    def absorb(self):
        """Observation at the current state: for each action, the state it leads to and whether entering is allowed."""
        s = self.pos; w = self.w
        self.status[s] = 1; self.visits[s] += 1
        for a in range(self.A):
            t = int(w.nxt[s, a]); to = w.raw_next(s, a)
            if to is not None:
                self.rules.observe(s, a, to)
                if self.status[to] != 1: self.status[to] = 1 if t >= 0 else 0
        w.observe_extra(self, s)
        self._img = None

    def imagine(self):
        """The states reachable from here by the learned rules (never the true graph)."""
        if self._img is not None: return self._img
        seen = {self.pos: 0}; order = [self.pos]; E = set(); k = 0
        while k < len(order) and len(order) < 400:
            s = order[k]; k += 1
            if self.status[s] == 0: continue
            for a in range(self.A):
                t = self.rules.predict(s, a)
                if t is None or t == s or t < 0 or t >= self.N: continue
                if t not in seen: seen[t] = len(order); order.append(t)
                E.add((seen[s], seen[t])); E.add((seen[t], seen[s]))
        E = np.array(sorted(E), np.int64).reshape(-1, 2)
        self._img = dict(order=order, index=seen, edges=(E[:, 0], E[:, 1]),
                         adj=[[] for _ in order])
        for u, v in E: self._img['adj'][u].append(int(v))
        return self._img

    @property
    def n(self):
        return len(self.imagine()['order'])

    def self_index(self):
        return 0

    def graph(self):
        g = self.imagine(); order = g['order']
        lab = []
        for s in order:
            st = self.status[s]
            L = [f'{self.family}/' + ('known' if st == 1 else 'blocked' if st == 0 else 'unknown')]
            if s == self.pos: L.append(f'{self.family}/self')
            if s == self.goal_known: L.append(f'{self.family}/goal')
            L += self.w.labels_of(self, s)
            lab.append(L)
        X = np.array([self.w.features(self, s) for s in order], np.float32).reshape(len(order), -1)
        return dict(n=len(order), X=X, labels=lab, family=self.family, edges=g['edges'], K=14)

    def mask(self):
        g = self.imagine(); return np.array([0.0 if self.status[s] == 0 else 1.0 for s in g['order']], np.float32)

    def options(self):
        g = self.imagine(); out = []
        for a in range(self.A):
            t = self.rules.predict(self.pos, a)
            ok = t is not None and t != self.pos and 0 <= t < self.N and self.status[t] != 0 and t in g['index']
            out.append((a, g['index'][t] if ok else 0, ok))
        return out

    def act(self, a):
        """Do the action; resistance = the imagined consequence differs from the real one (messages 48-49)."""
        pred = self.rules.predict(self.pos, a)
        t = int(self.w.nxt[self.pos, a]); moved = t >= 0 and t != self.pos
        resist = False
        if pred is not None:
            exp_move = pred != self.pos and 0 <= pred < self.N and self.status[pred] != 0
            resist = (exp_move != moved) or (moved and pred != t)
        if moved: self.pos = t
        self.absorb()
        return moved, bool(resist), False

    def done(self):
        return self.pos in self.w.goals

    def target(self):
        g = self.imagine(); y_full, D = self.w.teacher(self.pos)
        y = y_full[g['order']]
        yn = np.zeros(len(g['order']), np.float32); dg = self.w.dgoal
        for a in range(self.A):
            t = int(self.w.nxt[self.pos, a])
            if t >= 0 and t != self.pos and dg[t] == dg[self.pos] - 1 and t in g['index']: yn[g['index'][t]] = 1
        return y, yn, D

    def decode(self, p):
        g = self.imagine(); at = 0; line = [0]; seen = {0}
        for _ in range(len(g['order'])):
            if self.w.is_goal_known(self, g['order'][at]): break
            best, bv = -1, -1.0
            for j in g['adj'][at]:
                if j in seen or self.status[g['order'][j]] == 0: continue
                if p[j] > bv: bv, best = p[j], j
            if best < 0: break
            line.append(best); seen.add(best); at = best
        return line

    def valid(self, line):
        g = self.imagine(); o = g['order']
        if o[line[-1]] not in self.w.goals: return False
        for u, v in zip(line, line[1:]):
            if o[v] not in [int(t) for t in self.w.nxt[o[u]] if t >= 0]: return False
        return True

    def classic(self):
        """Classic search with the same perspective: shortest route in the imagined graph to the known goal
        (sat: to the known state with fewest violated clauses)."""
        g = self.imagine(); o = g['order']; n = len(o)
        d = [10 ** 9] * n; prev = [-1] * n; d[0] = 0; q = deque([0]); end = -1
        while q:
            u = q.popleft()
            if self.w.is_goal_known(self, o[u]): end = u; break
            for v in g['adj'][u]:
                if self.status[o[v]] == 0 or d[v] < 10 ** 9: continue
                d[v] = d[u] + 1; prev[v] = u; q.append(v)
        if end < 0:
            end = self.w.classic_fallback(self, d)
        p = np.zeros(n, np.float32)
        while end >= 0: p[end] = 1; end = prev[end]
        return p

    def line(self):
        return None

    def view(self):
        g = self.imagine(); w = self.w
        v = dict(order=[int(s) for s in g['order']], status=[int(self.status[s]) for s in g['order']],
                 edges=[[int(a), int(b)] for a, b in zip(*g['edges']) if a < b])
        if w.family == 'sat': v['viol'] = [int(w.viol[s]) for s in g['order']]
        if w.family == 'symbols': v['strings'] = [w.strings[s] for s in g['order']]; v['goal'] = w.strings[self.goal_known]
        if w.family == 'car': v['cells'] = self.extra['cells'].tolist()
        return v


# ---------------------------------------------------------------------------------------------------------------------
OPS = [lambda c, m: (f'+{c}', lambda x: (x + c) % m), lambda c, m: (f'-{c}', lambda x: (x - c) % m),
       lambda c, m: (f'x{c}', lambda x: (x * c) % m), lambda c, m: (f'xor {c}', lambda x: (x ^ c) % m)]


def arith_hyps(m):
    return [OPS[f](c, m)[1] for f in range(4) for c in range(1, m)]


class GraphWorld(StateWorld):
    family = 'graph'
    def __init__(self, seed, m=48):
        r = np.random.default_rng(seed)
        for _ in range(200):
            ops = [OPS[k](int(2 + r.integers(3)) if k == 2 else int(1 + r.integers(7)), m) for k in range(4)]
            forbid = r.random(m) < 0.15
            start, goal = int(r.integers(m)), int(r.integers(m))
            if forbid[start] or forbid[goal] or start == goal: continue
            nxt = np.array([[(-1 if forbid[f(s)] else f(s)) for _, f in ops] for s in range(m)], np.int64)
            self.ops = ops; self.forbid = forbid; self.start = start; self.goals = {goal}; self.goal_hint = goal; self.nxt = nxt; self.m = m
            self.finish()
            d = self.dfrom(start)[goal]
            if 3 <= d < 10 ** 9: return
        raise RuntimeError('graph world generator failed')

    def raw_next(self, s, a): return self.ops[a][1](s)
    def observe_extra(self, mind, s): pass
    def labels_of(self, mind, s): return []
    def features(self, mind, s):
        m = self.m; g = mind.goal_known
        return [(g - s) / m, abs(g - s) / m, (mind.pos - s) / m]
    def is_goal_known(self, mind, s): return s == mind.goal_known
    def classic_fallback(self, mind, d): return -1


class SatWorld(StateWorld):
    family = 'sat'
    def __init__(self, seed, v=7):
        r = np.random.default_rng(seed); N = 1 << v; sol = int(r.integers(N)); cl = []
        while len(cl) < 4 * v:
            vars_ = [int(x) for x in r.permutation(v)[:3]]; signs = [bool(r.random() < .5) for _ in vars_]
            if any(((sol >> x) & 1 == 1) == sg for x, sg in zip(vars_, signs)): cl.append((vars_, signs))
        viol = np.array([sum(1 for vs, sg in cl if not any(((s >> x) & 1 == 1) == g for x, g in zip(vs, sg))) for s in range(N)], np.int64)
        goals = {s for s in range(N) if viol[s] == 0}
        pop = lambda x: bin(x).count('1')
        while True:
            start = int(r.integers(N))
            if viol[start] and min(pop(start ^ g) for g in goals) >= 3: break
        self.v, self.clauses, self.viol, self.start, self.goals, self.goal_hint = v, cl, viol, start, goals, -1
        self.nxt = np.array([[s ^ (1 << a) for a in range(v)] for s in range(N)], np.int64)
        self.finish()

    def raw_next(self, s, a): return s ^ (1 << a)
    def observe_extra(self, mind, s):
        vio = mind.extra.setdefault('viol', np.full(self.N, -1, np.int64))
        vio[s] = self.viol[s]
        for a in range(self.v):
            t = s ^ (1 << a); vio[t] = self.viol[t]
            if self.viol[t] == 0 and mind.goal_known < 0: mind.goal_known = t
        if self.viol[s] == 0: mind.goal_known = s
    def labels_of(self, mind, s): return []
    def features(self, mind, s):
        k = mind.extra['viol'][s]
        return [k / len(self.clauses) if k >= 0 else 0.0, 1.0 if k >= 0 else 0.0, bin(s ^ mind.pos).count('1') / self.v]
    def is_goal_known(self, mind, s): return mind.extra['viol'][s] == 0
    def classic_fallback(self, mind, d):
        g = mind.imagine(); o = g['order']; vio = mind.extra['viol']; best, end = 10 ** 9, -1
        for i, s in enumerate(o):
            if i and 0 <= vio[s] < best and d[i] < 10 ** 9: best, end = vio[s], i
        return end


def sat_hyps(v):
    return [(lambda c: (lambda x: x ^ c))(1 << k) for k in range(v)] + [(lambda c: (lambda x: x ^ c))(c) for c in range(1, 1 << v) if bin(c).count('1') > 1][:32]


# ---------------------------------------------------------------------------------------------------------------------
class SymbolWorld(StateWorld):
    """Symbol game: strings over 'abc' (length 2..6). Hidden rules: action k rewrites pattern P_k -> Q_k at its leftmost occurrence."""
    family = 'symbols'
    def __init__(self, seed, maxlen=6):
        r = np.random.default_rng(seed); al = 'abc'
        for _ in range(500):
            rules = []
            for k in range(4):
                P = ''.join(r.choice(list(al), int(1 + r.integers(2)))); Q = ''.join(r.choice(list(al), int(1 + r.integers(2))))
                if P != Q: rules.append((P, Q))
            if len(rules) < 4: continue
            s0 = ''.join(r.choice(list(al), int(3 + r.integers(2))))
            states = {s0: 0}; order = [s0]; k = 0
            while k < len(order) and len(order) < 240:
                s = order[k]; k += 1
                for P, Q in rules:
                    t = self.apply(s, P, Q)
                    if t is not None and 2 <= len(t) <= maxlen and t not in states: states[t] = len(order); order.append(t)
            if len(order) < 20: continue
            nxt = np.full((len(order), 4), -1, np.int64)
            for i, s in enumerate(order):
                for a, (P, Q) in enumerate(rules):
                    t = self.apply(s, P, Q)
                    nxt[i, a] = states.get(t, -1) if t is not None else i
            self.rules, self.strings, self.index, self.nxt, self.start = rules, order, states, nxt, 0
            self.N = len(order); far = self.dfrom(0); cand = [i for i in range(len(order)) if 4 <= far[i] < 10 ** 9]
            if not cand: continue
            goal = int(r.choice(cand)); self.goals = {goal}; self.goal_hint = goal; self.finish(); return
        raise RuntimeError('symbol world generator failed')

    @staticmethod
    def apply(s, P, Q):
        i = s.find(P)
        return None if i < 0 else s[:i] + Q + s[i + len(P):]

    def raw_next(self, s, a):
        t = int(self.nxt[s, a]); return t if t >= 0 else None
    def observe_extra(self, mind, s): pass
    def labels_of(self, mind, s): return []
    def features(self, mind, s):
        a, b = self.strings[s], self.strings[mind.goal_known]
        same = sum(1 for x, y in zip(a, b) if x == y)
        return [same / 6, (len(b) - len(a)) / 6, sum(min(a.count(c), b.count(c)) for c in 'abc') / 6]
    def is_goal_known(self, mind, s): return s == mind.goal_known
    def classic_fallback(self, mind, d): return -1


class RewriteLearner:
    """Learns each symbol rule from consequences: candidate (P, Q) windows around the observed change, kept only while consistent."""
    def __init__(self, w):
        self.w = w; self.cand = [None] * 4; self.noop = [set() for _ in range(4)]

    def observe(self, s, a, t):
        S, T = self.w.strings[s], self.w.strings[t] if t is not None and t >= 0 else None
        if T is None or T == S:
            self.noop[a].add(s)
            if self.cand[a] is not None: self.cand[a] = [c for c in self.cand[a] if SymbolWorld.apply(S, *c) in (None, S)]
            return
        if self.cand[a] is None:
            i = 0
            while i < min(len(S), len(T)) and S[i] == T[i]: i += 1
            j = 0
            while j < min(len(S), len(T)) - i and S[-1 - j] == T[-1 - j]: j += 1
            C = set()
            for l in range(0, i + 1):
                for rr in range(0, j + 1):
                    P = S[i - l:len(S) - j + rr]; Q = T[i - l:len(T) - j + rr]
                    if 1 <= len(P) <= 3 and P != Q: C.add((P, Q))
            self.cand[a] = [c for c in sorted(C, key=lambda c: (len(c[0]) + len(c[1]), c)) if SymbolWorld.apply(S, *c) == T]   # simplest explanation first
        else:
            self.cand[a] = [c for c in self.cand[a] if SymbolWorld.apply(S, *c) == T]

    def predict(self, s, a):
        c = self.cand[a]
        if not c: return None
        t = SymbolWorld.apply(self.w.strings[s], *c[0])
        if t is None: return s
        return self.w.index.get(t, None)


# ---------------------------------------------------------------------------------------------------------------------
class CarWorld(StateWorld):
    """A car on a 2D track (7x7 or 9x9): state = cell, heading (4), speed (0..2). Actions: accelerate, brake, turn left,
    turn right, coast. It then moves `speed` cells along its heading; hitting a wall stops it before the wall at speed 0.
    Goal: stop (speed 0) on the target cell."""
    family = 'car'
    DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]
    def __init__(self, seed, n=7):
        r = np.random.default_rng(seed)
        for _ in range(200):
            wall = np.zeros(n * n, np.uint8)
            for i in range(n * n):
                x, y = i % n, i // n
                if x in (0, n - 1) or y in (0, n - 1) or r.random() < 0.18: wall[i] = 1
            free = np.flatnonzero(wall == 0)
            if len(free) < 8: continue
            sc, gc = int(r.choice(free)), int(r.choice(free))
            if sc == gc: continue
            self.n, self.wall = n, wall
            N = n * n * 12
            nxt = np.full((N, 5), -1, np.int64)
            for s in range(N):
                c, h, v = s // 12, (s % 12) // 3, s % 3
                if wall[c]: continue
                for a in range(5):
                    nxt[s, a] = self.physics(c, h, v, a)
            self.nxt = nxt; self.start = sc * 12 + int(r.integers(4)) * 3; self.goal_cell = gc
            self.goals = {gc * 12 + h * 3 for h in range(4)}; self.goal_hint = -1
            self.finish()
            if 4 <= self.dgoal[self.start] < 10 ** 9: return
        raise RuntimeError('car world generator failed')

    def physics(self, c, h, v, a):
        n = self.n
        if a == 0: v = min(2, v + 1)
        elif a == 1: v = max(0, v - 1)
        elif a == 2: h = (h + 3) % 4
        elif a == 3: h = (h + 1) % 4
        x, y = c % n, c // n; dx, dy = self.DIRS[h]
        for _ in range(v):
            X, Y = x + dx, y + dy
            if self.wall[Y * n + X]: v = 0; break
            x, y = X, Y
        return (y * n + x) * 12 + h * 3 + v

    def raw_next(self, s, a): return int(self.nxt[s, a]) if self.nxt[s, a] >= 0 else None
    def observe_extra(self, mind, s):
        """Local 3x3 window of the track around the car (like the maze)."""
        n = self.n; c = s // 12; x, y = c % n, c // n
        seen = mind.extra.setdefault('cells', np.full(n * n, -1, np.int8))
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                X, Y = x + dx, y + dy
                if 0 <= X < n and 0 <= Y < n: seen[Y * n + X] = self.wall[Y * n + X]
    def labels_of(self, mind, s):
        c = s // 12; st = mind.extra['cells'][c]
        L = [f'car/cell-' + ('unknown' if st < 0 else 'wall' if st else 'free'), f'car/speed{s % 3}', f'car/heading{(s % 12) // 3}']
        if c == self.goal_cell and s % 3 == 0: L.append('car/goal')   # the goal hint: the target cell, stopped
        return L
    def features(self, mind, s):
        n = self.n; c = s // 12; x, y = c % n, c // n; gx, gy = self.goal_cell % n, self.goal_cell // n
        pc = mind.pos // 12; px, py = pc % n, pc // n
        return [(gx - x) / n, (gy - y) / n, (px - x) / n, (py - y) / n, (s % 3) / 2]
    def is_goal_known(self, mind, s): return s // 12 == self.goal_cell and s % 3 == 0
    def classic_fallback(self, mind, d): return -1


class CarRules:
    """The car's controls learned from consequences: for each action, hypotheses (change of heading, change of speed) are
    eliminated by what really happened. The movement law (advance `speed` cells along the heading, stop at a wall) is the
    world's physics as the organism imagines it, with the walls it has seen; unseen cells are assumed free."""
    def __init__(self, w):
        self.w = w; self.hyp = [[(dh, dv) for dh in range(4) for dv in (-1, 0, 1)] for _ in range(5)]; self.seen = [0] * 5

    def roll(self, s, a, hy, cells):
        w = self.w; n = w.n; c = s // 12; h, v = (s % 12) // 3, s % 3
        h = (h + hy[0]) % 4; v = max(0, min(2, v + hy[1]))
        x, y = c % n, c // n; dx, dy = w.DIRS[h]
        for _ in range(v):
            X, Y = x + dx, y + dy
            if not (0 <= X < n and 0 <= Y < n) or cells[Y * n + X] == 1: v = 0; break
            x, y = X, Y
        return (y * n + x) * 12 + h * 3 + v

    def observe(self, s, a, t):
        if t is None: return
        truth = self.w.wall.astype(np.int8)   # the consequence itself shows where it stopped: judged with the real outcome
        keep = [hy for hy in self.hyp[a] if self.roll(s, a, hy, truth) == t]
        self.hyp[a] = keep or [(dh, dv) for dh in range(4) for dv in (-1, 0, 1)]; self.seen[a] += 1

    def predict(self, s, a):
        """While several hypotheses still explain everything seen, imagine the one that changes something (curiosity)."""
        if not self.seen[a]: return None
        cells = self.mind.extra['cells']; first = None
        for hy in self.hyp[a]:
            t = self.roll(s, a, hy, cells)
            if first is None: first = t
            if t != s: return t
        return first


def make_mind(fam, w):
    if fam == 'graph': return StateMind(w, 'graph', RuleLearner(4, arith_hyps(w.m)))
    if fam == 'sat': return StateMind(w, 'sat', RuleLearner(w.v, sat_hyps(w.v)))
    if fam == 'symbols': return StateMind(w, 'symbols', RewriteLearner(w))
    if fam == 'car':
        rules = CarRules(w); m = StateMind.__new__(StateMind); rules.mind = m
        m.w, m.family, m.rules = w, 'car', rules; m.N, m.A = w.N, w.A
        m.status = np.full(w.N, -1, np.int8); m.visits = np.zeros(w.N, np.int32); m.pos = w.start; m.goal_known = -1; m.extra = {}
        m._img = None; w.observe_extra(m, m.pos); m.absorb(); return m
    raise KeyError(fam)
