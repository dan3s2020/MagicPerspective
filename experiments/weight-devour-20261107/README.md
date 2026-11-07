# MagicPerspective — Weight Devour + Meditate (isolated research)

**Status:** tested local prototype (Python/PyTorch CPU), **not** merged with, or an execution of, the original MagicPerspective V17 JavaScript `Brain` runtime. Source concepts were checked against the real MagicPerspective GitHub repository `dan3s2020/MagicPerspective` and its experimental V17 `Discoverer.shape` mechanism on 2026-11-07. The `plan_via_attraction_wave` routine is a **port/adaptation** of the V17 goal-attraction propagation rule, not an import of V17's classes. No existing repo file or checkpoint was overwritten.

## Idea

Train a small **donor network**, then allow a separate **devourer** to inspect only its learned numerical parameters. The devourer has **no access to training examples, answer labels, or donor-generated predictions** during ingestion. `meditate()` reads parameter matrices and computes local analytic Jacobians (chain-rule pathways) at imagined input/latent coordinates. A new independent atlas is formed from those transformations; the donor network is no longer used to execute atlas predictions. Crucially, this does **not** copy Qwen, train on Qwen output, or establish language intelligence.

The world/environment and evaluator *do* know the true transformations, and are used to train the donor and **separately** score held-out results after the atlas has been frozen. This is a controlled proof of concept.

## Experiment A — finite transformation algebra

- Donor architecture: 2-dimensional input, `tanh` encoder width 24, eight separately trained 24×24 latent transformation matrices, `tanh` nonlinearity, learned 2-dimensional decoder.
- Donor has 4,730 trainable float32 parameters. Trained by Adam for 1,400 iterations, batch size 384, on the eight symmetries of a square (D4); identities are known to the training data generator, **not** the devourer.
- Devourer reads donor weights, computes exact local Jacobians via the chain rule at 256 internally sampled coordinates, retains eight 2×2 effective matrices plus eight 2D offsets (48 real coefficients).
- Pre-action planner unfolds reachable state transitions, propagates a goal-attraction wave inspired by MagicPerspective V17's `Discoverer.shape` (`0.97 * successor attraction`), then climbs the wave to return the whole path before executing it. Path replay is asserted to match the frozen plan.
- True unseen test task generated independently of `meditate()`.

### Results

| Independent training seeds | Single operation | Unseen 5-operation sequence | Discovered composition table | Nontrivial goal planning | Random untrained goal control |
|---|---:|---:|---:|---:|---:|
| 17, 29, 43, 67, 101 | 2,560/2,560 | 2,560/2,560 | 320/320 | 360/360 | 2/360 |

Accuracy requires Euclidean error `< 0.10` for direct and composed operations. Goal planning uses the stricter `< 0.085` tolerance and excludes near-zero input vectors and targets near the start. All tests use seeded heldout examples. A separately tested within-seed scrambling of trained internal matrix rows yielded 4/72 goals vs 72/72 for the intact trained brain.

A further search of the discovered 8×8 multiplication table found **two generating operators**, IDs **1 and 4** (for seed 17). Their 12 continuous affine coefficients, together with short symbolic composition recipes, were enough to reconstruct all eight operations. This further reduced model passed 512/512 direct, 512/512 five-operation and 72/72 goal tests. **The recipes and operation identities are extra discrete information, so 12 is a count of continuous coefficients, not the entire number of stored bits.**

`meditate()` ablation across five seeds: mean single-operation L2 error at 1/16/256 dreamed positions was **0.00841 / 0.00624 / 0.00599**, respectively. This is a modest improvement in accuracy with more sampled Jacobians, not proof of creative learning. Five-seed out-of-training-square radial tests (radius 1.05–1.35) had mean L2 errors 0.0039–0.0097 (512 samples per seed).

## Experiment B — nonlinear state-dependent operations

