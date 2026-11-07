# MagicPerspective V24 — one original Brain, observed mathematical actions, original preaction solution shape, real feedback and full documents

**Date:** 2026-11-07.  
**Status:** REPRODUCIBLE SUCCESS IN A STRICT STRUCTURED ARITHMETIC WORLD; **GENERAL NATURAL-LANGUAGE / ALL-CUDA RELEASE STILL BLOCKED**.  
**Isolated branch:** `experiment/V24-OBSERVED-ACTION-LONGTEXT-RESTORE-GPT6-20261107`.  
**Frozen test commit:** `0149b5a00f8b992876667027df99cde7b0f94805`.  
**GitHub Actions run:** [42343283459](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343283459) (full 56-goal CI and all prior gates); prior full-green native feedback + UI run: [42343047816](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343047816).

## 0. Requirement and source integrity

The user did not authorize a next-character replacement. Source-to-change contract: `user-intent/changes/V24-LONGTEXT-DIRECT-DISCOVERER-20261107.json`; original regression: `REGRESSION_USER_DIRECTIVE_2026-11-06.md`; `AGENTS.md`; `docs/CRITICAL_REGRESSION_TEXTCARD_VS_HYPERDIMENSIONAL_GOAL_PATHS_20261107.md`. The original learning law and source must be preserved.

This experiment runs on top of the **actual, original V17 Brain**, with its existing `Discoverer.shape()` as the only goal-propagation/path extraction function. Original file `v17/transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs` has historical Git blob `e34d787467b7238c7422a0509173b1f785eb2342`. The baseline original maze, original UI controls and original checkpoint loader remain present. No PR merge or modification to `main` was performed.

Two proven arithmetic research sources are carried **byte-exact**, not rewritten:
- `v17/transcend/torus-aether/worlds/observed-transformations.mjs` = `203af6f21b3834bc6d9487e78cef268bba7f37e5`
- `v17/research/text-hypermaze/state-dependent-axes.mjs` = `4a69a622e9221b1b18bee310343d0a1e3d25e46d`

The older state-dependent research A* planner is never called in the new field. The code uses its **observed pair induction and action-effect operator**, then calls the same exact original `Discoverer.shape()` over the action-labeled textual states. No hidden answer or oracle path is passed into the planning call.

## 1. Learned transformation and preaction path architecture

The **one** original Brain has a new, optional, checkpointed field stored inside its existing `.v8` file, **not a second Brain or a separate byte predictor**. It reads independent, real before/after action state pairs as evidence. `NativeMathGoalField.observePair` constructs observed numeric movement operators and local state-dependent effects. The constrained mathematical grammar is `a * b = c`, but the learner is not handed the multiplication function: it infers the dependent delta from observed before/after differences. The **independent test environment** supplies the true multiplication rule, never the learner.

The long document is preserved as one complete state, including arbitrary unseen surrounding paragraphs, punctuation, and identifier underscores. Only the uniquely matched observed numeric clause is changed. Goal constraints can specify independent input coordinates (`a` and `b`) but cannot include the unknown dependent answer (`c`).

The planner builds a graph of candidate states by reapplying learned actions, records candidate edges as **unverified hypotheses**, seeds the goal only if independent constraints are met, then invokes **original `Discoverer.shape()`** to produce an entire goal-conditioned route **BEFORE any answer output or actual physical action**. Original 0.97 goal propagation, uphill extraction, seeded stochastic choices and physical resistance are preserved. Every hypothesis must later be checked against external physics.

The native worker and real HTTP controller expose:
- `POST /native-math-observe`: user/independent physical process submits real before/after experience; stores it in the original Brain and its original checkpoint.
- `POST /native-math-eval`: computes the entire frozen solution path, exact current goal field, world-state/axis graph and complete candidate answer, **without learning from heldout data**.
- `POST /native-math-step`: the external environment reports **the actual entire post-action state** and acceptance/rejection; the original worker compares it with the previously frozen expectation, marks context-specific resistance on discrepancy, records the actual action in the same Brain, and recomputes the path through **original Discoverer** after surprise. No tool silently executes its prediction and labels it physical evidence.

