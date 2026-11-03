"""MagicPerspective V11 — the Portal. Local server (default port 3047), own data folder, one persistent abstract network.

python server.py [--device auto|cuda|cpu] [--port 3047] [--data ./data]

Verbatim (exact spans in verbatim/implementation-mirror.json):
- "TRAINING CUDA IN PARALLEL CU SLIDER SA SETEZI CATE JOCURI/LUMI/EXPERIENTE/PROBLEME UNICE SI DIFERITE,NU PE ACEEASI PROBLEMA"
- "SA MA UIT LA GRAF SI SA INTELEG TOT CE SE INTAMPLA PRIN PATTERNURILE PE CARE LE VAD"
- "SA LASAM GRAFURILE ALEA SA SE CONSTRUIASCA IN CONTINUARE CU CELE DE LA TRAININGURILE TRECUTE"
"""
import argparse
import json
import math
import os
import sqlite3
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ROOT)
from engine.backend import make_backend
from engine.portal import Brain
from engine.life import Episode, live_step, run_episodes, evaluate, summarize, seed_of, SEEDS, predict, score, frame
from worlds import FAMILIES

VERSION = '11.0.0'


class Ledger:
    """Every completed world, identified by the hash of its CONTENT (not a counter): unique and different problems."""
    def __init__(self, path):
        self.db = sqlite3.connect(path, check_same_thread=False); self.lock = threading.Lock()
        self.db.execute('create table if not exists worlds(hash text primary key, family text, seed integer, size integer, '
                        'who text, solved integer, steps integer, optimal integer, bce0 real, f10 real, ts real)')
        self.db.commit()

    def seen(self, h):
        with self.lock:
            return self.db.execute('select 1 from worlds where hash=?', (h,)).fetchone() is not None

    def add(self, h, e, who):
        with self.lock:
            self.db.execute('insert or ignore into worlds values(?,?,?,?,?,?,?,?,?,?,?)',
                            (h, e.family, int(e.seed), int(e.size), who, int(e.mind.done()), int(e.t), int(e.optimal),
                             float(e.first['bce']) if e.first else None, float(e.first['f1']) if e.first else None, time.time()))
            self.db.commit()

    def counts(self):
        with self.lock:
            rows = self.db.execute('select family, count(*), sum(solved) from worlds group by family').fetchall()
        return {f: dict(unique=n, solved=int(s or 0)) for f, n, s in rows}


