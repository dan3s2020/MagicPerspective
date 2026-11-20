# 2026-11-20 — V5 primitive discovery transferred into the ACTUAL original V42 Brain, with real SHA-256 action feedback

**Status: original Brain executed, THREE GitHub Actions experiments SUCCESS, all three raw per-trial artifacts and exact Brain checkpoint verified. No SHA-256 cryptographic weakness has been shown.**

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

## Experiment C: Real in-distribution state swaps + ORIGINAL Brain checkpoint persistence

**Actually EXECUTED:** [GitHub run 44654032980](https://github.com/dan3s2020/MagicPerspective/actions/runs/44654032980), **SUCCESS**. Source `research/sha256-labyrinth-20261119/native_v5_sha_in_distribution_state_test.mjs`; full raw artifact ID **14591708821**; it contains `native_v5_sha_in_distribution_ablation_results.json` (288,572 bytes) and the actual new original Brain checkpoint `original_v42_sha_discovery_rewarded.v8` (**56,416,433 bytes**).

Training is **identical** to A and B: same original 80 worlds, 2,584 actions, 1,280 observable discoveries, each real original Brain experiences 301,968 tokens; 25 heldout worlds per size (8/16/24). This experiment evaluated **52,103** SHA-256 operations (all independently checked against Node crypto).

Causal control 1: at each step, keep the original trained Brain unchanged but feed a real map-state token sampled in a *permuted time order* from that SAME world's authentic rewarded Brain trajectory.

Causal control 2: feed an authentic map-state token from a DIFFERENT heldout world of the same size at a matching step. Both interventions preserve in-domain token patterns better than fabricated `S00XX` strings.

| Heldout world | Correct own map state | SAME-world genuine states but time-permuted | OTHER-world genuine state at current step |
| --- | ---: | ---: | ---: |
| 8 outputs | **21.16** actions | 23.48 | 23.84 |
| 16 outputs | **44.12** | 50.44 | 53.48 (24/25 completed) |
| 24 outputs | **63.44** | 72.68 | 71.20 |

**Same-world shuffled states** are worse than correctly timed states: trained Brain wins on **19/25**, **21/25**, **22/25** cases by size. Bootstrap paired 95% resampled CI for extra steps due to same-world time permutation:
- 8 outputs: **+2.32** steps, CI **[+0.52,+3.92]**.
- 16 outputs: **+6.32** steps, CI **[+2.16,+9.84]**.
- 24 outputs: **+9.24** steps, CI **[+4.32,+13.92]**.

The OTHER-world wrong-state control adds +2.68/+9.36/+7.76 steps. Its 95% paired CIs include zero for 8 and 16 outputs, and exclude zero for 24; those specific two effects are not individually conclusive in this sample. In-domain same-world time permutation is the clearer evidence that timing of the original map state contributes to action choice.

### Trained original V42 checkpoint: SAVE/LOAD actually verified

- Actual API `Brain.save(file)` serialized the original trained Brain to `research/sha256-labyrinth-20261119/original_v42_sha_discovery_rewarded.v8`, **56,416,433 bytes**, stored in CI artifact (not committed to Git, preserving repo history).
- `Brain.load(file)` returned a revived original Brain with `lived === 301968` and **bit-identical action-token predictive scores** at four specified fixed test contexts: `S33XX`, `S00XX`, `S22AB`, `S11GH`.
- Log `SHA_ORIGINAL_BRAIN_CHECKPOINT` returned `status=exact_native_restore_verified`, `parity=true`.
- This proves correct SAVE/LOAD for the tested probes and basic state restoration. It is **not** an exhaustive proof that all future stochastic trajectories are identical, nor evidence that the learned policy can invert SHA-256.
- Future experiments can use this artifact to avoid re-running 80-world training. Always verify an original-Brain checkpoint loader with the exact pinned class and model/constructor source.

### Narrow combined conclusion

Three distinct controls (reward shuffling, fake state ablations, authentic in-distribution state shuffling) support an actual, learned native V42 ability to choose primitive experiments according to what its own instrumented SHA discovery map says and WHEN that status was observed. A transparent 16/32/48-step handcoded own-map heuristic still beats the original Brain; no spontaneous invention of primitive operators or reward gate was observed.

**No preimage attack:** A controlled 8-to-24-action map discovery task using a privileged SHA word schedule instrument is not the same as an unknown-hash inversion. `W[16]`/`W[20]` observed in this experiment is not available from a final SHA digest alone. This entire work demonstrates a transferable **research-experiment selection policy**, not general SHA-256 cryptanalysis. No vulnerability report warranted.
