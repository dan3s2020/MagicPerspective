"""Array backend for V11. One code path: NumPy on CPU (Termux, tests) or PyTorch tensors on CUDA (Windows RTX).
Only a handful of operations are used, so both paths run the very same model code and the same hand-written gradients."""
import numpy as np


class NumpyBackend:
    name = 'cpu-numpy'
    def asarray(self, a, dtype='f'):
        return np.asarray(a, dtype=np.float32 if dtype == 'f' else np.int64)
    def zeros(self, shape): return np.zeros(shape, np.float32)
    def full(self, shape, v): return np.full(shape, v, np.float32)
    def randn(self, rng, shape, scale): return (rng.standard_normal(shape) * scale).astype(np.float32)
    def tanh(self, a): return np.tanh(a)
    def sigmoid(self, a): return 1.0 / (1.0 + np.exp(-np.clip(a, -30, 30)))
    def cat(self, xs, axis=1): return np.concatenate(xs, axis=axis)
    def scatter_add(self, n, idx, vals):
        out = np.zeros((n,) + vals.shape[1:], np.float32); np.add.at(out, idx, vals); return out
    def scatter_max(self, n, idx, vals):
        out = np.full((n,) + vals.shape[1:], -np.inf, np.float32); np.maximum.at(out, idx, vals)
        out[np.isinf(out)] = 0.0; return out
    def plan(self, n, idx):
        """Precomputed grouping of rows by target index (sorted once per batch; reduceat is much faster than ufunc.at)."""
        idx = np.asarray(idx, np.int64); order = np.argsort(idx, kind='stable'); si = idx[order]
        if len(si):
            starts = np.flatnonzero(np.r_[True, si[1:] != si[:-1]]); tgt = si[starts]
        else:
            starts = np.zeros(0, np.int64); tgt = starts
        return (n, order, starts, tgt)
    def sadd(self, pl, vals):
        n, order, starts, tgt = pl
        out = np.zeros((n,) + vals.shape[1:], np.float32)
        if len(order): out[tgt] = np.add.reduceat(vals[order], starts, axis=0)
        return out
    def smax(self, pl, vals):
        n, order, starts, tgt = pl
        out = np.zeros((n,) + vals.shape[1:], np.float32)
        if len(order): out[tgt] = np.maximum.reduceat(vals[order], starts, axis=0)
        return out
    def clip(self, a, lo, hi): return np.clip(a, lo, hi)
    def log(self, a): return np.log(a)
    def sqrt(self, a): return np.sqrt(a)
    def abs(self, a): return np.abs(a)
    def sum(self, a, axis=None): return a.sum(axis=axis)
    def to_numpy(self, a): return np.asarray(a)
    def eq(self, a, b): return (a == b).astype(np.float32)


class TorchBackend:
    """Same operations on torch tensors (no autograd: the gradients are the model's own hand-written ones)."""
    def __init__(self, device='cuda'):
        import torch
        self.t = torch; self.device = torch.device(device)
        self.name = f'{device}-torch' + (f' ({torch.cuda.get_device_name(0)})' if device.startswith('cuda') else '')
        torch.set_grad_enabled(False)
    def asarray(self, a, dtype='f'):
        t = self.t
        if isinstance(a, t.Tensor): return a.to(self.device, t.float32 if dtype == 'f' else t.int64)
        return t.as_tensor(np.asarray(a), dtype=t.float32 if dtype == 'f' else t.int64, device=self.device)
    def zeros(self, shape): return self.t.zeros(shape, dtype=self.t.float32, device=self.device)
    def full(self, shape, v): return self.t.full(shape, v, dtype=self.t.float32, device=self.device)
    def randn(self, rng, shape, scale): return self.asarray(rng.standard_normal(shape) * scale)
    def tanh(self, a): return self.t.tanh(a)
    def sigmoid(self, a): return self.t.sigmoid(a)
    def cat(self, xs, axis=1): return self.t.cat(xs, dim=axis)
    def scatter_add(self, n, idx, vals):
        out = self.t.zeros((n,) + tuple(vals.shape[1:]), dtype=vals.dtype, device=self.device); out.index_add_(0, idx, vals); return out
    def scatter_max(self, n, idx, vals):
        out = self.t.full((n,) + tuple(vals.shape[1:]), float('-inf'), dtype=vals.dtype, device=self.device)
        out.scatter_reduce_(0, idx.view(-1, *([1] * (vals.dim() - 1))).expand_as(vals), vals, reduce='amax', include_self=True)
        out[self.t.isinf(out)] = 0.0; return out
    def plan(self, n, idx):
        return (n, self.asarray(idx, 'i'))
    def sadd(self, pl, vals): return self.scatter_add(pl[0], pl[1], vals)
    def smax(self, pl, vals): return self.scatter_max(pl[0], pl[1], vals)
    def clip(self, a, lo, hi): return self.t.clamp(a, lo, hi)
    def log(self, a): return self.t.log(a)
    def sqrt(self, a): return self.t.sqrt(a)
    def abs(self, a): return self.t.abs(a)
    def sum(self, a, axis=None): return a.sum() if axis is None else a.sum(dim=axis)
    def to_numpy(self, a): return a.detach().float().cpu().numpy()
    def eq(self, a, b): return (a == b).float()


def make_backend(device='auto'):
    """'auto': CUDA if a working PyTorch+CUDA is present, otherwise NumPy. The chosen device is always reported, never hidden."""
    if device in ('auto', 'cuda'):
        try:
            import torch
            if torch.cuda.is_available():
                return TorchBackend('cuda')
            if device == 'cuda':
                raise RuntimeError('PyTorch is installed but torch.cuda.is_available() is False')
        except ImportError:
            if device == 'cuda':
                raise RuntimeError('CUDA requested but PyTorch is not installed')
    if device == 'torch-cpu':
        return TorchBackend('cpu')
    return NumpyBackend()
