# Text A7 restoration and A4/A5 learning-gap audit — 2026-10-27

## Branch, original contract and scope
- Branch: `fix/CUDA-TEXT-A7-VISIBLE-FLOW-20261027`. Do not alter `main`.
- User contract: `/texta7` must have precisely the existing `/text` Text Training / A6 Brain Tab styling, layout, controls, graph and writing viewport; only the organism is A7 and its real CUDA physics, resistances, neural updates and replay.
- Canonical source: `isolated-graph/text-lab.html` (A6). UI restored by generating Text A7 from this original, not from the split-screen Text A7 rewrite.
- A6 `<style>` content and DOM *tag sequence* verified byte-identical after normalizing A7 back to A6 and the tab highlight. Text labels, brain IDs, API URLs and A7-specific internal physical frame logic necessarily differ.
- No extra 3D keyboard canvas replaces/splits the original A6 graph. CUDA's 4-depth keyboard remains the *real simulated physical environment*. The A6-style graph renders the actual six A7 neural cells, with physical intercell fingertip joins and real step activity. Historical A5 candidate neural edges are dashed and expressly inactive, never misreported as physical joins.
- Retained physical resistance: NVIDIA `native-a7-text-cuda` wall/blocked-contact measurements, TD prediction/reward updates, 16-step world-0 replay, peer-tip packets and individual cell fingertip observations.
- Repaired replay clock, real A7 status/error messages, guarded continuous browser render, non-vanishing learned candidate routes, and no silent CPU fallback on native CUDA initialization failures.
- A7 frozen GPU evaluation now clones A7 actors: the native frozen kernel can update transient actor state, but it cannot touch the six live training actors.
- No source, checkpoint or launcher of Map A4/A5, Text A6, original map UI, or Math was changed.

## Checks performed
- Static runtime source check: embedded browser JavaScript parses.
- Byte-equality of A6/A7 `<style>`: PASS.
- Normalized DOM tag sequence against A6: PASS.
- Simulated real browser loop, waiting state: 8 frames, one future RAF callback per frame, 0 thrown errors.
- Simulated populated A7 snapshot: 7 frames with 390 input nodes + 6 real cell nodes + physical CUDA frame, 476 canvas arc calls, 0 browser errors; status `LIVE · CUDA A7 TRAINING`.
- Branch-specific GitHub Actions added. Action runs `40549131500` and `40549854744` concluded failure **before any job steps were reported (runner_id 0)**. No GitHub-hosted build/test pass may be claimed from these runs.
- Actual Windows GPU (`nvcc`, Microsoft compiler, `nvidia-smi`, real native NVIDIA kernels, disk, local A5 checkpoint and dataset) **cannot be executed remotely**. Run `RUN_CUDA_DESKTOP.ps1` on the user's NVIDIA PC to validate.

## A4/A5 versus current Text A7: confirmed architectural gap
1. `isolated-graph/tentacle-brain-a4.mjs`: A4 inherits A3's whole trajectory learner, fixes random winning IN/REC candidate selection via `growNeed(candidates)=growEvidence+2 ln(candidates)`. A5 is the same `A4Brain` organism with one cell push per step.
2. `isolated-graph/tentacle-brain-a3.mjs`: `learn(records)` propagates episode trajectory returns, policy/value/resistance gradients; `endEpisode` judges candidate connections against counterfactual replay loss and retains/retracts them. It maintains current learned IN, REC, OUT links, resistance predictions and affordance/value credit.
3. `isolated-graph/text-tentacle-policy-a6.mjs`: TogetherA6 stores the A5 tool pool, contextual recipe memories, calls `super.learn` for A5 resistance/evidence updates and `super.grow` for A5 candidate creation; its temporary physical connection semantics differ from persistent learned policy weights.
4. `isolated-graph/text-worker-a7grid.mjs`: imports cloned A5 `A4Brain` and `TogetherA6`, but the CUDA branch dispatches `gpuCrew.page(tg,att)` (the `HisTextA7` driver). That path does **not invoke `tg.learn` or `tg.grow`**. The A5 `tg.pool` edges are exported as *inactive historical candidates* for the UI.
5. `isolated-graph/cuda-text-a7/text-a7-his-gpu.mjs`: trains the separate `TextA7Ants` six-cell actor in `native-a7-text-cuda`. Genuine CUDA motor/resistance weights change, but this is not evidence of the A4/A5 learned IN/REC/OUT structure, the multiple-candidate correction, A5 trajectory policy/value learning, or A5 counterfactual pruning being trained on NVIDIA.
6. Therefore visible A7 activity or CUDA `updatedCoefficients` alone **does not establish A4/A5-like progressive learning**, nor correct text typing. Must compare frozen held-out exercises / transfer and learning curves against a same-start A4/A5 baseline before any claim of feature parity.
7. The V9 Concept Flow/learned medium-permeability field is not integrated into native Text A7 CUDA's TD learner, as disclosed in the UI's stats.

## Next regression-safe training work (not yet implemented)
- Capture fixed-seed same-start training/validation runs from A4/A5 map organisms, A6 Text and the A7 native six-cell actor, comparing correct typed bytes (not coefficient changes), tries per byte, blocked contacts, new/retained/retracted links, old-task retention and held-out behavior.
- Establish causal test showing any borrowed A5 trajectory/evidence/counterfactual mechanism increases A7 performance without suppressing physical independent fingers, actual resistances or CUDA throughput. Implement only what passes.
- Never replace A7's real physical GPU actor with the map A5 CPU policy, synthesize success/physical link events, or redesign the frozen A6 visualizer.
