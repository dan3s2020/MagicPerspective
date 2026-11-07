# MagicPerspective V17 — Atlas CI ledger, reproduced research and explicit failing gates
**Date:** 2026-11-07. Branch: `experiment/V17-PERSISTENT-HYPERMAZE-ATLAS-20261107`. This file is a documentation-only audit, **not** proof of universal language learning, sustained CUDA or production acceptance.

## 1. Evidence integrity
Use the immutable GitHub commit SHA and the linked GitHub Actions run for every claim. Do NOT aggregate passes from one earlier green commit and claim that a **later red** HEAD is green. All quantitative tests below run on GitHub-hosted CPU (Linux unless stated), and are **not** native benchmark observations from the user's NVIDIA GeForce RTX 3050 Ti on Windows.

Original path generation calls the actual V17 `Brain`/`Discoverer.shapeGraph`, with controlled explicit task goals. Its reference full target answer is hidden until AFTER the initial prediction. Actual generated target text may be compared only after frozen prediction. The original generated maze learning world, source-observed text edits, physical maze/transform body transitions, and semantic QA answer choices are **distinct** forms of evidence. Do not count a source substring or grammar-induced edge as a physically verified semantic transition.

## 2. Head-of-branch state, 2026-11-07
Inspected source HEAD before documentation: `be04513236e57bb39583b31569999a2ea5dceabe`, “original V17 dataset row SHA256 identity guard across checkpoint resume”.

| Job | GitHub evidence | Outcome |
| --- | --- | --- |
| Linux original shape/parity/text/multiworld/atlas/frozen long tests | [run 42363798128, Linux job 128377472181](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363798128) | **PASS** |
| Windows actual JSONL persistent atlas + original worker tests | [same run, Windows job 128377472065](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363798128) | **FAIL** |
| Earlier suite at SHA `2afbe95c938b`, before adding actual Windows execution | [run 42363311280](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363311280) | Linux + prior Windows smoke tests **PASS**, superseded by newer failure |
| First original Windows actual test addition | [run 42363388652](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363388652) | Linux PASS, Windows **FAIL** |
| Mixed original worker and atlas, before Windows actual runner | [run 42363121042](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363121042) | Both then-defined jobs **PASS** |

**Current failure (do not conceal):** Windows Node 22 `v17/tests/native-hypermaze-persistent-atlas.test.mjs` reports `EPERM: operation not permitted, fsync` when flushing the append-only atlas journal. Result **1/6 passed, 5/6 failed** in this file. The source's `PersistentHypermazeAtlas.flush()` opens its file for read before `fs.fsyncSync()`; Windows may not permit this operation with that handle. This is a **hypothesis about root cause**, not yet a proven patch. The Windows job stops before all subsequent original-worker tests can be considered Windows-validated. Do not mark all-platform persistence complete until the exact Windows job is rerun and green. In this documentation request, **no engine fix** is performed.

## 3. Raw quantitative results and scientific interpretation

### 3.1 Episodic transfer between 10 independent actual observed text worlds
Test: `v17/tests/native-hypermaze-persistent-atlas.test.mjs`, subtest `genuine REPLAY across distant segmented worlds discovers a transform absent from the active window ...`. Linux CI PASS on `42363798128`.

- Original active sentence window deliberately reduced to 3, so an earlier genuine corpus statement was evicted. Before looking up the archive, original planner **did not** find the requested path.
- Archived genuine source episodes read: **10**. Newly induced edit operators: **2**. No new `model.seen` source observations and no withheld answer provided.
- A previously unseen complete target `Beta moon vessel is curious.` became reachable through **2 original learned edit actions**, predicted globally before first action. The planned original body executed and exact same result survived original `Brain.v8` save/load.
- **Meaning:** proves memory-based composition for that particular constrained relational text-edit problem, NOT unrestricted semantic generative language or all language pathways.

### 3.2 Automatic replay in the actual original V17 worker, not merely a mocked unit call
Test: `v17/tests/native-hypermaze-worker-auto-replay.test.mjs`. CI `42363798128` Linux job:
- **35 real text exercise episodes** consumed; replay event automatically emitted after 32 actual episodes.
- **31 earlier actual worlds scanned; 62 historical sentences rehearsed; 1,032 atlas events** persisted.
- Original saved `Brain.v8` owned 62 historical rehearsals, no separate learner; held-out evaluator gold text was not provided to rehearsal.
- A later mixed-world test in the same file observed **2 actual text episodes, 69 actual original maze transitions and 49 actual original transform transitions**, with original before/action/after in the same journal.
- **Meaning:** demonstrates actual mixed-world observation and historical source recall. Merely recording maze and transform events in one brain's atlas is **not** proof of correct semantic text-physics transfer between worlds.

