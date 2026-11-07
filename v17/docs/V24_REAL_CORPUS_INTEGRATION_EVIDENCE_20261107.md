# MagicPerspective V24 — real-corpus native training, verified integration

**Date:** 2026-11-07. **Branch:** `experiment/V24-REAL-CORPUS-NATIVE-SHAPE-20261107`. **Status:** runnable real-data observational trainer, **NOT** a validated general semantic language solver, original issue #25 OPEN.

## What is actually implemented

1. Reads actual local OpenThoughts3-1.2M Parquet rows using the exact existing V17 reader (`v17/transcend/torus-aether/data/text-dataset.mjs`), including `conversations:[{from:'human',value:...},{from:'gpt',value:...}]`. Original last 16 held-out examples are **not** passed to training. Also supports streaming JSONL conversation or prompt/answer records, and explicit Q:/A: TXT including Windows UTF-8 BOM.
2. A separate observational world records **genuine experienced dialogue transitions** from the complete question to the corresponding recorded answer. The next unknown question is compared with earlier questions using only learned question co-occurrence statistics. Those similarity links are marked *HYPOTHESIS*, while question-to-answer transitions actually recorded in the dataset are marked *WITNESSED*. They must never be conflated.
3. Builds an explicit directed state/action graph with candidate paths and calls the **actual original V17 `Discoverer.shape()` method** once BEFORE the new answer is observed, seeding attraction at earlier known answer nodes. It records the full predicted path and field, and returns the previously observed answer if a valid path exists, otherwise abstains. There is **no next-character predictor** in this V24 module.
4. Supports full monotonic training through every assigned corpus row (`--limit 0`, default), sampled frozen online checks before model updates, held-out exact-answer and word-F1 tests, separate explicit duplicate-question counters, real row counts, bounded active memory/compaction logs, pause/start/save/stop, resumption only after exact source fingerprint checks, atomic single-file checkpoint and persisted live path/evaluation history.
5. Local HTTP server bound to 127.0.0.1 only: `/api/status`, `/api/trace`, `/api/events`, `/api/health`, POST `/api/control`, and POST `/api/predict`. V24 live UI renders the **actual backend graph nodes, connections, attraction field and chosen path**. It can show the existing **unmodified V17 UI** in an iframe (`?nativePort=8862` for an existing original server on 8862). It does not disable old controls.
6. Windows PowerShell 5.1 launcher validates all input files, Node 22+, source form, checkpoint safety and numeric bounds; starts the **actual trainer**, not a synthetic demo.

## Native CI evidence

- Original V22 byte/source protection and identical 2D maze first-shape behavior: original V22 test suite passes.
- V23 300 synthetic structural worlds, noisy 100 long-path worlds, and unknown-entity controls still pass separately (not evidence of natural-language QA).
- Native V24 Linux test: actual JSONL and Q/A TXT stream, correct disjoint heldout, frozen predictions, model save/restore and resumed continuation, HTTP, CSRF rejection, read-only query, unchanged dataset source on resume, persisted frozen trace and heldout.
- Actual Parquet generated with pyarrow is read through the existing V17 `openTextDataset()` and fully trained into V24 with held-out rows excluded.
- Actual nested `conversations` array with human/gpt `value` fields verified end-to-end; parser behavior measured and asserted.
- Windows PowerShell 5.1 live process: Q/A TXT with UTF-8 BOM, Q/A source path and checkpoint directory containing spaces, actual progress to completion, checkpoint and HTTP trace. A real BOM regression was found in the first test, fixed and regression-tested.
- Load stress (controlled generated data ONLY): 12,000 fully processed Q/A records and 16 held-out, 8,743,482 text characters. On Linux GitHub CI: **0.834 seconds, 14,383.54 records/s, 10,480,188.54 characters/s, peak reported RSS 174.6 MB**. Only 96 sampled pre-update predictions were scored. This is not the speed of the user’s OpenThoughts3 on an RTX 3050 Ti, nor a semantic accuracy result.

## Windows real training command (no synthetic test data)

```powershell
$dest = 'D:\MagicPerspective-V24-Real'
if (Test-Path -LiteralPath $dest) { throw "Path already exists: $dest. Preserve existing state; choose a new destination." }
git clone --single-branch --branch experiment/V24-REAL-CORPUS-NATIVE-SHAPE-20261107 https://github.com/dan3s2020/MagicPerspective.git $dest
if ($LASTEXITCODE -ne 0) { throw 'Git clone failed' }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_V24_REAL_TRAINING.ps1" -Data 'D:\training\OpenThoughts3-1.2M' -Port 8899
```

The local dashboard is `http://127.0.0.1:8899/`. To embed a separately running old V17 live UI on port 8862, open `http://127.0.0.1:8899/?nativePort=8862`. For resuming the same isolated save, run the exact launcher again with `-Resume`. A new run into an existing checkpoint without `-Resume` is rejected. No runtime checkpoint files are committed to Git.

## Precise unresolved requirements — DO NOT MARK COMPLETED

- The user’s long-document **new semantic answer** 70+% first-try target has **NOT** been achieved or evaluated on real unseen OpenThoughts3 answers here. Frozen held-out accuracy is reported only when the user runs real corpus data locally.
- The V24 text graph can *retrieve observed answer responses* through a pre-action path. This is not autonomous invention of unseen answers or proof of a full relational semantics.
- This particular new text-graph training is **Node CPU**. The original V17 CUDA implementation is not replaced and does not automatically train V24. No RTX 3050 Ti benchmark or all-GPU claim.
- The V24 and pre-existing V17 brains share an observable UI layout, **not yet one unified checkpoint/organism**. Full semantic text-state transition-learning inside the same native V17 body is still an open integration task.
- The per-row textual observations are ingested (within explicit answer-length bounds), but **live graphical replay is sampled** by `--online-every`; it does not draw every input token when training throughput is high.
- Original blocking incident `MP-REG-2026-11-06-001` / public issue #25 remains OPEN. No `main` merge, no checkpoint deletion, no alteration of existing old UI source.

## Files

- Motor: `v17/research/relational-hypermaze/real-corpus-core.mjs`
- Dataset: `v17/research/relational-hypermaze/real-data-source.mjs`
- HTTP/training: `v17/research/relational-hypermaze/real-trainer.mjs`
- Live visualization: `v17/research/relational-hypermaze/real-live.html`
- Windows launcher: `v17/START_V24_REAL_TRAINING.ps1`
- Deterministic native tests: `v17/tests/v24-real-native-training.test.mjs`
- Load probe: `v17/research/relational-hypermaze/real-throughput-probe.mjs`
- GitHub Actions: `.github/workflows/v24-real-corpus-native-shape.yml`
- Binding source/user contract: `user-intent/changes/V24-REAL-CORPUS-NATIVE-SHAPE-20261107.json`
