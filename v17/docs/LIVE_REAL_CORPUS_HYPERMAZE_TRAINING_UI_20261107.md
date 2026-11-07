# MAGIC PERSPECTIVE V17 — SERIOUS TRAINING + REAL LIVE TEXT LABYRINTH UI
Date: 2026-11-07. Isolated branch: feature/V17-LIVE-HYPERMAZE-REAL-CORPUS-20261107.

## Actual user requirement

Start **real training** on the actual OpenThoughts3-1.2M corpus, with an honest serious UI that shows what a text learner predicted BEFORE a newly encountered answer, the actual observed world trajectory, alternatives, errors, changing context, training curves, frozen unseen evaluation and GPU/CPU status. DO NOT replace the original V17 UI, pretend an animation is training, insert reference answers into predictions, overwrite other agents or mutate main.

## What is implemented NOW

1. The existing, original training engine remains the authority:
   - \`v17/transcend/torus-aether/devour/devour.mjs\`, original V17 worker threads, \`Brain.live\`, full OpenThoughts/real text source reader, original multiworld maze/transform CUDA paths, original six-scale constructed paths, original observed sentence transformations.
   - \`v17/START_V17.ps1\` remains unchanged.
   - All buttons, 2D maps, graph, original language-maze view, observer charts, browser training controls and checkpoints remain present.
2. A separately identifiable, persistently trained real-world context-action graph:
   - \`v17/transcend/torus-aether/devour/live-hypermaze.mjs\`.
   - Receives EXACTLY the same real Q/A or genuine observed prose segment rows being processed by the V17 worker. NO generated training data and NO fake trajectories.
   - From the real question/prefix ONLY, a bounded transition model constructs a candidate future token-action path and alternative continuations from previously observed transitions. The current answer is never passed to \`preview(prompt)\`.
   - When actual answer tokens are observed, log their true path and errors (predicted versus observed), train the transition graph online, and measure PRE-UPDATE accuracy, 0-context unigram baseline, mean surprise bits/token, adaptive previously validated context lengths 0/1/2/4/8/16, observed states and edges. Learning from the actual tokens in a row is causal: each next-token score is computed before that token's transition is learned.
   - Auto-replay from real worker telemetry (not invented geometry): gold predicted trajectory, blue teacher/observed trajectory, red errors, grey genuine alternative learned transitions. Each node is a tokenizer token, not a claim of a "real 1024D semantic coordinate".
   - Each row's sidecar update covers at most 2048 answer tokens; this truncation is counted in the UI. The ORIGINAL V17 Brain can still process the full configured corpus row.
   - Bounded per-order state tables (5000 contexts at each nonzero order, 18 alternatives per state) are used to protect memory on the 4-GB-VRAM laptop; the sidecar itself executes in Node/CPU.
   - Checkpoint \`<out>/brains/brain-N-ARM.v8.hypermaze.json\` (not a substitute for the original Brain \`.v8\` checkpoint), preserved/resumed in the same native worker logic. An explicit reset archives it along with other original sidecars.
   - Frozen evaluation on \`heldPick\` rows from the original devour server's independent heldout corpus partition: a read-only \`/hypermaze-eval\` returns accuracy and previews, with measured train tokens before/after. NO update on evaluation data.
   - Optional preview exploratory-noise control \`/hypermaze-config\` changes only the sidecar's *visualization/pre-action sampled preview*, not the objective training update or the original Brain's internal noise.
3. The original UI \`v17/transcend/torus-aether/ui/index.html\` now includes a separate large live panel right alongside the existing original 2D maze and six-context text maze (NO replacement/rewrite).
   - \`ui/corpus-hypermaze-live.js\`: routes, real branch candidates, step-by-step replay, slider/seek, pause/play, live learning curves, freeze-test button, JSON export, error/surprise breakdown, explicit CPU-vs-GPU provenance.
   - The original \`ui/app.js\` is minimally changed: import, initialization and a few update/tick/clear calls.
4. New Windows PowerShell launch wrapper, WITHOUT changing working V17 launcher:
   \`v17/START_HYPERMAZE_REAL_CUDA.ps1\`, default OpenThoughts at \`D:\training\OpenThoughts3-1.2M\`, isolated runtime folder and port 8877.
   - CUDA is requested and required by the ORIGINAL V17 GPU pipeline; the original launcher runs its real PyTorch CUDA smoke tests and refuses silent CPU fallback.
   - Node worker, character graph and this observational sidecar still run on CPU. This does NOT magically put 100% of V17 code on CUDA, and no such unsupported assertion should be made.
5. Explicit developer test evidence, including ORIGINAL server boots with real repository text, without mock server or demo backend.

## Windows start (PowerShell)

Do NOT clone on top of another agent or working tree. Use a new destination:

    git clone --single-branch --branch feature/V17-LIVE-HYPERMAZE-REAL-CORPUS-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-Hypermaze-LIVE

Run ORIGINAL trainer + real corpus live sidecar through the safe wrapper:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Hypermaze-LIVE\v17\START_HYPERMAZE_REAL_CUDA.ps1"

Then open:

    http://127.0.0.1:8877/transcend/torus-aether/ui/index.html?live=1

The default launch uses real \`D:\training\OpenThoughts3-1.2M\`, one original Brain, \`-Worlds text,maze,transform\`, CUDA \`cuda:0\`, up to 2.5 GB assigned VRAM budget, 8 GPU worlds, and checkpoint resume. All can be adjusted through wrapper flags or existing UI. On a small laptop, the GPU and CPU parts perform different actual kernels; 100% GPU utilization at all times is not promised.

If a CUDA setup/VRAM error occurs, the original V17 error must be shown; no fake success, no implicit switch to CPU. Use \`-Port\` to avoid an occupied address. To restart completely in the isolated folder, pass \`-Fresh\` explicitly; do not erase other instances or existing V17 paths.

## CI acceptance: REAL original V17 backend

Reproduction:

    node --test v17/tests/live-corpus-hypermaze.test.mjs
    node --test v17/tests/live-corpus-hypermaze-http.test.mjs
    node --test v17/tests/inline-language-maze-native.test.mjs
    node --test v17/tests/observed-transformations-live.test.mjs
    node --test v17/tests/torus-live-observability.test.mjs

The HTTP test launches the ACTUAL \`devour.mjs\` node server and \`worker.mjs\` (CPU backend for GitHub Actions), with the EXISTING 48k real \`v17/docs/TORUS_AETHER_ABC_20261104.md\` corpus, not fake JSON or a generated demo model:
- paused/untrained state genuinely has no routes/nodes/metrics;
- real held-out evaluation endpoint works with 3 held-out text rows before starting, does not update model;
- real \`/control?do=start\` launches original V17;
- real \`/graph\` has hypermaze episodes, learned state/edges and actual per-step records;
- \`/telemetry\` exposes same real worker measurements;
- real \`/control?do=save\` creates a separate data-bearing sidecar checkpoint, loaded and validated;
- observed example in a verified run: 12 source rows, 2523 learned edges, 20 actually recorded transition frames; saved checkpoint captured 10 rows at its instant of save.
- The test process is stopped and its temporary files cleaned up. This is **not** a statement that the Windows PC is running now.
- Selected original V17 UI/backend regression tests continue to pass.
- GitHub Actions: \`.github/workflows/v17-live-hypermaze-real-training.yml\`; first green run commit \`224ed0655b5b4f4671d22f09faa32e4647fa44ff\`, job \`128266632689\`; subsequent wrapper update green at commit \`3054a0180fea04253dbe49f7473fff35a17152ec\`, job \`128266808383\`.

## IMPORTANT: honest boundaries

- This is **serious real online training with observable causal prediction-versus-answer traces**, not a canned demo; but it is an INDEPENDENT context-transition training component alongside native V17, not yet proof of an autonomous newly discovered high-dimensional semantic navigation policy.
- Original V17 maze solver's BFS/propagation is an explicit programmed mechanism; matching unseen maps does not imply text capability is solved.
- Teacher/observed BLUE line is the real answer in the corpus. It is NOT claimed to be a sequence of body actions autonomously executed by the native Brain. The predicted GOLD line is the sidecar's real free rollout prior to seeing this answer. Online prequential score uses actual prior observed prefix (teacher forcing) and is intentionally distinguished from the free-run rollout accuracy.
- A text-context depth of 16 means 16 previous tokens, not 16 new spatial dimensions. Actual hyperdimensional semantic transformation fields, learned nonlinear operators and discovered hidden-state latent dimensions remain research hypotheses tested separately on controlled worlds.
- GitHub CI has NO NVIDIA GPU. Real CUDA on the user's device and actual throughput must be measured on Windows at launch. No claims of 100% CUDA/VRAM GPU training for all JS portions.
- We haven't shown that this model has learned meaningful answers, semantic invariants, problem solving or general intelligence; frozen heldout metrics in UI exist exactly to reveal that.
- The prior numerical and causal-world PR findings remain separately documented/unmerged; no other agent branches or original UI code are overwritten.

## Next scientific gate

Feed actual pre-action predictor errors into the learned state-discovery experiment, compare candidate hidden-state features against native six-scale predictor, strong recurrent baseline and shuffled histories at matched compute. Only accept a new axis when it improves heldout prediction on unrelated natural-language corpora; then wire the selected field into *the original production decision path* with explicit validation, real-time replay, checkpoint/restart and unchanged existing buttons.
