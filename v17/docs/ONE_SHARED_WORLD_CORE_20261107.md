# MagicPerspective V17 — one learned transformation core (isolated, 2026-11-07)

## User request — original, unmodified wording

> SO HOW ARE YOU GOING TO UPDATE IT TO WORK!!?!?!

## Core user-established architectural requirement (paraphrase, NOT verbatim)

Avoid allocating a fresh persistent node for every word occurrence or sentence fragment. Learn reusable world state relationships and transformation operators, carry them between text, labyrinths and transformation games, predict a global solution shape, act from a local perspective, observe actual results, correct and learn. Preserve the original V17 UI, all original controls and trainer.

## What is actually implemented

- Base branch: \`experiment/V17-LANGUAGE-MAZE-PERSPECTIVE-REPLAY-20261106\` (the newer branch with real learned text edit operators, overhead-first planning, local action replay and the original 5D maze UI).
- Isolated branch: \`experiment/V17-ONE-SHARED-TRANSFORMATION-CORE-20261107\`.
- Class: \`v17/transcend/torus-aether/worlds/shared-transformation-core.mjs\`, serialized INSIDE the original \`Brain\`. A compact action/effect graph: world type -> action class -> actually observed effect category. No permanent token-occurrence, sentence, or 2D map-cell nodes in this SHARED core.
- Sources of actual TRAINING observations:
  1. Original full-retina labyrinth action \`playExercise\`: self's position change and target from the observed retina (not hidden shortest paths).
  2. Original blind labyrinth \`ConstructedPathLearner.navigateBlind\`: attempted action, actually moved/stayed, goal-coordinate progress and local uncertainty AFTER executing it.
  3. Original \`CausalOrganism\` transformation-game episodes: changed vs unchanged observed board.
  4. Original \`ObservedTransformations._recordOperator()\`: each real corpus sentence-pair edit observed by the existing learner. Runtime WeakMap callback never enters legacy v8 serialization.
- Every observation updates one persistent shared 6-feature action/outcome policy. Maze planners consult exactly these shared weights through \`ConstructedPathLearner.construct()\`. Text's already learned edit operators are ranked by that SAME policy in \`ObservedTransformations.plan()\` and \`embody()\`. No new language operator, target, "oracle" answer, hypothetical edge or maze wall is fabricated.
- Frozen text search accepts \`useUnified\` true/false. The A/B button uses the same original Brain, starting sentence, target TOKEN constraints, learned operators and frozen (read-only) action model, comparing original route and locally chosen actions against shared policy.
- The existing 5D UI and tabs/controls remain intact. The existing \`Labirintul limbajului · 5D\` tab gains compact real graph nodes/edges, per-world update counts, shared policy weights and a baseline-vs-shared button. The original main NestView can include these small learned-effect nodes through the existing GraphTrace.
- Original \`START_V17.ps1\` has only one opt-in \`-UnifiedWorld\` switch. Defaults remain unchanged. The separate \`START_UNIFIED_WORLD_V17.ps1\` launches the original V17 with real text, maze and transformation worlds and isolated D: checkpoints.

## Why this is different from the failed isolated SR experiment

Previous: only 2 very long training Q/A records consumed a 120,000-character limit; V17 shape, SR tie and lexical retrieval all had word F1 0.2704, SR changed 0 decisions, exact answers were 0/8. It used an **additional Q/A retrieval graph**; this did not train the original text operators or affect V17 weight updates.

Now: actual experience changes the SAME learned action/effect policy that both original navigators can consult. Text and maze observations change the identical weights (verified in regression tests), not merely a decorative overlay. The original full corpus training loop remains intact without that two-record experiment's global cap. Crucially, the shared graph stores a SMALL set of operator/effect types rather than an atlas node per phrase.

## Falsifiable measurements, not promotional success claims

- \`worldCore.observed.text / maze / transform\`: actual updates from each world.
- \`worldCore.updates\`: number of shared effect-policy gradient steps.
- \`worldCore.policy\`: the SAME six weights used by maze and text planners.
- \`worldCore.rules\`, \`nodes\`, \`edges\`: actual learned operator/effect counts, not invented UI labels for text occurrences.
- Frozen \`/language-maze?compare=1\`: \`changedInitialRoute\`, \`changedLocalExecution\`, plan/body length, internally reached goal.
- \`sharedRanking.candidateEdgesScored\`, \`sharedRanking.nonzeroScores\`, \`sharedRanking.candidateOrderChanges\`: how often the shared policy is applied and whether it actually reorders candidates.
- Original V17 accuracy on heldout character sequences, plus maze solved/steps/shape, remain available for regression.
- An unchanged route or unchanged quality is explicitly valid NEGATIVE evidence; no success is assumed.

## Remaining scientifically essential gaps

The graph is currently a shared **structural action/outcome** graph, not yet a universal learned semantic ontology. World-specific sensors and text edit operators still exist and are NOT replaced by one learned physics model. Its self node is an organizational anchor, NOT a demonstrated emergently discovered identity. The shared action policy is intentionally low-dimensional and cannot on its own infer logical entailment, containment, composition of natural-language meaning or any new hidden answer.

Training on actual observed edits confirms that an edit happened, not whether it is semantically meaningful. Frozen execution confirms consistency with the **learned edit model**, not with an independent semantic world. Successful unit/CI structural transfer does not prove natural language generalization on OpenThoughts. That must be tested after user runs real D:\ data; failure must be reported.

Shared graph operations execute in original Node CPU code. The original CUDA text/maze kernels continue their normal work; **no 100% GPU claim** is made.

## Running safely in Windows PowerShell D:\

\`\`\`powershell
$ErrorActionPreference = "Stop"
$repo = "https://github.com/dan3s2020/MagicPerspective.git"
$branch = "experiment/V17-ONE-SHARED-TRANSFORMATION-CORE-20261107"
$dest = "D:\MagicPerspective-Unified-Core-20261107"
if (Test-Path -LiteralPath $dest) { throw "Destination exists; refusing overwrite." }
git clone --single-branch --branch $branch $repo $dest
if ($LASTEXITCODE -ne 0) { throw "Git clone failed." }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\START_UNIFIED_WORLD_V17.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Unified-World-Run" -Port 8876 -Gpu "cuda:0" -GpuWorlds 64 -GpuTextBatch 2 -Vram 3 -GpuUtil 100
\`\`\`

Original UI: http://127.0.0.1:8876/ → tab **Labirintul limbajului · 5D**. Toggle **Folosește politica comună** and press **Compară A/B** after the corpus has provided learned operators.

Only for a later continuation with the SAME output folder: rerun launcher with \`-Resume\` and omit the Git clone. No historical original save is overwritten; prior experimental branches and main code are unchanged.

## Regression evidence

\`v17/tests/shared-world-core-v17.test.mjs\` covers original Brain direct training in all worlds, cross-world effect on the SAME weights, limited rule-node growth with 100 independent observed edits, frozen no-leak language composition, on/off policy and checkpoint restore.

\`v17/tests/shared-world-core-http.test.mjs\` boots actual original worker with an isolated 4-sentence corpus FIXTURE, trains maze and text, checks genuine HTTP status and the UI, evaluates frozen A/B and checks original checkpoint persistence. This fixture is a code acceptance test, NOT a claim about real OpenThoughts model accuracy.

Existing V17 language, maze and 5D replay regressions still run. GitHub Actions runs Linux and Windows PowerShell checks. These validate implementation integrity, not that a general intelligence has been created.
