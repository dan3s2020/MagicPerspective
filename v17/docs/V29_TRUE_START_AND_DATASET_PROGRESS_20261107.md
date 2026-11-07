# V29: original training must ACTUALLY start, colored progress must return

User exact statement preserved at verbatim/2026-11-07-V29-REAL-START-NOT-FIX-OVER-FIX.txt.

## Root cause

The previous GUI showed the last cached native ALIGNED score (65.4%) and graph even though ORIGINAL V17 worker status was "eroare". The old backend's HTTP /control may acknowledge Start while its worker is already dead. A CUDA process previously printed EADDRINUSE on native port 8841, which means the old server may remain listening and the newer CUDA trainer cannot serve its live status there. An HTML score is NOT proof of an active training job.

## Actual change, not another fake training motor

V29 is a NEW isolated branch from V28. It keeps the V26 new visual UI and ORIGINAL unchanged V17 engine, Parquet reader, benchmarks and checkpoints. It does not start the synthetic V26 edit simulator.

- The NEW V26 UI again includes a large colored teal bar: ORIGINAL progress.trained / progress.total, the unchanged denominator and original heldout count. Small nonzero values get a clearly marked 6px visual minimum; the numeric percentage remains exactly correct.
- The worker must report status antrenează, pauză, oprit or eroare; fatal status is RED and contains its actual error, with cached ALIGNED labelled as a previous result.
- Start is a command acknowledgment, not proof of training. A further increase in the original counter is the confirmation. Start is blocked when the original worker is erroare.
- Native CUDA phase and original measured throughput are shown when available.
- New Windows launcher refuses duplicate devour.mjs Node processes (checkpoint writer protection), busy native/UI ports (no stale server attachment), and missing original brain checkpoint (no silent reset). It keeps original -Resume/-Out and uses original START_V17.ps1 with CUDA test and the original OpenThoughts Parquet dataset.

## Windows commands

First: manually stop any OLD ORIGINAL V17 training windows with Ctrl+C. Do not press Reset. Stop any old V28 bridge if it occupies port 8900. Do not kill unrelated processes.

Then, from PowerShell:

    $Repo = "D:\MagicPerspective-V28"
    $Dest = "D:\MagicPerspective-V29"
    $Branch = "fix/V29-REAL-START-STATUS-DATASET-PROGRESS-20261107"
    if (Test-Path $Dest) { throw "V29 already exists; cannot overwrite" }
    git -C $Repo fetch origin "refs/heads/$($Branch):refs/remotes/origin/$($Branch)"
    if ($LASTEXITCODE -ne 0) { throw "Fetch failed" }
    git -C $Repo worktree add --detach $Dest "refs/remotes/origin/$Branch"
    if ($LASTEXITCODE -ne 0) { throw "Worktree failed" }
    Set-Location $Dest
    powershell -NoProfile -ExecutionPolicy Bypass -File ".\v17\START_V29_VERIFIED_REAL_CUDA.ps1"

The default saved brain location is D:\MagicPerspective-V28\v17\runtime-devour-original\brains\brain-0-winner.v8. If your ORIGINAL last -Out path is different, pass -OriginalOut with that exact folder. If the old checkpoint is missing V29 refuses a new run; ONLY for an intentionally new training use -AllowNew.

The native real CUDA process starts on port 8851, and the new V26-style UI opens at http://127.0.0.1:8900. An already-running old V17 process means the script will STOP and identify it; this is deliberate to protect checkpoints and avoid showing old scores as new live training.

## Actual tests

GitHub Actions workflow: .github/workflows/v29-real-start-and-original-progress.yml.
- Native errors are reflected as fatal and Start is blocked while ALIGNED cached metric remains visible as historical.
- Start accepted with original counter 18 is NOT claimed as trained until counter 19.
- Original original V17 worker executed real text training from the repository (not synthetic word swapping).
- Real Chromium UI tested original dataset percentage from 4/1,209,984 and its colored display, preserved native graph and frozen Q/A.
- Real Windows PowerShell parsed the NEW launcher and verified it refuses an occupied native port without touching checkpoint files.

These tests verify the integrated behavior but do not confirm a full real OpenThoughts run on the user's RTX3050Ti. NVIDIA CUDA preflight success is separate from sustained training success. If CUDA fails at runtime, V29 must show the fatal error instead of green training.
