# V21 native Discoverer shape on observed contextual paths and V19 learned text transformations

**Date:** 2026-11-07. **Status:** PARTIAL SCIENTIFIC RESULT / NOT A GENERAL SEMANTIC TEXT SOLVER / DO NOT RELEASE AS COMPLETE.  
**Isolated branch:** `experiment/V21-NATIVE-GOAL-WAVEFRONT-20261107`. `main` and the original V17 3-argument rectangular maze core are not replaced.  
**Source of exact user directive:** `verbatim/2026-11-07-USER-PUZZLE-NATIVE-HYPERMAZE.txt`.  
**Original architectural blocker:** [Issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25) — REMAINS OPEN.

## Summary: two hypotheses tested, both distinct

1. **Known-goal navigation on *witnessed contextual token transitions***: Extend the actual V17 `Discoverer.shape()` method with an optional observed directed-graph argument. The unchanged original 2D method is still selected for the existing `shape(ret,n,me)` signature. For V21, `veil.planNative(brain.disc,...)` passes contextual pair states, transitions observed from the *previous* real corpus, and an explicitly visible goal to the same original organism. It creates its whole planned route before attempting an action. The route's causal sensitivity is verified by edge removal. This is *known-goal reachability*, **not** new semantic answer inference.

2. **Novel compositional text transformations from observed before/action/after effects**: Existing V19 `LearnedCognitiveMap.observeWorld` or `observeActionResult` derives reusable operations from actually seen sentences and interventions. Its existing `buildWorld()` constructs **hypothetical** successor states of a never-seen input; the target is an explicit *predicate* from the question, `goal.slots`, not a supplied completed held-out answer. New `formSolutionNative(...,{disc:brain.disc})` calls the **same V17 method** over learned rules, predicts complete state/action route *before* action, and labels every edge `observed` vs `learned-rule-hypothesis`. Old `formSolution` and all existing controls are retained.

The shared mathematical operator has a discounted attraction field (generalized to empirical stochastic observed action outcomes):

```text
V(goal) = 1
V(s) = 0.97 * c(s) * max_(observed/action-hypothesis edges s->t) P(t | s,a) * V(t)
```

For deterministic unit-conductance and unique outcomes, this reduces to the original V17 attraction propagation. For stochastic outcomes it selects the highest-likelihood **single predicted trajectory**; it is **not** expectimax or a guarantee that each transition occurs. The implementation finds the discounted maximum via sparse reverse priority propagation, records the actual maximum Bellman residual and rejects unobserved edge creation. A separate action callback reports real `before/action/after`, compares anticipated vs actual movement and replans from the actual new state. For learned future V19 states, rule-derived edges remain explicitly hypothetical until independent physics confirms them.

## Exactly reproduced CI outcomes

