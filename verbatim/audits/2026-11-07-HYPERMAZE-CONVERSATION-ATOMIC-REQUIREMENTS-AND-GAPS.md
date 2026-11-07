# Verbatim audit — 2026-11-07 MagicPerspective accessible dialogue
**Strict status:** `INCOMPLETE ORIGINAL SOURCE / NOT VERIFIED WHOLE CONVERSATION / RELEASE BLOCKED`. This coverage sheet maps *recoverable visible requests* to code and tests, not fabricated missing turns. It does **not** replace `verbatim/implementation-mirror.json`, full original chat export or `verbatim/SOURCE_POLICY.md`.

Original recovered excerpts: `verbatim/2026-11-07-RECOVERABLE-HYPERMAZE-CONVERSATION-EXCERPTS.md`. General worklog: `v17/docs/2026-11-07_CONVERSATION_COMPLETE_RECOVERABLE_WORKLOG.md`. Exact CI status and demonstrations: `v17/docs/2026-11-07_HYPERMAZE_ATLAS_TESTS_REGRESSIONS_AND_NEXT_STEPS.md`.

## Message/source coverage disclosure
- **27 excerpt sections E01–E27** are recoverable *selected* USER text sections. These are **not 27 proven complete chronological message records**; E21 concatenates separate user paragraphs and E27 is the latest doc directive. Exact turns may contain additional text not accessible here.
- At least eight image placeholders are visible in user-provided dialogue, but **original image bytes and per-image hashes are unavailable**. Do not claim image archiving.
- Many dialogue spans are only marked `Skipped N messages`, and assistant replies in those omitted spans are not available verbatim. **Unknown number of complete messages missing**; percentages of whole conversation coverage cannot be calculated.
- Some user error logs are stored as clearly labelled **partial excerpts**, not complete original stdout/stderr transcripts.
- An earlier exact critical regression directive is independently preserved in `verbatim/2026-11-07-HYPERMAZE-REGRESSION-STOPSHIP-USER-VERBATIM.txt`; it must not be overwritten.
- No accessible native ChatGPT conversation export or original user-uploaded image files were committed. The full verbatim gate remains **BLOCKED**.

## Atomic requirement mapping (status as of inspected source HEAD be04513236e5)
Statuses: `TESTED_CONTROLLED` (specific reproduced scope), `PARTIAL` (some source code implemented, missing proof or broad behavior), `NOT_VERIFIED`, `REGRESSION`, `SOURCE_GAP`. A result can be TESTED_CONTROLLED **and** have a failing platform acceptance; the row explicitly says which.

