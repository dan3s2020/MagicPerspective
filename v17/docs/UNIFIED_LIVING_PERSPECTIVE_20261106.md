# MagicPerspective V17 — Unified Living Perspective, first live integration

Source basis: original `v17-torus-aether` graph visualizer and trainer preserved byte-for-byte except for explicitly listed, small integration hooks. Base ancestry: `experiment/SHARED-TRANSFORM-PATH-PROOF-20261106`, which also preserves the isolated language experiments. This is **a functioning first integration slice**, not a universal language solver or completion of the full Verbatim architecture.


## NEW isolated Windows launcher (verified PowerShell 5.1 syntax)

From a fresh clone of this experimental branch, run:

```powershell
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File ".\v17\START_V17_UNIFIED.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Port 8862 -Gpu cuda:0 -GpuWorlds 128 -Vram 3
```

Open `http://127.0.0.1:8862/transcend/torus-aether/ui/index.html?live=1`. This is the **original V17 NestView** with extra panels, not a replacement UI. The launcher uses `v17/runtime-unified-20261106` inside the new checkout, never the older `runtime-devour` checkpoint directory; it resumes its own state by default. `-Fresh` makes a new training session and archives that branch's previous snapshots. It runs both original V17 GPU self-test and a new actual CUDA gradient self-test for the shared PyTorch learner; startup fails rather than claiming CUDA was used if either fails. GPU availability on the user's Windows machine has not yet been verified by this conversation.

The new **Evaluează modelul comun (înghețat, lumi nevăzute)** button calls `/shared-eval` and evaluates real held-out maze/transform actions using copies of the original learner. The command does not train on test transitions. It reports feature-space prediction MSE and identity baseline, **not** maze success percentage or language understanding. A held-out Q/A prompt is used without its answer if available. 

## What actually executes in the same V17 runtime

1. **Original V17:** `Brain` and `Discoverer` keep their original decisions, map generation, CUDA world batches, text-card learning, checkpoints, and 5D/NestView drawing. No existing trained weights are overwritten by the new head.
2. **Actual maze transitions:** `playExercise()` emits `(observed retina before, emitted action, observed retina after)`. Its BFS oracle distances and solution fields never enter the shared model.
3. **Actual transformations:** `Brain.playTransform()` and `playTransformsGPU()` emit `(observed board, emitted action, resulting board)` in the same queue. GPU replay is produced from the engine's real actual simulation, not a fabricated trace.
4. **Actual text-action interventions:** the previously implemented `CausalTextAgent` and `TextActionPaths` are recovered from `experiment/V17-CAUSAL-LANGUAGE-ACTIONS-20261106` and `experiment/V17-REAL-TEXT-NAVIGATION-20261106`. On **training-only** Parquet Q/A rows the text agent acts on draft-token worlds, sees before/after feedback, and emits actual observed edits into the same queue; it cannot read held-out answers. This is a limited symbolic text world: NOT evidence of natural-language causal semantics. The existing original V17 `Brain.learnTextGPU` continues unchanged.
5. **One PyTorch shared model per V17 brain:** `gpu/shared_perspective.py` trains a common 32D learned encoder `E`, action-conditioned latent state transition `T`, and projection `π` over a bounded batch of observations from all three worlds. All parameters are shared and updated together. Device is the **actual** configured device of the original V17 GPU Python process, CUDA only if PyTorch reports CUDA available. There is no silent fallback from CUDA to CPU.
6. **Same native UI:** existing `ui/index.html` and `ui/app.js` remain the trainer/graph viewer. An additional observational panel renders 2/32 measured model coordinates for actual before, predicted and observed states and shows learning errors. The existing graph/camera controls, maze, evaluation, pause/save/replay and other panels are not replaced. The measured two-coordinate projection is a view of a trained vector and is **not proof of intrinsic dimensionality**.

## Model objective

For a source observation `o`, action `a`, and actual successor `o'`, the model learns:

`z=Eθ(φ(o))`, `z'=z+Tθ(z, ψ(a, domain, context))`, and `ô'=πθ(z')`.

`φ` and `ψ` are fixed stable hashing featurizations of observations and actions; **only E, T, π are learned**. The loss is reconstructed successor MSE + latent next-state consistency + source reconstruction. A single common optimizer updates the shared weights from maze, transform and text examples. The learner receives no BFS optimal path, hidden action physics, or held-out reference answer. It has not yet learned latent action alignment across unrelated domains or higher-dimensional planner policies.

