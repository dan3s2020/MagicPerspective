# CUDA cognitive parity restoration — evidence ledger (2026-10-19)

**Status: IN PROGRESS; DO NOT MERGE. The existing native CUDA executable still chooses actions with fixed \`chooseAAction\`/\`chooseBAction\`. Never represent this repair branch as fully parity-complete.**

## Baseline / zero-regression gate
- Base: \`feature/CUDA-WALL-POPUP-INPUT-ISOLATION-20261017\` @ \`ed16d7f885354e0d3b2e2e9f58960371be1096fa\`.
- Repair: \`fix/CUDA-COGNITIVE-PARITY-NONREGRESSION-20261018\`.
- All changes to date are **new files**. Existing V9 donor sources, CUDA kernel, observatory, NodeGraph, UI, mechanics, checkpoints, launchers, and source-lock contracts are unchanged.
- Pull request #10 intentionally remains draft.
- GitHub Actions has reported failed runs with no usable job steps/logs; this is not a passing native regression test. Treat CI as **UNVERIFIED** until real logs and green checks are available.

## Implemented and source-proven
- \`native-same-dish/causal-experience-sidecar.mjs\`: a narrow, read-only 2×F32 / Universal Atlas offline experience collector requiring complete physical tapes; separate A/B persistent identities; rejects incomplete/corrupt history.
- \`native-same-dish/native-v9-replay-learning.mjs\`: the **actual V9 donor** \`createLocalBrain\`, \`forwardLocal\`, \`trainLocalSequence\`, \`adamStep\`; real GRU parameters; B's real \`createHigherSelf\`, \`trainHigherSequence\` and \`higherAdamStep\`; actual \`trainConceptWorld\`, \`observeTransition\`, \`observeConceptFlow\`.
- Its learning is **self-supervised on physical consequences**, not actor policy-gradient learning from the old CUDA heuristic (RL is explicitly disabled in the off-policy gradient to avoid imitating the heuristic). Physical action suggestions are reported as shadow values and NEVER injected into the CUDA engine.
- Native actuator IDs 0..3 are explicitly converted to canonical V9 IDs 1..4.
- Concept World only: external 8-bit or map geometry is never passed into V9. The local donor receives a \`OBS_N\` vector with its external ordinary sensor elements zeroed; only the last 2 concept coordinates are populated. The concept encoder itself sees observed proprioceptive displacement/mismatch and the previous action, not world occupancy, target coordinate or internal observer classification.
- Separate B Higher; no accidental Higher A. Separate optimizer states, both checkpointed; frozen replay must leave weights/concepts/Atlas unchanged.
- Actual signed tensors and exact GRU activations can be exported for the add-only \`V9_CONNECTOME_REPLAY.html\` inspector. Its label is **CUDA SHADOW ONLY**, not "live native brain".
- Real source functions were executed in the V8 orchestration harness on synthetic physical-action records (two joint steps; A/B four actions each): V9 Local optimizer A=2,B=2; ConceptWorld A=1,B=1; Higher B=1; Atlas transitions A=4,B=4; Concept Flow updates A=4,B=4; frozen checkpoint was byte-for-byte JSON equivalent; activations body=32,world=24,GRU=48,actor=9,Higher context=24. This is an **isolated source-level proof**, not a CUDA-on-GPU end-to-end run.

## New validation entry points
From repository root:
\`\`\`powershell
node --test tests/native-causal-experience-sidecar.mjs
node --test tests/native-v9-replay-learning.mjs
node --test tests/native-v9-connectome-export.mjs
node --test tests/backend2d-telemetry-decode.mjs tests/backend2d-observatory-replica.mjs
node --test tests/cuda-action-replay-contract.mjs tests/isolated-integrated-source-lock.mjs
node --test tests/concept-world-full-flow.mjs tests/relational-consequence-regression.mjs
\`\`\`
For a **real native observatory tape** with at least 8 FULL head records:
\`\`\`powershell
node native-same-dish/export-v9-connectome.mjs "PATH_TO_NATIVE_OBSERVATORY_OUTPUT" "PATH_TO_NEW_CONNECTOME.json" --probe=0 --steps=8
\`\`\`
Then open \`native-same-dish/V9_CONNECTOME_REPLAY.html\` in a browser and choose the exported JSON file. If the tape is incomplete or does not cover requested steps, the exporter fails rather than claiming full history. The output file must not already exist.

## Mandatory remaining acceptance gates — DO NOT SKIP
1. **Physical contract:** the learner must receive real force/reaction, attempted drive, local deformation, energy/motion and contact events without any hidden wall classifications or checkpoint coordinates. The replay-only source currently does not measure force/reaction; therefore \`externalMediumResistance\` is explicitly **UNMEASURED**. Internal disagreement and environment resistance must not be conflated.
2. **Canonical donor inference parity:** freeze one V9 checkpoint, evaluate reference JS and the GPU port on the identical concept-only observation and recurrent history; compare all layer preactivations, sigmoid/tanh gates, hidden states, actor logits and selected action within documented float tolerances. Include B Higher and many cell counts. No substitute model.
3. **CUDA action ownership:** under an opt-in parity mode, learned V9 outputs MUST actually supply each physical cell's action to the existing CUDA connected-body resolver. No direct reads of \`solid\`, \`cpX\`, \`cpY\` or checkpoint distance in the learner. Preserve original mode byte-identically as a rollback option until verified.
4. **On-policy experience and reward:** collect **every** executed action including rejected and nonmoving ones; train the actor only on episodes genuinely executed by that actor. Use measured consequences and delayed G0 success credits, not heuristic imitation. External goal success signal may be emitted by the environment as an experienced outcome but never its hidden target coordinates.
5. **Control and concept dynamics:** prediction-before-action, actual-effect comparison, causal credit, R/K/A, χ, Ω, Perspectives, morphology, learned reusable concepts, G0 as experienced outcome, cross-map curriculum and RSI counterfactual branches are all separate explicit acceptance tests.
6. **Deadlock:** tests must show the organism can detect recurring internal disagreement, distinguish it from physical resistance, discover or reuse alternative coordinated movement, and improve actual progress without a scripted escape path.
7. **Generalization:** train/validation/test/transfer maps with held-out seeds, target locations, resistance fields, body morphologies and 2–N cell counts. Compare against the untouched fixed CUDA baseline at matched action/compute budgets.
8. **Real execution:** Windows nvcc CMake build, native CUDA on the user's GPUs, full A+B same-dish and A-only/B-only/frozen modes, exact replay, checkpoint resume, slider, NodeGraph, Start Forever, UI event isolation, text trainer and all original source locks must pass. No branch merge until complete.

**Do not delete/rewrite working files, mark the project finished, or certify no regression based on this offline proof.**