class Portal:
    def __init__(self, data, device):
        self.data = data; os.makedirs(data, exist_ok=True)
        self.be = make_backend(device)
        self.bpath = os.path.join(data, 'brain.npz'); self.cpath = os.path.join(data, 'control.npz')
        self.note = None
        try:
            self.brain = Brain.load(self.bpath, self.be) if os.path.exists(self.bpath) else Brain(seed=7, backend=self.be)
            self.control = Brain.load(self.cpath, self.be) if os.path.exists(self.cpath) else Brain(seed=7, backend=self.be)
            if os.path.exists(self.bpath): self.note = 'Creierul V11 a fost restaurat'
        except Exception as ex:
            self.note = f'Checkpoint incompatibil ({ex}); creier nou'; self.brain = Brain(seed=7, backend=self.be); self.control = Brain(seed=7, backend=self.be)
        self.untrained = Brain(seed=8, backend=self.be)
        self.ledger = Ledger(os.path.join(data, 'ledger.sqlite'))
        self.state_path = os.path.join(data, 'state.json')
        st = json.load(open(self.state_path)) if os.path.exists(self.state_path) else {}
        self.history = st.get('history', []); self.tests = st.get('tests', []); self.counter = st.get('counter', 0)
        self.life = st.get('life', {f: 0 for f in FAMILIES})
        self.train = dict(running=False, parallel=4, families=list(FAMILIES), control=True, done=0, rate=0.0, error=None, started=None)
        self.live_frames = []; self.lock = threading.RLock(); self.stop_flag = False; self.test_task = None

    def save(self):
        with self.lock:
            self.brain.save(self.bpath); self.control.save(self.cpath)
            tmp = self.state_path + '.tmp'
            json.dump(dict(history=self.history[-2000:], tests=self.tests[-20:], counter=self.counter, life=self.life), open(tmp, 'w'))
            os.replace(tmp, self.state_path)

    # ---- parallel training on unique worlds ---------------------------------------------------------------------
    def next_world(self, fams):
        """A new world never lived before (content hash checked against the ledger)."""
        for _ in range(50):
            fam = fams[self.counter % len(fams)]; self.counter += 1
            F = FAMILIES[fam]; size = F['sizes'][(self.counter // len(fams)) % len(F['sizes'])]
            seed = seed_of(SEEDS['train'], self.counter)
            try:
                e = Episode(fam, seed, size)
            except Exception:
                continue
            h = e.world.content_hash()
            if not self.ledger.seen(h):
                e.hash = h; return e
        return None

    def train_loop(self):
        tr = self.train; rng = np.random.default_rng(int(time.time()))
        live = []; ctrl_live = []; t0 = time.time(); n0 = 0; last_save = time.time(); last_val = 0
        try:
            while not self.stop_flag:
                fams = [f for f in tr['families'] if f in FAMILIES] or ['maze2d']
                while len(live) < tr['parallel']:
                    e = self.next_world(fams)
                    if e is None: break
                    live.append(e)
                    if tr['control']:
                        c = Episode(e.family, e.seed, e.size); c.hash = e.hash; ctrl_live.append(c)
                if not live: break
                show = {id(live[0])}
                with self.lock:
                    live_step(self.brain, live, 'organ', learn=True, explore=0.1, rng=rng, record=show)
                    if ctrl_live: live_step(self.control, ctrl_live, 'next-step', learn=True, explore=0.1, rng=rng)
                fr = live[0].frames[-1] if live[0].frames else None
                if fr is not None:
                    fr = dict(fr); fr['family'] = live[0].family; fr['label_ids'] = [[self.brain.labels.get(l, -1) for l in L] for L in fr['labels']]
                    fr['updates'] = self.brain.updates; self.live_frames = (self.live_frames + [fr])[-40:]
                    live[0].frames = []
                keep = []
                for e in live:
                    if e.finished():
                        self.ledger.add(e.hash, e, 'organ'); self.life[e.family] = self.life.get(e.family, 0) + 1
                        self.brain.exercises += 1; tr['done'] += 1
                    else: keep.append(e)
                live = keep; ctrl_live = [c for c in ctrl_live if not c.finished()]
                dt = time.time() - t0
                if dt > 5: tr['rate'] = (tr['done'] - n0) / dt; t0 = time.time(); n0 = tr['done']
                if tr['done'] - last_val >= max(20, 4 * len(fams)):
                    last_val = tr['done']; self.validate(fams)
                if time.time() - last_save > 60: self.save(); last_save = time.time()
        except Exception as ex:
            tr['error'] = repr(ex); traceback.print_exc()
        finally:
            self.save(); tr['running'] = False

    def validate(self, fams):
        """Shape before the first move on a few unseen validation worlds, per family (learning curve of the whole life)."""
        with self.lock:
            for fam in fams:
                F = FAMILIES[fam]
                specs = [(fam, seed_of(SEEDS['validation'], i), F['sizes'][i % len(F['sizes'])]) for i in range(4)]
                eps = run_episodes(self.brain, specs, 'organ', parallel=4)
                s = summarize(eps)
                self.history.append(dict(family=fam, life=self.life.get(fam, 0), exercises=self.brain.exercises, bce0=s['bce0'],
                                         f1_0=s['f1_0'], solved=s['solved'], ratio=s['ratio'], accuracy=s['accuracy'], labels=len(self.brain.labels)))

    def start(self, families, parallel, control):
        if self.train['running']: raise RuntimeError('Antrenarea rulează deja')
        self.train.update(running=True, families=families or list(FAMILIES), parallel=int(parallel), control=bool(control),
                          error=None, started=time.time())
        self.stop_flag = False; threading.Thread(target=self.train_loop, daemon=True).start()

    # ---- showing one world, recorded step by step ---------------------------------------------------------------
    def show(self, family, seed, size, who):
        F = FAMILIES[family]; size = size if size in F['test_sizes'] or size in F['sizes'] else F['test_sizes'][0]
        b = {'control': self.control, 'untrained': self.untrained}.get(who, self.brain)
        mode = who if who in ('classic', 'line', 'base') else 'organ'
        with self.lock:
            e = run_episodes(b, [(family, seed, size)], mode, record=True, parallel=1)[0]
        for fr in e.frames:
            fr['label_ids'] = [[b.labels.get(l, -1) for l in L] for L in fr.get('labels', [])]
        return dict(family=family, seed=seed, size=size, who=who, world=world_view(e), frames=e.frames,
                    summary=dict(solved=bool(e.mind.done()), steps=e.t, optimal=e.optimal, resistance=e.resistance,
                                 world_changes=e.world_changes, accuracy=e.mind.accuracy() if hasattr(e.mind, 'accuracy') else None))

    def labels(self):
        """The persistent part of the abstract network: every label node, where the network has put it (3 main axes of the
        learned vectors), and which nodes of DIFFERENT worlds the network has made alike (they 'unite'; the rest stay apart)."""
        with self.lock:
            L = self.brain.label_vectors(); meta = self.brain.label_meta
        if len(L) == 0: return dict(nodes=[], merges=[])
        Z = L - L.mean(0)
        try:
            _, _, Vt = np.linalg.svd(Z, full_matrices=False); Y = Z @ Vt[:3].T
        except np.linalg.LinAlgError:
            Y = np.zeros((len(L), 3))
        Y = Y / (np.abs(Y).max() or 1)
        if Y.shape[1] < 3: Y = np.pad(Y, ((0, 0), (0, 3 - Y.shape[1])))
        nrm = L / (np.linalg.norm(L, axis=1, keepdims=True) + 1e-9); S = nrm @ nrm.T
        merges = []
        fam = [m['family'] for m in meta]
        for i in range(len(L)):
            for j in range(i + 1, len(L)):
                if fam[i] != fam[j] and S[i, j] > 0.8:
                    merges.append(dict(a=i, b=j, sim=round(float(S[i, j]), 3)))
        merges.sort(key=lambda m: -m['sim'])
        links = sorted(((int(k.split('-')[0]), int(k.split('-')[1]), v) for k, v in self.brain.links.items()), key=lambda t: -t[2])[:600]
        return dict(nodes=[dict(id=i, label=m['label'], family=m['family'], uses=m['uses'], born=m['born'], pos=np.round(Y[i], 3).tolist())
                           for i, m in enumerate(meta)], merges=merges[:400], links=[dict(a=a, b=b, n=n) for a, b, n in links])

    def run_tests(self, count, families):
        def job():
            try:
                self.test_task = dict(running=True, families=families, started=time.time(), error=None)
                with self.lock:
                    res = evaluate(self.brain, families, count=count, others={'next-step': self.control, 'untrained': self.untrained})
                lab = self.labels()
                self.tests.append(dict(date=time.strftime('%Y-%m-%d %H:%M:%S'), life=dict(self.life), exercises=self.brain.exercises,
                                       labels=len(lab['nodes']), merges=len(lab['merges']), results=res, device=self.be.name))
                self.save()
            except Exception as ex:
                self.test_task['error'] = repr(ex); traceback.print_exc()
            finally:
                self.test_task['running'] = False
        threading.Thread(target=job, daemon=True).start()

    def state(self):
        return dict(version=VERSION, device=self.be.name, note=self.note, train=self.train, test_task=self.test_task,
                    brain=dict(labels=len(self.brain.labels), updates=self.brain.updates, exercises=self.brain.exercises),
                    ledger=self.ledger.counts(), life=self.life, history=self.history[-600:], tests=self.tests[-5:],
                    families={k: dict(title=v['title'], sizes=v['sizes'], test_sizes=v['test_sizes']) for k, v in FAMILIES.items()})


def world_view(e):
    w = e.world; f = e.family
    if f in ('maze2d', 'maze3d', 'dynamic'):
        return dict(kind='grid', dims=w.dims, n=w.n, wall=w.wall.tolist(), start=int(w.start), goal=int(w.goal))
    if f == 'car':
        return dict(kind='car', n=w.n, wall=w.wall.tolist(), start=int(w.start), goal_cell=int(w.goal_cell))
    if f == 'graph':
        return dict(kind='states', N=w.N, forbid=w.forbid.astype(int).tolist(), ops=[o[0] for o in w.ops], start=int(w.start), goals=sorted(int(g) for g in w.goals))
    if f == 'sat':
        return dict(kind='sat', N=w.N, v=w.v, viol=w.viol.tolist(), clauses=len(w.clauses), start=int(w.start), goals=sorted(int(g) for g in w.goals))
    if f == 'symbols':
        return dict(kind='symbols', strings=w.strings, rules=[f'{P}→{Q}' for P, Q in w.rules], start=int(w.start), goal=w.strings[w.goal_hint])
    if f == 'text':
        return dict(kind='text', context=w.context, answer=w.answer)
    if f == 'voter':
        return dict(kind='voter', bits=w.bits.tolist(), listen=w.listen, votes=w.votes, outcome=w.outcome)
    return dict(kind=f)


MIME = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8'}


def make_handler(P):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass

        def send(self, obj, code=200):
            b = json.dumps(obj, default=lambda o: o.item() if hasattr(o, 'item') else str(o)).encode()
            self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8'); self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)

        def body(self):
            n = int(self.headers.get('Content-Length') or 0)
            if n > 100000: raise ValueError('cerere prea mare')
            return json.loads(self.rfile.read(n) or b'{}')

        def do_GET(self):
            try:
                path = self.path.split('?')[0]
                if path == '/api/state': return self.send(P.state())
                if path == '/api/live': return self.send(dict(frames=P.live_frames[-12:], updates=P.brain.updates))
                if path == '/api/labels': return self.send(P.labels())
                name = 'index.html' if path == '/' else path.lstrip('/')
                if name not in ('index.html', 'app.js', 'style.css'): return self.send({'error': 'not found'}, 404)
                b = open(os.path.join(ROOT, 'web', name), 'rb').read()
                self.send_response(200); self.send_header('Content-Type', MIME[os.path.splitext(name)[1]]); self.send_header('Cache-Control', 'no-cache')
                self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
            except Exception as ex:
                traceback.print_exc(); self.send({'error': str(ex)}, 500)

        def do_POST(self):
            try:
                path = self.path.split('?')[0]; a = self.body()
                if path == '/api/train':
                    fams = [f for f in a.get('families', []) if f in FAMILIES]
                    P.start(fams, max(1, min(1024, int(a.get('parallel', 16)))), a.get('control', True)); return self.send(P.state())
                if path == '/api/stop': P.stop_flag = True; return self.send({'ok': True})
                if path == '/api/parallel':
                    P.train['parallel'] = max(1, min(1024, int(a.get('parallel', 16)))); return self.send({'ok': True})
                if path == '/api/families':
                    P.train['families'] = [f for f in a.get('families', []) if f in FAMILIES] or P.train['families']; return self.send({'ok': True})
                if path == '/api/show':
                    fam = a.get('family', 'maze2d'); fam = fam if fam in FAMILIES else 'maze2d'
                    seed = int(a.get('seed') or seed_of(SEEDS['test'] + 99, int(time.time()) % 100000))
                    return self.send(P.show(fam, seed, int(a.get('size') or 0), a.get('who', 'organ')))
                if path == '/api/test':
                    if P.test_task and P.test_task.get('running'): return self.send({'error': 'Testele rulează deja'}, 409)
                    fams = [f for f in a.get('families', []) if f in FAMILIES] or list(FAMILIES)
                    P.run_tests(max(4, min(200, int(a.get('count', 16)))), fams); return self.send({'ok': True})
                return self.send({'error': 'endpoint inexistent'}, 404)
            except Exception as ex:
                traceback.print_exc(); self.send({'error': str(ex)}, 500)
    return H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--device', default=os.environ.get('MP_DEVICE', 'auto')); ap.add_argument('--port', type=int, default=int(os.environ.get('PORT', 3047)))
    ap.add_argument('--host', default=os.environ.get('HOST', '127.0.0.1')); ap.add_argument('--data', default=os.environ.get('MP_DATA', os.path.join(ROOT, 'data')))
    a = ap.parse_args()
    P = Portal(a.data, a.device)
    srv = ThreadingHTTPServer((a.host, a.port), make_handler(P))
    print(f'MagicPerspective V11 · {P.be.name} · http://{a.host}:{a.port} · data: {a.data}', flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        P.stop_flag = True; P.save()


if __name__ == '__main__':
    main()
