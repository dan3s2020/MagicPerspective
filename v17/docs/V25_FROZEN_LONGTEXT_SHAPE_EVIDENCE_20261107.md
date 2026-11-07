# MagicPerspective V25 — frozen first solution shapes in unseen long text-state worlds

**Date:** 2026-11-07  
**Branch:** `experiment/V25-FROZEN-LONGTEXT-SHAPE-EVIDENCE-20261107`  
**Scientific status:** **CONSTRAINED POSITIVE / OPEN LANGUAGE-QA REQUIREMENT / NO FINAL RUN COMMAND**

## User requirement and safety of previous work

Exact new user message: `verbatim/2026-11-07-V25-70-PERCENT-SHAPE-USER-VERBATIM.txt`.  
Traceable change contract: `user-intent/changes/2026-11-07-V25-70-PERCENT-FROZEN-LONGTEXT-SHAPE.json`.

No production V17 files, original 2D code, main branch, old UI, TinyStories checkpoint, .v8/.npz weights, dataset or other agents' branches have been overwritten. New code is confined to:

- `v17/research/text-hypermaze/v25-observed-axis-world.mjs` — six-axis *observed-effect* world; directly calls the repository's **original** `Discoverer.shape()`.
- `v17/tests/v25-native-longtext-frozen-shape.test.mjs` — existing position-bound original V24 model, 120 frozen 1,024–2,048-token questions, independent action physics and ablations.
- `v17/tests/v25-shifted-longtext-observed-axis.test.mjs` — 120 tasks with shifted action coordinates, comparison against the same original position-bound model, independent action physics, negative controls and 84-board original 2D parity.

**Do not merge or call this a general-language release merely because these tests pass.** The fixed 70% target is demonstrated on the narrowly specified controlled test below, not on unknown open-ended OpenThoughts questions.

## What was actually learned and planned

1. Feed six genuine **before, opaque action, after, accepted=true** observations to a fresh world model. Each observation changes *one token*, and the action name does not say which token to change. No end-to-end target response is memorized.
2. The model discovers six local source→target effects and can apply an effect at **any unseen position only when the source token appears exactly once**. Repeated or contradictory sources fail closed. This **unique-token matching** is an explicit inductive bias and must not be misreported as autonomous semantic-axis discovery.
3. On a new long document state, enumerate reachable complete-string successor states through these learned action effects (up to 128 states; the observed experiment has 64). Six independent changes form a combinatorial **six-binary-axis action space**, not proof of a continuous six-dimensional physical geometry.
4. Receive **required target tokens as the explicit task goal**, analogous to the visible goal in the original complete-map 2D labyrinth. Crucially, neither the complete target answer nor the correct action order is an input.
5. Use **the actual `Discoverer.shape()` from `worlds/exercise.mjs`** over the observed learned state→action→state neighbors: identical 0.97 attraction attenuation, same relaxation, same wall-conductance threshold, uphill path decoding and optional seeded imagination noise. Compute the **entire path and the entire predicted terminal text before calling any external action**.
6. Execute each planned action in an **independent physical text-edit callback** that does *not* ask the learned predictor what the physics should do. Compare predicted successor vs actual successor; fail on disagreement. Do not train during frozen evaluation.
7. Score **exact complete initial terminal text** and **exact complete executed text**, not next-character accuracy, word F1, a displayed 5D diagram, or final-goal-token-only success.

## Source, split and measured results

Original code/data retrieved directly from GitHub on 2026-11-07:

| Source | Git blob SHA |
|---|---|
| `v17/transcend/torus-aether/worlds/exercise.mjs` | `739d6c5cc36e8d43b83dc66f499c5140aca414d3` |
| `v17/transcend/torus-aether/worlds/exercise-v17-IMMUTABLE-BASELINE.mjs` | `e34d787467b7238c7422a0509173b1f785eb2342` |
| `v17/transcend/torus-aether/worlds/learned-cognitive-map.mjs` | `ac9b3ed7e7ecc5f8eb1bbaa8b8f39d25caeb5438` |
| `v17/docs/TORUS_AETHER_ABC_20261104.md` | `faff3fae8dcbe6b020b920accb4a8df1c362f6d3` |

