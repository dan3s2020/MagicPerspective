# V17 CUDA transform auto-world crash — root cause and fix (2026-11-07)

## Exact observed incident
User's RTX 3050 Ti passed both CUDA self-tests. On training with GpuWorlds=0, the Python backend reported:
    ValueError('zero-size array to reduction operation maximum which has no identity')
V17 then labeled the failure 'CUDA unavailable', even though GPU availability had succeeded.

## Verified cause
- The documented GpuWorlds=0 means automatic number of worlds.
- The original Brain.learnMazesGPU already resolved 0 into gpu.info.autoWorlds (256 on the user's card).
- Brain.playTransformsGPU had no such resolution; with N=0 it created levels=[] and called Python t_reset.
- Python TBatch constructed np.array([]) and called .max(), exactly producing the observed error.
- This was a protocol logic bug, not a CUDA driver or memory allocation problem.

## Minimal production changes
1. playTransformsGPU now resolves 0 and 'auto' to the GPU's actual autoWorlds count, mirroring the already-working maze method.
2. TBatch rejects truly empty levels with a descriptive error, instead of confusing NumPy's zero-size reduction.
3. New Node test exercises the REAL V17 Brain through the real Node-to-Python world protocol using NumPy backend.
4. A new CI workflow verifies the regression and the existing perspective-world parity test, plus Windows launcher syntax.
Original V17 CUDA setup, math-path observer, Brain checkpoint format, text trainer and UI are otherwise unchanged.

## Verified CI
GitHub Actions: https://github.com/dan3s2020/MagicPerspective/actions/runs/42329716140
- 3 new regression tests passed, 0 failures.
- 1 original GPU-protocol perspective test passed, 0 failures.
- Windows launcher parse succeeded.
- A setting of 0 resulted in a real 2-world TBatch in bounded CI, not an empty t_reset.
- A setting of 'auto' also created real worlds.
- Deliberately sending empty t_reset now gives a descriptive protocol error and the subprocess remains responsive.

CI uses NumPy for the GPU-protocol implementation: not a claim that the user's NVIDIA RTX 3050 Ti hardware run has been tested.

## Fast original-branch workaround
Restart original START_MAGIC_REAL.ps1 with -GpuWorlds 16 (explicit nonzero batch).

## Permanent isolated fix and safe resume on Windows
Stop the existing worker (Ctrl+C) before running another on port 8894 or touching its checkpoint directory.

    $dest = 'D:\MagicPerspective-CUDA-AutoFix'
    git clone --single-branch --branch fix/V17-GPU-AUTO-TRANSFORM-WORLDS-20261107 https://github.com/dan3s2020/MagicPerspective.git $dest
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$dest\v17\START_MAGIC_REAL.ps1" -Data 'D:\training\OpenThoughts3-1.2M' -Out 'D:\MagicPerspective-State-Gate-Run' -Port 8894 -Gpu 'cuda:0' -GpuWorlds 16 -Vram 2.6 -Mem 3 -GpuTextBatch 2 -GpuTextChunk 128 -Every 50000

The fix branch inherits the identical launcher and branch marker from the source experimental branch. The existing run is therefore allowed to resume from the same corpus/Out folder; no checkpoint migration or reset is necessary.
Keep the old checkout, original dataset and checkpoints untouched. Never run old and new process simultaneously against same Out folder. Do not use the UI Reset button.

The explicit 16-world setting is conservative for the 4GB RTX 3050 Ti; 0 auto (256 worlds from user's observed initialization) now works logically, but may be more demanding. A reported 100% utilization setting is NOT proof of sustained 100% GPU activity.

## Acceptance remaining on the user's GPU
Confirm that transform worlds actually run on CUDA after the next 4,000 characters, and that no GPU ERROR/CUDA unavailable appears. Validate live graph/real text training continues. If another error appears, use the full traceback to locate the next cause.