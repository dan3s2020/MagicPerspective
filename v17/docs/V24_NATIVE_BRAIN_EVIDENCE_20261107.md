# MagicPerspective V24 — real native V17 Brain integration with original frozen hyperpaths

**Date:** 2026-11-07  
**Branch:** `experiment/V24-NATIVE-BRAIN-V23-GROUNDED-HYPERPATH-20261107`  
**Status:** **VERIFIED NATIVE RESEARCH INTEGRATION; FULL RELEASE BLOCKED**.

## 1. The current instruction and exact boundary

The user demands the **original maze organism’s `Discoverer.shape()`** extended to genuine text-as-hyperdimensional action navigation, whole correct unseen answers from the FIRST attempt, training on large real texts, visible per-step learned shapes and actual actions, original native one Brain/graph, untouched GPU/UI/checkpoints, and real internal proof before claiming completion. A token/character predictor is NOT an acceptable substituted solution.

V24 integrates only the **previously proven structured causal-text and learned numerical-action components**, without overwriting the original writer, old UI controls or the V17 original `Discoverer.shape()`. It does NOT declare the full user goal achieved.

## 2. What was actually changed

V24 was created from the proven isolated V23 head `59be1fe226eaaf117145e6a9ee27059649652066`; its GitHub commit comparison shows ONLY ADDITIONS in existing source files (no deletions).

- `devour/worker.mjs`: one import and an opt-in `v23Lab` message handler, calling the existing **same native Brain** and saving reported training observations into the native checkpoint. Existing controls/learning loops, GPU backend and `AligningGraph` remain untouched.
- `devour/devour.mjs`: opt-in `POST /v23-lab` real HTTP handler, routes to actual worker, supports saved-original-Brain frozen evaluation after worker exit, explicit error on expired in-memory pages.
- `devour/v23-lab-adapter.mjs` (previous V23): original `Brain.v23Numeric` and `Brain.v23Temporal` checkpoint fields, trained from explicit *observed* before/action/after (no invented oracle), frozen `Discoverer.shape()` run, SHA256 of whole route, 100-step pagination, read-only planning, no character predictor. `WeakMap` for live frozen plan pages.
- `ui/index.html`: appended standalone research panel, retaining **every existing UI element and script**. New controls: numeric/temporal observed-action training, full document/question, noise/seed, original field summary, path canvas, pagination, frozen cursor animation.
- `ui/v23-grounded-live.js`: renders only **actual returned frozen route** and numeric field summaries. Clearly labels the cursor as a *proposed* action; it is **NOT** an animation of physical steps already executed.
- `v17/tests/v24-native-brain-v23-http.test.mjs` and `.github/workflows/v24-native-v23-lab.yml`: real native process + original checkpoint integration, old regressions.

Original source NOT changed: `worlds/exercise.mjs`, frozen original V17 baseline, `devour/brain.mjs`, `gpu/text_gpu.py`, V21 Windows launcher, existing external models and checkpoints.

## 3. Full reproducible native CI evidence

**[GitHub Actions run #42342970743](https://github.com/dan3s2020/MagicPerspective/actions/runs/42342970743)** — **39/39 tests passed across six suite groups; no failures**, on GitHub-hosted Ubuntu Node.js 22. Parent V23 separate independent proof: [#42342352414](https://github.com/dan3s2020/MagicPerspective/actions/runs/42342352414).

**Native server/worker test** used `node v17/transcend/torus-aether/devour/devour.mjs` as a REAL child process with a real text corpus and a real `cognitivemap` world. It learned at least 25 full complete documents through the unchanged original V19 path. In this cognitive-only mode, old character learner `graph.chars=0` (correctly not misreported as the new solution-shape trainer).

Then `POST /v23-lab` trained 36 externally witnessed/explicit original samples (24 independent before/action/after numeric samples plus 6 initial-state and 6 question observations). These became one verified numeric action law, persisted inside the actual native `brain-0-stable+many.v8`. The native HTTP planner froze a 384-action route **before movement**, predicted answer `13924`, and returned its full-path SHA256, actual original method name, and paginated traced states. An independent repeated call after checkpoint restore returned the same answer, and the learned checkpoint object was unchanged.

**NEW STRESS PROOF in actual native HTTP/Brain:** send an untrimmed **4,800,055-character** text with **100,000** observed textual numerical action descriptions through `POST /v23-lab`. The question asks the final balance of an entity and does **NOT** include the answer. The answer's exact literal `1212341` is also absent from the input document. The native original method returned the full frozen plan and answer `1212341` **before any physical action**, using **790 calls** to `Discoverer.shape()`, no more than **129 nodes per scalar field**, with 100-step pagination. Checkpoint stayed **byte-equivalent in its V23 numeric learned-state object** before/after planning.

IMPORTANT: Original V23 separate test has **100,000 independent physics action comparisons** confirming its learned numerical solution-shape output. The V24 native HTTP test verifies frozen planning and native checkpoint but does NOT actually execute 100k actions through this HTTP API; no such physical-live claim is made.

Old V17, V19, V21, V22, V23 regression suites all passed in the same CI run. The UI test checks preserved original element IDs and JavaScript parse; it is NOT a real browser screenshot/pixel acceptance.

## 4. Why the full acceptance gate remains BLOCKED

The new sources are genuine, causally needed **for the observed numeric/temporal structured test problems**. However:
1. Unrestricted user question answering in original V17 `Brain` still goes through original `AligningGraph` (next-character/byte objective). V23 is an **opt-in alternative research answer path**, not yet the driver of native unconstrained Q/A generation.
2. Its grammar templates require independently witnessed training examples and its numerical law basis `[x,q,x*q,1]` is explicitly hand-selected. This is **NOT** universal self-discovery of all unknown linguistic/scientific dimensions or nonlinear physics.
3. No independent real heldout OpenThoughts3 long-answer score; no verified 100% real natural-language full-response accuracy.
4. No original RTX 3050Ti end-to-end CUDA verification for V23, no sustained 100 finished long documents/s, and no performance/hardware heat measurements.
5. UI visualization projects temporal structure into 2D and shows a proposed *frozen* path; native live physical execution, real-time correction and stochastic branching from unknown semantics are not yet integrated.
6. Full historical verbatim archives contain known missing data; no claim of preserving unavailable bytes.
7. No original user checkpoint or working branch was reset or overwritten; the separate V24 branch is isolated and NOT merged into `main`.

**Do not mark original regression Issue #25 resolved or issue a final production launch command from this partial integration.**

Machine-readable SHA paths and independently observed numbers: `v17/docs/V24_NATIVE_BRAIN_EVIDENCE_20261107.json`.

## 5. Next acceptance experiment (explicitly NOT claimed finished)

On the same original V17 native Brain and original UI, train a language-world contextual self/action/effect graph from real OpenThoughts3 nonheldout tasks (not existing answer prefixes), freeze a full answer *shape* before emitting a byte, choose each answer-producing step via learned graph (not old writer), apply independent semantic/physical feedback and replan, compare with strong heldout baselines and causal ablations, instrument live visual animation with ACTUAL not hypothetical movement, and benchmark all-GPU performance on target Windows RTX card. Do not merge before measured evidence.
