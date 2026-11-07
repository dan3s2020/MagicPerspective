"""V32 end-to-end ORIGINAL CUDA TEXT training, not the old maze-only selftest.

Runs the real TextCard on an observed documentation fragment. The hardware
and PyTorch device must truly be CUDA. No original checkpoint is touched.
Checks exact ORIGINAL NumPy/torch predictions and the live GPU memory peak.
"""
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
from text_gpu import TextCard

device = sys.argv[1] if len(sys.argv) > 1 else "cuda:0"
if not device.startswith("cuda") or not torch.cuda.is_available():
    raise RuntimeError("V32 CUDA TEXT selftest requires an actual CUDA GPU")
print("V32_CUDA_TEXT_SELFTEST_START", json.dumps({
    "device":device,
    "torch":torch.__version__,
    "cuda":torch.version.cuda,
    "gpu":torch.cuda.get_device_name(torch.device(device)),
}), flush=True)
doc = Path(__file__).resolve().parents[3] / "docs" / "TORUS_AETHER_ABC_20261104.md"
raw = doc.read_text("utf-8")
source = [x if x in (9, 10) or 32 <= x < 127 else 63 for x in map(ord, raw)]
assert len(source) > 900
history = source[110:450]
unseen = source[510:810]
observed_steps = []

def on_progress(done, total, phase):
    # Prints REAL completed work and the exact phase, not a timer counter.
    observed_steps.append((phase, done, total))
    if len(observed_steps) % 6 == 0:
        print("V32_CUDA_TEXT_PHASE",json.dumps({
            "phase":phase,"done":done,"total":total
        }),flush=True)

def run(backend):
    model = TextCard(backend)
    model.append([history],progress=on_progress if backend==device else None)
    started=time.perf_counter()
    result=model.live([unseen],[],g=8.,formW=1.,
                      variants=[(6.,1.),(8.,1.)],
                      chunk=512,progress=on_progress if backend==device else None)
    elapsed=time.perf_counter()-started
    return model,result,elapsed

cpu,expect,ctime = run("numpy")
torch.cuda.reset_peak_memory_stats(torch.device(device))
gpu,got,gtime = run(device)
torch.cuda.synchronize(torch.device(device))
allocated = torch.cuda.max_memory_allocated(torch.device(device))
reserved = torch.cuda.max_memory_reserved(torch.device(device))
free,total = torch.cuda.mem_get_info(torch.device(device))
assert gpu.mem.is_cuda, "Text memory did not reach selected device"
assert gpu.big.sa.is_cuda and gpu.fbig.sa.is_cuda, "Suffix indices were not on GPU"
assert len(gpu.mem)==len(cpu.mem)
for k in ("seen","hits","variants","memory"):
    assert got[k]==expect[k], f"CUDA original text learning mismatch: {k}: {got[k]} vs {expect[k]}"
assert sorted(got["trust"])==sorted(expect["trust"]), \
    "CUDA trust update differs from exact NumPy reference"
assert got["seen"]==len(unseen)-1
assert allocated>0 and reserved>0
assert observed_steps
print("V32_CUDA_TEXT_SELFTEST_PASS",json.dumps({
    "device":device,"actualCudaTextTraining":True,
    "sameOriginalPredictions":True,"sameOriginalTrustUpdates":True,
    "observedOriginalCharacters":got["seen"],
    "cudaTextSeconds":round(gtime,3),
    "cpuReferenceSeconds":round(ctime,3),
    "realAllocatedPeakGB":round(allocated/1e9,4),
    "realReservedPeakGB":round(reserved/1e9,4),
    "realFreeGB":round(free/1e9,4),
    "deviceTotalGB":round(total/1e9,4)
}),flush=True)
