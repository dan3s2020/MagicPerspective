# Octopus Torus / Read-only Observatory (additive stage)

## Exact baseline preserved

Source: branch `experiment/TORUS-AETHER-ABC-20261104` in `dan3s2020/OctopusV2`.
Do **not** replace `START_V17.ps1`, `devour.mjs`, the original `ui/index.html`, `ui/app.js`, `brain.mjs`, or `worker.mjs`.
This contribution creates a separate screen. The original screen is embedded at its original same-origin URL so all native buttons, event handlers, command routes, saved brains, graphs, tests, noise controls and navigation remain in the source they were built with.

### Start on Windows

PowerShell session 1 (the *existing* command, unchanged):

```powershell
cd D:\OctopusTorus
git status --short
git branch --show-current
git pull --ff-only
powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Workers 4 -Arms stable+many -Mem 3 -Worlds text,maze
```

The command assumes the directory is already tracking the experiment branch, and the configured OpenThoughts dataset is present.
PowerShell session 2:

```powershell
cd D:\OctopusTorus
powershell -ExecutionPolicy Bypass -File .\OPEN_TORUS_OBSERVATORY.ps1
```

Or open the URL directly:

`http://127.0.0.1:8841/transcend/torus-aether/devour/observatory.html`

The old UI remains at `http://127.0.0.1:8841/`; the original charts remain at `/dashboard`.

If `git branch --show-current` does not print `experiment/TORUS-AETHER-ABC-20261104`, **do not** assume `git pull` has fetched this version. Check `git remote -v` and confirm the working tree before selecting a new branch.

### Causal transformation world (concurrent branch addition)

The branch received an independent causal-world implementation while Observatory was being built (commit `a5eb5703d9ba09d459e71c2ebc8972bff42cf861`). Observatory now also displays real `transform.last.frames`, the desired goal configuration, intervention mode and unseen-test results. No frames are invented if this world is inactive.

To enable that world in a **new** run, the underlying engine supports:

```powershell
powershell -ExecutionPolicy Bypass -File .\v17\START_V17.ps1 -Workers 4 -Arms stable+many -Mem 3 -Worlds text,maze,transform
```

This is optional; the exact original command above remains valid. Verify save/restore compatibility before changing a running checkpoint's worlds. The `-Mem 3` budget is **per graph**: four workers can need roughly 12 GB of RAM plus runtime/OS overhead.

### Source/visualization contracts

- `/graphs`: actual worker identity, arm, configured worlds, and status.
- `/graph?w=N`: real GraphTrace nodes, edges, 5D symbol positions (`U`), recorded symbol transitions (`flow`), and held-out results.
- `/state`: measured held-out test history, not interpolation.
- `../ui/view5.mjs`: unchanged 5D torus cut-and-project geometry (real periodic lattice image generation and rotation).
- `observatory-core.mjs`: no random node placement. Symbol nodes use saved learned torus coordinates. A/C nodes with observed symbol links get **estimated** periodic barycentres (unfilled outlines). Others remain explicitly unplaced.
- `observatory.mjs`: draws observed edges; shows recently **reported** transitions as one-shot delayed replay, not synthetic ongoing neural activations. The fifth coordinate is a torus coordinate, **not time**.
- `observatory.html`: own split view with a complete same-origin iframe of the original UI. Split/visual/native viewing is only a layout preference; it does not alter training.
- `OPEN_TORUS_OBSERVATORY.ps1`: opener with live server check; does not launch an additional worker or change engine options.

No direct write to the training API is made by Observatory. Changes to training are made through the original embedded UI's original handlers.

### Regression contract

```powershell
node --test .\tests\torus-observatory.test.mjs
```

The tests check the native controls including every per-graph action (start/pause/save/reset/remove), circular 5D geometry, missing-coordinate honesty, measured births, and the read-only shell.

Before release, run the existing project test suite too and verify visually on Windows: native Start/Pause/Save/Reset/Remove, All Start/Pause/Save/Reset, Add Graph, text+maze, maze rendering, navigation X/Y/Z/W/V, all 10 plane rotations, writing, reset, held-out evaluation, the original dashboard, resume/save and a no-regression checkpoint restore. This has **not** been certified on the user's Windows computer.

### Research still to implement and validate separately

The new visual layer does **not** by itself train a universal causal state-transition model, discover new actions, program weight-space transformations, perform real 5D physics, prove fractal organization, or show that cortical columns/crystal patterns and learned graphs are literally the same physical object.

A specialized action-effect learner and counterfactual planner have now been added independently in `worlds/causal.mjs` and `worlds/transform.mjs`. Their measured performance needs independent reproduction; universal causal learning and cross-domain transfer across text and maze remain unverified.

This deliberately preserves the entire baseline, rather than advertising unimplemented mechanisms as already working.
