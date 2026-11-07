# Verified puzzle piece: robust, state-dependent, coupled local axes — NOT the full language solver
2026-11-07. **Release: BLOCKED. Do not replace original V17 code. Do not distribute a "completed" run command.**

## Actual provenance

Code branch: \`experiment/V17-ROBUST-LOCAL-CAUSAL-AXES-20261107\`, passing HEAD \`9b606b499522bc99cd12c805942dffa15380b8c1\`.
Source: \`v17/research/text-hypermaze/state-dependent-axes.mjs\`.
Executable fixture test: \`v17/tests/state-dependent-axes-robust-heldout.test.mjs\`.
CI workflow: \`.github/workflows/v17-robust-local-causal-axes.yml\`, job \`truthful-observed-axes\`.
CI result: **SUCCESS**, exact log \`REAL_LEARNED_CAUSAL_AXES\`, \`LEARNED_OWN_AXIS_ABLATION\`; previous hypermaze and invariant regression suites also passed. Independently source-executed before any commit.

## What was discovered and actually tested

Original field induction excluded the moving coordinate from its own effect calculation. This erroneously assumed that a change along axis A could depend on B, but not on current A. Internal tests showed it failed on \`a²+b\` and \`a²+b²\` (0/9 exact each). It also used nonrobust means, so one deliberately corrupted transition made addition fail (0/9).

**Exact localized changes:** add the moving coordinate to candidate context axes, estimate slopes/intercepts with medians of observed differences rather than means, measure verified fraction of actual observed operator consequences, and refuse planned paths from inconsistent locally affine fields (less than 90% training inliers). No arithmetic operator such as +, *, squaring or subtraction is hard-coded into the learner's inference. **The model class itself is still hand-selected: locally affine effects on numeric token positions.**

Training per world:
- 16 actual textual numeric states for input axes a,b in 1..4.
- 24 *observed* paired before/after transformations (changes in one input axis together with the dependent output).
- Each reverse action is also observed by the learner.
- At heldout inference, the goal includes ONLY new input-axis coordinates a,b in 5..7, NEVER the unknown numerical result.
- Planner builds full target equation path BEFORE executing actions; test evaluator computes exact correct target only AFTER prediction.

| Observed world class | Frozen unseen complete equations correct | Learning consistency |
|---|---:|---|
| a+b | 9/9 | 100% inliers |
| a*b | 9/9 | 100% inliers |
| 2a+3b+5 | 9/9 | 100% inliers |
| a²+b | 9/9 | 100% inliers |
| a²+b² | 9/9 | 100% inliers |
| a+b, one deliberately corrupted observed transition | 9/9 | at least 91.67% inliers |
| **TOTAL supported controlled rules** | **54/54** | No teacher answer supplied to solver |

**Falsification:** two function classes not supported by the learned local-affine class — a³+b and a²b+b² — produced inconsistent observed action effects. The consistency gate **REFUSED ALL 18/18** heldout goals instead of generating confident wrong whole answers. Previous ungated code was 0/9 exact on each of these but still claimed it had found a path.

**Causal ablation:** removing dependence of an action effect on its own current axis made heldout quadratic performance fall from **9/9 to 0/9**. Thus the newly learned self-coordinate dependence genuinely affects answers, not only visual geometry.

**Existing independent result preserved:** the older 6-paired-observation multiplication test passed **48/48 frozen unseen goals** (fixed-axis control 0/48). Original identifiability control also passed and demonstrates a real failure: with ONLY two contrast examples the model can still predict \`8 * 7 = 32\` rather than 56, because the input-axis dependence has not become identifiable. The gate deliberately does not rewrite or conceal this negative control. Future confidence must account for sparse evidence, not just low training residual.

## Why this is not the completed MagicPerspective request

- These are **restricted structured numeric sentences** with explicit paired state transitions. They are not 780,000 real OpenThoughts examples or large natural-language replies, and they do not demonstrate 100% unconstrained answer accuracy.
- The code is still a research-world module, **not yet the native answer-producing Brain**. It must be integrated with learned extraction of real source-world state pairs, persistent one-organism memory, no heldout leakage, live original UI, learned 4D+/hyperdimensional node frames and stochastic corrections.
- The module learns a locally affine numerical field; higher nonlinearities and compositional, irreversible and semantic language transformations remain separate unsolved research questions.
- The engine under \`experiment/V17-CAUSAL-HYPERPATH-NATIVE-20261107\` still defaults \`Brain.chat\` to \`legacy-character\` and fails tests on long real QA (0/1) and heldout arithmetic when using only its original one-token edit model (0/9). See \`docs/NATIVE_GOAL_HYPERPATH_INTERNAL_HELDOUT_RESULTS_20261107.md\`.
- No GPU speed or Windows clean-install end-to-end test occurred for this research branch; **no claim of hundreds of real OpenThoughts exercises/second** is justified.

## Integrity / instruction

This scientific finding was tested with the ACTUAL existing JavaScript learner inside an isolated interpreter, and then re-tested with repository GitHub Actions. The tested source changes are isolated, reversible and do not change existing \`main\` Brain, UI, launchers or checkpoints. This document is added after evidence, not in lieu of it. Full historical conversation byte-for-byte archival is not certified.

**Next true release gate:** native shared goal-state graph, discovered context-conditioned multi-coordinate transition physics, complete preaction solution path, observed action feedback, meaningful ablation, long unseen text with independent references and measured hardware throughput. The word "100%" may apply only to the measured 54 structured heldout goals, never to arbitrary language.
