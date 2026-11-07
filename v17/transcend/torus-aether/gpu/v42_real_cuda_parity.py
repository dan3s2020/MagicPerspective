"""V42 real original CUDA hot-path equivalence and stage-matched speed audit.

Run:
  python v17/transcend/torus-aether/gpu/v42_real_cuda_parity.py --require-cuda
No fake GPU result: exits 77 without CUDA. Uses V41 immutable Git blob
and the SAME original TextCard / Index / full imagination and trust weights.
Nothing is written to a checkpoint or to the real training data directory.
"""
from __future__ import annotations
import argparse
import json
import subprocess
import sys
import time
import types
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
sys.path.insert(0, str(HERE))
import text_gpu as current

V41_BLOB = "829a982570da76d102c3cb9597cfe5dab877239b"
text = subprocess.run(["git", "-C", str(REPO), "cat-file", "blob", V41_BLOB],
                      capture_output=True, text=True, check=True).stdout
assert "class TextCard:" in text and "def _top(self, ys)" in text
v41 = types.ModuleType("immutable_original_v41_text_gpu")
exec(compile(text, f"git_blob_{V41_BLOB}.py", "exec"), v41.__dict__)
assert v41.TextCard is not current.TextCard

def source_bytes():
    document = (REPO / "v17" / "docs" / "TORUS_AETHER_ABC_20261104.md").read_text(encoding="utf-8")
    vals = [ord(c) if c in "\t\n" or 32 <= ord(c) < 127 else 63 for c in document]
    assert len(vals) >= 512, "Genuine repository source has been unexpectedly truncated"
    return np.asarray(vals, dtype=np.int64)

def histogram_test(device):
    import torch
    gen = torch.Generator(device="cpu").manual_seed(20261107)
    ys_cpu = torch.randint(-1, 129, (67, 64), generator=gen, dtype=torch.int64)
    ys_cpu[0] = -1
    ys_cpu[1] = 48
    ys_cpu[2] = 0
    ys_cpu[3, :32] = 35
    ys_cpu[3, 32:] = 36  # exact 32/32 tie: original lower-symbol tie-break
    ys = ys_cpu.to(device)
    original = v41.TextCard(device, S=64)._top(ys)
    optimized = current.TextCard(device, S=64)._top(ys)
    assert torch.equal(original, optimized), "V42 changed the original class-vote histogram or tie-break"
    return {"cases": len(ys_cpu), "samplesPerCase": 64, "exactAllTopVotes": True}

def real_lived_batch(cls, device, memory, exercise):
    card = cls(device, maxK=64, S=64, max_memory=2048)
    # Real memory from an existing repository document, not a toy new learner.
    card.append([memory[:640]])
    def progress(done, total, phase):
        pass
    if device.startswith("cuda"):
        import torch
        torch.cuda.synchronize()
    t0 = time.perf_counter()
    result = card.live([exercise], [], g=8.0, formW=1.0,
                       variants=[(6.0, 1.0), (8.0, 0.5)],
                       chunk=128, progress=progress)
    if device.startswith("cuda"):
        import torch
        torch.cuda.synchronize()
    duration = (time.perf_counter() - t0) * 1000
    return duration, result, card.X.tonp(card.mem).copy()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-cuda", action="store_true")
    parser.add_argument("--device", default="auto", choices=["auto", "cuda:0", "numpy", "cpu"])
    args = parser.parse_args()
    try:
        import torch
        cuda = torch.cuda.is_available()
    except ImportError:
        cuda = False
    if args.require_cuda and not cuda:
        print("V42_PHYSICAL_CUDA_UNAVAILABLE: no hardware acceptance test, NOT A GPU PASS", flush=True)
        return 77
    device = ("cuda:0" if cuda else "numpy") if args.device == "auto" else args.device
    if device.startswith("cuda") and not cuda:
        print("V42_PHYSICAL_CUDA_UNAVAILABLE: no fallback to fake CUDA", flush=True)
        return 77
    memory = source_bytes()
    exercise = memory[64:320].copy()
    print("V42_SOURCE_AND_DEVICE", json.dumps({
        "source": "original_repo_document",
        "sourceChars": len(memory), "trainingExerciseChars": len(exercise),
        "actualDevice": device, "cudaAvailable": cuda,
        "immutableV41GitBlob": V41_BLOB,
        "noSimulatedCuda": True,
    }), flush=True)
    if device != "numpy":
        hist = histogram_test(device)
        print("V42_ORIGINAL_EXACT_GPU_VOTE_PARITY", json.dumps(hist), flush=True)
    old_ms, old, old_mem = real_lived_batch(v41.TextCard, device, memory, exercise)
    new_ms, new, new_mem = real_lived_batch(current.TextCard, device, memory, exercise)
    assert old == new, (
        "V42 changed exact native original alignment or imagination trust: " +
        json.dumps({"old": old, "new": new})[:3000]
    )
    assert np.array_equal(old_mem, new_mem), "Original retained text-card memory changed"
    print("V42_ORIGINAL_FULL_TEXTCARD_PARITY", json.dumps({
        "sameNativeTrustCounters": True, "sameCorrectHits": True,
        "sameSixVariantOriginalRule": True, "sameImaginationTrust": True,
        "sameIndexedMemory": True,
        "oldMillis": round(old_ms, 3),
        "newMillis": round(new_ms, 3),
        "actualSpeedup": round(old_ms / new_ms, 4) if new_ms else None,
        "realCuda": device.startswith("cuda"),
        "notEndToEndGpuVsCpu": True,
        "noSkippedTrainingMechanism": True
    }), flush=True)
    if device.startswith("cuda"):
        print("V42_ACTUAL_CUDA_PASS: exact same original learned trust and hits, on real GPU", flush=True)
    else:
        print("V42_CPU_REFERENCE_PASS: CUDA speedup NOT VERIFIED on this device", flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
