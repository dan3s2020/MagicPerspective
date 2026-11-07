# V34 — original V17 + xD + V24 + V31, validated native unified update

**Date:** 2026-11-07  
**Branch:** `integration/V34-ORIGINAL-XD-V31-V24-VERIFIED-20261107`  
**Status:** Native CPU research/training + Windows PowerShell 5.1 launch **VERIFIED**; hardware CUDA on RTX 3050 Ti **NOT VERIFIED HERE**; arbitrary unseen semantic Q/A **NOT SOLVED**.

## Guarantee: no V17 source checkpoint or working UI overwritten

This branch was created from the original full xD V17 live UI and native worker. Relevant EXACT-source V31 scalable original Discoverer-equation implementation, original persistent causal atlas and V24 character-level transfer were added without replacing original 2D Discoverer.shape or the V17 original browser.

- `main`, every original research branch, and their checkpoints are unchanged.
- `v17/START_V34_VERIFIED.ps1` refuses to overwrite the source runtime. A trained `v17/runtime*/brains/brain-0-winner.v8` must be explicitly supplied via `-OriginalOut` (the parent runtime folder), unless the isolated V34 runtime already has its own Brain.
- The launcher copies the source Brain into a **separate** `-Out` directory once; later calls resume from the V34 destination.
- Native original V17 CPU JavaScript Brain, PyTorch CUDA batches (when selected), the existing 6-scale text character learner, original 2D, original full 128-state finite xD action world, original Noise Agency, saved 5D locations and animated atlas all remain in the **same worker**.
- The live V34 research panel is appended in `v17/transcend/torus-aether/ui/index.html`, with original controls/graphs untouched. It shows actual V17 Brain metrics, original observed text-rule evidence, optional V24 Unicode character-level path/branches, and V31 typed numeric causal hypotheses in the same checkpoint. Its original full xD canvas and existing 6-scale graph remain visible. It does not fabricate unobserved text transitions, physical execution or fake 5D coordinates.
- The V31 million-state log-numerical field solver is preserved and proved by native tests, but is **not** inserted as a drop-in next-token semantic world learner.

## Real reproducible acceptance (exact integrated branch, CPU CI)

1. **Native V17 xD + original UI/worker:** tests preserve 20/20 new finite 128-state xD world solutions with 7 active axes, original full map, original 2D visualizer, original six-scale corpus character graph, original checkpoint save/load and live controls.
2. **V31 original equation:** exact parity on **240/240** frozen shape plans; log-field stabilization recovers 1,500 long actions lost to floating-point threshold; controlled 1,008,000 reachable-state, 7,055,280 directed-action-edge world produces the 1,403-action shape before first action; original numeric action memory handles large witnessed sequences and saved evidence.
3. **V24 Unicode transfer:** native original multiworld character-first-shape and disjoint source contrast tests pass; new original-V17-corpus-to-letter transfer is observed on unseen `The mat is near.` → candidate `The mot is near.`, without granting unobserved action physical credibility.
4. **V34 original live worker HTTP**, not mocked: reads actual source text, restores saved original V17 Brain, reports 223 original text states; same worker records 18 externally supplied numeric before/after observations, predicts `12 @ 16 ~ 193` from `12 @ 16 ~ 192` by frozen 4-step plan in 1,793 graph states / 4,276 edges, and verifies observations persisted in a new checkpoint. Independent external physical validation is a separate requirement.
5. **V34 original Chromium:** real browser renders original xD finite maze, full native text-path atlas, native graph geometry, original controls, same-worker V34 live status and source-backed character status buttons.
6. **OpenThoughts3 semantic negative control:** genuine 120 training + 24 frozen unanswered public OpenThoughts examples yield **0/24 exact complete answers**; CI expects honest failure on accuracy, not a made-up 70%.
7. **Real Windows PowerShell 5.1 end-to-end:** Node22, Python3.11/Parquet source reader, paths containing spaces; previously saved original Brain loaded from a different folder, real text corpus on **CPU** ran, `/v34/status` and `character-status` returned from original live worker, numeric observational action returned learned, live UI served, new V34 checkpoint saved. Original source checkpoint SHA-256 remained identical before/after. These test Parquet rows are **real repository document paragraphs**, clearly NOT an authentic 1.2M OpenThoughts semantic-performance benchmark. Original OpenThoughts ingestion also has separate native public CI checks.

**Exact successful GitHub Actions workflows**:
- Native six-group integration: https://github.com/dan3s2020/MagicPerspective/actions/runs/42364051614
- Actual Windows startup, source checkpoint SHA, Parquet and live worker: https://github.com/dan3s2020/MagicPerspective/actions/runs/42364051569

## Windows: clone safely without overwriting a local project

In Windows PowerShell with Node.js 22+, an accessible existing trained original V17 Brain saved in `<OriginalOut>\brains\brain-0-winner.v8`, and the true OpenThoughts Parquet folder `D:\training\OpenThoughts3-1.2M`:

