# MagicPerspective V25 — falsifying a perfect path through an incomplete learned world

**Date:** 2026-11-07  
**Isolated branch:** `experiment/V25-UNKNOWN-CAUSAL-EVENT-ABSTENTION-20261107`  
**Status:** **EVIDENCE-BACKED CORRECTNESS FIX, NOT UNIVERSAL NATURAL-LANGUAGE SOLUTION**.

## 1. Actual new falsification (must never be hidden)

Original V23/V24 native structured text planner could report a first-shot complete path through a **partial** learned world. In an independently measured test, an account had 10 units, received 2, **donated 5** in a sentence using an unlearned action grammar, then received 3. The learner silently discarded the donation and confidently predicted **15**. The independent actual arithmetic world says **10**.

This is a REAL, reproducible failure, not an incorrect path search through a fully represented topology. The missing source/effect changes the physical world itself. The original `Discoverer.shape` is functioning correctly on its *provided* partial graph; but a structurally excellent path cannot certify a correct answer if the input's relevant action semantics were ignored.

Separate temporal example: an object is carried A→B, then an unknown **teleportation B→Z** is mentioned, then an old known **B→C** occurs. Old model returns C despite an unresolved causal discontinuity. V25 refuses this plan, instead of claiming 100%.

## 2. Scientific repair: observed causal completeness check

**No edits to V17/V22 original Discoverer or native old generator.** New additive `observed-no-effect-gate.mjs` takes the same witnessed model and checks **every literal mention of the queried entity**. A recognized trained effect is allowed. An unknown entity-relevant sentence causes:

`{found:false,reason:"UNKNOWN_RELEVANT_SENTENCE",plannedBeforeAction:true}`

If a sentence appears to describe a **no-state-change event**, it can be ignored ONLY after multiple independent user/experiment-reported before/after observations with unchanged physical state. The neutral learner groups witnessed complete sentences by word length/role location, preserves observed constant tokens, permits variable positions only where they differed across experiences, and requires at least four independent samples, three different entities and eight stable anchor tokens. In controlled CI, 8 no-effect observations induced one grammar template. A previously unseen neutral sentence in the same pattern no longer blocks a physically valid route.

The gate conservatively flags a subset of sentence-initial pronouns (it/they/he/she/this/that) as potential unresolved coreference events rather than silently dropping them. **This is not general entity resolution or proof of all unknown world effects.** Unrecognized actors and more complex anaphora remain a hard limitation. No actual answer is supplied by the gate.

The old original V23/V24 research engine stays untouched for baseline A/B: the strict mode is an opt-in evidence test, not an unauthorized replacement.

## 3. Same original native V17 Brain and UI

- Added `v25-strict-adapter.mjs` to invoke existing `runV23Lab` **only after** the completeness audit passes; no other solution-shape operator introduced.
- Same original `Brain` stores `v23Numeric`/`v23Temporal` plus independent `v25NeutralEvidence` in the original V17 `brain-0-stable+many.v8` checkpoint.
- Original `devour/worker.mjs` and `devour/devour.mjs` received only ADDITIVE handlers, accessible through `POST /v25-strict` `teach-neutral / audit / plan / page`.
- Original V17 UI retains its old buttons, tabs, graph, GPU controls. Adds a V25 strict-completeness panel with actual unknown sentence reports and witnessed no-effect sample input. If strict planning passes, V23's original shape canvas displays **only the returned frozen path**. Never fabricate observed movement frames.

## 4. Independent reproducible actual CI

**[GitHub Actions #42343645683](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343645683)**, Node 22 on Ubuntu: **44/44 tests passed**, covering:

- 5 V25 adversarial and evidence tests: reproduce original wrong 15 vs 10, unknown teleportation, suspicious anaphora, learned neutral grammar, known-plan recovery, model/checkpoint preservation.
- 1 real V25 native HTTP test: original worker ingests real complete documents in cognitive world; `POST /v23-lab` learns witnessed numeric actions; `POST /v25-strict` rejects wrong **15 vs independent 10** BEFORE ANY action; after 8 independently reported no-effect experiences, original `Discoverer.shape` constructs a safe known-effect 2-action route with answer 15; previously unrecognized pronoun rejected; both models persisted in original `Brain`; old UI controls checked.
- 1 independent V24 real HTTP test still passes: complete frozen 100,000-action numeric unknown-answer path across 4,800,055 input characters, original scalar shape called 790 times, 129 max nodes per local scale, computed final `1212341`, saved model unchanged.
- 10 original V23 100k action tests, 27 old V17/V19/V21/V22 regressions.

**Earlier red run [#42343471702](https://github.com/dan3s2020/MagicPerspective/actions/runs/42343471702)** was a transient **20-second native V24 HTTP training request timeout**, not a green result. This must remain visible as possible stall/flakiness. Later full runs including exact original test passed. Do NOT claim no possible runtime stalls; the user's 1.2M data may have different performance.

## 5. Critical OPEN acceptance requirements

- **The system does not know unknown action physics** merely because the gate abstained. It is a correct *uncertainty detector* in the controlled syntax, not universal natural-language inference.
- The 44/44 are software integrity/falsification tests; the earlier 300/300 numerically successful **structured** answers are not independent OpenThoughts3 long-form semantic Q/A.
- The existing V17 `Brain` unconstrained answer writer still uses the original AligningGraph next-symbol path. V25 evidence gate and original `Discoverer.shape` drive only the explicitly selected causal-text research worlds, not the native universal answer production.
- No live physical 100k-step execution **inside HTTP UI**, browser pixel acceptance, genuine 5D physical learned geometry/Noise Space navigation, real RTX3050Ti all-CUDA training or sustained 100 full real exercises/sec has been established.
- Original source full byte-archive Verbatim remains incomplete per mandatory GitHub provenance policy. Original user files, checkpoints and `main` were not overwritten.

**STOP-SHIP for full release; do not merge or provide a final production launcher, and do not close issue #25.**

Raw numeric proof, exact CI and limitations: `v17/docs/V25_UNKNOWN_CAUSAL_ABSTENTION_20261107.json`.
