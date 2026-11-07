# V24 critical 15k-row checkpoint crash and invisible hyperpath regression — 2026-11-07

Branch: `experiment/V24-REAL-CORPUS-NATIVE-SHAPE-20261107`. This is an additive V24 hotfix. No original V17/V22 world, original UI source, V23 engine, or user checkpoint is overwritten.

## User-reported exact failure

The live screenshot showed `RangeError: Invalid string length at JSON.stringify (<anonymous>) at ...real-trainer.mjs:175:37`, `15,000 / 1,209,984` training rows advanced and `10,000` persisted rows. The V17 iframe displayed Firefox `Unable to connect to 127.0.0.1:8866`. No usable high-dimensional path display was visible and the live rate read `0.0` (the training process was in `error` mode). Observed sampled metrics at the time were **600 pre-update attempts, 0.00% exact, 56.59% word-overlap F1**. That F1 is NOT the percent of correct answers; they are separate measures.

## Source-level root causes

1. V24 previously constructed a single huge JSON string from the whole active question/answer atlas when saving. At long real examples, serialization hit the JavaScript string length limit and stopped the training loop at the checkpoint step.
2. The checkpoint format was a monolithic `atlas-v24.json` for every save. The previous valid on-disk checkpoint was at 10,000; cursor 15,000 was only the unsaved in-memory state at the time of the screenshot.
3. The original iframe was hardwired to port 8866 without verifying a V17 process was running. The missing legacy server does NOT imply that the V24 real corpus backend failed; these are distinct processes.
4. The old route illustration was below the fold and presented only a simplistic 2D column chart with a single latest sampled route. It did not expose inspectable high-dimensional coordinates, historical predictions or the full observed memory atlas.

## Implemented fixes

- `real-checkpoint-store.mjs` introduces immutable per-save JSONL record segments, each with SHA256 and count, plus a small atomic `atlas-v24.index.json` manifest and exact active-record window reconstruction. The original `atlas-v24.json` is retained byte-for-byte during migration; no destructive conversion is used. Each individual answer is serialized separately, avoiding the giant string serialization.
- The entry point and `START_V24_REAL_TRAINING.ps1` accept BOTH old legacy checkpoint and new segmented index via explicit `-Resume` and never silently train over an existing save. An unchanged source fingerprint and heldout partition are required. On reloading the 10,000-row legacy save, training picks up from 10,000, not from a falsely claimed unsaved 15,000.
- Checkpoint saves persist the last 16 frozen pre-action traces and observed-vs-predicted scoring examples. Source rows, actual outcome snippets, shape field and chosen path are inspectable in the live UI.
- `real-hypergeometry.mjs` exposes 16 deterministic measurable axes: 12 signed projections of actual observed lexical terms, plus graph-state role, evidence confidence, experience age, and goal attraction from the unchanged original `Discoverer.shape()`. The existing V24 semantic candidate search continues to use observed term co-occurrence. These 16 axes are **not** claimed to be autonomously learned or physical 4D coordinates.
- The UI is full-width with the actual graph ABOVE the controls, native-path animation, XY / ZW rotations, W section slicing, axis selectors, node inspectability, selected saved prediction histories and exact-vs-F1 scores. A separate Atlas button visualizes observed Q/A transitions and marks lexical-overlap connections as UNVERIFIED hypotheses. Atlas is a memory view, not a falsely solved path.
- The old V17 iframe starts collapsed and only loads after a verified original V17 server is detected. V24 probes the repository's common existing ports, including 8862, 8866, 8841 and 8840; if none is running it reports that original V17 is offline and keeps the working V24 graph visible.

## Real, independently reproducible CI evidence

- GitHub Actions on native Node.js 22 in Linux verifies original V22 parity, historical V23 text regressions, Q/A Parquet nested human/gpt, Windows-safe Q/A TXT, snapshot resume, frozen heldout, actual 16D graph source, HTTP endpoints and stats.
- The checkpoint regression test verifies source byte-for-byte preservation of a legacy v1 checkpoint, exact record IDs and learned postings after multi-segment restore/compaction, corruption SHA256 detection, and large-record writes that DO NOT build a giant JSON string.
- The load test **crosses the exact reported 15,000-row failure boundary**: 16,000 complete records, 16 heldout, 11,665,418 source characters, completed checkpoint and bounded memory on Linux GitHub CI. This synthetic-load result is not an OpenThoughts3 semantic result or GPU speed claim.
- Browser acceptance test launches the actual system Google Chrome on GitHub Actions with a real HTTP V24 trainer. Verified 16 axis controls, atlas of 22 real observed states, graph first on page, frozen row selection, correct-vs-actual display, offline V17 iframe safely hidden and **zero JavaScript browser exceptions**.
- Windows PowerShell 5.1 smoke starts the real new backend from Q/A TXT (including UTF-8 BOM), validates actual live progress, HTTP trace and final atomic checkpoint.

## Recovery on the user's Windows machine

1. Stop the **old V24 process** currently in error mode; it cannot self-update running JavaScript. Do not delete the runtime directory or old `atlas-v24.json`.
2. From the user's isolated existing repository checkout, run `git status --short` and `git pull --ff-only origin experiment/V24-REAL-CORPUS-NATIVE-SHAPE-20261107`. Do not force reset or overwrite local modifications.
3. Launch `powershell -NoProfile -ExecutionPolicy Bypass -File .\v17\START_V24_REAL_TRAINING.ps1 -Data 'D:\training\OpenThoughts3-1.2M' -Port 8899 -Resume`.
4. Visit `http://127.0.0.1:8899/`. The high-dimensional projection and saved prediction picker are displayed before the stats. `Atlasul observat` explores actual learned memory. If a separate original V17 server is online, the optional original pane can be expanded.
5. Check the displayed `saved cursor` against the new index. The first resumed run will reprocess unsaved rows after 10,000; this is required for correctness. Never call those rows previously preserved or claim the old unsaved 15k was recovered.

## Important limitations which remain open

While the *save bug, user-visible path projection and measurement observability* are addressed by the tests, V24 still retrieves answers from previously experienced Q/A and uses lexical similarity as hypotheses. It does NOT yet demonstrate 70% first-attempt correctness on completely novel semantic answers, a learned continuous hyperdimensional physics manifold, or one unified GPU V17/V24 brain. This hotfix must not be represented as final completion of the original scientific objective or as native CUDA training.

Associated evidence: `.github/workflows/v24-real-corpus-native-shape.yml`, `v17/tests/v24-checkpoint-recovery.test.mjs`, `v17/tests/v24-hypergeometry-live.test.mjs`, `v17/tests/v24-browser-live-smoke.mjs`, and `v17/research/relational-hypermaze/real-throughput-probe.mjs`.
