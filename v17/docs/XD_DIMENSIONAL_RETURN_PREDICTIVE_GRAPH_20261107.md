# xD DIMENSIONAL EXPANSION → FINITE PREDICTIVE GRAPH: VERIFIED RESULTS (2026-11-07)

## Research target — do not stop at 5D

User request: grow the 2D→3D→xD mathematical transformation far beyond 5D and search for a point at which many dimensions can be reduced back to a small equivalent perspective or graph. This is an **empirical test**, not an assumption that all dimensions must fold back to 1D.

We preserved the production \`Geometry.learn\`, \`AligningGraph\`, worker and V17 UI. Everything new is an isolated **test/experimental branch**, not an anti-loop sampler, UI demo, production rule change, or asserted quantum device.

## Finite-rank theorem for the ACTUAL V17 symbol operator

For distinct observed previous symbols x and next symbols y, V17 geometric score is

    K_D[x,y] = sum_{i=1}^D cos(2*pi*(V_x[i] - U_y[i]))

By the cosine difference formula,

    K_D[x,y] = phi_D(V_x) . phi_D(U_y)
    phi_D(z)  = [cos(2*pi*z_1), sin(2*pi*z_1), ..., cos(2*pi*z_D), sin(2*pi*z_D)].

Thus K is an N-by-N real matrix that factors through R^(2D), and
its rank is bounded by \`min(N,2D)\` for EVERY finite D.
N means the number of distinct observed symbols, NOT the number of learned contexts, 
meaningful concepts, or semantic goals.

This implies an EXACT replacement for the FROZEN ONE-STEP GEOMETRIC ENERGY 
scorer by an N-node weighted directed graph, but not for a full trained brain,
its future learning updates, its text-context aligner, or a genuine xD action policy.

## Native observations

Dataset: a 47,000-character ASCII-filtered excerpt of \`docs/TORUS_AETHER_ABC_20261104.md\`, NOT OpenThoughts3. 35,000 training chars, about 6,000 validation chars, and 6,000 final holdout chars. Original xD Geometry.learn, \`neg=3\`, \`lr=.03\`, \`repel=.3\`, seed 17.

| D | Rank of real K | Geometry-only test top-1 |
| ---: | ---: | ---: |
| 2 | 4 | 4.72% |
| 5 | 10 | 10.60% |
| 16 | 32 | 12.65% |
| 32 | 64 | 3.57% |
| 64 | 87 | 1.93% |
| 128 | 87 | 0.78% |
| 256 | 87 | 0.10% |
| 512 | 87 | 2.63% |
| 1024 | 87 | 0.65% |

With N=87 distinct symbols, the 1024D U/V coordinate pairs occupy 1,425,408 bytes as float64; K is 87×87×8 = 60,552 bytes; an EXACT 23.54× reduction in storing this frozen one-step scorer. Once D >= 44, its possible matrix rank cannot exceed N=87; the measured rank saturated by D=64. More dimensions can still CHANGE its weights and predictions; dimension saturation does not mean a fixed best model or spontaneous lowering of physical dimensionality.

Native predictive quality is NOT competitive against a unigram model (17.27%) or a one-step bigram model (25.53%) on the same holdout. So this is a real structural finding, **not** an achievement of general language or mathematical solution reasoning.

## Native geometric equivalences

Tests using the exact untouched Geometry.learn:
- Permutations, independent phase shifts, and signs of axes were equivalent through 2D, 5D, 16D, 64D and 256D with no changed next-symbol decisions in the controlled probes; continuous learning remained equivalent to machine precision.
- A particular learned 2D geometry was lifted to 8D,32D,128D,512D,1024D by adding truly neutral axes and shifting the shared bias by \`-(D-2)\`. The original 2D updates and all corresponding lifted coordinates remained equivalent with maximal numerical errors near 1e-13 after 200 further native updates.
- The lifted 1024D system was **constructed to be reducible** and has exactly the old 2D predictive information; this is not emergent 1024D→2D self-compression.
- A native naturally trained 1024D graph had score rank 87, not 2, and therefore does not independently demonstrate a spontaneous collapse to a 2D score representation.

## New clue: dimension-dependent learning saturation

The original Geometry.learn applies a sigmoid to a sum of D circular correlations:
\`sigmoid(sum_i cos(angle_i) + bias_y)\`.
The raw sum's magnitude can grow with D, causing the sigmoid to saturate.

On the held-out TRUE symbol transitions, the original D=1024 model had 40.73% of logits with |z|>8 and average sigmoid derivative 0.0342, compared to 0% saturation / derivative 0.2007 at D=2. These are measured properties of this corpus and checkpoint.

We implemented ONLY in a standalone test a controlled alternative with:
- normalized logit \`sum_i cos(angle_i)/sqrt(D)+bias\`;
- angular update scaled by \`1/sqrt(D)\` (chain-rule consistent);
- scalar bias update kept at its original rate.

At D=1024, seed 17, this returned 16.98% geometry-only held-out accuracy vs 0.65% using the production rule, with no saturation by the |z|>8 diagnostic. The alternative is not part of the product and still does not beat the simple bigram. A second control with 1/D normalization was also tested (8.32% at D1024). **Independent-seed replication PASSED:** seeds 17, 19, 23 trained separately at D=64,256,1024, all on the same 35k/6k/6k split. Geometry-only held-out top-1 (mean over 3 seeds):

| D | Original native | Normalized 1/sqrt(D) | Mean gain (percentage points) |
| ---: | ---: | ---: | ---: |
| 64 | 2.161% | 17.244% | +15.083 pp |
| 256 | 0.667% | 16.000% | +15.333 pp |
| 1024 | 0.928% | 16.389% | +15.461 pp |

The 1/sqrt(D) variant beat the production operator in every one of the 9 paired runs. Native D1024 saturation |z|>8 ranged 40.73% to 48.02%, whereas the normalized variant had zero measured saturation under this cutoff.
This is evidence that the original D-scaling is an important cause of its high-dimensional degradation under this controlled corpus. The fix remains a *prototype only* and does NOT beat the existing bigram baseline 25.53%. These runs share one corpus and therefore do not establish universal cross-domain generalization.

## What would demonstrate the actual user's greater hypothesis?

We must represent CONTEXTUAL STATES + GOALS, not merely symbols.
We need a learned transition operator F(state,action), a BEFORE-ACTION predicted solution shape, and a trace of actual actions.
Run multi-step held-out unseen tasks on mathematical grammar and on real text, benchmark against baseline and permuted geometry.
Check whether predictive future equivalence merges states into a smaller state graph without losing solution success, rather than merely applying linear algebra to a frozen output matrix.

In computational mechanics, the principled target is the equivalence class of past states that have the same conditional future distribution ("causal states"), but any finite-data approximation must be tested independently.

## How to rerun

    node --test v17/tests/xd-gauge-collapse.test.mjs
    node --test v17/tests/xd-predictive-operator-rank.test.mjs
    node --test v17/tests/xd-scale-normalization.test.mjs
    node --test v17/tests/observed-text-paths.test.mjs

All experiments use the actual \`v17/transcend/torus-aether/concepts.mjs\` implementation. Branches remain independent of main.
