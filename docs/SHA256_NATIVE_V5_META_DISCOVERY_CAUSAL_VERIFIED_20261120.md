# 2026-11-20 — V5 primitive discovery transferred into the ACTUAL original V42 Brain, with real SHA-256 action feedback

**Status: original Brain executed, two full GitHub Actions runs SUCCESS, raw per-trial artifacts audited. One further in-distribution state-swap control is currently isolated and independently tracked. No SHA-256 cryptographic weakness has been shown.**

## Exact provenance and source distinction

The user-directed original discovery materials are in **Braivour branch** `experiment/ORIGINAL-BRAIN-LIVES-WHOLE-INFERENCE-LOOP-20261111`, NOT its `main`:
- `docs/DISCOVERIES.md`, `research/discovery_maze/README.md`, `discovery_maze_v5.py`, five `discovery_v5_off-stop*.json` result files.
- Experiment registry `docs/2026-11-10_EXPERIMENT_DEDUPLICATION_GATE.md` already labels `DISCOVERY-MAZE-V5-PRIMITIVES` **DO NOT REPEAT as-is**.
- Original Python V5 Q-table achieved 5/5 learned-better seed pairs for each of three sizes: mean small **41.715 → 30.025**, middle **106.815 → 89.505**, huge **224.945 → 185.815** capped steps (15/15 paired wins). Python V5's reward **explicitly** uses the hidden true world-score `score(m,w,tol)`; it is NOT V42, Qwen or SHA.
- Source: https://github.com/dan3s2020/Braivour/blob/experiment/ORIGINAL-BRAIN-LIVES-WHOLE-INFERENCE-LOOP-20261111/research/discovery_maze/README.md

**What changed in this new experiment:** run a **single actual original MagicPerspective V42 Brain** (and identical original-Brain controls) instead of V5's separate Q learner. Train `Brain.live` on real SHA-256 bit actions and observable changes in the agent's OWN map, and select primitive actions using `Brain.predict` frozen on genuinely unseen larger physical SHA worlds. The original Brain implementation at `v17/transcend/torus-aether/devour/brain.mjs` remains unchanged, original checkpoints/UI/main unaffected.

The designed discovery target is to observe both positive and negative changes in SHA schedule `W[0]` for each **unknown output↔message-bit mapping**. The message-bit permutation is hidden from the policy. For each action, the physical simulator recomputes **full standard 64-round SHA-256** (every hash crosschecked with `node:crypto`), lets the organism observe `W[16]`, `W[20]`, digest and own map responses, and records discovery when a previously unseen signed response appears. Reward-credit repetition is based on **the organism's own observation**, not the evaluator's true hidden map.

The 7 primitive action categories (untried, open, mover_q, again, any, mover, undo) and a **fivefold replay gate for informative experience** are external experimental design, NOT autonomously invented Brain operators. This is a **meta-discovery action-choice** task, NOT preimage inversion; a user possessing only a final unknown digest cannot observe hidden target `W[16]`/`W[20]` or the internal target SHA trajectory.

## Experiment A: 80-train / 75-heldout original Brain, vs shuffled-credit