Corpus tokenization: Unicode words and underscores/hyphens; 8,437 tokens total. Training text positions **0..2047**, test source positions **4200..8199**, and unused gap **2048..4199**. The *same source document* supplies both ranges, which is weaker than independent unseen books. The actual six edited facts/target labels are added as **controlled synthetic action tasks**, not natural prose questions. Texts contain 1,024, 1,536 or 2,048 tokens. Unchanged context is copied faithfully, and only a few explicit goal tokens are changed. This is not a test of reasoning over all 2,048 tokens.

### Actual isolated JS execution, source loaded from GitHub (not an invented CI claim)

| Experiment | Actual measured result |
|---|---:|
| V24 original: six learned position-bound action effects, heldout fixed positions | **120/120** exact frozen full shapes and fully executed responses |
| V25 learned effect **reused at unseen positions**, same 120 tasks | **120/120** exact initial complete solution shape |
| V25 independent action execution | **120/120** exact complete responses |
| V25 correctly predicted/observed physical actions | **524/524** |
| V25 target-coordinate shifts versus training | **118/120** tasks |
| Original fixed-position action model, same shifted goal and text | **2/120** found plans (**1.67%**) |
| V25 no learned actions | **0/60** goal paths |
| V25 required action removed | **0/60** goal paths |
| V25 independent physical action meanings scrambled | **0/60** complete exact solutions |
| V25 repeated source token | **Abstains** (ambiguous body perspective) |
| V25 unseen target not reachable by any observed transformation | **Abstains** |
| V25 serialize/restore at same saved seed | **Same frozen path** |
| Current 2D maze `Discoverer.shape()` vs immutable original on varied retinas | **84/84** identical; 42 use nonzero noise |

Test seeds: V25 shifted `0..119`; original Discoverer noise seed `74129 + seed*7919`. Temperature 0.7 for every fourth task, 0 otherwise. The graph has up to 64 actually generated distinct string states and up to six independently learned action axes. Predicted initial paths have 1–6 steps; no character completion model is involved.

**Measurement environment:** source and test logic were executed in an isolated JavaScript V8 environment after fetching original GitHub source, with ESM import/export wrappers and standard assertion substitutes. Both committed test files are intended for `node --test`. This V8 execution is *not* a claim that GitHub Actions/Windows/CUDA has already run unless accompanied by a separately checked workflow result.

## Reproduce with the preserved test files

```powershell
node --test v17/tests/v25-native-longtext-frozen-shape.test.mjs v17/tests/v25-shifted-longtext-observed-axis.test.mjs
```

The tests print `V25_FROZEN_LONG_TEXT_ACTUAL_ORIGINAL_DISCOVERER`, `V25_CAUSAL_NEGATIVE_CONTROLS`, `V25_UNSEEN_SHIFTED_LONG_TEXT_MULTI_AXIS`, `V25_FAILURE_CONTROLS`, `V25_ORIGINAL_2D_PARITY`, including a real Node SHA-256 of the corpus. **No production or user checkpoint is written by these tests.**

## Failed hypotheses and limitations (do not omit)

- **Absolute-position rule as a transferable language path:** failed on shifted tokens; only **2/120** shifted problems reached the target with the V24 fixed-slot learner. This motivated the narrower position-invariant observed-effect extension, without replacing original `Discoverer.shape()`.
- **Untrained model solves a target by drawing a graph:** false (0/60).
- **An attractive drawing alone suffices:** false. Shuffling genuine action physics breaks execution (0/60).
- **A known word replacement locates a specific referent when the source appears twice:** false. The model deliberately abstains; it needs learned contextual identity/relations.
- **A six-axis binary action state space implies a learned continuous 5D/6D Noise Space:** false. This experiment uses discrete causal axes and native V17 seeded imagination noise; it does not prove autonomous geometric dimension discovery or superior endogenous noise performance.
- **General natural-language semantic Q/A, novel relations, long OpenThoughts first-answer >70%:** **NOT TESTED/NOT PROVEN**. This would require a frozen, externally graded corpus with answers unknown at planning, genuine document-dependent reasoning and independently derived goals. Existing goal words are given explicitly.
- **Full original V17 live UI, CUDA 3050 Ti training/inference, MB/s and saved original checkpoint migration:** **NOT TESTED** here. No user start command is justified by the positive controlled scores.

**Release gate: BLOCKED.** This is a real, reproducible *restricted text-state navigation* result and a measured difference against an earlier mechanism, not the final user-requested general language navigator.
