"""Exact full-depth CUDA suffix-array prefix search for ORIGINAL V17 TextCard.

Original Index.align() does two binary searches for EACH context depth 1..64,
repeatedly synchronizing the GPU with the CPU through bool(tensor.any()).
This evaluates the exact same lexicographic comparisons across all depths and
both binary-search boundaries simultaneously on the selected PyTorch device.

No approximate hashing, no ignored levels, no limited context, no dropped
imagination/variant/trust computations; original V17 TextCard calls this from
its *existing* _proposals() function. It is a kernel-launch consolidation,
not a replacement learner.

A 1000-seed CPU-Torch reference-vs-fused exact range comparison precedes use.
"""

import math
import torch


def exact_prefix_ranges(index, ctx, maxK):
    if not isinstance(ctx, torch.Tensor):
        raise TypeError("Full-depth CUDA prefix fusion requires a real torch tensor")
    K = int(maxK)
    Q = int(ctx.shape[0])
    n = int(index.n)
    if K <= 0 or n <= 0:
        raise ValueError("Index prefix fusion requires positive memory and depth")
    if not Q:
        blank = ctx.new_zeros((Q, K), dtype=torch.int64)
        return blank, blank.clone()
    device = ctx.device
    low = torch.zeros((2, Q, K), dtype=torch.int64, device=device)
    high = torch.full_like(low, n)
    offsets = torch.arange(K, dtype=torch.int64, device=device)
    lengths = offsets + 1
    query = ctx[None, :, None, :]
    search_upper = torch.tensor([False, True], device=device)[:, None, None]
    for _ in range(max(1, math.ceil(math.log2(n + 1)) + 1)):
        mid = (low + high) // 2
        starts = index.sa[mid.clamp(0, n - 1)]
        pos = starts[..., None] + offsets
        candidate = torch.where(pos < n,
                                index.R[pos.clamp(0, n - 1)],
                                torch.full_like(pos, -1))
        mismatch = ((candidate != query) &
                    (offsets[None, None, None, :] <
                     lengths[None, None, :, None]))
        first = torch.where(mismatch, offsets[None, None, None, :], K).amin(-1)
        equal = first == K
        at = first.clamp(max=K - 1).unsqueeze(-1)
        a = candidate.gather(-1, at).squeeze(-1)
        b = query.expand(2, -1, K, -1).gather(-1, at).squeeze(-1)
        go = low < high
        advance = go & (((~equal) & (a < b)) | (equal & search_upper))
        low = torch.where(advance, mid + 1, low)
        high = torch.where(go & ~advance, mid, high)
    lower, upper = low[0], low[1]
    valid = (ctx >= 0).long().cumprod(1) > 0
    matched = (upper > lower) & valid
    previous = torch.cummax(torch.where(matched, lower, 0), dim=1).values
    # Exact original early-stop semantics: an unmatched prefix writes its
    # previous range once; a missing context sentinel halts immediately.
    valid_lengths = valid.long().sum(dim=1)
    matched_lengths = matched.long().sum(dim=1)
    processed = torch.minimum(valid_lengths, matched_lengths + 1).max()
    active = offsets[None, :] < processed
    LO = torch.where(active, previous, torch.zeros_like(previous))
    HI = torch.where(matched, upper, LO)
    HI = torch.where(active, HI, torch.zeros_like(HI))
    return LO, HI
