# V24 — Grounded variable-position text actions, original V17 shape, no semantic release

**Date:** 2026-11-07  
**Isolated branch:** `experiment/V24-LEARNED-ANCHOR-TRANSFER-20261107`  
**Parent:** V23 commit `bbe4cc41d8afb6d9b993077c8e4efd81cf4f6e9d`  
**Status:** experimentally verified on constrained symbolic word-edit physics; **OPEN BLOCKING** on general language semantics, actual native answer writing, user CUDA and throughput.

## User requirement / preservation

Continue the user's exact-original-`Discoverer.shape()` hyperdimensional language-maze research and document both failed and successful tests; preserve all native V17 maze physics, RNG, original UI controls, actual CUDA path and Brain checkpoint format; never swap the original shape for a different planner, fake action success, hide an answer in the target, or merge an unverified experiment.

Source contract: `user-intent/changes/V24-LEARNED-ANCHOR-TRANSFER-20261107.json`.

The only modified existing runtime implementation is `v17/transcend/torus-aether/worlds/learned-cognitive-map.mjs`. `exercise.mjs`, its immutable baseline, `devour.mjs`, `worker.mjs`, V23 UI, original training source and launchers are untouched on this branch. New V24 files only add tests, CI, docs and a draft PR.

## Discovery: the text graph incorrectly binds the location rather than the observed action

V23 represented each accepted local text change as a `span` rule with an **absolute training offset** `r.at`. A second observation of the exact same accepted action's identical `from → to` change at another offset marked the rule ambiguous—even when there was a single, independently observed source token in both worlds. Thus a valid learned operation at position 1 did not transfer to position 1,007 of an unseen long text.

### Falsifying test (RED BEFORE SOURCE CHANGE)

https://github.com/dan3s2020/MagicPerspective/actions/runs/42342932588

`node --test v17/tests/v24-learned-anchor-transfer.test.mjs` produced **1/5 pass, 4/5 fail**. The failed tests specifically required cross-position binding, multi-step path, checkpoint restoration, and ambiguity refusal; fixed-offset-only learning was already green.

## Minimal grounded repair

1. Keep the original `span` rule with its trained `at` until independent evidence proves a change of position.
2. If the **same named action** has actually succeeded with the **same nonempty contiguous source** and the **same resulting replacement** at **two different positions**, and the source was unique in each of the independently observed input states, set `positionMode:'unique-anchor'`. Keep both supporting observed indices in the serialized rule.
3. On new unseen text, find a **single unique** occurrence of that exact learned input span. Bind the observed local operator to that occurrence; if the span is missing or repeated, **abstain** instead of choosing a plausible-looking path.
4. If an identical action's observed effect contradicts the rule, mark it ambiguous and forbid extrapolation. No action is considered semantically true on an untested context; the independent physical `execute({step})` callback determines actual correctness and records disagreements.
5. Preserve original fixed-offset operations when there is only one observation, including fixed-offset insertion and repeated tokens. These are not entitled to anchor generalization, but remain usable exactly as before.
6. Pass the learned directed adjacency to the same `Discoverer.shape()` function from `exercise.mjs`. The original 0.97 attraction law and the 2D maze parity tests remain untouched.

## Measured positive and negative controls

**GREEN pre-existing full workflow before adding native integration:**
https://github.com/dan3s2020/MagicPerspective/actions/runs/42343037748 — both native Linux `observed-hyperpath` and PowerShell 5.1 original-launcher jobs successful. Includes new 5/5 V24 tests, original 84-board 2D parity, V23 long-path/noise tests, existing V19 and V21 suites and native V23 HTTP.

**GREEN full native V24 integration workflow:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42343184435 — both original launcher Windows and Linux native jobs completed successfully, including **6/6 V24 anchor and preservation tests**, original V23, V19, V21 and native end-to-end HTTP.

In direct V24 test, six independently accepted short-training action observations for `A→B`, `B→C`, `C→D` were enough to:
- Transfer all three transformations to a never-before-seen **2,048-token** complete state at position **1,007**, with no complete target state supplied to the planner.
- Produce a **three-action frozen complete route** using the exact original `Discoverer.shape` **before the first action**.
- Independently execute every action through a physics callback that does **not** read the predicted text to generate a correct result; obtain **3/3 accepted and matching** transformations and **2,048/2,048 final output tokens** exactly correct in this constrained synthetic environment.
- Prove a single-offset training observation does **not** authorize relocation, two matching words cause **abstention**, a contradictory outcome disables the action, and deleting the intermediate rule removes the path.
- Prove that the inferred anchor survives `LearnedCognitiveMap.export/restore` without modifying checkpoint schema; original fixed-position repeated-anchor/insertion behavior is still covered by an added backwards-compatibility test.
- New `v17/tests/v24-native-anchor-http.test.mjs` starts the **real original V17 server** with a persisted native `Brain` checkpoint, calls `POST /cognitive-eval` on the novel long text and verifies that a duplicate anchor is rejected. This is a real local-process integration test, not a browser mock.

