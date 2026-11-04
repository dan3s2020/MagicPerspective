# V10 → original Verbatim: provisional implementation mapping

**Do not replace, paraphrase, or overwrite the original text.** Primary requirements are in `verbatim/recent-user-messages.json` (with standalone original files) and the historic transcript on `main`. The earlier historical source is incomplete; V10 cannot be marked fully compliant.

| Original source ref | Implementation evidence | Status |
|---|---|---|
| `2026-11-03-USER-14M-UNIVERSAL-ABSTRACT-NETWORK` | `engine.py`: content hash + SQLite unique completed worlds; several physical environments; `tests/test_portal.py`. | PARTIAL: 14M not achieved |
| `2026-11-03-USER-ABSTRACT-NETWORK-ORDER-ISLAND` | `engine.py`: one persistent neural graph, stored motifs and forward activations. | PARTIAL: persistent transferable solution-shape identity not proven |
| `2026-11-03-USER-NO-MORE-DEMOS` | `engine.py`/`server.py`: continuous episodes, real reward gradients, blind evaluation. | PARTIAL: long-run/cross-domain gains unproven |
| `2026-11-03-USER-ANIMATED-GRAPH-UI` | `web/app.js`: action/error/activation impulses linked to recorded frames. | PARTIAL: per-node causal attribution not implemented |
| `2026-11-03-USER-4D-HIGHER-DIMENSION-GRAPH` | `web/app.js`: 3D spatial graph projection with real time ghost frames. | PARTIAL: 4D time projection; no native higher-latent explorer |
| `2026-11-03-USER-POLYMATH-PERSISTENT-CROSS-WORLD-GRAPH` | `engine.py`: one optimizer, shared neurons and graph, structural growth retained across environments. | PARTIAL: learned fusion and measured positive transfer unproven |
| `2026-11-03-USER-GRAPH-WORLD-BODY-PORTAL` | `engine.py`: `WORLD`/`OBS`/`ACTION`/`EFFECT` nodes all within graph, independent truth used only by physical simulator. | PARTIAL: self-modelling across whole world incomplete |
| `2026-11-03-USER-AS-ABOVE-AS-BELOW-QUESTION` | `engine.py`: prediction before action, observed result, mismatch and learning. | PARTIAL: metaphor is not physical proof |
| `2026-11-03-USER-VERBATIM-MIRROR-MAIN` | This file + `verbatim/implementation-mirror.json` and mirror gates. | PARTIAL: full transcript & clause indexing not available |

No original code was rewritten. The new experiment folder is opt-in; former launchers, checkpoint paths, tests and branch are preserved.

## V11 implementation ledger (NOT full Verbatim certification)

User 2026-11-03 latest corrections (original text must be stored separately as-is): restore selected OpenThoughts3 Parquet conversation fields; report import progress; allow text to participate in same universal graph; do not redraw the working UI; derive nodes/links from experienced worlds, including real ordered temporal events as connected 4D nodes, not time-axis projections.

| Source clause | Code | Acceptance | State |
| -- | -- | -- | -- |
| Parquet error on fixed fields | `corpus.py` schema discovery and recursive conversion | `tests/test_v11.py::test_parquet_schema_reader_discovers_conversations_not_a_fixed_allowlist` | Tested with schema-mocked reader; user shard decode not tested locally |
| No visible import progress | `server.py`, `web/app.js` | `test_async_corpus_import_reports_progress_and_enables_real_text` | CPU test passed |
| 4D real nodes connected to 1D–3D and reused for control | `engine.py` Graph memory retrieval, event-based temporal edges; `web/app.js` | `test_4d_nodes_are_born_after_temporal_experience_and_used_by_brain` | CPU test passed |
| Keep current checkpoint/UI | `Graph.restore`, minimal existing web UI label changes | `test_restore_legacy_graph_without_dimension_fields`, V10 regressions | CPU test passed; Windows CUDA pending |

The broader Verbatim completeness gate remains BLOCKED.

