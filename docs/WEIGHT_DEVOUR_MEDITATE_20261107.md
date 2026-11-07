# MagicPerspective — Weight Devour / `meditate()` research record

**Date:** 2026-11-07. **Status:** ISOLATED, PROOF OF CONCEPT; NOT integrated into or certified as the original V17 neural Brain. **Release gate:** existing language/maze regression remains OPEN.

## Exact task and intended distinction

User requests, quoted from the current conversation:

> "I'm not talking about distilling it. I'm talking about giving the weights and let it devour it"
>
> "And use something like meditate() that will allow our organism to dream about itself and learn the transformations it can do with the absorbed brain?  Maybe it finds the intelligence hidden in his latent space or something ,but in such way that we don't just add the weights of qwen into our organism"
>
> "Go train a small neural network and use MagicPerspective go find a way to produce results . See what we can do"
>
> "Post and document everything on main on magic Perspective and post all test files and results !"

**Interpretation for this *extra, opt-in research experiment*:** train a small donor; inspect donor numeric weights, not its answers, to construct an independent graph/atlas of usable transformations; search compositions and goal routes; test on heldout examples and compare to random-weight controls. Do **not** claim the original V17 `Brain` learned this, that Qwen was used, or that Qwen-like abilities were extracted.

## Where to find everything

All original source and result files are archived without editing in [`experiments/weight-devour-20261107/`](../experiments/weight-devour-20261107/). Includes the two **actual PyTorch donor checkpoints** (`donor_weights.pt`, `nonlinear_donor_weights.pt`), **weight-derived atlases** (`weight_atlas.json`, `nonlinear_dream_field.npz`), all source scripts and auxiliary checks (`experiment.py`, `nonlinear.py`, `generator_compression.py`, `robustness.py`, `nonlinear_robustness.py`, `test_weight_devour.py`), raw JSON results, logs, `SHA256SUMS.txt` and `validation.log`. `nonlinear_robustness.py` belongs to an *incomplete* interrupted experiment; there is **no** multi-seed nonlinear success result to report.

The original zip of the standalone experiment is also saved as `original_experiment.zip` for convenient archival. The archive predates the new `unittest` acceptance tests, which are included separately in this folder.

## Source: where MagicPerspective was adapted (NOT executed natively)

Checked in `dan3s2020/MagicPerspective`, branch `experiment/V17-NATIVE-COUPLED-GOAL-ROUTES-20261107`:

- `v17/transcend/torus-aether/worlds/exercise.mjs`: `Discoverer.shape()` spreads `0.97 * conductance * maximum(neighbor_attraction)` and climbs an attraction field toward a goal.
- `v17/transcend/torus-aether/devour/brain.mjs`: existing `Brain` and distinct modules already own saved V17 state and interpret world observations.

The experimental Python method `WeightAtlas.plan_via_attraction_wave` is an **adaptation of the attraction-wave concept on an eight-action computed state tree**; it is not an import, faithful line-for-line reproduction of `Discoverer.shape`, or a new native V17 motor. This distinction is essential under repository `AGENTS.md` and the still-open issue #25.

## Donor architectures and precise mechanism

**Experiment A: finite D4 transformations.** Train a 2-input, 24-hidden-unit tanh model with eight named parameter gates using Adam on the eight square symmetries. Parameter count: **4,730**. The donor knows the transformation targets *while being trained*. After training, `WeightAtlas.meditate()` receives **only parameter arrays**, calculates exact chain-rule Jacobians at 256 random coordinate anchors, averages the eight 2x2 Jacobians, and computes a per-operation zero-input offset. Its independent atlas contains **48 floating point coefficients**. Inverse and composition relations are inferred from the atlas matrices. The weight-atlas planner builds an explicit breadth-unfolded action tree from these operations, seeds reachable goal states, propagates attraction `0.97` backward, and predicts an action sequence before executing it. **The evaluator supplies the true target position as the goal**; discovering an unknown natural-language answer from an incomplete question is not demonstrated.

**Generator search.** Given the recovered eight-action table for seed 17, `generator_compression.py` searches smaller generating sets and finds two operation IDs `[1,4]` plus composition recipes. The **12** number counts continuous matrix/offset coefficients only; representation of recipes, generator IDs and program code occupies additional bits.

