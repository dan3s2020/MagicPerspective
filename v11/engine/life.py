"""Life of the organism: many unique worlds lived IN PARALLEL by the same abstract network (2026-11-03 PORTAL4D-V7:
"TRAINING CUDA IN PARALLEL CU SLIDER SA SETEZI CATE JOCURI/LUMI/EXPERIENTE/PROBLEME UNICE SI DIFERITE,NU PE ACEEASI PROBLEMA").

Per step, for every live world (message 38.4): perception -> the shape BEFORE moving -> (training only) the teacher, who sees
the whole map, gives the exact numeric error -> the network changes its parameters -> the action is chosen from the imagined
consequences (message 49) -> the world answers -> resistance = imagined vs real consequence -> new perspective.
At evaluation the teacher gives nothing; it only scores, for us."""
import math
import numpy as np

from .portal import Brain, batch_graphs
from worlds import FAMILIES

SEEDS = dict(train=1000003, validation=2000003, test=3000017)


def seed_of(base, i):
    return (base + i * 7919) % (2 ** 31)


class Episode:
    def __init__(self, family, seed, size):
        F = FAMILIES[family]
        self.family, self.seed, self.size = family, seed, size
        self.world = F['make'](seed, size)
        self.mind = F['mind'](self.world)
        self.t = 0; self.resistance = 0; self.world_changes = 0; self.first = None; self.errs = []; self.frames = []
        y, yn, D = self.mind.target(); self.optimal = max(1, D)
        self.limit = min(4 * self.mind.N, 40 + 12 * self.optimal)

    def finished(self):
        m = self.mind
        return m.done() or self.t >= self.limit or (hasattr(m, 'finished_wrong') and m.finished_wrong())


def score(ep, p):
    """Shape error on the cells the teacher scores at training (all cells not known to be walls / not excluded),
    plus the decoded line: precision on SOME optimal route, recall vs optimal length, validity."""
    m = ep.mind; y, yn, D = m.target(); mask = m.mask()
    pc = np.clip(p, 0.02, 0.98)
    bce = float(-(mask * (y * np.log(pc) + (1 - y) * np.log(1 - pc))).sum() / max(1, mask.sum()))
    line = m.decode(p)
    on = sum(1 for i in line[1:] if y[i] > 0)
    prec = on / (len(line) - 1) if len(line) > 1 else 0.0
    rec = min(1.0, on / D) if D else 1.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return dict(bce=bce, f1=f1, valid=bool(m.valid(line)), line=line, y=y)


def predict(brain, eps, mode):
    """mode: organ / next-step / untrained (all = the network) or classic / line / base (references without learning)."""
    if mode in ('classic', 'line', 'base'):
        outs = []
        for e in eps:
            if mode == 'classic': p = e.mind.classic()
            elif mode == 'line': p = e.mind.line()
            else: p = e.mind.mask() * 0.2
            outs.append(dict(p=p, q=p, U=None, h=None))
        return outs, None, None
    items = [e.mind.graph() for e in eps]
    G, offs = batch_graphs(brain, items)
    out = brain.forward(G)
    be = brain.be
    p, q, U, h = (be.to_numpy(out[k]) for k in ('p', 'q', 'U', 'h'))
    res = []
    for k, e in enumerate(eps):
        a, b = offs[k], offs[k] + items[k]['n']
        res.append(dict(p=p[a:b], q=q[a:b], U=U[a:b], h=h[a:b]))
    return res, (G, out, offs, items), out


def choose(ep, f, rng, explore, source='q'):
    """Imagination (message 49): the consequence of each possible action is imagined before choosing one."""
    m = ep.mind; v = f[source] if f.get(source) is not None else f['p']
    opts = m.options()
    if not opts: return None
    vis = m.visits if hasattr(m, 'visits') else None
    scored = []
    for a, j, allowed in opts:
        val = -1.0 if not allowed else float(v[j]) - (0.15 * min(int(vis[j]), 4) if vis is not None else 0.0)
        scored.append((val, a))
    if rng is not None and rng.random() < explore:
        ok = [a for val, a in scored if val > -1]
        if ok: return int(rng.choice(ok))
    return max(scored)[1]


