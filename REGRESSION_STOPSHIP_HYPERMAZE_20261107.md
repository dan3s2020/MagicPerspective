# RELEASE BLOCKER — MagicPerspective V17: hyperdimensional text-path motor replaced by statistics

**Status: CRITICAL / NOT ACCEPTED / NO USER START COMMAND.** Opened 2026-11-07; applies to ALL descendants and derivative TinyStories branches unless the contract test below passes. Branch: fix/V17-HYPERMAZE-ARCHITECTURE-REGRESSION-20261107.

This regression is not a cosmetic UI issue or a GPU installation problem. A previous assistant substituted a next-byte/hashed-frequency learner for the user's requested ORIGINAL V17 self/world/action/path learning architecture while calling the replacement 'one brain' and implying 5D geometry made language navigable. It does NOT. Mark this before making further feature claims.

## Original required invariant (must survive implementation)

1. ONE persistent organism with an internal **self + world + state + action + observed transformation** model, not separate worker brains and not merely an ND graph image.
2. **Pre-action, goal-conditioned global solution-shape prediction** (planned states/path/actions) before the first answer character/action is emitted. The withheld reference answer MUST NOT participate in choosing the plan or its target; the question/task itself must specify or allow the target to be inferred without reference leakage.
3. The SAME state→action→successor grammar and path-selection policy is used in hidden 2D maze, text world and transformations; task-specific observation encoders may differ, but the mechanism cannot be replaced with unrelated teacher-forced byte prediction.
4. **Act/observe/delta/repair**: after initial planning, execute each action, compare predicted and actually observed state, expose and learn divergence, replan from updated belief.
5. **Endogenous NoiseAgency** genuinely changes perceptual or action hypotheses and learns whether its intervention helped; test its causal impact, not just a visual slider.
6. 4D/5D geometry must be **used by the route policy** and its causal effect tested against shuffled coordinates/noise ablation. A 2D projection of unrelated learned co-occurrence positions does not meet the condition.
7. Genuine CUDA training needs measured device residency, throughput, exact persistence, no silent fallback; browser UI must reflect actual same policy state and show complete pre-action route, executed steps and residual.
8. Preserve every pre-existing file, user checkpoint and verbatim archive; mark the former research path and findings as evidence, not delete them. Frozen heldout tests never train.
9. **Do not ship until acceptance.** Report shape exact match, first-action correctness, endpoint/answer exact match and long unseen text (not a cherry-picked synthetic fixture), multiple disjoint seeds, against no-geometry / no-noise / shuffled-action baselines.
10. 100% on arbitrarily ambiguous previously unseen long natural-language answers cannot be guaranteed by any deterministic or stochastic engine without unique identifiable solution constraints. The desired 100% is an EXPERIMENTAL ACCEPTANCE TARGET to measure, NEVER a fact to claim without reproducible evidence.

## Source-grounded regression map

| Source | Before / requirement | Regression / observed behavior |
|---|---|---|
| `v17/transcend/torus-aether/devour/brain.mjs` | Original `Brain.imagine`, `Brain.live`, `enableEndogenousNoise`, `playMaze`, `trainConstructedMaze`, `ConstructedPathLearner`, `learnObservedTransformations`. | This original motor is not the primary TinyStories CUDA text training/generation motor. |
| `v17/transcend/torus-aether/worlds/constructed-paths.mjs` | Reusable `ConstructedTransitionGraph`, `construct`, `navigateBlind`, `imagineText`, `learnTransferable`. | No identity of policy/representation guaranteed for the new byte trainer. |
| `v17/transcend/torus-aether/worlds/noise-agency.mjs` | Endogenous noise acts and receives learning feedback. | New `fast_text.py`/unified GPU heads have no equivalent behavioral noise loop. |
| `v17/transcend/torus-aether/gpu/fast_text.py` | Keep the user's real 2,119,489 TinyStories and ~1.89 billion UTF-8-byte learned checkpoint. | `StreamingFastText` predicts 1–4 previous-byte contexts, not a task/goal-conditioned solution graph. |
| `v17/transcend/torus-aether/gpu/unified_fast.py` | Causal transformations with goal-conditioned route selection. | Hash contexts, local transition counts, 5D symbol co-occurrence; `plan()` follows locally frequent bytes without a goal. |
| `v17/transcend/torus-aether/gpu/unified_worlds.py` | Generalize same path algorithm from mazes to text without reading teacher in test. | Maze-policy head trained with true distance field and does NOT share state/action decision machinery with text. |
| `v17/research/tinystories/native-worlds-worker.mjs` | Avoid a slow separate process; unify original model knowledge. | Previous dual worker fork read same source independently and reached only 0.03% when fast model reached 100%. |
| `v17/research/tinystories/ui/index.html` | Old working TinyStories one-button UI; every displayed graph/metric causal and measured. | Secondary V17 controls, then re-labeled metrics, which did not prove the requested functional mechanism. |
| `v17/docs/TEXT_HYPERPATH_REQUIREMENT_20261106.md` | Explicitly says text is a navigable transformation world and initial answer shape must precede action. | No strict release gate prevented substituting byte predictor and counting green UI tests as acceptance. |
| `v17/docs/ACTUAL_MULTIDIMENSIONAL_LANGUAGE_PATHS_20261107.md` | Geometry was shown to be observational: shuffled 5D coordinates changed traces but not generated characters. | Mistaken inference from a 5D display into a causally navigated text solution. |

