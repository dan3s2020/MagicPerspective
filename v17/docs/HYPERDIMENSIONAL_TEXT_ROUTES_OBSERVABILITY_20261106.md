# MagicPerspective V17/V18 · Hiperlabirint 4D / 5D text — observability contract

Branch: `experiment/V18-SUCCESSOR-TIEBREAK-INTEGRATED-20261106`

## Existing mechanisms, not a demo

This changes the **existing live V17/V18 UI** by adding the navigation tab
`Hiperlabirint 4D · trasee` (full-viewport overlay; native V17 training,
evaluation, original 2D maze, graph, checkpoints and GPU remain available).

URL:

`http://127.0.0.1:8893/transcend/torus-aether/ui/index.html?live=1`

The new tab has TWO different modes, because they must not be mistaken for
one unified semantic maze already learned:

### V18 · real observed language-world routes

- Load an actual previously observed training Q/A or enter a new prompt.
- The server uses `/language-maze/analyze`, which evaluates the original
  and the hybrid plans on the **same frozen in-memory training-world snapshot**.
- **Gold**: `globalPlanNodes`, the original V17 attraction-based global
  shape computed before the local body's first action.
- **Turquoise**: `pathNodes`, the locations ACTUALLY entered by the local
  body policy; the canvas draws only the steps reached so far.
- **Gray**: every alternative REAL directed edge in the learned prefix
  topology. Terminals come from previously experienced responses; they
  are not a hidden-answer oracle for a new question.
- **Purple dashed**: the original V17 law freshly recomputed from the
  current actual local position, before the next local action. Each step
  has `replans` data from the worker, including path preview, total length,
  whether it differed from the initial global shape, and provenance.
  Crucially, it is an **observational replan**: existing local movement
  still uses the original preserved field and no held-out or new
  observation enters the frozen replay. A zero revision count is a real
  result, not a hidden animation.
- **Orange**: the actual current body/cursor position.
- The side panel shows predicted vs executed character, conductance/attraction
  values, successor values, alternative local actions, first route divergence
  and measured revisions.
- Replays expose up to 4096 fully instrumented character actions on the
  original worker and use genuine hierarchical submaze recalculation on
  previously observed long corridors.
- A known-answer prefix graph is a *directed trie*, not proof that two
  independent paths reach the SAME goal. It may contain branches ending
  in different previously observed answers. That difference is intentional.

### V17 · original unseen text evaluation and imagined full answer

- The frozen V17 brain via the original `POST /eval` API remains untouched.
- The existing Evaluare tab now emits the actual result to this viewer,
  so clicking `Vizualizează testul V17 deja evaluat` reuses the same
  measured exercise. Any of its multiple exercises can be selected.
- Alternatively, `Evaluează 1 text nevăzut` performs a new frozen test;
  max 20,000 exercise characters, no training. The original `Brain`
  implementation itself limits *initial answer imagination* to 3,000
  output characters. That limit is exposed, not silently extended.
- **Gold** is the response imagined BEFORE reading the correct answer.
- **Turquoise** is the next-character guess made while READING the true
  exercise prefix (teacher-forced); it is **not** autonomous cursor
  navigation through a learned answer maze.
- **Purple** is the hidden reference, used here exclusively to visualize
  and score predictions; it never enters the V18 planning API.
- Visualized discrepancies tell us where the predictions differ. Do not
  mislabel them as V18 path replanning or independent valid routes.

## 5D learned torus and 4D representations

There are two deliberately distinct geometry choices on the sidebar:

**Actual original V17 5D torus (`Geometry.U`)**:

- The server already exports original learned `Geometry.U` in
  `GET /graph?w=<brain>`. Every known byte/symbol has a real
  five-component toroidal coordinate, trained from symbol transitions.
- The viewer uses **exactly** the learned `U[0..3]` components to
  project 4D into the 2D canvas, plus `U[4]` for the fifth-dimensional
  slice. The XW/YW/ZW controls perform genuine 4D coordinate rotations.
- Repeated instances of the same symbol share its actual native location;
  no independent state or native embedding is invented for a text prefix.
- Unknown characters/root states have no native embedding and are skipped.
  Toroidal seams can make short periodic distances appear as long
  projected segments; the UI warns about this.
- This is a learned 5D **symbol** geometry, not evidence of a 5D network
  of every possible full language state.

**V18 4D diagnostic path topology**:

- `X`: distance along real learned graph edges; `Y`: deterministic
  layout of real observed alternatives; `Z`: original V17 attraction;
  `W`: trained/empirical successor occupancy.
- All four scalars come from the observed backend, but they are **derived
  visual coordinates**, not neural latent dimensions.
- For the frozen V17 test the four diagnostic axes are answer position,
  prediction track, actual/guessed character code and mismatch with
  hidden reference. These are prediction sequences, not a learned maze.

Both spaces support camera rotation, zoom, fifth/fourth coordinate slicing,
global vs local cursor-following, time slider, next/back, start-before-action,
and replay. Display code runs in the existing webpage; there are no mock
dataset paths, separately simulated brains, or fixed outcome percentages.

## Acceptance and limitations

- Native V17 2D maze `Discoverer.shape()` is not edited.
- Original V17 `Brain.evalTextExercises()` is not edited.
- V18 successor learning still updates from all confirmed training Q/A.
- Original V18 `plan()` defaults to no observational replay overhead.
  Only `/language-maze/analyze` explicitly activates stepwise repropagation.
- Original plan and local actions are unchanged by the viewer and by the
  observational recalculations. Replans do not cause new learning.
- GitHub CI checks old V17/V18 tests, syntax, native HTTP, live DOM
  simulation, frozen V17 evaluation reuse, 15,000-node geometry,
  true 5D U coordinates, and replan tests with 1024-character hierarchy.
- A real learned 5D torus does not automatically imply the organism has
  discovered the correct unknown semantic answer or a physical quantum
  mechanism. That remains an experimental question.

## Safe update

Save and stop the running program (Ctrl+C after saving), then:
```powershell
$ErrorActionPreference = "Stop"
$dest = "D:\MagicPerspective-V18-Successor"
$branch = "experiment/V18-SUCCESSOR-TIEBREAK-INTEGRATED-20261106"
if (!(Test-Path "$dest\.git")) { throw "Checkout not found: $dest" }
if ((git -C $dest branch --show-current).Trim() -ne $branch) { throw "Wrong branch. Refusing overwrite." }
if (@(git -C $dest status --porcelain -uno).Count) { throw "Working tree has modifications. Refusing overwrite." }
git -C $dest pull --ff-only origin $branch
if ($LASTEXITCODE -ne 0) { throw "Git pull failed" }
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_SUCCESSOR_V18.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Gpu "cuda:0" -Port 8893 -Workers 1
```

The above does not stop or replace another agent's checkout and does not
modify existing V17 notebooks or checkpoints.