def live_step(brain, eps, mode='organ', learn=False, explore=0.0, rng=None, record=False, source='q', curve=False):
    """One step of every live episode, all through ONE batched pass of the network."""
    fs, ctx, out = predict(brain, eps, mode)
    if learn and ctx is not None:
        G, o, offs, items = ctx
        ys, yns, masks, ws, sh = [], [], [], [], []
        for k, e in enumerate(eps):
            y, yn, D = e.mind.target()
            ys.append(y); yns.append(yn); masks.append(e.mind.mask())
            ws.append(1 + 3 * math.exp(-e.t / 3)); sh.append(1.0 if mode == 'organ' else 0.0)
        brain.backward(o, np.concatenate(ys), np.concatenate(masks), np.concatenate(yns), G['wid'], len(eps), dict(w=ws, shape=sh))
        brain.step()
    if record and ctx is not None:
        # the real order in which the network lights up: round at which each node reached half of its final change
        G, o, offs, items = ctx; be = brain.be
        H = np.stack([be.to_numpy(x) for x in o['cache']['H']]); D = np.linalg.norm(H - H[0], axis=2)
        fin = D[-1] + 1e-9; onset = (D >= 0.5 * fin).argmax(0)
        for k, e in enumerate(eps):
            fs[k]['onset'] = onset[offs[k]:offs[k] + items[k]['n']]; fs[k]['rounds'] = int(items[k]['K'])
    for k, e in enumerate(eps):
        f = fs[k]; fr = None
        rec = record is True or (isinstance(record, (set, frozenset)) and id(e) in record)
        if e.t == 0 or rec or curve:
            sc = score(e, f['p']); e.errs.append(sc['bce'])
            if e.t == 0:
                e.first = dict(bce=sc['bce'], f1=sc['f1'], valid=sc['valid'])
                if f.get('U') is not None:   # D7: calibration of the uncertainty: does U grow where the shape is wrong?
                    msk = e.mind.mask() > 0; err = np.abs(f['p'] - sc['y'])[msk]; uu = np.asarray(f['U'])[msk]
                    e.first['ucorr'] = float(np.corrcoef(uu, err)[0, 1]) if err.std() > 1e-6 and uu.std() > 1e-6 else 0.0
            if rec: fr = frame(e, f, sc); e.frames.append(fr)
        if f.get('h') is not None and (curve or rec):
            island(e, f, rng)
        a = choose(e, f, rng, explore, source)
        if a is None: e.t = e.limit; continue
        if fr is not None:
            fr['choice'] = next((int(j) for aa, j, ok in e.mind.options() if aa == a), None)
        moved, resist, changed = e.mind.act(a)
        if fr is not None: fr.update(resist=bool(resist), moved=bool(moved), changed=bool(changed))
        e.resistance += int(resist); e.world_changes += int(changed); e.t += 1


def island(e, f, rng):
    """2026-11-03-USER-ABSTRACT-NETWORK-ORDER-ISLAND, measured: the activated shape as a 'body' in the network's own latent
    space. Its signature (the mean latent state of the nodes it lights, normalised) is compared from one step to the next,
    against the signature of an equally large random set of nodes (the 'randomness'). A form that stays the same while it moves
    is an island of order; a form no more stable than random sets is not."""
    h = np.asarray(f['h']); p = np.asarray(f['p']); n = len(p)
    k = max(1, int((p >= 0.5).sum())); top = np.argsort(-p)[:k]
    r = (rng or np.random.default_rng(e.t)).choice(n, size=min(k, n), replace=False)
    sig = h[top].mean(0); sig = sig / (np.linalg.norm(sig) + 1e-9)
    rs = h[r].mean(0); rs = rs / (np.linalg.norm(rs) + 1e-9)
    cen = h[top].mean(0)
    if not hasattr(e, 'sigs'): e.sigs, e.rsigs, e.cens = [], [], []
    e.sigs.append(sig); e.rsigs.append(rs); e.cens.append(cen)


def island_stats(eps):
    st, rst, mv = [], [], []
    for e in eps:
        S_ = getattr(e, 'sigs', []); R_ = getattr(e, 'rsigs', []); C_ = getattr(e, 'cens', [])
        for a, b in zip(S_, S_[1:]): st.append(float(a @ b))
        for a, b in zip(R_, R_[1:]): rst.append(float(a @ b))
        for a, b in zip(C_, C_[1:]): mv.append(float(np.linalg.norm(b - a)))
    if not st: return None
    return dict(shape_stability=float(np.mean(st)), random_stability=float(np.mean(rst)), shape_motion=float(np.mean(mv)))


def frame(e, f, sc):
    m = e.mind
    fr = dict(step=e.t, pos=int(m.pos), self=int(m.self_index()), line=[int(i) for i in sc['line']], p=np.round(np.asarray(f['p'], np.float64), 3).tolist(),
              bce=round(sc['bce'], 4), f1=round(sc['f1'], 4), truth=[int(i) for i in np.flatnonzero(sc['y'])], resistance=e.resistance)
    if f.get('U') is not None: fr['U'] = np.round(np.asarray(f['U'], np.float64), 3).tolist()
    if f.get('h') is not None: fr['h3'] = latent3(f['h'])
    if hasattr(m, 'cells'): fr['cells'] = m.cells.tolist()
    if hasattr(m, 'view'): fr['view'] = m.view()
    g = m.graph(); fr['labels'] = g['labels']
    s_, d_ = g['edges']; E = [(int(a), int(b)) for a, b in zip(s_, d_) if a < b]
    if len(E) > 1500:
        pp = np.asarray(f['p']); E = sorted(E, key=lambda ab: -(pp[ab[0]] + pp[ab[1]]))[:1500]
    fr['edges'] = E
    if f.get('onset') is not None: fr['onset'] = [int(v) for v in f['onset']]; fr['rounds'] = f['rounds']
    if f.get('h') is not None: fr['act'] = np.round(np.linalg.norm(f['h'], axis=1) / np.sqrt(f['h'].shape[1]), 3).tolist()
    return fr


