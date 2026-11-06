"""Opt-in real PyTorch shared latent transition learner for observed V17 worlds.

One online model per V17 GPU worker. No simulator oracle or held-out target is input.
Hashing preserves observable distinctions, but does NOT discover language semantics.
"""
from __future__ import annotations
import hashlib
import json
import os
from pathlib import Path
import tempfile

import torch
from torch import nn
from torch.nn import functional as F

FEATURES = 128
ACTIONS = 32
LATENT = 32
VERSION = 1
DOMAINS = ('maze', 'transform', 'text')


def _hash(value: str) -> int:
    return int.from_bytes(hashlib.blake2s(value.encode('utf-8', errors='replace'), digest_size=4).digest(), 'little')


def state_features(state):
    if not isinstance(state, (list, str)):
        raise ValueError('state must be a sequence of observed symbols or a text')
    values = list(state)[:4096]
    out = [0.0] * FEATURES
    for i, v in enumerate(values):
        s = str(v)[:96]
        h = _hash(f'{i % 1024}:{s}')
        out[h % FEATURES] += 1.0 if h & 1 else -1.0
        if i:
            h = _hash(f'b:{values[i-1]}:{s}')
            out[h % FEATURES] += .25 if h & 1 else -.25
    out[0] += min(len(values), 4096) / 4096
    norm = sum(v*v for v in out)**.5
    return [v / norm for v in out] if norm else out


def action_features(action, domain, context=''):
    if domain not in DOMAINS:
        raise ValueError('unknown domain')
    out = [0.0] * ACTIONS
    # A shared projection is trained across worlds. Domain is visible context,
    # not a privileged rule or a supplied matching between different actions.
    for tag in (f'action:{action}', f'domain:{domain}', f'context:{str(context)[:64]}'):
        h = _hash(tag)
        out[h % ACTIONS] += 1.0 if h & 1 else -1.0
    norm = sum(v*v for v in out)**.5
    return [v / norm for v in out] if norm else out


class SharedModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = nn.Sequential(nn.Linear(FEATURES, 64), nn.SiLU(), nn.Linear(64, LATENT))
        self.transition = nn.Sequential(nn.Linear(LATENT + ACTIONS, 96), nn.SiLU(), nn.Linear(96, LATENT))
        self.decoder = nn.Sequential(nn.Linear(LATENT, 64), nn.SiLU(), nn.Linear(64, FEATURES))

    def forward(self, before, action):
        z = self.encoder(before)
        z_next = z + self.transition(torch.cat((z, action), dim=-1))
        return z, z_next, self.decoder(z_next)


