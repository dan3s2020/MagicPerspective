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
