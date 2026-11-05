# 2D BACKEND NODEGRAPH V1 (2026-10-13)

Branch `OCTOPUS-JACKPOT-2D-BACKEND-NODEGRAPH-V1-20261010`, based on
`OCTOPUS-JACKPOT-ISOLATED-GPU-SATURATION-V1-20261010` @ `ffb9c72`.

## Request

The first training (2D maps) is shown in the NodeGraph as graphs: every variable, vector, connection and
function of the 2D backend is a node or an edge, split into separate tabs. The purpose is to see when and
how everything works behind the scenes, and later to build visualizers, statistics and metrics on top of it.

## What was added

### NodeGraph: tab `2D BACKEND · ALL VARIABLES`

One new tab button next to the three original tabs. It has 13 sub-tabs, with 176 nodes and 186 edges in
total:

| Sub-tab | Content |
|---|---|
| PIPELINE | UI → exporter → CUDA → telemetry → NodeGraph, step by step |
| CONFIG | every `NativeConfig` field, the UI control that writes it, derived sizes, constants |
| WORLD / MAPS | map generation (same functions as the exporter), checkpoint geometry, device map arrays |
| STATE | `SimState` + `CellState` of the probe simulation |
| PERCEPTION | exactly what the selected cell reads: neighbours, target, memory bits, rng, a 7×7 view |
| POLICY A | `chooseAAction`: the 4 direction scores and their terms |
| POLICY B | `chooseBAction`: the 4 direction scores and their terms |
| BODY MECHANICS | `resolveBodyIntent`: every candidate move, why it won or lost, the decision |
| MEMORY / CLAIMS | coverage + boundary bitsets, every claim, the counters |
| EPISODE / OUTCOME | checkpoint test, budget, terminal, sim-0 trace, timeline |
| ALL SIMULATIONS | aggregates of every simulation, per map, log2 histograms, history |
| GPU / RUNTIME | rounds, kernels, streams, observer feed, observatory |
| WHAT ADAPTS | every state variable: who writes it, who reads it, what persists |

Each node shows its live value, the exact rule (`doc`) and its source location (`src`). The panel on the
right lets you choose:
- the probe and the step (or follow the latest step);
- the cell and the attempt;
- the probes for the next run.

The three original tabs (WORKFLOW, BRAIN, TEXT TRAINER) are unchanged. The backend files are only read
while a 2D BACKEND sub-tab is open.

### Engine: 2D BACKEND OBSERVATORY (`native-same-dish/src/backend_observatory.cuh`)

The observatory is a read-only observer inside the native app, included at the end of `cuda_engine.cu`.

**Probe.** The selected simulations (default: sim 0, at most 8) are re-run on their own CUDA stream. They
use a shadow copy of the state taken right after `initKernel`. The replica functions (`*_obs`) are the
original functions token for token, plus recording hooks (`OBS_*` macros).

Every joint step is recorded:
- the policy of every cell: 4 scores, noise, flags, rng in/out;
- every attempt;
- every body-move candidate: status, alignment, support, opposition, passive, net, score;
- the claims and the counters.

The recordings go to three tapes:
- `head`: the first `head_steps` steps;
- `ring`: the last `ring_steps` steps;
- `summary`: every step, with positions, packed attempt outcomes and counters.

**All simulations.** At every progress/wall tick, all `SimState` rows are copied (stream-ordered) and
summarised: counts, sums, maxima, log2 histograms, per map, and a history.

**Output.** Files go next to `latest.json` in the runtime folder:
- `backend-latest.json`: self-describing, with record layouts taken from `offsetof`;
- `backend-history.json`;
- `backend-probe-<p>-{summary,head,ring}.bin`.

**Checks written into the JSON:**
- at the end, the probe is compared with the real simulation (state, cells, coverage, boundary);
- for sim 0, every step is compared with the engine's own replay trace;
- the panel shows the result.