| ID / original excerpt | Atomic requirement | Current code evidence | Independent acceptance/provenance | Status and missing proof |
| --- | --- | --- | --- | --- |
| R01 / E01–E06 | Noise slider's *actual* field intervention must be measured, not ordinary rerender/temperature repeat suppression | `worlds/noise-agency.mjs`; `goal-conditioned-native.mjs` | Existing noise original tests; current 100-case geometry/policy ablation outputs unchanged | **NOT_VERIFIED** causal noise benefit for human language |
| R02 / E03 E05 | Find which learned axis causes stalls and which paths are blocked by design | `goal-conditioned-native.mjs::world/plan` diagnostic; atlas UI | 5-axis maxDepth4 vs depth5, 8-states ablation | **TESTED_CONTROLLED** explicit goal grammar; not universal |
| R03 / E08–E12 | Lift actual learned movement from 2D to 3D/4D/5D/xD | Original `Discoverer.shapeGraph`, 5D torus geometry, independent local axes branches | Original maze parity and structured controls; local D2–D11 branches | **PARTIAL**; no measured fully unified xD physically causal language |
| R04 / E12 | Sensory/axis gating must ignore irrelevant dims when needed | Original structural support + relevant operator inventory; independent gating branch | V17 perspective gating independent tests | **PARTIAL**; causal advantage not shown in integrated branch |
| R05 / E14–E17 | Math+2048 spatial direction, merging, stochastic next piece action physics | Independent `v17/docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md` and math action branches | Isolated controlled 2048/learned action tests | **NOT_VERIFIED** unified as this original text learner |
| R06 / E21 | Preserve complete actually observed text sources, including older worlds and Unicode | `persistent-atlas.mjs`, `ObservedTransformations.observeText(...,{windowLong:true})` | 950-token original Unicode, raw source checkpoint test | **TESTED_CONTROLLED on Linux**, **REGRESSION Windows fsync** |
| R07 / E21 | Persist original learned transformations across exercises without forgetting needed paths | Same Brain original operators + archive episodes + `replayArchivedWorlds` | Eviction/10 old world replay/2 new operators | **TESTED_CONTROLLED** |
| R08 / E21 | Revisit old observations when new contexts match, learn previously missing action | `goal-conditioned-native.mjs::replayArchivedWorlds`; worker periodic recurrence | Native 35 episodes, 31 prior worlds/62 revisits | **TESTED_CONTROLLED**, cost/scale on millions unknown |
| R09 / E21 | Whole known reachable graph, not only a tiny current segment; mark cuts | `world/plan` `maxStates`, `maxDepth`, `completeKnownOperatorClosure`, frontiers | Depth4/8states miss, depth5 full success; no false closure | **TESTED_CONTROLLED**, whole language unknown |
| R10 / E21 | Full atlas of successful, unsuccessful, unused, blocked, explored, executed operators | `persistent-atlas.mjs`, `native-hypermaze-atlas.js` | Journal success/failure, operator counts, Chromium real UI | **TESTED_CONTROLLED on Linux**, **REGRESSION Windows fsync** |
| R11 / E21 | Show why a path is missing (design gate, absent operator, wrong goal, budget, semantic rank) | `NativeGoalTextMaze.plan().diagnostic` | Frozen search reasons; independent V37 forensic post-frozen rank analysis | **PARTIAL**: V37 scorer not integrated here |
| R12 / E21 E26 | Original first-solution-shape before any action without withheld reference | `Brain` + `Discoverer.shapeGraph`; `goal-conditioned-native.mjs` | Original shape parity; structured 100/100 5-step targets | **TESTED_CONTROLLED**, not arbitrary human full response |
| R13 / E21 E26 | Original body executes and compares predicted vs observed effect, replan on errors | `NativeGoalTextMaze.execute` and original `Brain` worlds | Internal learned text effects; actual physical maze/transform events | **PARTIAL**: independent real semantics of generated text not established |
| R14 / E24 E25 | Reuse working fast TinyStories one-button training, preserve its learned checkpoint, no unwanted button graft | Previous TinyStories branches, legacy `v17/research/tinystories` | User reports regression; no verified checkpoint parity here | **NOT_VERIFIED / REGRESSION**; don't claim patched |
| R15 / E24 | Real total dataset progress and appropriate intelligence/accuracy metric | Existing V17 telemetry plus atlas counters | Some real episode counters; full corpus consumption % not established in this branch | **PARTIAL**; no global “smart %” definition |
| R16 / E24 E26 | Real hundreds of exercises/s or MB/s across ALL original mechanisms | Original worker code and GPU submodules | Some CPU controlled benchmark; user logs show hangs / 0-world failure | **NOT_VERIFIED** real end-to-end CUDA workload |
| R17 / E26 | Real dynamic noise and 5D change accuracy with valid baselines | `noise-agency.mjs`, geometry and original shape | Frozen 100-case geometric/policy ablations: 0 changed outputs | **NOT_VERIFIED** benefit, negative result must stay |
| R18 / E20 | Review and preserve ALL latest repository discoveries | Cross-branch document for V17/V22/V23/V30/V31/V32/V35/V37 | Direct source docs/tests, independent CI pointers | **PARTIAL**: indexed, NOT integrated/merged |
| R19 / E22 | Test until mechanically demonstrated, no decorative demo | Full original worker integration + Chromium + JSONL tests | Linux PASS on inspected HEAD; Windows FAIL | **PARTIAL / BLOCKED for release** |
| R20 / E27 | Document all current conversation accurately in MagicPerspective | Four new docs, evidence ledger, gap matrix | GitHub commits of this documentation | **PARTIAL SOURCE** due skipped turns and image bytes |
| R21 / critical original regression directive | Do not substitute old native motor with teacher-forced byte trainer | `REGRESSION_STOPSHIP_HYPERMAZE_20261107.md` and explicit gate | `hypermaze-stopship-release.test.mjs` | **RELEASE BLOCKED**, migration/semantic proof pending |
| R22 / historical Windows logs | Exact Windows repo, scripts, port and original user checkpoint locations | Existing PowerShell launcher files; prior user logs archived in worklog | Windows parser PASS, actual atlas Windows FAIL | **REGRESSION** plus original user environment not executed here |

## Measured evidence versus hypotheses
- **Observed:** structured unseen five-axis text can be predicted in 5 true original edit steps when graph resources suffice. Holding training fixed while limiting states/depth reproduces absence of path.
- **Observed:** archived old text can teach missing edit operators across evicted episodes in controlled examples. Original text, maze and transform transitions can be recorded by the same original worker with distinct domain labels.
- **Observed negative:** Geometry weight/shared policy weight changes did not alter any of the 100 evaluated controlled final outputs. Human Q/A reference-span present but misranked in independent V37 analysis; 0/24 OpenThoughts full-answer benchmark remains unresolved elsewhere.
- **Not demonstrated:** current noise UI is a physical quantum sea; literal high-dimensional spacetime traversal; universal law or Nobel-level discovery; 100% first-shot novel human language; safe full user CUDA/TinyStories preservation and performance; original unseen semantic goal induction.
- **Active defect:** Windows `fsync` EPERM; see [run 42363798128](https://github.com/dan3s2020/MagicPerspective/actions/runs/42363798128) and `v17/docs/2026-11-07_HYPERMAZE_ATLAS_TESTS_REGRESSIONS_AND_NEXT_STEPS.md`.

## Required next source-compliance actions
1. Recover original complete chronological ChatGPT export (USER **and** ASSISTANT) and exact screenshots/attachments, preserving native hashes and timestamps.
2. Assign immutable original message IDs and source bytes, then create one atomic requirement row for **each exact clause**, not just broad themes. Where no source exists, mark `SOURCE_GAP` without fabricated text.
3. Compare every source clause with concrete original Brain code path, independent acceptance test, hardware conditions and actual observed result. Mark every mismatch `NOT_VERIFIED`.
4. Keep all historical source and original tested branches immutable. No completeness flags flipped by document count alone. `node scripts/verbatim-mirror-gate.mjs --gate` and `node scripts/verbatim-gate.mjs --gate` remain blocked until genuine source reconciliation.

**This audit is additive; it does not declare full source coverage or fix current code.**