### 3.3 Full original long text rather than silent 256-token rejection
Test: `native-hypermaze-persistent-atlas.test.mjs`, `ORIGINAL_LONG_UNICODE_OBSERVED_COMPLETE_WORLD`:
- Two distinct **950-token Unicode observed** source sentences.
- Original model max single working window **256 tokens**; **14 contiguous overlapping observed windows**; **0 full long original sentences rejected**.
- A real middle-word replacement `veche → nouă` was learned and applied to a fully unseen ~950-token sentence, correctly predicted **before acting**, then executed through original learned path; raw full original UTF-8 text reloaded from disk after checkpoint restart.
- **Meaning:** no original Unicode evidence lost from the atlas; **not** simultaneous context length of 950 in original 256-token working state; not open-ended question answering.
- Instrumentation detects how many long-window source sequences were observed and how many transformations they produced.

### 3.4 Exact stored original graph, including unreachable frontiers
Test: `native-hypermaze-persistent-atlas.test.mjs`, `NATIVE_LOSSLESS_LARGE_GRAPH_SHARDS`:
- Controlled **structural serialization** fixture: **603 actual-style graph nodes, 987 edges, 111 frontier entries**. Saved in **14 append-only committed graph shards**.
- Exact reassembly of every node/edge/frontier after journal restart, recorded operator-evidence counts, detect uncommitted/corrupted graph part as **incomplete/error**.
- **Meaning:** tests archival fidelity at large sizes and read-only pages, not discovery of the whole unknown language graph. Nodes/edges in this serialization fixture are controlled test data, NOT corpus-discovered 603-node semantic paths.
- Earlier small journal fixture retained **17 events, 1 successful search and 2 failed searches**; exact UTF-8 and chronological page cursors survived restart.
- Original Chromium observed a **6-node** genuine learned graph drawn from actual worker API without hard-coded fake states.

### 3.5 Structured long-text 5-axis generalization, with crucial negative geometry controls
Test: `v17/tests/native-hypermaze-long-multistep-heldout.test.mjs` at CI [42363798128](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363798128).
- 16 observed original long structured text states; five target variable word axes; 60 learned original operators.
- 100/100 unseen long structured text variants predicted exactly before output AND executed by original learnt 5-step edit body, original reference full text withheld until after plan; 1,273 UTF-8 bytes in baseline long text; target vocabulary/axis constraints **explicitly supplied to the model**.
- 99 topology-cache hits; ~1.69 s evaluation in this particular Linux run (do not generalize throughput or hardware).
- Ablating 5D geometry weight alone changed final output in **0/100** cases, same for shared-policy weight: **no causal 5D/NoiseAgency accuracy contribution shown by this test**.
- Production-style unknown answer from novel question, long open-ended human prose and noise alignment not demonstrated.

### 3.6 Decisive same-brain SAME-observations topology ablation
Test: additional subtest `same original learned text knowledge has a hidden 5-axis solution` in `native-hypermaze-long-multistep-heldout.test.mjs`, logged as `ORIGINAL_FIVE_AXIS_TOPOLOGY_BUDGET_ABLATION`.
- **Identical 16 training observations, identical original Brain and operators; 0 extra training** between attempts.
- Limit search to **depth 4** -> path NOT found. Limit to **8 states** -> path NOT found. Permit **depth 5 and sufficient states** -> full exact **5-action**, ~1,271-byte novel structured target found/predicted before first body action and successfully executed.
- This proves, in a controlled 5-axis instance, that **an existing learned route was masked by the search topology/design caps**. It cannot be extrapolated to assume that every unseen semantic answer already exists in the native graph.

### 3.7 Previous controlled findings preserved, NOT merged
- Original 2D shape parity/learned word edits: 42/42 unseen native original maze layouts and 6/6 two-step structured text heldout in earlier V17 native test records. This is original algorithm parity/composition, not unknown-real-text semantic accuracy.
- Earlier long controlled branch fixture: 24/24 long structured unseen outputs. Different tests and source roots; never combine with human QA as though one metric.
- Other branches documented genuine OpenThoughts3 **0/4** full correct heldout responses at V30 and independent **0/24** failures in V37. These are not replaced by the 100/100 explicitly constrained grammar results.
- Independent human-source SQuAD V35/V37: **62/450** exact raw answers, **65/450** normalized; **329/450** reference answer present in full retained graph but incorrectly ranked, **56/450** correct candidate source state missing from candidate graph. Semantic target/ranking is distinct from finite topological path existence.