## What has NOT been proven

The user reports 100% maze first-path prediction in earlier experiments. This needs *metric-specific provenance*: with a complete known map, a written BFS/propagator can return a path first time on unseen maze layouts, but this alone is not proof of learned semantic text paths or of masked-world performance. The more recent blind-maze metrics differ and must not be conflated.

The observed ~64.43% TinyStories-valid top-1 UTF-8 prediction is a teacher-forced metric. It is not first-try answer correctness, path accuracy, goal reachability, complete-story generation accuracy, nor general intelligence. Running more epochs may improve or degrade heldout prediction and is not evidence of new knowledge.

## Non-negotiable acceptance before giving a run command

- Test **full original mechanism calls** and behavior against the path/NoiseAgency/maze/transform code, not merely source substrings or a fake UI.
- Use a strict information barrier: construct state, goal and full path **before** revealing held-out reference.
- Test real long heldout text from distinct source files; full response correctness must be reported separately from next-byte and token-masked metrics. No test-data leakage.
- Demonstrate geometry/noise **causal ablations**: disable/shuffle and compare learned route; all outcomes must be transparent (no artificial "passes" merely because code executed).
- Measure on the actual RTX 3050 Ti before claiming hundreds of exercises/sec or MB/sec across ALL mechanisms; CI NumPy parity is not a CUDA benchmark.
- Model migration must load the learned TinyStories checkpoint unchanged; make byte-identical backup before any new save; demonstrate restart/restore.
- Green CI is only a prerequisite. **If first-try exact long unseen answers do not hit 100%, never say the requirement is complete or supply a final user launch command.**

## Incident record

Source: user's current conversation, 2026-11-07. The exact visible user directive is in `verbatim/2026-11-07-HYPERMAZE-REGRESSION-STOPSHIP-USER-VERBATIM.txt`. Legacy source SHA and file list remain in Git history; this branch intentionally does not rewrite main, older branches, or saved .v8/.npz files.

## Verified independent research results — native branch CI (2026-11-07)

