"""V41: ACTUAL CUDA end-to-end prefix alignment benchmark, unchanged model math.

The reference is the exact immutable V40 Git blob, not an unrelated toy model.
This tests formerly catastrophic CUDA host synchronizations past context depth 8
and verifies identical full LO/HI tensors, not just one scalar accuracy.

Examples are drawn from a real repository text document. Repeated long
contexts test the slow >8-character CPU↔GPU search branch explicitly.
Use only the dedicated original V17 CUDA Python environment.
No original checkpoint, experiment, model or dataset is modified.
"""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import time
import types

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
GPU = ROOT / "transcend" / "torus-aether" / "gpu"
sys.path.insert(0, str(GPU))
import text_gpu as current

BASELINE_BLOB = "ce9c2bd5150c71c66665c19a8260572a8a2c9d62"
reference_text = subprocess.run(
    ["git", "-C", str(ROOT.parent), "cat-file", "blob", BASELINE_BLOB],
    check=True, capture_output=True, text=True,
).stdout
assert "class Index:" in reference_text
reference = types.ModuleType("v40_exact_gpu_text_reference")
exec(compile(reference_text, "V40_GPU_TEXT_EXACT.py", "exec"), reference.__dict__)
assert reference.Index is not current.Index

try:
    import torch
except ImportError as exc:
    print("V41_NO_TORCH_CUDA_AVAILABLE", str(exc), flush=True)
    raise SystemExit(2)

if not torch.cuda.is_available():
    print("V41_NO_CUDA_GPU_AVAILABLE; test skipped, never treated as performance PASS", flush=True)
    raise SystemExit(77)
device = sys.argv[1] if len(sys.argv) > 1 else "cuda:0"
assert device.startswith("cuda")

document = (ROOT / "docs" / "TORUS_AETHER_ABC_20261104.md").read_text(encoding="utf-8")
data = np.array([c if c in (9, 10) or 32 <= c < 127 else 63
                 for c in map(ord, document)], dtype=np.int64)
assert len(data) > 512

# Real text patterns and genuinely repeated long-pattern memories, necessary
# to force exact suffix alignments beyond the old first-8 optimized bytes.
patterns = data[:2048]
memory = np.concatenate([patterns] * 3)
sample_positions = [256 + i * 17 for i in range(96)]
ctx = np.full((len(sample_positions), 64), -2, dtype=np.int64)
for j, pos in enumerate(sample_positions):
    ctx[j] = memory[pos-64:pos][::-1]
print("V41_CUDA_BENCHMARK_INPUT", json.dumps({
    "device": device, "document_source": "real_repo_text",
    "memory_chars": len(memory), "queries": len(ctx),
    "forced_context_depth": 64, "baseline_blob": BASELINE_BLOB
}), flush=True)

def run(IndexClass, XClass, repeats=2):
    X = XClass(device)
    idx = IndexClass(X, X.arr(memory))
    c = X.arr(ctx)
    times = []
    ans = None
    for _ in range(repeats):
        torch.cuda.synchronize()
        start = time.perf_counter()
        lo, hi = idx.align(X, c, 64)
        torch.cuda.synchronize()
        times.append((time.perf_counter() - start) * 1000)
        ans = (lo.cpu().numpy(), hi.cpu().numpy())
    return float(min(times)), ans

old_ms, baseline = run(reference.Index, reference.X, repeats=2)
new_ms, optimized = run(current.Index, current.X, repeats=2)
assert np.array_equal(baseline[0], optimized[0]), "V41 CUDA LO mismatches V40 original"
assert np.array_equal(baseline[1], optimized[1]), "V41 CUDA HI mismatches V40 original"
assert np.count_nonzero(optimized[1][:, 8] > optimized[0][:, 8]) > 0, \
    "Test failed to exercise real >8-byte matches"
print("V41_CUDA_GPU_EXACT_PREFIX_PASS", json.dumps({
    "original_index_ms": round(old_ms, 2),
    "optimized_index_ms": round(new_ms, 2),
    "real_speedup": round(old_ms / new_ms, 3) if new_ms > 0 else None,
    "same_LO_HI_every_depth": True,
    "source": "V40 immutable Git blob",
    "real_cuda": True
}), flush=True)