**Never blocks the run.**
- Every staging slot is optional.
- An observatory error only disables the observatory.
- It is built before the `elapsedMs` timing starts.
- At the end, the run waits at most 10% of its duration (min 250 ms, max 2 s) for a lagging probe. A
  probe still behind after that is reported as not compared.

### Bridge (`native-nodegraph-bridge.mjs`)

New routes, reading the runtime folder:
- `GET /api/same-dish/backend`
- `GET /api/same-dish/backend/history`
- `GET /api/same-dish/backend/step?probe=&step=`
- `GET /api/same-dish/backend/summary?probe=&from=&count=&stride=`
- `GET /api/same-dish/backend/world?sim=`, which regenerates the world with the exporter's functions and
  checks it against what CUDA received
- `GET` and `POST /api/same-dish/backend/config`

## Probe configuration

Use the panel (PROBES FOR THE NEXT RUN), or write `<runtime>/backend-observatory-config.txt`:

```
enabled=1
probe_sims=0,5,11      # up to 8 simulation indices
ring_steps=64          # 8..1024, full detail of the last N steps
head_steps=1024        # full detail of the first N steps (capped at 64 MB per probe)
```

The engine reads this file once, when a 2D run starts. To switch the observatory off, set `enabled=0` or
the environment variable `OCTOPUS_BACKEND_OBSERVATORY=0`.

## Files

| File | Change |
|---|---|
| `native-same-dish/src/backend_observatory.cuh` | new |
| `native-same-dish/src/cuda_engine.cu` | include + observatory construction/round/finish calls + read-only counters in `ObserverFeed` and `TelemetryWriter` |
| `native-nodegraph-bridge.mjs` | backend routes |
| `map-cells/nodegraph/index.html` | tab button, sub-tab bar, panel container, stylesheet link |
| `map-cells/nodegraph/nodegraph.js` | registers the extra graphs; the original tabs are untouched |
| `map-cells/nodegraph/backend2d/*` | new: manifest, graphs, model, decoders, renderers, bridge helpers, CSS |
| `tests/backend2d-*.mjs`, `tests/fixtures/backend2d/` | new tests + a real engine output |
| `tools/backend2d-observatory/*` | new verification tools |
| `tools/gpu-saturation-equivalence/{prep.py,emu-include/*}` | prep inlines the new include; the emulation hashes only the v1 telemetry file; `cudaEventQuery` stub |

Unchanged:
- `main_win32.cpp` (every button, text and pixel of the desktop app);
- `octopus_cuda.hpp`;
- `CMakeLists.txt`;
- `BUILD_NATIVE_CUDA.cmd`;
- the text trainer;
- the launchers.

### Lock tests

`tests/isolated-integrated-source-lock.mjs` and `tests/native-nodegraph-fusion-contract.mjs` lock the
reviewed new blobs. Every other locked file still has zero diff.

| File | Old blob | New blob |
|---|---|---|
| `cuda_engine.cu` | `e0a978fb` | `55dfc38b` |
| `native-nodegraph-bridge.mjs` | `0f9c992a` | `5f8774e0` |
| `index.html` | `8513c699` | `7c77299d` |
| `nodegraph.js` | `0f9266a9` | `60f73859` |

## Proof that the simulation and the original UI did not change

