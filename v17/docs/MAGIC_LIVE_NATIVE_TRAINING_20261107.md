# MAGIC PERSPECTIVE · THE LIVING AETHER — real native V17 training + magic UI
Date: 2026-11-07
Branch: feature/V17-REAL-LIVE-AXES-MAZE-20261107
Keep as isolated draft. The functioning original V17 UI and the user's old real-axis sidecar output are untouched.

## Fixed the user's actual complaint

The previously suggested START_REAL_TEXT_AXES.ps1 was a **separate CPU-only research trainer**, and intentionally did not run the native V17 HTTP server or a graphical UI. Seeing {"rows":250,...} after many minutes did not mean the live graph would ever appear. The slow sidecar saved only every 5000 rows (unless completion), so one cannot claim that its 250 rows were checkpointed. Do NOT delete or overwrite that folder.

The NEW START_MAGIC_REAL.ps1 starts the **ORIGINAL V17 devour worker** on the real OpenThoughts3 corpus with --start, --resume, --magic-view, --math-axes, GPU cuda:0 by default and live native text, maze and transform worlds. It starts the EXISTING original HTTP server and automatically opens the new magic.html. It preserves the entire original index.html as an alternate live view.

## Windows PowerShell command (new isolated clone)

    git clone --single-branch --branch feature/V17-REAL-LIVE-AXES-MAZE-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-Magic-Live

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Magic-Live\v17\START_MAGIC_REAL.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Magic-Run" -Port 8874

The script will run the original START_V17.ps1 and test actual PyTorch CUDA, shared learning and GPU world/gradient selftests before training. It will STOP with a visible error rather than silently fall back to CPU if CUDA is unavailable. The original JavaScript Brain still performs some graph integration, text contexts and research-axis observation on CPU; do not claim that literally every operation is CUDA.

If port 8874 is occupied, choose another with -Port 8894. The launcher checks this before invoking training, preventing a headless background run.

To resume, run EXACTLY the same command. The isolated folder contains a marker tying the saved runtime to the original dataset path and refuses to touch a nonempty unrelated output folder. The native saved .v8 is in:

    D:\MagicPerspective-Magic-Run\brains\brain-0-stable+many.v8

The observed math fields are saved in a separate companion file:

    D:\MagicPerspective-Magic-Run\brains\brain-0-stable+many.v8.observed-math-axes.v8

Old original checkpoints are not overwritten. Use Ctrl+C to save and exit through the original V17 worker.

The living page opens automatically:

    http://127.0.0.1:8874/transcend/torus-aether/ui/magic.html?live=1

The unchanged original V17 page still works:

    http://127.0.0.1:8874/transcend/torus-aether/ui/index.html?live=1

## Magical live experience, no decorative fabricated paths

The new magic.html and magic.js are a second non-destructive UI rendering:
- The real 5D phases U of learned ORIGINAL V17 symbol geometries, with original GraphTrace nodes/edges and cause-derived C/A neighbor placements (derived coordinates are labeled as such).
- Real before-answer **global predicted solution shape** from the original 6-context-scale constructed text path model, including the original local body actions, observed deviations, learned alternatives and corrective re-plans. It never shows a completed answer not predicted by native V17.
- Live worker options for Start, Pause, Save and Apply Noise; these actually call /control and /controls on the ORIGINAL HTTP worker.
- Actual graph selection, state, real text/token/state/operator counts, real CUDA text batch phase and VRAM metadata if present, real per-worker telemetry, live corpus excerpt.
- Real observed source of adjacent numerical expressions and contextual text scale trust/accuracy from the original worker.
- Frozen /real-math-plan goals: start numeric expression plus an INDEX/VALUE constraint, NOT the complete correct answer. The reply includes learned transformations, predicted state path, and any discovered path-area/holonomy effect. If no observations explain the goal, it reports FAILURE rather than generating a fake trajectory.

## Why mathematical research is now actually wired

The original native devour worker calls the opt-in LiveObservedMathAxes.consume() on text the original worker actually lived during training, including OpenThoughts Parquet Q/A and TXT, with no held-out data. The extractor accepts only actual adjacent numerical equations or explicitly written arrows in each SAME training row. This is a heuristic that treats textual succession as potential transformation examples; the model still must validate generalization. It never interprets unrelated consecutive paragraphs as valid interventions.

The observed equations train the existing isolated CoupledTextMaze and StateDependentTextAxes. Their state and evidence persist independently alongside the native Brain checkpoint. The original AligningGraph prediction code and established controls are left unchanged and continue learning concurrently.

Novel numeric goal test from evidence (held out as a starting state):

    "5 * 6 = 30" -> "6 * 6 = 36" -> "6 * 7 = 42"

The experimental nonlinear field learns action-conditioned relationships from observed equation pairs. The arithmetic model has a known integer-template inductive bias, so this does NOT prove automatic general natural-language understanding, mystical dimensions or a universal mathematical algorithm. Holonomy path memory is reported only when the model has evidence.

## Grounded tests

GitHub Actions in .github/workflows/v17-real-magic-native-live.yml:
- Actual original V17 server started on a random real local TCP port with a real TXT document and original text, maze, transform worlds.
- New magic.html and magic.js returned HTTP 200 while original V17 UI remained intact.
- Browser Chrome headless actually loaded the new UI.
- Native V17 worker produced a live graph with nonzero 5D coordinates, measured nodes and edges, observed text operators and native telemetry.
- Native BEFORE-answer text-maze response had real frames, source and no answer leak.
- Real observed math expressions trained nonlinear and coupled field, trained state persisted to a separate on-disk save, frozen numeric goal endpoint worked.
- Source-level safeguard and original V17 live UI/observed-transformation regressions.
- All previous synthetic 2048D and actual project-document frozen-text tests.
- Windows PowerShell parser, preflight safety and refusal to overwrite an unrelated existing output (separate Windows job; check actual workflow status before claiming it passed).
- No NVIDIA hardware in the hosted CI; therefore RTX 3050 Ti/CUDA behavior is not proved by CI. The Windows CUDA selftests run on user's own device at startup.

A verified CPU CI run before adding Windows checks passed 39/39 Node tests, including 2 native magic UI acceptance tests and 4 math observation tests.

## Operating caveats and honest research limits

"Magic" is presentation, not an assertion of supernatural physics.

Original V17 keeps its actual native graph, 2D maze, transformation games, learned 5D symbol torus, observed text paths and CUDA text learner. The new research mathematical fields do NOT yet replace original text generation decisions (AligningGraph.write()), and no test demonstrates a universal hyperdimensional solution navigator on unrestricted novel language. No fake independent semantic evaluator is attached; labels on path replays distinguish model effects from external correctness.

The new magic UI is a real live visualization and exploration instrument; it is not a separate mock graph. The previous CPU sidecar and experiment branches stay independent and unmodified. A single original V17 Brain remains the native text/maze/transform source; experimental math axes share its observed training stream but are saved in an explicit sidecar, not silently merged into every Brain object.