class SharedPerspective:
    def __init__(self, device='cpu', seed=11):
        if str(device).startswith('cuda') and not torch.cuda.is_available():
            raise RuntimeError('CUDA was requested but PyTorch CUDA is unavailable; no silent CPU fallback')
        self.device = torch.device(device)
        torch.manual_seed(seed)
        self.model = SharedModel().to(self.device)
        self.optimizer = torch.optim.Adam(self.model.parameters(), lr=.0009)
        self.steps = 0
        self.seen = 0
        self.counts = {d: 0 for d in DOMAINS}
        self.last = None

    def _pack(self, samples):
        if not 1 <= len(samples) <= 512:
            raise ValueError('Expected 1-512 observed transitions')
        for s in samples:
            if s.get('domain') not in DOMAINS or not isinstance(s.get('action'), str):
                raise ValueError('malformed domain or action')
            if not isinstance(s.get('before'), (str, list)) or not isinstance(s.get('after'), (str, list)):
                raise ValueError('malformed observed state')
            if any(key in s for key in ('oracle', 'optimal', 'answer', 'reference', 'solution')):
                raise ValueError('oracle or reference leaked into shared trainer input')
        xs = torch.tensor([state_features(s['before']) for s in samples], dtype=torch.float32, device=self.device)
        ys = torch.tensor([state_features(s['after']) for s in samples], dtype=torch.float32, device=self.device)
        actions = torch.tensor([action_features(s['action'], s['domain'], s.get('context', '')) for s in samples], dtype=torch.float32, device=self.device)
        return xs, actions, ys

    @staticmethod
    def _trace(model, xs, actions, ys, sample):
        with torch.no_grad():
            za, zp, pred = model(xs[:1], actions[:1])
            zy = model.encoder(ys[:1])
        return {'domain': sample['domain'], 'action': sample['action'],
                'before': [round(float(v), 5) for v in za[0].detach().cpu().tolist()],
                'predicted': [round(float(v), 5) for v in zp[0].detach().cpu().tolist()],
                'observed': [round(float(v), 5) for v in zy[0].detach().cpu().tolist()],
                'predictedError': round(float(F.mse_loss(pred, ys[:1]).item()), 7),
                'projection': 'trained 32D model latents, coordinates 0/1 displayed; not intrinsic 4D/5D geometry'}

    def evaluate(self, samples):
        self.model.eval()
        xs, actions, ys = self._pack(samples)
        with torch.no_grad():
            _, zp, pred = self.model(xs, actions)
            per = (pred - ys).square().mean(dim=1)
            before_err = (xs - ys).square().mean(dim=1)
        summary = {'examples': len(samples), 'loss': round(float(per.mean().item()), 7),
                   'identityBaselineLoss': round(float(before_err.mean().item()), 7),
                   'perDomain': {d: round(float(per[torch.tensor([s['domain']==d for s in samples],device=self.device)].mean().item()),7)
                                 for d in DOMAINS if any(s['domain'] == d for s in samples)},
                   'steps': self.steps, 'updates': False}
        return summary

    def train(self, samples):
        xs, actions, ys = self._pack(samples)
        # The pre-update error is a genuine pre-action model prediction, compared
        # only after observing the actual successor. It is NOT a held-out score.
        pre = self.evaluate(samples)
        self.model.train()
        z, zp, pred = self.model(xs, actions)
        target_z = self.model.encoder(ys).detach()
        reconstruction = self.model.decoder(z)
        loss = F.mse_loss(pred, ys) + .2 * F.mse_loss(zp, target_z) + .12 * F.mse_loss(reconstruction, xs)
        self.optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.)
        self.optimizer.step()
        self.steps += 1
        self.seen += len(samples)
        for s in samples:
            self.counts[s['domain']] += 1
        self.last = {'batch': len(samples), 'device': str(self.device), 'step': self.steps,
                     'preUpdatePredictionLoss': pre['loss'], 'identityBaselineLoss': pre['identityBaselineLoss'],
                     'trainingObjective': round(float(loss.item()), 7), 'domains': dict(self.counts),
                     'trace': self._trace(self.model, xs, actions, ys, samples[0])}
        return self.last

    def save(self, filename):
        if not filename or not isinstance(filename, str):
            raise ValueError('checkpoint path required')
        dest = Path(filename)
        dest.parent.mkdir(parents=True, exist_ok=True)
        temp = dest.with_name(dest.name + '.tmp-' + str(os.getpid()))
        payload = {'version': VERSION, 'weights': self.model.state_dict(), 'optimizer': self.optimizer.state_dict(),
                   'steps': self.steps, 'seen': self.seen, 'counts': self.counts}
        try:
            torch.save(payload, str(temp))
            os.replace(str(temp), str(dest))
        finally:
            if temp.exists():
                temp.unlink()
        return {'saved': True, 'steps': self.steps, 'fileBytes': dest.stat().st_size}

    def load(self, filename):
        if not os.path.isfile(filename):
            return {'loaded': False, 'steps': self.steps}
        # weights_only=True rejects arbitrary pickled classes while accepting tensor dictionaries.
        payload = torch.load(filename, map_location=self.device, weights_only=True)
        if payload.get('version') != VERSION:
            raise ValueError('unknown shared checkpoint format')
        self.model.load_state_dict(payload['weights'])
        self.optimizer.load_state_dict(payload['optimizer'])
        self.steps = int(payload['steps'])
        self.seen = int(payload['seen'])
        self.counts = dict(payload['counts'])
        return {'loaded': True, 'steps': self.steps, 'seen': self.seen}

if __name__ == '__main__':
    import sys
    if len(sys.argv) != 3 or sys.argv[1] != '--selftest':
        raise SystemExit('Usage: python shared_perspective.py --selftest cpu|cuda:0')
    requested = sys.argv[2]
    model = SharedPerspective(requested, seed=23)
    row = {'domain': 'maze', 'before': [1, 2, 3, 4], 'after': [1, 3, 2, 4], 'action': 'output:2', 'context': 'grid:2'}
    result = model.train([row])
    if requested.startswith('cuda'):
        torch.cuda.synchronize(model.device)
        assert str(next(model.model.parameters()).device).startswith('cuda')
    assert result['step'] == 1 and result['device'] == str(model.device)
    print(json.dumps({'selftest': 'PASS', 'requested': requested, 'computed': result['device'], 'loss': result['trainingObjective']}))
