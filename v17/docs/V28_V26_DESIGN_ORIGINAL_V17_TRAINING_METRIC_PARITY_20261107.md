# MagicPerspective V28 — V26 DESIGN + ORIGINAL V17 TRAINING

Date: 2026-11-07. Exact user correction in verbatim/2026-11-07-V28-V26-UI-REAL-TRAINING-USER-CORRECTION.txt.

## Regression and scientific meaning

V26 displayed a useful new design but replaced the research problem with six/ten corpus-word swaps. The reported 100% score tested those controlled swaps, NOT real unseen OpenThoughts question answering. Its MB/s measured repeated text-state bytes, not real PyTorch training speed. V27 wrongly reverted to the old V17 interface instead of keeping the new V26 design.

V28 preserves the NEW Hypermaze Laboratory layout, graph viewer, replay, live metrics cards and controls. It connects those to the ORIGINAL V17 devour worker, model, Parquet dataset reader, checkpoint and original frozen evaluator. No synthetic V26 ObservedEffects/makeTask runs under the V28 bridge; old synthetic files remain in the repo for historical research only.

## Files and original engine

UNCHANGED original components:
- v17/transcend/torus-aether/devour/devour.mjs
- v17/transcend/torus-aether/devour/worker.mjs
- v17/transcend/torus-aether/devour/brain.mjs
- v17/transcend/torus-aether/devour/eval-worker.mjs
- v17/transcend/torus-aether/data/text-dataset.mjs
- v17/START_V17.ps1
- Original maze engine, previous UI, trained checkpoint files and corpus.

NEW V26 design connected to native:
- v17/apps/hypermaze-studio-v26/public/native.html
- v17/apps/hypermaze-studio-v26/public/native-app.js
- v17/apps/hypermaze-studio-v26/public/style.css (same V26 visual base)
- v17/apps/hypermaze-studio-v26/public/native-extra.css
- v17/apps/hypermaze-studio-v26/native-bridge.mjs
- v17/apps/hypermaze-studio-v26/native-metrics.mjs
- v17/START_V28_REAL_TRAINING_UI.ps1

The bridge listens only on 127.0.0.1:8896 and uses original native trainer on 127.0.0.1:8841.

## EXACT original metrics, not substitutes

- GET /graphs: original test.aligned, live, together, C, field; maze.test.shape, solved, ratio; transform.test.solved, failedRate; progress.trained, total, heldOut; source kind and worker arm.
- GET /graph?w=N: original graph nodes, edges, U native coordinates (if emitted), flow and shared PyTorch training loss/trace, GPU timing.
- POST /control: original start/pause/save/reset (reset requires two explicit user approvals).
- POST /controls: original model noise and temperature.
- POST /gpu: original CUDA device/world counts/text batch/VRAM/utilization; actual speed and errors come from V17.
- POST /eval: original checkpoint saved and frozen evaluator on ORIGINAL unseen Q/A, mazes and transformations.

Missing native measurements appear as —, never synthetic 100%. Dataset denominator is original total exercises. Training throughput is original sustained completed exercises/second and characters/second. No repeated-text MB/s proxy.

Original frozen Q/A presents the original [correct, predicted] character pairs and answer start position, with red for wrong, green for correct, native answerAccuracy, allAccuracy, oldAnswer and shapeSame. Original maze evaluation renders its genuine walls, first predicted preaction gold solution shape and blue executed path. Native graph nodes/edges are the exact original; if V17 U coordinates are missing the 2D layout is visual only. Drawing is capped at 20fps to limit overhead.

## Install V28 without touching V26

From any PowerShell window:

    $Repo = "D:\MagicPerspective-V26"
    $Dest = "D:\MagicPerspective-V28"
    $Branch = "fix/V28-V26-UI-REAL-V17-TRAINING-METRIC-PARITY-20261107"
    if (Test-Path $Dest) { throw "Destination exists; refusing to overwrite." }
    git -C $Repo fetch origin "refs/heads/$($Branch):refs/remotes/origin/$($Branch)"
    if ($LASTEXITCODE -ne 0) { throw "Fetch failed" }
    git -C $Repo worktree add --detach $Dest "refs/remotes/origin/$Branch"
    if ($LASTEXITCODE -ne 0) { throw "Worktree failed" }
    Set-Location $Dest

### A. Existing original V17 trainer already running on port 8841

    powershell -ExecutionPolicy Bypass -File .\v17\START_V28_REAL_TRAINING_UI.ps1

Open http://127.0.0.1:8896.

If old synthetic V26 occupies port 8896, stop its Node process with Ctrl+C, or specify -UIPort 8897 and open http://127.0.0.1:8897 instead.

### B. Start the ORIGINAL native V17 Parquet trainer and new UI

For a NEW experiment choose a NEW -OriginalOut directory:

    powershell -ExecutionPolicy Bypass -File .\v17\START_V28_REAL_TRAINING_UI.ps1 -StartOriginal -Data "D:\training\OpenThoughts3-1.2M" -OriginalOut "D:\MagicPerspective-V28\v17\runtime-devour-original" -Workers 1 -Mem 3 -Worlds "text,maze" -Gpu "off"

To CONTINUE an old checkpoint, instead supply the EXACT original -Out folder and preserve source/worker/arm/world configuration; a different -Out makes a different experiment. The original engine uses -Resume; the V28 UI does not create or replace model checkpoints. Native CUDA can be selected through the original options when known compatible; no GPU speed claim without measurement.

## Verification / limitations

Automated CI in .github/workflows/v28-real-v17-training-v26-ui.yml:
- Exact immutable original model, trainer, evaluator, original UI and Parquet reader blob hashes.
- Frozen native metric/denominator and real throughput parity with the original API.
- Native HTTP bridge actually forwards /control, /eval, /gpu, /controls to ORIGINAL V17.
- An actual ORIGINAL V17 worker trained on real source document characters in CI and emitted actual original ALIGNED score. This source is repository documentation, NOT the user's local OpenThoughts data.
- Real Chromium renders new V26-design UI with original source, native data, actual Q/A red/green differences, original maze initial shape, GPU settings and real original Pause, with screenshots archived.
- A real Windows PowerShell launcher was executed against a labeled native-API fixture. Windows RTX3050Ti/Parquet execution on the user's PC is STILL UNTESTED.

OPEN research requirements:
- Full OpenThoughts3-1.2M training and original unseen heldout on the user's actual computer/checkpoints.
- Hardware CUDA benchmarks on RTX3050Ti.
- 70%+ exact full unseen semantic solution shape from first attempt.
- Transfer of V26 controlled single-token hypercube planner to general semantic natural-language world without explicit target words.

This is a training/benchmark/UI integration, not proof that missing language reasoning has been solved.
