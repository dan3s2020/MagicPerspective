# V23 — Original Discoverer, observed hyperpaths and long-route numeric extinction

**Date:** 2026-11-07
**Branch:** `experiment/V23-OBSERVED-HYPERPATH-LONG-RANGE-20261107`
**Status:** PARTIAL REPAIR — native end-to-end arbitrary held-out language answers NOT PROVEN; **NO RELEASE**.

## Sources and non-negotiable constraints

- `AGENTS.md`, `REGRESSION_USER_DIRECTIVE_2026-11-06.md` and issue #25 remain binding and OPEN.
- Frozen source base: V22 commit `2209e6f2d21aca8ee17b1f38306c510665d8c1a9`.
- Immutable V17 source: `v17/transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs`; real V22 `Discoverer.shape()` is `v17/transcend/torus-aether/worlds/exercise.mjs`.
- User-quote-to-change contract: `user-intent/changes/V23-OBSERVED-HYPERPATH-LONG-RANGE-20261107.json`.
- Original maze, V17 UI, PyTorch GPU worker, trainer, checkpoint files and all other branch source are unchanged in this isolated branch. NO merge to `main`, NO modifications to `v17/START_V21_AETHER_VEIL.ps1`.

## Reproduction — failing original adaptation

GitHub Actions original V23 red run:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42340712455

The same original actor's 2D maze solution path exactly matched its immutable baseline across **84 seeded boards**, including the randomized temperature/noise selection for 42 boards. However, a closed graph composed of **144 experienced consecutive text-state transitions** was already known to contain a valid route, yet `Discoverer.shape()` returned no uphill path, with the leading field values all zero.

Source cause in `learned-cognitive-map.mjs`:
- The V22 graph adapter assigned unknown/default FLOOR conductance `0.5` EVEN to directly observed accepted transitions.
- The unchanged native law multiplies the next field by `0.97 * conductance` for each step, with an absolute `1e-12` relaxation threshold.
- At 144 steps, a default path contribution of `(0.97*0.5)^144` vanishes long before the original field reaches the starting node, making a known verified route invisible. This is a **numeric attenuation/scaling regression in the adaptation**, not proof of intelligence.

## Strictly bounded repair

Changed precisely one existing source file, `v17/transcend/torus-aether/worlds/learned-cognitive-map.mjs`:
- `formObservedWorld` passes `verifiedTransitions:true` to the existing shared V17 field adaptor ONLY when every edge is an unambiguous transition actually observed to happen.
- Only that mode maps traversable floor conductance to `1`, reflecting already accepted transitions rather than uncertain hypotheticals.
- Other hypothetical cognitive language graphs keep their prior conductance, and `Discoverer.shape()` itself is unchanged: attraction seed `>.2`, resistance threshold `<.5`, `0.97` discount, `2*N` relaxation, uphill policy and seeded noise.
- No new token predictor, teacher-force answer, hidden target, BFS oracle or alternative planner introduced.

## Measured tests after fix

GitHub Actions green run at commit `8514838e63955c976a01bef588ed8a9d6df152b7`:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42340826171

- 84/84 seeded original 2D retina comparisons matched the frozen V17 `Discoverer.shape()`, 42 with seeded temperature/noise.
- Complete prior-to-action route over **144/144 actually observed transformations**, `fieldAtStart=0.012448864341302825`, using `Discoverer.shape()`.
- Complete prior-to-action route over **511/511 actually observed transformations** in 512 nodes, `fieldAtStart=1.7392267645589598e-7`.
- Negative control: no target or missing observed edge returns `found:false` and cannot generate a hidden oracle route.
- Negative control: contradictory observed action physics invalidates the path rather than asserting success.
- Existing V19 cognitive learner tests **19/19**.
- Existing V21 original answer-boundary tests **2/2** and observed-action tests **5/5**.
- Original Windows PowerShell 5.1 launcher parse test passed.
- New tests **5/5**, regressions **26/26**, all completed successfully in **GitHub-hosted CI**, not on the user's RTX 3050 Ti.
- The more comprehensive existing native V19 HTTP and V21 multiworld HTTP/checkpoint migration runs are tracked by the V23 branch CI workflow. Their outcome is NOT presumed green until checked.

## CRITICAL scientific and production limitations

1. Observed-route accuracy is **not** 100% semantic answers. These tests supply a checkable endpoint and edges learned from observed transitions, not a withheld natural-language answer to discover. They do not demonstrate universal generalization, automatic language semantics, whole-answer prediction on OpenThoughts3, or 100% accuracy on new lengthy Q/A tasks.
2. `LearnedCognitiveMap.formSolution()` still explores bounded state graphs and the native V17 `AligningGraph` answer writer still exists independently. The exact original route has **not been shown to causally control the native output answer generation** with a frozen unseen OpenThoughts corpus.
3. Native `Discoverer.shape()` also has a separate absolute relaxation floor `1e-12`; even with conductance 1, sufficiently long non-hierarchical graph distances may again extinguish the field. No 512-node success should be advertised as unlimited route length.
4. No benchmark here establishes **100 full text problems/s**, **MB text/s**, full CUDA saturation, a non-stalling runtime, or equivalent performance on 4 GB VRAM.
5. Full original conversation and some media bytes are unavailable; the main repository's `verbatim/coverage.json` explicitly does not attest byte-perfect archive completeness. This change does not invent or assert missing data has been recovered.
6. Original UI code is preserved byte-for-byte; **this patch does not add a new hyperdimensional scene** or guarantee a UI renderer for all state/edge/trace events.
7. Existing issue #25 remains **OPEN / BLOCKING**. This branch is not an approved release and no final launch command is authorized by the requested release gate.

## Future acceptance (not claimed done)

