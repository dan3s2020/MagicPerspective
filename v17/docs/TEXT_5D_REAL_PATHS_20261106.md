# MagicPerspective V17 — Actual text trajectories in learned 5D space

Date: 2026-11-06. Branch: `feature/V17-NATIVE-SELF-CODE-PORTALS-20261106`.

## No demo claim

This adds **observability** to the real V17 worker, frozen evaluator and native
chat. It does not introduce a fake level, a scripted labyrinth, a target oracle,
or replace the original NestView, CUDA trainer, checkpoints, or old 2D maze UI.

The visualized *space* is derived from **actual `GraphTrace.geo.U` coordinates**
for individual symbols, learned in the V17 5D torus. Each context state is a
circular mean of the 12 most recent character locations, to respect all five
periodic axes. This averaging/projection is a visualization operation. It is NOT
an independently trained learned embedding for the meaning of a whole sentence,
nor evidence that the brain has solved an autonomous 5D maze.

## Three independent sources of real events in the same original interface

1. **Training live**, inside **Grafurile care devorează acum**:
   - `Brain.live()` explicitly tags real text observations. `GraphTrace` records
     `textSteps` from real experienced symbols, never a predetermined animation.
   - CPU text: orange candidate is the AligningGraph prediction before the true
     observed symbol. CUDA text: orange is the C/A graph guess during the real
     post-GPU learning replay. CUDA's batched AligningGraph accuracy does NOT
     provide individual GPU guesses to the JavaScript worker; the UI must not
     attribute the C/A samples to it.
   - Blue: the actual input symbols the brain experienced. Red: mismatches.
     A **global pre-answer prediction is not measured in this training snapshot**.
   - Last 512 real text events are retained for interactive inspection; the
     original entire training trace is not stored in this small UI ring buffer.

2. **Unseen text**, in **Evaluare → text nevăzut → Evaluează**:
   - The original frozen `Brain.evalTextExercises()` reads the entire held-out
     exercise with `AligningGraph.readFrozen()` (teacher forcing), **without
     learning**. Separately, `AligningGraph.write()` starts from the question
     ONLY and generates the full *gold open-loop shape* before seeing the answer.
   - 5D gold line: predicted free-running answer from question alone.
   - 5D blue line: later-observed held-out truth trajectory.
   - Orange links: each separate teacher-forced predicted next character.
   - Red: wrong guesses/shape divergence.
   - Cyan: up to three genuine new `AligningGraph.write()` rollouts after
     revealing only a **previous observed prefix**, bounded to 64 characters per
     checkpoint. Future truth is NEVER passed to the predictor in these calls.
   - These cyan lines are evidence of **recalculation after observing an error**,
     *not* proof that the autonomous cursor chose a new path and reached its goal.
   - The original percentages, including `shapeSame`, are unchanged.

3. **Real `Brain.chat()`**, in the original **Vorbește cu el** and its accompanying
   **Angrenaj nativ V17** box:
   - If `NativeGearDrive` has an observed operator route supporting a goal,
     `Brain.chat()` emits those actual verified characters, returns the operator
     steps, and records macro-operation + character nodes in the original graph.
   - Purple: supported learned macro-operators; blue: actual emitted characters.
   - A potential second route is computed by excluding the first chosen
     observed operator and searching again. It appears ONLY if the alternate
     evidence-backed search really succeeds. Otherwise the UI says no second
     route was observed; it does NOT invent a branching maze.
   - If the native route is unsupported, the original `AligningGraph` response
     remains the output and the UI labels the fallback explicitly. There is no
     dishonest label saying the native system generated it.
   - There is no external target observation during free chat; therefore the
     UI does not fabricate real error correction for a successful native chat.

## UI

Three existing-page sections render an interactive canvas with: global plan,
observed path, predicted per-step branches, actual measured errors, genuine
post-observation recalculations; individual step controls, playback, speed,
5D rotation, zoom, W/V slice thickness, pan, and fullscreen. For very long
experiences, plotted polylines are sampled to cap rendering cost, while the
full original character arrays and exact per-step inspection remain available.

The canvas displays a 2D projection of 5D phase coordinates (not a flat invented
network). Time is represented explicitly by the cursor step slider, not treated
as a learned extra spatial coordinate. A missing symbol geometry is shown as
missing, rather than assigned a fake 5D coordinate.

## Files changed

- Existing original V17: `devour/brain.mjs`, `devour/trace.mjs`, `devour/worker.mjs`,
  `ui/index.html`, `ui/app.js`, Windows launcher.
- New: `ui/text-journey5d.mjs`, `ui/text-maze-viewer.mjs` and tests;
  `scripts/test-v17-text5d-pipeline.mjs`.
- Existing CUDA backend and original 2D maze algorithms remain unchanged.

## Acceptance and limitations

Pure coordinate and rendering data tests passed locally (6/6 source tests and
1/1 mocked-canvas test), including an exact 35,050-step trace with bounded plotted points. More regressions are added to the Windows launcher.
There was **no successful end-to-end Windows CUDA + browser test** in the authoring
environment; the user's Windows test must confirm the full pipeline.

From PowerShell in the updated local checkout:

```powershell
& node --test .\v17\transcend\torus-aether\ui\text-journey5d.test.mjs .\v17\transcend\torus-aether\ui\text-maze-viewer.test.mjs .\v17\transcend\torus-aether\devour\brain.text5d.test.mjs .\v17\transcend\torus-aether\devour\trace.text5d.test.mjs
# Once the real trainer is running and has saved at least one batch:
& node .\scripts\test-v17-text5d-pipeline.mjs 8872 0
```

This verifies genuine `/graph` per-character training events, `/eval` frozen
predictions/5D geometry/replans, and `/chat` native/legacy provenance. These
checks are stronger than screenshots, but **do not** establish universal
reasoning, a perfect N-D path prediction, or autonomous error-correcting navigation.
