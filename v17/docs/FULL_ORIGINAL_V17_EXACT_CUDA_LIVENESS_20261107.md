# V17 full-mechanism CUDA training — exact suffix search and live liveness (2026-11-07)

## User hardware failure, evidence
Real user's RTX 3050 Ti, 4.29 GB GPU: original V17 UI showed 2 / 1,199,984 exercises after 104,473 chars; last worker update became >429 seconds. The target is hundreds of REAL fully trained exercises/s and MB/s of actual text, not merely rapid scanning or a fake counter.

**Important:** This branch is forked directly from the working feature/V17-REAL-DATASET-PROGRESS-FULL-INSTALL-20261107, not from the separate bounded-context 0..3 fast-head research branch. The original Brain, suffix-array alignment and long-context memory, the 48-step imagination, trust and forms, mixed text+maze+transform worlds, UI, saved .v8 checkpoints, CPU old graph and native observers remain in place.

## Proven source-level bottlenecks
- gpu/text_gpu.py Index.align() performs one lower-bound and one upper-bound binary search for EACH of 64 possible context depths. Each level checks Python bool(tensor.any()), forcing GPU-to-CPU synchronization, then repeats many tiny kernel launches. The cost grows across every chunk of long examples.
- worker.mjs after a CUDA batch replays EVERY symbol of the first actually learned example via original CPU Brain.live(...,{old:true}). A very long first exercise may keep the worker busy before the next batch. Previously no intermediate progress was visible in UI.
- worker report() evaluates frozen heldout text, 30 unseen mazes, 24 unseen transforms and saves full Brain each time the --every threshold is crossed. The default --every 50000 may make evaluation overhead dominate; frozen evaluation is real but need not run after every small amount of text.
- gpu/client.mjs previously had no timeout for an ordinary text_learn request. A stuck Python process could leave the Node promise pending forever with no explicit error.

## Changes preserving full original mechanism
1. New gpu/exact_prefix_search.py performs BOTH exact suffix-array boundary searches over ALL prefix lengths together on the same Torch CUDA card. It uses tensorized lexicographic comparisons with exact suffix terminator handling, not approximation, hashing, truncated depth or a replacement language model. The existing Index.align() routes CUDA to it; CPU/NumPy keep the old reference implementation.
2. PyTorch CPU parity acceptance: 1000 random test seeds compare every original LO/HI range exactly, 64-depth overlapping-context tests, and the ENTIRE original TextCard.live() implementation produces identical hits, seen, variants, full original trust+imagination outcomes and resulting memory/index. No components were removed from this path.
3. text_gpu.py measures real alignmentMs, imaginationMs, indexRebuildMs on the GPU command; brain.mjs exposes fullOriginalMechanism=true, exactCUDAFusedSuffix flag and separately reports legacy CPU graphReplayMs.
4. worker.mjs preserves the exact call to Brain.live() on every character of the first exercise, and all language/N-dimensional/transform observers, but yields periodically while replaying CPU events. It posts real batch progress rather than blocking worker UI from responding.
5. Worker heartbeat every 2.5 s updates the REAL original server /graphs and UI with the actual current phase, done/total and seconds since last real progress, without advancing counters or inventing model training. Original index.html and magic.html display all existing graphs/controls plus current phase and measured end-to-end MB/s and completed exercises/s.
6. GpuWorlds.call() has an inactivity-only watchdog, reset on every actual backend text progress event. If Python remains silent for 360 s it returns a clear error and closes the dead subprocess; no CPU fallback, no fake completion or silent skipped text. Restart from last saved checkpoint.
7. New optional -SaveEveryChars allows original Brain/sidecar checkpoint saves at safe completed batch boundaries WITHOUT re-running the expensive full frozen test; choose -Every 1000000 -SaveEveryChars 200000 to keep complete unseen tests but reduce their frequency. Both settings are independent, real work is unchanged.

## What is NOT established
- CI runners provide PyTorch CPU or the NumPy Python protocol; they do NOT provide the user's RTX 3050 Ti. A real CUDA speedup, sustained 100% utilization, hundreds of original full V17 exercises/s and MB/s are NOT verified on hardware. Do not promise those rates until observed.
- The full 1.2M corpus remains challenging for exact unbounded historical alignment, CPU replay and saved graph memory. Further speedup may require fusing the original graph/48-step imagination and designing GPU-resident hierarchical memory, not silently switching to a smaller language model.
- The 0..3-context fast-head research was NOT integrated into this branch. Running this fix does not bypass the original 48-step imagination or original learned trust model.

## Safe isolated Windows test on the user's ALREADY DOWNLOADED full dataset
Stop the existing worker with Ctrl+C and ensure port 8894 is free. No files are deleted.

    $repo = 'https://github.com/dan3s2020/MagicPerspective.git'
    $branch = 'fix/V17-EXACT-CUDA-ALIGNMENT-PROGRESS-20261107'
    $dest = 'D:\MagicPerspective-ExactCUDA-V17'
    if (-not (Test-Path -LiteralPath $dest)) { git clone --single-branch --branch $branch $repo $dest }
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_MAGIC_REAL.ps1" -Data 'D:\training\OpenThoughts3-1.2M\data' -Out 'D:\MagicPerspective-Full-Training' -Port 8894 -Gpu cuda:0 -GpuWorlds 16 -Vram 2.6 -Mem 3 -GpuTextBatch 2 -GpuTextChunk 128 -Every 1000000 -SaveEveryChars 200000

