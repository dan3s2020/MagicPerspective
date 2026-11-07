# V27 UI-only regression repair — same native V17 training and same exact measurements

## Correction (user exact instruction)

Exact user instruction preserved at verbatim/2026-11-07-V27-UI-ONLY-METRICS-CORRECTION.txt: "ti-am zis SA SCHIMBI UI-UL NU SCOPUL TRAININGULUI!!! TREBUIA SA PASTRAM ACELEASI MASURATORI CA SA PUTEM COMPARA"

V26 changed the scientific experiment. It created six externally defined corpus-word substitutions and measured their exact replacement rate, rather than continuing the original native language world's heldout predictions, ALIGNED and full solution shape. That must NOT be called equivalent or compared numerically to original V17/V20/V21/V25 scores.

V27 corrects the UI boundary **without deleting V26**. This isolated branch starts from V25, not V26. Original native training source and original UI remain completely unchanged. No historical checkpoint, dataset split, noise mechanism, original algorithm, live endpoint or evaluation denominator was modified.

## New files, exact compatibility

- New view: v17/transcend/torus-aether/ui/v27-studio.html
- New styling: v17/transcend/torus-aether/ui/v27-studio.css
- New read-only live dashboard: v17/transcend/torus-aether/ui/v27-studio.js
- Strict metric projection: v17/transcend/torus-aether/ui/v27-native-metrics.mjs
- Original unchanged scripts: app.js, text-hypermaze-live.js, veil-aether-live.js
- Native runtime: the existing v17/START_V17.ps1 and transcend/torus-aether/devour/devour.mjs, not V26's session.mjs.
- Read-only dashboard obtains original /graphs response, preserving raw value paths and unchanged train/heldout split.
- All 216 original HTML IDs remain available; original handlers still call original /control, /controls, /eval, /shared-eval, /graph and /chat endpoints.
- New V27 renderer uses only GET /graphs; it has no new Start, Pause, Save, GPU or eval implementation or substitute.
- The existing graph, original hypermaze canvas, old replay, original GPU controls, text-eval tables and original checkpoint buttons remain operational through native scripts.

Original protected Git blob SHA checks are encoded in v17/tests/v27-ui-only-native-metrics.test.mjs. These include original maze, original V17 brain, UI script, UI HTML and original server. No byte changed.

## Original metric paths, NOT substituted

- Text heldout: gr.test.aligned, gr.test.live, gr.test.together, gr.test.C and gr.test.field; gr.test.n if available.
- Original maze: gr.maze.test.solved, .shape, .ratio, .n, and gr.maze.played.
- Original transformation: gr.transform.test.solved, .failedRate, .ratio, .saidLimitation, .impossible.
- Dataset: gr.progress.trained, .total, .heldOut, .remaining, .mode, .shards; precision matches the original dataset format and never rounds 6 / 1,200,000 to 0.00%.
- Measured PyTorch training loss from original graph payload if available; when omitted from /graphs the native old UI still exposes training loss from /graph. The V27 summary leaves unavailable fields as "—".
- Full original score tables, text character-by-character hit/miss visualization and test responses continue in original Evaluare panel, which the new navigation button opens using the unchanged original handler.

For valid A/B comparison use the same original train/test files, train and heldout split, chosen worker/arm, seeds, checkpoint, actual test count, temperature/noise and metric definitions. V27's dashboard is a visual projection, not a new experiment.

## Run

1. Start or continue the **original** V17 trainer, e.g. from repository root:

       powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Data "D:\training\OpenThoughts3-1.2M" -Resume

   To continue existing weights, provide the same original -Out checkpoint directory if you previously configured one. DO NOT accidentally reset with a new output folder, different arm, worker count or data split.

2. Open the new UI, against the already-running original backend:

       powershell -ExecutionPolicy Bypass -File .\v17\OPEN_V27_UI_ONLY.ps1

   Direct URL: http://127.0.0.1:8841/transcend/torus-aether/ui/v27-studio.html?live=1

3. To select an existing native worker, add &w=0 etc or pass -Worker 0 to the launcher. Selecting workers through original graph list also works.

4. All native controls and evaluations remain available inside the new layout. The old original view remains accessible unchanged at http://127.0.0.1:8841/transcend/torus-aether/ui/index.html?live=1 for side-by-side comparisons.

5. Run the protection test:

       node --test v17/tests/v27-ui-only-native-metrics.test.mjs

**Status:** UI-only implementation and exact frozen byte/parity checks are available. A working original trainer with actual user checkpoints is necessary to verify the full side-by-side A/B evaluation on the user's machine. No new accuracy or training-speed improvement has been claimed.