## Honest limitations

- The shared head currently predicts hashed next-state features, **not** whole symbolic future trajectories or a language answer. The original V17 maze planner is still a separate actor.
- Cross-domain *parameter sharing* now occurs at actual training time; **positive cross-domain transfer is not established**. A fair target-only equal-compute baseline and held-out transform-family ablations remain mandatory.
- The original V17 GPU world runner produces many world results but originally replays a subset into the JS brain. This first integration uses the replayed **observed** transitions, not a falsely claimed complete per-world GPU transition stream.
- The text-action world manipulates drafts with opaque tools and lexical training rewards. It is not natural-language semantics or real-world causal grounding.
- The new weights are saved separately at `<brain save>.shared.pt` after each gradient batch; the language action state is separately saved at `<brain save>.causal.json`. Existing `.v8` files are unchanged. Original pause/save and resume still operate; shared state is loaded on the next GPU batch. Recovery of a crash occurring between sidecar and brain saves is not transactional.
- When the GPU selector is **off**, shared transitions are collected but the PyTorch shared head does not train. Select `cuda:0` with actual CUDA installed, or `cpu` for explicit real CPU tensor learning. The UI must not report CUDA where unavailable.
- This branch is an isolated opt-in experimental checkout, not a modification to the existing user's D: installation or `main`.

## Run and check

Clone the experimental branch into a **new** directory; never overwrite `D:\MagicPerspective` or an existing checkpoint path. From repo `v17/`, run:

```powershell
node --test tests/torus-shared-perspective.test.mjs
node --test transcend/torus-aether/shared/experience.test.mjs
$env:PYTHONPATH = (Resolve-Path 'transcend/torus-aether/gpu').Path
python -m unittest test_shared_perspective -v
powershell -ExecutionPolicy Bypass -File .\START_V17.ps1 -Workers 1 -Arms stable+many -Mem 3 -Worlds text,maze,transform -Gpu cuda:0 -GpuWorlds 256 -Vram 3 -GpuUtil 100 -Resume
```

The native UI is served at the original V17 URL (`http://127.0.0.1:8841/transcend/torus-aether/ui/index.html?live=1`). To prevent collisions with the existing local server, modify the **new clone's launch arguments** to use a different available `-Port` where supported; inspect `START_V17.ps1` before starting two V17 copies. The script above is intended for a new isolated run once the current port is free, not for overwriting a running service. Never set `-Vram` above actual available VRAM.

## Acceptance evidence

Local head-only Node and PyTorch CPU tests executed successfully; the separate V17 integration tests and CUDA on the user's RTX card must be executed in the actual checkout and are not falsely marked verified. Freeze and use untouched held-out world seeds to report actual transfer; never call a 100% maze solved rate proof of learned latent transfer.

## Files added / recovered

- `v17/transcend/torus-aether/shared/experience.mjs` and tests
- `v17/transcend/torus-aether/gpu/shared_perspective.py` and tests
- `v17/tests/torus-shared-perspective.test.mjs`
- `isolated/noise-space/text_action_paths.mjs` and `causal_text_world.mjs` (unchanged source blobs, with their original tests)

## Original files edited only at necessary hook points

`v17/transcend/torus-aether/worlds/exercise.mjs`, `devour/brain.mjs`, `devour/worker.mjs`, `devour/devour.mjs`, `gpu/worlds_gpu.py`, `ui/index.html`, `ui/app.js`.

## Future integration queue (not silently claimed to be merged)

- Reconcile `fix/V17-LIVE-STOCHASTIC-CONTROLS-ISOLATED-20261105` in original worker/brain without regression.
- Reconcile Python `experiment/PERSPECTIVE-EXPANSION-MULTISCALE-20261105` after matching its PortalEngine data contracts and training saves with V17.
- Integrate richer `feature/REAL-ABSTRACT-GRAPH-TRACE-20261103` views only after stable graph node/edge provenance and replay validation.
- Add held-out structural transfer and automatic target-only control, learned correspondence between action groups, action-conditioned multi-step planning and actual representation-lifting tests on original and language tasks.

**Status: working source integration scaffold with locally verified model tests; full device-level acceptance pending.**
