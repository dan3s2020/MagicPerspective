# V27 — learned 4D textual topology + inferred document goal + EXACT original Discoverer.shape

**Date:** 2026-11-07  
**Branch:** `experiment/V27-LEARNED-4D-GOAL-ORIGINAL-SHAPE-20261107`  
**Parent:** `experiment/V17-GROUNDED-4D-TEXT-GOAL-BRAIN-20261107`, commit `aea578453b25cb4763cf641383d76576b2d2d02d`.  
**Status:** TESTED RESEARCH / NOT 70–100% OPEN-ENDED SEMANTIC QA / NO MERGE / NO PRODUCTION LAUNCH.

## Exact preserved original and design boundary

- An immutable byte-for-byte source snapshot **before V27** was added to `v17/transcend/torus-aether/worlds/exercise-v27-PR62-IMMUTABLE-SNAPSHOT.mjs` from original PR62 source blob SHA **`36ab59ada59b28b56b7c0c8bef4d5e6d7460dcd2`**. It is not used as the new path planner, only for regression parity.
- Existing `Discoverer.shape()` in `worlds/exercise.mjs` received **only the already implemented/tested V22 optional topology argument**, copied from `experiment/V22-EXACT-DISCOVERER-TEXT-LABYRINTH-20261107`; maze-mode stays its original state. Existing original NoiseAgency maze action and all other source are untouched.
- **84/84 seeded unchanged 2D retinas** exactly matched the saved PR62 original including temperature/noise on half the cases.
- Native `Brain` remains the original organism. Added only opt-in `observeGoalReferenceOutcome` and `predictOriginal4DShapeFromQuestion` methods. It still owns its existing `TextWorldNavigator` trained on **640 observed physical action results, 8,000 labeled lexical statements, and 8,000 source-reliability observations**, and stores extra V27 goal-reference counters as a plain versioned field in the original `.v8` checkpoint. Native 2D maze, GPU TextCard, old open-ended writer, NoiseAgency, source checkpoints, graph and UI remain untouched.
- New isolated module: `v17/transcend/torus-aether/worlds/goal-text-original-shape-bridge.mjs`.
- Added tests: `v17/tests/v27-original-4d-text-target-discovery.test.mjs`.
- Acceptance: `.github/workflows/v27-original-shape-learned-text-goal.yml`.
- Binding user change contract: `user-intent/changes/V27-ORIGINAL-SHAPE-LEARNED-TEXT-GOAL-20261107.json`.

## How the **actual new** navigation works, before the first physical move

1. **Axes**: the existing native V17 `TextWorldNavigator.observeAction(before, action, after)` accumulates actually observed state changes for eight previously unmapped output verbs and estimates their relative 4-coordinate effects. A proposed edge requires **four observed outcomes** and dominant effect support **at least 60%**; no true hidden physics or reference route enters the planner. Less-supported or missing actions are absent, not magically known.
2. **World and walls**: native `TextWorldNavigator.reconstruct(document)` reads source-stamped 4D state claims using its learned lexical passability classifier and learned source reliability. In this artificial 4-coordinate ontology it marks each of 256 candidate states passable/blocked. Each directed neighbor is generated from the **learned action delta**, and it is connected only when the modeled destination is passable.
3. **Question and goal**: a new `LearnedTargetReference` learns from previously **labeled** question/reference outcomes which distinct textual reference is associated with a successful goal; it does NOT receive the hidden target ID or reference answer at evaluation. The inferred target ID comes only from a matching coordinate claim **contained inside the input document**. Because the first red attempt chose **569 false candidates** from generic words, V27 also uses complete-document rarity/uniqueness weighting; absent and multiply matching reference mentions are rejected.
4. **Semantic negative references**: a separate red case proved a negative declaration about the same entity could masquerade as a valid goal. After multiple observed counterexamples the model learns negative-specific statement vocabulary from feedback and rejects those prior-observed negative cues. The source does **not** hardcode the word `denies`; unseen negation/paraphrases remain a limitation.
5. **Same field and policy**: construct `retina` with `KIND.floor/wall/self/target`, supply the learned directed `neighbors` as the optional topology, and call the **real native** `Discoverer.shape(retina,0,start,topology)`. It propagates attraction via **0.97 conductance** and extracts the **entire ascending path** before action. No BFS, teacher-forced answer, next-token planner or hidden reference path is used in the V27 route.
6. **Loops**: modulo-4 axes permit observed inverse action pairs. A 4D torus loop is an actual cycle of the learned state transition graph; it is not evidence of four physical spacetime dimensions. A proposed loop is blocked where a source-derived wall excludes its edge.
7. **Noise and corrections**: after a frozen route is predicted, a separate independent physical simulator applies 25% unpredictable action slips. It returns the actual new position. With feedback, the ORIGINAL `Discoverer.shape` runs again from that measured state; the future slip sequence is not available to the planner.

