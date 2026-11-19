# SHA-256 native organism: active candidate interventions, full observed-state controls, final reproducible ledger

Date: 2026-11-20 (Romania). Repository: `dan3s2020/MagicPerspective`, isolated branch `experiment/SHA256-NATIVE-ACTIVE-INTERVENTION-20261120`. Original source pinned through ancestor `ac205b5bc561274b957584a7dee058a1110ab6f8`. The native source `v17/transcend/torus-aether/devour/brain.mjs` and `worlds/exercise.mjs` is **unchanged**; existing production UI and saved checkpoints are untouched.

## Explicit scope, so the results cannot be misinterpreted

This is **full, standard 64-round SHA-256**, calculated from each candidate, but the unknown input is restricted to **one byte** (256 possibilities). Every candidate query calls the 64-round SHA world and independently cross-checks its digest against Node `crypto`. **This does not test arbitrary SHA-256 preimages in 2^256 space** and does not demonstrate a cryptographic break.

The single ORIGINAL `Brain` lives through physical observations using `Brain.live`, discovers genuine motor effects using `Discoverer.learnStep`, and acts through either original `Discoverer.choose` or original `Brain.predict` scores. In an isolated integration experiment, motor candidates are checked with the SAME Brain's `Discoverer.effect` and its actual visit history, not a substitute neural model. Teacher-provided known solutions occur **only in training**; at evaluation, a hidden target is passed only as a full 256-bit digest and the agent sees the SHA transformations of its OWN candidate message. The evaluator verifies full digest equality. No preimage byte or gold trajectory is supplied to any blind decision routine. There is no fake attraction node for the hidden target.

The world maps one-byte input candidates to 16×16 locations; a movement corresponds to a different **real input byte**, not an inverse SHA round. The entire set of 64 SHA round states is available as actual sensory feedback for candidate queries. Consequently, any success can still arise from searching a tiny space without learning inverse crypto.

## Actual train protocols and causal controls

1. Eight known SHA messages; **all 64 compression rounds** observed through the original Brain.
2. A physical reverse WALK along known state sequences teaches the original Discoverer the fourth direction with `learnStep`. That is not an unknown SHA inverse.
3. For the causal-action variant, **16 known-target navigation episodes** demonstrate shortest motor actions plus resulting real SHA states. In the final independently randomized split there were **148 actual teacher motor interventions**, all with known target only in the train set.
4. Once training finishes, `brain.frozen=true` is set. At blind evaluation, no `Brain.live` learning occurs; `Discoverer.learnStep` may still observe its own actual position transitions where used. The hidden input is never shown.
5. Target-swap controls feed another trial's digest to the policy while the evaluator still checks the actual true target. This tests whether a target-conditioned action mechanism actually uses relevant information.
6. Equal `64` SHA-world queries per target maximum for each policy. Calls that evaluate a duplicate byte or an invalid movement still consume a query; some policies use fewer calls because they stop immediately upon exact success.

**Candidate domain is only 256 bytes**; hence a no-information search that tries 64 different inputs has a nominal 25% hit probability per uniformly chosen target (before train/test exclusion details). A discovered 20%–25% success rate here is **not evidence of inversion**.

## Evidence: real original V42 executed, not a diagram or proxy

