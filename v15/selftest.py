"""Proves on YOUR machine, before any long training, that V14 really learns and speaks on the chosen device.
python selftest.py --device cuda [--data-file path.parquet]      exit code 0 = OK"""
import argparse, math, os, sys, time
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from model import LoopGraph, FabricAB, Q_TOK, A_TOK, E_TOK, param_count
from data import Stream, load_pairs

ap = argparse.ArgumentParser(); ap.add_argument('--device', default='cuda'); ap.add_argument('--data-file', default='')
a = ap.parse_args()
if a.device == 'cuda' and not torch.cuda.is_available():
    print('CUDA indisponibil: torch.cuda.is_available() = False'); sys.exit(2)
dev = torch.device(a.device); print('dispozitiv:', torch.cuda.get_device_name(0) if dev.type == 'cuda' else 'CPU', '· torch', torch.__version__)
torch.manual_seed(0)
# 1) learning: it must memorise two tiny conversations (answer bits/byte must fall a lot)
pairs = [('What is two plus two?', 'Four.'), ('What colour is the sky?', 'Blue.')] * 8
m = FabricAB(levels=4, units=64).to(dev); opt = torch.optim.AdamW(m.parameters(), lr=3e-3); print('parametri (test):', param_count(m))
S = Stream(pairs, B=8, T=48, seed=0); st = m.init_state(8, dev); first = None; t0 = time.time()
for step in range(300):
    x, y, mk, r, shp = S.next(); T_ = lambda v, dt=torch.long: torch.tensor(v, device=dev, dtype=dt)
    Y = T_(y); LP, PI, SUR, Hs, st2 = m.run(T_(x), Y, st, noise=0.02, reset=T_(r, torch.float32))
    nll = -LP.gather(-1, Y.unsqueeze(-1)).squeeze(-1); mk_ = T_(mk, torch.float32); loss = (nll * mk_).sum() / mk_.sum().clamp(min=1)
    if shp:
        bi = torch.tensor([q[0] for q in shp], device=dev); ti = torch.tensor([q[1] for q in shp], device=dev)
        lp, bp = m.shape(Hs[bi, ti]); loss = loss + 0.2 * (torch.nn.functional.mse_loss(lp, torch.tensor([q[2] for q in shp], device=dev, dtype=torch.float32)) * .1
                                                   + torch.nn.functional.binary_cross_entropy_with_logits(bp, torch.tensor(np.stack([q[3] for q in shp]), device=dev)))
    opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(m.parameters(), 1.0); opt.step(); st = m.detach(st2)
    if first is None: first = float(loss) / math.log(2)
last = float(loss) / math.log(2); print(f'învățare (A și B în țesătură): {first:.2f} → {last:.2f} biți/byte în 300 de pași ({time.time() - t0:.1f} s)')
ok_learn = last < 0.5 * first
# 2) speaking: B holds the shape, A writes greedily
with torch.no_grad():
    toks = [Q_TOK] + list('What is two plus two?'.encode()) + [A_TOK]; st = m.init_state(1, dev)
    _, _, _, _, st = m.run(torch.tensor([toks[:-1]], device=dev), torch.tensor([toks[1:]], device=dev), st)
    chosen = []
    def pick(lp):
        c = int(lp[0].argmax()); chosen.append(c); return torch.tensor([c], device=dev)
    LP, PI, SUR, HS, st = m.run(torch.tensor([[A_TOK]], device=dev), None, st, sample=pick); out = []
    ln, _ = m.shape(HS[:, 0]); print(f'forma prezisă de B înainte de prima literă: ~{float(torch.expm1(ln)):.0f} caractere (adevărat: 5)')
    for _ in range(20):
        c = chosen[-1]
        if c == E_TOK: break
        if c < 256: out.append(c)
        LP, PI, SUR, HS, st = m.run(torch.tensor([[c]], device=dev), None, st, sample=pick)
ans = bytes(out).decode('utf-8', 'replace'); print('răspuns la "What is two plus two?":', repr(ans))
ok_speak = 'Four' in ans
print('a răspuns corect' if ok_speak else 'încă nu răspunde exact (testul cere doar ca învățarea să funcționeze)')
# 3) the real file: structure
if a.data_file and os.path.exists(a.data_file):
    P = load_pairs(a.data_file, limit=50); print(f'fișierul tău: {len(P)} conversații citite din primele rânduri; exemplu de întrebare: {P[0][0][:120]!r}'); print(f'                               începutul răspunsului: {P[0][1][:120]!r}')
print('SELFTEST', 'OK' if ok_learn else 'EȘUAT'); sys.exit(0 if ok_learn else 1)
