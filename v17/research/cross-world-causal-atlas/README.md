# MagicPerspective — Cross-world causal 4D atlas: tested discoveries, evidence, failures

**Date:** 2026-11-07. **Status:** ISOLATED EXPERIMENT, not the production V17 trainer, not natural-language Q/A. No existing original `Brain`, GPU, UI, noise-agent or checkpoint code was overwritten. Branch derives from `experiment/V17-GROUNDED-4D-TEXT-GOAL-BRAIN-20261107`.

## Reproducibility and provenance

A stand-alone Node.js experiment was reconstructed and executed in an isolated local runtime **before editing GitHub**. Nine `node --test` tests passed, zero failed. The exact implementation is committed here:

- `atlas-engine.mjs`: versioned persistent transformation evidence atlas with directly observed versus inferred links, confidence, competing candidate hypotheses, context parity, source-world identities and a complete directed 4D graph.
- `atlas-benchmark.mjs`: private test-world physics, 32 fragmented training worlds, frozen unseen-world evaluation, actual multi-step pre-action routes, all comparisons, training learning curves and changed-physics diagnosis.
- `atlas-engine.test.mjs`: nine regression/invariance/ablation/failure/restore tests, including 15% corrupted transition observations.
- `atlas-viewer.html`: evidence-only readout; load `results.json` and `atlas-2048-edges.json`, choose 4D slices, inspect every learned/inferred edge and all successful/failed path controls.
- `results/`: MACHINE-GENERATED complete machine-readable evidence. The CI job regenerates and publishes the JSON files **only after all tests pass**.

## The actual hypothesis

A single local exercise does **not** contain every possible transformation. Instead of fitting movement directly from that exercise, let the organism accumulate causal experiences across many separate worlds:

`(world, state_4D, action, actually_observed_next_state_4D)`.

Every trained action has competing candidate laws: one fixed translation and four conditional variants. The conditional variants allow one of the **four current coordinate parities** to control the effect. The learner chooses the rule that best explains all observations, with a complexity preference for the fixed rule when tied. It records training mismatch counts, supporting world IDs, event IDs and alternatives. It NEVER reads the test physics when constructing its atlas or before-action path.

For each new world, the environment reveals the **complete 256-cell occupancy map**, including walls and start/goal. The agent supplies learned transitions and builds all 256 × 8 = **2,048 possible directed actions**. Routes are then found by conventional breadth-first search using that map and learned transitions, **before the first physical step**. The hidden physics is consulted only AFTER the route is committed, to evaluate actual correctness. A separate test oracle computes the true shortest route for evaluation; it is never passed to the atlas.

This is deliberately an **engineered four-dimensional, structured state-action experiment**. The four axes and the candidate family of conditional-parity operators are predefined; the learner determines which context dimension and delta apply. This does not establish automatic discovery of unrestricted dimensions, text semantics, or arbitrary mathematical operations.

## Measured local outcomes: 3 seeds × 96 never-seen 4D worlds

| Test | Seed 17 | Seed 29 | Seed 47 | All 288 |
|---|---:|---:|---:|---:|
| Full shared atlas: solved on first attempt | 96 | 96 | 96 | **288/288** |
| Full shared atlas: shortest path | 96 | 96 | 96 | **288/288** |
| Fixed transformations, ignoring conditional context | 3 | 6 | 3 | **12/288** |
| Train only on the last individual source world | 0 | 0 | 0 | **0/288** |
| Hide two of the four dimensions | 0 | 1 | 1 | **2/288** |

Training: **32 separate worlds × 76 observed transitions = 2,432**, with **only 2 of 8 actions observed in each individual world**; world events are interleaved for the learning-curve test. The learnt full model identifies exactly **six conditional and two fixed operators**. Each unseen test world has 256 4D states and independent obstacles. All 288 frozen evaluation worlds were solved with optimal paths before action, not by waiting for the correct trajectory and copying it.

Full atlas, seed 17: **2,048 possible edges = 1,429 previously observed exact state/action transitions + 619 inferred from other experiences**. Seed 29: **1,426 observed + 622 inferred**. Seed 47: **1,423 observed + 625 inferred**. The inference is the candidate conditional rule applied to previously unobserved state/action pairs, not hidden test outcomes.

