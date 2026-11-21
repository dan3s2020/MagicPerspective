# 2026-11-21 — Original Brain V42 SHA-256 backward-path falsification on 16-bit hidden messages

**Status:** new native experiment source and GitHub CI committed. **Scores must be read from completed CI, not invented or inferred from code.** No SHA-256 vulnerability or preimage advantage is claimed.

## Exact task and why it is different

The user explicitly requested **recovery of a hidden preimage from a SHA-256 target digest** using the existing original organism. Prior V5 research completed **SHA causal action-effect maps**; those 75/75 map completions are NOT recoveries of hidden preimages. The old SHA one-byte preimage-search policy equaled a wrong-target control, and the full 64-round backward-IV Hamming score had no useful corrective gradient.

This new isolated test uses the **unchanged** native `Brain` class from `v17/transcend/torus-aether/devour/brain.mjs`. For full 64-round SHA-256 of **two-byte messages**, train only on 384 known target messages; 4 different one-bit corrections per known target (1,536 labeled experiences). Each native training experience consists of **48 four-character ASCII-hex projections** that together cover the public 256-bit target digest, the public 256-bit candidate digest and their XOR followed by an action token for one of sixteen single-bit message flips. There is no substitute Q learner, third-party oracle policy, hidden target register state or SHA word schedule in the native sensory input. The Brain's original `live` learns those action consequences; its original `predict` ranks the 16 possible correction bits during frozen testing.

At testing, 256 distinct hidden **16-bit** target messages are held out, and each is excluded from the entire one-bit neighborhood of every training target (so no heldout true preimage was accidentally observed even as a training candidate). The organism receives **only two SHA-256 digests**: the target digest and the digest of a supplied candidate, not the secret 16-bit target message. Original Brain weights are frozen. Every ranked proposed bit is checked by *full SHA256(candidate XOR 1<<bit) == targetDigest*. This is a genuine locally conditioned inverse-action test, not a map-completion test.

**Serious limitation:** the benchmark supplies a candidate that is *already one bit away* from the unknown true message. That is privileged **task construction**, not a condition available in arbitrary SHA-256 inversion. Even 100% one-bit correction would not by itself be general preimage inversion. The 16-bit target has 65,536 possibilities, so this is still far from general SHA-256 message spaces.

## Strict controls

- Same trained original `Brain.predict`, but target digest replaced with the digest of another *unseen* target (same candidate), to test whether its predictions depend beneficially on the correct target.
- Original `Brain` with exactly the same sensor exposure but intentionally incorrect action supervision (label-shuffled during training).
- Random **unique** ordering of all sixteen candidate bit flips (same 1/4/8 action budgets, no repeats).
- Report exact top-1, top-4, top-8 SHA256 verified recoveries, direct model-vs-wrong-target paired outcomes, action frequency, actual SHA physics validations and seed.
- Chance expectation for random one-bit correction: top1 **1/16 = 6.25%**, top4 **4/16 = 25%**, top8 **8/16 = 50%**.
- A result is a credible algorithmic progress signal only if the **correct-digest native Brain** beats the wrong-target and random controls on previously unseen data at matched compute. If it doesn't, do not claim SHA inversion.
- No model changes during blind evaluation and no secret, correct bit, or numeric test-answer reward enters native inputs. The evaluator retains hidden truth only to construct the one-bit-close starting candidate and verify SHA256 equality.

## Files, exact state and reproducibility

