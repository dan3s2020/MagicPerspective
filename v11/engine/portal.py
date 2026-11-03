"""The abstract network of V11: ONE persistent graph + ONE learned local rule, shared by every world.

Verbatim sources (exact spans in verbatim/implementation-mirror.json):
- "un singur abstract network care sa controleze fie forma solutiei intr-un labirint 3d, fie ... text ..., fie ... o masina"
- "tot exercitiul trebuie sa se mapeze random in graf, prin labels ... graful e si lumea, e si forma solutie"
- "GRAFUL SE FORMEAZA IN TRANING ... SA LASAM GRAFURILE ALEA SA SE CONSTRUIASCA IN CONTINUARE ... UNELE SE UNESC INTRE ELE, ALTELE NU"
- message 38: h = E(o,a); z = F(h,g); (Gamma, U) = D(z); "nu programam in latent ce inseamna un drum corect"
- message 45: "organul relatiilor: ordinea, asemanarile, diferentele si conexiunile dintre slice-uri"

Structure
- LABEL NODES: every kind of thing any world ever showed (a free cell, a wall, an unknown place, the goal, a clause,
  a character, a voter, an action ...) is a node of the persistent graph. A label node is born the first time a world uses
  that label, with a RANDOM vector (the network receives no meaning for it), and is never deleted. Its vector is learned.
- INSTANCE NODES: the current exercise, as the organism perceives it (never the hidden truth), is laid into the graph:
  each place/state/variable/character it knows or imagines is a node linked to its label nodes and to its neighbours.
- The same local rule runs on all of it for K rounds; after the rounds every instance node says p (part of the solution's
  shape), U (how unsure) and q (where to go next). The activated set, how strongly and in what order it lights up, is the
  shape of the solution; the world checks it.
"""
import json
import numpy as np

from .backend import NumpyBackend