## Failures recorded FIRST (RED)

- Initial missing new method: https://github.com/dan3s2020/MagicPerspective/actions/runs/42347456723 .
- Initial target classification failed with **569 competing goal candidates** from generic query/document words, preventing 4D planning: https://github.com/dan3s2020/MagicPerspective/actions/runs/42347559498 .
- Same-reference negative target claim not understood before feedback-based cue filter: https://github.com/dan3s2020/MagicPerspective/actions/runs/42347956583 .
- These failures remain published and were not re-described as passing results.

## Successful measured native end-to-end structured-text tests

**Fully passing 10-test source+negative-OOD run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42348053606 . Historical native 4D learner regression **6/6**, original Brain baseline **1/1**, original noise **3/3**, UI syntax checks all passed in the same run. Actual new source tests **10/10 PASS**. Source log labels: `V27_ORIGINAL_4D_TEXT_GOAL`, `V27_ORIGINAL_ATTRACTION_REPLAN`, `V27_OBSERVED_TORUS_LOOPS`, `V27_TEXT_OOD_ABLATION`.

| Measurement | Actual result |
| --- | ---: |
| Different 4D heldout worlds; goal not supplied as a function parameter | **24** |
| Original `Discoverer.shape()` full preaction paths, physically correct on first attempt | **24/24** |
| Exact independently verified shortest path length | **24/24** |
| With 2 of 4 movement axes exposed | **0/24** |
| Heldout document characters read in 24 evaluation worlds | **2,869,189** |
| Independently learned opposite action pairs (ordered) | **8** |
| Traversable two-action return loops demonstrated | **1,200** |
| Opposite-action candidates blocked by learned walls | **368** |
| Unpredictable-slip worlds with only initial frozen shape | **0/16** |
| Same stochastic worlds with original shape recomputed after physical feedback | **16/16** |
| Physical slips actually observed during adaptive run | **45** |
| OOD baseline with original known source/vocabulary | **16/16** |
| OOD source that changes its lying rate | **5/16** |
| OOD unknown passability vocabulary | **0/16** |

Every physical move in the tests was independently executed by `perform` from `grounded-4d-benchmark.mjs`; the planner never reads that function or the hidden simulator's wall array. The independent oracle shortest path appears only in the TEST for scoring, after the prediction. Model and goal-reference evidence fingerprints are checked to remain frozen across evaluation. Native Brain save/load restores the learned source/action model, the V27 goal-reference evidence, the original deterministic field, and existing GPU/maze methods.

## Scientific limitations and non-negotiable next gates

1. The **4D state ontology, coordinate-tuple format, action vocabulary, source names, and labeled passability training** come from a deliberately structured procedural environment. Axes are learned as action effects **inside that given ontology**, not discovered from arbitrary language. It is **not** evidence for literal extra physical dimensions or String Theory.
2. Goal location is not passed as an input argument, but **the target position is explicitly described somewhere in the document in the known coordinate format**; a limited supervised overlap model picks the relevant claim. Training still needs **explicit `isGoal` labeled prior feedback** and the note's coordinate syntax. There is no demonstration of autonomous intent understanding or previously unseen semantic ontology.
3. Unseen reliability shift (5/16) and unseen lexical claims (0/16) **falsify universal generalization**. The correct original 0.97 attraction cannot repair a wrong inferred world or a false goal. Even confirmed repeated action effects can change in an out-of-distribution environment.
4. This newly tested native Brain method is **opt-in research API**, **not yet connected to original unconstrained `Brain.chat`/`AligningGraph.write` answer production**, and does NOT convert free-form OpenThoughts3/1.2M to the learned 4D supervised fact grammar. Previous honest V24 blind natural-language baseline was **0/12** full-answer exact, so 24/24 synthetic navigation is NOT 70–100% general semantic answers.
5. The native original UI, CUDA text trainer, original V17 graph controls and checkpoint files are preserved, **not newly wired to real V27 pre-action feedback visualization or measured entirely on RTX 3050 Ti**. Hosted GitHub CI has no validation of 4GB VRAM sustained CUDA throughput, real GUI pixel rendering, huge OpenThoughts corpus or 100 exercises/sec.
6. Actual per-action long-form native language answer trace, meaning-preserving transforms beyond four-digit coordinates, sense-aware wall discovery, autonomous task goals from arbitrary questions, and real hardware acceptance are still **OPEN/BLOCKING**. Original issue #25 remains OPEN. Do not merge or provide a production-complete startup command.

### Reproduce the bounded test

On the **V27 experimental branch** under a standard Node.js 22 checkout (not a production training command):

```bash
node --test v17/tests/v27-original-4d-text-target-discovery.test.mjs
```

The full GitHub workflow separately runs the historical native Brain, NoiseAgency and learned 4D regressions. This is a real measured component integration, **not the finished universal MagicPerspective model**.
