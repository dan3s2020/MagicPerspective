# MagicPerspective V42: exact ORIGINAL GPU text throughput — REMOVE avoidable Python/CUDA microkernel & host copy overhead

Date: 2026-11-07. Isolated branch `perf/V42-REAL-CUDA-IMAGINATION-KERNEL-OVERHEAD-20261107` forked from latest V41 `c3247481fea58b89f6792f4d914f9e11a11af9cd`.

## User's current performance priority, no silent architecture replacement
The original MagicPerspective user reports actual NVIDIA text training up to 1,000 times slower than CPU. That ratio is a user observation and NOT yet an independently verified same-workload measurement; our CI machines do not have a user RTX 3050 Ti. Preserve the actual original Brain, its V17 maze and xD fields, NoiseAgency, original CUDA text-card trust and checkpoints. Do not replace the learner with a standard next-token head or a synthetic demo just to claim speed.

## Source-confirmed hotspots in V41
1. The V41 default `START_V41_SPEED_PROFILE.ps1` uses **-GpuTextBatch 1** and `-GpuTextChunk 256`, which can cause high per-exercise GPU kernel/RPC overhead. It is explicitly not a tuned physical RTX benchmark.
2. In `TextCard.live`, each GPU batch performs prefix suffix-index search, the original self automaton, scoring and variants, and many repeated `torch` launches on small tensors; `TextCard.append` reconstructs both normal and form suffix indexes once after EVERY batch. V41 already removed per-iteration CUDA bool/go sync within the depth>8 binary search, but lots of small kernels remain.
3. `_imagine()` can expand each sampled position up to 48 steps and calls `_proposals` again on every step, including native CPU symbol-by-symbol trust accounting. **Previously** it additionally copied the entire `[Rn,64]` GPU context to host and re-uploaded it on EVERY imagination step purely to prepend a single symbol.
4. `_top` previously computed exact empirical proposal top-vote with `S` separate Torch update kernels, typically S=64, EACH time the proposal evaluated. The 64 count updates were exact integer sums stored in float32 (integer values <= 64).
5. In actual `worker.mjs/processGpuText`, after `brain.learnTextGPU()` commits on GPU, the original `brain.live(...,{old:true})` symbolically consolidates every byte of the batch's **first** exercise on JavaScript CPU. Further cross-world causal memory, constructed atlas, language evidence, world updates, saved checkpoint and graph snapshot happen on CPU. The GPU being idle at this stage is expected; thus comparing raw `-Gpu off` with `cuda:0` does NOT compare identical computation.

## Minimal V42 optimization (source and semantics unchanged, only scheduling)
File changed: `v17/transcend/torus-aether/gpu/text_gpu.py` ONLY.
- In native CUDA `_imagine` keep original `argmax` and guessed-symbol feedback, but build the next context with on-device `torch.cat((predicted[:,None], CX[:,:-1]),dim=1)`; do not roundtrip all 64 context columns through NumPy on every step. The only remaining host data for the legacy original rule is the predicted-symbol vector used for original `ok` feedback.
- In native CUDA `_top`, replace **S individual** one-vote scatter launches by one `torch.index_add_` for the SAME exact count histogram; positive 0/1 integer counts <=64 are exactly representable in float32. Keep original `[:128].argmax(dim=1)` tie behavior. NumPy and torch-CPU original paths remain unchanged.
- No change to `AligningGraph`, `Discoverer.shapeGraph`, `Brain.live`, original V41 worker stages, GPU memory lifetime, CUDA index, source/training data, Q/A goals, six variant scoring, `-Gpu` semantics, checkpoints or UI.

## Verification contract
- `v17/transcend/torus-aether/gpu/v42_real_cuda_parity.py` loads **immutable V41 source blob** `829a982570da76d102c3cb9597cfe5dab877239b` via git and runs full original `TextCard.live` against unchanged V41 with the same source from `v17/docs/TORUS_AETHER_ABC_20261104.md`, trust, form, variant score, memory and imagination. Requires equality of the entire returned result and remembered CUDA symbol memory; reports old/new *actual same-workload* speed. It separately verifies the exact original top-vote histogram/ties.
- Python CPU/NumPy reference + original node learning tests run on Linux/Windows CI. When PyTorch CPU is installed, `v42_real_cuda_parity.py` verifies the new batched GPU math helper on 1,542 CPU-Torch sequences (including exact ties and absent symbols) against immutable V41. This proves numerical integer-count equivalence, NOT CUDA speed.
- `v17/TEST_V42_GPU_PARITY.ps1` runs **only** when `torch.cuda.is_available()` is true in the real original Python environment. It does NOT train or change a checkpoint. A missing NVIDIA device is a STOP, not CPU fallback.
- Do not mark GPU speedup as tested when only CPU CI is green. The user RTX is required for the `V42_ACTUAL_CUDA_PASS` line. A true END-TO-END improvement also requires `V41_PHASE_REAL`, `V41_BATCH_END_TO_END_REAL` and equal-work CPU/GPU comparisons, including CPU-original consolidation.

## Read-only RTX preflight on Windows (does not alter any running experiment)
```powershell
$ErrorActionPreference = 'Stop'
$Dest = 'D:\MagicPerspective-V42-SPEED-AUDIT'
if (Test-Path -LiteralPath $Dest) { throw 'Refusing to overwrite an existing folder' }
git clone --single-branch --branch 'perf/V42-REAL-CUDA-IMAGINATION-KERNEL-OVERHEAD-20261107' 'https://github.com/dan3s2020/MagicPerspective.git' $Dest
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed' }
& "$Dest\v17\TEST_V42_GPU_PARITY.ps1"
```

If original Python is in a different folder, call `& "$Dest\v17\TEST_V42_GPU_PARITY.ps1" -Python 'FULL_EXISTING_PYTHON_EXE_PATH'`. This script requires the originally installed CUDA PyTorch; no path is assumed to exist.

## Architectural bottlenecks intentionally NOT silently removed
- GPU suffix indexes still rebuild twice for every batch. A future exact incremental suffix-index or block reuse experiment must first reproduce original LO/HI and self-memory behavior on real data and preserve chronological training.
- Every CPU `Brain.live(old:true)` consolidated character remains untouched; moving ALL original graph/geometry into a fused GPU algorithm requires independently verified complete original parity and native checkpoint compatibility.
- Current GPU imagination still consults original CPU `ok` feedback and trust counters. Further GPU-native batching/fusion may reduce synchronization but must be checked against frozen character and complete path predictions.
- Entire real dataset throughput, GPU VRAM and physical occupancy on user's RTX 3050 Ti remain to be MEASURED; no fabricated `1000x`, `100% GPU`, or 100% long unseen answers are claimed.

## Strict next GPU bottleneck study
After actual CUDA V42 parity, freeze the SAME initial checkpoint/corpus and use V41 stage timestamps for aligned experiments with text batches 1,2,4 and chunks 128,256,512; compare **whole committed model and heldout errors** before interpreting characters/sec. If `ORIGINAL_PYTORCH_TEXT_CARD_FINISHED` dominates, investigate suffix rebuild and imagination kernel fusion. If `CPU_ORIGINAL_BRAIN_LIVE_FULL_REPLAY` dominates, optimize the actual legacy CPU consolidation rather than changing GPU settings. If `CPU_NATIVE_CAUSAL_ATLAS`/`CPU_FULL_XD_CAUSAL_ATLAS` dominates, profile the corresponding original JS graphs and memory compaction. Never reduce evaluation frequency, sample size, learning axes, evidence logging or real output to make speed appear higher.