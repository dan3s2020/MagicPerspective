# MagicPerspective V36 — infer the goal from prior lived instruction effects, then navigate with ORIGINAL Discoverer.shape()

**2026-11-07** · Research-only branch `experiment/V36-OBSERVED-QUESTION-INTENT-GOAL-PATH-20261107`.

**Release status:** experimental, no broad semantic QA/CUDA claim, does not replace V17 / V31 `Discoverer`, `AligningGraph.write()`, original UI, TinyStories checkpoint or other branches.

## Why V31's 100% curve was not yet enough

V31's actually tested learning curve is **0/360, 0/360, 0/360, 180/360, 360/360, 360/360** after 0, 6, 12, 18, 24, 36 observed training worlds. Its explicit test prompt already contains both the source and desired destination word (`Replace "tea" with "coffee" in:`), so `Discoverer.shape` solves the route after the target predicate has already been supplied. This is real controlled transfer, not open-ended question understanding. A separate V31 native test passed **32/32 complete unseen texts, 198,685 positions compared, up to 1,800 tokens**, with that same explicit goal.

V36 changes **only the goal-inference and observed evidence lane**; it never substitutes an alternate byte/next-character model or a hardcoded completed answer. Existing V31 planner and original tests are unchanged.

## New evidence-bearing mechanism

1. The SAME `LearnedCognitiveMap` stores `instructionGoalMemory` and `instructionGoalEpisodes` inside its version-1 checkpoint export/restore (backward compatible with older snapshots).
2. Only an explicitly attested **actual** training-world trajectory with unique episode identity is accepted: `instruction, states:[before,after,...], episodeId, executedTransitionsObserved:true`. Every transition must differ at precisely **one token position**; unsupported multi-coordinate dynamics abstain. The flag is supplied by the caller, **not independently verified real-world physics**.
3. A task intent becomes eligible only after **two distinct observed episodes with the SAME transformation sequence**. One episode is insufficient. Conflicting outcomes for the same source token and instruction cause explicit abstention.
4. At frozen evaluation, user passes only `instruction` and a previously unseen `source`. **No `target`, `goal`, `reference`, `answer` or `expected` is accepted**. The goal predicate is inferred solely from earlier actual episode outcome records. It is **not** copied into the answer.
5. The SAME original `LearnedCognitiveMap.formSolution` invokes `Discoverer.shape()` on the original evidence-based state topology. Each proposed edge is replayed using the original `model.predict`. If an action isn't available, the path doesn't appear, or a step deviates from the witnessed effect sequence, no answer is emitted. The answer comes from the **final actually replayed state**, not a string replacement function.
6. An optional stricter research mode `allowComposedInstructions:true` permits **unseen arrangements of already-observed instruction words**, but only when **two different instruction phrasings** were themselves supported by independent episodes for the same action. A uniquely discriminative token (e.g. the witnessed `brew`) must be common to those phrasings, and every word in the new phrasing must have occurred in some previously witnessed instruction. A competing instruction, negation containing unobserved vocabulary or unknown synonym is refused. This is a **finite lexical composition hypothesis**, not universal semantics.

## Verified learning curve (test output from unchanged original Discoverer)

Three seeds (31,47,73), twelve action families, ten unseen heldout sources per family and seed, 360 frozen cases at **each** training stage:

| Observed worlds | Exact complete answers | Accuracy |
| --- | ---: | ---: |
| 0 | 0/360 | 0% |
| 6 | 0/360 | 0% |
| 12 | 0/360 | 0% |
| 18 | 180/360 | 50% |
| 24 | 360/360 | 100% |

**Difference from V31:** None of the withheld question instructions states the target word (`coffee`, `blue`, `large`, etc.). The instruction itself is an **exact previously observed finite intent**; the `initial` text is novel. The tester compares references only AFTER `Discoverer.shape` output is frozen. All source checkpoint serializations are byte-for-byte equivalent before and after the entire heldout evaluation.

