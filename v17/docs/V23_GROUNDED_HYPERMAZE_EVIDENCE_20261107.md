# V23: source-grounded first-action whole-answer navigation — evidence and strict limits

**Date:** 2026-11-07  
**Branch:** `experiment/V23-GROUNDED-TEMPORAL-PREACTION-SHAPE-20261107`  
**Status:** **STRUCTURED EXPERIMENT VERIFIED INTERN; FULL USER REQUIREMENT STILL BLOCKED**.

## Original algorithm, unchanged

This module imports `Discoverer` and `KIND` from the real V22 source `v17/transcend/torus-aether/worlds/exercise.mjs`. It invokes **the exact `Discoverer.shape()` method** on a new directed temporal state graph. No next-character/next-word neural predictor, encoder, decoder, SGD auxiliary score, semantic embedding, or pretrained model determines the output. The original V17/V22 maze source is not edited by V23.

The original recurrence (conductance 1 for observed passable states, terminal-time attractor 1) is used:

`V(s) = 0.97 * max_{observed outgoing action} V(next_state)`

`V(final_time)=1`. For a chain the ORIGINAL method returns all transformations from the starting holder to the final holder in a frozen complete path. **The target is “AFTER ALL OBSERVED EVENTS”, not a known answer token.** The answer is read from the reached state only after the complete path is formed.

The graph carries five observable relational coordinates: identity, holder, temporal event order, observed syntax, and evidence support. These are **not** proven autonomous physical 5D dimensions or the original Noise Space hypercube.

## What is learned vs what is provided

The training feed consists of 24 independently grounded complete action examples with observed before/item/after and 8 question examples. Event syntactic templates and variable role positions are **derived** from these observed triples; the algorithm was not supplied the English keywords “from”, “to”, or “carried” as parser instructions. The only fixed bias is literal token matching and a recurrent *state-change* model. The new 300 heldout documents use unseen item and place identifiers, event lengths, distractors and temporal chains. They use **the same three observed syntactic templates**. No heldout answer is placed in the query, in a `goal.slots` target, in the training actions, or in a preaction reference string.

The complete test text includes the succession of events; that is the observed world topology, analogous to an original maze's visible full map. It necessarily contains the factual location reached at the end — the purpose is to navigate it, not to hallucinate unknown events. This is NOT general unseen-world semantic understanding.

## Real internal execution

The exact source functions were executed in V8 against the unmodified GitHub V22 original `Discoverer.shape`. Initial implementation smoke: 300/300 exact heldout answers over 12,260,474 total input characters (maximum 8,296 tokens and 59 observed actions), and 0 failures.

After publishing the source, the executable test file was tested independently against the fetched V23 implementation and the original V22 `Discoverer`, also using a real dynamically evaluated V8 runtime:

- **300/300** independent long structured unseen temporal text worlds across three seeds (17, 55, 83), 11,237,882 cumulative input characters, 7,703 maximum tokens, maximum 59 action hops.
- **118,882 tokens** and **100 successive actions** in a further single long document; complete answer correct BEFORE execution and independently confirmed during sequential actions.
- Strict no-answer leakage in question; frozen model unchanged by planning; original method identified; independent world callback verifies every transition.
- Removing all action patterns → abstention; removing all learned question patterns → abstention; unsupported syntax ignored; incompatible event chain → abstention; an actual rejected environment action stops execution.
- Source JSON checkpoint round-trip equality.

The test family is deliberately **procedural**. Its 100% accuracy is NOT an empirical claim about 100% general OpenThoughts3 math, arbitrary human prose, unseen grammars, or full production V17 capability.

## Source/tests

- `v17/transcend/torus-aether/worlds/grounded-temporal-hypermaze.mjs`: original Discoverer causal event runner.
- `v17/tests/v23-grounded-temporal-hypermaze.test.mjs`: complete test generator, independent physics, holdout, 100k-token case, negative controls.
- `.github/workflows/v23-grounded-proof.yml`: executes the native test and original V22 regressions on Node 22.
- `v17/docs/V23_GROUNDED_HYPERMAZE_RESULTS_20261107.json`: machine-readable internal result + caveats.
- `user-intent/changes/V23-GROUNDED-TEMPORAL-PREACTION-SHAPE-20261107.json`: exact user request and change boundary.

## Unresolved requirements — STOP SHIP

The new module is an **additive real source implementation**, not yet wired into native V17 Brain or its original UI. It was not tested on original OpenThoughts3 heldout answers or on NVIDIA Windows RTX hardware. Its learned templates are restricted to grammars represented in grounded training observations; no supported alternative parser or autonomous semantic meaning invention is claimed. It does not solve an unobservable ambiguous world or guarantee all unknown natural-language answers. Error feedback is measured on execute, but retry/replanning and new causal observation consolidation are not yet integrated. The original Noise Space model remains separate. No main-branch merge, existing checkpoint modification, V17 UI rewrite or release command is authorized by this result.

**This is a useful falsifiable piece of the solution-shape architecture. Issue #25 remains OPEN.**
