# V24 — observed-action LONG DOCUMENT solution paths through the original V17 Discoverer

Date: 2026-11-07. Status: **MEASURED STRUCTURED SUCCESS / GENERAL NATURAL-LANGUAGE REQUIREMENT STILL OPEN**.
Branch: `experiment/V24-OBSERVED-ACTION-LONGTEXT-RESTORE-GPT6-20261107`.

## Provenance and safety

Binding original source: `AGENTS.md`, `REGRESSION_USER_DIRECTIVE_2026-11-06.md`, and `user-intent/changes/V24-LONGTEXT-DIRECT-DISCOVERER-20261107.json`.

**No edits** to original maze source `worlds/exercise.mjs`, immutable source `exercise-v17-IMMUTABLE-BASELINE.mjs`, original V17 Brain, working web UI, CUDA worker or checkpoints. The complete original V17 learning machine stays intact. Do not merge into `main` or advertise a launcher as production-ready based solely on structured research successes.

This branch copies **byte-identically** two proven earlier experimental sources:
- `worlds/observed-transformations.mjs` blob `203af6f21b3834bc6d9487e78cef268bba7f37e5`;
- `research/text-hypermaze/state-dependent-axes.mjs` blob `4a69a622e9221b1b18bee310343d0a1e3d25e46d`.

The copied numeric field is used ONLY for `observePair`, `discover`, and `apply`. Its own A* `plan()` path is deliberately disabled in heldout tests. The **only actual goal propagation/path operator** is the original `Discoverer.shape()` from V17. Its `.97` decay, original random uphill sampling and threshold checks are unchanged.

## Reproduced RED → GREEN (no fabricated metrics)

Original V23 long-doc RED: [run 42341046064](https://github.com/dan3s2020/MagicPerspective/actions/runs/42341046064), 3 failed tests because cognitive `buildWorld` rejected 2048-token states at 96. That same source also exposed 0.5 default conductance extinguishing 144-step already VERIFIED paths. The original V17 maze remained unchanged.

**V24 fixed**, bounded and opt-in:
- `LearnedCognitiveMap({maxStateTokens:2048})`, original default 96 preserved, hard upper bound 4096. Long input does not implicitly expand memory for normal live corpora.
- `formSolution(...,{trustedObservedActions:true})` admits high conductance *only if every generated graph edge comes from accepted, noncontradictory causal action observations*. Such projections are **hypotheses**, not verified test-state transitions. The independent environment must validate their effects. The `Discoverer.shape` implementation is NOT modified.

Verified GREEN workflow: [run 42341683874](https://github.com/dan3s2020/MagicPerspective/actions/runs/42341683874), exact tested commit `d9c2f925b66a6725867c35c87e20b107d9e6e98d`, job `128310527157`.

**First-order long-state results**:
- 84/84 original maze retinal parity comparisons, 42 seeded random/noise cases;
- 144/144 and 511/511 original field transitions on accepted observed text-state graphs;
- **48/48** complete pre-action action-path steps over one **2048-token** novel document, independently executed, exact final whole-state equality;
- missing action, contradictory observations and unsupported target fail, rather than inventing a route;
- all 8 V23 original long-state tests PASS, as well as 6 V22 exact original and 19 cognitive map regression tests.

## Newly integrated prior numerical causal discovery into SAME original shape law

`v17/research/goal-path-field/native-math-graph.mjs` reads complete text documents as states, detects a single observed mathematical clause through the **existing** observation tokenizer, and constructs a bounded action graph from observed local state-dependent transformations. It uses an optional capped CPU graph, checks target coordinates *without supplying the dependent numeric answer*, and runs **the exact original V17 Discoverer.shape** to predict a complete series of actions BEFORE execution. Original punctuation and all surrounding document bytes are retained on emitted output. The ACTUAL environment callback only receives the pre-action state and action, never the predicted answer.

Training data: six **observed** paired arithmetic statements, e.g. `2 * 3 = 6.` → `3 * 3 = 9.`, covering two independently varying inputs. The learner's inductive bias is numeric-affine local finite differences with state-dependent slopes; a human has NOT provided a multiplication algorithm to the learner. In the test, the *independent evaluator* implements the true multiplication physics, never passed to the learner.

**Heldout tests (16 unobserved contextual documents):** 4 different first input goals × 4 different second input goals, each with a unique, unseen surrounding document of **2,057 tokens** and an unseen full answer. ALL 16 produced the exact complete result **before the first output**, and independently applied each learned action matched the true physical world. Measured raw CI log:

```json
{
  "tasks": 16,
  "correct": 16,
  "exactFullAnswerRate": 1,
  "inputTokensPerTask": "2050+",
  "averageLearnedActionSteps": 7,
  "averageExploredGraphStates": 447,
  "averageFullTextStateTokens": 2057,
  "verifiedFullAnswerCharacters": 866256,
  "originalMethod": "Discoverer.shape",
  "referenceAnswerExposedToPlanner": false,
  "actualPhysicsIndependent": true
}
```

**5/5** independent new tests PASS, covering byte-identical source copies, causal ablation (destroyed learned rules → NO SOLUTION), invalid unknown dependent-goal constraint, unrelated prose abstention, contradictory independent physics → recorded FAILURE and deterministic reproducible noise/temperature.

Original native V19 actual HTTP heldout composition and V21 text-migration checkpoint, observed action, source check, original UI syntax **ALL PASS** in the SAME CI run. The existing 2D original maze predictor and Brain save code are untouched.

## What 100% applies to — and critical BLOCKERS

These 16 exact successes are on a **specified, observed arithmetic grammar** with learned affine numeric movement; the complete document includes thousands of arbitrary *unchanged* surrounding tokens. The test conclusively checks the **entire long output string** and each independent action, not next-character accuracy. It does NOT demonstrate open-ended semantic creation of thousands of words, arbitrary unseen OpenThoughts3 answers, or general language understanding; readers must not conflate preserved context with generated reasoning.

The local graph uses arithmetic clause transitions. Its exposed full documents are real token-array states, but the actual learned active movement axes in this experiment are 2 independent numeric coordinates plus one dependent coordinate. It is **not** a discovered 2,057-dimensional semantic language manifold. Noise is original actor's seeded route sampling, not a proven universally helpful endogenous chaotic field.

The code is isolated research and the current V17 native free-answer writer remains AligningGraph: this success does **not** yet mean the motor controls native Q/A answer output, trains on user OpenThoughts3 or uses RTX 3050 Ti CUDA. The current CI is a Linux CPU environment, not GPU verification. UI rendering for this newly learned maths path is not yet part of the working V17 user console; original controls are preserved. A new source-to-change contract and additional true integration tests are required before enabling production.

**Release policy stays BLOCKED / DO NOT ISSUE LAUNCH COMMAND** until actual frozen full-answer OpenThoughts3 tasks, general real learned action/goal semantics, one native Brain I/O loop, actual CUDA throughput and live original UI all meet the user's exact criteria with reproducible evidence. No false 100% claim and no removal of failed evidence.