def latent3(h):
    """Message 44-45 (MDS) and 2026-11-03 4D message: where the network places each node in its own latent geometry, 3 axes."""
    H = h - h.mean(0, keepdims=True)
    try:
        U, S, Vt = np.linalg.svd(H, full_matrices=False)
        Y = H @ Vt[:3].T
    except np.linalg.LinAlgError:
        Y = np.zeros((h.shape[0], 3))
    r = np.linalg.norm(Y, axis=1); s = float(np.percentile(r, 90)) if len(r) else 1.0
    Y = np.clip(Y / (s or 1.0), -1.4, 1.4)
    if Y.shape[1] < 3: Y = np.pad(Y, ((0, 0), (0, 3 - Y.shape[1])))
    return np.round(Y, 3).tolist()


def run_episodes(brain, specs, mode='organ', learn=False, parallel=16, explore=0.0, rng=None, record=False, curve=False,
                 on_done=None, stop=None, source='q'):
    """Live a list of (family, seed, size) worlds, `parallel` at a time; finished worlds are replaced by the next unique one."""
    pending = list(specs)[::-1]; live = []; done = []
    while pending or live:
        if stop is not None and stop(): break
        while pending and len(live) < parallel:
            fam, seed, size = pending.pop(); live.append(Episode(fam, seed, size))
        live_step(brain, live, mode, learn, explore, rng, record, source, curve)
        keep = []
        for e in live:
            if e.finished():
                if record is True or curve:
                    fs, _, _ = predict(brain, [e], mode); sc = score(e, fs[0]['p'])
                    if record is True: e.frames.append(frame(e, fs[0], sc))
                done.append(e)
                if on_done: on_done(e)
            else:
                keep.append(e)
        live = keep
    return done


def summarize(eps):
    if not eps: return {}
    avg = lambda a: float(np.mean(a)) if len(a) else None
    solved = [e for e in eps if e.mind.done()]
    def at(e, f):
        return e.errs[min(len(e.errs) - 1, int(f * (len(e.errs) - 1)))] if e.errs else None
    return dict(worlds=len(eps), solved=avg([1.0 if e.mind.done() else 0.0 for e in eps]),
                bce0=avg([e.first['bce'] for e in eps]), f1_0=avg([e.first['f1'] for e in eps]),
                valid0=avg([1.0 if e.first['valid'] else 0.0 for e in eps]),
                ratio=avg([e.t / e.optimal for e in solved]),
                bce25=avg([at(e, .25) for e in eps if e.errs]), bce50=avg([at(e, .5) for e in eps if e.errs]),
                bce75=avg([at(e, .75) for e in eps if e.errs]), resistance=avg([e.resistance for e in eps]),
                ucorr=avg([e.first['ucorr'] for e in eps if e.first and 'ucorr' in e.first]), island=island_stats(eps),
                accuracy=avg([e.mind.accuracy() for e in eps if hasattr(e.mind, 'accuracy')]))


def evaluate(brain, families, count=24, seed=SEEDS['test'], modes=('organ', 'classic', 'line', 'base'), others=None, parallel=24):
    """Same unseen worlds for every organism (D1-D6). others: {'next-step': brain, 'untrained': brain}."""
    res = {}
    for fam in families:
        F = FAMILIES[fam]; specs = [(fam, seed_of(seed, i), F['test_sizes'][i % len(F['test_sizes'])]) for i in range(count)]
        res[fam] = {}
        for m in list(modes) + list((others or {}).keys()):
            b = (others or {}).get(m, brain)
            eps = run_episodes(b, specs, mode='organ' if m in ('next-step', 'untrained') else m, parallel=parallel, curve=True)
            res[fam][m] = summarize(eps)
            res[fam][m]['bySize'] = {str(s): {k: v for k, v in summarize([e for e in eps if e.size == s]).items() if k != 'island'} for s in F['test_sizes']}
            if m == 'organ':   # the body's signature in this world (for comparing the 'islands' of different worlds)
                sg = [x for e in eps for x in getattr(e, 'sigs', [])]
                if sg: res[fam][m]['signature'] = np.round(np.mean(sg, 0), 4).tolist()
    return res