Verified full workflow **SUCCESS**:
[GitHub Actions run 42342353210](https://github.com/dan3s2020/MagicPerspective/actions/runs/42342353210), [source branch](https://github.com/dan3s2020/MagicPerspective/tree/experiment/V21-NATIVE-GOAL-WAVEFRONT-20261107). GitHub Action job `128312593207` completed all steps successfully.

- `native-goal-wavefront.test.mjs`: **11/11** passing. Included original 2D regression, direct native graph method, read-only/hidden-answer throwing getter, stochastic outcomes, causal removal ablation, mismatch and replanning, real native V21 contextual graph comparison, temperature choices, and real long repository text.
- Actual repository text `CONVERSATIE_COMPLETA_DIN_CONTEXT.md`: **75,270 source bytes**; first **4,000 token symbols** used; **2,885** contextual nodes and **3,548** observed edges; native frozen known-goal route **27** steps, Bellman residual **0**, path found on first search. The target was **provided/known**. This is **not** 27-step proof of semantic correctness.
- `native-cognitive-goal.test.mjs`: **6/6** passing. 100 previously unseen structured long-text input instances with two learned text-edit operations and explicit target constraints: **100/100 exact complete end-states from first planned route**, **100/100 planned first actions**, **100/100 novel solution states**, **83,700 combined input characters** (not 83,700 characters in a single answer). Independent deterministic action physics callback, original frozen rules, contradictory-effect negative control, action-law deletion ablation and rejected-action feedback.
- `torus-cognitive-learned-map.test.mjs`: **19/19** original V19 regression tests passed.
- Existing `torus-aether.test.mjs` **6/6**, `veil-aether.test.mjs` **6/6**, `veil-aether.observed-action-field.test.mjs` **5/5** passed.
- `native-goal-http.test.mjs`: **1/1**, started actual V17 worker with real (fixture) text, maze + transform, served original UI, called `/veil-native-plan`, confirmed legacy `/veil-plan`, and loaded saved original Brain. Log: `NATIVE_GOAL_HTTP {"observedDocs":50,"nativeSteps":1,"residual":0,"caller":"Brain.disc.shape()","oldUILive":true,"checkpointRestored":true,"mazeWorld":true,"transformWorld":true}`.
- `native-cognitive-http.test.mjs`: **1/1**, started *actual* combined V17 worker with `cognitivemap,hypertext,maze,transform`, original HTTP and UI, tested `/cognitive-native-eval` and unchanged `/cognitive-eval`, verified checkpoint restoration. Log: `NATIVE_COGNITIVE_HTTP {"documents":67,"trainedRules":4428,"states":6,"completePredictedSteps":1,"inferredSteps":1,"residual":0,"checkpointRestored":true,"originalMaze":true,"originalTransform":true,"originalUI":true}`.
- Original V21 HTTP and corpus-split tests, Node syntax tests and the native original (V17) UI passed.

**Baseline differential warning, not concealed:** existing `v17/tests/torus-brain.test.mjs` expects **3** maze episodes from the root documentation prefix but sees **2** because the corpus prefix is shorter than its three trigger thresholds. This occurs **both** on the unchanged frozen V21 base checkout and on this candidate; CI intentionally compares the identical existing failure and emits a warning. The original source test is NOT deleted, rewritten or falsely counted as passing. It is separate from the new native algorithm, and the source fixture should be fixed independently with user approval.

## Concrete files and preserved boundaries

- `worlds/exercise.mjs`: one guarded optional graph argument in the same **original** `Discoverer.shape`; original 2D propagation body preserved.
- `worlds/goal-wavefront.mjs`: bounded sparse original attraction dynamics, empirical action probabilities, provenance tags, real physics callback and replanning.
- `worlds/veil-aether.mjs`: additive `planNative`; original contextual `plan()` unchanged.
- `worlds/learned-cognitive-map.mjs`: additive `formSolutionNative` over existing V19 learned sentence-action grammar; original `formSolution()` unchanged; new observed blocking self-loop (negative experience) affects route probability.
- `devour/worker.mjs`, `devour/devour.mjs`: additive `/veil-native-plan` and `/cognitive-native-eval` messages/HTTP in actual original Brain worker, including frozen checkpoint response.
- `ui/index.html`, `ui/native-goal-live.js`, `ui/native-cognitive-live.js`: additional visual areas on unchanged V17 original UI: real node/edge state graph, complete initial gold route, past actual text observations or measured action-effect edges, route scrub, uncertainty & observed-vs-inferred labels; no claims of intrinsically 4D geometry from a 2D display.
- `tests/native-goal-wavefront.test.mjs`, `tests/native-cognitive-goal.test.mjs`, `tests/native-goal-http.test.mjs`, `tests/native-cognitive-http.test.mjs`: negative and positive experiments.
- `.github/workflows/v21-native-goal-wavefront.yml`: reproducible direct CI execution plus original untouched branch differential control.
- No reset or migration of `brain-*.v8` or saved original CUDA index. No merge into `main`.

## Critical remaining scientific acceptance gaps

1. The Native V21 contextual graph currently navigates to a *known contextual goal*. Its exact 27-step route is **not** proof that a question alone determines a semantically correct unknown answer.
2. The Native V19 goal predicate must be supplied explicitly. Learning a correct *goal from unrestricted question meaning* and composing a general answer with the same action semantics is **not established**. Existing `Brain.chat` still invokes `AligningGraph.write()` for generic Q/A; it is **not** silently claimed to use `formSolutionNative`.
3. The 100/100 result is on 100 held-out **structured deterministic** compositional text edits, not 100% large novel OpenThoughts3 question-answer accuracy, and not evidence of a universal semantic navigator. Multiple independent natural-language held-out corpora, unknown-answer leakage tests and first-answer exact-match are required.
4. The original full CUDA TextCard path is preserved, but this new sparse directed graph and V19 learned action inference currently run **on Node CPU**, not CUDA. No device-level measurements on the user's RTX 3050 Ti, and no proof of >=100 fully trained long exercises/s.
5. Noise/temperature changes actual route selection in unit tests, but full endogenous NoiseAgency with a verified improvement in unrestricted natural-language goal success remains **unintegrated** into this candidate. A visual torus, 5D projection or low Bellman residual alone does not prove a causal high-dimensional discovery.
6. The branch has no native semantic text action physics for arbitrary large answer states; V19 predicted action effects can be falsified only by an actual environment callback/feedback. A standalone complete free-answer system has **not** been verified.
7. Full historical Verbatim archive has documented gaps. No byte-for-byte completeness can be claimed for missing originals.

**Release decision:** NOT READY. The combined verified results constitute an actual **partial native mechanism transfer** and a reproducible 100/100 result for a specifically constrained compositional class. Issue #25 remains OPEN until exact same original mechanism solves independently withheld unrestricted long natural-language answers through verified semantic actions, with frozen negative controls and the user's authorization. No final end-user launcher command is issued by this evidence record.
