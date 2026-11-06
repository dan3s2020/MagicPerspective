# MagicPerspective V17 — preserved brain, bounded CUDA text, shared-transfer evidence
**Research integration, 2026-11-06.** Branch `experiment/V17-UNIFIED-TRANSFER-MEMORY-20261106`, based on `fix/V17-UNIFIED-TEXT-BATCH-PROGRESS-20261106` (NOT `main`, NOT the user's `D:\MagicPerspective` installation). This is a **tested CPU integration and an unverified 4 GB CUDA experiment**, not a universal language model.

## What was recovered from other agents

| Existing agent branch | Recovered here | Deliberately not implied |
|---|---|---|
| `v17-torus-aether` | Original V17 Brain, Discoverer, text/maze/transform worlds, original NestView and .v8 checkpoint | V17's BFS/value propagation isn't a learned hyperdimensional planner |
| `experiment/V17-REAL-TEXT-NAVIGATION-20261106` | Source-derived TextActionPaths (inherited from parent unified branch) | Unicode word-transition counts aren't grounded semantics |
| `experiment/V17-CAUSAL-LANGUAGE-ACTIONS-20261106` | CausalTextAgent's observed draft edits (inherited) | Lexical rewards aren't proof that an answer is true |
| `experiment/SHARED-TRANSFORM-PATH-PROOF-20261106` | Independent `isolated/language-paths` calibration and transfer tests (inherited) | The known nine-operation rule family is not a discovery of arbitrary linguistic transformations |
| `fix/V17-UNIFIED-TEXT-BATCH-PROGRESS-20261106` | One 32D shared PyTorch encoder, action-conditioned latent transition, decoder; original UI observational panel and frozen evaluator | Predicting hashed next states isn't planning a full answer |
| `experiment/CUDA-TRAINING-CORE-20261106` | Audited its separate Torch 5D→8D→5D and 32D Q/A goal training and its device-coverage ledger | Its alternate worker and `cuda_unified.py` are NOT blindly merged into native V17: they implement competing process/worker interfaces; an exact port and parity tests remain necessary |

The new work here reuses the actual native unified shared-model code, not an unrelated replacement model.

## CUDA root cause and bounded mitigation

Observed on RTX 3050 Ti: repeated `OutOfMemoryError` while allocating 530 MiB during text indexing, alongside `GpuUtil 100`. `100` only requests *no throttling*; it cannot force 100% hardware usage. V17's original `autoText` estimate assumed 1,000-character exercises, indexed the complete life history on GPU, and evaluated up to 2,048 imagination starts together. These estimates were not a safe fit for 4 GB.

This branch:
1. Keeps complete original `AligningGraph` history and existing `.v8` checkpoint on the Node side.
2. Uploads only a bounded recent text working window to the CUDA `TextCard` (up to 65,536 symbols, sized by available VRAM); recreates the index at fixed length instead of growing it without bound; tracks `historyChars` vs `cardWindowChars`.
3. Starts with `GpuTextBatch 1` and `GpuTextChunk 64` in the dedicated launcher, limits in-process alignment chunks, and reduces failed CUDA chunks down to 32 on OOM; **never silently falls back to CPU**.
4. Caps requested GPU memory from the *reported physically free VRAM*, reserving a safety margin. Logs `freeAtInitGB`, `requestedVramGB`, effective `vramGB`, and executed GPU memory use.

**Limitations:** The bounded window changes original full-history CUDA nearest-alignment behavior. The full Node brain/graph may still grow, the bounded GPU index may still have OOM/latency on some workloads, and no RTX laptop acceptance is yet reported. A true long-range paged episodic index with semantic retrieval should be measured against the original exact aligner before replacing it.

## Real shared-model adaptation (not just a decorative graph)

The existing PyTorch shared model gets actual `(domain, before, action, after, context)` transitions from maze, transformation and text-action worlds. The new training-only adaptive noise:
- perturbs the model's input state features during training;
- updates the next perturbation amplitude from **training-only pre/post improvement**;
- bounds the amplitude to `[0.002, 0.08]`;
- saves/restores the random generator state and amplitude in the version-1 backward-compatible `.shared.pt` sidecar;
- performs frozen evaluation without perturbations and without parameter updates.

This is one aspect of self-adjusting representation exploration. It is **not** yet a learned search over dimensional lifts or a user-facing action-noise controller. Native original V17 `pnoise` remains separately user-controlled.

### How to get a clean copy and train

Run in **Windows PowerShell**, not Termux, with Node 20+, Python 3.10–3.12 and NVIDIA drivers. No existing D: folder is overwritten.

```powershell
$ErrorActionPreference = "Stop"
$dest = "D:\MagicPerspective-V17-Transfer-Experiment"
if (Test-Path -LiteralPath $dest) { throw "Destination exists. Use a new directory; do not overwrite an existing experiment." }
git clone --single-branch --branch experiment/V17-UNIFIED-TRANSFER-MEMORY-20261106 https://github.com/dan3s2020/MagicPerspective.git $dest
if ($LASTEXITCODE -ne 0) { throw "Clone failed" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_V17_TRANSFER.ps1"
```

The original native graph/visualizer is at `http://127.0.0.1:8866/transcend/torus-aether/ui/index.html?live=1`. Its own checkpoints go to `v17/runtime-transfer-20261106/brains`; the original `D:\MagicPerspective\v17\runtime-devour` is never modified by this command. The launch uses `GpuWorlds=32`, `Vram=2.0`, `GpuTextBatch=1`, `GpuTextChunk=64`, and `-TraceTransformations` by default. Start, pause, save, resume and native replay remain in V17. Stop with Ctrl+C to save.

For settings, for example:
```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_V17_TRANSFER.ps1" -Port 8870 -Vram 1.8 -GpuWorlds 16 -GpuTextBatch 1 -GpuTextChunk 32
```

Use a different free port for additional instances. Do not raise VRAM on the assumption that `-GpuUtil 100` provides more physical memory.

### Measure whether the **transformation transfers**

Enable training traces (the new launcher does this). On each actual **training** transition, the observer writes a JSONL event with observed before/action/after and a per-batch episode group ID, up to 50,000 transitions. It does not copy teacher solutions, BFS distances, or held-out answers into the log; it is opt-in because traces occupy disk.

After multiple independent maze/transform/text episodes, in a separate PowerShell terminal:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\AUDIT_V17_TRANSFER.ps1" -Target text -Device cpu -Steps 80 -Batch 16
```

The tool creates `v17/runtime-transfer-20261106/frozen-transfer-text.json`. For real CUDA benchmark tensor execution, specify `-Device cuda:0` only after verifying free GPU memory. This benchmark reads a snapshot of the trace and **does not update training checkpoints**.

**Two separate kinds of evaluation:** The original V17 UI's **Evaluează modelul comun (înghețat, lumi nevăzute)** evaluates the **currently trained, saved shared model** on independent frozen world events. By contrast, `AUDIT_V17_TRANSFER.ps1` starts **new, equally initialized research replicas** of the shared model using the recorded *training* transitions, splits them by full episode, and compares source vs target transfer controls. Its offline "held-out" records have **not** been used by these research replicas, but may previously have been seen by the live original brain that produced the log. Therefore the offline result tests architecture/training-transfer methodology, **not the current live brain's true unseen score**. Report these separately and do not leak the offline held-out records into the replicas' training.

The audit splits complete recorded training episode groups into a *new offline train/heldout split* **before model initialization**; it is separate from the original V17 corpus's designated held-out examples, which it never reads. It trains equal-update original-geometry heads and evaluates frozen next-state prediction, comparing:

- joint shared training with adaptive input noise;
- joint training without noise;
- target-only at equal updates;
- source-only (zero target transitions);
- domain-local shuffled action labels as a negative control;
- **source pretraining followed by target adaptation**, versus a fresh target model seeing the **exact same target mini-batches** with fewer total updates. These distinguish useful prior experience from just extra target exposure, but the compute budgets across this last pair necessarily differ.

Read `relativeJointVsTargetOnly`, `zeroShotAfterSourcePretrain`, and `relativePretrainVsSameTargetAdaptation` alongside model baseline loss and per-domain counts. A positive score means lower held-out **hashed next-state MSE** under that protocol; it is **not** measured linguistic comprehension. A negative score reveals negative transfer. Repeat seeds and report uncertainty before drawing broad conclusions.

## Acceptance criteria

- Native V17 original NestView continues working without loss of controls, and original V17 `.v8` saves are independent of the new sidecar files.
- 4 GB CUDA text runs for many batches without crashing, with real `cuda:0` tensor operations and measured VRAM peak. This requires running on your RTX hardware; CI cannot assert it.
- `historyChars > cardWindowChars` is allowed and explicitly shown. Compare frozen text accuracy against the unbounded original where feasible; mark regressions.
- No original held-out question/answer enters any training event, noise controller or optimizer.
- The episode-disjoint transfer benchmark reports target-only, source-only, action-shuffled and sequential adaptation baselines with frozen results. Do not label a successful controlled transfer as natural-language understanding.
- First positive scientific criterion: statistically repeatable reduction of held-out **task** errors and planning cost from source-learned transformation knowledge versus target-only matched controls. That is still a future experiment, not current evidence.

## Testing

CI on `experiment/V17-UNIFIED-TRANSFER-MEMORY-20261106` executes CPU Torch/NumPy and Node regressions:
```powershell
cd "$dest\v17\transcend\torus-aether\gpu"
& .\.venv\Scripts\python.exe -m unittest -v test_text_gpu_memory test_shared_perspective test_transfer_benchmark
cd "$dest"
node --test v17/transcend/torus-aether/shared/experience.test.mjs
node --test v17/tests/torus-shared-perspective.test.mjs
node --test isolated/language-paths/cross_world_transfer.test.mjs
```

**Next architecture task:** learn a goal-conditioned reversible action-space transform over grounded text states, plan alternative paths inside the learned latent graph *before* producing text, and report executed actions versus predicted path and counterfactuals. Before claiming a hyperdimensional solution advantage, compare identical tasks against identity/fixed random lift and original symbolic transition planning. Do not fold other branches' alternative CUDA trainers into V17 until identical observed-event parity, checkpoint, and GPU resource tests pass.