| Check | Result |
|---|---|
| `tools/gpu-saturation-equivalence/run-equivalence.sh`: original `34ac61d` vs this branch, observatory on, 19 cases (callbacks, wall frames, UI end state, telemetry) | 19/19 PASS |
| `tools/backend2d-observatory/run-observatory.sh`: probe == real simulation + sim-0 trace, 11 cases (all maps, 7 cells, A only, B only, 1200 sims, pageable, slow UI, lagging probe) | 11/11 PASS |
| Same 11 cases with fused multiply-add (`EMU_CXXFLAGS="-mfma -ffp-contract=fast"`) | 11/11 PASS |
| Same 11 cases under ThreadSanitizer | 11/11 PASS, no reports |
| Clang CUDA sm_86, C++17: host and device compile | OK |
| PTX of `initKernel`, `compactActiveKernel`, `simulateChunkKernel`, `simulateActiveKernel` vs `ffb9c72` | IDENTICAL; only `backendProbeKernel` is new |
| `tests/backend2d-observatory-replica.mjs`: replica == original minus hooks | PASS |
| `tests/backend2d-telemetry-decode.mjs`: every decoded value re-derived from the engine rules on a real output | PASS; 6 injected corruptions all detected |
| `tests/backend2d-nodegraph-manifest.mjs`: every struct field, constant, kernel, device function and host/device buffer of the engine is in the manifest | PASS |
| Headless NodeGraph: the 3 original tabs vs `ffb9c72`, screenshots | identical outside the new tab button, within run-to-run noise |
| All `tests/*.mjs` | PASS; `universal-observation-regression` already fails on the base |

The emulation runs the CUDA code on the CPU. GPU load and timing on the real RTX card are not measured
here.

## First facts visible in the graphs

These were measured in the CPU emulation, which runs the same code; the rates depend on the
configuration.

1. **Nothing learns in the 2D CUDA path.**
   - Both policies are fixed formulas. The CONFIG tab shows the constants.
   - The only state that changes decisions is B's coverage/boundary memory. It lives only within one
     simulation (`initKernel` resets it).
   - Nothing is carried between simulations or runs.
   - `NativeStats.brain*` is reserved and always 0. See the WHAT ADAPTS tab.
2. **A does not perceive the map; it reads the target.**
   - `chooseAAction` uses the absolute checkpoint coordinates and goes greedy on Manhattan distance.
   - A wall costs −8. The noise (≤ 0.2046) only breaks ties.
   - So the map geometry decides A's success. In a run of 1200 simulations (2 cells/organism, 1A+1B,
     2400 actions, 100 per map), A's success rate by map was:

     | Maps | A success |
     |---|---|
     | v1-* | 96–100% |
     | direct | 96% |
     | spiral | 70% |
     | bend | 51% |
     | backtrack | 26% |
     | maze-zigzag | 26% |
     | s-curve | 5% |
3. **B's "resistance" is usually not a wall.**
   - Every rejected B action claims the boundary bit in its direction, whatever the reason for the
     reject.
   - In the 8 probes of a 24-simulation run (3 cells/organism, every step recorded in full), there were
     178 new resistance claims:
     - 5 had a wall in that direction;
     - 173 had a free cell, rejected by the body mechanics (no valid candidate or net drive below 0.02).
   - With 7 cells/organism and 2A+2B, the split was 15 at a wall and 301 at a free cell.
4. **Two organisms can jam each other for the whole budget.**
   - In the same run, sim 6 (map `direct`) never reached the checkpoint in 1000 steps.
   - Of A's 3000 attempts there:
     - 1995 had no valid candidate;
     - 995 collided with B;
     - 9 were accepted.
   - In the probes that succeeded, about half of A's attempts were accepted.
   - The BODY MECHANICS tab shows every candidate and why it was rejected.

## How to re-run the checks (Linux, g++, python3, node, clang)

```
bash tools/gpu-saturation-equivalence/run-equivalence.sh
bash tools/backend2d-observatory/run-observatory.sh
EMU_BUILD=/tmp/obs-fma EMU_CXXFLAGS="-mfma -ffp-contract=fast" bash tools/backend2d-observatory/run-observatory.sh
EMU_BUILD=/tmp/obs-tsan EMU_CXXFLAGS="-fsanitize=thread -g" bash tools/backend2d-observatory/run-observatory.sh
node --test tests/backend2d-observatory-replica.mjs tests/backend2d-telemetry-decode.mjs tests/backend2d-nodegraph-manifest.mjs
```
