# V30 — COMPLETE RETAINED EXPERIENCE ATLAS: successes, missed paths, physical walls, contextual transformations and long language motifs

**Date:** 2026-11-07  
**Branch (isolated):** `experiment/V30-UNIFIED-LEARNED-HYPERMAZE-TOPOLOGY-20261107`  
**Parent:** `experiment/V29-REAL-OPENTHOUGHTS-QA-GOAL-CLOSED-LOOP-20261107` commit `f8edeabdcc7183b9a3e587ecceee1b1126a22a5d`.  
**Status:** tested incremental ORIGINAL V17 Brain integration and atlas; **not unrestricted semantic language navigation or final CUDA training release**. No modifications to `main` or parents. Issue #25 remains OPEN.

## User's research requirement and the actual flaw

The user has correctly distinguished the *complete experienced world graph* from one segmented exercise: a text task does not contain all language. A useful organism must retain actions/transformations **across exercises** and search the union of permitted states and actions, while learning missing context-dependent axes. The atlas must display success **and failure** with all evidence, not just colorful successful predictions.

In the V29 original runtime:
- `NativeGoalTextMaze.world()` rebuilds a temporary finite neighborhood from a start, using default `maxStates=2500`, `maxDepth=6`; the old Q/A `QARoleAxes.plan()` learned only narrowly aligned output variables, while true long OpenThoughts answers are 9,020–16,859 ORIGINAL native tokens.
- Full role Q/A answers previously survived only as sequential 96-token source-hash chunks, **not navigable meaning-changing action physics**.
- The original corpus operator model `ObservedTransformations` learns one-edit local actions, with bounded active observations; a learned independent numeric law or noncommuting path-memory coordinate was demonstrated in DIFFERENT branch research, but absent from the single long-corpus native execution/observability circuit.
- The original UI showed the active chosen path but did not report all FAILED global-shape attempts, what was blocked, why, historical transformations, or how long-context source motifs from different exercises overlapped.

### Preserved research branches and independently tested pieces

- `experiment/V17-TEXT-MAZE-COUPLED-AXES-20261107`: learned context-gated free axes and conserved mathematical direction; two independent contextual bridge observations unlocked **64/64** heldout 3-axis combinations versus **1/64** without that evidence (controlled structural text).
- `experiment/V17-PATH-HOLONOMY-MEMORY-DIMENSION-20261107`: physically differing action orders can lead to distinct hidden states despite identical visible endpoints. One signed-area history coordinate exactly reconstructed **200/200** unseen noncommuting paths; refusing to merge aliased states is essential.
- `experiment/V17-LEARNED-AXES-PERSPECTIVE-GATING-20261107`: context variations and source reliability are actual missing-path gates; do not infer unrestricted semantic equivalence.
- Original `v17/research/text-hypermaze/state-dependent-axes.mjs` learned a context-dependent numeric field from observed independent effects. In controlled unseen multiplication tests, **48/48** predicted missing dependent result before execution, compared with zero successes for the fixed-axis baseline. No hardcoded multiply operation in V30 integration.
- V29 actual OpenThoughts worker: real JSONL streaming + original learned operator memory/checkpoint; official **24 real rows** across three distant source offsets, 20 train, 4 truly heldout, original full-answer exact **0/4**, source SHA256 `9651107021d275c95136109745123845fed7407ef14f8174a3d10b26dfa48d76`.

## V30 implemented in ONE original V17 Brain, not a substitute navigator

### 1. Persistent graph crossing many independent world episodes
`v17/research/text-hypermaze/cumulative-hypermaze.mjs` owns the plain `brain.hypermazeCumulativeExperience` V1 graph in the SAME native Brain `.v8` checkpoint; when the same state is encountered in different episodes, it points to the SAME node. Physically accepted before/action/after is the only verified walkable corridor. Physically rejected edges become walls, and two different accepted outcomes for the same visible state+action mark an **ambiguous hidden-context axis**, blocking deterministic use. A hypothesis remains labelled and non-physical; source-text adjacency remains non-traversable.

The actual original `brain.disc.shapeGraph(kinds,learnedNeighbors,source,{details:true})` computes field, direction and pre-action global path. V30 does not replace it with A*, BFS as policy, next-character LLM, a new teacher planner, or a separately trained Brain. Reachability enumeration builds the bounded topology; only the ORIGINAL shape chooses the solution path.

### 2. Integrate previously isolated context and path-memory research
- `v17/research/text-hypermaze/context-axis-evidence.mjs` was copied exactly from the previously tested original research branch; `ContextAxisNavigator` proposes **separately labelled** edges from context/axis evidence.
- `cumulative-numeric-shape.mjs` fits the ORIGINAL `StateDependentTextAxes` action effects from actually witnessed transition pairs in the same Brain, not from the withheld answer. Task goals only supply independent INPUT variables; the dependent numeric answer is predicted. The same `Discoverer.shapeGraph` chooses the global route. Sparse contexts must abstain.
- Original path-holonomy and coupled axes tests were copied from their successful research branches as independent CI regressions; ambiguous same-visible-state different-outcome effects are blocked until a missing context/history coordinate can be independently identified.
- `cumulative-question-goal.mjs` is the original Brain's added bounded question-only numeric task-goal inference. Only prior grounded Q/A witnesses induce independent target variables; no answer itself is a goal. It remains one controlled learned question grammar, not universal language.

