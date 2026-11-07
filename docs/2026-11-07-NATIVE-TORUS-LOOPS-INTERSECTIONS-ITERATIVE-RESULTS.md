# MagicPerspective — real native loop, torus and intersection experiments

**Date:** 7–8 November 2026 (Europe/Bucharest)  
**Isolated branch:** research/V42-TORUS-LOOP-INTERSECTION-HYPOTHESES-20261107  
**Baseline:** perf/V42-FAST-EXACT-CPU-RESUME-V41FAST-20261107  
**Status:** FIVE genuine original-code test families executed successfully in GitHub Actions. This is research, not proof of universal intelligence or physical hypersphere navigation.

## Source integrity and test policy

We imported the **original** Brain, Discoverer, AligningGraph, TextPerspectives, LearnedXDActionAtlas, Geometry and LivedField. None of the canonical engines, trainers, UI files or original checkpoints was modified.

Recorded sha256 of original exercise.mjs: 804c88ec84671932eb8bdfd350ec8736eebb78807030d4bdfca708e21bf11bc2.

Recorded sha256 of original labyrinth.mjs: daa391113b29860ccf8f1f0ae3e331e7f17a5d9bcf501dc2a5ab3a5f64d1af31.

The tests created and trained fresh native models, then performed held-out or evaluation-only perturbations. They **did not** use the user's actual Windows V41/V42 checkpoint or OpenThoughts corpus. A corrected test-only metric bug is documented below.

## Test 1 — original maze solution field and toroidal route options

File: v17/tests/torus-loop-intersection-hypotheses-20261107.test.mjs

- 158/160 training mazes solved (7×7 and 9×9).
- 72/72 held-out complete-retina first plans reached their goal (9×9 and 11×11).
- Original grid solution and original graph solution agreed in 72/72 instances.
- 813/813 decoded graph path edges increased the scalar attraction value strictly, with **zero revisited nodes**.
- Removing learned goal attraction eliminated initial plans in 72/72 cases.
- Supplying the already-supported **optional** synthetic toroidal tie preference changed 33/72 paths, while all 72 still reached the goal.
- Giving a second independently attractive target produced zero routes that visited both target cells. The native rule stops on the first attracting target.

**Finding:** the real maze mechanism is monotone goal-attraction propagation and ascent. Its iteration is not by itself a periodic orbit. No supplied torus geometry is required for the verified complete-retina successes.