**Experiment B: nonlinear state-dependent transformations.** Train an 8,354-parameter network with 32 hidden units on curved shears, rotations and reflections. `LocalField.meditate()` calculates an independent **7x7 local Jacobian grid for each of eight operation IDs** (1,568 derivative coefficients, plus offsets/grid). At inference, the field bilinearly interpolates derivatives and integrates over a line from origin to the input. No donor forward call is used to execute atlas predictions. `observe_inverse_closure()` tests predicted inverse actions using self-composed round trips, without true inverse labels. The world/evaluator uses the true transformations to check the frozen model afterward.

**Information that is NOT withheld:** the model architecture, layer order and eight operation IDs are known to the weight reader, and external goal state is given to the planner. Thus this is not an unguided discovery of the causal decomposition of an unknown transformer checkpoint.

## Recorded results (archived JSON files are authoritative)

All seed results below are measured **for the controlled toy tasks and stated thresholds**, not universally true outcomes.

| Dataset / test | Recorded result |
|---|---:|
| Linear donor seeds | 17, 29, 43, 67, 101 (5 independently trained networks) |
| Linear weight atlas: unseen single operations, L2 < 0.10 | 2,560 / 2,560 |
| Linear weight atlas: unseen five-operation sequences, L2 < 0.10 | 2,560 / 2,560 |
| Inferred 8x8 composition rules | 320 / 320 |
| Linear weight-derived atlas: goal navigation, L2 < 0.085 | 360 / 360 |
| Untrained initial-weight control: goal navigation, same tests | 2 / 360 |
| Row-scrambled trained-gate control (seed 17) | 4 / 72 goals (intact: 72 / 72) |
| Two-generator reconstruction (seed 17) | 512/512 single, 512/512 five-operation, 72/72 goals |
| Nonlinear (one donor seed): local field single test, L2 < 0.05 | 256 / 256 |
| Nonlinear same tests: single global affine approximation | 202 / 256 |
| Nonlinear same tests: untrained-weights control | 1 / 256 |
| Nonlinear local field: unseen three-step sequences, L2 < 0.10 | 256 / 256 |
| Nonlinear local field: reconstructed inverse operation IDs | 8 / 8 |

A new separate replay on 2026-11-07 loaded the archived `.pt` files with `weights_only=True`, reconstructed the stored affine and nonlinear field artifacts, checked composition and trained/random-control separation, and passed **3/3** `unittest` cases. Its original terminal trace is `validation.log`. This is **not** a rerun of every 1,400/2,200 training step or a full native CUDA acceptance run.

## Run/reproduce (Python 3.10+, CPU sufficient)

From the experiment folder, with `torch` and `numpy` installed:

```sh
python -m pip install -r requirements.txt
python -m unittest -v test_weight_devour.py
python experiment.py --steps 1400 --seed 17
python generator_compression.py
python robustness.py
python nonlinear.py
```

Caution: the four reproduction/training commands **overwrite experiment result files** in the current directory. To preserve the exact archived results, clone/copy this experiment folder to a scratch directory and train there. `nonlinear_robustness.py` is supplied for completeness but its full run was not finished, and it is not an accepted result.

Inspect `SHA256SUMS.txt` to verify bytes. To run reproducibly with file copies, capture Python/PyTorch/NumPy version and hardware, and compare with **numeric tolerances**, not bit-identical floating point or exact wall-clock times.

## Findings and negative boundaries

- A trained parameter graph can encode a compact, externally testable set of transformations; with access to architecture and operation slots, weight-only local derivatives can recover those transformations in this task.
- Nonlinear local fields outperform one averaged global linear field on the selected heldout set.
- This is **not conventional output-response distillation**, but mathematically it remains analytic model extraction/compression from parameters. `meditate()` is internal Jacobian sampling and numerical integration, not proof of consciousness or automatic discovery of arbitrary intelligence.
- These networks approximate simple 2D physical transformations. Large parameter reductions on this problem **do not imply** Qwen's learned language capabilities have a similarly compact exact algebra.
- Qwen model weights were **not** used; no transformer attention, MLP or MoE circuit was measured.
- No claim of a trained original V17 `Brain` on this task, no interactive native UI, CUDA speedup, multimodal learning, 100% unseen natural language, or correction of existing open regressions.
- Future falsification tests: unlabeled operation discovery (do not reveal the eight gate IDs); donor weight permutations that preserve function; random network and independent initialization controls; cross-task transfer; strict compute/memory budgets; Qwen-specific tensor slicing with contextual causal interventions; heldout text/maze tasks; full native V17 integration only on an explicitly authorized isolated branch after preserving original methods.

## Preservation / change scope

This commit **only adds new isolated research files and the required user-intent change contract on `main`**. Original sources, original neural weights/checkpoints, UI and native CUDA worker are unchanged. Existing regression/release gate is still OPEN.