Other observed controls:

- Two previously observed tasks cause distinct first answers for the **same** never-seen source `A visitor carries tea.`:
  `Brew the refreshment` → `A visitor carries coffee.`; `Dilute the beverage` → `A visitor carries water.`.
- Delete the actual learned `tea→coffee` original operator (in test-memory COPY), and the learned goal remains recognized but the corresponding first-answer path **disappears**. Restoring the original model restores it.
- Two other actual observed three-state trajectories license **two original actions** `tea→coffee→water`; before the second episode, no first answer, after it `Visitor keeps water.` is correctly generated without the target stated in the question. No complete heldout reference was shown.
- **8/8** never-seen texts up to 1,800 tokens and **122,521 Unicode codepoint positions** were exact first-shot completions under the inferred goal, while evaluator did not modify memory.
- For a **never-before-seen full instruction phrasing** `Brew the drink` / `Dilute the refreshment`, new combinations of observed instruction words reached **120/120** heldout exact first answers across three seeds. Before sufficient distinct observed phrasings the system abstained. This applies only to **combinations of vocabulary already seen in actual instruction evidence**, not new synonyms or arbitrary natural language.
- Negative cases: unknown question, unseen action, conflicting intent effects, repeated source token in the same input, never-seen content words, previously unseen negators, and unexecuted training effects are all rejected, not manufactured into a 100% score.

## Complete original worker + HTTP + checkpoint integration

The **original V17** worker handles `/instruction-observe` (actual training evidence) and `/instruction-answer` (frozen original planner), with optional `allowComposedInstructions:true`. They are additive to the existing `/path-answer`, `/atlas`, Start/Pause/Save and all original V17 worlds. No second learning engine is spawned.

Actual end-to-end test `v17/tests/v36-native-real-intent-http.test.mjs` launches `devour.mjs`, ingests an original TXT corpus into `text,cognitivemap`, trains the prior witnessed instruction effects into the SAME `Brain.v8`, sends queries over HTTP, confirms the original source was never told the expected output, detects/refuses insufficient observations, verifies the original path, saves/restores the trained native checkpoint and inspects append-only path/failure forensic records.

Representative native test report: **36 original corpus documents observed, 2 witnessed episodes required before target-free first success; 4 recorded independent instruction episodes for unseen phrasing; successful original `Discoverer.shape` first path; 8 true frozen atlas events; restored native `Brain.v8` retained both task templates and their four episode IDs.** Training truth comes from the controlled test environment's supplied transitions; the API does not independently verify physical ground truth.

**Verified CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42363048656 — Linux original motor, worker/server/HTTP, checkpoint/atlas, all V31 and V30/V22/V19 regression tests, Windows original PowerShell parser checks, **all green**.

## Experimental files

- `v17/transcend/torus-aether/worlds/observed-instruction-goals.mjs` — witnessed intent memory and conservative optional composition.
- `v17/transcend/torus-aether/worlds/learned-cognitive-map.mjs` — only additive memory serialization/backward-compatible restore; original planner unchanged.
- `v17/transcend/torus-aether/worlds/path-answer-writer.mjs` — route-dependent frozen readout; original writer unchanged.
- `v17/transcend/torus-aether/devour/worker.mjs` and `devour.mjs` — true same-Brain training+answer HTTP, append-only original atlas.
- `v17/tests/v36-observed-intent-first-shot.test.mjs` — 360-case curve, 120 unseen phrasing cases, negative controls, two-hop action replay and long Unicode text.
- `v17/tests/v36-native-real-intent-http.test.mjs` — original native worker and checkpoint readback.
- `.github/workflows/v36-observed-instruction-goal-learning.yml` — independent Linux/Windows CI, original regressions green.

## Unsolved, non-negotiable conditions