The existing original V17 UI is preserved. The additive native math panel in `ui/native-math-live.js` shows actual learned rules, full predicted answer, actual goal field, graph nodes and edges, preaction path and its replay. A separate control reports a real post-action outcome; predicted paths are **visually and verbally labeled as predictions**, not physical execution. UI server and syntax/legacy controls are checked in CI. Physical reporting in browser relies on a real user/environment submitting external evidence, so an arbitrary pasted answer is **not automatically independently verified**; the CI uses a genuine independent world callback.

## 2. Reproduced complete long-document heldout results — not next-character prediction

Source: `v17/tests/v24-56-distinct-longmath-heldout.test.mjs` and `v17/tests/v24-native-math-field-heldout.test.mjs`.

The learner observes **only six paired arithmetic experiences**, no long heldout target answer. All tests use the frozen learned field, differing numerical goals and **entirely unique long surrounding contexts**. The independently coded outside-world verifier recomputes arithmetic physics on each planned action and checks the WHOLE predicted string against the correct WHOLE output.

### Harder stress test (56 distinct goals)

- Initial observed arithmetic state: `2 * 3 = 6.`
- Unseen goals: `a=4…10`, `b=5…12` (7 × 8 = **56 different input-goal combinations**), each with its own new ~2,057-token document.
- Full documents correct at first prediction: **56/56 = 100% in this constrained world**.
- Full answer characters compared, including unchanged contextual bytes: **4,660,945**.
- Before-first-action planned route length: **4–17 actual symbolic actions**; mean **10.5**.
- Mean explored candidate graph states: **786**, all generated from observed actions.
- The independent physics callback checked each action, did not read the predicted next state or supply an answer to the learner.
- Heldout period: **no training mutation of induced transformations or observed samples**. Only last-run diagnostic statistics update after scoring.
- Measured CPU scoring interval: **1,353 ms** over those 56 documents, **3.285 MiB/s of full output evaluated**. This is **NOT** CUDA training throughput, or MB/s of new text absorbed.
- Reproducible action trace source: `V24_56_DIFFERENT_LONG_HELDOUT_SHAPES` in Actions run 42343283459.

Earlier direct heldout test: **16/16** distinct long documents, **866,256** complete output characters, mean **7** original-actor action steps, independently checked and no answer-target leak.

**Crucial scope:** 2 independent numeric axes + 1 dependent numeric coordinate are learned in this test; its 2,057-token context is preserved and inserted into the state graph, **NOT evidence that 2,057 semantic dimensions were independently discovered**. The learner does **not** generate novel paragraphs of arbitrary language here. The 100% exact metric is not claimed for general OpenThoughts reasoning or arbitrary natural prose.

## 3. Original one-Brain real HTTP, checkpoint, action-by-action execution

Source: `v17/tests/v24-native-math-http-runtime.test.mjs`. It launches the **original** `devour.mjs` HTTP server and original V17 worker on a real temporary corpus, `--worlds cognitivemap` and intentionally `--gpu off`. The test posts six independent observed paired transformations, freezes the original learner, queries a **2,056-token novel whole document** target `7 * 8`, checks the complete answer and original `Discoverer.shape` path, then restarts the same original server and restores the same `.v8` checkpoint.

Observed log `V24_ONE_NATIVE_BRAIN_HTTP_COMPLETE` from [full-feedback run 42343047816](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343047816):

```json
{"observedActionPairs":6,"fullDocumentTokenCount":2056,
 "fullAnswerCharacters":52083,"multiActionPredictedBeforeOutput":10,
 "graphStates":860,"originalMethod":"Discoverer.shape",
 "exactRestoredAnswer":true,"originalUIAndRuntimePreserved":true,
 "separatelyObservedPhysicalSteps":10,"physicalContradictionRecorded":true,
 "realReplanTriggered":true,"CUDAExecuted":false,
 "unrestrictedTextUnderstandingProven":false}
```

All **10/10 planned actions** were independently played by a separate mathematical physics implementation, the actual whole-document outcome returned to the same original Brain and checked against the prediction **after** the frozen route was created. A separately injected rejected action was recorded as false, not silently marked solved, then the original `Discoverer.shape` was invoked to recompute a route. The new source and historical evidence survived checkpoint reload.

