# V21 — critical zero-target regression and slow training forensic record (2026-11-07)

## Original user evidence

The user supplied two consecutive native HTTP `/graphs` outputs with graph `#0`:
- source `parquet`, `total=1,209,984` training exercises, `heldOut=16`, `datasetTotalRows=1,210,000`.
- `trained=12`, `remaining=1,209,972`, `percent=0` as an API **rounding artifact**.
- GPU batch status advanced from **labyrinths integrated into brain (32/32)** to **transformations being lived (16/32)**. This is evidence of work continuing in those worlds; it does not prove how fast the text model learns.
- The visible answer was `E MULT PREA LENT`. The original V21 goal of >=100 **fully learned** complete exercises per second remains **not demonstrated**.

The model cannot claim 100 complete long-form documents/s merely by counting lines read, progress callbacks, CPU loops, or character fragments.

## CRITICAL correctness bug found and fixed

The original context-window speed patch (commit `e3f0fa847644409072edaf423614ee1247748d87`) inadvertently transformed:

```python
e = exs[o]; L = min(i, self.maxK); ctx[q, :L] = e[i - 1::-1][:L] if i - 1 >= 0 else []; ys_true[q] = e[i]
```

into a line with a `#` comment **before** `ys_true[q] = e[i]`, so Python never executed the target assignment. The scratch buffer was initialized with zeros. This caused **real next-character target = 0** on the optimized path, even though the input corpus contained ordinary ASCII symbols.

This **was a serious introduced regression**, not a mere display bug or an inherent model limitation. The GPU performed incorrect trust and success accounting on batches trained while this version was active.

- **Source fix:** `text_gpu.py` now has `ys_true[q] = e[i]` as a separate executable line, not a comment, while retaining the exact bounded `O(64)` input context.
- **Commit:** `54f62dc7f518809043d5e79407b728cb42186693`.
- **Regression test:** `v17/tests/test_v21_true_next_symbol.py` actually runs the native `TextCard.live()` NumPy reference. With no proposals, predicted token 0 must score *zero* against nonzero Q/A characters; with a controlled correct proposal `B`, all real `B` characters must be correctly predicted and reflected in `trust`. Both tests pass in GitHub CI.
- **Limit:** CI CPU tests do not guarantee CUDA driver-level bitwise equivalence, nor do they retroactively repair trust totals in a checkpoint written by the defective code. The original text corpus memory may still be preserved even if trust accounting was contaminated.

**Checkpoint safety policy:** Don't delete the existing Brain, don't claim the saved accuracy is valid, and don't silently retrain over contaminated trust as if nothing happened. Archive the current `brain-*.v8` and sidecars first. If the saved model was trained by the affected revision, a frozen baseline and an explicit isolated replay/repair plan are needed to recalculate trust. No automatic replay of prior documents was implemented in this patch; this limitation must remain visible.

## Performance fixes with immutable model semantics

1. **CPU context selection already fixed:** `e[i-L:i][::-1]` instead of full-prefix `e[i-1::-1][:L]`; identical context symbols, reduces the quadratic Python copy cost on long exercises.
2. **Original CUDA search:** existing optimized suffix range fusion and vote scatter retained with Python NumPy parity tests. Current model still rebuilds two complete history-wide suffix arrays after each batch, a separate scalability limit.
3. **GPU imagination state update:** the original `_imagine()` downloaded the entire `64-column` current-context tensor to CPU and uploaded it again every imagined step (up to 48). V21 now retains the rolling context in `torch.cat` on the same CUDA device after the identical `guess` and `ok` computation; the NumPy fallback is unchanged. `v17/tests/test_v21_imagination_context_transfer.py` freezes 48-step context equivalence, checks source and executes torch CPU comparison if available.
4. **Accurate tiny percentages:** `dataset-progress.mjs` now returns up to six decimal places, so `12/1,209,984` is approximately `0.000992%` instead of zero. The UI already computes a high-precision value directly from the raw fraction. HTTP, Parquet and TXT tests were revised for the new precision.
5. **No fabricated speed:** `gpu.text.hostMs.sustainedExercisesPerSecond` reports completed original Q/A GPU training batches only, separately from CPU V19/V20/V21 graph observation and other worlds. No measured 100+/s claim on RTX3050 Ti.

## Verification

- [Native CI run for restored true target + original V17 heldout Q/A path](https://github.com/dan3s2020/MagicPerspective/actions/runs/42338450463) passed native tests and Windows syntax checks. Historical original-branch controls run in a separate job and must not be counted as a transfer proof.
- `test_v21_true_next_symbol.py` passed 2/2 on real original NumPy `TextCard.live`.
- `test_v21_imagination_context_transfer.py` protects GPU no-roundtrip state.
- `veil-aether.http.test.mjs` and `veil-aether.dataset-progress.test.mjs` verify the exact updated six-decimal API contract.
- Hardware throughput is not measurable in GitHub Actions on an RTX3050Ti; it must be inspected on the user's device with exact `hostMs` phase timings.

## Exact next reproducibility gate

Before claiming the goal is reached, record equal-length real samples and compare across **two separate checkpoint copies** (never overwrite one with the other):
1. Original/reference V17 Q/A open-loop `shapeSame`, teacher-forced, and frozen heldout set before changes.
2. Current V21 with corrected targets, 4GB RTX3050Ti, total characters, full-exercise lengths, actual completed exercises, `sustainedExercisesPerSecond`, `hostMs` CPU/GPU phase durations, throttling frequencies/temperature and GPU VRAM.
3. Once the cost is measured: specifically address `TextCard.append()`'s **full suffix-array rebuild** and `TextCard._imagine()`'s approximately 48 imagination steps per 31 input positions. Neither has a proven exact incremental replacement yet.
4. Accept only if performance increases **and** original heldout answer correctness does not regress. If failed, do not declare transfer complete or close Issue #25.

**Verdict:** a real label-corruption bug was fixed and actual GPU imagination transfers were reduced; `>=100` fully trained long-form exercises/sec is **UNPROVEN**, checkpoint trust from the affected revision may be contaminated, and full history-index scalability remains unresolved.
