"""Proves on YOUR machine, before any long training, that V14 really learns and speaks on the chosen device.
python selftest.py --device cuda [--data-file path.parquet]      exit code 0 = OK"""
import argparse, math, os, sys, time
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model import LoopGraph, Q_TOK, A_TOK, E_TOK, param_count
from data import Stream, load_pairs

ap = argparse.ArgumentParser(); ap.add_argument('--device', default='cuda'); ap.add_argument('--data-file', default='')
a = ap.parse_args()
if a.device == 'cuda' and not torch.cuda.is_available():
    print('CUDA indisponibil: torch.cuda.is_available() = False'); sys.exit(2)
dev = torch.device(a.device); print('dispozitiv:', torch.cuda.get_device_name(0) if dev.type == 'cuda' else 'CPU', '· torch', torch.__version__)
torch.manual_seed(0)
# 1) learning: it must memorise two tiny conversations (answer bits/byte must fall a lot)
pairs = [('What is two plus two?', 'Four.'), ('What colour is the sky?', 'Blue.')] * 8
m = LoopGraph(levels=4, units=64).to(dev); opt = torch.optim.AdamW(m.parameters(), lr=3e-3); print('parametri (test):', param_count(m))
S = Stream(pairs, B=8, T=48, seed=0); h = m.init_state(8, dev); first = None; t0 = time.time()
for step in range(300):
    x, y, mk, r, shp = S.next(); T_ = lambda v, dt=torch.long: torch.tensor(v, device=dev, dtype=dt)
    Hs, h2 = m.run(T_(x), h, noise=0.02, reset=T_(r, torch.float32)); logp, pi = m.speak(Hs)
    nll = -logp.gather(-1, T_(y).unsqueeze(-1)).squeeze(-1); mk_ = T_(mk, torch.float32); loss = (nll * mk_).sum() / mk_.sum().clamp(min=1)
    if shp:
        bi = torch.tensor([s[0] for s in shp], device=dev); ti = torch.tensor([s[1] for s in shp], device=dev)
        lp, bp = m.shape(Hs[bi, ti]); loss = loss + 0.2 * (torch.nn.functional.mse_loss(lp, torch.tensor([s[2] for s in shp], device=dev, dtype=torch.float32)) * .1
                                                   + torch.nn.functional.binary_cross_entropy_with_logits(bp, torch.tensor(np.stack([s[3] for s in shp]), device=dev)))
    opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); h = h2.detach()
    if first is None: first = float(loss) / math.log(2)
last = float(loss) / math.log(2); print(f'învățare: {first:.2f} → {last:.2f} biți/byte în 300 de pași ({time.time() - t0:.1f} s)')
ok_learn = last < 0.5 * first
# 2) speaking: greedy answer to a question it has learned
with torch.no_grad():
    q = list('What is two plus two?'.encode()); x = torch.tensor([[Q_TOK] + q + [A_TOK]], device=dev); h = m.init_state(1, dev); _, h = m.run(x, h); out = []
    for _ in range(20):
        lp, _ = m.speak(h.unsqueeze(1)); nb = int(lp[0, 0].argmax());
        if nb == E_TOK: break
        if nb < 256: out.append(nb)
        _, h = m.run(torch.tensor([[nb]], device=dev), h)
ans = bytes(out).decode('utf-8', 'replace'); print('răspuns la "What is two plus two?":', repr(ans))
ok_speak = 'Four' in ans
print('a răspuns corect' if ok_speak else 'încă nu răspunde exact (testul cere doar ca învățarea să funcționeze)')
# 3) the real file: structure
if a.data_file and os.path.exists(a.data_file):
    P = load_pairs(a.data_file, limit=50); print(f'fișierul tău: {len(P)} conversații citite din primele rânduri; exemplu de întrebare: {P[0][0][:120]!r}'); print(f'                               începutul răspunsului: {P[0][1][:120]!r}')
print('SELFTEST', 'OK' if ok_learn else 'EȘUAT'); sys.exit(0 if ok_learn else 1)