Native UI: http://127.0.0.1:8894/transcend/torus-aether/ui/index.html?live=1
Magic native UI: http://127.0.0.1:8894/transcend/torus-aether/ui/magic.html?live=1

Watch the real CUDA stage/alignment/imagination/index/legacy-graph CPU times, end-to-end exercise/s and MB/s, frozen accuracy, no-progress seconds, the test and row counters. If progress stops, use these stage labels to identify where the next deep optimization is required.

Do not reset the UI; original .v8 checkpoint format is unchanged, and the inherited original Windows branch marker is compatible with the existing Full-Training output. Both code checkout and data remain isolated from unrelated experiments.

## Reproducible tests
- python -m unittest -v v17/transcend/torus-aether/gpu/test_exact_prefix_search.py (from gpu/ directory)
- node --test v17/tests/v17-native-multiple-text-batches.test.mjs
- node --test v17/tests/gpu-request-inactivity-watchdog.test.mjs
- node --test v17/tests/magic-live-native-ui.test.mjs
- python reference uses actual Torch CPU (no claim to CUDA hardware), native Node-to-Python tests use actual NumPy code rather than fake progress.

Full hosted CI: .github/workflows/v17-exact-cuda-full-context.yml.
## Additional frozen-evaluation liveness — SAME mathematical test
The old report() on the worker was entirely synchronous. On reaching --Every it performed the full unseen H test, including Original AligningGraph.readFrozen() and original C/graph/field/mask calculations, followed by 30 unseen maze episodes and 24 unseen transform episodes, then saved the whole Brain. The original UI could show a very stale worker timestamp during this calculation even when the algorithm was still running.

New AligningGraph.readFrozenAsync() and Brain.testAsync() run the exact same steps and calculate all original heldout characters, with cooperative yield after each 128 actual observed comparisons, so a heartbeat and UI update is possible during evaluation. The original synchronous methods remain unchanged for other callers. The worker's report() awaits the full evaluation instead of omitting or approximating it, and records the actual current phase. A strict regression compares every original metric with async results and checks frozen evaluation does not update Brain trust or counters.

Every=1,000,000 reduces the frequency of this full (still expensive) evaluation; SaveEveryChars=200,000 saves native .v8 checkpoints independently at completed batch boundaries, without losing testability or restarting the original trainer. The exact timing is exposed; the 4GB CUDA hardware result still requires verification.
## Native UI requests remain responsive during full frozen evaluation
An end-to-end CI run exposed an actual 30s timeout for /real-math-plan when the training worker was busy in a frozen evaluation. Each completed original CUDA batch now atomically saves the REAL observed-math-axis state independently of the expensive test. The existing server /real-math-plan endpoint reads the latest completed native observation snapshot directly when present, reporting fromSave=true and savedSnapshotAt, and does not wait on a busy train worker. If no completed snapshot exists, the original worker route remains. This is not a demo or a fabricated answer. A snapshot saving error does not invalidate a previously committed GPU text batch.

The original 30s timeout is therefore avoided for requests that can be answered from committed learned evidence; it is not replaced with an unbounded wait. The user-facing UI still shows live updated exercise and text counters and unchanged original paths.
## Final CI acceptance — all green
Workflow run: https://github.com/dan3s2020/MagicPerspective/actions/runs/42338142987
Latest completed source CI on commit 27b3923e6cf2906284508437027d4903852009f3: BOTH `exact-original-model` and `windows-original-launchers` succeeded.
- PyTorch reference 3/3: 1000 seeded exact suffix boundaries, all 64 context depths and complete TextCard.live output/variants/trust/imagination identical.
- Node tests 15/15: original real worker+headless browser, Python protocol progress, second/third original GPU-protocol text batches, all original frozen text evaluation metrics unchanged, inactive GPU watchdog, previous predictive math regressions.
- Multi-batch original worker: 6 genuine training exercises, 1,470 characters, 101 graph nodes / 506 edges, complete original imagination 958.7ms and original CPU graph replay 33ms on CPU NumPy protocol. This is NOT NVIDIA CUDA benchmark.
- Native browser/worker: original math path and 8 real numeric transformations produced from observed data; no 30s math UI timeout.
- Frozen original evaluation parity: full 412 heldout chars, all 9 metrics exactly equal, 8 real progress signals, no training leakage.
- Windows checks: original launcher, full dataset installer and START_V17 PowerShell scripts parsed successfully.

**CORRECTION of an earlier screenshot interpretation**: UI 'ultima actualizare worker 429.1s' is time SINCE last graph snapshot, not the total length of training. Therefore dividing 104,473 chars or 2 exercises by 429.1 seconds would NOT be a valid throughput estimate. The new worker rate telemetry uses actual elapsed time since resumed process start and excludes previously trained checkpoint exercises from its numerator.

The actual RTX3050 Ti throughput remains unmeasured in CI; do not claim target achieved. The original CPU visual/legacy Brain is still replayed for the first exercise in each CUDA batch, as was already the V17 behavior. The full original CUDA TextCard absorbs every real character of each batch with alignment/48-step imagination/trust; moving the entire old CPU graph to CUDA for ALL examples is a separate architectural task, not achieved by this exact suffix optimization.