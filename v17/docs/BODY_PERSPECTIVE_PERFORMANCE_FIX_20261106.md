# V17 isolated body-perspective: slow training / stale UI regression fix (2026-11-06)

## User report (verbatim)
"este foarte lent si ui-ul nu se actualizeaza"

## Root causes verified in the code
1. Native `ui/app.js` previously drew the entire expensive 5D/NestView scene on every `requestAnimationFrame` (usually ~60Hz), with full-DPI canvas rendering and frequent setWorld work. Training happens in a separate Node worker; wasted browser time does **not** increase CUDA throughput.
2. Worker `devour/worker.mjs` only sent full graph snapshots every several seconds and certain completed GPU phases. A slow CUDA Python call or synchronous frozen test/checkpoint would cause a stale-looking UI while the backend continued to compute.
3. The independent `perspective-studio.js` fetched and repainted the entire graph every 1700ms, even when its tab was hidden, duplicating the original V17 application's own graph fetches.
4. Default `START_BODY_PERSPECTIVE.ps1` text CUDA chunk=32 was small versus the original PyTorch worker's self-reported 1.8GB text chunk capacity; CUDA launch overhead can dominate small fragmented batches. The original GPU worker can retry with smaller chunks on CUDA OOM.
5. The launcher re-ran original V17 512-world and shared-model gradient CUDA self-tests on **every start**, even when CUDA was already verified on the user's RTX 3050 Ti.

## Isolated fixes applied — original V17 engine remains and user checkpoints are preserved
- `worker.mjs`: emit **1Hz lightweight real training telemetry** with phase name, done/total only when reported, cumulative real phase duration, CPU heap MB, actual chars/s, GPU device, GPU error, maze/transform counts and shared-model updates. No graphics allocations, checkpoint writes or artificial progress.
- `devour.mjs`: `GET /telemetry?w=0` gives compact current status, distinct from `GET /graph?w=0`. Telemetry bypasses full graph snapshots and disk writes. The original graph endpoint and save/restore logic stay intact.
- `ui/perspective-studio.js`: poll `/telemetry` every 1s and render the current phase both in the native graph's visible HUD and in the Metrics tab. **Warn on a stale timestamp older than 7 seconds** rather than pretending that a cached update is live. Large `/graph` fetches only happen when Metrics or Transfer are actually open, every 3s.
- `ui/app.js`: full V17 graph continues rendering and animating, capped near 24fps instead of ~60fps, at <=1.5 device pixel ratio. NestView setWorld work now happens less frequently. There is **no simulation/demo replacing the real graph**.
- `worker.mjs`: minimum 650ms between forced expensive full graph snapshots; explicit `CPU: frozen V17 evaluation + checkpoint` phase before synchronous evaluation, which can temporarily delay heartbeats; other batch phases visibly report elapsed milliseconds.
- Launcher: conservatively requests 16 parallel maze worlds, text batch=2, chunk=128, 1.8GB VRAM budget, 1 worker. Only a **real CUDA tensor operation** is checked on normal restart; use `-FullGpuSelfTest` to rerun the original 512-maze and PyTorch shared-model self-tests.
- Explicit Reset also backs up `.body-perspective.json` alongside the V17 native Brain and other sidecars. A routine restart or pull never resets checkpoint state.

## Evidence
The GitHub Actions isolated workflow checks Windows PowerShell 5.1 syntax, Node syntax, frozen V17 perspective-evaluator regressions, and boots a **real original V17 text training server** on an ephemeral port to verify that `/telemetry` advances and `/graph` continues returning genuine native nodes.

## Runtime interpretation
- **Actual chars/s**: V17 text processed, includes CPU/GPU stages and waits, not isolated GPU theoretical speed.
- **Phase elapsed**: elapsed time for the current reported backend stage; a 0/0 count means the GPU worker has not exposed numeric progress, NOT zero work.
- **Heartbeat >7s old**: worker is blocked in synchronous processing, ended, or not responding; this is distinct from slow but healthy CUDA work.
- **Long CPU frozen evaluation + checkpoint**: measured report/save bottleneck, not latent-model learning.
- **CUDA text align**: model processing text. Large duration with no progress could be PyTorch workload or its internal subprocess; start with measured times before changing VRAM.
- **CUDA transform worlds**: hundreds of sequential action steps may dominate wall time even when individual world physics uses CUDA; increasing number of worlds alone cannot fix sequential dependencies.
- **Full-UI native graph visual FPS** is intentionally independent of actual training throughput.

## Limitations
This is a structural fix for UI responsiveness and GPU batch launch overhead. RTX 3050 Ti throughput improvement is **not yet empirically measured on the user's PC**, and a hardware-specific CUDA bottleneck is not proven resolved by CI's CPU-only runner. The code keeps the actual V17 learning equations and never claims a full CUDA port of JavaScript-side Brain or its layered organisms. Full Verbatim release coverage is still BLOCKED.


## 112,530 symbols but 0 confirmed chars on CUDA (real user screenshot)

Observed: \`text CUDA: aliniere · 19.9s · 0/112530 unități raportate\`;
heartbeats continued every 0.2s and V17 reported 0 confirmed text characters.
The original V17 contract \`Brain.learnTextGPU\` only increments \`brain.chars\`
after an ENTIRE \`TextCard.live(exercises)\` request returns, while the OpenThoughts
Parquet row can contain >112k original symbols. Heartbeat does not prove that
GPU CUDA kernels are making progress; it proves the Node worker event loop is alive.
Actual \`/telemetry\` stage and subsequent in-flight positions are needed to
distinguish a long call from a backend hang.

New changes preserve every input symbol in original order and split very large
text rows into bounded, sequential **4096-character CUDA processing windows**.
This changes the self-index/imagined-continuation context boundaries of the
GPU text algorithm, so full-long-exercise prediction is NOT mathematically
identical to the single-request baseline. The CPU-side original AligningGraph
memory and CUDA suffix working set persist across windows. Accuracy must be
compared on frozen held-out evaluations to verify the trade-off.

Original Parquet rows and temporary CUDA windows are explicitly separate:
- \`brain.sourceRows\` is the number of fully committed original source rows;
- \`brain.sourceOffset\` is the exact byte offset in the current source row;
- \`brain.sourceRowLength\` + SHA256 fingerprint detect dataset changes on resume;
- \`brain.exercises\` counts original rows, not CUDA windows;
- \`sourceWindow\` telemetry reports \`index/windows\`, original length and
  already committed bytes; \`chars\` refers to completed GPU training windows.
- On Save/Pause, the current **completed** window and source offset can be
  checkpointed, and subsequent resume reads the same row at that offset.
- On an exception before source cursor commit, the last previously saved
  checkpoint remains untouched; an unconfirmed GPU step is NOT saved.
- Every original source symbol is forwarded once. Causal text actions for the
  original row are learned once, after all of its windows complete.
- CPU fallback (deliberately selected) continues at the saved byte offset
  instead of retraining the committed prefix.

Configurable on the Windows launcher: \`-GpuMaxChars 4096\` (256–32768).
Smaller values give more responsive intermediate commits but increase call
and suffix-index overhead; larger values trade responsiveness for throughput.
\`-GpuTextChunk\` independently controls the CUDA kernel's internal micro-batch,
default 128 with an existing out-of-memory retry.

Test acceptance: \`gpu-text-windows.test.mjs\` checks full byte equivalence for
112,531 symbols, identical original-row count, 7-window stop/resume,
no duplicate in-flight section, and actual V17 v8 serialized cursor persistence.
Only RTX hardware can establish the actual speedup; this is not a claim
that 112k character learning is computationally free.