- Second donor: nonlinear `tanh` network, 8,354 parameters, trained for 2,200 iterations, input-dependent curved shears, rotations and reflections.
- `LocalField.meditate()` reads weights, computes 7×7 Jacobian grids for each operation (1,568 derivative coefficients), plus 16 offset coefficients and the grid coordinates.
- At inference, the field integrates a sequence of local derivatives along a path from 0 to the desired state. It does **not** call the donor or use training labels.
- Evaluated on 256 independent test cases, plus 256 new 3-operation sequences. This nonlinear experiment's fully persisted results are from **one trained seed**; a longer multi-seed nonlinear job did not finish in this execution environment and should not be counted as additional confirmed results.

| Test | Weight-derived local field | Global affine atlas | Untrained weight control |
|---|---:|---:|---:|
| Single-operation mean L2 error | 0.00509 | 0.03461 | 0.56765 |
| Single-operation success (error `< 0.05`) | 256/256 | 202/256 | 1/256 |
| 3-operation success (error `< 0.10`) | 256/256 | 249/256 | 15/256 |

Internal inverse-search dreams found all **8/8** correct inverse operators with low round-trip errors (0.0056–0.0174). The oracle identity table was used **only afterward** to check correctness. The scoring code still knows operator IDs because the donor architecture exposes eight explicit slots; this is an **architecture-specific** advantage.

## Reproducibility (Python 3.10+, PyTorch, NumPy)

After extracting this directory:

```powershell
python -m pip install torch numpy
python .\experiment.py --steps 1400 --seed 17
python .\generator_compression.py
python .\robustness.py
python .\nonlinear.py
```

The nonlinear robustness file is optional and computationally more expensive. Its incomplete interrupted run is **not** in the published results. Both main training scripts rewrite their own artifact files in the extracted experiment folder. The included `.pt` files preserve the tested donor weights; JSON and `.npz` store the derived atlases and measured results.

## Files

- `experiment.py` — linear donor training, weight-only `WeightAtlas.meditate`, goal-attraction planner, heldout tests and random/scrambled controls.
- `generator_compression.py` — self-discovered minimal two-generator search on the 48-coefficient atlas.
- `robustness.py` and `robustness.json` — five independently trained donor seeds.
- `nonlinear.py` — nonlinear donor and `LocalField.meditate` derivative-grid integration and inverse dreaming.
- `results.json`, `two_generator_result.json`, `nonlinear_results.json` — measured reports.
- `donor_weights.pt`, `nonlinear_donor_weights.pt` — actual trained network checkpoints.
- `weight_atlas.json`, `nonlinear_dream_field.npz` — reconstructed learned transforms, without a copy of donor model weights.

## Limitations and how to extend toward Qwen

1. These donor architectures **expose operation ID and network layout**. Qwen does not provide a tidy list of eight transformations. Parsing real `safetensors` for attention, expert and MLP parameter groups is only the first step.
2. These tasks are known, low-dimensional geometric transformations. A dramatic parameter-count reduction is expected when a nonlinear network approximates simple mathematical rules; it is **not evidence** that Qwen's knowledge reduces to a dozen coefficients.
3. A Jacobian is a local linearization, not an independent intelligence. The larger network's global nonlinear behavior cannot generally be inferred from one Jacobian; multiple context-conditioned Jacobians or low-rank regions and evidence-backed paths would be required.
4. There is no proof here of language, logical reasoning, autonomous discovery of previously unknown real-world rules, or generalization across unrelated tasks.
5. The original JavaScript V17 organism, persistent checkpoints, CUDA worker, real graph UI and 4D/5D visualizations have **not** been modified or end-to-end tested. Integrating this with the same `Brain` and telemetry remains separate work, and no code has been pushed to GitHub.
6. The word "dream" denotes deterministic or seeded internal parameter-derived exploration. No consciousness, subjective experiences, or supernatural intelligence is implied.

**Evidence provenance:** inspected `https://github.com/dan3s2020/MagicPerspective/blob/experiment/V17-NATIVE-COUPLED-GOAL-ROUTES-20261107/v17/transcend/torus-aether/worlds/exercise.mjs` and `.../devour/brain.mjs`; this standalone research code uses analogous attraction-propagation principles without replacing existing files.