### 3. Language is fragmented: persistent multi-scale phrase anchors
`qa-role-axes.mjs` now stores in the SAME `Brain.qaRoleEvidence.longForm.motifGraph`: original witness segment hashes, 5-token and 12-token phrase motifs, occurrences per episode, shared anchors across separate observed Q/A tasks, real source order and role boundaries, all explicitly labelled **SOURCE_SEQUENCE_ONLY** and not physically executable. This prevents the earlier 96-token-exact-only representation from reporting *zero* cross-exercise overlap when genuine shorter phrases recur.

Scientific limitation: the initial token-hash content-sampling rule selects approximately **1 in 32 candidate starting positions**, plus the first. A repeated short phrase may still be unobserved solely due to the sampling design. The atlas exposes this explicitly as a gate; it never claims all possible language bridges are indexed. Current phrase motif memory is bounded to 50,000 active nodes and 90,000 edges, with eviction counters. **Repeated textual phrases are evidence of shared vocabulary/structure, NOT verified semantic action effects.**

### 4. THE ATLAS — all retained paths, failures and evidence
`v17/research/text-hypermaze/cumulative-atlas.mjs` adds a bounded, native-checkpointed chronological journal for **each requested original path**, including all refusals, and logs independently scored frozen complete-Q/A heldout outcomes using ONLY exact/canonical **booleans**. Gold answer strings never enter the atlas or model. Attempts keep up to 128 exact step witnesses and provenance fields. At most **512 recent attempts** are retained in detail, with all-history aggregates and eviction counters.

The read-only `GET /native-atlas` pages through all **retained**:
- `view=attempts`: success, failure, whether an inferred-unverified corridor was used, ordered evidence, support and per-step field.
- `view=diagnostics`: direct comparison of reasons, including `INFERRED_AXES_DISABLED_BY_DESIGN`, `DISCONNECTED_OR_MISSING_GOAL`, `START_STATE_NOT_YET_WITNESSED`, `NO_GENERAL_QA_TRANSFORMATION_AXIS`, `ORIGINAL_ROUTE_DID_NOT_YIELD_CORRECT_FULL_ANSWER`, `CONTEXT_AXES_NOT_IDENTIFIED`, `HIDDEN_STATE_ALIASING`, `GRAPH_BUDGET_REACHED`, numeric insufficiency, physical rejection and observed failures.
- `view=nodes`: all active physically observed states.
- `view=edges`: all retained physical edges, contradictory action outcomes, blocked actions, hypotheses and source-only edges, every status explicit.
- `view=motifs`, `view=motifEdges`: all retained multi-scale lexical experiences/adjacencies, but never promoted silently to causally validated paths.
- Filters `all/failed/found/verified/proposed/blocked/ambiguous`, substring search, page limits 1–200, total/nextOffset, selected attempt trace, summary of reasons across all retained attempts, current physical graph limits and source/retention counters.
- Current original UI `v17/transcend/torus-aether/ui/native-hypermaze.html/js` now has a dedicated **ATLAS** panel. Shows precise source-backed counters, found-vs-missed reasons, user-selectable historical path on the **original existing graph canvas**, separates physical edges (solid) from hypotheses (dashed), and can export **all retained** pages as one locally downloaded JSON artifact. Historical selected trace only is visibly labelled as such; it is NOT a fabricated visualization of unknown unobserved states. All old Start/Pause/Save, native UI graph/5D view and controls remain in place. Full browser pixel-level automation was NOT performed; code/API/control elements were validated in GitHub CI.

### Explicit design restrictions revealed in API
The native atlas `designGates` reports exact current capacities: retained physical nodes/edges, 512 attempts and 128 trace actions, original observed operator/token caps, short Q/A role grammar 128-token restriction, real 96-token long segments, phrase scales [5,12] and approximately 1/32 selected starts, bounded motif capacities, disabled-by-default inferred physical edges, hidden-context ambiguity, absent automatic general semantic target discovery. A **bounded retained map** cannot be logically identical to the entire infinite graph of all possible language transformations; absent evidence is reported as UNKNOWN, not impossible.

## Scientific checks and exact measured outcomes

**Cumulative original field cross-world physical test:** 12 distinct independent maze episodes each provided ONE accepted transition; no single episode contained the whole route. The first 11 prediction attempts could not reach target. After the twelfth, SAME original `Discoverer.shapeGraph` predicted all **12 steps pre-action**, and a separately implemented physical executor checked 12/12 exact accepted moves. Brain checkpoint saved/restored identical route and 12 independent source episode IDs. Repeated observations increase support; rejection blocks shortcut; contradictory same-state action effects require a hidden context coordinate. The atlas preserved **11 misses, 1 success**, 12 accepted edges, all inspectable and identical after loading from original `.v8`.