- `research/sha256-labyrinth-20261119/native_16bit_oneflip_inverse.mjs` — new isolated source; copies the independently `node:crypto`-verified 64-round SHA256 world from previous original native V5 SHA study, imports unchanged original `Brain`. No synthetic organ substitution.
- `.github/workflows/sha256-native-16bit-oneflip-inverse.yml` — frozen GitHub Actions, Node 22, train384/test256, four labeled one-bit interventions per known preimage.
- CI: [corrected ASCII run 44921412185](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921412185), now with strict original-native alphabet. Older [run 44920967541](https://github.com/dan3s2020/MagicPerspective/actions/runs/44920967541) was **cancelled** after detecting the risk that a hidden test preimage might occur among the training candidates; it must never be cited as a valid run.
- Raw result will be `research/sha256-labyrinth-20261119/native_16bit_oneflip_inverse_ascii_results.json` if and only if CI completes successfully; raw artifact `original-v42-sha256-16bit-oneflip-blind`.
- Original `main`, historical V5 Python, workers/UI/other experiment branches and checkpoints are not changed.

## Critical original-native 128-symbol input contract: corrected

The first execution [44921082206](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921082206) returned 16/256 (top-1), identical with wrong digest and incorrect-label controls, and a single chosen action symbol. **It is INVALID as an organism-capability experiment**, despite the CI process exiting with status `success`, because the original source `v17/transcend/torus-aether/emergent.mjs` sets `const N = 128` and `v17/transcend/torus-aether/lean-c.mjs` initializes its original `SparseCounter.total` with 128 slots. The first test's raw 0–255 digest bytes and 224–239 action symbols exceeded the valid 0–127 alphabet. This is a protocol bug I introduced, NOT evidence that the organism cannot learn inversion.

**Fix:** encode every byte of both public SHA256 digests using lossless ASCII hexadecimal symbols 0–9/a–f (codes 48–57, 97–102), plus 16 original-compatible uppercase action symbols A–P (codes 65–80). Sensor views cover all 32 digest bytes and XOR differences with 4 ASCII symbols/view; 48 views/example. Every view and every action is explicitly range-checked below 128 before `Brain.live`. Native Brain original source remains unchanged. Control includes the same wrong-digest and wrong-action-supervision arms.

**Only the corrected ASCII-native CI results can be used for model capability claims.** [Latest corrected GitHub Actions branch run list](https://github.com/dan3s2020/MagicPerspective/actions/workflows/sha256-native-16bit-oneflip-inverse.yml). The stronger split excluding all one-bit neighbors of training preimages remains enforced, and the entire SHA256 computation is still verified by Node crypto. The 16-bit candidate is deliberately constructed one bit away, which is an artificial local task, not general SHA inversion.

## Decision and mission boundary

**Actual global SHA-256 inversion remains unsolved** in the current work. This is one falsifiable diagnostic where the actual original organism has to choose a correction based on the target hash, rather than receive credit for completing a discovery map. Follow-up modifications must be driven by actual test data; repeat neither Python V5 nor reward-map completion as a substitute for the user's preimage mission.

## FINAL VERIFIED EVIDENCE — all numeric results are ACTUAL original Brain executions (2026-11-21)

### A. Corrected native ASCII SHA-256 inverse-bit diagnostic, completed

[GitHub Actions 44921412185](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921412185) — **SUCCESS**, raw artifact `original-v42-sha256-16bit-oneflip-blind` (ID `14713499098`). Full JSON `native_16bit_oneflip_inverse_ascii_results.json` opened independently after download. Actual original V42 Brain trained for **368,640** symbols across 384 known 16-bit targets × four supervised single-bit correction examples (1,536 experiences × 48 four-character ASCII SHA sensor views + label). Physics crosschecks `2444` full 64-round SHA-256 operations. **256** hidden two-byte targets (completely excluded from training targets and all their one-bit neighbors).

| Policy | Correct bit as first action /256 | True bit among first four /256 | True bit among first eight /256 |
| --- | ---: | ---: | ---: |
| Original trained Brain, **correct** public target digest | **16** | 59 | 129 |
| **Same** trained Brain, wrong heldout target digest | **16** | 61 | 124 |
| Original Brain with deliberately incorrect training action labels | 16 | 65 | 127 |
| Random ordering of 16 distinct bit flips | **17** | **78** | 136 |
| Exact random expectation | 16 | 64 | 128 |

Paired correct-target versus wrong-target top-1: **16 successes shared, correct-only 0, wrong-only 0**. Native first action was bit10 in **255/256** correct-target tasks and **252/256** wrong-target tasks, with no measurable target-conditioned improvement. It is not enough to train on public SHA target/candidate digest pairs: this exact original-Brain feature path did not identify the correcting bit on never-trained 16-bit targets any better than random.

**Important evaluation precision:** top-k counts rank the genuinely correcting bit (a hidden bit label available only to evaluator); 64-round SHA verification is performed on target/candidate computations, and actual top-1 candidate SHA verification is explicitly recorded for the first 12 trials. Since each starting candidate is constructed as exactly one bit from its target and the correct action is that bit, bit-hit metrics correspond to returning the constructed preimage in this highly restricted local task. Do NOT imply all top-k proposed candidate hashes were separately evaluated as SHA-world queries or that arbitrary unknown preimages were recovered.

**Why previous 16/256 is invalid**: [44921082206](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921082206) used raw digest symbols and action labels outside the original N=128 alphabet. That run was structurally invalid, not evidence. Corrected run 44921412185 is the evidence above.

### B. Positive control: native organism actually can learn action selection from a public SHA digest

[GitHub Actions 44922285244](https://github.com/dan3s2020/MagicPerspective/actions/runs/44922285244) **SUCCESS**, raw artifact `sha256-original-v42-ascii-positive-control` ID `14713389685`, `native_ascii_wiring_positive_results.json` inspected. The ORIGINAL V42 `Brain.live` saw a simple and deliberately informative public digest nibble (ASCII hexadecimal character), then the corresponding action label A..P. Frozen `Brain.predict` on **512 distinct unseen 16-bit-message hashes**:
- **512/512** correct actions, all 16 actions produced;
- if the digest nibble was **masked**, only **30/512 = 5.86%**, near the 1/16 = 6.25% chance baseline.
- 512 known training cases / 2,560 native `live` symbols. This validates the native ASCII sensor/action interface and proves the exact Brain can condition on public digest information when there is a learnable rule. **It is an intentionally trivial control, not cryptographic inversion.**

### Exact conclusion and user objective

This task finally scored a *real unknown-target inverse action* rather than completion of an instrumented discovery map. The experimental model did NOT beat the wrong-target and random controls. This does not establish any SHA-256 cryptographic flaw. More seed tuning or increasing `c.cap` without a new mechanism would repeat already tested dead ends. The unmodified native Brain's learned short-context patterns did not discover a generalized relation from public full SHA256 digests to the required message bit flip.

The mission remains **recover an arbitrary unknown preimage from only its final SHA256 digest at lower compute than generic search**. An artificially one-bit-close 16-bit candidate is NOT this mission, and 75/75 V5 map completions are NOT this mission. Any next proposal must include novel source-level causal SHA schedule inference from **public** target information with stronger heldout/generalization and shuffled-target matched-compute controls.

### Raw source and verified evidence

- [Original native 16-bit SHA inverse-bit source](../research/sha256-labyrinth-20261119/native_16bit_oneflip_inverse.mjs)
- [Positive original-native SHA digest wiring control source](../research/sha256-labyrinth-20261119/native_sha256_ascii_positive_control.mjs)
- [Corrected 16-bit original Brain CI](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921412185)
- [Native positive-control CI](https://github.com/dan3s2020/MagicPerspective/actions/runs/44922285244)
- No changes to original `v17/transcend/torus-aether/devour/brain.mjs`, `main`, production UI, checkpoints or active processes.
