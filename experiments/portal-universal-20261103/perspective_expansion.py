"""Opt-in, learnable multiscale expansion of Portal's real GNN activations.

This is a classical neural system, not a quantum effect or physical extra dimension.
Existing fixed-size GNN paths are unchanged while this module is disabled.
"""
from __future__ import annotations
import torch
from torch import nn
import torch.nn.functional as F


class ExpansionScale(nn.Module):
    """Local -> macro -> local coupling with new trainable channels."""
    def __init__(self, input_dim: int, growth: int):
        super().__init__()
        self.local = nn.Linear(input_dim, growth)
        self.macro = nn.Linear(input_dim, growth, bias=False)
        self.return_to_local = nn.Linear(growth, input_dim, bias=False)

    def forward(self, h, mask, local_noise=None, shared_noise=None):
        divisor = mask.sum(dim=1, keepdim=True).clamp(min=1)
        macro = (h * mask).sum(dim=1, keepdim=True) / divisor
        preactivation = self.local(h) + self.macro(macro)
        if local_noise is not None:
            preactivation = preactivation + local_noise
        if shared_noise is not None:
            preactivation = preactivation + shared_noise
        grown = torch.tanh(preactivation) * mask
        collective = grown.sum(dim=1, keepdim=True) / divisor
        feedback = 0.1 * torch.tanh(self.return_to_local(collective))
        h = (h + feedback) * mask
        coarse_grown = torch.tanh(self.local(macro) + self.macro(macro))
        consistency = F.mse_loss(collective, coarse_grown)
        return torch.cat((h, grown), dim=-1), consistency


class PerspectiveExpansion(nn.Module):
    """Bounded rank-growing perspective module, trained from real outcomes.

    Additional channels are learned from local and collective states. The
    active rank may be increased by a separately validated decision. There
    is no claim of physical dimensionality or infinite memory.
    """
    def __init__(self, dim=24, growth=4, max_levels=3, active_levels=1,
                 seed=2917, local_noise=0.0, shared_noise=0.0):
        super().__init__()
        if dim < 1 or growth < 1 or not 1 <= max_levels <= 8:
            raise ValueError('Invalid perspective dimensions')
        if not 1 <= active_levels <= max_levels:
            raise ValueError('active_levels outside max_levels')
        if not 0 <= local_noise <= 0.5 or not 0 <= shared_noise <= 0.5:
            raise ValueError('noise intensity must be between 0 and 0.5')
        self.dim, self.growth, self.max_levels = dim, growth, max_levels
        self.seed = int(seed)
        self.local_noise = float(local_noise)
        self.shared_noise = float(shared_noise)
        self.register_buffer('active_levels', torch.tensor(active_levels, dtype=torch.int32))
        self.scales = nn.ModuleList([ExpansionScale(dim + growth*i, growth)
                                     for i in range(max_levels)])
        self.readout = nn.Linear(dim + growth*max_levels, dim, bias=False)
        nn.init.zeros_(self.readout.weight)
        self.self_error_head = nn.Linear(dim + growth*max_levels, 1)
        self.last_self_prediction = None
        self.last_consistency = None
        self.last_coordinates = None
        self.last_diagnostics = None

    def configuration(self):
        return {'dim': self.dim, 'growth': self.growth,
                'max_levels': self.max_levels,
                'active_levels': int(self.active_levels.item()),
                'seed': self.seed, 'local_noise': self.local_noise,
                'shared_noise': self.shared_noise}

    def increase_rank(self):
        """Promote only after external held-out acceptance; never automatically."""
        if int(self.active_levels) >= self.max_levels:
            return False
        self.active_levels.add_(1)
        return True

    def _noise(self, h, step, stage):
        if not self.training or (not self.local_noise and not self.shared_noise):
            return None, None
        gen = torch.Generator(device=h.device)
        gen.manual_seed((self.seed + int(step)*104729 + stage*8191) % (2**63-1))
        b, n = h.shape[:2]
        local = (torch.randn((b,n,self.growth),generator=gen,device=h.device,dtype=h.dtype)
                 * self.local_noise) if self.local_noise else None
        shared = (torch.randn((b,1,self.growth),generator=gen,device=h.device,dtype=h.dtype)
                  * self.shared_noise) if self.shared_noise else None
        return local, shared

    def forward(self, h, mask, step=0, trace=False):
        if h.ndim != 3 or h.shape[-1] != self.dim or mask.shape != (*h.shape[:2],1):
            raise ValueError('Expected h[B,N,dim] and mask[B,N,1]')
        mask = mask.to(h.dtype)
        consistency = h.new_zeros(())
        active = int(self.active_levels.item())
        for i,scale in enumerate(self.scales):
            if i < active:
                local,shared = self._noise(h,step,i)
                h,loss = scale(h,mask,local,shared)
                consistency = consistency + loss
            else:
                h = torch.cat((h,h.new_zeros((*h.shape[:2],self.growth))),dim=-1)
        pooled = (h*mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
        added_context = self.readout(pooled)
        self_pred = torch.sigmoid(self.self_error_head(pooled)).squeeze(-1)
        self.last_self_prediction = self_pred
        self.last_consistency = consistency/active
        self.last_coordinates = h[:,:,self.dim:].detach() if trace else None
        if trace:
            added = h[:,:,self.dim:self.dim+active*self.growth].detach()
            norm = (added.square()*mask).sum().sqrt().item()
            self.last_diagnostics = {'active_levels':active,
                'learned_extra_dimensions':active*self.growth,
                'level_capacity':self.max_levels,'latent_norm':round(norm,6),
                'consistency_mse':round(float(self.last_consistency.detach()),8),
                'local_noise':self.local_noise,'shared_noise':self.shared_noise,
                'self_predicted_error':self_pred.detach().cpu().tolist()}
        else:
            self.last_diagnostics = None
        return added_context
