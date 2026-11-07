# 2026-11-07 — Before-action 4D text-world path reconstruction: measured, falsifiable results

## Ordering of evidence and repository changes

**Local experiment and five native Node.js tests were executed BEFORE this branch was created or any file was written to GitHub.** Local working directory: isolated runtime, no access to the user's RTX 3050 Ti or OpenThoughts3 files. Runtime: Node.js v22.16.0. Tests: 5 passed, 0 failed. The code and its tests were then committed to this isolated research branch, based on `fix/V17-EXACT-CUDA-ALIGNMENT-PROGRESS-20261107`.

## What was actually tested

An organism learns eight initially anonymous action effects from **480 previously observed state/action/successor events** per seed. Each state is a 4D toroidal coordinate in {0,1,2,3}^4; four axes are independent, giving 256 reachable or blocked states. Around 16% of training transitions are deliberately corrupted; the organism estimates each action's modal coordinate delta rather than receiving the true action map.

An independent train-only experience stream of **15,000 observed source-veracity comparisons** estimates how trustworthy three conflicting documentary perspectives are. The first perspective, `ledger`, is always correct under the main test distribution; `dream` and `rumor` contain random lies. That favorable condition is explicit and subsequently falsified with an adversarial source-shift control.

The organism receives **previously unseen documents, each ~116,061 characters**, consisting of 768 factual observations for the 256 locations plus 200 unrelated paragraphs, shuffled together. No test world map, route, or answer is supplied to the planner. A FIXED regular expression extracts the known fact grammar; learned source reliability selects a world-state hypothesis for each location. A conventional breadth-first shortest-path operator constructs the COMPLETE action route using the **learned** eight 4D transitions, blocked-cell beliefs, and given initial/goal 4D coordinates. The entire proposed route is frozen BEFORE the physical world performs the first action. Only after that is the plan tested against the hidden generated world and compared to the oracle shortest route.

This is a genuine, executable **procedural structured-text world**, not next-character prediction, but it is not semantic parsing of unrestricted prose or a learned intrinsic neural dimensional encoder. The 4D coordinates and goal are given in the input. The planner is explicit BFS; only action effects and source trust are learned.

## Measured local results — 3 seeds × 64 unseen worlds

| Metric | Seed 17 | Seed 29 | Seed 47 | Total |
|---|---:|---:|---:|---:|
| Full 4D action route correct on FIRST attempt | 64 | 64 | 64 | **192/192** |
| Initial route is shortest possible | 64 | 64 | 64 | **192/192** |
| Only 2D axes retained | 0 | 0 | 0 | **0/192** |
| Learned action mapping permuted | 0 | 0 | 0 | **0/192** |
| Learned reliability ignored; use bad source | 14 | 8 | 7 | **29/192** |
| Chance 25% step failure; do NOT repair fixed initial route | 13 | 20 | 15 | **48/192** |
| Chance 25% step failure; observe actual outcome and replan | 64 | 64 | 64 | **192/192** |
| Adversarial reliability-shift (ledger now 35% wrong) | 20 | 13 | 24 | **57/192** |

All 8 action directions learned correctly for each of the 3 training seeds. Heldout evaluation does not update the trained action effects or evidence of source reliability. Total novel text evaluated: **22,283,706 characters**. Every unseen world contains three contradictory perspective reports per position and distractor paragraphs. The fully predicted route before execution is explicitly recorded in `firstExample.pathBeforeAction`.

## How this relates to noise and 2048

An environment with truly stochastic action outcomes cannot have the realized complete future route known with 100% certainty *before the random outcomes are sampled*. That is not a computational failing; future chance events are unobserved. In this test, 25% of attempted movements fail and leave the organism in the same observed cell. Committing to the original path succeeds only 48/192; feeding the observed mismatch back to the **same** route constructor and re-planning succeeds 192/192 within the tested 80-step bound.

Therefore the useful pre-action object for uncertain worlds is a **contingent plan** (route + branches conditional on observed discrepancies), not a claim to foresee independent random numbers. The research's explicit `noise` input merely changes equal-distance route tie-breaking through seeded randomness. It is NOT the original V17 learned NoiseAgency and does NOT demonstrate an emergent noise-induced higher dimension.

## What fails, and why the 100% is NOT general-language competence

1. All main-distribution worlds include one infallible named source. When its reliability changes after training, success falls to **57/192**. This is a real failure, not hidden.
2. Regex fact extraction is based on a controlled syntax. There is no evidence for semantic equivalence, pronoun reference, arbitrary OpenThoughts mathematics, novel grammars or word-sense ambiguity.
3. The search algorithm is explicitly BFS, just like a conventional graph labyrinth. The learning is in noisy action-coordinate effects and source reliability, not invented general planning algorithms.
4. World coordinates and goal are explicitly specified; the agent does not infer a general latent 4D representation from raw natural language.
5. This is a standalone research component derived from the V17 project's real requirements and prior 2048/NoiseSpace findings. It does not update the original Brain's weights, original 5-torus CUDA kernels, or native UI. No original functionality was overwritten.
6. No actual OpenThoughts3-1.2M general-language success, complete answer strings, real GPU MB/s throughput or universal 100% accuracy was measured. Do not release this as the requested finished language learner.

## Independent repro

From repository root:

```powershell
node --test v17/research/text-hypermaze/causal-text-4d-study.test.mjs
node v17/research/text-hypermaze/causal-text-4d-study.mjs
```

Expected main totals: 192 initial optimal /192, 0 two-dimensional /192, 0 shuffled-action /192, 29 untrusted-source /192, 48 stochastic fixed /192, 192 stochastic repaired /192 and 57 adversarial source-shift /192. Wall-clock durations vary by machine and are not a CUDA throughput measurement.

## Next mandatory engineering gate — not yet passed

To satisfy the full MagicPerspective request, integrate a **single learned goal-conditioned state/action/next-state model** into the ORIGINAL V17 Brain and CUDA text learner, with noise agency controlling counterfactual branches, real text→state/relations acquisition from OpenThoughts, the predicted multi-step solution shape fed into the actual decoder/action selection BEFORE the first answer symbol, and live graph observability of prediction/act/delta/re-plan. Benchmark frozen unseen long natural Q/A against standard contextual language and retrieval baselines plus permuted state/action and shuffled history controls. Measure actual RTX3050 full-engine throughput, not merely reading speed. All old buttons, native 5D torus, typed/layered organisms, saved brains and worlds must remain. Only then may the full application be described as built and ready.

Related source documentation: `v17/docs/TEXT_HYPERPATH_REQUIREMENT_20261106.md`, `v17/docs/NO_RELEASE_UNTIL_MECHANISMS_COMPLETE_20261106.md`, `v17/docs/ENDOGENOUS_NOISE_PROOF_20261106.md`, `v17/docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md`.
