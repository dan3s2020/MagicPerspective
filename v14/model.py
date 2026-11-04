"""MagicPerspective V14 — the loop graph that learns to speak.

ONE graph, the same for every training example and every conversation:
  * 256 byte nodes + 3 markers (question / answer / end) — the label nodes through which any text enters and leaves;
  * L levels of perspective, α … Ω, each a block of units. α changes every byte; every next level changes more slowly
    (α sees the last byte, Ω carries the widest context);
  * edges: every level talks to itself and to its two neighbours on a RING, so α and Ω are neighbours —
    what happens at α re-enters Ω and Ω bends what α does next (the loop of V13, here learned end to end);
  * the view: at every byte the network chooses from which levels it speaks (π over α … Ω, the position θ of V13);
  * noise: Gaussian noise inside the latent state (training: regularisation; speaking: the "hallucination" knob);
  * the shape of the solution (messages 37, 53): after reading the question and BEFORE writing the first byte of the answer,
    the network predicts the shape of its answer — its length and which bytes it will use — and the teacher gives the
    exact error of that prediction during training.
"""
import math
import torch
import torch.nn as nn
import torch.nn.functional as F

Q_TOK, A_TOK, E_TOK = 256, 257, 258
VOCAB = 259


class LoopGraph(nn.Module):
    def __init__(self, levels=6, units=192, emb=128):
        super().__init__()
        self.L, self.U = levels, units
        H = levels * units
        self.emb = nn.Embedding(VOCAB, emb)                      # the byte nodes
        self.inp = nn.Linear(emb, units)                         # the text enters at α
        self.W = nn.Parameter(torch.randn(H, H) / math.sqrt(3 * units))
        self.b = nn.Parameter(torch.zeros(H))
        m = torch.zeros(H, H)
        for i in range(levels):                                  # ring of scales: i talks with i-1, i, i+1 (mod L)
            for j in (i - 1, i, i + 1):
                j %= levels
                m[i * units:(i + 1) * units, j * units:(j + 1) * units] = 1
        self.register_buffer('mask', m)
        leak = torch.cat([torch.full((units,), 2.0 ** -l) for l in range(levels)])   # α = 1 … Ω = 1/32
        self.register_buffer('leak', leak)
        self.view = nn.Linear(H, levels)                         # from which levels it speaks now
        self.readW = nn.Parameter(torch.randn(levels, units, VOCAB) / math.sqrt(units))   # each level's own reading
        self.readb = nn.Parameter(torch.zeros(levels, VOCAB))
        self.shape_len = nn.Linear(H, 1)                         # shape of the answer: log length
        self.shape_bag = nn.Linear(H, 256)                       # shape of the answer: which bytes it will contain

    def init_state(self, B, device):
        return torch.zeros(B, self.L * self.U, device=device)

    def run(self, x, h, noise=0.0, reset=None):
        """x: (B,T) tokens. Returns per-step states (B,T,H) and the final state. reset: (B,T) 1 where a new episode starts."""
        Wm = (self.W * self.mask).t()
        e = self.inp(self.emb(x))                                # (B,T,U)
        B, T = x.shape
        outs = []
        for t in range(T):
            if reset is not None:
                h = h * (1 - reset[:, t:t + 1])
            pre = h @ Wm + self.b
            pre = torch.cat([pre[:, :self.U] + e[:, t], pre[:, self.U:]], 1)
            new = torch.tanh(pre)
            if noise > 0:
                new = new + noise * torch.randn_like(new)
            h = (1 - self.leak) * h + self.leak * new
            outs.append(h)
        return torch.stack(outs, 1), h

    def speak(self, Hs):
        """Hs (B,T,H) -> log-probabilities of the next byte (B,T,V) and the view π (B,T,L)."""
        B, T, H = Hs.shape
        logpi = F.log_softmax(self.view(Hs), -1)                                   # (B,T,L)
        per = torch.einsum('btlu,luv->btlv', Hs.reshape(B, T, self.L, self.U), self.readW) + self.readb   # (B,T,L,V)
        logp = torch.logsumexp(logpi.unsqueeze(-1) + F.log_softmax(per, -1), 2)    # mixture of the levels' views
        return logp, logpi.exp()

    def shape(self, h):
        return self.shape_len(h).squeeze(-1), self.shape_bag(h)


def param_count(m):
    return sum(p.numel() for p in m.parameters())