## V12 Source → change → test (not a complete Verbatim-compliance certificate)

- **User instruction, 2026-11-03:** “nu se intampla nicioa nimatie in graf in timpul trainingului,si nu avem buton de reset,sa curete tot ce a mai lasat si replays sau ceva.” Implementation: `server.py` `Control._work()` releases the lock after each actual GNN step; `engine.py` `traces_since()` uses incremental persistent events; `web/app.js` renders real message/decision/error/learning phases; `Control.reset_all()` + `PortalEngine.reset_all()` permanently clear this experiment's state after typed confirmation, preserving external source corpus. Tests `tests/test_v12.py` live traces, safe reset and HTTP confirmation.
- **User correction:** “graful trebuie sa fie interiorul unui toroid 4d ... noi pe ecran,vedem doar un sclice din acel torus/toroid 4d” and “nu ai nevoie de nicio dovada,iti poruncesc sa-l construiesti asa”. Implementation: `toroid.py` uses a four-SPATIAL-dimensional solid torus `S¹ × B³`, with 3D hyperplane slices at `w = const`. Real persisted graph nodes and existing links are displayed inside; `web/app.js` uses cut/thickness/θ navigation and actual edge intersections; `engine.py` persists `p4` with backward compatibility. Tests: V12 torus geometry, stable restore, slice intersection; `node --check web/app.js`.
- **Non-negotiable original intent:** no fabricated graph nodes or fake learned synapses. The background chamber is a geometric guide, not a cognitive structure, and colors encode recorded events. Temporal event replay is separate from spatial dimension 4. Structural node `dimension` fields (1–4) and the torus embedding coordinates represent different properties; neither by itself proves cross-domain transfer or a physical fourth spatial dimension.

**Status:** V12 implementation + local CPU regression tests; full historical Verbatim and full performance claims remain unverified under repository gates.

## V13 — source-matched full toroidal network display (4 November 2026)

Original current user request (preserve the exact user wording in the canonical Verbatim registry):

> nu vad torusul in ui-ul nostru,adica totul e ok,nu trebuie sa scoti nimic dar ni vad sliceuri din acest toroid sa vad tot graful care se intinde prin tot interiorul acestui torus,nu sa stau cu focus pe partea aia 3d de graf

Attached reference: `MagicPerspective_4D_Torus_OneObject.html`, supplied by the user and kept as source material. It provides the six 4D rotation planes, the perspective 4D→3D and camera controls. The user's **filled interior** requirement uses the existing V12 geometric space `S¹ × B³` (not an empty Clifford torus surface).

- **Source → implementation:** `engine.py: Graph.view_page` and `server.py: GET /api/graph/all` expose all real node/edge records rather than a 750-node focus sample; `web/app.js: refreshWholeGraph` incrementally assembles full graph and preserves 3D LIVE; `web/torus-view.js` renders the real learned graph through the entire filled 4D torus and clips it to 4D spatial sections; `web/index.html` adds modes/presets and keeps all old controls; `web/style.css` contains only the new control styles.
- **Acceptance test:** `tests/test_v13.py` verifies pagination past 900, source-backed total counts, HTTP endpoint, stable ordering, and old UI controls; entire existing `tests/` suite and browser scripts checked. Headless-browser diagnostic loaded 7,953/7,953 node records and 37,291/37,291 edge records from 285 *actual* CPU diagnostic episodes. Section W=0.30 ±0.34 showed 3,547 of those nodes. No JavaScript page errors. This was not the user's actual CUDA-trained checkpoint.
- **Regression guard:** V12 reset/corpus/train/replay tests unchanged; V13 does not touch the saved model format, optimizer, trainer, corpus importer or old 3D view. No invented graph edges; wireframe is a labeled geometric guide.
- **State:** `LOCAL_CPU_BROWSER_TESTED; USER_GPU_UNVERIFIED; FULL_VERBATIM_CONFORMITY_BLOCKED`. The original user text and attachment must not be replaced with this summary, and previous missing transcript pieces remain missing.