class Brain:
    SCHEMA = 'v11-portal-brain'

    def __init__(self, C=16, F=10, seed=7, lr=0.003, backend=None):
        self.be = backend or NumpyBackend()
        self.C, self.F, self.lr, self.seed = C, F, lr, seed
        self.rng = np.random.default_rng(seed)
        self.labels = {}           # label text -> label node id (persistent, only grows)
        self.links = {}            # 'i-j' -> how often two label nodes were laid on the same instance node (edges of the persistent graph)
        self.label_meta = []       # per label node: {'label', 'family', 'born': exercises seen when born, 'uses'}
        self.t = 0; self.updates = 0; self.pending = 0.0; self.exercises = 0
        Cin = C + F
        be, r = self.be, self.rng
        self.P = {
            'L': be.randn(r, (0, C), 0.5),
            'W0': be.randn(r, (Cin, C), np.sqrt(1.0 / Cin)), 'b0': be.zeros((C,)),
            'W': be.randn(r, (3 * C + Cin, C), np.sqrt(1.0 / (3 * C + Cin))), 'b': be.zeros((C,)),
            'wp': be.randn(r, (C + Cin,), 0.3), 'bp': be.zeros((1,)),
            'wu': be.randn(r, (C + Cin,), 0.3), 'bu': be.zeros((1,)),
            'wq': be.randn(r, (C + Cin,), 0.3), 'bq': be.zeros((1,)),
        }
        self._opt_init()

    def _opt_init(self):
        be = self.be
        self.G = {k: be.zeros(tuple(v.shape)) for k, v in self.P.items()}
        self.M = {k: be.zeros(tuple(v.shape)) for k, v in self.P.items()}
        self.V = {k: be.zeros(tuple(v.shape)) for k, v in self.P.items()}

    # ---- the persistent graph of labels -------------------------------------------------------------------------
    def label_id(self, label, family):
        """A label is mapped into the graph the first time it is used: new node, random vector (no meaning given)."""
        i = self.labels.get(label)
        if i is not None:
            self.label_meta[i]['uses'] += 1
            return i
        i = len(self.labels); self.labels[label] = i
        self.label_meta.append({'label': label, 'family': family, 'born': self.exercises, 'uses': 1})
        be = self.be
        row = be.randn(self.rng, (1, self.C), 0.5)
        for D in (self.P, self.G, self.M, self.V):
            D['L'] = be.cat([D['L'], row if D is self.P else be.zeros((1, self.C))], axis=0)
        return i

    def label_vectors(self):
        return self.be.to_numpy(self.P['L'])

    # ---- one batched pass over several exercises at once (parallel unique worlds) --------------------------------
    def forward(self, G):
        """G: dict with N, X [N,F], ln, ll (node-label pairs), src, dst (messages src->dst), K [N] rounds per node, wid."""
        be, P, C = self.be, self.P, self.C
        N = G['N']
        X = be.asarray(G['X']); ln = be.asarray(G['ln'], 'i'); ll = be.asarray(G['ll'], 'i')
        src = be.asarray(G['src'], 'i'); dst = be.asarray(G['dst'], 'i')
        pd, ps, pl = be.plan(N, G['dst']), be.plan(N, G['src']), be.plan(N, G['ln'])
        deg = be.sadd(pd, be.full((len(G['src']), 1), 1.0))
        inv = 1.0 / be.clip(deg, 1.0, 1e9)
        Kn = np.asarray(G['K']); Kmax = int(Kn.max()) if len(Kn) else 0
        xl = be.sadd(pl, P['L'][ll]) if len(G['ll']) else be.zeros((N, C))
        x = be.cat([xl, X], 1)
        h = be.tanh(x @ P['W0'] + P['b0'])
        H = [h]; MX = []; U_ = []; ACT = []
        for r in range(Kmax):
            act = be.asarray((Kn > r).astype(np.float32)[:, None])
            hs = h[src]
            mean = be.sadd(pd, hs) * inv
            mx = be.smax(pd, hs)
            a = be.cat([h, mean, mx, x], 1)
            u = be.tanh(a @ P['W'] + P['b'])
            h = h + act * (0.5 * u - 0.5 * h)
            H.append(h); MX.append(mx); U_.append(u); ACT.append(act)
        z = be.cat([h, x], 1)
        p = be.sigmoid(z @ P['wp'] + P['bp'][0])
        U = be.sigmoid(z @ P['wu'] + P['bu'][0])
        q = be.sigmoid(z @ P['wq'] + P['bq'][0])
        cache = dict(N=N, x=x, z=z, H=H, MX=MX, U=U_, ACT=ACT, src=src, dst=dst, inv=inv, ln=ln, ll=ll, Kmax=Kmax, pd=pd, ps=ps, nL=P['L'].shape[0])
        return {'p': p, 'U': U, 'q': q, 'h': h, 'cache': cache}

    def backward(self, out, y, mask, ynext, wid, nworld, sw):
        """Teacher's exact numeric error on the whole shape (messages 13, 15, 36.4, 38.4).
        y: target shape per node (rows of worlds without the shape organ are zero-weighted via shape_on);
        mask: nodes scored; ynext: next correct step (decision); wid: world of each node; sw: weight per world.
        Every world counts the same, whatever its size."""
        be, P, C = self.be, self.P, self.C
        c = out['cache']; N = c['N']; p, U, q, z = out['p'], out['U'], out['q'], c['z']
        y = be.asarray(y['y']) if isinstance(y, dict) else be.asarray(y)
        shape_on = be.asarray(np.asarray(sw['shape'], np.float32))
        mask = be.asarray(mask); yn = be.asarray(ynext); widt = be.asarray(wid, 'i'); w_world = be.asarray(np.asarray(sw['w'], np.float32))
        cnt = be.scatter_add(nworld, widt, mask[:, None])[:, 0]
        cnt = be.clip(cnt, 1.0, 1e9)
        wn = mask * (w_world / cnt)[widt]
        eps = 1e-6
        pc = be.clip(p, eps, 1 - eps); qc = be.clip(q, eps, 1 - eps)
        ws = wn * shape_on[widt]
        loss = -be.sum(ws * (y * be.log(pc) + (1 - y) * be.log(1 - pc)))
        dzp = ws * (p - y)
        dzu = 2 * ws * (U - be.abs(p - y)) * U * (1 - U)
        pos = be.scatter_add(nworld, widt, (mask * yn)[:, None])[:, 0]
        wp1 = be.clip((cnt - pos) / be.clip(pos, 1.0, 1e9), 1.0, 20.0)
        wq_node = mask * (yn * wp1[widt] + (1 - yn))
        tw2 = be.clip(be.scatter_add(nworld, widt, wq_node[:, None])[:, 0], 1e-6, 1e9)
        wq_node = wq_node * (w_world / tw2)[widt]
        loss = loss - be.sum(wq_node * (yn * be.log(qc) + (1 - yn) * be.log(1 - qc)))
        dzq = wq_node * (q - yn)
        Gd = self.G
        Gd['wp'] += z.T @ dzp; Gd['bp'] += be.sum(dzp)
        Gd['wu'] += z.T @ dzu; Gd['bu'] += be.sum(dzu)
        Gd['wq'] += z.T @ dzq; Gd['bq'] += be.sum(dzq)
        gz = dzp[:, None] * P['wp'][None, :] + dzu[:, None] * P['wu'][None, :] + dzq[:, None] * P['wq'][None, :]
        gh = gz[:, :C]; gx = gz[:, C:]
        src, dst, inv, H = c['src'], c['dst'], c['inv'], c['H']
        x = c['x']
        for r in range(c['Kmax'] - 1, -1, -1):
            act, u, mx, h = c['ACT'][r], c['U'][r], c['MX'][r], H[r]
            dpre = 0.5 * act * gh * (1 - u * u)
            hs = h[src]; mean = be.sadd(c['pd'], hs) * inv
            a = be.cat([h, mean, mx, x], 1)
            Gd['W'] += a.T @ dpre; Gd['b'] += be.sum(dpre, 0)
            ga = dpre @ P['W'].T
            g_self, g_mean, g_max, g_x = ga[:, :C], ga[:, C:2 * C], ga[:, 2 * C:3 * C], ga[:, 3 * C:]
            gprev = gh * (1 - 0.5 * act) + g_self
            gprev = gprev + be.sadd(c['ps'], (g_mean * inv)[dst] + g_max[dst] * be.eq(hs, mx[dst]))
            gx = gx + g_x
            gh = gprev
        h0 = H[0]
        d0 = gh * (1 - h0 * h0)
        Gd['W0'] += x.T @ d0; Gd['b0'] += be.sum(d0, 0)
        gx = gx + d0 @ P['W0'].T
        if len(c['ll']):
            Gd['L'] += be.scatter_add(P['L'].shape[0], c['ll'], gx[:, :C][c['ln']])
        self.pending += float(np.asarray(be.to_numpy(be.sum(w_world))))
        return float(be.to_numpy(loss))

    def step(self):
        if self.pending <= 0:
            return
        be = self.be; self.t += 1
        b1, b2 = 0.9, 0.999; c1 = 1 - b1 ** self.t; c2 = 1 - b2 ** self.t; s = 1.0 / self.pending
        for k in self.P:
            g = be.clip(self.G[k] * s, -1.0, 1.0)
            self.M[k] = b1 * self.M[k] + (1 - b1) * g
            self.V[k] = b2 * self.V[k] + (1 - b2) * g * g
            self.P[k] = self.P[k] - self.lr * (self.M[k] / c1) / (be.sqrt(self.V[k] / c2) + 1e-8)
            self.G[k] = self.G[k] * 0
        self.pending = 0.0; self.updates += 1

    # ---- persistence ---------------------------------------------------------------------------------------------
    def save(self, path):
        be = self.be
        arrays = {f'P_{k}': be.to_numpy(v) for k, v in self.P.items()}
        arrays.update({f'M_{k}': be.to_numpy(v) for k, v in self.M.items()})
        arrays.update({f'V_{k}': be.to_numpy(v) for k, v in self.V.items()})
        meta = dict(schema=self.SCHEMA, C=self.C, F=self.F, lr=self.lr, seed=self.seed, t=self.t, updates=self.updates,
                    exercises=self.exercises, labels=self.labels, label_meta=self.label_meta, links=self.links)
        tmp = str(path) + '.tmp.npz'
        np.savez(tmp, meta=np.frombuffer(json.dumps(meta).encode(), np.uint8), **arrays)
        import os
        os.replace(tmp, str(path))

    @classmethod
    def load(cls, path, backend=None):
        d = np.load(str(path))
        meta = json.loads(bytes(d['meta']).decode())
        if meta.get('schema') != cls.SCHEMA:
            raise ValueError('incompatible brain file')
        b = cls(C=meta['C'], F=meta['F'], seed=meta['seed'], lr=meta['lr'], backend=backend)
        be = b.be
        for k in b.P:
            b.P[k] = be.asarray(d[f'P_{k}']); b.M[k] = be.asarray(d[f'M_{k}']); b.V[k] = be.asarray(d[f'V_{k}'])
            b.G[k] = be.zeros(tuple(b.P[k].shape))
        b.t, b.updates, b.exercises = meta['t'], meta['updates'], meta['exercises']
        b.labels = meta['labels']; b.label_meta = meta['label_meta']; b.links = meta.get('links', {})
        return b

    def copy(self):
        import copy as _c
        n = Brain(C=self.C, F=self.F, seed=self.seed, lr=self.lr, backend=self.be)
        be = self.be
        for D, S in ((n.P, self.P), (n.M, self.M), (n.V, self.V)):
            for k in S:
                D[k] = be.asarray(be.to_numpy(S[k]).copy())
        n.G = {k: be.zeros(tuple(v.shape)) for k, v in n.P.items()}
        n.labels = dict(self.labels); n.label_meta = _c.deepcopy(self.label_meta); n.links = dict(self.links)
        n.t, n.updates, n.exercises = self.t, self.updates, self.exercises
        return n