The baseline native V23 HTTP test stays intact. **No 100% CUDA or user hardware run was performed here**: hosted Actions runs use CPU/GitHub runners.

## Scientifically unresolved and release blockers

- Current exact anchor matching and checkable `goal.slots` are **not semantic grounding**. The request supplies a **desired output marker** in one slot. The complete 2,048-token answer is not supplied, but the success predicate still encodes part of the target. No proof of goal acquisition from natural instructions, unknown natural-language answer inference, paraphrases, compositional semantics, or correct long-form OpenThoughts3 answers.
- Native frozen cognitive route generation and native free-running `AligningGraph.write` Q/A output remain separate; this V24 experiment does **not** demonstrate that a field path causally generates a previously unseen natural-language answer in the original training system.
- GPU offload for the learned cognitive map, live per-action execution via the native UI, 100+ whole exercises/s, MB text/s, nonstalling continual training, and full user Windows GPU acceptance are unproved.
- Synthetic accuracy is **not** a 70–100% open-ended language success rate. There is no Nobel-level breakthrough claim.
- `main` and branch V23 are unchanged. Issue #25 remains OPEN and blocking; the V24 branch is draft-only and must not be called a tested release.

## Reproduction commands for CI (not a user-ready production startup command)

```bash
node --test v17/tests/v24-learned-anchor-transfer.test.mjs
node --test v17/tests/v24-native-anchor-http.test.mjs
node --test v17/tests/v23-observed-hyperpath-long-range.test.mjs
node --test v17/tests/torus-cognitive-learned-map.test.mjs
```

These test commands run only in a checkout of the V24 isolated branch. They are not the final launch command for full training. Full proof requires heldout real semantic Q/A and a causal measured link from its original V17 field to real output, with hardware/UI/throughput checks.

## Blind native natural-language baseline and causal disconnection — critical negative result

**Completed, all tests GREEN but scientific objective FAILS:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42343384673 . Two jobs succeeded, including original Windows launcher parser, all 6 V24 anchor regressions, original 2D/long-path/V19/V21/native HTTP tests and the new real blind language test.

**Source:** `v17/tests/v24-blind-natural-qa-native-audit.test.mjs`. This is a genuine output accuracy audit, not a symbolic transition score. It trains the unchanged native `Brain.live` and `AligningGraph` on **72 human-readable capital-city Q/A exercises** (**3,480 learned native bytes**), evaluates **12 new phrasings** of the same known factual associations using `Brain.chat(..., {learn:false, T:0})`, compares the unseen answers **only after free generation**, and records full-answer exact and per-character match.

**Observed GitHub-hosted metrics, from explicit `V24_REAL_NATURAL_QA_BLIND_AUDIT` log line:**
- **0 / 12 whole answers exactly correct = 0.0%**.
- **Mean character-at-position accuracy = 0.03356481481481482 = 3.356481481%**.
- **0 / 12 exact** on the previously trained question phrasing, despite repeated Q/A text; the model frequently emits `Which ci` or `Whic` when asked for a city answer.
- **Causal ablation:** holding question, native Brain and RNG seed constant, attaching a trained `cognitiveMap` that demonstrably predicts a 2-step exact-original-`Discoverer.shape()` text path, then removing that map, produces **identical native `Brain.chat` answer bytes**. The native writer currently calls `AligningGraph.write` and **does not consult that cognitive plan**.
- Frozen evaluation left the native alignment memory byte count unchanged; held-out answers were never fed into the writer during scoring.

**Interpretation:** We have found and measured the current architectural break. A connected, correct pre-action symbolic shape **does not cause** native natural-language writing. It is scientifically invalid to advertise the synthetic 100% as unseen text Q/A ability, or to claim the requested 70% threshold has been achieved. Code changes so far only fix symbol-to-position action transfer; they do **not** solve semantic grounding, language-goal acquisition, or writer integration.

**Separate positive real HTTP result:** `V24_NATIVE_ANCHOR_HTTP` in the same workflow: genuine V17 server with persisted original Brain checkpoint, **2048-token unseen text**, **position 1007**, **three original `Discoverer.shape` actions**, `shapeField[0]=0.912673`, exact 2048-token output of the **symbolic** operation, and rejected duplicate source binding. Original V17 GUI remains present. Original maze and write method unchanged.

**Next research gate, not claimed complete:** identify an executable, independently verifiable language-world action vocabulary and an answer-free terminal predicate learned from outcomes; make native writing consume actual field actions and observed execution deltas; measure full-answer first-attempt heldout natural-language accuracy under ablation, before promoting any training command or merging. The present natural audit is a negative baseline against which those changes must be evaluated.
