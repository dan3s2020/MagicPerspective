# MagicPerspective V17 — COMPLETE FINITE xD MAZE + CROSS-EXERCISE LANGUAGE PATH ATLAS

**Date:** 2026-11-07. **Branch:** \`experiment/V17-COMPLETE-XD-MAZE-TRANSFER-ATLAS-20261107\`, isolated from main and the old working runtime. **Status:** experimental; original V17 Brain and original V17 UI are preserved. No claim of general language solving, universal xD space exploration or all-CUDA training.

## User requirement

The organism needs the **complete traversable physical world**, not an arbitrary local map fragment. Text is fragmented across corpus records and must therefore retain previously experienced state/action transformations from OTHER exercises and revisit them later. The original V17 UI must show the **whole atlas of recorded evidence**: every available physical edge, each path considered/executed, all absent/blocked edges, and which known transformations were not permitted by the original hardcoded context guards.

The complete native atlas is a **versioned record of all STORED observed transitions**, never a claim that all possible natural-language transitions already exist. All displayed graphs are projections of actual learned operators. A missing edge stays missing until some real observation supports it.

## Audited source discoveries reused, and their restrictions

1. Original complete-map \`Discoverer.shape\`/propagation and blind-map variants: \`worlds/exercise.mjs\`, \`worlds/constructed-paths.mjs\`. The native maze algorithm uses a programmed propagation strategy; reported 100% on unseen mazes was not spontaneous discovery of universal planning.
2. \`isolated/language-paths\`: actual learned one-step action operators + goal-conditioned reverse wave. 105/105 controlled goal tasks for a tiny predefined action grammar; source-to-target transfer 30/30 on deliberately isomorphic worlds; strong direct-prior baseline ALSO 18/18 on one-step action predictions. These are NOT an advantage on arbitrary language.
3. \`v17/research/text-hypermaze/context-axis-evidence.mjs\`: original strict contextual edit anchors block independent changes; **two genuinely witnessed bridge sentences** justify newly available contextual axes. Previously demonstrated 64/64 on controlled unseen compositions; no claim all syntax is independent.
4. \`v17/research/text-hypermaze/coupled-axes.mjs\`: controlled learned numeric coupled directions/invariants; 70/70 held-out arithmetic goals; negative control with corrupted action deltas collapses. The numeric token bias is part of this controlled environment.
5. \`v17/research/text-hypermaze/state-dependent-axes.mjs\`: state-dependent learned local numeric slopes and 48/48 controlled multiplication goals; insufficient observation produces known wrong outputs.
6. \`v17/research/text-hypermaze/path-holonomy.mjs\`, \`discover-missing-state.mjs\`: noncommuting operations can require memory of action order; 600/600 test predictions with one selected history coordinate versus 0/600 endpoint-only on those restricted synthetic worlds. Held-out start ranges and path lengths were changed. No proof natural language has the same specific scalar law.
7. \`v17/docs/XD_DIMENSIONAL_RETURN_PREDICTIVE_GRAPH_20261107.md\`: exact rank cap and scale saturation in the original frozen one-step geometry scorer, but no proof of an emergent complete xD language path solver.
8. \`v17/docs/2048_STOCHASTIC_DIRECTIONAL_PATHS_20261107.md\` and \`ENDOGENOUS_NOISE_PROOF_20261106.md\`: action-conditioned uncertainty and learned noise policy are candidates for later active probing; noise itself does not fill unobserved edges or prove universal intelligence.
9. Original persistent \`ConstructedPathLearner.scales\` has SIX learned text context graphs with contexts 1,2,4,8,16,32. \`ObservedTransformations.operators\` stores evidence-backed one-token edit effects and strict left/right contextual guards. Both belong to the original \`Brain\`. A previous UI visualized only selected snippets; this branch adds direct, paginated access to their stored complete adjacency/evidence.

## What was integrated into the ORIGINAL V17 Brain

### A. Full physical finite high-dimensional maze with remembered action effects

\`worlds/full-xd-maze-atlas.mjs\` supplies all **128 states** of one 7-active-bit finite hypercube maze, all its walls and physical traversable edges, **before** the agent chooses a path. Its seven active coordinate indices span configurable 16/64/256/1024/2048/8192 ambient dimensions. It does NOT enumerate all 2^D possible binary hypercube states; only the 2^7 finite world it actually exposes. That distinction is structural, not merely a performance approximation.

Actual action label → axis physics is private in the world. \`LearnedXDActionAtlas.observe\` must perform a genuine intervention, compare observed before/action/after in a complete world and remember the resulting normalized axis fraction. The same learned action laws transfer to new unseen full finite world topologies with the *same synthetic action physics family*; no oracle solution or new target-world actions are supplied before planning. A reverse directed graph search labels *only* those edges with actually learned action effects, predicts the entire path, and then executes its action labels in the independent simulator.

\`Brain.xdAtlas\` is serialized in the **same native .v8 Brain checkpoint** with a class-aware prototype resurrection. It is NOT a separate toy Brain. \`worker.mjs\` can train one genuine finite xD world every \`--xd-atlas-every\` committed text characters (wrapper default **16,000**), alternating 16→64→256→1024→2048 ambient coordinates, and frozen-tests a distinct new complete finite world. Original maze, transform, text, GPU, pause, save and reset controls remain.

Full atlas traces include: every exposed physical corridor, every wall, every learned action-bounded explored edge, every physical edge for which no action effect is known, initial whole solution shape, each executed step, expected versus observed next state, training provenance, and the evaluator-only optimal distance (which never enters planning).

**Verified GitHub CI:** 20/20 zero-target-intervention frozen mazes across D=16,64,256,1024,2048 using 4 seeds; all executed paths shortest. No action mapping learned -> 0 executable route despite complete physical topology; learning missing actions by new real interventions unlocks it; changing hidden action mapping in a different world causes observable failure instead of falsely claiming transfer.

**No extrapolation claim:** the true hidden action-to-axis correspondence is deliberately constant across the train/test family. The stored ambient-coordinate ratio is a programmed inductive bias; it is not a freely learned arbitrary xD coordinate transformation, and 128 states do not constitute the entire dimension-2048 hypercube.

### B. Native cross-exercise TEXT memory and exact reasons for missed characters

\`worlds/native-text-path-atlas.mjs\` is a read-only inspector of the original \`Brain.constructedPaths\` six-scale persistent graph. On a REAL Q/A training record:
1. BEFORE its answer is absorbed, the learner computes a free-running candidate character path from previously learned context edges and evidence; no current gold answer is passed to \`imagineText\`.
2. AFTER the prediction is frozen, each true answer character is revealed in order to a teacher-forced diagnostic. The diagnostic records every supported native next action, its source context, evidence at all six scales, probability/score, whether the correct character edge is **missing** or **present but ranked below another**.
3. The ORIGINAL \`brain.learnConstructedText(prompt,answer)\` runs only AFTER the pre-update diagnostic.
4. The complete native adjacency memory remains in \`Brain.constructedPaths.scales\`; every context and outgoing action can be queried in pages of 1..200 states with \`GET /atlas-graph?family=scales&scale=0..5&offset=...\`.
5. \`GET /atlas-graph?family=edits&offset=...\` pages the actual original \`ObservedTransformations.operators\` with left/right anchors, operator counts, evidence witnesses, original storage budget and dropped operator count.
6. For EACH analyzed real episode an append-only \`<brain>.path-atlas.jsonl\` journal records the frozen pre-action predicted path and its character failure diagnoses, separate from the original .v8 checkpoint. \`<brain>.xd-atlas.jsonl\` does the same for actual synthetic xD world episodes, including successes AND failures. \`GET /atlas-log?kind=text|xd&offset=<byte-cursor>&limit=6\` pages the real disk bytes. No fake graph edges are generated by the UI; the original graph has native memory limits, and the UI page is bounded while allowing the next page.
7. An auxiliary \`<brain>.native-paths.json\` sidecar stores the inspector counters/recent episodes for resumption. Original learned graph memories and original accelerator code are unchanged by the inspector.

**Real repo text frozen experiment (NOT OpenThoughts3):** \`TORUS_AETHER_ABC_20261104.md\` split into native training/held-out rows, **3 unseen rows, 466 analyzed characters**. The original six-scale text graph predicted **126/466 = 27.04%** correct under teacher forcing, **154 characters had no learned next-edge** in that context, **186 had an available correct edge that lost to another**. Complete free-running exact answers **0/3**. Native graph and training inspector did not update during this exam. This failure is central evidence: a generated answer like "Every belief sums to 1)." is NOT a solution to an unseen target question. The next experiments must distinguish insufficient graph reachability from poor learned ranking, and test on the user's actual OpenThoughts training installation.

### C. Failure → observed bridge → recovered route (the actual DESIGN restriction)

The original \`ObservedTransformations.neighbors\` requires exact observed left/right neighbor anchors before it allows a one-token edit. Some independent dimensions can therefore never compose, **even when all their one-axis operations have been observed**. \`evidence-gated-text-route.mjs\` compares the ORIGINAL native strict path graph with \`ContextAxisNavigator\`, which relaxes ONLY the neighboring anchors independently witnessed in real before/after observations. It logs every step, original permission status, released guard and operator source evidence. It proposes bridge states as **unverified hypotheses**: the learner never treats a proposed witness as real until an actual training observation confirms it.

This module is exposed as read-only \`Brain.planEvidenceGatedTextRoute\` and \`POST /evidence-gated-text-path?w=0&start=...&required=token1,token2\`; it does NOT silently mutate the original \`ObservedTransformations\` or its existing strict actor. The old native model and its controls remain.

**Verified SAME ORIGINAL BRAIN test:**
- With 13 positive star observations across 3 independently controlled token positions, 64 new triple-changed sentence goals were **0/64** via evidence-gated planning: no bridge observations, no valid permission to assume independence.
- Two candidate bridge states were first *suggested* and then ACTUALLY inserted as observed text training examples, giving the original Brain 15 real sentences.
- The evidence-gated navigator then constructed **64/64** formerly unobserved goal states in 3 symbolic steps, before any supplied full target answer.
- Original strict native planner still failed **63/64**; of the 192 internal planned steps, 120 used actions that needed the observed context-bridge permission.
- Frozen test model operators remain identical during all 64 inference calls.
- These are controlled symbolic token combinations, NOT proof that cross-context replacement always preserves natural-language meaning.

This is direct evidence that **an architectural prohibition** can cause failed path construction even though relevant transformations were witnessed, and that evidence-supported expansion—not arbitrary permissiveness—can repair a particular class of failure.

## Native original UI

At the SAME original V17 page: \`http://127.0.0.1:8877/transcend/torus-aether/ui/index.html?live=1\`

The additive **ATLAS COMPLET** panel has:
- whole finite xD world 128-state/physical-edge display, actual walls, learned edges, red dotted missing-action edges, first solution shape and executing-path replay with step slider;
- side-by-side native character prediction and real observed answer, where absent transitions and wrong ranking are distinguished;
- completely paginated original six-scale context states, actual edit-operator pages with evidence/anchor guards, export JSON for current page;
- separate paged append-only actual text and xD episode failure journals;
- controlled extra strict-vs-evidence-gated text path search with initial sentence / goal tokens; witnessed-or-blocked action colors and original source examples;
- genuinely frozen held-out original V17 text and xD tests, with no target-answer path given to the planner;
- all PREVIOUS original torus graph, dynamic maze panels, text maze, noisy-policy panels, GPU control, pausing/saving and normal visualizations retained.

A canvas is a visual projection of a real finite or native learned graph, NOT a claim that 2D pixels represent true 2048-dimensional geometry.

## CI and real integration evidence

- \`v17/tests/complete-xd-maze-atlas.test.mjs\`: 6 tests for finite whole world, 20/20 crossworld holdouts, missing-effect repair and hidden-law drift;
- \`v17/tests/native-text-path-atlas.test.mjs\`: real multi-exercise native graphs, no current-answer leakage, original 6-scale pages, known missing/ranked failure diagnostics;
- \`v17/tests/native-evidence-gated-integration.test.mjs\`: 64/64 witnessed context-bridge recovery in SAME Brain, counterfactual 0/64 sparse positives, no mutation at held-out;
- \`v17/tests/native-xd-brain-integration.test.mjs\`: actual native Brain.save/load keeps learned action atlas and text history;
- \`v17/tests/complete-xd-native-live-http.test.mjs\`: REAL Node V17 server, original repo corpus, actual worker training, original Brain checkpoint, HTTP native graph paging, unseen xD world physical execution, real frozen text exam;
- \`v17/tests/complete-xd-atlas-browser.test.mjs\`: REAL Chromium original UI including entire finite world, native text chart, graph pages, journal, evidence-gated inquiry and frozen evaluations, with zero browser JS errors.
- Original V17 tests \`constructed-paths-v17.test.mjs\`, \`observed-transformations-v17.test.mjs\`, \`live-corpus-hypermaze.test.mjs\` also run.
- Workflow: \`.github/workflows/v17-complete-xd-maze-atlas.yml\`. GitHub Actions tests on Linux CPU and Node Chromium; these do NOT verify actual RTX 3050 Ti throughput or correct meaning of natural-language answers.

## Safe Windows PowerShell usage — new isolated installation, old checkpoint copied, no Reset

Stop the OLD frozen PowerShell trainer first. DO NOT PRESS RESET. Never overwrite any other agents' existing repo.

    git clone --single-branch --branch experiment/V17-COMPLETE-XD-MAZE-TRANSFER-ATLAS-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-FULL-ATLAS

The original V17 wrapper now defaults to running a finite xD world every **16,000 committed text chars**. If original last successfully saved runtime was \`D:\MagicPerspective-Hypermaze-LIVE\v17\runtime-hypermaze-real\`, run:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FULL-ATLAS\v17\START_HYPERMAZE_REAL_CUDA.ps1" -ResumeFrom "D:\MagicPerspective-Hypermaze-LIVE\v17\runtime-hypermaze-real"

If the previous checkpoint resides elsewhere, replace -ResumeFrom with the ACTUAL old output folder (must contain \`brains\`). ResumeFrom **COPIES** state into new isolated directory and refuses to overwrite destination state. If no prior checkpoint exists omit -ResumeFrom, but that loses unsaved previous in-RAM progress. The wrapper preserves original OpenThoughts input path \`D:\training\OpenThoughts3-1.2M\` unless -Data is specified.

Original UI and entire additive atlas:

    http://127.0.0.1:8877/transcend/torus-aether/ui/index.html?live=1

Real worker status and native throughput:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-FULL-ATLAS\v17\WATCH_TRAINING_THROUGHPUT.ps1" -Port 8877 -Worker 0 -Samples 12 -EverySeconds 5

The native Windows launcher runs CUDA self-tests and refuses a fake CUDA fallback. CPU JS graph and atlas remain CPU by design; do NOT claim all code is on CUDA. Checkpoint save interval, worker health and GPU timeout/retry behavior inherited from \`perf/V17-CUDA-TEXT-PREFIX-BATCH-20261107\`.

## What's next / falsifiable release criteria

1. **Complete maze semantics** must always mean the complete **accessible finite physical graph**, not arbitrary unseen natural-language states; do not grant action-effects or goal paths the model never observed. Investigate effective causal-state compression and controlled 32/64+ active-axis worlds; 7 active axes is only a positive controlled bridge.
2. For real language, differentiate at least: (i) no known edge or missing history; (ii) learned edge ranked wrongly; (iii) evidence-gated context forbidden by native code; (iv) noncommuting transforms require history; (v) truly unseen semantics with no disambiguating evidence.
3. Add learned cross-episode *structural* transition operators for multi-token/long-distance relations, tied to actual observed interventions and contrast with single-token controls. Never turn on an unverified operator merely to manufacture a 100% score.
4. Run frozen episode-disjoint tests on large real OpenThoughts Q/A, including entire free-running answers, exact content and independently verified goal satisfaction; compare strong n-gram, target-only, shuffled-action and equal-compute baselines. The current 27% teacher-forced and 0/3 free-running results do NOT demonstrate broad language competence.
5. Test actual CUDA-accelerated training on the user's 4GB RTX 3050 Ti and monitor committed MB/s and exercises/s. Avoid a new observability bottleneck: real per-episode append-only traces can consume substantial disk and CPU for millions of long answers.
6. Keep experimental PR a draft and never merge over existing agents' working UI, stable branch or main until all acceptance criteria are demonstrably met.

**Conclusion:** full finite-world map + previous-world learned transformations + evidence-gated bridge actions + native complete stored-path atlas are working pieces, but universal language navigation remains an open research problem. The results are tests, not an assurance of 100% first-try natural text predictions.