def batch_graphs(brain, items):
    """Lay several exercises into one graph (block structure: messages never cross between worlds).
    items: list of instance graphs from the worlds' minds: {n, X [n,F], labels: list of lists of label strings,
    family, edges: (src, dst) arrays, K}. Returns the batched graph and the offset of each world."""
    F = brain.F
    off = 0; Xs, ln, ll, src, dst, K, wid, offs = [], [], [], [], [], [], [], []
    for w, g in enumerate(items):
        n = g['n']; offs.append(off)
        X = np.zeros((n, F), np.float32); X[:, :g['X'].shape[1]] = g['X']
        Xs.append(X)
        for i, labs in enumerate(g['labels']):
            ids = []
            for lab in labs:
                li = brain.label_id(lab, g['family']); ln.append(off + i); ll.append(li); ids.append(li)
            if len(ids) > 1:
                for x in range(len(ids)):
                    for y in range(x + 1, len(ids)):
                        key = f'{min(ids[x], ids[y])}-{max(ids[x], ids[y])}'; brain.links[key] = brain.links.get(key, 0) + 1
        s, d = g['edges']
        if len(s):   # unique directed edges (a repeated edge would count twice in the max-message gradient)
            e = np.unique(np.stack([np.asarray(s, np.int64), np.asarray(d, np.int64)], 1), axis=0); s, d = e[:, 0], e[:, 1]
        src.append(np.asarray(s, np.int64) + off); dst.append(np.asarray(d, np.int64) + off)
        K.append(np.full(n, g['K'], np.int64)); wid.append(np.full(n, w, np.int64))
        off += n
    cat = lambda a, dt: np.concatenate(a).astype(dt) if a else np.zeros(0, dt)
    G = dict(N=off, X=np.concatenate(Xs) if Xs else np.zeros((0, F), np.float32), ln=np.asarray(ln, np.int64),
             ll=np.asarray(ll, np.int64), src=cat(src, np.int64), dst=cat(dst, np.int64), K=cat(K, np.int64), wid=cat(wid, np.int64))
    return G, offs
