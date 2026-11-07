# MagicPerspective V17 — The persistent learned hypermaze atlas

**Date:** 2026-11-07

**Branch:** `experiment/V17-FULL-TRANSFORMATION-ATLAS-20261107`

**Status: experimental; FULL LANGUAGE RELEASE IS BLOCKED.** No original `main`, historical V17 interface, TinyStories `.npz` checkpoint or any original working branch has been overwritten by this work.

## The non-negotiable distinction

A real physical 2D maze has a finite specified map. There is no enumerated pre-existing **complete map of all possible natural language states and answers** in the user's corpus. We therefore build the **reachable closure of the transformations actually learned by the original Brain**, from a given observed starting state. The atlas MUST distinguish:

1. **Closed known-operator graph**: all successors under the current learned operator collection have been explored within explicitly declared limits. This is NOT a claim of complete natural language.
2. **Depth frontier**: a state may have additional successors, but the current task allowed only `maxDepth` actions; no "path impossible" claim is permitted.
3. **State-budget frontier**: the current task was stopped before enumerating all its next known states; limit may be enlarged to 10,000 states and 12 moves without resetting the Brain.
4. **Unknown transformation**: a needed state change has no actual before/after observations; audit identifies the gap but MUST NOT train from its withheld reference.
5. **Known transformation, wrong axis/choice**: the correct completed reference is an alternative reachable goal, but the original Brain selected a different valid goal. This is a constraint-identifiability issue, not an absent path.
6. **Architectural ceilings**: the original model has `maxTokens=256`, `maxObserved=12000` active states, `maxOperators=18000`; all rejected long records, evicted states and dropped operators are exposed. This version does not claim to preserve every byte as a learned state.

## Actual architecture, not an imitation

- `devour/brain.mjs`: the SAME native original Brain, `Discoverer`, original `NoiseAgency`, serialized in `Brain.v8`.
- `worlds/exercise.mjs`: original 2D `Discoverer.shape` remains unchanged; its `shapeGraph` operator propagates the same learned attraction/conductance onto real directed observed transformation edges.
- `worlds/observed-transformations.mjs`: learned reversible insert/delete/replace operations from actual corpus observations; their original signatures and source evidence persist between separate lived exercises.
- `research/text-hypermaze/goal-conditioned-native.mjs`: constructs the reachable state topology from the actual learned operator memory, computes the global solution path **before** the first text-world action, displays source→target state and exact token-operation provenance, executes the same learned transition model, and replans only on mismatches.
- `research/text-hypermaze/native-path-atlas.mjs`: enumerates SIMPLE candidate paths, dead ends, loops, action families, unused operators, unresolved frontiers and the original chosen route. Cyclic graphs can have infinitely many non-simple walks; enumeration is budgeted and explicit `truncated` flags are mandatory. No fabricated nodes, hidden-reference edges or imaginary language closure.
- `devour/worker.mjs`: native atlas attached to the SAME training worker and original Brain; no slow second V17 CPU worker or replacement GPT/byte model. The original corpus observation updates the same original learned operators. Preaction and postmortem records are append-only local JSONL, independent from the original `.v8` and TinyStories `.npz` checkpoint.
- `devour/devour.mjs`: optional HTTP endpoints; `/native-hypermaze` records a real global plan first, `/native-hypermaze-audit` accepts a withheld reference only in a **separate later request**, `/native-hypermaze-atlas` pages through the persistent log by byte offset and `/native-hypermaze-operators` returns every learned operator with evidence in pages.
- `ui/native-hypermaze.html` and `ui/native-hypermaze.js`: separate, tested Chromium live UI. Atlas overlays actual alternative paths, found route, failed nodes and frontiers; all operator records and stored history are pageable. The character view reports EVERY Unicode code point and its position, predicted vs expected, plus token edit gaps and whether an operator had ever been observed. Old V17 UI is untouched.

## Actual measured experiments

### 1. A missing cross-world transformation can be learned later

Before external evidence: lived only `He is calm.` and `He is tired.`; goal to reach `She is calm.` is **not reachable in the learned graph**, and the atlas reports the missing goal/edge. The original Brain then lives the DIFFERENT third exercise `She is tired.`, learning a reusable `He → She` axis while **never observing the correct answer** `She is calm.`. Replanning predicts `She is calm.` before acting, the native body reaches it, and the path survives an original `.v8` save/load. The atlas enumerated two available simple paths.

### 2. Falsification: removing the real operator removes the ability to solve

On a checkpoint COPY, removing exactly the actual `["replace","He","She",null,"is"]` operator discovered from `He is tired.` → `She is tired.` causes the previous `She is calm.` path to become unreachable. Restoring the unmodified saved Brain restores success. Thus the stored observed transformation is **causally necessary in this controlled case**; this does NOT prove 5D geometry or noise improves language understanding.

### 3. Wrong axis versus absent axis

A partially specified target `["She"]` admits multiple original learned states including `She is calm.`, `She is tired.`, `She is brave.`. If the evaluator's withheld reference is another reachable candidate, the atlas records `correct-reference-route-present-but-not-selected`, rather than inventing a missing operator. A language question without a uniquely identifiable target is explicitly underdetermined.

### 4. Complete-known-world versus truncated frontier

The original HTTP corpus worker has a real depth-bound test: `He is calm.` to `She is tired.` fails at depth 1 with a **depth frontier** and succeeds when **the same Brain** is allowed depth 6. A width/depth cutoff is not reported as a mathematically impossible path.

### 5. Previous original results remain tested

- 42/42 exact parity between the original `Discoverer.shape` on previously unseen 2D mazes and the generalized non-grid method.
- 100/100 heldout 1,273-byte STRUCTURED textual compositions requiring five actual observed edit transformations; a separate 1,000-exercise, 1.274 MB original CPU test measured 24/24 other withheld structurally-defined paths. This is not open-ended Q&A.
- Real Chromium integration uses the actual original TXT worker and saved Brain; Romanian Unicode source symbols were preserved in the new native textual-world lane.
- The `production-release-gate.mjs` remains **BLOCKED** for arbitrary long unseen exact natural-language answers, causal learned noise/5D benefits, faithful TinyStories 2.1M-story weight integration and actual end-to-end original V17 RTX CUDA throughput.

## Honest limits

The atlas enumerates known graph states/actions **only within declared budgets**; it cannot enumerate every conceivable text, concept, word, world or interpretation. The original model only infers locally observed single-token edits. It does not yet infer external semantic truth or arbitrary unknown multi-token transformations. Character-by-character auditing measures string agreement AFTER the result is frozen, and does not prove semantic understanding. Reference text never updates the Brain. The local append-only JSONL log can grow with experiments and has no automatic archival deletion, but the original operator model still has active-memory constraints.

## Source of truth and repeatable tests

Verbatim directive: `verbatim/2026-11-07-COMPLETE-HYPERMAZE-ATLAS-USER-VERBATIM.txt`.

Workflow: `.github/workflows/v17-native-full-atlas.yml`. Tests include actual original maze parity, 100/100 long structured compositions, 1,000 long corpus observations, real TXT worker/Chromium integration, frozen two-phase before-action vs after-action reference, Unicode byte-cursor ledger paging, learned-operator causal deletion, ambiguous goal diagnosis and real frontiers.

**Do not provide a user-facing final CUDA training launch command or call the problem solved until the full original model passes the independent natural-language and hardware release gates.**
