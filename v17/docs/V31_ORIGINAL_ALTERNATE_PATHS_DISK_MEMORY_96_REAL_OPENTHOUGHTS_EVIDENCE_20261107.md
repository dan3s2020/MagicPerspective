# V31 ORIGINAL V17 — new repo discoveries, all bounded alternative routes and durable cross-world language memory

**Date:** 2026-11-07  
**Independent experiment branch:** `experiment/V31-ALTERNATE-PATHS-MISSING-EDGES-20261107`  
**Parent:** original V30 one-Brain cumulative training branch SHA `2dd759c8580bf4981528a80a67a9e5840c23a92a`.  
**Release status:** DRAFT / research tested; **semantic full-answer acceptance NOT MET; stopship issue #25 OPEN**. No merges into main, no overwriting previous V17 workers or UI.

## Exact new GitHub branch discoveries reviewed BEFORE editing

- **PR #74** `experiment/V17-COMPLETE-XD-MAZE-TRANSFER-ATLAS-20261107`: full finite physical graph of 128 traversable active states inside ambient 16/64/256/1024/2048 coordinates, 20/20 controlled, native source-operator evidence and genuine browser UI. **Its unrelated real-corpus heldout evaluation failed 0/3 complete answers** (126/466=27.04% teacher forced). Finite xD closure does not prove open-ended language semantics. Did NOT merge its separate worker / UI, which would overwrite V30.
- **PR #72** `experiment/V17-FULL-TRANSFORMATION-ATLAS-20261107`: important ORIGINAL native bounded enumeration of simple alternative routes, dead ends, loops, hidden constraints, and per-character postmortem evidence. **Imported actual original `native-path-atlas.mjs` source, adapted to the existing V30 real cumulative `Brain` and tested.**
- **PR #71** `experiment/V32-REAL-CUDA-TEXT-THROUGHPUT-VRAM-20261107`: GPU text microchunks and free-VRAM budget; original real RTX 3050 Ti acceptance remains absent. **Do not call a separate CUDA suffix/byte head equivalent to THIS original native state-action learner**. Changes are on a different parent and not blindly merged.
- **PR #75** `experiment/V32-...INDEPENDENT...` allows isolated GPU trainers to coexist, important for other launcher branch. It is not a proof of the full semantic native trainer.

## Newly identified and repaired scientific/algorithmic regression

The original PR #72 atlas enumerator checked `node.kind === 1` as a forbidden cell. In V30 the ORIGINAL `KIND.floor` uses this value for valid traversable states. Simply copying #72 into V30 would erase legitimate intermediate corridors. V31 changed the *inspector* (NOT the original `Discoverer.shapeGraph`) to block only independently marked walls, while retaining the true `status`, action ID, source episode, observed support and last physical feedback of EVERY candidate. Thus the original chooser still follows the same learned attraction field; atlas enumeration is a read-only explanation and is bounded by explicit `maxPaths/maxVisits/maxSteps`.

**Real integration test:** seven independent action/outcome episodes, one start, two distinct end goals satisfying the *same incomplete* `required:["goal"]` predicate, original native Brain computed its chosen first path, inspector retained **4 genuine alternate simple routes**, two different complete goal texts; the incomplete goal is flagged `GOAL_CONSTRAINTS_ALLOW_MULTIPLE_VALID_OUTPUTS`. All route edges have independent real episode provenance. Original Brain checkpoint restoration retains exact paths. A previously trusted shortcut rejected by real independent environment feedback is excluded and its wall remains inspectable. A capped enumeration reports its own truncation instead of claiming impossible missing edges. Test reported `V31_ORIGINAL_ALTERNATE_ATLAS`: `sourceEpisodes=7, validTerminalStates=2, fullAlternatePaths=4`.

The original V17 native UI's existing **ATLAS** panel now shows each historical alternative, what `Discoverer.shapeGraph` originally chose, evidence episode and whether multiple distinct final answers match the goal; it does NOT fake a complete infinite language graph.

## Real NEW stress: OpenThoughts3-1.2M, 96 authentic source rows

The same exact public `open-thoughts/OpenThoughts3-1.2M` Hugging Face Dataset Viewer, three distant fixed offsets `0/210000/810000`, 32 genuine unchanged Q/A rows at each, no synthetic fallback, with independent SHA256 audit:

- **96** actual whole human/GPT records, **80 training**, **16 frozen true heldout questions**; exact JSONL source byte count **5,502,517**, SHA256 `b171badf1494348d2c9a358abaedf22aa5fc36b387eb5804bf4c0c5b0cd2c661`.
- Original V17 tokenizer witnessed **1,140,875 true training answer tokens**, **12,282** long Q/A segment nodes, **12,202** actual consecutive source-segment edges.
- Original 96-token *exact* cross-exercise repeated chunks: **0**. Original 5/12-token variable-anchor memory found **906** shared short source phrase motifs after making disk memory available; before disk memory integration, **899** shared anchors were counted by the 50k bounded active graph.
- **Source-only lexical motifs are NOT physical action transformations. No gold reference answer is passed to `Discoverer`; none of the frozen heldout answers are added to `Brain`.**
- Original active 50,000 motif-node ceiling evicted **9,106** prior singleton nodes by 80 training examples alone. Hence a future observation could meet an earlier phrase that was already evicted and fail to know the prior evidence.
- New exact Node22 SQLite original source-witness index held **59,098 distinct phrase motif IDs**, including all old 9,106 active-memory evictions; **906** exact motifs were seen in multiple source episodes; **63,700** indexed source-only edge types. Exact full source offsets and role/position witnesses are idempotent across replay. Disk bytes are explicitly logged in the latest actual 96-row CI test; this is additional disk, not "free" VRAM or a proof of scaling to all 1.2M examples.
- **Crucial NEGATIVE semantic result:** actual transferred complete Q/A axes = **0**; original unseen whole answers correct **0/16**, goal coverage **0/16**. All 96 real long answers exceed the original **128-token short-Q/A variable induction gate** (answer original tokens min 2,563, max 17,823). No amount of bigger graph alone can generate a semantic answer if none of the long examples yields a general legal Q/A effect. The source archive solves historical **evidence retention**, not this still-missing meaning-changing action learner.

