# MagicPerspective — full native goal-route integration, research evidence and regression ledger

**Date:** 2026-11-07 (Romania, Europe/Bucharest). **Documentation only on `main`; experimental application code has NOT been merged to `main`.**
**Research disposition: EXPERIMENTAL / NOT GENERAL-LANGUAGE RELEASE READY.**

> Exact new user instruction recorded separately: `verbatim/2026-11-07-USER-DOCUMENTEAZA-TOT-IN-REPO-EXACT.txt`.
> This is a *source-grounded, detailed scientific/engineering ledger*, not a claim that the full historical chat, attachments or every missing byte has been reconstructed.

## 0. Immutable reference snapshot and ownership

- Repository: [dan3s2020/MagicPerspective](https://github.com/dan3s2020/MagicPerspective).
- `main` reference when this documentation was prepared: `2dbafd01bfbd0366329f459fc19a58df76458a27`. The default branch may advance independently.
- Full experimental implementation branch: `experiment/V17-NATIVE-COUPLED-GOAL-ROUTES-20261107`, checked at `055fc46b665fc7b9fe2538ed83e634954bd73498`.
- **[Draft PR #63](https://github.com/dan3s2020/MagicPerspective/pull/63)** targets the *experimental* parent branch `experiment/V17-CAUSAL-HYPERPATH-NATIVE-20261107` (base SHA `707795eb22f0907a580d09f99e0b56dfde9fb51a`), **NOT** `main`. The PR is OPEN, DRAFT, and not merged.
- The integrated branch combines pre-existing V17 native Brain, lexical goal-route search, constructed multiscale paths, shared world effects, observed transformations and an imported state-dependent numeric local-axis learner. The experimental source must remain isolated until broader acceptance.
- Existing `D:\` Windows runtime, private OpenThoughts dataset, local RTX 3050 Ti, original checkpoints, and user UI were **not** accessed or overwritten by GitHub CI or the repository documentation work.

## 1. Exact problem statement / acceptance conditions

The requested system is a **single organism** that navigates problem, text and labyrinth worlds as observed state/action/transition spaces; it should infer a **whole solution shape before the first execution action**, reuse learned transformations from earlier worlds when the current text is incomplete, see its own predictions and effects, grow its route atlas, and learn persistently over many examples. A non-LLM character-completion replacement, unrelated display-only 5D nodes or a scripted demo is *not acceptable* as proof.

Required acceptance properties:

1. **No hidden oracle**: heldout target answer is never passed to goal inference or the initial route planner.
2. **Actual learned transition mechanics**: actions and effects must derive from observed pairs and must influence output; a causal ablation must degrade or disable genuinely supported answers.
3. **Whole answer first**: keep `predictedFullAnswerBeforeFirstCharacter` / `fullShape` separate from executed frames and external exact-match scoring.
4. **Persistent state**: actual native V17 checkpoint save/load and new learning after resume.
5. **Original native UI**: preserve all controls; display start state, learned axes, full preaction prediction, actual action execution, diffs, failures and real timing.
6. **True throughput and GPU labeling**: no fake CUDA result, no skipped data claimed as processed; distinguish CPU state planning from CUDA latent/physical-world stages.
7. **Generalization**: new contexts and long natural-language answers on independent heldout problems, not only numeric equation templates. This last requirement **has NOT been demonstrated**.

## 2. Integration inventory — precise source paths

These paths exist on the experimental branch unless specified:

| Source / test / launcher | Integrated function and evidence | Limitation |
|---|---|---|
| `v17/transcend/torus-aether/worlds/native-coupled-goal-field.mjs` | Learns question/answer coordinate co-observation and correlated changes; selects observed start, plans a whole answer as learned actions, freezes plan and executes action replay | Restricted numeric token templates and locally affine action-effect model |
| `v17/research/text-hypermaze/state-dependent-axes.mjs` | Imported from the previously tested robust research branch; infers local context-dependent change fields, verifies effects, searches state routes | Numeric templates; `groupSamples` hypothesis, not an unrestricted semantic embedding |
| `v17/transcend/torus-aether/devour/brain.mjs` | Original `Brain` owns `numericGoalField`; `learnGoalPathPair` updates lexical + numeric world; `chat` defaults to `goal-path` and offers explicit `legacy-character` comparison only; native V8 class registration, revival, save/load | The rest of original Brain retains legacy subsystems |
| `v17/transcend/torus-aether/worlds/goal-conditioned-hyperpath.mjs` | Existing lexical question-to-target-axis inference + learned observed edit search fallback *within goal-path mode* | Known long-answer and numeric limitations |
| `v17/transcend/torus-aether/worlds/observed-transformations.mjs` | Preserved source-grounded edit-world and tokenization | One-token edits alone fail correlated multi-axis arithmetic |
| `v17/transcend/torus-aether/devour/worker.mjs` | Original V17 worker; opt-in `--goal-training` branch, source observations, first-shot probes, real per-stage profiler, complete frozen heldout answers, snapshots and checkpoint | CPU structural processing; no verified user's CUDA end-to-end speed |
| `v17/transcend/torus-aether/devour/devour.mjs` | Original HTTP server; optional CLI `--goal-training`, `/graphs` goal metrics, bounded `/goal-stream`, original `/chat` | Last strict HTTP CI attempt failed with response lacking expected mode after long delay |
| `v17/transcend/torus-aether/ui/index.html`, `app.js`, `native-goal-live.js` | Preserves native V17 UI and exposes authentic frozen answer, planned states, observed response, learned axes and action frames; 2D canvas is explicitly a projection | **Not** an independently trained full 4D/5D torus of semantic worlds |
| `isolated/noise-space/causal_text_world.mjs` | Original causal text agent with same intra-episode latent-goal vector reused and repeated projected candidate states memoized | Still limited action/reward world, not generalized semantic evaluator |
| `v17/START_V17.ps1`, `v17/START_NATIVE_V17_TRAINING_LIVE.ps1` | Existing Windows PowerShell launchers gain explicit `-GoalTraining` option and `-UnifiedWorld` selection | Parser validation **does not** establish clean-start full CUDA validation on the user's PC |
| `.github/workflows/v17-native-coupled-goal-routes.yml` | Runs real native Brain, Q/A HTTP, structural goal throughput, original causal-action semantics, original maze/shared/UI HTTP and earlier axes tests, plus Windows script parsing | Full latest HEAD must pass repeatedly before release |

The actual tests created or included on the branch are:
- `v17/tests/native-goal-coupled-whole-answer.test.mjs`
- `v17/tests/native-goal-coupled-http-integration.test.mjs`
- `v17/tests/native-goal-training-throughput-http.test.mjs`
- `v17/tests/text-hypermaze-state-dependent.test.mjs`
- `v17/tests/state-dependent-axes-robust-heldout.test.mjs`
- `v17/tests/shared-world-core-v17.test.mjs`
- `v17/tests/shared-world-core-http.test.mjs`
- `v17/tests/torus-unified-http.test.mjs`
- `v17/tests/torus-live-observability.test.mjs`
- `isolated/noise-space/causal_text_world.test.mjs`

## 3. Actual learned mechanics (not magical names)

**Observation.** For a real structured pair, tokenise the question and answer. Within the numerical index the question supplies 2–6 safely representable nonnegative numeric coordinates, and the answer contains at least one additional numeric coordinate. Group by observed lexical templates; do *not* provide a separate arithmetic law label. For each question axis `i` and answer axis `j`, accumulate empirical equality counts `Q[i] == A[j]`. Retain a question/answer axis assignment only when empirical support and separation exceed the source gates (about 0.8 support and 0.15 margin). This is inferred correspondence, not mathematical semantics.

**Transition construction.** For two *observed training* pairs in the same world, when exactly one input coordinate changes and two answer coordinates change, feed both observed answer states to `StateDependentTextAxes.observePair`. Each accepted pair captures a correlated local change (input + dependent output) and its reverse; **never** hand the heldout correct answer to the action field. The state-dependent field learns affine-in-local-coordinates action effects, including dependence on the moving coordinate, and rejects inconsistent operators with a 90%-inlier gate.

**Planning.** Read only a heldout question. Recover the learned input↔answer axes, take the closest actually observed answer state as a start, formulate goals on the **input** answer coordinates, not on the unknown dependent/result axis, and search learned operators. The planner returns its complete predicted state and ordered actions before any action is embodied. The renderer preserves the actual formatting/surrounding punctuation of an observed training sentence while substituting independently predicted numeric coordinates. It does not supply a correct answer template for a heldout target.

**Execution and independent scoring.** Replay the frozen actions through the learned effect model. Internal agreement (`actual === fullShape`) is *not* proof of the arithmetic fact; a separate heldout reference is compared only after planning for `fullAnswerExact`. Expose both, and refuse when no supported path exists. Removal of learned coordinate correspondence (`ablateAxes`) should prevent this numeric solver from using that evidence.

**Correct caching invariant.** `StateDependentTextAxes.discover` constructs the same field from the same immutable observed sample set; reuse the exact result only while samples are unchanged. Every new accepted observed transition invalidates it. Test asserts the same operator set is reused before new evidence, reconstructed after new evidence, and the predicted unseen answer is unchanged. A trial binary search-heap optimization was evaluated and **deliberately not committed** because it did not improve the relevant problem.

**Known bounds in this research configuration.** The numeric index uses, among others: `maxTextChars=512`, `maxWorlds=4096`, `maxStatesPerWorld=128`, `maxValue=10000`, `maxExpanded=9000`, `minPairs=8`, `minRows=8`. These bounds are real admission limits, not evidence of preserving the exact numeric physics for every OpenThoughts row.

## 4. Source ingest, training, observability, checkpoint

1. Original `devour.mjs` opens actual TXT or Parquet source, allocating the configured heldout split via the existing loader. Nothing in this documentation was run against the private Windows dataset.
2. In explicit `--goal-training`, before learning each selected probe row (sampled once every 32 observed exercises), call the frozen native goal planner with *only its question*; then compare to that row's original answer **after** prediction. Publish genuine `goal-live` events.
3. Every complete training Q/A row is passed through four original structural pipelines: `absorbLanguage`, `absorbConstructed` (includes `learnConstructedText` and `learnGoalPathPair`), `absorbObservedDifferences`, and `absorbText` (original `TextActionPaths` and `CausalTextAgent`). Shared/maze/transform hooks are preserved where enabled.
4. `goal-training` *does not* train the `TextCard` next-character CUDA objective or call `Brain.live` for each character in that fast path. The worker **counts** source bytes, and the retained six-scale constructed text learner does observe real character transitions. Therefore: 450/450 complete rows through four pipelines **does not imply** 450/450 rows went through every historical byte-by-byte native subsystem, nor that text is 100% GPU.
5. Model snapshots and `/graphs` report original worker status plus `nativeGoalField`, `goalPipeline`, and `nativeGoalHeldout`. `/goal-stream` offers bounded samples of real before-observation plans, original observations, accuracy flags, route states and action sequence. UI shows 2D projection from actual predicted numeric states, not fake high-dimensional geometry.
6. Native `Brain.save` / `Brain.load` retain learned numeric fields and support subsequent observations. Original shared sidecars and learner-specific state still deserve a separate long-running production reliability check. `report` performs frozen heldout evaluation and checkpoint; this can cause latency and a transient pause.
7. The original live controls remain present in code, but screenshots/media and a successful sustained user-device interactive session have **not** been independently captured.

## 5. Exact positive evidence and its meaning

| Controlled experiment | Observations made | Actual result | What it does **not** establish |
|---|---|---|---|
| Native Brain, five distinct numeric function families | 25 training Q/A rows **per family**: addition, multiplication, affine, quadratic, sum-of-squares; heldout 9 each | **45/45 exact full equations**; genuine learned paths and replay; all plans formed before output; old character generator explicitly disabled in test | No general prose understanding; no arbitrary equations |
| Causal ablation / unavailable goals | Remove learned numeric axis correspondence; ask unsupported long-form questions | Refuses; no disguised character fallback | Accuracy on arbitrary language |
| Actual original native HTTP worker | Train 23 structured Q/A rows from actual TXT; 2 records held out from 25; query 5 novel pairs | **5/5 exact unseen full numeric answers**, original server/UI module responded | Sustained throughput on private corpus |
| Original V8 checkpoint | Serialize/restore `Brain`, verify learned field classes, continue observing | Resumed predictions and further learning passed | Fully crash-proof large multi-GB user checkpoints |
| Structural source test: 500 rows | 450 assigned to training, 50 heldout by existing 1-in-10 split; full workers, actual paths, Q/A live messages | **450/450** through each of four real structural stages; **6471** paired effects in the observed numeric field; **15** sampled pre-observation question predictions | No estimate of natural-language heldout accuracy |
| Strict heldout test in later runs | Read all 50 never-trained fixture Q/A only to score frozen full predictions | **50/50** exact on this *specific* small addition fixture (test's assertions passed before a later separate HTTP assertion failed) | Not 50/50 on OpenThoughts, long text, or every arithmetic distribution |
| Original earlier robust local axes branch | Controlled observed numeric state transitions including an outlier case | **54/54** supported heldout routes; **18/18** correctly refused unsupported cubic families | It is still a locally affine numeric hypothesis |
| Control ablation on self-axis dependence | Quadratic input effects with/without current-axis dependence | **9/9 → 0/9** when causally relevant self-axis is removed | Independent semantic language alignment |

**Underlying successful CI jobs (immutable URLs):**
- [45/45, native HTTP 5/5, 450-row throughput, legacy suites and Windows parser success; 175.78/s measured](https://github.com/dan3s2020/MagicPerspective/actions/runs/42345077874/job/128320959341)
- [Same exact source at run: Windows PowerShell parser acceptance](https://github.com/dan3s2020/MagicPerspective/actions/runs/42345077874/job/128320959572)
- [Earlier source-integrated run with true worker profiling](https://github.com/dan3s2020/MagicPerspective/actions/runs/42344587820/job/128319453782)
- [HTTP fixture and existing UI integration before later strict assertion](https://github.com/dan3s2020/MagicPerspective/actions/runs/42344125823/job/128318045183)

## 6. Measured performance, causal improvement and full accounting

**Environment:** shared GitHub-hosted **Ubuntu CPU** runner; Node 22; 500 **short** arithmetic Q/A rows, 450 train/50 heldout; original V17 worker and HTTP server. Different runs are not controlled identical hardware measurements; use rates as measured, not an SLA.

| Distinct run | Elapsed wall time for 450 train rows, surrounding test | Measured rate | Status caveat |
|---|---:|---:|---|
| Pre-field-cache integrated experiment | 19.993 s | 22.51 rows/s | Passing run; repeated model discovery during heldout consumed 14.230 s |
| Cached exact observed action field | **2.560 s** | **175.78 rows/s** | **Full CI succeeded at SHA `e1fa76fd06bda7964dbed03a5982ea76028c52b7`** |
| Separate stricter full-heldout runner | 4.796 s | 93.83 rows/s | Other HTTP tests intermittent; result is not a guaranteed sustained rate |
| Most recent stricter HEAD `055fc46…` | No completed rate | **N/A** | Test failed after 124s; cannot quote speed for that run |

Measured fast passing run **per 450 calls**:
- `language-perspectives`: 31.952 ms.
- `constructed-path-and-coupled-axes`: 344.541 ms.
- `observed-text-transformations`: 81.485 ms.
- `causal-actions-shared-experience`: 1,475.158 ms.
- `blind-infer`: 15 calls, 345.319 ms aggregate.
- `frozen-heldout-whole-answer`: 61.449 ms to score 50 heldout pairs.
- `native-brain-checkpoint`: 39.679 ms, `language-sidecar-checkpoint`: 1.811 ms.
- All four training phases assert **exactly 450 calls**; no stage removed for speed.

The large measured speedup came from **avoiding recomputation of an unchanged observed numeric local field during many heldout queries**, not from deleting transformations or pretending the CPU is an RTX GPU. A separate intra-episode cache in causal action ranking preserved exact tested state on 50 samples; these timings were 1842 ms vs 1341 ms in a non-runner internal comparison and are not an unbiased throughput benchmark.

## 7. Known negative results and current critical CI regression

1. **Long-form language failure:** the earlier lexical whole-goal planner could not compose a required **717-character, 108-word water-cycle explanation**. External exact answer **0/1**; no heldout whole path. New numeric field has *not* solved that task.
2. **Earlier numeric failure:** old goal-word / one-token edit planner predicted **0/9** unseen addition pairs. Numeric paired-axis observation fixed this **restricted class**, not all text.
3. **Boundary / selection bias:** integer-token extraction, predefined structural relation test (one input axis and two observed answer coordinates change), locally affine fitted effects, answer template matching, at-most-512-character numeric index; successful novel operands within a seen grammar are easier than novel arbitrary human language, novel domains or unseen problem syntax.
4. **Current HEAD CI MUST NOT be reported green.** At `055fc46b665fc7b9fe2538ed83e634954bd73498`, [Linux job `128321842876`](https://github.com/dan3s2020/MagicPerspective/actions/runs/42345183627/job/128321842876) was **FAILURE**, whereas [Windows-entrypoint `128321844059`](https://github.com/dan3s2020/MagicPerspective/actions/runs/42345183627/job/128321844059) was **SUCCESS**. Native Brain/unit and earlier HTTP tests passed before the failure. The 500-row native goal-training HTTP test then ran **124.031 seconds**, failing at `v17/tests/native-goal-training-throughput-http.test.mjs:79`: `answer.mode` was **`undefined`**, expected `"goal-path"`. At the line, the HTTP request returned a JSON object *without the expected normal prediction mode* (likely a timeout/error object; raw response body was not logged in this failure). **Do not assert a confirmed root cause** without instrumenting the raw response and worker phase. The same category had also shown an older shared-world comparison HTTP timeout in a separate CI attempt. This intermittent/slow-path issue is a release blocker.
5. Real first-shot `/goal-stream` probes occur every **32** source exercises, not every row; the full heldout split is separately evaluated. Never misrepresent the sampled live events as exhaustive prequential evaluation.
6. Actual original `Brain` still contains classical byte-level and other modules; worker-side causal-action modules/sidecars are not demonstrably a single fully unified learned topology with all knowledge flowing bidirectionally in arbitrary contexts.
7. Nothing in this evidence demonstrates 100% first-try **long free-form text**, an external semantic correctness oracle, 4D toroidal locomotion for language, 100% GPU training, or a reliable output quality for the full 1.21M-file-row dataset.

**Chronological implementation/regression record (do not erase failed hypotheses):**

- Reused actual source classes in internal JS isolate; naive numeric question/answer coordinate coupling gave **0/9** because the dependent answer coordinate was not identifiable from insufficient training-pair geometry.
- Rebuilt learned transitions using *actual paired Q/A observations*, one input intervention per adjacent pair and two changed observed output coordinates; passed **9/9** first unseen sums in-memory before GitHub writes.
- Created isolated integration branch; imported original robust `StateDependentTextAxes`; wired `Brain` learning, default answer goal mode, checkpoint class registry. First native CI failed on whitespace roundtrip `5% 5 = 50.` vs observed `5 % 5 = 50.`: corrected **formatting from previously observed source surfaces**, not by hardcoding the percent operator.
- Another CI failed because previously tested research-test source imports were missing in the isolated new branch; copied `text-hypermaze-state-dependent.test.mjs`, `state-dependent-axes-robust-heldout.test.mjs`, and the depended-on `coupled-axes.mjs` unchanged instead of deleting regression tests.
- Added real original HTTP worker integration and original UI route visualizer; tests green. Added opt-in entire-row structural goal training, frozen pre-observation sampled events, original observed answers afterwards, and phase timings.
- Profiled repeated numeric field rebuilding during frozen heldout; in-memory binary-heap priority-queue optimization produced no relevant gain and was **rejected**, not merged.
- Added cache of exact learned field, invalidated at each new observed pair; 450-row end-to-end run reached **175.78/s**, while retaining every stage and passing entire CI at the named SHA.
- Added stricter 50/50 full-heldout assertion; latest all-jobs end-to-end rerun **failed** at an HTTP response-mode assertion after long latency. Investigation still required.

## 8. Remaining release gates and required next tests

**Release BLOCKED until all are explicitly tested and logged:**
1. Instrument raw `/chat` response and worker phase in the slow-path failure; distinguish timeout, worker saturation, save/heldout evaluation overlap, error propagation, resource exhaustion and race condition. Fix without suppressing the assertion. Repeat full CI to exclude intermittent 120s delays.
2. Benchmark several thousand **real varied-length** OpenThoughts rows with an immutable heldout split and record both rows/s and bytes/s, memory, CPU utilization, actual CUDA kernel work, GPU utilization, pauses, snapshot freshness and checkpoint bytes; separately test on the RTX 3050 Ti target machine.
3. Show new unrestricted long-answer goals and multi-paragraph paths on *never-observed* questions, with an independent evaluator comparing the entire answer. Include negative controls, ablated actual learned axes and false-positive rates.
4. Demonstrate a persistent cross-world **same-Brain** learned action/observation route graph where text, maze and transforms transfer causal paths, not just share a few weights or a display overlay.
5. Preserve saved user brains and all prior V17 UI controls; test clean-start launch, pause/resume, save/reload, shutdown, live replay and production-style repeated operation. No unauthorized overwrite.
6. If a real 4D+/hyperdimensional atlas is claimed, define its nodes, dimensional coordinates, transformations, edge transport and test ablations showing it changes actual decisions; never represent a 2D plot of numeric output as a verified native 5D language manifold.

## 9. Existing repository discoveries: canonical source links

This integration is one additional experimentally validated **piece**, not a declaration that all branches have been merged or every hypothesis established. Full earlier evidence, failed variants, source SHAs and independent mechanisms are retained in:

- [Puzzle evidence + verbatim completeness audit](PUZZLE_EVIDENCE_VERBATIM_COMPLETENESS_AUDIT_20261107.md): branches #27–#34, local frame transport, stochastic 2048, toroidal/high-dimensional projections, learned hidden functional axes, negative original V17 geometry-on-text tests, and unsolved cross-world unification.
- [Native goal-path predecessor, positive and negative heldout experiments](NATIVE_GOAL_HYPERPATH_INTERNAL_HELDOUT_RESULTS_20261107.md): lexical whole-route 10/12 small questions, water cycle 0/1 and arithmetic 0/9.
- [Robust observed causal local axes and rejection tests](ROBUST_CAUSAL_LOCAL_AXES_VERIFIED_BUT_NOT_LANGUAGE_SOLVED_20261107.md): 54/54, 18/18 abstentions, 9/9→0/9 causal ablation.
- [Current native goal training branch test/report](V17_NATIVE_CAUSAL_GOAL_TRAINING_ACTUAL_HTTP_RESULTS_20261107.md): original integration, profiler, CI results and release gate.
- [Original TextCard substitution regression](CRITICAL_REGRESSION_TEXTCARD_VS_HYPERDIMENSIONAL_GOAL_PATHS_20261107.md), and [TinyStories unauthorized motor replacement incident](INCIDENT_TINYSTORIES_UNAUTHORIZED_MOTOR_REPLACEMENT_20261107.md).
- [Earlier research atlas](RESEARCH_EVIDENCE_AND_HYPOTHESIS_ATLAS_20261106.md) and [V17 global/body perspective hypothesis evidence](RESEARCH_GLOBAL_BODY_PERSPECTIVE_V17_LIVE_EVIDENCE_HYPOTHESES_20261107.md).

Research claims that should remain explicitly limited: 2048 **states** are not 2048 dimensions; perfect maze results in a known-rules world do not imply natural-language meaning; the shared model's structural success is not an independent semantic fact; geometric local-axis studies do not automatically alter native writing decisions. The original V17 context geometry hybrid showed **51.4375%** native top1 versus **51.2625%** when adding its tested native symbol geometry, i.e. **no measured text improvement** in that particular experiment.

## 10. Historical byte-exact archival policy / honesty

The previous [verbatim audit](PUZZLE_EVIDENCE_VERBATIM_COMPLETENESS_AUDIT_20261107.md) found `verbatim/coverage.json` with `complete_export_verified: false` and historical entries marked `UNVERIFIED`. Some original user-uploaded images, earlier assistant messages and full chat exports are not present as byte-exact repository objects. This new research ledger is a faithfully constructed technical account; it **does not turn missing material into a “COMPLETE” archive**. Never upload private Windows checkpoints, user data, screenshot images or secrets to a public repository by inference. Preserve exact user-provided text where actually visible and label its completeness scope.

**Final assessment (as of HEAD `055fc46…`):**
**Verified:** full preaction numeric Q/A state paths, strict lack of hidden character fallback, native Brain persistence, 45/45 controlled + 50/50 restricted heldout, original HTTP/UI integration in passing runs, CPU short-fixture rate as high as 175.78/s after exact field caching.
**Unverified / blocked:** latest full CI green, long-answer generalization, all-source byte-level reproduction, indefinite safe high-throughput operation, real target Windows/GPU benchmarking, shared cross-domain hyperdimensional atlas.
