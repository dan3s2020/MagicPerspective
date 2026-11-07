# V17 RTX 3050 Ti — ACCELERATE ACTUAL CUDA TEXT TRAINING WITHOUT FAKE COUNTERS

Date: 2026-11-07. Branch: \`perf/V17-CUDA-TEXT-PREFIX-BATCH-20261107\`. Base: \`fix/V17-GPU-STALL-WATCHDOG-RESUME-20261107\`.

**The user's failure:** original dashboard remained at 112,532 processed characters with last worker update aging to 4,365.8 seconds (~72.8 minutes). The screenshot does not identify which executable/call blocks; the older V17 branch had an actual indefinite Python GPU RPC wait and no independent status, addressed in the base fix. This branch changes the heavy native CUDA text alignment to reduce slow GPU/CPU synchronization while measuring committed data volume. It DOES NOT declare success at hundreds of exercises/s or MB/s without actual user-GPU evidence.

## EXACT original CUDA computation, accelerated

\`v17/transcend/torus-aether/gpu/text_gpu.py\` original Index.align used TWO Python-directed binary searches for EACH context depth up to 64; within each it repeatedly converted GPU \`any()\` into Python bool. That incurred ~2 * D * log(N) device synchronizations plus dozens of PyTorch kernel launches for each chunk, often dominating an inexpensive GPU.

### Change #1 — exact lexicographic integer prefix search

- Keep the ORIGINAL suffix array, original full memory, original trust, all context depths up to 64, all same results.
- Cache first 1..8 prefixes of every suffix as base-129 signed-int64 codes; 129^8 < 2^63, symbols are actual sanitized ASCII 0..127; missing suffix positions encode digit 0, valid bytes encode byte+1.
- Lexicographic ordering is EXACTLY preserved by these codes. Since original suffix array is sorted, cache arrays are already sorted.
- GPU uses native batched \`torch.searchsorted\` for the left/right exact intervals instead of thousands of Python binary-search round trips. NumPy identical reference path for CPU tests. For matches longer than 8 characters, original exact binary search continues without modification.
- When all queries lose a matching prefix the untouched old LO/HI intervals must stay zero. The first acceptance test caught a mismatch of those padding positions; fixed and retested.
- Memory overhead: 8 cached int64 per stored suffix, 8×65,536×8 bytes = 4 MiB per index at maximum, two indices for literal and digit-form. Original CUDA working memory and full original Node memory remain separate.

**Verified exact:** 5 Python tests with real repository text, multiple seeds, short/long/empty-prefix cases compare every interval and subsequent suggested next symbols to a verbatim original reference, no differences. NumPy CPU isolated microbenchmark of the actual index: reference ~0.0054s, improved ~0.0019s, **~2.8x faster**. This is NOT CUDA throughput or end-to-end training speed.

### Change #2 — reusing proposal histograms across original six perspectives

Original \`TextCard.live\` recomputed the same observed symbol-distribution scatter for EVERY variant of exponent \`g\` and form weight \`formW\`, up to six times. The observed per-source histogram and digit mass are now built ONCE on the same actual device. The six unchanged variant weightings are applied to the same observed contributions; no training examples, axes or variants are dropped.

**Verified:** independent source-level regression compares all six old and new predictions and their scored symbol distributions against actual text contexts; all tested predictions match, probabilities match to small floating tolerance. Real NumPy CPU proposal microbenchmark **~5.4x faster** for the six-variant calculation alone. This microkernel speedup is NOT additive with 2.8x into a claimed whole-system speedup.

### Full native model reference

The full ORIGINAL \`TextCard.live\` was exercised on real bytes from \`v17/docs/TORUS_AETHER_ABC_20261104.md\`, with a prior learned corpus prefix; trained 224 actual text bytes, 223 preupdate predictions, 53 correct and grew card memory by 224. Measured NumPy CPU wall time ~0.0879s, ~0.00255 MB/s (small benchmark, not GPU). This intentionally shows why hundreds of complete full-alignment exercises/s and MB/s CANNOT be asserted from microkernel improvements alone.

**Real CUDA verification on Windows before launch:** \`v17/tests/text_index_cuda_selftest.py cuda:0\` starts actual PyTorch GPU, compares all original-vs-fast prefix intervals on device and executes an actual native \`TextCard.live\` CUDA training batch. The \`START_V17.ps1\` launcher runs it after existing original CUDA smoke tests and FAILS with a loud error (without CPU fallback) if any difference/crash. No NVIDIA GPU exists on GitHub Actions, so per-device throughput is unknown until the user's machine reports it.

## Reduce overhead outside the mathematical learner — preserve all training examples

1. **Worker GUI snapshots**:
   - Previously the worker recomputed the entire graph \`organismView\` and serialized a large graph on every subchunk/phase update and up to multiple times per CUDA mini-batch, causing CPU overhead and stale browser updates.
   - During training, lightweight /health heartbeat carries actual CUDA phase and progress independently every 5s; full graph is throttled to the existing sampling interval. The original graph, animation, branches, trainer and all buttons are retained.
2. **Heavy first evaluation**:
   - Previously first completed CUDA exercise immediately invoked full multiworld unseen tests and serialization of the native Brain. This could block a training flow.
   - In optimized mode, heavy frozen unseen tests run only at configured \`-Every\` text checkpoint boundaries, without updating heldout examples. No test algorithm was changed.
3. **Separate real checkpoint and expensive evaluation**:
   - Optional \`--checkpoint-every\` passed through unchanged original launcher with default \`0\` to preserve old behavior. Throughput wrapper defaults to saving original Brain atomically every 100,000 committed text characters; expensive frozen exam every 250,000.
   - Native V17 original saved \`.v8\` is always written BEFORE auxiliary sidecars. Original source and old checkpoints untouched; \`-ResumeFrom\` copy-only recovery retains prior version.
4. **Transient CUDA watchdog recovery**:
   - Base fix bounds GPU RPC silent and hard waits; this branch adds ONE retry only around an uncommitted \`Brain.learnTextGPU()\` call. Before a successful CUDA reply it has not called \`AligningGraph.absorb\` or advanced text counters, so discarding the broken child, resyncing from original Brain, and replaying once cannot double-commit.
   - Errors during later CPU integration, completed Brain updates or other worlds are NOT automatically retried because their effects might already have been learned. Repeated failure stops explicitly with most recent atomic checkpoint.
5. **True real-corpus progress and rate counters**:
   - Parquet reader announces assigned training rows, held-out split, file count; NEVER counts merely decoded rows as learned.
   - Every 5s original worker reports committed text char delta and committed exercise delta; the UI displays **MB/s committed into original Brain, exercises/s and percentage of assigned OpenThoughts training rows**, plus exact CUDA RPC/phase. During a stalled/very large batch rate is correctly **0** until it commits.
   - Absorbed symbol types (~112 ASCII classes) are not the number of exercises, characters or dataset progress.

## Start on user's Windows RTX 3050 Ti from a NEW isolated directory

First stop the old frozen trainer using its own PowerShell console, NOT by pressing UI Reset. Do not kill unrelated agents or random Python processes.

    git clone --single-branch --branch perf/V17-CUDA-TEXT-PREFIX-BATCH-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-FAST-CUDA

Then if the previous saved runtime was exactly the one recommended by the former launch instructions:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FAST-CUDA\v17\START_HYPERMAZE_REAL_CUDA.ps1" -ResumeFrom "D:\MagicPerspective-Hypermaze-LIVE\v17\runtime-hypermaze-real"

OR for the preceding STABLE fix runtime:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FAST-CUDA\v17\START_HYPERMAZE_REAL_CUDA.ps1" -ResumeFrom "D:\MagicPerspective-Hypermaze-STABLE\v17\runtime-hypermaze-real"

Pass ONE known correct previous runtime. Launcher refuses nonexistent folders/overwrite of existing target saves. If the saved runtime is in another path, pass its actual OUT folder. If no checkpoint exists, call the new launcher WITHOUT \`-ResumeFrom\`, but the old progress may not be recoverable.

Defaults for throughput-enabled original V17:
- actual \`D:\training\OpenThoughts3-1.2M\` training set, \`-Worlds text,maze,transform\`, one original V17 Brain, original original UI plus extra live graph, \`cuda:0\`;
- \`-GpuTextBatch 8\`, \`-GpuTextChunk 256\`, \`-GpuWorlds 4\`, \`-Vram 2.2\` GB for 4GB GPU; existing Python OOM handler halves text chunk down to 32 on CUDA OOM;
- \`-CheckpointEvery 100000\`, \`-Every 250000\`, default port 8877;
- no truncation of the original training dataset or deletion of existing branches, no model switch to a substituted next-token demo;
- original computationally expensive 2D maze/transform runs every \`-MazeEvery 4000\` text chars, unchanged. If throughput is insufficient, measure phase splits first and optimize accordingly rather than silently dropping those worlds.

To monitor actual completed learning and progress from another PowerShell console:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FAST-CUDA\v17\WATCH_TRAINING_THROUGHPUT.ps1" -Port 8877 -Worker 0 -Samples 12 -EverySeconds 5

Original UI with added throughput meter:

    http://127.0.0.1:8877/transcend/torus-aether/ui/index.html?live=1

If a VRAM/OOM fault occurs reduce only the **batch/work size**, not the dataset, e.g.:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FAST-CUDA\v17\START_HYPERMAZE_REAL_CUDA.ps1" -GpuTextBatch 2 -GpuTextChunk 64

Use that command WITHOUT \`-ResumeFrom\` only if this same new directory already contains the saved checkpoint from a previous successful launch. Never press Reset.

## Acceptance tests and scientific boundary

- \`v17/tests/text_index_fast_test.py\`: 5 tests, including exact 64-depth alignment equality and sampling equivalence, real corpus prefix microbenchmark.
- \`v17/tests/text_variant_fast_test.py\`: 3 tests, all six variant predictions consistent, measured reused source histograms and complete original NumPy card learning.
- \`v17/tests/text_index_cuda_selftest.py\`: real NVIDIA GPU integrity check, executed during Windows CUDA launcher preflight (not on GitHub Actions).
- Existing true V17 original server/worker integration, GPU RPC watchdog and real corpus checkpoint tests.
- Real Chromium UI integration with original untouched graph + new measured training speed/health panels.
- CI workflow \`.github/workflows/v17-fast-exact-cuda-prefix.yml\`.

### Truth in metrics

The user asked for **hundreds of exercises per second and MB/s**. This is a performance TARGET, not an experimentally confirmed result. Exact native suffix search and model variants have been improved, but OpenThoughts row lengths, multiworld training cost, GPU 4GB and host transfer overhead remain important. We must first observe \`textMBps\` and \`exercisesPerSecond\` FROM THE USER'S RTX 3050 Ti (plus CUDA batch phase timings) and compare to target. If measured below target, continue profiling instead of printing fabricated successful throughput numbers or skipping components without explicit labeling.

No background training on the user's PC has been started by this GitHub code action; the user must run the Windows launcher.