GitHub Actions verified the actual original source and explicit runtime integration, not just static source grep:
- **42 / 42** previously unseen 2D maze layouts: after **25 actual original maze training episodes**, the new arbitrary-graph form reproduced the old original \`Discoverer.shape()\` full path exactly. This is **algorithm parity**, not a measured claim of optimal/semantic answers.
- **6 / 6** deliberately withheld **TWO-TRANSFORMATION** textual combinations: after **26 actual original maze episodes** plus 19 observed short sentences, the SAME original attraction/conductance propagation predicted the complete 2-edit answer state before the first action. The exact answer sentence was NOT in training; the task explicitly supplied target-token constraints. This is **short structured generalization**, NOT long unseen prose or an independent external semantic-world judge.
- The actual original V17 \`devour/worker.mjs\` was started on a TXT corpus; the saved same \`Brain.v8\` gained 6 authentic text operators, 6 learned 5D action axes, 1 actual corpus ingestion record and a preaction text shape, with native \`NoiseAgency\` and original UI preserved. No native original-source file was deleted or replaced.
- Native trained-noise unit acceptance: original \`NoiseAgency\` made 5 real decisions, same original transferable path policy had 5 measured learning updates, the full \`Brain.v8\` restored its policies and the learned text geometry.
- **Causal controls: 0 of 6 final answers changed** when learned 5D geometric preference was disabled; likewise 0 of 6 when the transferable shared-policy preference was disabled. **Hence these tests do not prove 5D geometry or the shared policy *caused* the correct answer.** Such proof remains a mandatory unfinished task.
- User's ~2.1M-story / 1.89G-byte pretrained TinyStories \`.npz\` was NEVER loaded into native \`Brain\`, converted or overwritten in this branch. Transferring this knowledge faithfully is **NOT IMPLEMENTED**, despite preserving the original file.
- **0 measured long unseen first-try semantic answers**, no real NVIDIA RTX 3050 Ti original Brain CUDA throughput, and no proven 100% on large task-defined language answers. **RELEASE BLOCKED**.

A formal independently audited release gate lives at
\`v17/research/text-hypermaze/production-release-gate.mjs\`.
When genuine evidence is absent, \`--gate\` returns nonzero and
\`v17/tests/hypermaze-stopship-release.test.mjs\` verifies that the release is blocked.
Never rename component tests to "100% solved" or disable the gate to report success.
Research CI: https://github.com/dan3s2020/MagicPerspective/actions/workflows/v17-native-hypermaze-stopship-research.yml.

## 2026-11-07: three additional regressions and verified research remediation

### R1 — repeated words caused ZERO learned text transitions
The old original `ObservedTransformations._candidateSentences` required `tokens.length-2` shared entries even though the inverted index stores only UNIQUE tokens. On real-style long repeated prose, 16 passages of 1,273 UTF-8 bytes produced **0 learned operators**; the strict 100-target long-text test failed **0/100**. Fixed in isolated source by calculating overlap on distinct real contextual anchors, with exact `oneEdit` proof of every inferred operation. Real one-word insert/delete operations now have separate regression tests.

### R2 — original inverted index silently forgot distant learning
After 1,000 distinct 1.27KB observations, the old `last-96 IDs / last-80 queried` token index learned only **42 operators** and failed **0/24** remaining held-out long textual combinations. Root cause: a rare earlier axis appeared 256+ observations before its later corresponding state and was no longer retrievable. The original model now retains all **active** source observations in its bounded `maxObserved` window and considers rare shared anchors across the complete active history. It still checks exact real before/after one-edit sequences before learning anything.

**Verified after correction in GitHub Actions on CPU:** 1,000 distinct observed passages totaling 1.274 MB in **0.620 seconds**, **1,614.08 structured exercises/sec**, **2.0567 MB/sec**, 60 learned operators, **24/24** strictly withheld full 1KB+ passages correct before first action and completed by the original learned body; 42.27 MiB reported Node heap. These are reproducible controlled tests, **NOT OpenThoughts, NOT RTX CUDA, and NOT proof of general semantic understanding**. The smaller 16-observation 100-target benchmark remains **100/100**, with 5 original learned action steps per output and independent answer masking.

### R3 — legacy training stream erased Unicode
`devour/worker.mjs` historically mapped code points outside ASCII to `?` in its byte stream, discarding Romanian diacritics before the native textual-world learned transformations. On this isolated branch, ONLY the opt-in `--native-hypermaze` original worker additionally passes the exact original corpus string to the original `ObservedTransformations` motor, while preserving the legacy AligningGraph byte stream unchanged and forbidding a truncated/unseen suffix from entering a partial row. The actual original V17 worker test now trains on `Știința este calmă.` / `Știința este rapidă.` / `Experiența este rapidă.` / `Experiența este stabilă.` and predicts the never-observed `Știința este stabilă.` before acting. The Unicode text is verified in the checkpoint as actually observed; the predicted target was not provided during training.

### Further limitations still blocking release
- **100/100 above refers to explicitly constrained structural composition**, not exact open-ended solutions of long unfamiliar mathematical/semantic questions.
- Original V17 `AligningGraph` and some UI/byte operations still use historical ASCII treatment, so full Unicode/byte preservation through every subsystem has NOT been established. `ObservedTransformations` still has `maxTokens=256` and `maxObserved=12000` working-window caps; rejected/evicted data are tracked but archival reuse for native hypermaze is NOT implemented. Do not claim every byte is learned or permanently preserved.
- Measured CPU performance includes THIS controlled observed-operator learning path, not every concurrently running V17 organism/generation/world/GPU component. Real full-stack RTX CUDA proof remains missing.
- Disabling/shuffling geometry 5D and disabling transferred path policy did not change the final answer in these structured tasks. Their **causal benefit remains unproven**. Independent semantic and stochastic noise benefits have NOT been shown.
- `v17/research/text-hypermaze/production-release-gate.mjs --gate` must remain **BLOCKED**.

Verified current research CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/42343690214

## 2026-11-07: new isolated full native 5D textual-world UI is REAL, browser-verified

The isolated research branch now additionally includes:
- `v17/transcend/torus-aether/ui/native-hypermaze.html` and `native-hypermaze.js`: a NEW page, preserving the original `index.html` and earlier `magic.html` byte-for-byte.
- Live selectable original V17 Brain and unchanged Start/Pause/Save controls from `/graphs` and `/control`.
- Explicit user-provided start state and goal constraints (not withheld answer), POST `/native-hypermaze?topology=1&execute=1`; the original Worker computes and returns real explored textual states, learned operator edges, 5D positions, original `Discoverer.shapeGraph` potentials, global pre-action path, and actual learned-body frames.
- Native canvas projects original learned 5D coordinates, with clearly disclosed **2D topological layout fallback** where learned coordinates are missing; golden initial shape and cyan body path are real calculated routes; slider and automatic animation step through the original worker's actual execution frames.
- **Real headless Google Chrome connected to the original running V17 server/worker**, with DOM `data-native-connected="true"`, `data-native-node-count="6"`, `data-native-before-action="true"` and genuine heldout "He is calm." → "She is calm.", original UI untouched. Browser execution was verified in GitHub Actions: real browser job 128318582143; latest both checks green at commit 0cafa697e3d7528e270b1ae0f41c62b7c59db17e.
- A flaky earlier Chromium `--dump-dom` returned empty stdout while Chrome exit code was zero. That failure was recorded rather than misclassified; a later measured job produced 10,721 actual DOM bytes. Browser timing must not be inferred from green backend unit tests.

This is the actual data visualization of a learned original text-transformation world, not a static mock. HOWEVER, it still does NOT solve open-ended semantic QA, the original full-RAM/GPU corpus pipeline, causal 5D generalization or the all-byte source archival requirement. **No production command is authorized**.
