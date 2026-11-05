# GPU SATURATION V1 (2026-10-10)

Branch `OCTOPUS-JACKPOT-ISOLATED-GPU-SATURATION-V1-20261010`, based on
`OCTOPUS-JACKPOT-NODEGRAPH-TEXT-ISOLATED-V1-20261005` @ `34ac61d`.

## Scope

The only runtime file that changed is `native-same-dish/src/cuda_engine.cu`, and only the host-side
round loop changed. The following are byte-identical to the base:
- `main_win32.cpp` (every button, text and pixel);
- `octopus_cuda.hpp`;
- `CMakeLists.txt`;
- `BUILD_NATIVE_CUDA.cmd`;
- the NodeGraph bridge and webview;
- the text trainer;
- the launchers.

`tests/isolated-integrated-source-lock.mjs` now locks the new `cuda_engine.cu` blob. It still requires
every other locked file to have zero diff against `9959bc2`.

## Why the GPU was idle

Before this change, every progress tick (every 2 CUDA rounds) did the following while no kernel was
queued:
- `cudaDeviceSynchronize`;
- blocking copies;
- a telemetry file write with `MOVEFILE_WRITE_THROUGH`.

Every wall tick (UI slider "Wall capture every CUDA rounds") also:
- copied all simulations;
- built 16096 snapshots on one thread;
- handed them to the UI. For 16096 simulations × 28 cells this takes about 50 ms of CPU/UI time.

A CUDA round costs the GPU only a few milliseconds.

## What changed

- The simulation kernel body is verbatim: it moved into `simulateOneSimulation()`.
  `simulateChunkKernel` still calls it.
- Same rounds, same `JOINT_ITERS_PER_LAUNCH=32`, same tick rounds, same snapshot content.
- Kernels run on a non-blocking compute stream, with 3 rounds of run-ahead.
- Each tick's snapshot is taken by a stream-ordered device-to-device copy into a staging slot. A second
  stream then copies it to pinned host memory.
- A worker thread builds the identical callbacks in the identical order. Wall snapshots are built in
  parallel (up to 8 threads).
- The telemetry file is written on its own thread, in order, with identical content.
- Finished (terminal) simulations are compacted out of later launches. Their state can no longer
  change.
- When every simulation is terminal, the remaining rounds, which would only re-send the unchanged
  final state, are not launched. The tail ticks are re-emitted from the final state.

### Default mode: the GPU never waits for the UI

If the UI is still consuming previous wall frames when a wall tick comes up, that tick's wall capture
is skipped.
- Its progress/telemetry tick is still delivered.
- Every delivered frame is the exact state of its round.
- The first and last frames are never skipped.

### Exact mode: `OCTOPUS_WALL_CAPTURE_EXACT=1`

Every wall capture is delivered, as before. The GPU waits for the UI when the UI is slower.

## Equivalence proof

The proof lives in `tools/gpu-saturation-equivalence/`. It runs a CPU emulation of the CUDA runtime,
running the original and the new engine on the same configurations.

Run it with `bash tools/gpu-saturation-equivalence/run-equivalence.sh` on Linux (needs g++ and python3).
The script builds both engines itself; the original comes from `git show 34ac61d:...`.

Exact mode, 13 cases:
- The progress log, wall frames, UI end state, telemetry file and telemetry write sequence are
  byte-identical.
- Early-completion cases are identical except for the skipped re-sends of the final state.

Default mode, 6 cases, with a simulated slow UI:
- Every delivered event is byte-identical to an original event, in the original order.
- Every progress tick is delivered.
- Final stats, sample replay, latest wall frame and telemetry are identical.

ThreadSanitizer is clean. A Clang CUDA `-fsyntax-only` check passes for sm_86 in C++17, on both the
device and host sides.

## Verify GPU load on Windows

In Task Manager, set one GPU 0 graph to "Cuda" or "Compute_0". The default "3D" graph does not show
CUDA work. Alternatively:

```
nvidia-smi --query-gpu=index,name,utilization.gpu,memory.used --format=csv -l 1
```

The GPU only stops being busy when the run is finished, or when every simulation is terminal.
