# MagicPerspective — isolated Noise Space / Hyperdimensional Research

**Branch:** `experiment/NOISE-SPACE-HYPERDIMENSIONAL-ISOLATED-20261105`  
**Directory:** `isolated/noise-space/`  
**Recommended Windows clone directory:** `D:\MagicPerspective-NoiseSpace-Isolated`.

This is a standalone, *experimental* noise-space tracker. It does NOT rewrite, replace, train, or modify the existing V17 brain, original UI, its A/B/C organisms, or checkpoints. It uses Node.js 20+ with **no npm dependencies**. By default, the data are an expressly synthetic Hénon dynamical system with several noisy observations.

## Included / tested

- Deterministic hidden chaotic trajectories, multiple observation functions, and fresh test trajectories.
- True time-delay reconstructions using present and past observations only.
- 5D historical features, 10-coordinate Plücker products of local displacements, and derivative-free metric perturbation search (inspired by DUST, **not** the full DUST algorithm).
- Prediction of another world's *future* observed slice using a model that only sees the source world's current/past observations.
- Controlled comparisons: instantaneous observation, delays, delays + geometry, learned metric, same-law transfer, independent false pairing, shuffled pairing, independent white noise.
- Held-out time split with an embargo; validation for metric learning and a separate test set. Reproducible seeds.
- One real-data-driven 5D graph with ten plane rotations, a slice selector, slice thickness, navigation, time replay, world filters, actual temporal edges, and quantitative prediction overlay.
- Continuous experiment mode, pause/resume/stop/save, atomic state persistence, local browser API, event import with explicit source provenance.
- `test.mjs` acceptance tests and isolated Windows launcher.

## Windows: clone/pull without touching existing versions

```powershell
$ErrorActionPreference = 'Stop'
$repo = 'https://github.com/dan3s2020/MagicPerspective.git'
$branch = 'experiment/NOISE-SPACE-HYPERDIMENSIONAL-ISOLATED-20261105'
$dest = 'D:\MagicPerspective-NoiseSpace-Isolated'
if (-not (Test-Path 'D:\')) { throw 'D: is missing' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git for Windows first' }
if (Test-Path $dest) {
  if (-not (Test-Path "$dest\.git")) { throw "Non-Git path exists, not touching: $dest" }
  $url = (git -C $dest remote get-url origin)
  if ($LASTEXITCODE -ne 0 -or $url -notmatch 'dan3s2020/MagicPerspective(?:\.git)?$') { throw 'Unexpected Git remote; refusing to modify' }
  if (@(git -C $dest status --porcelain).Count -gt 0) { throw 'Local changes detected. Commit or stash them yourself first.' }
  git -C $dest fetch origin $branch
  if ($LASTEXITCODE -ne 0) { throw 'git fetch failed' }
  git -C $dest checkout $branch
  if ($LASTEXITCODE -ne 0) { throw 'git checkout failed' }
  git -C $dest pull --ff-only origin $branch
  if ($LASTEXITCODE -ne 0) { throw 'git pull failed' }
} else {
  git clone --branch $branch --single-branch $repo $dest
  if ($LASTEXITCODE -ne 0) { throw 'git clone failed' }
}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\isolated\noise-space\START_WINDOWS.ps1"
```

After that, run the launcher directly. The UI is at `http://127.0.0.1:8897/`. The only persistent writes are under `isolated/noise-space/runs/`; those files are ignored by Git.

## Explicit external V17 events

Use `node server.mjs --events <your-own-jsonl>` or paste JSONL directly into the web UI. Required keys: `world`, `exercise`, `step`, `observation`. Optional: `coordinates` (5 numeric dimensions), `action`, `prediction`, `shared_id` **only when two perspectives are known to share the same hidden trajectory**. There is no automatic identity guess from similar-looking graphs.

Real cross-world transfer across unrelated text/maze/transformation episodes is **NOT yet demonstrated**. The algorithm reports `UNVERIFIED_NO_CORRESPONDENCE` until grounded paired events are supplied. The 5D time-delay visual graph is reconstructed from observations and timestamps; it is not claimed to be an intrinsically learned physical fifth dimension.

## Limitations / acceptance

1. Synthetic worlds intentionally share a latent trajectory. Success there is a positive control, not evidence about physical randomness.
2. Grassmann/Plücker features may underperform time delays on some seeds. Their benefit must be decided by held-out evaluation, never assumed.
3. The perturbation optimizer is a small derivative-free metric tuner; it is not an implementation of Qlabs DUST.
4. The synthetic time-delay reconstruction remains on CPU. The separate real-V17 Observatory can now use the original V17 CUDA batching functions for text, labyrinth and transformation-world physics after explicit CUDA installation. Actual RTX throughput/VRAM performance still needs measurement on the user's GPU. The JavaScript auxiliary geometry learner remains CPU.
5. No verified V17 training corpus cross-world alignment exists until event provenance and tests are added.
6. Original UI, V17 checkpoints, organisms, and projects remain unchanged; this viewer does not pretend to reproduce every historical Portal 4D UI feature.

