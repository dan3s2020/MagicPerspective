# Exact CUDA per-cell-action replay popup

Branch: feature/CUDA-WALL-TRUE-STEP-REPLAY-20261017
Parent: feature/CUDA-WALL-CLICK-REPLAY-POPUP-20261017

## Behavior

The existing ALL SIMULATIONS WALL and browser NodeGraph are preserved. Clicking
a native CUDA wall tile starts an isolated, deterministic one-simulation CUDA run
in a separate background engine and thread. The real canonical map exporter is
called with the original global simulation index and seed, and its selected map
ordering uses the same global index as the original full-batch export.

A replay frame is **one attempted cell action**, including rejected/no-displacement
actions. Frame zero is the initial world. In the user's example, 266 CUDA actions
produce 267 frames, not one wall capture or 19 joint-sweep frames. At the end of
each joint sweep the final action frame receives the updated terminal, success,
resistance, and step counters. The native desktop popup provides playback, pause,
previous/next actual action, timeline seek, loop, and millisecond delay per action.

The backend uses the canonical CUDA movement and policy unchanged. During this
isolated run it does not send periodic shared wall telemetry or build the
backend observatory, so original NodeGraph telemetry is not overwritten. The
additional action trace state is allocated only in replayOnly mode. The
ordinary CUDA batch continues using its old joint-step trace path.

## Verification and failure

Every action's actual CUDA cells and counters are stored. Once the replay
finishes, the desktop verifies that it starts at action zero, contains exactly
last_action+1 frames, reproduces the original map/seed/index and matches the
actual selected wall snapshot at the exact original global-action index,
including cell positions and all observed counters. Any difference or exception
is shown as an explicit replay verification error.

This is a deterministic re-simulation, not a historical recording captured
during the original run. It is valid only if the same deterministic physics and
canonical world inputs reproduce the original observed state. The matching
snapshot is the evidence for that claim; a mismatch is not silently ignored.

## Constraints

- Only one extra CUDA simulation runs at once. A replay during the main batch
  can increase GPU contention, but never changes its source CUDA policy.
- The complete selected action trace is kept in RAM, and replayOnly allocates
  an actions+1 GPU trace buffer. Very large max-action settings require enough
  GPU VRAM and RAM; allocation failures appear in the popup.
- Original wall history remains bounded to 96 sampled frames, independent of
  this dedicated trace.
- The independent replay does not train a persistent Local Brain.
- Changes: native Windows popup, isolated replay CUDA capture, optional native
  config fields, global-index map exporter, Git source-lock expectation updates
  and dedicated regression test. No unrelated source or NodeGraph files.

## Tests

Run:
  node --test tests/cuda-action-replay-contract.mjs tests/native-nodegraph-fusion-contract.mjs tests/isolated-integrated-source-lock.mjs

Actual NVIDIA execution and visual UI behavior must also be verified on the
user's Windows/CUDA machine; GitHub source checks alone cannot establish that.
