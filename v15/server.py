"""MagicPerspective V15 — A and B inside the fabric. Training on CUDA + a chat.
The fabric (the graph) learns; A acts at α, B chooses the perspective and holds the shape at Ω.
Optional control trained on the very same batches: the V14 graph without A and B bodies.

python server.py --data-file "D:\\training\\OpenThoughts3-1.2M\\train-00015-of-00120.parquet" [--device cuda] [--port 3050]
"""
import argparse, json, math, os, sys, threading, time, traceback, uuid
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np
import torch
import torch.nn.functional as F

ROOT = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, ROOT)
from model import LoopGraph, FabricAB, Q_TOK, A_TOK, E_TOK, param_count
from data import load_pairs, Stream, held_out

VERSION = '15.0.0'


class Lab:
    def __init__(self, a):
        self.a = a
        self.dev = torch.device(a.device if a.device != 'auto' else ('cuda' if torch.cuda.is_available() else 'cpu'))
        torch.backends.cuda.matmul.allow_tf32 = True
        self.devname = torch.cuda.get_device_name(0) if self.dev.type == 'cuda' else 'CPU'
        os.makedirs(a.data, exist_ok=True); self.ck = os.path.join(a.data, 'brain.pt')
        self.cfg = dict(levels=a.levels, units=a.units, parallel=a.parallel, chunk=a.chunk, noise=0.05, lr=a.lr, shape_w=0.2, control=True)
        self.lock = threading.RLock(); self.history = []; self.samples = []; self.step = 0; self.episodes = 0; self.bytes = 0
        self.model = FabricAB(a.levels, a.units).to(self.dev)
        self.opt = torch.optim.AdamW(self.model.parameters(), lr=a.lr, weight_decay=0.01)
        self.ctrl = LoopGraph(a.levels, a.units).to(self.dev)          # control: the same graph, without A and B bodies (V14)
        self.copt = torch.optim.AdamW(self.ctrl.parameters(), lr=a.lr, weight_decay=0.01)
        self.note = 'creier nou'
        if os.path.exists(self.ck):
            try:
                s = torch.load(self.ck, map_location=self.dev, weights_only=False)
                if s['cfg']['levels'] == a.levels and s['cfg']['units'] == a.units:
                    self.model.load_state_dict(s['model']); self.opt.load_state_dict(s['opt'])
                    if 'ctrl' in s: self.ctrl.load_state_dict(s['ctrl']); self.copt.load_state_dict(s['copt'])
                    self.step, self.episodes, self.bytes = s['step'], s['episodes'], s.get('bytes', 0)
                    self.history, self.samples = s['history'], s['samples']; self.cfg.update(noise=s['cfg'].get('noise', 0.05))
                    self.note = f'creier restaurat: pasul {self.step}, {self.episodes} conversații trăite'
                else:
                    self.note = 'checkpoint cu altă mărime de rețea: păstrat neatins, creier nou'
            except Exception as ex:
                self.note = f'checkpoint ilizibil ({ex}); creier nou, fișierul vechi nu a fost șters'
        self.pairs = None; self.val = None; self.data_status = 'nicio dată încărcată'; self.train_state = dict(running=False, rate=0.0, error=None)
        self.stop = False; self.jobs = {}

    # ---------------- data ----------------
    def load(self, path):
        def job():
            try:
                self.data_status = f'se încarcă {path} …'
                pairs = load_pairs(path, log=lambda m: setattr(self, 'data_status', m))
                if not pairs: raise ValueError('nicio conversație găsită')
                tr, va = held_out(pairs)
                self.pairs, self.val = tr, va
                self.data_status = f'{len(tr)} conversații de antrenare + {len(va)} ținute deoparte · {os.path.basename(path)}'
                self.data_file = path
            except Exception as ex:
                self.data_status = f'EROARE la încărcare: {ex}'; traceback.print_exc()
        threading.Thread(target=job, daemon=True).start()

    # ---------------- training ----------------
    def save(self):
        with self.lock:
            s = dict(model=self.model.state_dict(), opt=self.opt.state_dict(), ctrl=self.ctrl.state_dict(), copt=self.copt.state_dict(), step=self.step, episodes=self.episodes, bytes=self.bytes,
                     history=self.history[-5000:], samples=self.samples[-50:], cfg=self.cfg, version=VERSION)
            tmp = self.ck + '.tmp'; torch.save(s, tmp); os.replace(tmp, self.ck)

    def _shape_loss(self, Hs, shp, shape_fn):
        if not shp: return torch.zeros((), device=self.dev)
        bi = torch.tensor([q[0] for q in shp], device=self.dev); ti = torch.tensor([q[1] for q in shp], device=self.dev)
        ln_t = torch.tensor([q[2] for q in shp], device=self.dev, dtype=torch.float32)
        bag_t = torch.tensor(np.stack([q[3] for q in shp]), device=self.dev)
        ln_p, bag_p = shape_fn(Hs[bi, ti])
        return 0.1 * F.mse_loss(ln_p, ln_t) + F.binary_cross_entropy_with_logits(bag_p, bag_t)

    def losses(self, x, y, m, r, shp, st, noise):
        """the fabric with A and B"""
        LP, PI, SUR, Hs, st = self.model.run(x, y, st, noise=noise, reset=r)
        nll = -LP.gather(-1, y.unsqueeze(-1)).squeeze(-1); text = (nll * m).sum() / m.sum().clamp(min=1)
        return text, self._shape_loss(Hs, shp, self.model.shape), st

    def closses(self, x, y, m, r, shp, h, noise):
        """the control (V14 graph, no bodies)"""
        Hs, h_last = self.ctrl.run(x, h, noise=noise, reset=r)
        logp, _ = self.ctrl.speak(Hs)
        nll = -logp.gather(-1, y.unsqueeze(-1)).squeeze(-1); text = (nll * m).sum() / m.sum().clamp(min=1)
        return text, self._shape_loss(Hs, shp, self.ctrl.shape), h_last

    def validate(self):
        with self.lock, torch.no_grad():
            self.model.eval(); self.ctrl.eval()
            S = Stream(self.val, B=min(32, len(self.val)), T=256, seed=7)
            st = self.model.init_state(S.B, self.dev); h = self.ctrl.init_state(S.B, self.dev); tot = c = 0.0; n = 0
            for _ in range(4):
                x, y, m, r, shp = S.next()
                T_ = lambda a, dt=torch.long: torch.tensor(a, device=self.dev, dtype=dt)
                X, Y, Mk, R = T_(x), T_(y), T_(m, torch.float32), T_(r, torch.float32)
                text, _, st = self.losses(X, Y, Mk, R, shp, st, 0.0); tot += float(text)
                if self.cfg['control']: ctext, _, h = self.closses(X, Y, Mk, R, shp, h, 0.0); c += float(ctext)
                n += 1
            self.model.train(); self.ctrl.train()
            return tot / n / math.log(2), (c / n / math.log(2) if self.cfg['control'] else None)

    def train_loop(self):
        st = self.train_state
        try:
            S = Stream(self.pairs, B=self.cfg['parallel'], T=self.cfg['chunk'], seed=self.step)
            ws = self.model.init_state(S.B, self.dev); h = self.ctrl.init_state(S.B, self.dev)
            t0 = time.time(); b0 = self.bytes; last_save = time.time(); acc = []; ep0 = self.episodes
            while not self.stop:
                if S.B != self.cfg['parallel']:
                    S.resize(self.cfg['parallel']); ws = self.model.init_state(S.B, self.dev); h = self.ctrl.init_state(S.B, self.dev)
                for o in (self.opt, self.copt):
                    for g in o.param_groups: g['lr'] = self.cfg['lr']
                x, y, m, r, shp = S.next()
                T_ = lambda a, dt=torch.long: torch.tensor(a, device=self.dev, dtype=dt)
                X, Y, Mk, R = T_(x), T_(y), T_(m, torch.float32), T_(r, torch.float32)
                with self.lock:
                    text, shape, ws = self.losses(X, Y, Mk, R, shp, ws, self.cfg['noise'])
                    loss = text + self.cfg['shape_w'] * shape
                    self.opt.zero_grad(set_to_none=True); loss.backward()
                    torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0); self.opt.step()
                    ws = self.model.detach(ws); ctext = None
                    if self.cfg['control']:
                        ctext, cshape, h = self.closses(X, Y, Mk, R, shp, h, self.cfg['noise'])
                        closs = ctext + self.cfg['shape_w'] * cshape
                        self.copt.zero_grad(set_to_none=True); closs.backward()
                        torch.nn.utils.clip_grad_norm_(self.ctrl.parameters(), 1.0); self.copt.step(); h = h.detach()
                self.step += 1; self.bytes += int(x.size); self.episodes = ep0 + S.episodes_started
                acc.append((float(text) / math.log(2), float(shape), None if ctext is None else float(ctext) / math.log(2)))
                if time.time() - t0 > 3:
                    st['rate'] = (self.bytes - b0) / (time.time() - t0); t0 = time.time(); b0 = self.bytes
                if self.step % 50 == 0:
                    tb = float(np.mean([q[0] for q in acc])); sh = float(np.mean([q[1] for q in acc]))
                    cb = [q[2] for q in acc if q[2] is not None]; acc = []
                    row = dict(step=self.step, bytes=self.bytes, episodes=self.episodes, train_bpb=tb, shape=sh, ctrl_bpb=float(np.mean(cb)) if cb else None, t=time.time())
                    if self.step % 500 == 0 and self.val:
                        row['val_bpb'], row['ctrl_val_bpb'] = self.validate()
                        q = self.val[(self.step // 500) % len(self.val)][0]
                        res = self.generate(q[-400:], max_len=300, temp=0.7, noise=0.0)
                        self.samples.append(dict(step=self.step, q=q[-400:], a=res['text'], shape=res['shape']))
                    self.history.append(row)
                if time.time() - last_save > 300: self.save(); last_save = time.time()
        except Exception as ex:
            st['error'] = repr(ex); traceback.print_exc()
        finally:
            try: self.save()
            except Exception: traceback.print_exc()
            st['running'] = False

    def start(self):
        if self.train_state['running']: return
        if not self.pairs: raise RuntimeError('Încarcă întâi fișierul de antrenare')
        self.stop = False; self.train_state.update(running=True, error=None)
        threading.Thread(target=self.train_loop, daemon=True).start()

    # ---------------- speaking ----------------
    @torch.no_grad()
    def generate(self, text, max_len=600, temp=0.8, noise=0.0, on_byte=None):
        with self.lock:
            self.model.eval()
            toks = [Q_TOK] + list(text.encode('utf-8', 'replace')[-1024:]) + [A_TOK]
            st = self.model.init_state(1, self.dev)
            if len(toks) > 1:
                _, _, _, _, st = self.model.run(torch.tensor([toks[:-1]], device=self.dev), torch.tensor([toks[1:]], device=self.dev), st, noise=noise)
            chosen = []
            def pick(lp):
                lg = lp[0] / max(1e-3, temp)
                c = int(torch.multinomial(torch.softmax(lg, -1), 1).item()) if temp > 0 else int(lg.argmax().item())
                chosen.append(c); return torch.tensor([c], device=self.dev)
            LP, PI, SUR, HS, st = self.model.run(torch.tensor([[A_TOK]], device=self.dev), None, st, noise=noise, sample=pick)
            ln, bag = self.model.shape(HS[:, 0])                      # B holds the shape BEFORE A's first action
            plen = float(torch.expm1(ln.clamp(max=12)).item()); probs = torch.sigmoid(bag[0]).cpu().numpy()
            shape = dict(length=round(plen), bytes=[(chr(i) if 32 <= i < 127 else f'\\x{i:02x}', round(float(probs[i]), 3)) for i in np.argsort(-probs)[:48]])
            out = []; pis = []; acts = []; surs = []
            for _ in range(max_len):
                c = chosen[-1]
                pis.append([round(float(v), 3) for v in PI[0, 0].tolist()]); surs.append(round(float(SUR[0, 0]), 3))
                acts.append([round(float(v), 3) for v in HS[0, 0].view(self.model.L, self.model.U).norm(dim=1).div(math.sqrt(self.model.U)).tolist()])
                if c == E_TOK: break
                if c < 256:
                    out.append(c)
                    if on_byte: on_byte(bytes(out).decode('utf-8', 'replace'), pis, acts, surs)
                LP, PI, SUR, HS, st = self.model.run(torch.tensor([[c]], device=self.dev), None, st, noise=noise, sample=pick)
            self.model.train()
            return dict(text=bytes(out).decode('utf-8', 'replace'), shape=shape, pi=pis, act=acts, sur=surs)

    def chat(self, text, temp, noise, max_len):
        jid = uuid.uuid4().hex[:12]; job = dict(done=False, text='', shape=None, pi=[], act=[], sur=[], error=None); self.jobs[jid] = job
        def run():
            try:
                def on(t, p, a, s): job.update(text=t, pi=p[-400:], act=a[-400:], sur=s[-400:])
                res = self.generate(text, max_len=max_len, temp=temp, noise=noise, on_byte=on)
                job.update(text=res['text'], shape=res['shape'], pi=res['pi'][-400:], act=res['act'][-400:], sur=res['sur'][-400:])
            except Exception as ex:
                job['error'] = repr(ex); traceback.print_exc()
            finally:
                job['done'] = True
        threading.Thread(target=run, daemon=True).start()
        return jid

    def state(self):
        return dict(version=VERSION, device=str(self.dev), devname=self.devname, params=param_count(self.model), cfg=self.cfg, note=self.note,
                    data=self.data_status, data_file=getattr(self, 'data_file', self.a.data_file), train=self.train_state, step=self.step,
                    episodes=self.episodes, bytes=self.bytes, history=self.history[-1500:], samples=self.samples[-8:])


def handler(L):
    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def send(self, o, code=200):
            b = json.dumps(o).encode(); self.send_response(code); self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
        def body(self):
            n = int(self.headers.get('Content-Length') or 0); return json.loads(self.rfile.read(n) or b'{}')
        def do_GET(self):
            try:
                p = self.path.split('?')[0]
                if p == '/api/state': return self.send(L.state())
                if p == '/api/chat':
                    jid = self.path.split('id=')[-1]; job = L.jobs.get(jid)
                    return self.send(job if job else {'error': 'necunoscut'}, 200 if job else 404)
                name = 'index.html' if p == '/' else p.lstrip('/')
                if name not in ('index.html', 'app.js'): return self.send({'error': 'not found'}, 404)
                b = open(os.path.join(ROOT, 'web', name), 'rb').read()
                self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8' if name.endswith('html') else 'text/javascript; charset=utf-8')
                self.send_header('Cache-Control', 'no-cache'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
            except Exception as ex:
                traceback.print_exc(); self.send({'error': str(ex)}, 500)
        def do_POST(self):
            try:
                p = self.path.split('?')[0]; a = self.body()
                if p == '/api/load': L.load(a.get('path') or L.a.data_file); return self.send({'ok': True})
                if p == '/api/train': L.start(); return self.send({'ok': True})
                if p == '/api/stop': L.stop = True; return self.send({'ok': True})
                if p == '/api/config':
                    if 'parallel' in a: L.cfg['parallel'] = max(1, min(1024, int(a['parallel'])))
                    if 'noise' in a: L.cfg['noise'] = max(0.0, min(1.0, float(a['noise'])))
                    if 'lr' in a: L.cfg['lr'] = max(1e-5, min(1e-2, float(a['lr'])))
                    if 'control' in a: L.cfg['control'] = bool(a['control'])
                    return self.send(L.cfg)
                if p == '/api/chat':
                    return self.send({'id': L.chat(str(a.get('text', ''))[:4000], float(a.get('temp', 0.8)), float(a.get('noise', 0.0)), int(min(4000, a.get('max_len', 600))))})
                if p == '/api/save': L.save(); return self.send({'ok': True})
                return self.send({'error': 'endpoint inexistent'}, 404)
            except Exception as ex:
                traceback.print_exc(); self.send({'error': str(ex)}, 500)
    return H


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data-file', default=r'D:\training\OpenThoughts3-1.2M\train-00015-of-00120.parquet')
    d0 = r'D:\training\MagicPerspective-v15' if os.path.isdir('D:\\training') else os.path.join(ROOT, 'data')
    ap.add_argument('--data', default=d0); ap.add_argument('--device', default='auto'); ap.add_argument('--port', type=int, default=3050)
    ap.add_argument('--levels', type=int, default=6); ap.add_argument('--units', type=int, default=192)
    ap.add_argument('--parallel', type=int, default=64); ap.add_argument('--chunk', type=int, default=256); ap.add_argument('--lr', type=float, default=2e-3)
    a = ap.parse_args()
    L = Lab(a)
    if os.path.exists(a.data_file): L.load(a.data_file)
    srv = ThreadingHTTPServer(('127.0.0.1', a.port), handler(L))
    print(f'MagicPerspective V15 · A și B în țesătură · {L.devname} · {param_count(L.model):,} parametri · http://127.0.0.1:{a.port} · date: {a.data}', flush=True)
    try: srv.serve_forever()
    except KeyboardInterrupt:
        L.stop = True; time.sleep(1); L.save()


if __name__ == '__main__':
    main()