1. **Arbitrary unseen question semantics:** V36 still needs previously witnessed instruction words/goal effects. A completely unfamiliar question, multi-coordinate goal, unknown synonym or unmodeled negation cannot be mapped to a correct target. OpenThoughts3 broad semantic Q/A was previously measured at **0/24** on genuine heldout questions, and has **not** been rerun successfully under this method. This research does NOT assert that OpenThoughts would improve merely from these 100% closed-world curves.
2. **True independent outside-world causal validation:** The HTTP endpoint accepts an attestation flag that action results were experienced; the backend cannot confirm the truth of an external world without actual independent action feedback.
3. **5D/noise ablation:** The goal-driven V31 reader deliberately uses a deterministic original route. The extent to which original 5D embedding or stochastic noise improves *heldout semantic question inference* remains unproven.
4. **4GB RTX CUDA:** GitHub Actions CPU CI verified native shape/HTTP; the specific NVIDIA 3050Ti text-training backend is not benchmarked or promised.
5. **Unbounded corpus retention and automatic novel goals:** Existing cognitive observation index, at most 2048 text tokens here, witness-memory growth, unfinished unseen semantic targets, and inference of multiple relevant slots remain unsolved design constraints. The append-only atlas records actual new evidence but does not claim to reconstruct every historical byte never observed by this branch.

**Do not merge this draft or replace the user's native UI or prior TinyStories checkpoint until an independently verified natural Q/A release test passes.**

## Further first-shape → REAL independent simulated actions → error/wall test

The original `answerFromObservedInstructionPath` now accepts an **optional** independent `externalStep({before,action,stepIndex,proposedNext})` callback, executed only AFTER the complete native V17 goal-conditioned first-shape is already frozen. The callback returns actual environment `{after,accepted}`; its result is compared against every learned motor prediction before any text answer is released.

The new V36 two-hop test uses an **independent synthetic controlled world transition function** that looks only at its actual state, NOT the learned model's `predict`, teacher reference, or the proposed next output:
- `tea→coffee→water` survives **both** independently checked state transitions and returns the exact unseen terminal text `Visitor keeps water.`.
- When the external environment rejects step 2 as a **wall**, the previously planned two-action path is correctly invalidated. No final answer is manufactured; the exact failed step and both observed action outcomes remain in the diagnostic.
- When an environment accepts step 1 but produces an effect different from the frozen predicted effect, the result is refused as `EXTERNAL_ACTION_EFFECT_DIFFERS_FROM_FROZEN_PATH`, with the conflicting observation preserved.
- The original `LearnedCognitiveMap.export()` is **bit-for-bit unchanged** through all three frozen world validations. No hidden answer enters the planner and no accidental training updates are permitted.
- With no external callback (production HTTP query), the result remains clearly labelled **internal learned-action replay**, NOT physical-world success.

This is a stronger independently executed **controlled deterministic world** proof, NOT independently observed physical reality outside the test. Verified on full native Linux/Windows workflow: https://github.com/dan3s2020/MagicPerspective/actions/runs/42363526386 (both jobs green, original V31/V22/V30/V19 regressions passed).

## Other human-text discoveries NOT combined into this experiment

A distinct sibling V35 research branch measured a real supervised Stanford SQuAD 1.1 reading comprehension task using original V17 `Brain.disc.shapeGraph`: **62/450 exact full answers (13.78%)** on 450 genuine heldout article-disjoint DEV questions, compared with **1/450** with no learned question-preference and **14/450** with shuffled heldout questions. That finding is genuine human extractive-QA, but V35 uses a separate supervised source-span preference head. It has **NOT** been secretly merged into V36's target-free original learned action navigation or counted toward V36's controlled 100% curves. Independent evidence: https://github.com/dan3s2020/MagicPerspective/actions/runs/42361550762, source `experiment/V35-REAL-SQUAD-EVIDENCE-PATHS-20261107`.

A full unrestricted first-shot semantic Q/A test remains the deciding release gate.
