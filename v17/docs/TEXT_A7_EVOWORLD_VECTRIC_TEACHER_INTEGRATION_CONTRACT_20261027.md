# Text A7: runtime-faithful teacher and adaptive curriculum — sourced design (2026-10-27)

## Existing working lineage (do not reinvent)

**EvoWorld** `main` and **VectricSpores_SwarmLab** `BLACKBOX_CANDIDATE_102_Nomic35_v0.1.17.10.14.2.27` share literally identical Git blobs for:

- `SwarmSubstrate/swarm_substrate/synthetic_teacher_node_replay_v168.py` — blob `0820cc6957b074ecfa969041c850fe485347c4a8`
- `SwarmSubstrate/swarm_substrate/synthetic_teacher_causal_identity_v171.py` — blob `51ca47e64ff38056e01fbd4096be0d62740ecc0a`
- `SwarmSubstrate/swarm_substrate/synthetic_teacher_legacy_adapter_v168.py` — blob `a2cd8c69870186528979ff654a2e15ccc9b449cb`

The teacher compiles a legal plan for a real environment; replay actually calls `Swarm._execute`, checks the terminal state and assigns credit from real environment traces. Its generated privileged target is allowed in **synthetic pretraining only**. Synthetic solves never inflate empirical metrics. The v171 patch adds originating cell IDs to evidence to avoid cross-cell conflation and false repeat penalties. Train/test role/seed split and cell-slot permutation avoid memorized cell identities. The v168 runtime bridge supports 4/6/8/16-cell swarms, but this is **not** direct support for Octopus's layers.

A second **EvoWorld-TrueSwarmLab** `main` implementation, `evoworld/curriculum_teacher.py`, uses `mastery / frontier / stretch` adaptive difficulty, with a deterministic/bandit fallback. Gemma plans curriculum buckets rather than directly writing reward or one instruction per tick.

## What Text A7 already has

- Six real ANT-1 neuron heads driving the four 2-bit selectors on the actual A6 TextCabin and GPU CUDA engine; A6 tab remains baseline.
- 100..100000 GPU worlds, with all-world physical/partial feedback and separately marked contextual resistance and partial causal credit in the current experimental source branch.
- A plateau where 100 worlds can outperform several thousand, suggesting interference/normalization and curriculum are more important than raw world count. This is **not** proof of a globally optimal 100-world setting.
- `1 layer × 1 organism × 6 cells` is the original topology. Current ANT CUDA supports M<=64 total cell heads per GPU world; simply changing the DOM cannot create extra neural layers.

## Teacher integration contract, in this order

1. **Keep historical baselines frozen**: no change to A6 or A7 Math code, model weights, checkpoint format, UI, or background processes.
2. **Runtime-legal synthetic demonstration**: compile a teacher plan for a concrete `TextCabinA6`/native CUDA cabin, including four legal selector pushes, wall state, group voting and actual next state. All claims of success/resistance must come from `TextCabin.step` or `ac::cabinStep`, with a per-cell/proposal identity. Reject nonexecuted traces; never insert guessed reward.
3. **Separate synthetic pretraining from autonomous work**: teacher episodes carry a provenance bit; demonstrate through real physics, but store in a distinct synthetic bank. Learning must use physically measured response. Do not count teacher successes in `allWorldCorrectRate`, autonomous target success, or held-out evaluations. Do not reward a cell for another cell's successful push.
4. **Student credit on real contributions**: per selector, distinguish selected correct, selected wrong, correct proposed but overridden, physically resisted and group disagreement. Original full-submit reward remains unchanged. Teacher is a temporary curriculum/demonstration channel that declines as autonomous mastery rises.
5. **Adaptive lesson selection**: start with a `mastery` / `frontier` / `stretch` mixture, using each current context's measured correct proportion, resistance prediction error, novelty and attempts. Keep a budget for weak contexts and real unseen bytes; do not select solely for aggregate accuracy.
6. **Variable structure is actual compute**: expose layer count, organisms/layer, cells/organism only when every ANT actually has distinct recurrent state and reward/experience credit and each organism/layer has an implemented communication/aggregation path. Retain baseline exact behavior for 1×1×6. Set a GPU-backed safe cap for total cells before allocation and ensure all checkpoint IDs include topology. Do not silently replicate visible circles.
7. **Teacher ablation**: frozen autonomous evaluation on held-out prompts and altered resistance contexts, with fixed seeds, after synthetic pretraining is turned off; compare teacher ON/OFF, 0/25/50/75/100% seeded cells, 100/1000/10000 worlds and several topologies. Record correct bytes per GPU second, first-attempt pass, contextual resistance MAE, repeated resisted actions, generalization, training wall time, VRAM. Keep independent curves for synthetic teaching and real autonomous results.
8. **Fail closed** if executable proof, origin attribution, expected schema, isolated checkpoint or GPU capacity is missing. Never claim synthetic credit as empirical success.

## Implementation status

This is a **source-audited architecture contract**, NOT a working Octopus teacher, not a tested CUDA layer scheduler, and not evidence that teacher improves A7. No production engine/UI/checkpoints are changed by this documentation.
