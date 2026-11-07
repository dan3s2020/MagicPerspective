# MagicPerspective V17 — RTX 3050 Ti freeze / stale worker snapshot fix

Date 2026-11-07. Branch \`fix/V17-GPU-STALL-WATCHDOG-RESUME-20261107\` based on the existing genuine V17 OpenThoughts training/UI branch \`feature/V17-LIVE-HYPERMAZE-REAL-CORPUS-20261107\`.

## User's observed failure (NOT a claimed root-cause attribution)

UI screenshot shows:
- **Last worker graph snapshot age: 2909.1 seconds (~48.5 minutes)**;
- text corpus: \`D:\training\OpenThoughts3-1.2M\`;
- \`112,532\` characters already processed, \`112\` unique absorbed symbol types;
- language perspectives still showing metrics from an old snapshot.
These values do not prove that the Python GPU process itself is dead; browser polling, CPU blocking/serialization, or a stalled CUDA RPC could all produce a frozen view. The old UI cannot distinguish them. Symbol types saturating around the ASCII repertoire is NORMAL and not itself the source of a freeze.

## CONFIRMED SOFTWARE DEFECT #1: GPU child requests had no timeout

Original \`v17/transcend/torus-aether/gpu/client.mjs\` bounded only initial \`init\` to 180 seconds. Every subsequent Python/CUDA RPC was held in \`this.wait\` indefinitely if the Python child never emitted a JSON reply. That can make the native worker wait forever in:
- \`text_learn\`, \`text_load\`;
- CUDA \`exercise\`, \`t_step\`;
- shared PyTorch \`shared_train\` / \`shared_load\` / \`shared_eval\`;
- any later command using the same \`GpuWorlds.call\`.

**Fix:** every call now has two independent watchdogs:
- no response/progress for **180s** -> abort as \`GPU RPC idle timeout\`;
- any individual call lasting **900s** -> abort as \`GPU RPC hard timeout\` even if progress continues;
- real progress messages reset only the idle deadline and are reported to the native V17 worker; timeout rejects ALL pending requests, kills the known child and never falls back silently to CPU;
- init remains bounded to 180s;
- stderr is preserved in a bounded recent snippet and stream-buffer size is limited.

Tests use a real temporary local executable speaking the same newline-delimited RPC protocol (not a mocked promise): no-reply process, progress every 280ms, infinite-progress process, normal completion and no-init process. All MUST terminate or complete within the defined deadlines with zero leftover pending map entries.

## CONFIRMED SOFTWARE DEFECT #2: no independent liveness / browser polls could hang

Previously the only visible "last worker update" timestamp came from a graph snapshot. No independent timestamp distinguished:
- GPU still working and sending progress;
- CPU bound in one synchronous calculation;
- process alive but waiting on a child that never responds;
- server/browser request stuck;
- a real completed or stopped worker.

**Fix:**
- Original worker emits a measured 5-second heartbeat from its own event loop with \`chars\`, \`exercises\`, current phase, current GPU request, current batch and memory. This is NOT fake training; counts remain unchanged if nothing is learned.
- Main \`devour.mjs\` exposes \`GET /health?w=0\` and adds \`graphs[].health\` to existing \`/graphs\`. A worker without a heartbeat for 45s is flagged \`unresponsive\`; a worker with a >90s-old graph snapshot is flagged \`stale-snapshot\` while preserving worker-heartbeat information.
- Original training page shows a prominent truthful health status below counters without replacing any original controls or maze/graph panels.
- Existing \`livePull()\` now has a 12-second timeout on \`/graph\`, \`/graphs\` and \`/telemetry\`, preventing an unanswered HTTP fetch from locking \`livePulling\` forever.
- Unexpected worker errors/exits propagate to UI rather than silently reverting to "stopped".
- Original server previously retained every detailed test report in RAM forever; only the most recent 240 per worker are now retained for live graphs, while disk \`log.jsonl\` continues append-only. This does not delete training memories.
- CUDA world failures no longer skip training the world quietly; they throw explicit errors.
- Original Brain \`.v8\` checkpoint is committed atomically before auxiliary sidecar snapshots. The original Brain model is never replaced by a toy.
- GPU timeout produces an explicit failure; the current batch is not silently regarded as learned. Restart from the LAST COMPLETED checkpoint. It is NOT an automatic guarantee of zero unsaved work loss.

## Conservative default launcher for laptop RTX 3050 Ti 4GB VRAM

The new **wrapper only** \`v17/START_HYPERMAZE_REAL_CUDA.ps1\` now defaults to:
- \`-Gpu cuda:0\`, \`-Vram 2.2\`, \`-GpuWorlds 4\`, \`-GpuTextBatch 1\`, \`-GpuTextChunk 64\`;
- \`-Mem 2\`, original \`-Worlds text,maze,transform\`, one Brain and all original UI panels;
- \`-Resume\` on, \`-Start\` on, \`-Port 8877\`, actual \`D:\training\OpenThoughts3-1.2M\` corpus.

There is **no reduction in source training set**, no elimination of tasks, no fabricated graph state, no change to the mathematical rules inside \`Brain\`; smaller per-batch work can decrease throughput but reduces peak GPU pressure. Default text CPU-sidecar remains separate from real PyTorch/CUDA.

Launcher refuses an occupied listening port so it cannot silently run without a reachable UI. Optional \`-ResumeFrom\` COPIES the previous runtime's \`brains\` folder into a NEW isolated runtime, without editing or deleting the old snapshots. It refuses to overwrite existing destination saves and cannot be combined with \`-Fresh\`.

## Safe Windows PowerShell recovery: keep the previous checkpoint

1. **Stop the PREVIOUS training process first** using its original PowerShell window. The old version might not respond to the first Ctrl+C because it is blocked, so terminate the previous process explicitly if necessary; never press **Reset** in the UI.
2. Clone into a completely NEW directory. Never overwrite any other agent's work:

    git clone --single-branch --branch fix/V17-GPU-STALL-WATCHDOG-RESUME-20261107 https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-Hypermaze-STABLE

3. If the old runtime follows the prior recommended default path, safely copy the checkpoints into the new runtime and resume:

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Hypermaze-STABLE\v17\START_HYPERMAZE_REAL_CUDA.ps1" -ResumeFrom "D:\MagicPerspective-Hypermaze-LIVE\v17\runtime-hypermaze-real"

   **If the previous runtime folder is elsewhere, pass the actual old output path.** The wrapper will fail loudly if \`brains\` does not exist, rather than pretend a resume occurred.

4. New live page:

    http://127.0.0.1:8877/transcend/torus-aether/ui/index.html?live=1

5. Real process health from another PowerShell console:

    Invoke-RestMethod "http://127.0.0.1:8877/health?w=0" | ConvertTo-Json -Depth 8

   Observe \`health.state\`, \`health.phase\`, \`health.heartbeatAgeMs\`, \`health.snapshotAgeMs\`, \`health.gpuRequest\`, \`canResume\`.

6. If the watchdog reports a GPU error, **do not hit Reset**. Stop the old launcher and re-run without \`-ResumeFrom\` in the new directory; the most recent completed \`.v8\` and sidecar checkpoint will be resumed.

If old Windows Python GPU child processes were orphaned, examine their command lines first (do not indiscriminately kill all Python):

    Get-CimInstance Win32_Process | Where-Object {
      $_.Name -match "python" -and $_.CommandLine -match "worlds_gpu.py"
    } | Select-Object ProcessId,CommandLine

Stop only verified leftovers after the old training process is closed.

## Scientific honesty and limits

- The screenshot alone cannot tell whether this is a CUDA driver hang, CPU serialization, disk I/O, suspended browser, old process death, or source-corpus read stall. The new health fields and RPC exceptions make that measurable.
- A frozen synchronous JavaScript CPU operation cannot be safely interrupted by the worker's OWN timer. The server can detect such a block (heartbeat missing for 45s), but the fix does NOT promise automatic recovery of a completely unresponsive JS thread.
- If a GPU kernel/driver is permanently stuck, killing the Python process may still require manual OS intervention. Node ensures the request no longer waits forever without surfacing an error.
- A checkpoint saves only completed batches. Unsaved in-memory updates since the last save cannot be magically recovered. This fix never resets the original Brain by itself.
- The CUDA behavior is validated by protocol-simulated jobs and original native CPU-training integration, not by remote access to the user's RTX 3050 Ti. All existing actual V17 paths remain intact.
- 112 unique symbol types are NOT a hard cap of 112 total training tokens: the already processed character count shows that distinction. Tokens and perspectives count different things.

## CI evidence

Test modules:
\`v17/tests/gpu-stall-watchdog.test.mjs\` (real fake-child IPC timeout/progress),
\`v17/tests/live-corpus-hypermaze-http.test.mjs\` (native real corpus, actual /health, checkpoint),
\`v17/tests/live-corpus-hypermaze-browser.test.mjs\` (real browser, original V17 UI and heartbeat panel),
plus original native / inline/transform regressions.
Workflow: \`.github/workflows/v17-cuda-stall-watchdog.yml\`.

Scientific next acceptance on user's PC: post 2 consecutive actual \`/health?w=0\` snapshots showing increasing \`chars\` over ~15-30 seconds or valid batch phases, plus source GPU phase. Do not infer success from an old displayed accuracy.