A deliberate out-of-distribution rule change of one action in a new world makes exactly **256 of 2,048 edges wrong**. The resulting failure ledger reports each affected state, chosen action, intended target, actual target, source examples and cause `context-dependent-rule-changed-in-new-world`. This is direct evidence of a world-model generalization boundary.

The learner also tolerates a controlled **15% corruption rate in recorded training outcomes**: the 3 × 96 heldout routes remain 288/288, even though fit residuals become non-zero. This tests robustness to supplied noise. It does NOT prove the original V17 NoiseAgency independently found these dimensions or improved the policy.

## The actual learning curve (different from earlier claims)

| Shared observations | Seed 17 | Seed 29 | Seed 47 | Total /288 |
|---:|---:|---:|---:|---:|
| 32 | 34 | 96 | 30 | **160/288** |
| 64 | 96 | 96 | 96 | **288/288** |
| 96 | 96 | 96 | 96 | **288/288** |
| 128, 192, 320, 512, 768, 1,280, 2,432 | 96 each | 96 each | 96 each | **288/288** |

**Important correction:** Earlier conversational figures suggested 1/288 for the fixed ablation and a substantially later learning threshold. Those numbers were not reproducible from source available in the current isolated runtime. We rebuilt the experiment and reran the exact stated conditions; the results in this file, the local `node --test` logs and the independent GitHub CI job take precedence. Do not cite earlier figures as confirmed.

Example successful initial solution shape (seed 17, first withheld world): `lift → fold → lift → phase → sweep`. The fully fixed-rule baseline instead proposed `echo → lift → lift → curl → sweep`. Its **first step is wrong**: from state ID 208, the model predicts state 16, whereas the environment actually sends it to state 144. The negative-path ledger records that particular transition; nothing is inferred from the answer during planning.

## Full auditability: successful and unsuccessful routes

The generated `results/results.json` contains **every one of the 288 unseen pre-action path shapes**, full step-by-step edges including evidence/world provenance, all **288 per-world negative-control comparisons**, the first incorrect edge, the reason for failure, and blocked frontier counts for fixed, isolated-world and hidden-axis controls. The generated `results/atlas-2048-edges.json` contains the **complete 2,048-edge network**, inferred versus direct status, confidence, candidate laws and source event IDs. `results/training-fragments.json` contains the 32 real structured observational transcripts from the source worlds. Both code and files are reproducible from declared deterministic seeds; outputs must not be hand-edited.

A provenance claim is narrower than a causal proof: the rule induction is measured, but all 4D coordinates and the operator hypothesis repertoire are supplied by the test designer.

## Reproduce from repo root

```bash
cd v17/research/cross-world-causal-atlas
node --test atlas-engine.test.mjs
node atlas-benchmark.mjs results
# View atlas-viewer.html using a local static server, or use its JSON file picker.
```

To inspect the complete atlas, open `atlas-viewer.html`, choose `results/atlas-2048-edges.json` and `results/results.json` in the file picker. It shows 4D sections, every action's context axis and learned rule, supporting observed worlds, all 288 complete initial routes, and the reason each ablation failed.

## Existing discoveries cross-checked instead of erased

This experiment follows and complements the original `ConstructedTransitionGraph` / `ConstructedPathLearner` in `v17/transcend/torus-aether/worlds/constructed-paths.mjs`, the native `TextWorldNavigator` and `NoiseAgency` from PR #62, the `LearnedAxisNavigator`, `path-holonomy.mjs`, `isolated/language-paths/cross_world_transfer.mjs` and the existing large-language `TextActionPaths` experiments. Those components are not magically the same trained model: a prior transfer control explicitly found that an equal-prior target-only baseline matched the supposed cross-domain transfer gain.

Next integration gate: ingest actual grounded text-world transformations into an ORIGINAL native V17 Brain and persistent graph with no leakage; expose discovered versus missing edges in the old live UI; build a shared trainable goal-conditioned representation for natural long-text tasks rather than a hand-coded four-axis parity family; test frozen unseen natural-language complete answers against strong non-atlas baselines; measure GPU training speed without turning into a next-character-only model. Until then, this is a successful bounded *mechanism experiment*, not the requested fully trained general hyperdimensional language organism.
