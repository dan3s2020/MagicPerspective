# V17 REAL Live Body Perspective — 2026-11-06 (isolated branch)

## User requirement

> "i don't want a demo!!! use the http://127.0.0.1:8862/transcend/torus-aether/ui/index.html?live=1 ui! add your edits to it and let it train !! not demo!"

Original conceptual request (Romanian): the organism sees the entire labyrinth from above and predicts a trajectory before the first move; once it occupies the body it should continue the **same initial solution** under local vision, keeping track of where it is, not repeatedly looking from above.

This branch is an isolated, traceable implementation derived from \`experiment/TERMUX-GLOBAL-EGOCENTRIC-LEARNING-20261106\`, but the live feature itself is **not** a standalone Termux demonstration. It is trained and persisted by the original V17 \`devour/Brain\` architecture.

## Exact integration (original paths preserved)

- **Original HTML and JS, edited in place in the isolated branch only:**
  \`v17/transcend/torus-aether/ui/index.html\`
  \`v17/transcend/torus-aether/ui/app.js\`
- **Original live server:** \`v17/transcend/torus-aether/devour/devour.mjs\` — port 8862, static original UI URL, endpoints \`/graph\`, \`/graphs\`, \`/control\`, \`/gpu\`, \`/perspective-eval\` (new).
- **Original training worker:** \`v17/transcend/torus-aether/devour/worker.mjs\`, whose \`Brain\` receives all text, maze, transformation-world and perspective experiences.
- **Original Brain:** \`v17/transcend/torus-aether/devour/brain.mjs\`. The new \`PerspectiveLearner\` is a **persistent field in the same serialized brain**, with a class registry entry for correct prototype restoration.
- **New real-world lens/learner:** \`v17/transcend/torus-aether/worlds/perspective.mjs\`.
- **Original V17 labyrinth engine and Discoverer remain unmodified**:
  \`worlds/labyrinth.mjs\` and \`worlds/exercise.mjs\`.
- **Dedicated launcher:** \`START_V17_LIVE_PERSPECTIVE.ps1\` with isolated output folder \`runtime-v17-live-perspective\`.

No edits have been made to \`main\`, the old V17 branches, or other agents' working copies.

## Real learning mechanism

1. During the same V17 training session as text, maze, causal transformations and GPU maze batches,
   the ORIGINAL \`Discoverer.shape(ret,n,start)\` is invoked **once** at the beginning of a perspective episode. Its complete predicted trajectory is remembered. The retina is exposed once.
2. A simulator chooses an episode-specific, hidden 90°-multiple rotation. The world physics apply actual original V17 output codes, but the agent does **not** receive that hidden heading or its true coordinates.
3. After the initial overhead glance, the agent sees ONLY the egocentric 5×5 wall patch and moved/blocked feedback. It matches that patch against its **retained** initial map, localizes its estimated position/heading and transforms the intended world direction into a body action.
4. Whenever before/after local-observation alignment gives a unique position/heading and displacement, the learner updates the **rotation votes** from that inferred displacement and the action's previously learned body effect. Simulator ground-truth pose labels are used only to score and display results. There is **no supervised hidden-heading teacher in the real V17 learner**.
5. If the frozen initial V17 shape cannot be followed from the estimated location, the agent computes a route **only from the initial stored map**, never re-fetching the current complete map. This is recorded as "memory-based repair", distinct from following the original first shape.
6. Every emitted output and local sensory symbol feeds the original \`Brain.live()\` and shared graph. The perspective votes, scores and replay are saved in the original \`Brain.save()\` checkpoint.
7. CPU \`Brain.playMaze()\` trains one perspective episode after each original exercise. The existing \`Brain.learnMazesGPU()\` path trains one actual CPU perspective episode after each GPU batch on one recorded maze. This is not a claim that the perspective pose solver itself runs on CUDA.

## Fair, frozen validation

The live button **"Evaluează FROZEN pe lumi nevăzute"** runs directly in the worker through the existing trainer's HTTP service.

- Both trained and untrained identity controllers receive **the same ORIGINAL V17 Discoverer first-shape predictor**, new maze, start, goal, hidden rotation, fixed time limit and local observations.
- Both use independent copies of Discoverer and its RNG: no accidental random-state advantage.
- Neither receives ground truth position/rotation or updates the learned perspective memory during test.
- Test seeds come from the original \`SEEDS.test\` partition, not from perspective training seeds.
- Metrics are success fraction, steps minus oracle shortest length (for solved mazes only), orientation accuracy, localization accuracy, initial-shape accuracy, wall bumps, proportion of actions following initial plan, number of memory repairs.
- The always-visible UI's training stats are *training*, not generalization; the frozen endpoint is the actual held-out test.

### Concrete verified automated result (Linux and Windows, Node.js 22, no CUDA hardware)

With \`Brain.playMaze()\` called 64 times, its own perspective state trained for 64 episodes with 524 inferred movement-rotation observations. On 16 fresh frozen V17 test mazes (sizes 7/9/11/13):

- learned: **16/16 solved**, mean extra steps on solved mazes **0**;
- same original first-shape planner with untrained perspective transform: **4/16 solved**;
- original maze engine: **62/64 solved** during these training examples;
- learned pose and heading accuracy in that run: **100%**, inferred from the initially seen map and local observations.

This verifies a particular discrete global-to-egocentric transform with a known finite map and 90° rotations, **not** a generally solved P=NP, arbitrary-dimensional geometric transformation, universal intelligence or cross-domain transfer. It does not prove that the original \`Discoverer.shape()\` solves arbitrary mazes, only that the learned body transform uses the original shape when available and records repair cases separately.

## Run in PowerShell, D: without overwriting other trained brains

Clone this exact branch into **a new folder** and run:

    powershell -NoProfile -ExecutionPolicy Bypass -File D:\MagicPerspective-V17-LivePerspective\START_V17_LIVE_PERSPECTIVE.ps1

The launcher autostarts **real live training** on \`127.0.0.1:8862\` (with \`text,maze,transform\`), defaults to the user's existing \`D:\training\OpenThoughts3-1.2M\` Parquet data if present, otherwise checks for the real \`D:\octopus-text.txt\` corpus. If neither exists it reports an explicit error, not a synthetic fallback. Uses the existing verified RTX PyTorch virtual environment from \`D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space\.venv\` when available; never silently pretends to run on the GPU. Port 8862 must not already be occupied. Original V17 UI address:

    http://127.0.0.1:8862/transcend/torus-aether/ui/index.html?live=1

**Checkpoint isolation:** \`D:\MagicPerspective-V17-LivePerspective\runtime-v17-live-perspective\brains\`. Re-launching auto-resumes this isolated brain. The original project's checkpoints are not overwritten.

For an **existing original V17 Brain**, stop its original trainer after saving and use \`-ImportBrains <exact original runtime-devour\brains directory>\`. This only copies V17 \`brain-*.v8\` files to an empty isolated destination. It refuses to overwrite any existing isolated brains.

## Regression verification

    node --test v17/transcend/torus-aether/devour/perspective.test.mjs
    node --test v17/transcend/torus-aether/devour/perspective.http.test.mjs

The CI workflow \`.github/workflows/v17-live-perspective.yml\` executes these plus original GPU-batch protocol tests (using NumPy mode, NOT NVIDIA) and parses the PowerShell launcher on Windows.

**Not implemented:** all reasoning, geometry and training on CUDA; arbitrary geometric transforms between text, maze and abstract network; every parallel GPU world's full egocentric trajectory replay; replacement of original V17 Discoverer with an entirely new action-policy architecture. Those require separate instrumentation and demonstrations and are not silently called complete.
