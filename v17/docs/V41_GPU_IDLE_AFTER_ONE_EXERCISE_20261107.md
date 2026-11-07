# V41 — genuine RTX CUDA idle after first OpenThoughts exercise

Date 2026-11-07. User observed a 43,935-symbol real OpenThoughts row; only one exercise appeared completed, GPU task manager often showed ~0% and subsequent training progress remained slow.

## Source-confirmed root causes (no invented GPU speed claims)

**Original V40 counts a CUDA exercise before CPU consolidation completes.** Brain.learnTextGPU calls real PyTorch TextCard, absorbs learned alignment and increments Brain chars/exercises. Then the native worker enters a separate, strictly serial loop running Brain.live(old=true) for EVERY one of the 43,935 characters of the SAME exercise. After that CPU loop, the worker performs hypermaze memory updates, multi-scale language, original native causal path atlas, character observed edits, text action paths, shared policy, maze/transform, finite xD causal world and potentially snapshot/checkpoint. GPU can therefore be idle between actual PyTorch calls. A displayed exercise completion is not a full end-to-end training batch completion. Original status paused must be checked, not inferred from idle GPU.

**Inside real CUDA text alignment, depth >8 used Python-directed GPU binary searches with synchronous bool(go.any()) inside EVERY iteration**, repeated over thousands of contexts/blocks. The V40 index selftest 76.53ms->6.74ms concerned a different prefix operation; it did not prove true whole-document speed.

## V41 isolated changes (no other agent/model edited)

- TextCard Index.align on actual CUDA uses the original fixed maximum binary-search iteration count with per-lane masks, avoiding synchronous torch bool(go.any()) calls at every inner step. Exact LO/HI and all memory/learning weights must remain identical to the V40 Git blob. CPU and NumPy paths are unchanged.
- worker.mjs sends V41_PHASE_REAL timestamps for all actual stages: PyTorch TextCard, 43k-character legacy Brain replay, source/causal atlas, shared PyTorch, xD, journal, checkpoint, graph and V41_BATCH_END_TO_END_REAL for actual full-batch chars/s. No fake GPU occupancy, no skip of legacy brain learning.
- native-bridge.mjs reads original GET /health?w=0 alongside cached /graph. New V26-style UI shows original CPU-vs-GPU phase, live batch character numerator/denominator, heartbeat, actual committed chars/s and explicit paused/unresponsive indicators.
- START_V41_SPEED_PROFILE.ps1 clones the already tested V40 launcher behavior but uses its own native 8951 / UI 8952 / runtime-v41-speed-profile. No checkpoint required for new training; independent other experiments are NEVER stopped or modified.
- v41_gpu_sync_benchmark.py compares actual RTX PyTorch LO/HI at all 64 context depths against immutable V40 exact Git blob and times old vs new CUDA. This is actual hardware acceptance, not a synthetic benchmark substituted for end-to-end throughput.

## Automated testing boundaries

GitHub CI tests preserve original native text/maze/xD outputs, new browser and original Q/A/graph, Windows PowerShell syntax and a fresh native Parquet worker on actual Windows, with its trained row count checked. These are CPU CI runners and cannot measure actual RTX3050Ti speed. They also do not establish that every 43k document completes promptly. Such a claim requires V41_CUDA_GPU_EXACT_PREFIX_PASS and V41_BATCH_END_TO_END_REAL from the user's actual GPU.

## Diagnose CURRENT V40 immediately without changing any files

In Windows PowerShell:

    1..6 | ForEach-Object {
      $h=Invoke-RestMethod -Uri "http://127.0.0.1:8941/health?w=0" -TimeoutSec 5
      [pscustomobject]@{
        State=$h.status
        Phase=$h.health.phase
        HeartbeatAgeMs=$h.health.heartbeatAgeMs
        GPURequest=($h.health.gpuRequest|ConvertTo-Json -Compress)
        Trained=$h.health.lastReportedExercises
        CommittedChars=$h.health.lastReportedChars
      } | Format-List
      Start-Sleep -Seconds 5
    }

If State shows pauză, original Pause was actually requested. If State stays antrenează and Phase begins CPU:, the GPU is temporarily free because the native Brain is consolidating. If heartbeat is stale, inspect the worker process, and if it is erroare read lastError rather than pressing Reset.

## Optional isolated experiment (only once GPU competing jobs are not running)

    $ErrorActionPreference="Stop"
    $Dest="D:\MagicPerspective-V41-SPEED"
    if(Test-Path -LiteralPath $Dest){throw "Do not overwrite V41"}
    git clone --single-branch --branch "perf/V41-ELIMINATE-CUDA-HOST-SYNC-20261107" "https://github.com/dan3s2020/MagicPerspective.git" $Dest
    if($LASTEXITCODE -ne 0){throw "Clone failed"}
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$Dest\v17\START_V41_SPEED_PROFILE.ps1" -Data "D:\training\OpenThoughts3-1.2M" -Gpu "cuda:0" -Vram 3.0 -GpuTextBatch 1 -GpuTextChunk 256

V41 does not stop the existing V40 or any V24/V34 agent. But simultaneous training on the SAME GPU distorts performance and consumes competing VRAM. V41 performance is **NOT yet certified** on RTX3050Ti; do not treat the GPU-ready preflight as real end-to-end text speed.