One **native single-organism**, frozen end-to-end run must observe actual large text Q/A corpora and real semantics; learn state/action/feedback topology without access to withheld answers; predict the whole target-conditioned form before answer output; execute predicted actions with live per-step graph and delta, while proving the graph causally determines native answer; measure independent heldout unseen long responses against controls, ablations, repeatable noise, throughput, CUDA, checkpoints and preserved original UI. Preserve all old code and record failures. A CI green check on closed observed graphs never substitutes this proof.

## Additional measured evidence — native HTTP, held-out symbolic physics and branch/noise

The earlier line "one existing source file" remains literally true for modified runtime paths, but this same file subsequently gained a bounded **confirmedActionPhysics** flag for `formSolution`: when every modeled action has positive independent physical experience and no contradiction, the existing original V17 field uses passability conductance `1` on the imagined application graph. The target remains a checkable predicate; the full execution is independently validated against a real `step()` callback. A learned transformation may still be wrong on genuinely unseen contexts; the test therefore does NOT prove natural-language semantics.

**Green end-to-end native HTTP and checkpoint run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42341102423

- **2,048-element held-out text-state composition**: 48 observed phase transformations, a whole frozen 48-action form before output, independent environment step verification and all 2,048 output elements matching. This is **symbolic identity + phase transition**, NOT independent recovery of arbitrary semantic Q/A answers. Reference log: `V23_UNSEEN_LONG_COMPOSITION`. The 48 underlying action rules were each taught from a short single-step example; the 2,048-element input itself was not in training.
- Causal ablation deleting action `advance:23` causes `formSolution` to fail; a contradictory action outcome also invalidates the plan rather than overclaiming.
- Native V19 corpus-trained HTTP server held-out unseen composition test **PASS**; native V17/V20/V21 multiworld HTTP, old UI and checkpoint test **PASS**; Q/A text training resurrection and resume from original V21 checkpoint **PASS** (CPU CI environment, no CUDA performance claim).
- **160-layer branching observed action topology**: native original method constructed a complete **320-action route** before movement, with seeded stochastic choices across two legitimate learned branches at each level: **85 left, 75 right**. Re-running with the same seed and temperature produced the exact same action path. Reference: `V23_OBSERVED_BRANCHING_NOISE`.
- **Latest completed all-green branch/noise run at this audit:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42341109961 ; 9/9 V23 tests, 19/19 V19 cognitive, 2/2 V21 boundary, 5/5 observed action, V19 HTTP and two V21 native HTTP/migration tests, plus Windows PowerShell 5.1 parse.
- No new screenshot or HTML hypergraph UI is claimed. No natural open-ended answer precision on OpenThoughts3 is measured. No release status changed. Full historical byte completeness remains explicitly unverified.



## Native 2,048-token HTTP integration and V17 UI — MEASURED

**GitHub Actions real-process acceptance:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42341488681

At branch commit `70e7a0661b2dc52bccdb39f7269f058b19d31b3f`, on GitHub-hosted Linux Node 22 and Windows PowerShell 5.1:

- `v17/tests/v23-cognitive-native-long-http.test.mjs` **PASS**. Created an actual serialized original `Brain` checkpoint with 48 independently learned single-step local action effects, started the real native V17 HTTP process in `cognitivemap` world, resumed the `Brain` checkpoint, and requested a previously unobserved **2,048-token** text state through the real `POST /cognitive-eval` endpoint.
- The server emitted the original V17 attraction-law label `ORIGINAL_V17_ATTRACTION_0.97`, its entire measured scalar field, complete **48-action** pre-action path, from/to node indices, and complete resulting text state; `shapeField[0]=0.23176254155320164`. This is **frozen planning**; do not label UI scrubbing as live physical action.
- Verified unchanged pre-existing controls `allStart`, `allSave`, `gpuApply` and `textMazeCanvas` plus new field canvas / step inspection / max depth inputs in the real existing V17 UI; `node --check` on `app.js` also passed.
- New `cognitivePathCanvas` uses **measured** `Discoverer.shape` scalar potential per returned path node. Its x-axis is **step number** and y-axis log of attraction, explicitly a diagnostic 2D representation of the learned graph path, **not** fabricated coordinates in 4D or an asserted true geometric hyperdimensional embedding. All complete per-step states are accessible through the native API and scrub details.
- Frozen service safety bounds were raised from 1,024 to 131,072 initial characters, from max 12 to max 256 steps, with a hard 262,144-character POST payload cap and the `buildWorld` 8,192-token / 4,000,000 candidate token-cell bound. It is still a **bounded evaluator**, not an infinite-context engine.
- The green CI reran baseline 84-board parity and 9/9 V23 tests (including 511 observed steps, 320 branched/noisy actions, 48 learned transformations and negative controls), 19/19 V19 tests, 2/2 V21 answer-boundary tests, 5/5 observed-action tests, actual V19 and V21 multiworld HTTP/checkpoint suites, and Windows PowerShell 5.1 parser.
- The old note saying V23 "original UI code preserved byte-for-byte" refers to the **initial isolated V23 scaling patch**. The later optional UI extension intentionally adds controls **without deleting or changing original UI behavior**. It is not claiming the now-extended UI file hashes are identical.
- **NOT established:** 100% semantic answers on large held-out OpenThoughts3 prompts, autonomous natural-language goal discovery, physical action success from a language-only hypothesis without external validation, 100% GPU operation, user's own Windows RTX 3050 Ti run, or 100 full exercises/s. These remain **blocking**. Never promote this draft branch to a fully verified release or close regression issue #25 on a synthetic test result.

Source-to-change contract: `user-intent/changes/V23-LONG-TEXT-LIVE-UI-20261107.json`. All original V17 maze source, checkpoints, real GPU/CPU trainer and PowerShell launcher remain unmodified.
