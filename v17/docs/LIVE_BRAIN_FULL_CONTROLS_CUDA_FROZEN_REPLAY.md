# Universal Graph / Live Brain Lab — full controls, honest GPU modes

**Canonical user UI:** isolated-graph/live-brain-viewer.html. Not an older NodeGraph or Same-Dish web UI. Its drawBrain() and drawMap() logic is preserved.

## Panels

- All / Brain: existing A/B stage circuits with animated NodeGraph-style tentacles. Stages are a functional projection of genuine V9 2×F32 → Local Brain → Concept Flow telemetry, not literal recurrent learned synapse topology.
- Training/Config: Max Global Actions / simulation, exploration, optimizer microbatch, automatic frozen validation schedule/count, checkpoint frequency, A/B success criterion; edit while paused, preserve same trained weights. Physical organism/cell topology changes are explicitly separate checkpoint profiles.
- Success: recorded map success numerator/denominator for A target and B resistance/boundary, trailing 100, A/B separate brain/atlas/optimizer identities, real V9 optimizer step counts.
- Frozen: same-map validation with frozen A/B trained state under LIVE versus MASKED cross-species observations. Includes paired differences without changing Adam weights; no claim that comparing validation scores to training scores proves learning.
- R vs R″: R is V9 Concept Flow prior; R″ = 1−clamp(actual movement,0,1) is a resistance *proxy* from original physics, not isolated wall/material truth. Lower MAE means predictions are closer to this proxy on comparable samples.
- Replays: existing short ring plus unlimited *episode archives* on disk. Each real trained episode stores original action plans and per-cell experiences; the browser can seek/play all physical steps and refuses mismatched original final positions. No invented historical neuron signals.
- Cell node circuits: real physical cells as circles with sensory/concept/motor/memory/feedback ports, links between actual physical neighbors, signal glow only on observed coactivity. Gray memory port is NOT a learned neuron. Learned intercellular synaptic weights are NOT implemented or exposed.
- CUDA ONLY: original full CUDA ImGui app can still launch untouched; separate add-only OctopusSameDishHeadless target can build and run from Lab. GPU index, simulations 1–4096, A/B populations, cells/organism, max global actions, all 12 map types via bit mask and seed are configurable in Browser GPU tab. START/STOP acts on NVIDIA GPU engine and updates genuine CUDA progress/map/physical body telemetry. No Octopus process is force killed; old builds not cleaned.

## Important limits

CUDA V4 supports real GPU simulation physics, not yet a persistent CUDA V9/Jackpot Local Brain, Concept Flow, RSI/Atlas learner. CUDA-only mode pauses/checkpoints V9 CPU and never silently runs CPU cognition on GPU. CPU V9 worker learns whole episodes before the original Live Brain page animates their recorded physics; live stepwise online GPU V9 cognitive visualization is NOT done.

## Windows setup

Clone branch feature/LIVE-BRAIN-FULL-CONTROLS-FROZEN-CUDA-20261020 into a new folder, then run:

    node --test --test-concurrency=1 tests/live-brain-v9-real-backend.mjs tests/live-brain-v9-http-smoke.mjs tests/live-brain-full-controls-contract.mjs
    .\RUN_UNIVERSAL_GRAPH_LIVE_BRAIN_V9.cmd

For CUDA-only: switch backend to CUDA NATIVE; click Build headless CUDA (one-time isolated CMake build), wait for BUILT, set GPU controls and press START GPU batch; or click Open original CUDA GUI and start training there. GPU headless compilation requires CUDA Toolkit / NVCC, CMake and VS2022 Build Tools.

## Verification status

JS code-source syntax checks passed; GitHub diff verified main_win32.cpp, cuda_engine.cu, original Same-Dish maps and original NodeGraph are untouched. Native CUDA headless Windows compilation and full end-to-end V9 tests have NOT been executed on user's Windows GPU, and should not be called PASS before user test output. Cognitive CUDA parity and P0-P17 remain open.