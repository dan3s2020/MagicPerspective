# V30 — Original MagicPerspective motors: orthogonal geometry, causal dimensions, noncommutative history and full pre-action shapes

**Date:** 2026-11-07. **Branch:** experiment/V30-ORTHOGONAL-TRANSFORM-PATH-NATIVE-20261107.
**Parent:** experiment/V29-REAL-OPENTHOUGHTS-QA-GOAL-CLOSED-LOOP-20261107, commit f8edeabdcc7183b9a3e587ecceee1b1126a22a5d.
**Research scope:** No modifications to original Brain, original Discoverer.shape, learned motor source, CUDA, text training, checkpoint, or UI. Added test files, one isolated GitHub Actions workflow, and this report. NO merge to main.

## Research question

The screenshots suggested that approximately orthogonal high-dimensional vectors, repeating/fractal paths, and transformations crossing at 90 degrees could improve hyperdimensional solution-shape navigation. We tested actual repository motors, not a new toy planner substituted for the original shape engine. We distinguish *six relevant observed channels* from *orthogonal linear axes*, *causal transformation composition*, *noncommuting history*, and *noise-driven execution feedback*.

Sources imported unchanged:
- v17/transcend/torus-aether/worlds/exercise.mjs: actual original Discoverer, playExercise, shapeGraph.
- v17/transcend/torus-aether/concepts.mjs: actual 5D torus Geometry.learn.
- v17/research/learned-axes/axis-navigator.mjs: actual learned action model from observed high-D transitions; its own BFS is only an evaluation comparator, NEVER the original shape under test.
- v17/research/learned-axes/hidden-world.mjs: evaluator-only 256-channel 6-symbol stochastic world.
- v17/research/text-hypermaze/state-dependent-axes.mjs: original research learned text effect operators.
- v17/research/text-hypermaze/path-holonomy.mjs: existing learned-coefficient / explicitly formulated signed-area history predictor.
- v17/transcend/torus-aether/worlds/observed-transformations.mjs: unchanged real text tokenizer.

Code:
- v17/tests/v30-orthogonal-transform-original-motors.test.mjs (5 tests)
- v17/tests/v30-orthogonality-replication.test.mjs (2 tests)
- v17/tests/v30-native-path-holonomy-bridge.test.mjs (1 test)
- .github/workflows/v30-native-orthogonal-transform-ablation.yml
- Existing regressions: native-hypermaze-shape-parity (2 tests), learned-axis-gating (10), v29-real-qa-closed-loop (5).

**Full 25-test suite passed, 0 failed**:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42356728153

Historical experimental runs:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42356277384
https://github.com/dan3s2020/MagicPerspective/actions/runs/42356469646

## Finding A: recovered sensor channels are NOT independent Euclidean semantic dimensions

- 256 total observed noisy channels.
- The unchanged LearnedAxisNavigator selected 6 relevant channels from 1,380 observed, action-conditioned training transitions, without receiving their indices or the hidden mappings.
- These 6-dimensional permutation states have 720 distinct reachable states, but satisfy sum(state)=15.
- Their true affine rank is exactly **5**, and each distinct pair of the six coordinate values has correlation **-0.2**.
- This is a fixed-sum constraint, not proof of six 90-degree semantic concepts, nor discovery of a physical 5th dimension.
- Orthogonal Helmert coordinates retain the 5-dimensional affine information, but are a *change of representation*; they do not create a new action.

## Finding B: original shape navigates the learned transformation graph directly

- Learned 6 action permutations from observed transitions, generated the full 720-state learned graph from those fitted operators, no access to the hidden oracle's action rules by the planner.
- Trained a genuine instance of the original Discoverer via 26 lived original 2D maze episodes: target attraction=0.95238095, floor conductance=0.99757282.
- Called the original Discoverer.shapeGraph on the learned higher-dimensional action adjacency.
- **70/70 held-out start/goal pairs**, 70/70 independently checked shortest path lengths, average 4.942857 actions; actual action effects replayed to confirm predicted edges.
- Original propagation is still programmed: 0.97 discount and estimated conductance/attraction. The graph is a full learned permutation world; it does not prove autonomous unrestricted language topology generation.

## Finding C: real causal stochastic feedback is more important than static geometry

In 85 held-out stochastic execution episodes, horizon=12:
- Preaction full shape frozen, execute without repairing: **31/85** solved.
- Same original shapeGraph recomputed after each actual observed transition: **85/85** solved.

The planner never reads the future stochastic outcome. Each environment action produces actual observations; the updated shape is calculated from the measured new position. This isolates feedback from the question of whether injected noise itself improves learning: no superiority over fixed/random exploration was established.

## Finding D: orthogonal geometry changes path selection but does not improve shortest-path accuracy here

First 70 paired trials: original, six-coordinate toroidal, orthogonal five-coordinate, per-state shuffled coordinate negative control, strong geometry: all **70/70 successful and shortest length**.

Stronger 480-query original-motor ablation with the same learned state topology:

| Optional geometric tie-preference | Action paths changed from geometryWeight=0 | First action changed | Longer paths | Failed paths |
| --- | ---: | ---: | ---: | ---: |
| Raw 6D sensor coordinates, weight .04 | 344/480 | 247/480 | 0 | 0 |
| Orthogonal 5D Helmert coordinates, weight .04 | 363/480 | 272/480 | 0 | 0 |
| Per-state shuffled coordinates (NEGATIVE CONTROL), weight .04 | 374/480 | 272/480 | 0 | 0 |
| Orthogonal 5D Helmert coordinates, weight .25 | 363/480 | 272/480 | 0 | 0 |