| Stage | Native executable | GitHub Actions | Empirical result |
| --- | --- | --- | --- |
| First actual active SHA actions, 8 held-out targets × 32 queries | `native_sha256_active_interventions.mjs` | [44635321263](https://github.com/dan3s2020/MagicPerspective/actions/runs/44635321263) **SUCCESS** | Original Discoverer **1/8**; original Brain.predict **0/8**; unique random **0/8** |
| Four directions learned, 64 held-out targets × 64 queries | `native_sha256_active_calibrated.mjs` | [44635648943](https://github.com/dan3s2020/MagicPerspective/actions/runs/44635648943) **SUCCESS** | Discoverer **8/64**; original predictor **0/64**; unique search **13/64**; SHA target did not change predicted first action |
| Causal target→motor training (171 observed teacher actions), 32 unseen × 32 queries | `native_sha256_causal_target_actions.mjs` | [44636754388](https://github.com/dan3s2020/MagicPerspective/actions/runs/44636754388) **SUCCESS** | Discoverer **4/32**; Brain raw **0/32**; target-scrambled Brain **0/32**; target-dependent first-action variety 2 rather than 1 |
| Brain scores gated by native Discoverer body + visit history, 32 × 32 | `native_sha256_body_coupled_policies.mjs` | [44637149414](https://github.com/dan3s2020/MagicPerspective/actions/runs/44637149414) **SUCCESS** | Novelty-gated **4/32**, target-scrambled **3/32**, unique uniform **2/32**; plain body-gating **0/32** |
| Larger 128-target test using prior affine target indexing (exploratory, target/index correlation possible) | same native body-coupled file | [44637319021](https://github.com/dan3s2020/MagicPerspective/actions/runs/44637319021) **SUCCESS** | Correct target **25/128**, scrambled **28/128**, unique uniform **27/128**, Discoverer **21/128** |
| **Independent target permutation**: 128 × 64; primary final evidence | **`native_sha256_body_coupled_randomized.mjs`** | **[44637535988](https://github.com/dan3s2020/MagicPerspective/actions/runs/44637535988) SUCCESS** | See exact table below; secret split generated independently of task-index/initial-position pattern |

### Primary final randomized 128-target result

The candidate-byte universe is permuted once with an independently seeded Fisher–Yates shuffle, seed `0xa137b5cd`. The first 8 shuffled byte messages are train, the next 128 shuffled bytes are blind. Per-trial starting positions and policy RNG use *separate* deterministic sequences.

| Policy | Exact SHA preimages /128 | SHA-world queries | Distinct bytes evaluated | Duplicate evaluations |
| --- | ---: | ---: | ---: | ---: |
| Original `Discoverer.choose` | **30** | 7266 | 6727 | 539 |
| Original `Brain.predict` gated by `D.effect` | **1** | 8134 | 1089 | 7045 |
| Same gated predictor, wrong target digest | **1** | 8134 | 1084 | 7050 |
| Original Brain + `D.effect` + avoid visited | **27** | 7352 | 6985 | 367 |
| **Exactly same policy, WRONG target digest** | **28** | 7346 | 6993 | 353 |
| Random physical movement | **7** | 7991 | 2091 | 5900 |
| Uniform candidate search, without replacement | **29** | 7251 | 7251 | **0** |

For paired outcomes on the same 128 targets:
- Correct-target gated+novelty vs **wrong-target** policy: both found 26 of the same targets; correct-only **1**, scrambled-only **2**; success difference **−0.78 percentage points**.
- Correct-target gated+novelty vs uniform-unique: both 10, native-only 17, uniform-only 19; difference **−1.56 pp**.
- Original `Discoverer.choose` vs uniform-unique: both 9, Discoverer-only 21, uniform-only 20; difference **+0.78 pp**.
- These small, opposite-signed differences are NOT evidence of advantage; none demonstrates an improvement from the correct SHA target. A model generating more proposals or revisiting fewer cells can obtain some correct preimages in a 256-candidate domain by ordinary search.

`Brain.predict` still generated only **two distinct initial actions** across the 128 requested SHA targets. Restricted short-range n-gram-style native prediction is a major issue, but simply increasing the context cap from 4 to 8 previously did not improve blind accuracy and increased execution cost. The original Brain did not infer the missing `W[t]` constraints needed to navigate unknown inverse SHA trajectories.

## Files and reproducibility

- [Primary native experiment source](../research/sha256-labyrinth-20261119/native_sha256_body_coupled_randomized.mjs)
- [Native training on real SHA causal motor pairs](../research/sha256-labyrinth-20261119/native_sha256_causal_target_actions.mjs)
- [Original raw body-coupling experiment](../research/sha256-labyrinth-20261119/native_sha256_body_coupled_policies.mjs)
- [Complete randomized GitHub execution and original raw artifact](https://github.com/dan3s2020/MagicPerspective/actions/runs/44637535988)
- Workflow source `.github/workflows/sha256-independent-targets-128.yml`; run artifact `native-SHA256-128-independent-targets` has the actual `native_results.json`, including first candidate traces per target, fixed seeds, metrics, test-time SHA verification and source pin.
- Original earlier observational SHA lab report: `docs/SHA256_NATIVE_BRAIN_VERIFIED_DISCOVERIES_20261120.md`.
- No test score is inferred from GitHub workflow existence: **all listed success scores were read from completed original Brain execution logs and raw JSON**. The first failed CI runner/prototype are documented separately and do not masquerade as passes.

## Conclusion and next falsifiable research question

**What works:** Original organism genuinely runs, learns four physical motor transformations without manually setting its learning counters, responds to full-round SHA observations, performs novel input-message interventions and, when original Brain and original Discoverer are coupled, avoids many repeated evaluations. All under controlled frozen evaluation.

**What does not work:** The requested digest does not guide a demonstrably superior inverse SHA-256 search. On a properly independent hidden split, the *wrong-target control performs essentially the same as the correct-target policy*, and both match a trivial unique candidate search on the very small one-byte domain. No SHA-256 full-preimage vulnerability is established; no disclosure is warranted.

**Next new mechanism (NOT yet implemented or demonstrated):** Instead of making 2D movement over candidate bytes the primary physics, let the original Brain act on and predict **actual SHA round constraints**: internal state registers `a..h`, the full correlated message schedule `W[0..63]`, and inverse-branch consistency. A blind oracle can reveal the public target digest and the verified feedback of each candidate world, never the evaluator's secret. A successful test must show target-conditioned **nontrivial branch elimination** or preimage recovery beyond exhaustive search, with a shuffled-digest and equal-query control, first on strict heldouts and then across larger messages. The existing 16-category trajectory clustering and local backward-parameterization alone do not constitute a break.
