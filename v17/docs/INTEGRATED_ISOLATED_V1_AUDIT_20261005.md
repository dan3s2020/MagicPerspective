# OCTOPUS INTEGRATED ISOLATED V1 — DIRECT AUDIT EVIDENCE

Audit date: 2026-10-05
Audit local time context: Europe/Bucharest (UTC+03:00)
Isolated branch: `OCTOPUS-JACKPOT-NODEGRAPH-TEXT-ISOLATED-V1-20261005`
Source commit: `9959bc2f748c42bee984555469287f118f019748`
Audit baseline head before this evidence commit: `392469b66ea815f4440358d7ea01b572487b7633`

## Runtime diff rule

The isolated branch was compared directly against the source commit.

Runtime/UI canonical files have zero behavioral edits on the isolated branch.

The only repository differences from the exact source are:
- `RUN_ISOLATED_INTEGRATED_V1.cmd` — added wrapper;
- `docs/INTEGRATED_ISOLATED_V1_SOURCE_LOCK.md` — added provenance;
- `tests/isolated-integrated-source-lock.mjs` — added source-lock verification;
- `tests/native-nodegraph-fusion-contract.mjs` — one stale expected bridge blob updated to the bridge blob actually present in the source commit.

No CUDA, native UI, Text World, NodeGraph UI, reward, policy, maps, freeze, or solo-eval runtime code was changed.

## Direct code audit result

PASS:
- 15 canonical blobs checked against exact expected source blobs.
- Native `FreezeCurrentPolicy()` present.
- Native `LaunchSoloRun(int mode)` present.
- Native A ONLY / B ONLY labels present.
- Desktop `SAME-DISH / 2D TRAINING` tab present.
- Desktop `TEXT TRAINING` tab present.
- `FREEZE / SOLO EVALUATION` panel present.
- `ALL SIMULATIONS WALL` present.
- `LEARNING CURVES` present.
- CUDA `loadCanonicalBatch` present.
- CUDA `initKernel` present.
- CUDA `simulateChunkKernel` present.
- Native NodeGraph telemetry writer present.
- Native progress callback still receives the same telemetry snapshot after telemetry write.
- Browser NodeGraph WORKFLOW tab present.
- Browser NodeGraph BRAIN tab present.
- Browser NodeGraph TEXT TRAINER tab present.
- Per-tab graph state containers present.
- Bridge routes for Same-Dish, NodeGraph and Text Training present.
- Text World runtime creation/configuration/simulation/snapshot paths present.
- A learning path calls `learnGroup(state,"A",...)`.
- B learning path calls `learnGroup(state,"B",...)`.
- Adam optimizer step is present.
- Concept World training step is present.
- Snapshot exposes separate A/B brain steps and concept steps.
- DEFAULT_GRAPH structural hash = 1587881086.
- BRAIN_GRAPH structural hash = 1549183227.
- DEFAULT_GRAPH = 21 nodes / 39 edges.
- BRAIN_GRAPH = 19 nodes / 51 edges.
- DEFAULT_GRAPH port compatibility validation PASS.
- BRAIN_GRAPH port compatibility validation PASS.
- TEXT_TRAINING_GRAPH port compatibility validation PASS.
- Required Text Trainer nodes present.
- Stale bridge source-lock corrected from the old expected blob to the actual source blob.

## Hosted CI note

A temporary GitHub Actions workflow was used as an execution probe on both Windows and Linux hosted runners.

Both runs were terminated before a runner was allocated:
- runner_id = 0
- zero workflow steps executed

Therefore those red workflow runs are infrastructure/non-execution results, not test failures. The temporary workflow was removed from the isolated branch so it cannot be mistaken for a product regression.

## What was not falsely claimed

This environment does not provide:
- Windows Dear ImGui runtime;
- NVIDIA CUDA GPU/driver;
- Visual Studio CUDA toolchain;
- direct access to the user's physical Windows desktop.

Therefore this audit does NOT claim that a fresh native CUDA build and GUI launch were executed inside the assistant sandbox.

The isolated launcher is intentionally designed to perform the target-machine checks before launch:
1. exact source-lock test;
2. native build if executable is absent;
3. canonical Fusion preflight;
4. Node/Python contract/smoke tests;
5. native desktop start;
6. bridge start;
7. NodeGraph browser start.

If any target-machine preflight step fails, the launcher stops instead of starting a partially validated runtime.

## Next measured evidence

After the isolated application starts on the target Windows/NVIDIA machine, the next evidence to record is:

training -> freeze -> A ONLY -> exact result -> B ONLY from the same frozen state -> exact result

The run must record:
- source/HEAD;
- seed;
- selected maps;
- simulation count;
- max actions;
- frozen configuration;
- A_ONLY result;
- B_ONLY result.

This is learning evidence and must remain separate from contract/audit PASS results.