[Executed successful CI 44652037738](https://github.com/dan3s2020/MagicPerspective/actions/runs/44652037738), raw artifact `14590414648` (JSON `native_v5_sha_discovery_results.json`), isolated source `research/sha256-labyrinth-20261119/native_v5_sha_discovery_transfer.mjs`.

- 80 known training worlds with **eight outputs**, **2,584 own experimental actions**, **1,280 newly observed effects**, 80/80 training maps fully discovered.
- Both *actually original* Brains experienced **301,968 symbols** each in matched training sets. One rehearsed newly informative discoveries, the other received the **same experiences with their informative-experience bonuses permuted**.
- No learning updates at evaluation; 25 independent test worlds per size 8, 16, 24 outputs corresponding to one, two, three byte SHA-256 messages. **23,128 complete SHA-256 operations**, each validated against `node:crypto`.

| Unknown-output tests | Native Brain with observed discovery reward | Identical Brain with shuffled credit | Uniform primitives / untrained Brain | Handwritten optimal own-map heuristic |
| --- | ---: | ---: | ---: | ---: |
| 8 outputs | **21.16** steps | 31.44 | 33.08 | **16.00** |
| 16 outputs | **44.12** | 57.44 | 67.52 | **32.00** |
| 24 outputs | **63.44** | 83.32 | 102.72 | **48.00** |

All techniques completed 25/25 test worlds at all three sizes in this first run. The trained native Brain beat the shuffled-credit Brain on **21/25**, **22/25**, **23/25** paired worlds by size, with one tie (**66/75 strict faster**). Bootstrap 95% resampled intervals for mean shuffled-minus-rewarded savings, 5,000 resamples per 25 paired trials, fixed seed 2026: **[4.36, 17.52]** actions (8), **[7.84, 20.32]** (16), **[12.20, 28.04]** (24). These are one-run fixed-world uncertainties, not inter-training-seed confidence intervals.

## Experiment B: CAUSAL ablation of what the original Brain knows about its own map

[Executed successful CI 44653067287](https://github.com/dan3s2020/MagicPerspective/actions/runs/44653067287), raw artifact `14591867449` (JSON `native_v5_sha_state_ablation_results.json`). **Exact same deterministic training** as A, new test intervention replaces the `Brain.predict` input state while retaining the original Brain's learned parameters and the same actual SHA physics.

| Heldout test | Real map state | Constant fake state | Inverted count buckets | No previous action history | Only previous action history |
| --- | ---: | ---: | ---: | ---: | ---: |
| 8 outputs | **21.16** | 29.32 | 29.84 | 29.32 | 28.60 |
| 16 outputs | **44.12** | 70.32 | 72.00 | 70.32 | 70.96 |
| 24 outputs | **63.44** | 109.64 | 116.52 | 109.64 | 109.40 |

Means are capped at 160 steps per test. At 24 outputs, constant/inverted/no-history/history-only controls each completed **24/25**, while real-state Brain completed **25/25**. Full sensor/physics and original model are unchanged between these controls, but fake-state inputs may be partly out of the training-state distribution.

Paired bootstrap confidence intervals (3000 resamples, 25 worlds, fixed 2026 seed) for steps saved over constant-state control:
- 8 outputs: **8.16 saved**, 95% interval **[5.20,11.16]**.
- 16 outputs: **26.20 saved**, interval **[17.84,34.64]**.
- 24 outputs: **46.20 saved**, interval **[36.80,56.28]**.

**Narrow justified conclusion:** its learned primitive policy responds beneficially to its own map-status and action-history inputs. It does more than repeat globally frequent output labels. Stronger in-distribution swap testing is appropriate before claiming all state-dependent performance is specifically due to world information rather than OOD penalties.

## Next genuinely new causal discriminator, NOT a rerun of Python V5

A controlled **in-distribution real-state permutation** experiment is isolated as `native_v5_sha_in_distribution_state_test.mjs` on the same research branch: same-world time-permuted native traces, and another world's actually recorded state sequences at the corresponding step. This preserves plausible real state symbols instead of replacing them by constant fake tokens. The independent workflow includes an **actual original Brain.save()/load() checkpoint parity** test to preserve learned weights. **Do not report this third experiment as a result until the completed CI logs and raw artifact have been read.**

## The hard boundary of the user's SHA-256 mission

No result here provides blind inference of unknown `W[t]`, unknown intermediate register states or an advantage over generic SHA-256 preimage search. This is science of **which experiments are informative in an instrumented SHA universe** and the first strong same-Brain transfer demonstration on that meta-discovery task. Internal SHA word observations are part of the experimental instrument, not something inferred from a hidden hash. Source `docs/SHA256_ORIGINAL_BRAIN_INVERSE_W16_BOUNDARY_20261120.md` explains why first-round/internal-`W` access is a privileged diagnostic.

If we want actual SHA preimage advancement, the next step is to ask whether this learned exploration skill can guide branch consistency constraints from **public final digest only**, and require a wrong-digest, uniform unique-candidate, and matched-compute control. **No cryptanalytic vulnerability demonstrated; no security report warranted.**