[Executed GitHub Actions run](https://github.com/dan3s2020/MagicPerspective/actions/runs/42418319371).

## Test 2 — actual speech loops and geometry-only ablation

File: v17/tests/torus-speech-memory-hypotheses-20261107.test.mjs

- Trained the real Brain on 36 short synthetic Q/A exercises (1,596 lived characters).
- Its actual AligningGraph.write path repeated a 15-character segment; 105/120 generated contexts revisited earlier context states; **zero** steps had multiple candidate next bytes.
- Under that learned state, varying generator temperatures 0, 0.75 and 1.25 did not change the output.
- Replacing 5D coordinates **only during frozen evaluation** changed reported geometric distance but **not one generated character**.
- Removing the AligningGraph for an evaluation-only ablation changed the output.

**Finding:** in the tested native writing pathway, repeated speech comes from learned next-symbol transitions, not from geometry in the passive 5D text observer. This does not exclude geometry acting elsewhere in Brain.

[Executed GitHub Actions run](https://github.com/dan3s2020/MagicPerspective/actions/runs/42418580369).

## Test 3 — xD: a genuine intersection of necessary goal constraints

File: v17/tests/xd-intersection-constraints-hypotheses-20261107.test.mjs

- The actual Brain.xdAtlas learned seven action/axis bindings from seven native simulator interventions.
- On aligned ambient dimension scales 16, 24, 32, 64, 128, 512 and 2048: **56/56** held-out cases solved.
- In those cases, **392/392** executed action edges matched their predicted effect. A prior research-test counter accidentally treated missing execution counts as NaN; the code was corrected and this final number was rerun and checked.
- The final target requires all **seven** active bits set. Deleting any one of the seven observed action mappings prevented planning from reaching that target (**7/7** essential-ablation failures).
- Incompatible coordinate scales: **0/16** solved. Shuffled hidden action physics: **0/24** solved.
- All these worlds have **128 finite states and seven active dimensions** regardless of the ambient dimension labels; this is not a full 2^2048-dimensional hypercube.

**Finding:** the native xD atlas truly uses a conjunction of *seven necessary coordinate conditions*, learned action mappings and finite graph search. That is a meaningful common target state, not evidence that linked Hopf circles physically intersect.

[Corrected xD experiment run](https://github.com/dan3s2020/MagicPerspective/actions/runs/42418910083).

## Test 4 — native language attraction, oscillator versus fixed point, multiple goal sets

File: v17/tests/text-attraction-vs-intersection-20261107.test.mjs

- Original Brain.liveLanguage observed 120 tokens in two recurring sentence families ending in **gate** and **bridge**.
- Exact original TextPerspectives field propagated a source value 0 → 0.47045 at iteration 2 and remained 0.47045 at iterations 3, 4, 8, 16, 45 and 90; no decreases.
- The source had attraction value **0.47045** with both terminal tokens, **0.47045** with only gate, **0.47045** with only bridge, and **zero** when both terminal types were removed.
- Therefore the native field implements an **any-terminal maximum**, not an all-terminals intersection.
- Frozen unseen combination **portal south gate** after training **portal north gate** and **portal south bridge** achieved **0/2** known-context token predictions both with and without its goal field.
- Native Brain.save / Brain.load preserved the learned terminal/edge counts.

**Finding:** the observed value dynamics on this fixture settle to a fixed point rather than phase-locking oscillations. The goal rule is max/OR, not conjunctive intersection; text generalization in this control is unproven.

[Executed text experiment run](https://github.com/dan3s2020/MagicPerspective/actions/runs/42418962738).

## Test 5 — actual torus symbols and learned fractal memory

File: v17/tests/native-5torus-fractal-memory-20261107.test.mjs

- Geometry explicitly uses **five wrapped periodic coordinates per symbol**: an implemented 5-torus, not an emergent 3-sphere or proven Hopf fibration.
- 23 lived symbol coordinates were examined; all five values per symbol were in [0, 1).
- Euclidean radius of these five phase-coordinate tuples was **0.72783 to 1.70186**, not a constant-radius sphere.
- Native LivedField uses a history interpolation recurrence with lambda = 0.75. It retained 1,596 moments.
- Under reversible coordinate scrambling and field rebuild: 44/45 probe positions yielded a predictive distribution in both conditions, only **one** distribution changed measurably; mean L1 difference across comparable predictions was approximately **0.00000355**.
- The same scramble left the original text-writing output identical.

**Finding:** toroidal symbol-coordinate learning is indeed built into this native subsystem. Its causal impact on the separate LivedField was tiny under this particular controlled probe and absent in the AligningGraph writing path. No shared high-dimensional global solution geometry is established.

[Executed 5-torus experiment run](https://github.com/dan3s2020/MagicPerspective/actions/runs/42419145766).

## Mechanism map

| Component | What real code does | What our tests do not establish |
|---|---|---|
| Discoverer.shape / shapeGraph | Max-propagated learned attraction, strict positive-gradient path ascent; optional torus preference | Hopf linking or intrinsic XD-sphere search |
| AligningGraph.write | Learned byte-transition votes/trust; can enter deterministic repetitive cycles | Oscillator synchronization or semantic understanding |
| TextPerspectives | Max-product value propagation from independently attractive terminal tokens | Simultaneous intersection of all goal loops |
| LearnedXDActionAtlas | Learned action-axis bindings, explicit graph BFS and all-seven-bits final constraint | General arbitrary-dimensional navigation; more than seven active axes |
| Geometry | Programmed 5-torus periodic symbol embedding, with sin/cos learning | Data-discovered S3 sphere or Hopf fibration |
| LivedField | Recurrent fractal/moment-space history using learned 5D symbol places | Entire Brain moving as a single shared manifold |

## Reproduce

From the research branch with Node.js 22, run these five original-module imports without editing any engine:

~~~bash
node --test v17/tests/torus-loop-intersection-hypotheses-20261107.test.mjs
node --test v17/tests/torus-speech-memory-hypotheses-20261107.test.mjs
node --test v17/tests/xd-intersection-constraints-hypotheses-20261107.test.mjs
node --test v17/tests/text-attraction-vs-intersection-20261107.test.mjs
node --test v17/tests/native-5torus-fractal-memory-20261107.test.mjs
~~~

Five independent GitHub Actions workflows run these tests on this isolated branch; all five completed successfully at the tested head.

## Still-open hypotheses and decisive future tests

1. **True hidden-state dynamics:** On an actual trained local V41-Fast/V42 checkpoint, log synchronized per-tick states from all original native subsystems, not only the public output sequence or geometry label.
2. **Synchronization / frequency:** test phase-locking, recurrence, power spectra, cross-frequency coherence, time-shuffled and episode-shuffled controls using *actual evolving internal states*. Repetition alone is not synchronization.
3. **XD sphere / Hopf structure:** compute intrinsic dimension, persistent topology and null-model statistics from measured internal trajectories. Do not impose a favored shape as the conclusion.
4. **AND-intersection as emergent algorithm:** compare native max/OR goal dynamics with learned conjunctive constraints on truly unseen multi-condition tasks; provide matching classical graph planners and budget controls.
5. **Causal cross-world transfer:** from one same saved Brain, demonstrate learned transformations improve independent held-out maze, language, arithmetic, SAT and physical tasks without ever seeing their exact answers during goal inference.
6. **Real checkpoint and real GPU:** preserve and test byte-exact original V41 checkpoints/sidecars and training machinery. None of these five CPU fixtures proves Windows CUDA throughput or real-world 100% text accuracy.

**Disposition:** Five original-code mechanisms empirically probed. Some causal mechanisms established *within the tested fixtures*. A universal geometric intersection principle, physical higher-dimensional sphere, and cross-domain convergence are **not yet demonstrated**. Keep all original trainers, checkpoint paths and UI unchanged.
