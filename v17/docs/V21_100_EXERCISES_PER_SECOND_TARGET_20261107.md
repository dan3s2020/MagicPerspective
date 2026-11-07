# MagicPerspective V21: 100–200 FULL exercises per second — measured engineering target (2026-11-07)

## Original user requirement (verbatim)

> VREAU SA POATA PARCURGE SUTE DE EXERCITII PE SECUNDA

**Strict acceptance: >=100 completely trained Q/A exercises/second, sustained across >=8 completed REAL native CUDA training batches, with unchanged full text bytes, original trust accounting, memory continuity, no leakage into the held-out set, no reduced lengths, and no disabled cognitive/maze/transform worlds.** This is a *target*, **not yet measured or achieved** on the user's 4 GB RTX 3050 Ti Laptop GPU.

The user's current live screenshots show **6 / 1,209,984 train rows** and `text CUDA: alignment 0/229187` with two texts per GPU batch. In that observed batch, ~229,187 text-character prediction positions across 2 documents means ~114,594 positions per document. If typical, 100 full documents/sec requires ~11.46 million positions/sec, plus perspective updating, V19/V20/V21 observation, shared training, maze/transform. This is far beyond what the previous evidence proves; never present "100 rows read/sec" as "100 trained/sec". The example is a **sample of two** and not a dataset-wide average.

## Actual optimized components in the isolated V21 branch

1. `gpu/text_gpu.py` sends genuine alignment completion callbacks **inside** the 4096-position chunk loop. Previously the callback was outside, so `0/229187` could remain until the entire alignment completed. No fabricated counters are permitted.
2. `X.zeros` now constructs scratch tensors directly on GPU. Original NumPy CPU reference unchanged.
3. `cuda_add_votes` accumulates actual original symbol votes through a fused device scatter operation instead of 64 separate per-sample loops. **Batch-level numeric test** compares against the original NumPy equations. Small floating-point sum-order differences may exist due to scatter atomics; compare held-out outcomes and source weights, not just unit labels.
4. `Index.align` combines the original *less-than* lower bound and *less-than-or-equal* upper bound in two device lanes with the same binary-search invariant. It stops at every 4th context depth when **no** sample is still alive. To preserve the exact original NumPy interval layout even when skipping the dead remainder, it records per-depth device activity and masks the trailing intervals to zero. The original NumPy index implementation is untouched.
5. `gpu-settings-transition.mjs`: changing batch size and number of GPU worlds on the SAME device no longer kills Python and reloads the large CUDA suffix index. Changing only VRAM/util adjusts the same Python process; changing physical device still requires reinitialization.
6. `worker.mjs` issues wall-clock in-progress heartbeats, labeled accurately as *time since last completed GPU chunk*; it does not count incomplete positions as learned. Once a batch **completes**, it publishes actual char/s, actual exercises/s, and the sustained measured throughput across up to the latest **8 completed batches**. It explicitly marks the 100/s target as **NOT MET** until measured >=100.
7. The performance report appears inside **Ce s-a născut**, directly under the dataset progress bar, where the user asked for all live metrics. Proportions smaller than 0.01% are displayed with extra decimals, so `6/1209984` is not rounded misleadingly to 0.00%.
8. Original `Brain.learnTextGPU`, `AligningGraph` trust, original V17 live graph, V19 cognitive world, V20 hypertext, V21 contextual state, maze and transformation worlds remain enabled. No dataset text is truncated or discarded for speed.

## Validation and source-of-truth

- `v17/tests/test_v21_cuda_vote_parity.py`: exact original per-symbol numerical reference for fused vote path and original chunk-progress callbacks.
- `v17/tests/test_v21_cuda_suffix_bounds.py`: frozen array equality against original NumPy suffix ranges for random, repeating, dead, and complete contexts, executed through a GPU tensor emulator. This caught and fixed a real discrepancy in inactive trailing ranges.
- `v17/tests/test_v21_gpu_text_allocation.py`: no NumPy staging for scratch zeros and original CPU semantics.
- `.github/workflows/v21-veil-aether.yml`: V21 native integration / checkpoint / retained original Q/A shape, and historical discovery tests separate from runtime integration. This does NOT exercise the actual RTX3050 Ti.
- CUDA live `GET /graphs` reports `graphs[w].gpu.text.hostMs.sustainedExercisesPerSecond`, `measuredWindowBatches`, `sustainedCharactersPerSecond`, and `target100ReachedOnMeasuredWindow`. The latter is **false** until the logged completed batch window actually exceeds 100/s.
- Original CV "shape solution before seeing the answer" held-out test remains a separate hard gate. Speed with broken solution correctness does NOT pass.

## Benchmark and safety on the user's actual laptop

Preserve the full checkpoint by saving all, stopping the old worker cleanly, and updating the V21 branch `git pull --ff-only` with no reset/clean. Resume with `-Resume -Gpu cuda:0 -GpuTextBatch 4 -GpuWorlds 32 -Vram 3 -IncludeCognitive`; leave the original full training corpus. After multiple completed batches:

```powershell
$g = (Invoke-RestMethod http://127.0.0.1:8866/graphs).graphs | Where-Object w -eq 0
$g.gpu.text.hostMs | Format-List
```

The true sustained exercise rate is available only after actual completed CUDA batches, not while a 229k-character batch is still in progress. Compare `shapeSame` and independent held-out performance for correctness. Hardware at **86°C** requires thermal throttling checks; don't blindly force utilization. Keep 4GB VRAM constraints.

## Fundamental unsolved performance architecture

The original `TextCard.append()` still rebuilds BOTH complete suffix arrays of the entire previous textual history after every exercise batch, and uses repeated global `torch.argsort(stable=True)`. Even optimized low-level CUDA kernels cannot make its asymptotic cumulative cost constant. To sustain 100 complete long-form documents/second across **1.2 million** long documents, the architecture will need a verified incremental/sharded index and bounded-memory retrieval, parallel CPU text parsing, overlapping kernels with compatible world graph updates, and a reproducible held-out fidelity gate. These have **NOT** been implemented in this V21 patch.

**Current truthful verdict: speed path improved and instrumented, but requested sustained >=100 full real exercises/second remains UNPROVEN and must not be asserted as achieved.**