## Durable solution to memory eviction, without a substitute model

New source `v17/research/text-hypermaze/native-motif-disk-archive.mjs` (Node22 `node:sqlite` `DatabaseSync` built-in, experimental support). Original `QARoleAxes`' 5/12-token content SHA256 motif observations, exact `(episode,role,original token index,width)` witnesses, source-order and role-boundary links are stored in an indexed SQLite database **in the same original V17 corpus worker output directory** (`original-native-long-language-motifs.sqlite`) in addition to existing bounded active `.v8` Brain memory. WAL and `synchronous=FULL`, per-source-episode transactions, `INSERT OR IGNORE` idempotent occurrence identity; replaying the same source episode does NOT multiply counts.

When an old short anchor reappears and the original in-memory motif map no longer contains it, the SAME `QARoleAxes` queries its exact disk ID and restores the previous episode count and evidence. This is **an actual memory dependency in the existing original learner**, not just a visualization or separate sidecar model. A controlled real-source test saved original `Brain.v8`, evicted its motif memory to 3 active nodes, reloaded original Brain, reopened existing disk, reobserved the old phrase under an unrelated context, and proved exact cross-episode count 2 with 73 indexed historical motifs vs 3 active, plus original 72 source links. Physical semantic actions remained **0**. Crash-replay duplicate episodes and edge ordinals were independently tested to be idempotent.

Existing Node20+ script/worker compatibility is protected: when `node:sqlite` is absent on Node20, the preexisting bounded learner still starts and prints an explicit unavailable-disk warning. `node:sqlite` must not silently be claimed available on Node20. GitHub Actions runs an **actual Node20 original worker/HTTP/checkpoint integration test**, alongside Node22 source+archive tests and Windows original PowerShell launcher syntax, all without modifying unrelated models. Node22+ is required for indexed disk recall. Other disk errors are fatal rather than silently replaced with imaginary memory.

New read-only `GET /native-motif-archive?offset=0&limit=50` and `?id=5:<SHA256>` on the **existing V17 native HTTP server** paginate exact source motif IDs or retrieve a specific prior witness and its source-only adjacent edges. The original existing native UI ATLAS panel has new real archival counts, search-by-exact-ID, and pagination. The API explicitly marks every lexical link as not physically verified. The old Start/Pause/Save, 5D viewer, graph, checkpoint and original noise controls remain.

## Explicit remaining acceptance blockers

1. **Not full semantic cognition:** 0/16 exact free complete responses on authentic unseen OpenThoughts. The native short-Q/A induction gate and the absence of independently testable long semantic transforms remain, even with 59k old source motifs indexed. Next experiment must learn true causal/world-state transitions from diverse long reasoning examples and independently verify before granting their physical walkability. A lexical relation alone cannot be promoted.
2. **Disk archive is finite/selected, not universal:** source motif extraction still samples ~1/32 starting positions (plus first), two scales 5/12 tokens, and original 96-token source digests. The SQLite store is exact for **observed** positions, but does NOT index every possible phrase or guarantee all logical paths in language. Scaled whole-corpus disk space and throughput unmeasured. SQLite is experimental in Node22.
3. **GPU:** the specific real native original state-action learner remains CPU; previous GPU byte/suffix head is different and not a proof of equivalence, and no actual user RTX3050Ti Windows sustained 4GB CUDA parity benchmark or the user's local private 594MB corpus file was run through this V31.
4. **Atlas:** bounded finite simple-path enumeration max 32 paths / 2400 visits / 24 steps at capture time, current checkpoint's last 512 full attempt records, max128 action traces, and active physics graph limits; all caps are openly exposed. Not all paths in an unbounded universal language graph are knowable or stored.
5. `main`, V30 base, PRs #71/#72/#74/#75 and all other agents, preexisting model/checkpoint files untouched. This branch is DRAFT; issue #25 remains OPEN.

## Evidence and reproduction

Real CI: [V31 original native tests, 96 genuine public Q/A, Node20 original compatibility and Windows launcher](https://github.com/dan3s2020/MagicPerspective/actions/workflows/v31-original-alternates.yml).

On isolated V31 checkout, Node22:
```bash
node --test v17/tests/v31-original-alternate-paths.test.mjs
node --test v17/tests/v31-motif-disk-memory.test.mjs
node --test v17/tests/v31-authentic-96-openthoughts-stress.test.mjs
node --test v17/tests/v30-real-corpus-cumulative-http.test.mjs
```
Third test requires live official Hugging Face source; no fallback synthetic substitution. Actual user-local long-run Windows CUDA GPU acceptance is NOT implied by any green CI job.

**Conclusion:** We successfully integrated newly discovered native route alternatives/goal underdetermination with the original cumulative V17 Brain, and demonstrated actual durable reencounter of a previously evicted source phrase at >50k motif memory in real 96-row OpenThoughts training. We did NOT solve unrestricted semantic response generation. Falsifiable failure is preserved explicitly.
