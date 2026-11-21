# 2026-11-21 — Original Brain V42 learns transferable discovery selection with **public SHA-256 digest observations only**

**Result: EXECUTED, GitHub Actions `SUCCESS`.** [Exact native run 44919812733](https://github.com/dan3s2020/MagicPerspective/actions/runs/44919812733). Artifact `original-V42-public-digest-only-discovery-transfer` ID `14713227184`, file `native_v5_sha_digest_only_results.json`. SHA-256 vulnerability: **none demonstrated**.

## Why this is a genuinely new experiment

We directly reopened Braivour's real `docs/DISCOVERIES.md`, `research/discovery_maze/README.md`, the V5 source report and the `DISCOVERY-MAZE-V5-PRIMITIVES` deduplication gate. The historical Python `Organism5` is **not rerun**. The previous **native** [V5-to-SHA test 44652037738](https://github.com/dan3s2020/MagicPerspective/actions/runs/44652037738) used an instrument that exposed internal schedule `W[16]/W[20]` alongside the digest; its results were valid only for that instrumented world. Its native map-state ablation run 44653067287 and real in-distribution time/world state swap run 44654032980 are also already executed, not repeated here.

This new controlled test removes privileged schedule words from both the organism's sensory transcript and its discovery map. The same **unmodified original V42 Brain** from `v17/transcend/torus-aether/devour/brain.mjs` runs `Brain.live()` to learn its primitive emission sequence and `Brain.predict()` on the learned map representation. Original 7 V5 primitives: `untried, open, mover_q, again, any, mover, undo`; they are **specified by the researcher**, not autonomously invented.

The physical world changes a candidate 1-, 2- or 3-byte message by flipping one bit chosen through an unknown output-to-bit permutation, and computes **standard SHA-256 64 rounds** every time, cross-checked against `node:crypto`. The experimenter observes only the full digest **of its OWN candidate** before and after the action. The discovery map records the sign of the difference of the two public 256-bit digests: `sign(BigInt('0x'+SHA256(after)) − BigInt('0x'+SHA256(before)))`. It does not read `W[0]`, `W[16]`, `W[20]`, any intermediate SHA states, or the hidden action permutation. This sign is an operational observation of an action, not a gradient toward an unknown hash target.

Training: 80 known-world exploration episodes with 8 hidden bit-output aliases each; **80/80** maps completed, **2,984** action observations, **1,280** useful first-seen signed effects, **30,387** full SHA checks over training+heldout policies. The only models learning from experience are the exact original Brains. A simple **externally coded reward gate** presents 5 additional repeats via `Brain.live` for a newly observed map effect; the shuffled-control original Brain gets the same amount of replay credit assigned to unrelated observations. This gate is not invented by Brain and is not reinforcement-learning code in the original source.

Test: the Brain weights are frozen; 25 unseen worlds for each of 8/16/24 outputs (1/2/3-byte candidate messages), each with a maximum of 160 action evaluations, compared against shuffled credit, uniform primitive actions, untouched original Brain, and a handcoded own-map policy. World seeds match across policies.

## Actual results (JSON opened; no inferred scores)

| Heldout world | Original V42 rewarded Brain (complete / mean capped steps) | Original V42 with shuffled credit | Uniform primitives | Handwritten own-map heuristic |
| --- | --- | --- | --- | --- |
| 8 actions, 1 byte | **25/25 · 26.12** | 22/25 · 52.92 | 25/25 · 37.36 | 25/25 · **22.36** |
| 16 actions, 2 bytes | **25/25 · 58.88** | 21/25 · 97.68 | 25/25 · 77.52 | 25/25 · **45.24** |
| 24 actions, 3 bytes | **25/25 · 89.76** | 9/25 · 145.68 | 25/25 · 119.64 | 25/25 · **70.24** |

Rewarded Brain uses **30.09%, 24.05%, 24.98%** fewer steps than uniform. Against uniform on matching individual worlds it is faster in **20/25, 19/25, 21/25**, and against the shuffled-credit control faster in **23/25, 22/25, 23/25**. Against the handwritten expert it is slower on average by **3.76/13.64/19.52** steps.

Paired non-parametric bootstrap (10,000 resamples; deterministic seed 20261121) of **mean uniform-minus-rewarded steps**, conditional on these exact fixed worlds: **+11.24 [6.40,16.36]** at 8 actions; **+18.64 [8.52,28.00]** at 16; **+29.88 [19.60,40.48]** at 24. This is one training seed and 25 test worlds per size, not cross-training seed variability. Incomplete trials are capped at 160 steps, so means cannot be treated as uncensored time-to-solve for the shuffled-credit policy.

### What the result really proves

- **Positive, bounded:** In a new SHA-256 **causal discovery-map task**, an actual trained original Brain learned to select primitive experiments more efficiently than two meaningful controls (shuffled reward and uniform primitive actions). Its advantage transferred from training on 8 actions to new 16/24-output worlds, without its experiments receiving privileged SHA words.
- **Very important distinction:** `Brain.predict()` selects actions from a compact self-observed **map-status/history** string, not directly from a specified target digest. The original digest samples do enter `Brain.live()` in training, and the map is built using public digest comparisons, but this test does not isolate whether the exact 256-bit digest bytes are needed beyond their sign feedback. Thus **do not claim** learned SHA numerical inversion or target-conditioned preimage actions.
- A simple handcoded heuristic remains faster in every test size; the primitive meanings and event-replay gate were authored externally; the test world's completion criterion is designed. The results do not establish spontaneous invention of primitives, generalized causal law of SHA, or GGUF intelligence assimilation.
- **No target hash to invert was supplied in the heldout task.** 75/75 successes are **discovered experiment maps**, not recovered hidden preimages. No SHA-256 vulnerability is shown.
- A new worthwhile next falsification is to freeze map feedback/sign while scrambling or masking the digest *payload* passed through `Brain.live`, or train without digest payload, matching rewards, to learn whether full SHA sensory numerical detail contributes anything beyond action-map state. Separately, a true unseen-hash preimage task must accept only a target digest and beat equal-compute unique candidate search and shuffled-target controls.

## Exact links

- [Experiment source, unmodified original Brain import](../research/sha256-labyrinth-20261119/native_v5_sha_digest_only_transfer.mjs)
- [Workflow](../.github/workflows/sha256-native-v5-digest-only.yml)
- [Native CI and downloadable raw JSON](https://github.com/dan3s2020/MagicPerspective/actions/runs/44919812733), artifact ID `14713227184`
- [Updated canonical Braivour discovery ledger](https://github.com/dan3s2020/Braivour/blob/research/DISCOVERY-MAZE-V5-SHA256-NATIVE-TRANSFER-20261120/docs/DISCOVERIES.md)
- [Full Braivour V5 native digest-only audit](https://github.com/dan3s2020/Braivour/blob/research/DISCOVERY-MAZE-V5-SHA256-NATIVE-TRANSFER-20261120/docs/2026-11-21_DISCOVERY_V5_SHA_DIGEST_ONLY_TRANSFER.md)

**Preservation:** all Git modifications are restricted to isolated research branches; original Brain source, workers, UI, historical V5 Python experiment, working processes, checkpoints and `main` are unchanged.