Additional source: `v17/tests/v24-native-math-live-feedback.test.mjs`, test log `V24_REAL_PHYSICAL_WALL_AND_REPLAN`: after original path began with `[0,1]`, outside physics rejected it; the context-specific blocked action was saved, original actor then correctly selected `[1,1]` on a new path. The stored failure is **not** relabeled success.

## 4. Original regression protection

From [run 42343047816](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343047816):
- 5/5 original native math full-answer tests PASS;
- 1/1 actual native HTTP/checkpoint/real-feedback test PASS;
- 2/2 independent physical-feedback and replanning tests PASS;
- 8/8 V23 original long path and 2D exact maze parity tests PASS;
- 6/6 V22 exact original source/shape tests PASS;
- 19/19 existing cognitive map tests PASS;
- V23 exact same original-field/noise UI tests, V19 live HTTP test, V21 native multiworld/QA migrations, original JS UI and Windows PowerShell source checks PASS.
- New 56-goal stress test is separately checked in run 42343283459 and has its own strict learned-state freeze invariant.

Earlier RED results remain publicly preserved and were diagnosed, **NOT hidden by altered success metrics**:
- [V23 RED 42341046064](https://github.com/dan3s2020/MagicPerspective/actions/runs/42341046064): hardcoded 96-token limit prevented >2048 contextual document; V24 uses bounded explicit 4096 state-token option without changing default.
- [V24 RED 42342368480](https://github.com/dan3s2020/MagicPerspective/actions/runs/42342368480): full-state tokenizer incorrectly split underscores and exceeded 4096-token budget; fixed original cognitive identifier granularity without modifying previously proven causal induction source.
- [V24 RED 42343223917](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343223917): **all 56 whole answers were correct**, but a test overconstrained that even the *last-run diagnostic record* remain null after execution. The follow-up test still requires **exactly unchanged learned operators, observed training samples, physical outcome counts and contextual-wall memory**. Only the legitimate `last` telemetry is excluded from the frozen learned-state comparison.
- Previous [V23 observer snapshot mismatch 42341983746](https://github.com/dan3s2020/MagicPerspective/actions/runs/42341983746): tested source referenced an uncommitted snapshot filename. Corrected to the verified immutable original blob `e34d787...`, not replaced by a fabricated snapshot.

## 5. What remains unproven; forbidden release claims

1. Full generation of genuinely novel natural-language paragraphs, correct arbitrary long question answers and general unseen OpenThoughts3 tasks with **100% first-try accuracy** has **NOT** been demonstrated by these strict numeric rewrite worlds.
2. Endogenous hyperdimensional noise invention across real natural language, learned world-self 4D/5D semantics or high-dimensional causal graphs **causing improved unrestricted language reasoning** is not established by this V24 run. Earlier independent xD/noise/transport research remains preserved, but not all mechanisms were integrated into one production policy.
3. The numeric graph on this branch is **CPU** (original JS), not 100% RTX 3050 Ti CUDA. No user's Windows local GPU/corpus/checkpoint was accessed or overwritten. The measured full-document output throughput is not GPU training throughput.
4. The new browser panel is wired to the original live V17 server, with HTTP and source/legacy-controls regression. Browser screenshot/pixel-level evidence on the user's exact Windows environment and full multiworld simultaneous stress remain unverified.
5. Complete source-byte archival of every historical conversation and all original attached media is still explicitly incomplete under `verbatim/coverage.json`. Do not claim every missing original byte was reconstructed.
6. The default historical writer continues to support prior functionality; the user’s desired all-domain no-character substitution requires a verified native goal-conditioned policy for all actual Q/A tasks, beyond this opt-in math field.

**FINAL RESEARCH STATUS:** important experimentally demonstrated PARTIAL implementation; original Brain and UI preserved; original `Discoverer.shape()` controls long text-action routes; real feedback corrections and persisted checkpoints verified; isolated V24 branch ready for further controlled tests, **NOT** user-requested unrestricted-language production release. No run command should be advertised as a 100% OpenThoughts solution. No modification of `main` or merging of other agents' branches.