The original attraction field first filters to *uphill edges*. Geometry only breaks path preferences among those valid edges. The shuffled negative control changes paths as much as the structured representations. Therefore altered path choices or near-90-degree basis vectors are NOT sufficient evidence of a semantic navigation improvement.

## Finding E: native trained 5D text geometry does not consistently benefit from axis whitening

We trained the original Geometry.learn on the first 34,999 transitions of the real repository TORUS_AETHER_ABC documentation, fitted the probe covariance only on training examples, froze all weights, and scored the final **11,996 held-out characters** per model, for five independent initializations. This is next-symbol retrieval, NOT exact answers or semantic goal paths.

The original periodic-cosine scorer was compared to: torus Euclidean distance; mean-centered Euclidean; mean-centered diagonal inverse-variance scaling; and mean-centered full covariance inverse metric (a read-only whitening probe).

| Seed | Native frozen top-1 | Full covariance probe | Delta |
| ---: | ---: | ---: | ---: |
| 7 | 15.0717% | 10.7869% | -4.2848pp |
| 17 | 10.7953% | 11.1621% | +0.3668pp |
| 29 | 17.7226% | 15.3635% | -2.3591pp |
| 43 | 11.0037% | 16.5555% | +5.5519pp |
| 61 | 11.5789% | 7.0940% | -4.4848pp |

Whitening beat native in **2/5** initializations; mean improvement was **-1.0420 percentage points**. The preliminary +0.3668pp single-seed result did not replicate as general superiority. These samples are from one document (correlated), so do not infer significance over all language. **Do not modify production Geometry.learn based on this probe.**

## Finding F: action order and history are real predictive dimensions

Of the 15 distinct pairs of *learned* operators, **11 pairs are noncommuting**; 4 commute. Action effects therefore cannot always be represented as simple independent 90-degree additive moves.

Frozen multi-scale action composition on held-out states:
- 64/64 exact executed outcomes at every sequence length **1, 2, 4, 8, 16, 32, 64** = **448/448**.
- Reverse-order control matched the 64-action original outcomes **0/64**.
- The learner uses observed transformations only; the evaluator supplies its hidden rules only when physically executing the chosen sequence.
- This is transferable composition of permutation laws, not an established fractal scaling law.

### New bridge to existing real original Discoverer motor: held-out closed-loop numerical TEXT

Unchanged StateDependentTextAxes observes **18 before/after numerical-text pairs** with template "x @ y ~ z" and fits:
- X action: dz = y * dx
- Y action: dz = 2*x * dy
- Noncommutative difference coefficient beta-alpha=1.

A graph of 46-57 reachable textual states per heldout start was constructed using ONLY the learned action model, not the independent physical evaluator's rules. This graph was passed to the original previously maze-trained Discoverer.shapeGraph; the goal condition was a supplied z+1 target at the same x,y.

**Four previously unseen starts; 4/4 original four-step paths predicted BEFORE any action and verified by an independent execution evaluator.**

Example: "5 @ 6 ~ 30" => action X+, Y+, X-, Y- => "5 @ 6 ~ 31".

The visible 2D coordinates (5,6) returned unchanged, while the dependent textual z increased from 30 to 31. The programmed signed-area predictor, using coefficients actually fitted from observed text pairs, yields a +1 history correction. Endpoint-only prediction yields 30, incorrectly.

Other starts:
- "6 @ 7 ~ 42" → "6 @ 7 ~ 43".
- "7 @ 8 ~ 56" → "7 @ 8 ~ 57".
- "8 @ 9 ~ 72" → "8 @ 9 ~ 73".

This is a precise demonstration of a *path-dependent effective state*, **not evidence for extra physical dimensions, consciousness, spontaneous self-assembled fractals, free-text semantics, or 100% unrestricted answers**.

Limitations:
- The training template / numerical slots / locally affine inductive bias / output goal z+1 are given by the research harness, not autonomously inferred from arbitrary questions.
- The native bridge uses the original Discoverer class instance and the repo's existing learned text operator module; it is not yet wired as one persistent native Brain producing unrestricted chat.
- The signed-area identity is explicitly mathematical, while coefficients are learned from observed pairs.
- High-D random near-orthogonality does not guarantee zero concept interference; no real 12,288-semantic-axis proof.
- No independent test of recursive self-similar/fractal geometry has shown a causal accuracy benefit.
- No Windows GPU or live browser UI validation; Linux GitHub CI Node.js 22 only.

## Research implication

Current best result is **functional causal dimensions + composition + path memory + original attraction shape + feedback**, NOT "force semantic vectors to exactly 90 degrees."

Next falsifiable gate: obtain independent human natural-language witnessed state transitions; let the original Brain autonomously discover which operators exist and when they fail to commute, attach a history coordinate only if it beats no-history and simpler recurrent models on truly held-out meanings, then navigate to unknown answer goals without reference target strings or leakage. Test against the existing original aligner, strong memorization baselines, shuffled histories and explicitly wrong goals.

## Reproduce

On the isolated V30 branch in Node 22:

    node --test v17/tests/v30-orthogonal-transform-original-motors.test.mjs
    node --test v17/tests/v30-orthogonality-replication.test.mjs
    node --test v17/tests/v30-native-path-holonomy-bridge.test.mjs

Existing regressions also run through the published V30 GitHub Actions workflow.
