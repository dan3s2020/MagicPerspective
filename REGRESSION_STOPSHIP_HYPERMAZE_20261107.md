# RELEASE BLOCKER — MagicPerspective V17: hyperdimensional text-path motor replaced by statistics

**Status: CRITICAL / NOT ACCEPTED / NO USER START COMMAND.** Opened 2026-11-07; applies to ALL descendants and derivative TinyStories branches unless the contract test below passes. Branch: fix/V17-HYPERMAZE-ARCHITECTURE-REGRESSION-20261107.

This regression is not a cosmetic UI issue or a GPU installation problem. A previous assistant substituted a next-byte/hashed-frequency learner for the user's requested ORIGINAL V17 self/world/action/path learning architecture while calling the replacement 'one brain' and implying 5D geometry made language navigable. It does NOT. Mark this before making further feature claims.

## Original required invariant (must survive implementation)

1. ONE persistent organism with an internal **self + world + state + action + observed transformation** model, not separate worker brains and not merely an ND graph image.
2. **Pre-action, goal-conditioned global solution-shape prediction** (planned states/path/actions) before the first answer character/action is emitted. The withheld reference answer MUST NOT participate in choosing the plan or its target; the question/task itself must specify or allow the target to be inferred without reference leakage.
3. The SAME state→action→successor grammar and path-selection policy is used in hidden 2D maze, text world and transformations; task-specific observation encoders may differ, but the mechanism cannot be replaced with unrelated teacher-forced byte prediction.
4. **Act/observe/delta/repair**: after initial planning, execute each action, compare predicted and actually observed state, expose and learn divergence, replan from updated belief.
5. **Endogenous NoiseAgency** genuinely changes perceptual or action hypotheses and learns whether its intervention helped; test its causal impact, not just a visual slider.
6. 4D/5D geometry must be **used by the route policy** and its causal effect tested against shuffled coordinates/noise ablation. A 2D projection of unrelated learned co-occurrence positions does not meet the condition.
7. Genuine CUDA training needs measured device residency, throughput, exact persistence, no silent fallback; browser UI must reflect actual same policy state and show complete pre-action route, executed steps and residual.
8. Preserve every pre-existing file, user checkpoint and verbatim archive; mark the former research path and findings as evidence, not delete them. Frozen heldout tests never train.
9. **Do not ship until acceptance.** Report shape exact match, first-action correctness, endpoint/answer exact match and long unseen text (not a cherry-picked synthetic fixture), multiple disjoint seeds, against no-geometry / no-noise / shuffled-action baselines.
10. 100% on arbitrarily ambiguous previously unseen long natural-language answers cannot be guaranteed by any deterministic or stochastic engine without unique identifiable solution constraints. The desired 100% is an EXPERIMENTAL ACCEPTANCE TARGET to measure, NEVER a fact to claim without reproducible evidence.

## Source-grounded regression map

| Source | Before / requirement | Regression / observed behavior |
|---|---|---|
| `v17/transcend/torus-aether/devour/brain.mjs` | Original `Brain.imagine`, `Brain.live`, `enableEndogenousNoise`, `playMaze`, `trainConstructedMaze`, `ConstructedPathLearner`, `learnObservedTransformations`. | This original motor is not the primary TinyStories CUDA text training/generation motor. |
| `v17/transcend/torus-aether/worlds/constructed-paths.mjs` | Reusable `ConstructedTransitionGraph`, `construct`, `navigateBlind`, `imagineText`, `learnTransferable`. | No identity of policy/representation guaranteed for the new byte trainer. |
| `v17/transcend/torus-aether/worlds/noise-agency.mjs` | Endogenous noise acts and receives learning feedback. | New `fast_text.py`/unified GPU heads have no equivalent behavioral noise loop. |
| `v17/transcend/torus-aether/gpu/fast_text.py` | Keep the user's real 2,119,489 TinyStories and ~1.89 billion UTF-8-byte learned checkpoint. | `StreamingFastText` predicts 1–4 previous-byte contexts, not a task/goal-conditioned solution graph. |
| `v17/transcend/torus-aether/gpu/unified_fast.py` | Causal transformations with goal-conditioned route selection. | Hash contexts, local transition counts, 5D symbol co-occurrence; `plan()` follows locally frequent bytes without a goal. |
| `v17/transcend/torus-aether/gpu/unified_worlds.py` | Generalize same path algorithm from mazes to text without reading teacher in test. | Maze-policy head trained with true distance field and does NOT share state/action decision machinery with text. |
| `v17/research/tinystories/native-worlds-worker.mjs` | Avoid a slow separate process; unify original model knowledge. | Previous dual worker fork read same source independently and reached only 0.03% when fast model reached 100%. |
| `v17/research/tinystories/ui/index.html` | Old working TinyStories one-button UI; every displayed graph/metric causal and measured. | Secondary V17 controls, then re-labeled metrics, which did not prove the requested functional mechanism. |
| `v17/docs/TEXT_HYPERPATH_REQUIREMENT_20261106.md` | Explicitly says text is a navigable transformation world and initial answer shape must precede action. | No strict release gate prevented substituting byte predictor and counting green UI tests as acceptance. |
| `v17/docs/ACTUAL_MULTIDIMENSIONAL_LANGUAGE_PATHS_20261107.md` | Geometry was shown to be observational: shuffled 5D coordinates changed traces but not generated characters. | Mistaken inference from a 5D display into a causally navigated text solution. |

## What has NOT been proven

The user reports 100% maze first-path prediction in earlier experiments. This needs *metric-specific provenance*: with a complete known map, a written BFS/propagator can return a path first time on unseen maze layouts, but this alone is not proof of learned semantic text paths or of masked-world performance. The more recent blind-maze metrics differ and must not be conflated.

The observed ~64.43% TinyStories-valid top-1 UTF-8 prediction is a teacher-forced metric. It is not first-try answer correctness, path accuracy, goal reachability, complete-story generation accuracy, nor general intelligence. Running more epochs may improve or degrade heldout prediction and is not evidence of new knowledge.

## Non-negotiable acceptance before giving a run command

- Test **full original mechanism calls** and behavior against the path/NoiseAgency/maze/transform code, not merely source substrings or a fake UI.
- Use a strict information barrier: construct state, goal and full path **before** revealing held-out reference.
- Test real long heldout text from distinct source files; full response correctness must be reported separately from next-byte and token-masked metrics. No test-data leakage.
- Demonstrate geometry/noise **causal ablations**: disable/shuffle and compare learned route; all outcomes must be transparent (no artificial "passes" merely because code executed).
- Measure on the actual RTX 3050 Ti before claiming hundreds of exercises/sec or MB/sec across ALL mechanisms; CI NumPy parity is not a CUDA benchmark.
- Model migration must load the learned TinyStories checkpoint unchanged; make byte-identical backup before any new save; demonstrate restart/restore.
- Green CI is only a prerequisite. **If first-try exact long unseen answers do not hit 100%, never say the requirement is complete or supply a final user launch command.**

## Incident record

Source: user's current conversation, 2026-11-07. The exact visible user directive is in `verbatim/2026-11-07-HYPERMAZE-REGRESSION-STOPSHIP-USER-VERBATIM.txt`. Legacy source SHA and file list remain in Git history; this branch intentionally does not rewrite main, older branches, or saved .v8/.npz files.
