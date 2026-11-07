# MagicPerspective — independent internal V22 source execution audit, 2026-11-07

**Status: PARTIAL EVIDENCE / BLOCKED FOR RELEASE. This is NOT the requested completed language hypermaze.**

Original user requirements: preserve the original V17 solution-shape organism, no next-character predictor substitution, reproduce first-attempt whole-answer prediction on unseen long real text, real noise navigation, preserve ALL existing controls and checkpoints, and do not claim success before internally measured evidence. This audit is additive only.

## Provenance
- Tested experiment branch: `experiment/V22-EXACT-DISCOVERER-TEXT-LABYRINTH-20261107`. Main source tree at documentation time: `ab18e6035cadcc275785f4348a65fee5b9053433`.
- Source files and their **individual Git blob SHA-1s** are recorded in the adjacent `INTERNAL_V22_SOURCE_EXECUTION_RESULTS_20261107.json`. Original immutable `exercise-v17-IMMUTABLE-BASELINE.mjs` was `e34d787467b7238c7422a0509173b1f785eb2342`.
- Execution: load the FIVE real source files through the authenticated GitHub connection; strip JS module `import`/`export` syntax only, inject exact module symbols and run **unchanged function bodies** inside a fresh isolated V8 JS runtime. This is independent execution of actual functions, **not** execution of full Node/CUDA app, Windows launcher or dataset.
- No original GitHub source file, source branch, checkpoint, dataset, UI, or `main` file was modified.

## Raw internal observations

| Case | Actual result | Interpretation |
|---|---|---|
| 84 V17 original vs V22 `playExercise` pairs | **84/84 exact JSON equality**; 0 mismatches | Same maze actions, paths, outputs and first-step-shape records for tested episodes, at temperature 0/.45 and noise 0/.18, sizes 7/9/11, seven seeded episodes per size and setting |
| Induce text edits from four observed full sentences | `Discoverer.shape` called directly; full proposed path frozen before action; one-step edit reaches `She is calm .`; 6 induced rules | Small constrained **state-edit navigation**, not natural-language answer understanding |
| 76-token state | One learned replacement of the first token from `Bob` to `Alice`; 75 other tokens copied | Goal already specifies `Alice`; copying unchanged tokens is not generating a novel long answer |
| 97-token state | `Error: Invalid cognitive planning limits` | **Fails large input** |
| Remove learned rules and replan | `found=false` | The local state-edit path depends on observed rules (good ablation on THIS task) |
| Unknown target `never-seen` | `found=false` | No evidence of general semantic novel-goal generation |

Raw machine-readable result: `docs/INTERNAL_V22_SOURCE_EXECUTION_RESULTS_20261107.json`.

## Source-level blocking facts

1. `learned-cognitive-map.mjs`: `observeSentence` ignores length **greater than 96 tokens**, and `buildWorld` throws if input length exceeds 96. Defaults: `maxNodes=768`, `maxDepth=12`.
2. `matchGoal()` requires an explicit `goal.slots` object. The successful frozen text case already provided `"She"` and `"calm"` as target tokens. This is a **checkable constrained edit**, not discovering a missing unconstrained long-form answer.
3. The one-step text execution test's environment checks/applies the very same edit supplied as action; no independent semantic math/QA oracle was verified.
4. `novelGoal` means the exact resulting state was not in the observation map. It is **not** proof that the semantics of the answer were unknown or learned.
5. Original `Discoverer.shape` is genuinely invoked over the learned graph and has the same field recurrence in the tested path. That does NOT establish enough world topology/actions from real language.
6. Original V21 `TextCard`/GPU byte prediction is a separate inappropriate primary metric for this specific goal; see `docs/CRITICAL_REGRESSION_TEXTCARD_VS_HYPERDIMENSIONAL_GOAL_PATHS_20261107.md`.

## Required next acceptance (NOT achieved here)

- Frozen real multi-megabyte source training and **independent** answer-blind heldout tasks whose correct answers are never provided as `goal.slots`, prefixes, or targets during planning.
- A learned contextual state/self/action/effect topology; full candidate solution shape **before** first answer-producing action; independent semantic/world step feedback, noise, executed path, corrective replanning, strong negative controls.
- Causal ablation of learned axes/edges on **heldout real goal correctness**, and comparison to original V17 baseline.
- Same V17 native Brain, old UI controls/graphs, maze/text/transform and checkpoints preserved; actual Windows/CUDA throughput and >96-token correctness tested on target hardware.
- Explicit review before declaring 100% or merging. Issue #25 remains open. **Do not give a production launch command based on this audit.**

The audit deliberately records failures and does not rewrite any existing engine, demo, corpus or metric.
