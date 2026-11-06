# MagicPerspective V17 — ISOLATED BODY PERSPECTIVE (2026-11-06)

## Source and isolation (non-negotiable)

This work exists exclusively on
\`experiment/ISOLATED-V17-BODY-PERSPECTIVE-20261106\`, cloned from immutable
parent commit \`cea408baa57ba01bb65c6057b26ecf5d92f2ef32\`
(\`experiment/V17-UNIFIED-TRANSFER-MEMORY-20261106\`).
No other agent branch, \`main\`, existing \`D:\MagicPerspective\` folder, or trained checkpoints
are modified. The checked-out V17 native UI, existing graph drawing, training controls,
CUDA PyTorch process, text/navigation heads, save/resume, held-out text/maze/transform eval,
32D shared model and camera are all kept, with only additive hooks.

The newly added runner always saves under this NEW clone's
\`v17/runtime-body-perspective-20261106/\` and serves port \`8876\` by default.
The runner refuses an occupied port and an unexpected branch.
\`.gitignore\` excludes the independent runtime.

**Literal requirements from the user:**
- "Hai ,copiază versiunea cu graf training etc,baga-i si noi taburi de vizualizări si metrici si grafice si implementează tot într-o versiune izolata să nu lucrezi peste alți agenți"
- "frate,noi doar trebuie sa facem aceeasi transformare pe care o face el cand ghiceste din prima calea corecta,desii dupa se duce cu caracterul si nu e perfect dar gaseste calea cu vreo 10 pasi in plus,dar ideea e ca el,isi schimba perspectiva intelegi? gen intai se uita de sus,cum arata harta,apoi se duce in caracter si incearca sa-si aminteasca cum arata harta corpului lui"

These are exactly the user-visible prompts used for THIS isolated implementation,
NOT a certified full native Verbatim export. The repository-wide Verbatim release gate remains BLOCKED.

## Architecture and real training

1. \`v17/transcend/torus-aether/devour/worker.mjs\` observes actual \`Brain.playMaze()\`
   and original V17 GPU replay \`onTransition\` events. The original \`SharedExperience\`
   queue still feeds the existing PyTorch 32D latent transition model.
2. The NEW \`perspective/body-memory.mjs\` learns what each body output does through
   actual observed self-symbol shifts. The self symbol is inferred by the original
   \`Discoverer.self()\`, not supplied by a maze oracle. Failed/blocked moves do not
   become false \`0,0\` action mappings.
3. The SAME new sidecar also learns **nine 3x3 local-patch correspondence weights**
   and a movement-prior weight. On each real TRAINING before/action/after transition
   it compares the observed 3x3 egocentric patch to the originally seen global
   retina, ranks candidate locations and updates weights only when the true
   observed-after body-symbol location is not adequately ranked. This supervision
   comes from the physically observed V17 training retina, not BFS or a target route.
   A fixed-weight control runs on exactly the same mazes at evaluation.
4. State is saved separately and atomically to
   \`<brain.v8>.body-perspective.json\`; restoring a saved V17 brain loads the
   sidecar. The original \`brain.v8\` format and other sidecars are unaffected.
5. The NEW \`perspective/global-local.mjs\` implements an alternate frozen actor:
   it sees the entire raw-symbol retina ONCE, stores it, predicts the initial
   global route from the original \`Discoverer.shape()\`, then receives ONLY a
   3x3 egocentric patch after each physical action. It predicts its next pose
   using trained motor effects, matches observed patches against the original
   global memory with its learned weights, and executes using the remapped body
   outputs. The world generator, BFS distances and true position are available
   ONLY to evaluation/physics, not to the policy's pose-matching arguments.
6. \`devour/eval-worker.mjs\` receives \`POST /eval\` with \`kind:"perspective"\`.
   It loads a FROZEN COPY of the currently saved V17 brain and sidecar.
   The benchmark compares:
   - original V17 Discoverer following and recomputing from full retina;
   - body policy with learned local-frame matcher;
   - IDENTICAL body policy with a fixed local matcher as a strong control.
   All three receive the SAME generated unseen maze worlds, matching seeds.
   Nothing in these frozen runs writes to the training brain or updates weights.

### UI: additive tabs beside original native graph

- **Antrenare:** original V17 NestView, live graph, world games, CUDA, start/pause/save,
  body visualization and checkpoint controls remain unchanged.
- **Evaluare:** original V17 frozen maze, text and transformation evaluators.
- **Perspectivă corp ↔ hartă:** real frozen benchmark on unseen mazes; side-by-side
  original/learned/fixed outcomes, success, steps beyond shortest path, pose accuracy.
  Animated REPLAY from actual captured steps shows the first remembered full map
  and predicted route, then the current 3x3 local patch and estimated vs actual
  coordinates. Actual coordinates are shown ONLY as an after-the-fact evaluator overlay.
- **Metrici & grafice:** measured V17 training counts, held-out text/maze/transform scores,
  real PyTorch 32D pre-update prediction loss vs persistence baseline, learned motor
  mappings, and actual updated local-frame weights/prior. The UI avoids adding new
  loss samples when the backend only repeats the previous value. History on this page
  is volatile and starts when the page is opened.
- **Transfer & CUDA:** current real shared PyTorch 32D model counts, actual reported
  device/errors, train-only loss/baseline, and an existing frozen held-out evaluation.

No fake 4D/5D coordinates are generated for absent states. The original NestView
still renders the same real graph, and the local new canvas is a 2D physical maze
plus egocentric 3x3 patch, not a claim of discovering a literal higher dimension.

## Status and limitations

The body controller is a genuine, measurable *one-global-read then local-only*
comparative experiment. It is not a universal learned transformation of all
possible perspectives. Its 3x3 matching template and action-conditioned prior
are still designed by humans (the matcher coefficients ARE trained); V17 outputs
are fixed compass directions, so arbitrary body rotation and global map discovery
without an initial map are not solved.

The V17 original actor still uses the whole retina, and the new body perspective
is an opt-in FROZEN evaluator, not a silent replacement for production training
decisions. This prevents regressing an already working V17 brain. The localizer
learns its coefficients during real V17 TRAINING observation and is used on unseen
mazes in frozen comparisons. The existing PyTorch shared model remains separately
trained on text, maze and toy transformation events. Positive transfer from
natural language to local-map navigation is NOT YET demonstrated.

Under original V17 GPU maze batching, only a representative replay subset is
emitted as per-action V17 JS training transitions, so sidecar training counts
are **NOT** equal to the number of GPU-simulated maze worlds. UI must report the
actual counts, not multiply them by the GPU batch size.

Extra steps may result from limited motor knowledge, pose ambiguity, or poor
trust/exploration decisions; per-step trace and negative controls are needed to
attribute cause. The shortest path oracle is used solely as an evaluator.

## Clone and run, no overwrite

Execute in **Windows PowerShell**:

\`\`\`powershell
$ErrorActionPreference = "Stop"
$branch = "experiment/ISOLATED-V17-BODY-PERSPECTIVE-20261106"
$dest = "D:\MagicPerspective-BodyPerspective-Isolated"
if(Test-Path -LiteralPath $dest){throw "Destination already exists. Refusing to overwrite."}
git clone --single-branch --branch $branch https://github.com/dan3s2020/MagicPerspective.git $dest
if($LASTEXITCODE -ne 0){throw "Clone failed"}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_BODY_PERSPECTIVE.ps1"
if($LASTEXITCODE -ne 0){throw "Startup error"}
\`\`\`

URL: \`http://127.0.0.1:8876/transcend/torus-aether/ui/index.html?live=1\`.

Default corpus: \`D:\training\OpenThoughts3-1.2M\`; custom path via \`-Data\`.
By default the launcher **reuses** the independently verified CUDA Python
\`D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space\.venv\Scripts\python.exe\`
WITHOUT modifying it or downloading another PyTorch wheel. To override pass
\`-PythonExe "D:\some_verified_env\Scripts\python.exe"\`.

Conservative first configuration on 4 GB RTX 3050 Ti:
\`GpuWorlds=16\`, \`GpuTextBatch=1\`, \`GpuTextChunk=32\`, \`Vram=1.8\` GB.
This is a safe starting request, not a promise of VRAM or 100% utilization.
Choose \`-Gpu off\` for explicit CPU-only startup without Python.
To inspect before starting use \`-Paused\`. Restart the SAME isolated clone to
resume; never move/rename its runtime folder during active training.

## Tests

CI \`.github/workflows/v17-body-perspective-isolated.yml\` executes syntax checks,
original V17 cross-domain experience tests, isolated motor-memory tests, actual
V17 maze physics with one global glimpse, three-way held-out comparisons, the
original native UI preservation contract, V17 frozen eval-worker checkpoint
isolation and Windows PowerShell launcher parser.

Local Node 22:
\`\`\`powershell
node --test "$dest\v17\transcend\torus-aether\perspective\body-perspective.test.mjs" "$dest\v17\transcend\torus-aether\perspective\body-studio.test.mjs" "$dest\v17\tests\torus-shared-perspective.test.mjs" "$dest\v17\transcend\torus-aether\shared\experience.test.mjs"
\`\`\`

The tests prove the explicit contracts they cover. They do not prove all
unrecovered Verbatim history, real RTX throughput, SLAM or universally
transferable high-dimensional intelligence.
