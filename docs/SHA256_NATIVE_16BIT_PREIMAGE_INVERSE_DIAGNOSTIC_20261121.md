# 2026-11-21 — Original Brain V42 SHA-256 backward-path falsification on 16-bit hidden messages

**Status:** new native experiment source and GitHub CI committed. **Scores must be read from completed CI, not invented or inferred from code.** No SHA-256 vulnerability or preimage advantage is claimed.

## Exact task and why it is different

The user explicitly requested **recovery of a hidden preimage from a SHA-256 target digest** using the existing original organism. Prior V5 research completed **SHA causal action-effect maps**; those 75/75 map completions are NOT recoveries of hidden preimages. The old SHA one-byte preimage-search policy equaled a wrong-target control, and the full 64-round backward-IV Hamming score had no useful corrective gradient.

This new isolated test uses the **unchanged** native `Brain` class from `v17/transcend/torus-aether/devour/brain.mjs`. For full 64-round SHA-256 of **two-byte messages**, train only on 384 known target messages; 4 different one-bit corrections per known target (1,536 labeled experiences). Each native training experience is a set of 16 projections covering all bytes of the **public 256-bit target digest and the public 256-bit candidate digest** followed by an action token for one of sixteen single-bit message flips. There is no substitute Q learner, third-party oracle policy, hidden target register state or SHA word schedule in the native sensory input. The Brain's original `live` learns those action consequences; its original `predict` ranks the 16 possible correction bits during frozen testing.

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
- CI: [run 44921082206](https://github.com/dan3s2020/MagicPerspective/actions/runs/44921082206), newer leak-protected version. Older [run 44920967541](https://github.com/dan3s2020/MagicPerspective/actions/runs/44920967541) was **cancelled** after detecting the risk that a hidden test preimage might occur among the training candidates; it must never be cited as a valid run.
- Raw result will be `research/sha256-labyrinth-20261119/native_16bit_oneflip_inverse_results.json` if and only if CI completes successfully; raw artifact `original-v42-sha256-16bit-oneflip-blind`.
- Original `main`, historical V5 Python, workers/UI/other experiment branches and checkpoints are not changed.

## Decision and mission boundary

**Actual global SHA-256 inversion remains unsolved** in the current work. This is one falsifiable diagnostic where the actual original organism has to choose a correction based on the target hash, rather than receive credit for completing a discovery map. Follow-up modifications must be driven by actual test data; repeat neither Python V5 nor reward-map completion as a substitute for the user's preimage mission.
