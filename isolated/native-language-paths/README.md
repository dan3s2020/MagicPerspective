# MagicPerspective V17 — native language paths, real-corpus experiment

**State: experimental. No demo corpus, no fabricated training results.**

## Exact user request

> ok,hai ,demonstreaza intr-o versiune izolata,fara niciun demo.,in D:/ ,astept powershell command

Prior binding correction: preserve the ORIGINAL 2D maze organism solution-shape propagation and perspective transformation. Do not replace the method with an invented 32D latent model, standalone predictor or other auxiliary trainer.

## Source-to-change contract

Original source: v17/transcend/torus-aether/worlds/exercise.mjs, Discoverer.shape.
Original training source: v17/transcend/torus-aether/devour/brain.mjs and v17/transcend/torus-aether/align.mjs.
Original Parquet source: v17/transcend/torus-aether/data/text-dataset.mjs.

Modified ORIGINAL file: worlds/exercise.mjs: one backward-compatible optional adjacency argument to its existing shape function; legacy grid behavior is preserved. All unrelated code is untouched.

Added isolated files:
- atlas.mjs: corpus-observed Q/A graph. It stores train-only question-answer and answer-sentence transitions. Graph cue links use explicitly coded lexical similarity, not learned semantics.
- train.mjs: actually trains original V17 Brain.live on OpenThoughts Parquet TRAINING rows, and original V17 Discoverer via real maze episodes; evaluates on real Parquet HELD-OUT rows never provided in training.
- native.test.mjs: verifies legacy maze original vs graph-mode parity on 30 mazes, source isolation and actual graph route execution.
- START_NATIVE_LANGUAGE_PATHS.ps1: safe Windows launcher in repository root.
- GitHub Actions source regression workflow.

## Run

Clone a fresh branch checkout on D:, then run:

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Native-Language-Paths\START_NATIVE_LANGUAGE_PATHS.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Native-Language-Run" -Rows 1000 -Bytes 120000 -Maze 160 -Eval 8

Requires actual local Parquet data and Node.js 20+. Missing corpus is an ERROR; no mock data, demo mode or canned answer fallback.

Produced local files in the output directory:
- brain.v8: original trained V17 brain.
- atlas.json: observed question-answer state graph, training rows only.
- progress.json: resumable corpus cursor.
- report.json: frozen held-out evidence paths, native goal-field F1, lexical-only F1, original free next-character F1, exact scores and source-leakage check.

To continue, rerun with -Resume and increased -Rows / -Bytes limits. Existing checkpoints are never silently overwritten.

## What can and cannot be concluded

The new graph has answer goals that come from STORED TRAINING ANSWERS. It is a real data-driven retrieval/action graph, NOT learned open-ended natural-language semantics. Its link from an unseen query to observed evidence is explicitly lexical. A goal being reached does not imply the answer is correct. An improvement over original next-character prediction alone is insufficient: **lexical-only retrieval is also a required baseline**. If native shape underperforms, report failure.

Original V17 UI, original CUDA implementation, workers and checkpoints are preserved on this isolated branch. This new research evaluator is CPU/JavaScript; it does not claim the added graph is trained on CUDA. V17's old ASCII-only byte processing remains unchanged, and its Unicode loss is reported separately. Remote CI cannot access the actual D-drive Parquet dataset or the user's GPU; it cannot certify final test metrics. The blocking regression and main branch remain unchanged. Do not claim full user-requested maze-language transfer proven or merge without actual held-out evidence and user approval.