**Learned contextual/numeric route transfer:** four independent world transition witnesses were combined into an original 306-node / 1,086 candidate-edge bounded numeric graph, which found a four-step route from unseen `5 * 6 = 30.` to `8 * 7 = 56.`, without supplying dependent answer. Independent multiplication oracle was used AFTER frozen path. These generated edges are correctly labelled **inferred-unverified**, notwithstanding mathematically correct test outcome. In 28 unseen questions matching an independently trained fixed numeric instruction grammar, 28/28 complete replies were correct. This is **not** free-form unseen OpenThoughts3 reasoning.

**Two segmented language tasks:** exact 96-token chunk cross-episode overlap 0; multi-scale short motif overlap 1, witness source-only edges 33; no invented physical edges.

**Official real OpenThoughts3**, exact 24 unchanged public records at offsets [0..7,210000..210007,810000..810007], 20 train/4 withheld, **1,304,083 original JSONL bytes** (source SHA above). The original model witnessed 277,941 TRAIN answer tokens and 2,991 real long-source sequential links; exact 96-token overlap across these 20 experiences **0**. Multi-scale matching discovered **138 shared short phrase anchors** in 20 episodes among 14,669 retained motif nodes and 15,646 retained source-motif edges. **0 of these are independently validated semantic transformations.** Frozen whole-answer exact on 4 real novel questions: **0/4, route coverage 0/4**. These four negative evaluations are now in the same original saved atlas, with `NO_GENERAL_QA_TRANSFORMATION_AXIS` and without persisting the gold answers.

**Real on-disk 36-row controlled JSONL + original HTTP/UI/Brain test:** 4 genuine frozen Q/A heldouts + 4 explicit cumulative navigation attempts => **8 original Brain atlas events**, of which **7 missed**, **1 inferred path found**, and **0 correct full heldout answers**. All page offsets, selected attempt, filters, live status, source-grounded UI elements and original checkpoint persistence tested. This is a controlled on-disk fixture, not 36 real public OpenThoughts3 questions.

**CI evidence**:
- 12-episode/learned numeric/hidden context and other research regressions: https://github.com/dan3s2020/MagicPerspective/actions/runs/42356852123 .
- 8-event verified atlas, original HTTP/UI and Windows launcher, plus actual public corpus: https://github.com/dan3s2020/MagicPerspective/actions/runs/42357486240 .
- Earlier external Hugging Face API 502 was reported as a real RED external-source failure, NOT substituted with invented data. Latest public official source has bounded retry to the SAME exact original dataset indices; any continued outage FAILS transparently. Reproducible latest CI: see V30 branch Actions.

### The essential missing puzzle piece is still missing
Using a source-order edge as a physically navigable semantic transformation is INVALID. Even a perfect original goal attraction field on a complete known 4D/5D/10D graph cannot infer semantic goals or lawful transformations on arbitrary questions without learned causal rules. Current repeated 5/12-token anchors reveal cross-document shared language, not that the model has learned the correct meaning-changing action or task terminal predicate. Original `Brain.chat`/`AligningGraph.write` is still not causally able to compose the 9k–17k token unseen answer through the original verified-goal field. OpenThoughts3 0/4 is honest counterevidence.

The first remaining research steps are to **identify verifiable higher-order meaning-changing effects** within real question/answer experiences using independently testable intervention and goal feedback; learn which unseen text fragments are causally equivalent beyond mere lexical overlap; use valid history/context coordinates for noncommuting actions; and validate every proposed edge/answer WITHOUT ever giving its unseen output to the planner. Then re-test unseen full answers and actual Windows GPU throughput. **Do NOT merge or present a completed serious CUDA training launcher on current evidence.**

## Reproduction and source paths

On V30 exact isolated checkout, Node.js 22:

```bash
node --test v17/tests/v30-cumulative-hypermaze.test.mjs
node --test v17/tests/v30-real-corpus-cumulative-http.test.mjs
node --test v17/tests/v29-authentic-public-openthoughts3.test.mjs
```

The third test accesses OFFICIAL public Hugging Face Dataset Viewer and fails transparently if source unavailable. These are genuine component integration/evidence commands, not a final production-ready universal model.

ATLAS API example, when the original local V17 real-corpus server is already running:

```text
GET /native-atlas?view=attempts&filter=failed&offset=0&limit=50
GET /native-atlas?view=diagnostics&offset=0&limit=100
GET /native-atlas?view=edges&filter=blocked&offset=0&limit=200
GET /native-atlas?view=motifs&offset=0&limit=200
```

Limits and gaps are explicitly enumerated; no paths, answers or percentages are fabricated.