## 4. Reproduction / verification (research test commands, NOT user production training)
From the exact checkout/branch with Node.js 22 installed:
```powershell
node --check v17/research/text-hypermaze/persistent-atlas.mjs
node --check v17/research/text-hypermaze/goal-conditioned-native.mjs
node --check v17/transcend/torus-aether/devour/worker.mjs
node --check v17/transcend/torus-aether/devour/devour.mjs
node --test v17/tests/native-hypermaze-persistent-atlas.test.mjs
node --test v17/tests/native-hypermaze-worker-auto-replay.test.mjs
node --test v17/tests/native-hypermaze-original-worker-integration.test.mjs
node --test v17/tests/native-hypermaze-shape-parity.test.mjs
node --test v17/tests/native-hypermaze-compositional-heldout.test.mjs
node --test v17/tests/native-hypermaze-long-multistep-heldout.test.mjs
node --test v17/tests/hypermaze-stopship-release.test.mjs
```

Important: as of the inspected HEAD, the first atlas test **fails on Windows** `fsync`. Do not claim a PASS merely from Linux. GitHub CI has actual Windows PowerShell original launcher parse test and later Node original-worker execution tests; these are not a direct test of original user's loaded full TinyStories checkpoints or NVIDIA CUDA.

## 5. Implementation/provenance map

| Behavior or gate | Original/source implementation | Acceptance test / evidence |
| --- | --- | --- |
| Original global learned shape | `v17/transcend/torus-aether/worlds/exercise.mjs`, `brain.mjs`, `goal-conditioned-native.mjs` | `native-hypermaze-shape-parity.test.mjs` |
| Real edit grammar and evidence | `worlds/observed-transformations.mjs` | `observed-transformations-v17.test.mjs`; cross-world atlas tests |
| Historical observations, labels and replay | `research/text-hypermaze/persistent-atlas.mjs`, `goal-conditioned-native.mjs` | `native-hypermaze-persistent-atlas.test.mjs` |
| Shared original text+maze+transform worlds | `devour/worker.mjs` | `native-hypermaze-worker-auto-replay.test.mjs` |
| Real original HTTP atlas and goal endpoints | `devour/devour.mjs` | `native-hypermaze-original-worker-integration.test.mjs` |
| Real atlas browser | `ui/native-hypermaze-atlas.html`, `native-hypermaze-atlas.js` | Chromium integration in `native-hypermaze-original-worker-integration.test.mjs` |
| Sharded complete known graph | `persistent-atlas.mjs::appendSearch/graphPage` | 603/987/111 sharded fixture and crash detection |
| 5-axis path budget proof | `goal-conditioned-native.mjs::world/plan` | `native-hypermaze-long-multistep-heldout.test.mjs` |
| Original older UI and trained user data preserved | `v17/transcend/torus-aether/ui/index.html`, `magic.html`, all older branches and checkpoints | Preservation contract; no user original GPU checkpoint verified |
| General semantic proof / CUDA performance | **NOT COMPLETE** | `hypermaze-stopship-release.test.mjs` remains `NOT ACCEPTED` |
| Windows persistent atlas | `PersistentHypermazeAtlas.flush` | **RED** at run 42363798128, `EPERM fsync` |

## 6. Immediate next tests and STOPSHIP gates

1. **Fix Windows `fsync` portability without weakening durability semantics or silently swallowing permission errors**. Re-run the actual Node Windows atlas and original mixed-world worker tests; preserve baseline journal bytes/checkpoints. Only then say Windows atlas tests PASS.
2. Verify dataset episode `SHA256` identity guard across Windows and Linux, mismatched row content after resume, no replay identity collision or duplicate stale checkpoints.
3. Measure real Windows RTX 3050 Ti original mixed-world training, not just CUDA detection. Require no zero-world allocation, no OOM, no fallback, measured VRAM/actual training throughput and correct concurrent GUI updates.
4. Restore original already-learned TinyStories checkpoint without overwriting and compare throughput with known fast worker; not just replay its byte metric in a UI.
5. Fully frozen real human question/task goal induction without teacher answer in target: diverse disjoint documents and novel facts; exact whole answer and stagewise success metrics; explicit "abstain" for ambiguous missing causal knowledge.
6. Noise axis causal ablation: same frozen corpus/model, trajectory under different noise interventions, alternate learned axes; compare against shuffled/local/disabled controls. Geometry effect of 0/100 final changes is negative evidence and must remain visible.
7. Record 100% for structured experimental worlds separately from human prose; do not overstate or hide a RED negative benchmark.
8. Complete native conversation transcript and media archive, atomic requirements and test coverage; existing `verbatim` release gate remains blocked.

**Documentation notes:** This file is not a patch to the engine and is not an instruction to ship unproven code. It preserves a falsifiable record of observed progress **and** outstanding hard failures.