```powershell
$ErrorActionPreference = "Stop"
$Dest = "D:\MagicPerspective-V34-Verified"
$RepoURL = "https://github.com/dan3s2020/MagicPerspective.git"
$Branch = "integration/V34-ORIGINAL-XD-V31-V24-VERIFIED-20261107"
if (Test-Path -LiteralPath $Dest) {
    throw "Directory already exists: $Dest; no overwrite or rename."
}
git clone --single-branch --branch $Branch $RepoURL $Dest
if ($LASTEXITCODE -ne 0) { throw "Git clone failed" }

# SELECT the ACTUAL parent directory of a previously trained original Brain.
# Example folder structure: $OriginalOut\brains\brain-0-winner.v8
$OriginalOut = "D:\YOUR_EXISTING_MAGIC_PERSPECTIVE_RUNTIME"
$Corpus = "D:\training\OpenThoughts3-1.2M"
$OriginalBrain = Join-Path $OriginalOut "brains\brain-0-winner.v8"
if (-not (Test-Path -LiteralPath $OriginalBrain -PathType Leaf)) {
    throw "Original trained Brain was not found: $OriginalBrain"
}
if (-not (Test-Path -LiteralPath $Corpus -PathType Container)) {
    throw "Real Parquet corpus directory was not found: $Corpus"
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$Dest\v17\START_V34_VERIFIED.ps1" `
    -Data $Corpus -OriginalOut $OriginalOut `
    -Out "$Dest\v17\runtime-v34-original-safe" `
    -Port 8897 -Workers 1 -Worlds "text,maze,transform" `
    -Gpu "cuda:0" -Vram 2.2 -GpuWorlds 4 `
    -Every 250000 -CheckpointEvery 100000 -XdAtlasEvery 16000 `
    -TraceTransformations
if ($LASTEXITCODE -ne 0) { throw "The original native V17/CUDA trainer exited with error." }
```

The `OriginalOut` path **must be replaced** with the actual parent directory containing `brains\brain-0-winner.v8`. The code intentionally does NOT silently choose one of the user's many experimental V17/V32 checkpoints.

**Development and troubleshooting:** To reproduce the Windows PowerShell native runner proven in CI without unavailable GPU hardware, change only `-Gpu "cuda:0"` to `-Gpu "off"`, and optionally `-Worlds "text"` to isolate CPU text-world training. All world defaults remain `text,maze,transform`; switching worlds doesn't delete capabilities from the original Brain.

Original live UI: `http://127.0.0.1:8897/transcend/torus-aether/ui/index.html?live=1`.  
Health/real progress: `http://127.0.0.1:8897/health?w=0`.  
V34 original live worker status: `http://127.0.0.1:8897/v34/status?w=0`.

**CUDA truth:** Windows GitHub hosted runner has no RTX 3050Ti. Original `START_V17.ps1` runs PyTorch GPU availability, exact CUDA world/learner self-tests and native GPU text-index self-tests before it allows `cuda:0`; failures abort instead of faking a CPU-run as GPU. Original JavaScript V17 Brain and atlas remain on CPU. Actual 4GB GPU VRAM budget/throughput must be measured on the target laptop.

## What the atlas can and cannot claim

- Original full xD world reveals every actually provided finite-state wall/corridor. Infinite language state space is neither supplied nor exhaustively generated.
- Previously witnessed text comparisons propose a character edit transformation with a verifiable provenance. It is NOT a physical action until an independently witnessed external world executes it.
- At each position, native original six-scale learner shows first-shot candidate next-character choices, wrong rankings, missing observed edges and heldout errors. This is a structural graph statistic, NOT exact semantic goal prediction.
- V31 sparse log attraction is a numeric-stability improvement in a solved structured graph; it doesn't generate missing natural-language semantic edges.
- With noise, the original Noise Agency site decisions and training counters are shown where actually recorded. Noise doesn't yet have verified causal benefit for 70% arbitrary heldout QA.

## Windows diagnostic regression and fix evidence

A new strict real-Windows E2E test originally FAILED repeatedly. The original worker produced real text but an HTTP character-status request timed out. We measured:
- Actual 40-row local repository-text Parquet source 32 train / 8 held-out: first row decode **5–9ms**, real exact 325-character row via saved `Brain.live()` **58–78ms**.
- Saved original Brain contained 90 corpus text operators and 344 text states. Original character evidence extraction **2–5ms**.
- Thus not a fabricated data/retrieval/atlas problem. Original worker was forced by aggressive **CI-only** `-Every 1000 -CheckpointEvery 1000 -XdAtlasEvery 2000` to run frequent full `brain.test(...)`, xD worlds and expensive original Brain serialization while still answering first UI HTTP requests. Removing an extra first-character diagnostic `shot(true)` reduced another startup blockage; preserving full native actual training math, cooperative event-loop yields every 32 source symbols improved responsiveness.
- Re-running the SAME full Windows PowerShell clone source / real reader / status / observation / manual save with original production-realistic frequencies `-Every 250000 -CheckpointEvery 100000 -XdAtlasEvery 16000` passed: **`V34_WINDOWS_ACTUAL_NATIVE_LAUNCH_PASS`**. The test verified source checkpoint SHA unmodified, native UI/HTTP and new Brain checkpoint.
- Do not lower production intervals to 1k as a normal default just to see more evaluation samples: it blocks the worker; evidence supports the measured difference.

**Working files**:
`v17/research/text-hypermaze/v34-live-research.mjs` ·
`v17/transcend/torus-aether/devour/worker.mjs` ·
`v17/transcend/torus-aether/devour/devour.mjs` ·
`v17/transcend/torus-aether/ui/index.html` ·
`v17/transcend/torus-aether/ui/v34-research-live.js` ·
`v17/START_V34_VERIFIED.ps1` ·
`.github/workflows/v34-original-unified-regression.yml` ·
`.github/workflows/v34-windows-real-start-e2e.yml`.

Additional native acceptance:
```powershell
node --test v17/tests/v34-incremental-observed-character-rules.test.mjs
node --test v17/tests/v34-native-real-live-http.test.mjs
node --test v17/tests/v31-million-original-log-attraction.test.mjs
node --test v17/tests/complete-xd-maze-atlas.test.mjs
```

**Not claimed solved:** general-purpose semantic goal inference on open-ended English, a graph for every unseen linguistic transition, native original persistent 5D physics control of all token emissions, CUDA 100% execution, a real RTX 3050Ti E2E benchmark or 70–100% accurate first try on fresh natural QA.
