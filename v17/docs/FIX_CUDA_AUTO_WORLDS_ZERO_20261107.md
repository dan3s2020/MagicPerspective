# MagicPerspective V17: fix CUDA auto-worlds GPU failure

Date: 2026-11-07. Branch: fix/V17-CUDA-AUTO-WORLDS-EMPTY-20261107.

## Exact observed log

The original magic launcher started PyTorch CUDA 12.6 on RTX 3050 Ti and passed CUDA world physics and shared-latent selftests. Its settings included GpuWorlds=0 (documented AUTO) and GPU init said autoWorlds=256. After roughly 0.11M text characters and 2 exercises, the system reported:

    ValueError('zero-size array to reduction operation maximum which has no identity')

This is not a failed CUDA availability probe. It is a deterministic zero-batch bug in the original full training code.

## Root cause from actual sources

- START_MAGIC_REAL.ps1 defaults to GpuWorlds=0; START_V17.ps1 forwards this to devour.mjs.
- Brain.learnMazesGPU properly resolves N=0 to gpu.info.autoWorlds. On the user's GPU this is 256.
- Brain.playTransformsGPU did NOT resolve N=0. It created no levels and called Python t_reset with an empty list.
- worlds_gpu.py TBatch.__init__ applied np.array([]).max(), which raises the exact reported NumPy ValueError.
- The Python-to-Node client forwarded only the repr string without traceback, concealing the exact source line.

## Permanent repair in this branch

- Resolve N=0 or auto in original Brain.playTransformsGPU to measured gpu.info.autoWorlds, matching the existing labyrinth auto behavior. Validate positive integer before creating levels.
- Add descriptive guards against any genuinely empty Python maze or transformation world batch.
- Preserve actual Python traceback with future CUDA errors, instead of displaying only an exception class.
- Update original CLI message so GpuWorlds=0 displays AUTO rather than erroneously claiming zero worlds execute.
- No updates to original Brain checkpoint format, observed language learning, original or magic UI layout, or physical world mathematical rules.

## Verification completed on GitHub Actions

Exact workflow:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42324108775

The actual Node.js Brain used the original Python GPU command protocol and NumPy parity backend. The test deliberately substituted a small measured auto count 3 for CI, but still called BOTH original learnMazesGPU(gpu,0) and playTransformsGPU(gpu,0). Both executed 3 real worlds, and the transformation learner actually committed 3 exercises.

Tests checked an auto string, explicit positive world count, invalid inputs, clear Python traceback after a deliberate empty batch and the Python process staying alive. All other relevant regression suites, including the real native Magic UI/Chrome live data and observed numerical axes, passed.

The Windows GitHub Actions job verified that START_V17.ps1 and START_MAGIC_REAL.ps1 parse successfully.

No GitHub runner had the user's RTX 3050 Ti GPU. CUDA hardware acceptance after the fix is still to be verified from the user's next console log.

## Immediate workaround on the existing branch (without any update)

First stop the original PowerShell training with Ctrl+C, then rerun with a positive count:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Magic-Live\v17\START_MAGIC_REAL.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Magic-Run" -Port 8874 -GpuWorlds 64

This bypasses the zero count even on older code. Other failures are not ruled out.

## Update SAME existing clone to the permanent fix (preserves 2.6GB installed PyTorch)

First stop the currently running server, if any.

    cd D:\MagicPerspective-Magic-Live
    git status --short
    git fetch origin refs/heads/fix/V17-CUDA-AUTO-WORLDS-EMPTY-20261107:refs/remotes/origin/fix/V17-CUDA-AUTO-WORLDS-EMPTY-20261107
    git switch --track origin/fix/V17-CUDA-AUTO-WORLDS-EMPTY-20261107

If git status reports uncommitted tracked changes, review them instead of forcing checkout. Because the existing clone already has ignored gpu/.venv, switching branch reuses the installed CUDA PyTorch venv.

Then restart with the original auto-worlds setting and the SAME separate saved Brain output:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Magic-Live\v17\START_MAGIC_REAL.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Out "D:\MagicPerspective-Magic-Run" -Port 8874

The run marker confirms the same dataset. Native Resume loads original .v8 state from that folder and preserves the observed math-axis sidecar; the erroring server should be stopped before restarting.

## What this proves, and what it does not

The fix makes GPU auto worlds correctly produce positive transformation levels. Existing text/CUDA geometry learning and the original magic interface remain available.

The user's previous 33.3% unseen maze and transformation scores were early results after only roughly 0.11M characters. This fix removes the fatal training interruption; it does not itself prove any improvement in unseen task accuracy or complete general language solution navigation.

Full GPU hardware runtime on RTX 3050 Ti still requires user-side retest. GitHub Actions only validated the same original Python protocol via its NumPy backend.
