# MagicPerspective V43 — DIRECT original V42 upgrade

**This V43 version is implemented and launched in `MagicPerspective`, NOT Braivour.** Built on exact original V42 branch commit `ac205b5bc561274b957584a7dee058a1110ab6f8`. Read [original V43 USER request](../verbatim/2026-11-08-V43-FUSED-TRAINING-USER-VERBATIM.md), [USER's direct-repository correction](../verbatim/2026-11-08-V43-REPOSITORY-AND-LAUNCH-USER-CORRECTION.md), [one organism original USER words](../verbatim/2026-11-08-QWEN-ONE-UNIVERSE-USER-VERBATIM-PARTIAL.md).

## Clean first installation with clickable path selectors

You do not need an earlier project checkout, Brain checkpoint, Braivour installation, Git repository, or launcher.

Paste the following into Windows PowerShell:

~~~powershell
$ErrorActionPreference='Stop'
[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12
$D='D:\MagicPerspective-V43'
New-Item -ItemType Directory -Force -Path $D | Out-Null
$Url='https://raw.githubusercontent.com/dan3s2020/MagicPerspective/feature/V43-NATIVE-V42-ONE-UNIVERSE-20261108/v17/v43/BOOTSTRAP_D.ps1'
Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile (Join-Path $D 'BOOTSTRAP_D.ps1')
powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File (Join-Path $D 'BOOTSTRAP_D.ps1')
~~~

The installer retrieves the native MagicPerspective V43 branch under D:\MagicPerspective-V43\source without Git. It never scans or modifies other drive folders. When Node 22+ or Python 3.10–3.12 is unavailable on PATH, Windows file pickers let you select existing executables. Canceling allows isolated downloads/installations under D:\MagicPerspective-V43\tools. Optionally select an existing CUDA-enabled Python; V42's original native CUDA self-test remains mandatory.

The Qwen file picker opens at **D:\LocalAi\models**. You select the exact .gguf file; its name is never guessed. The dataset folder picker opens under D:\training. Selected paths are saved to D:\MagicPerspective-V43\selected-paths.json for future runs. Qwen and the dataset remain in their existing locations.

With no V42 or V43 checkpoint saved, the launcher starts an original fresh V42 Brain in the V43 runtime. Subsequent runs resume its saved state. The original V42 browser UI and native Start Training control remain in use. Real on-device GPU and real Qwen training behavior remain to be measured locally.
## V42 → V43 (same native launch, same UI)

The launch entrypoint is **`v17/START_V43.ps1`**, beside `v17/START_V42_RESUME_V41_FAST.ps1`. It calls the **original** `START_V41_SPEED_PROFILE.ps1` → `START_HYPERMAZE_REAL_CUDA.ps1` → `START_V17.ps1` chain, and reuses the same V26-designed original native browser UI at its unchanged default localhost port **8962**. It does **NOT** launch Braivour or an additional UI/server, scan disks for directories, rename other projects, or replace the original V42 UI.

The original V42 runtime from `START_V42_RESUME_V41_FAST.ps1` defaults to `v17/runtime-v42-resumed-v41-fast`; V43 clones its original saved `brain-0-winner.v8` and *all associated sidecars*, verifying each file's SHA-256 and **original** `Brain.load`. It never writes to that V42 source. The separate V43 destination is `v17/runtime-v43-fused-v42`, with the original Brain and checkpoint support.

When started from the repo's v17 directory in Windows PowerShell:

```powershell
.\START_V43.ps1
```

The local GGUF file location cannot be invented by GitHub. **Only once**, if no V43 donor atlas has ever been saved, select the existing genuine Qwen model using the command's `-GGUF` parameter or the `MAGICPERSPECTIVE_QWEN_GGUF` environment variable. Subsequent V43 launches reuse the verified `runtime-v43-fused-v42/v43-qwen-donor.json` automatically, without asking again, scanning other drives, or starting another service. Existing original dataset location is inherited from V42. An alternate saved original V42 runtime can be passed explicitly through `-V42Out`; V43 does not guess alternate locations.

The launcher keeps original CUDA options and controls. Original worker starts paused for this V43 opt-in mode, so the **existing original Start Training button** launches the only configured V43 fused learning grounds. V42 launch behavior is unchanged without the V43 opt-in.

## Same organism's movements

These are not two teacher/student AI models. Player 1, Player 2, the text maze and the donor-weight movement field all belong to one original serializable V42 Brain.

1. On each **actual OpenThoughts training row**, original `ConstructedPathLearner.imagineText` predicts the form of the solution before new text observation; it is **not given the exercise reference or its length**.
2. The constrained Qwen brain is **physically moved** with original `Discoverer.shapeGraph()`-produced actions in the same Brain. This is the previous Braivour read-only 256-byte-coordinate physics with its original GGUF token-row indexing and sampled tensor axes PORTED INTO MagicPerspective. This does not load or execute Qwen's full 10 GB forward pass.
3. The movement trace freezes. Original `learnConstructedText` then learns from the **observed text physically produced by those Qwen-puppet movements**, if successful. The original native V42 text, CUDA, xD, maze and transformation organs also continue. The original observed text is not falsely relabeled as output of Qwen.
4. The original V42 navigator predicts a second time, without executing more donor movements. Per-exercise records contain full original text, full puppet output, the original before/after text and graph paths, exact wrong/correct character scores and movement-trace information.

**Evidence limitation:** a correct constrained puppet navigation or improvement on the same training row is not proof of unseen intelligence transfer, literal higher-dimensional physics, or that the entire Qwen network was absorbed. Unseen original text evaluation remains in the unchanged native V42 UI.

## UI

Original browser `public/native.html` and script `native-app.js` are unchanged. V43 copies the original UI as `public/native-v43.html` and adds only:
- V43 as the **sole selected** Start Training mode.
- **Hide/Show universe graph**, with the actual original graph still rendering when visible.
- Live prior/puppet/post accuracy curves; true fused exercise and character throughput, percentages including resumed V42 dataset progress, worker phase.
- A full-text current exercise comparison.
- Paginated append-only original exercise journal; wrong/correct characters and all original Qwen-coordinate actions for each exercise.

The native V42 UI bridge now serves this page **only when the V43 flag is active**, using its original port and existing control endpoints. No second HTTP backend exists.

## V43 CUDA conveyor, not a GPU utilization slider

See the [exact user's continuous-GPU directive](../../verbatim/2026-11-09-V43-CONTINUOUS-GPU-USER-VERBATIM.md).

The previous V43 processed a CUDA text batch, awaited its completion and then blocked the GPU with serial original JS symbolic/Qwen experience and UI recording. V43 now prepares a bounded next Parquet batch while CUDA is running; starts with eight original text exercises per GPU batch (up to the original 120000-character cap); and implements two-phase native CUDA dispatch/ordered commit using the original **unchanged** V42 `learnTextGPU()` mathematics. When possible, the next CUDA request overlaps previous batch CPU processing. All actual training stays inside ONE Brain.

**Correctness is more important than speculative speed:** original Qwen puppet actions and other worlds modify the same AligningGraph. If early CUDA work used an older trust state, the packet is rejected before Brain mutation, the original bounded CUDA text memory is reconstructed, and the packet is recomputed in source order. The system disables further speculative early-dispatch once this dependency is observed. This avoids duplicating native training, checkpoint inconsistency or using stale results. A pipeline that claims uninterrupted CUDA despite this dependency, without rewriting the dynamic symbolic parts, would be misleading.

The original UI now shows true physical NVIDIA driver `nvidia-smi` utilization and VRAM (if installed), queued rows, next-batch dispatches and dependency replays; these values are independent of `gpu-util=100`. The CUDA progress and end-to-end throughput are taken from the original worker, not simulated.

**Limitations:** this is a verified bounded feed/overlap improvement, not a full CUDA port of original `Brain.live` and Qwen movement. In the existing architecture CPU still trains portions of the dynamic symbolic organism; GPU SM occupancy cannot be guaranteed 100% until those parts are ported with validated parity and real RTX 3050 Ti benchmarks. Any observed GPU downtime must be shown honestly.

### Updating existing D installation, without reinstalling CUDA

The [safe D updater](./UPDATE_GPU_PIPELINE.ps1) replaces only the whitelisted native V43 source files after making rollback backups, leaving the Qwen GGUF, dataset, preselected paths, all prior checkpoints and existing Python CUDA environment untouched. It refuses to update a running trainer. After syntax and regression tests pass it starts the already-installed original V43 bootstrap with the previously selected model/data paths. To run only the source validation, use `-NoStart`.

## Validation

Run `node --test v17/tests/v43-native-one-universe.test.mjs`. GitHub Actions workflow `.github/workflows/v43-native-magicperspective.yml` tests original Brain source, full UI ID parity, causal graph movement with **synthetic** donor coordinates, real native V8 save/load and journal UTF-8 reverse pagination, plus Windows PowerShell syntax.

Testing with user's personal GGUF, dataset, checkpoints and RTX 3050 Ti remains **UNVERIFIED** until physically executed there; no claim of 100% independent unseen text accuracy.

## Source integrity

V42 original implementation `devour/brain.mjs`, `worlds/exercise.mjs`, `worlds/constructed-paths.mjs`, CUDA physics and original UI `native.html` remain unchanged. Original worker receives only opt-in V43 hooks; startup defaults remain as they were without V43. See [source-to-change contract](../user-intent/changes/2026-11-08-V43-MAGICPERSPECTIVE-DIRECT.json).