The objective is to validate hidden-dynamics reconstruction and transferable transformations before proposing any integration with real V17 training.

## V17 read-only world exporter (separate execution path)

After Git cloning this branch, you can run the exporter against the included V17 source, WITHOUT altering V17 files:

```powershell
cd D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space
node .\v17_export.mjs --seed 11 --maze 20 --transform 20 --text 'D:\octopus-text.txt'
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\START_WINDOWS.ps1 -Events '.\runs\v17_events_11.jsonl'
```

`--text` is optional and must point to an existing text corpus; optionally add `--checkpoint PATH` for a V17 checkpoint to measure its text predictions read-only. Export records provenance for each event, with no assumed shared latent state across text/maze/transform. **This exporter is syntax-checked but has not been runtime-tested against V17 files in the user's Windows environment.** Real-world claims require held-out experiments and validation of the exported event sequences.

---

## REAL V17 OBSERVATORY — 2026-11-05

Default URL: http://127.0.0.1:8897/ — the real-backend observatory.
Synthetic comparison lab: http://127.0.0.1:8897/synthetic.html.
Legacy V17 dashboard: http://127.0.0.1:8897/v17.html.

### Provenance and replay

* Text: the ORIGINAL Brain.beginExercise, Brain.live and Brain.evalText methods. In CPU mode the UI shows the
  observed byte, pre-update alignment guess, alignment source and frozen evaluation accuracy. The original GPU TextCard
  returns batch aggregate alignment statistics, NOT a pre-update prediction for every character; the UI labels this distinctly.
  20% of a pasted/document corpus (or the dataset's own held-out rows) is held out of Brain.live in this worker. The persistence baseline
  repeats the previously observed byte. Existing V17 maps non-ASCII characters to '?'.
* Maze: original Brain.playMaze and Discoverer. The UI replays actual observed cells, actual
  chosen outputs, original anticipated paths and whether each output moved the organism.
  The BFS shortest path is an observer reference, not an input to the training policy.
* Transformation: original Brain.playTransform and causal learning. The UI replays true boards,
  goals, pre-action predicted next boards, actual next boards and prediction mismatches.
  A limitation report does not prove a level impossible.
* 5D graph: uses measured V17 Geometry positions and actual recorded edges, never substitutes
  invented positions for organism/A/C nodes without learned coordinates.

### Separate geometric learning module

The auxiliary learning_geometry.mjs uses genuine transition data from the V17 training worlds.
It trains three world-specific encoders and decoders and a shared 8D latent transition, with
10 Plucker coordinates from five-dimensional observed features. Its optimizer is analytic
SGD on next-state error plus a reconstruction penalty. It does NOT overwrite or directly
control V17 Brain parameters and is NOT the original DUST optimizer.

Every fifth global episode is withheld from the auxiliary geometry optimizer.
Its UI compares geometric prediction RMSE with a persistence model (next state equals
current state). BETTER requires >=20 withheld samples and >=5% less RMSE; WORSE is >=5%
more RMSE. Otherwise the interface labels the result INCONCLUSIVE or LOW_SAMPLE.
This is a held-out-episode comparison, not proof of cross-domain generalization.
The original V17 Brain continues learning during these episodes.

Shared latent parameters do not prove two worlds share the same hidden trajectory.
The exact DUST activation-perturbation optimizer, GPU-accelerated end-to-end training,
cross-lane coupling loss, and learned interventions in V17 action policies are not yet
implemented. These are research extensions, not measured capabilities of this release.

### Controls and storage

Run finite episodes, run infinitely, pause/resume/stop between episodes, save, load,
or create a new isolated brain. New brain backs up existing isolated checkpoints.
The default written model files are under isolated/noise-space/runs/real-v17/ (test workers use separate isolated session folders):
brain.v8 (original Brain serialization), geometry.json and observatory.json.
Original V17 files are not edited.

Windows startup:
    powershell -NoProfile -ExecutionPolicy Bypass -File D:\MagicPerspective-NoiseSpace-Isolated\START_NOISE_SPACE.ps1

Validation:
    node --test isolated/noise-space/test.mjs isolated/noise-space/v17_smoke.test.mjs isolated/noise-space/observatory.test.mjs isolated/noise-space/http_observatory.test.mjs

GitHub Actions on this isolated branch executes these tests and verifies Windows PowerShell syntax.


### Optional real CUDA accelerator (separate installer)

The synthetic noise-space comparison experiment continues to use JavaScript CPU. For real V17 worlds:

1. Update the isolated Git branch and STOP the existing local server with Ctrl+C.
2. Install CUDA PyTorch only inside the isolated directory:

       powershell -NoProfile -ExecutionPolicy Bypass -File D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space\SETUP_CUDA_WINDOWS.ps1

   The setup verifies PyTorch device availability and runs the original V17 CUDA world self-test.
   It does not install/overwrite Python into the original V17 folder. Default VRAM budget shown
   in the dashboard: 2.6 GB for the RTX 3050 Ti 4 GB (configurable 0.5-3.8 GB).
3. Restart the existing launcher, enable "Original V17 CUDA batches", select parallel worlds,
   and optionally supply an actual Parquet Q/A dataset folder.
4. The GPU status panel reports device, actual VRAM allocation from the V17 batch worker,
   batch count, elapsed milliseconds and measured worlds/s. A failed CUDA init never
   silently becomes CPU training. Select CPU deliberately to continue without CUDA.

The CPU-only startup and regression tests work without Python, NumPy, Torch or CUDA.
Only the optional GPU-protocol acceptance test requires NumPy. In CI it runs on the
NumPy backend, confirming commands and original physics/learning flow **without claiming CUDA**.

### Text plateau / "stuck around 56–60"

The original default text corpus is a finite V17 documentation file. Continuing infinitely
after the cursor wraps reuses those same training bytes; it does not produce new examples.
The previous observatory repeatedly evaluated the same 420-byte heldout prefix and copied
cumulative values into the chart on every episode. Now:
* The corpus cycle counter and repetition warning are shown.
* Frozen text evaluations rotate through untouched windows (or separate Parquet heldout rows).
* Per-world geometric graphs plot only newly measured evaluations, and text accuracy has a separate chart.
* The Brain.full, alignment-memory size, heap/RSS, worlds per second and GPU errors are exposed.
* Exact text examples can come from the existing local V17 Parquet reader, not necessarily
  the small bundled documentation. Source changes preserve the Brain checkpoint unless the
  user explicitly presses "New isolated brain".

Checkpoint format v2 preserves the older state and adds corpus cursors, counts and event history.
On the first updated save, a previous format-v1 Brain checkpoint is also copied to a
timestamped immutable backup beside brain.v8. Later saves use the usual atomic V17 save routine.
Parallel CI test workers write to separate run folders, not the actual local Brain checkpoint.

See REGRESSION_TRACEABILITY.md for source-excerpt references, code paths, verified tests and
explicit open items. Full historical Verbatim completeness remains BLOCKED under the
canonical source policy; optional CUDA does not change that finding.


### Incomplete Torch environment repair (Windows)

Error example: \`ModuleNotFoundError: No module named 'torch.torch_version'\` from
\`isolated/noise-space/.venv/Lib/site-packages/torch/__init__.py\`.

This indicates that the selected local torch package cannot import completely.
Do **not** infer a driver/GPU fault before torch can import. The old launch wrapper
only checked the existence of \`.venv/Scripts/python.exe\`, so it could mistakenly
accept this damaged installation.

The corrected setup is **idempotent**: always run it when repairing or first
enabling CUDA, even when \`python.exe\` already exists:

    powershell -NoProfile -ExecutionPolicy Bypass -File D:\MagicPerspective-NoiseSpace-Isolated\isolated\noise-space\SETUP_CUDA_WINDOWS.ps1

It performs these steps:
1. Run \`CHECK_CUDA_ENV.py\` with the *actual local venv interpreter*. The probe
   imports \`torch\`, \`torch.torch_version\`, and \`numpy\`; requires
   \`torch.cuda.is_available()\`; executes and verifies a real CUDA matrix multiply.
2. If that fails, choose a validated external Python 3.10–3.12 interpreter,
   remove **only** the known local \`isolated/noise-space/.venv\` dependency folder
   (refusing linked folders), and create a clean virtual environment.
3. Reinstall NumPy from pip and the CUDA PyTorch wheel with \`--no-cache-dir\`.
   Defaults to \`cu126\`. \`-Cuda cu130\` is available for users with a compatible
   driver; do not assume driver support.
4. Re-run the real CUDA probe and the original V17 512-world CUDA self-test.
   Installation is not considered healthy unless both succeed.

Existing \`runs/real-v17/brain.v8\`, \`geometry.json\`, \`observatory.json\`, all
other runs, Git history, original \`v17\` source, and user files remain untouched.
If the probe fails on normal launch, \`START_WINDOWS.ps1\` permits explicit CPU
training without pointing V17 to an invalid GPU Python. It will not claim CUDA
is active when CUDA verification fails. The repair script needs internet access
and enough disk space for PyTorch CUDA wheels.

Windows PowerShell parse and Python syntax are checked in CI. End-to-end
RTX 3050 Ti execution remains to be verified on the user's actual NVIDIA GPU.
