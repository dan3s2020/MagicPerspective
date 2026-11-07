# V41 exact CUDA speed profile

## Scope

This branch accelerates the original V17 execution. It does not replace the
Brain, learning rules, source-row order, predictions, trust counters, graph
keys, checkpoint format, worlds, or evaluation definitions. The CPU/original
implementation remains the semantic oracle; see `CUDA_PORT_INVARIANTS.md`.

The integrated GPU is not exposed by PyTorch as a CUDA device. CUDA training
uses the NVIDIA RTX 3050 Ti as `cuda:0`; the integrated GPU may continue to
drive the desktop/display independently.

## Start on Windows

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\v17\START_V41_SPEED_PROFILE.ps1
```

Defaults for the verified 4 GB machine:

- original checkpoint: `v17/runtime-v41-speed-profile/brains/brain-0-winner.v8`;
- original OpenThoughts source: `D:\training\OpenThoughts3-1.2M`;
- native API: `http://127.0.0.1:8951/`;
- live UI: `http://127.0.0.1:8952/`;
- device: `cuda:0`;
- useful VRAM cap: 3 GB, leaving Windows/driver headroom;
- CUDA text chunk: 4096;
- text rows per GPU batch: 1.

The launcher resumes the existing checkpoint when present. Dataset and runtime
checkpoint files are intentionally ignored by Git.

## Live controls and measurements

Open the UI and go to `04 / CONTROL LIVE`, then
`GPU original V17 · setări reale`.

The panel exposes:

- CUDA device;
- GPU world batch;
- text rows per GPU batch;
- CUDA characters per chunk (32..4096);
- VRAM cap;
- requested GPU work limit.

Settings are forwarded to the original backend and applied at a safe batch
boundary. They do not interrupt a CUDA RPC after it has started.

Three different rates are shown deliberately:

1. **ULTIMUL LOT REAL** — all original phases, end-to-end;
2. **CUDA TEXT CARD** — only the native TextCard CUDA phase;
3. **SUSȚINUT END-TO-END** — accumulated completed real batches.

No rate is synthesized from a UI timer. The backend emits
`V41_BATCH_END_TO_END_REAL` only after the full batch completes.

## Exact CUDA implementation

`text_gpu.py` removes per-proposal host synchronization and keeps integer
right/tried/hit reductions on CUDA. The unweighted empirical histogram uses
integer counts plus an FP32 lookup constructed with the original sequence of
adds.

Imagination uses `exact_histogram_cuda.dll`, built from
`exact_histogram_cuda.cu`. One CUDA thread owns one score row and walks symbols
in the original `j` order. It updates the existing score tensor directly using
round-to-nearest FP32 division/addition. It is not a tree/atomic floating
reduction and does not reassociate the learning arithmetic.

To rebuild the DLL on the verified Windows machine:

```powershell
powershell -ExecutionPolicy Bypass -File `
  .\v17\transcend\torus-aether\gpu\BUILD_EXACT_HISTOGRAM_CUDA.ps1
```

The checked-in DLL targets compute capability 8.6 (RTX 3050 Ti). If the DLL is
absent, V17 keeps the exact original slow loop; it never substitutes an
approximate learning path.

## Verification and measured result

Required real-device checks:

```powershell
cd .\v17
.\transcend\torus-aether\gpu\.venv\Scripts\python.exe `
  -m unittest tests.text_gpu_cuda_residency_test -v
.\transcend\torus-aether\gpu\.venv\Scripts\python.exe `
  tests\text_index_cuda_selftest.py cuda:0
node --test apps\hypermaze-studio-v26\tests\native-browser.test.mjs
```

On the verified RTX 3050 Ti laptop, completed real batches measured:

- prior profile: 214.40 characters/s end-to-end;
- V41 exact CUDA profile: 466.34 characters/s end-to-end;
- ratio for those completed batches: 2.17x;
- V41 CUDA TextCard phase: 743.63 characters/s;
- measured V41 batch: 43,809 characters in 93.94 seconds.

These are observed batch results, not a universal guarantee. Corpus row length,
checkpoint size, concurrent GPU use, thermals, and Windows display load affect
subsequent batches. VRAM occupancy is not used as a proxy for speed.
