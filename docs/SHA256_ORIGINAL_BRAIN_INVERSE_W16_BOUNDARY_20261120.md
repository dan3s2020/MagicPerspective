# SHA-256 — Original V42 Brain on exact inverse-round constraints and W[16] schedule frontier

**Date:** 2026-11-20. **Status:** executed, reproduced, original native Brain code unmodified; **no SHA-256 vulnerability demonstrated**. All experiments are on the isolated branch `experiment/SHA256-NATIVE-ROUND-CONSTRAINTS-20261120`; `main`, UI, saved checkpoints and other agents' active processes remain untouched.

## Scope and original mechanism

The primary experimental runner imports the actual original `Brain` from `v17/transcend/torus-aether/devour/brain.mjs` on a descendant of source pin `ac205b5bc561274b957584a7dee058a1110ab6f8`, and trains its actual `Brain.live` and `Brain.predict` on full SHA round *inverse-consistency sensors*. **No surrogate model** was used. Inputs have a **one-byte hidden message only (256 possibilities)**, while the algorithm itself is the genuine full **64-round SHA-256**, verified against `node:crypto`.

The original (unchanged) compression update is

- `T1 = h + Σ1(e) + Ch(e,f,g) + K[t] + W[t]`
- `T2 = Σ0(a) + Maj(a,b,c)`
- `(a',b',c',d',e',f',g',h') = (T1+T2,a,b,c,d+T1,e,f,g)`, with all arithmetic modulo `2^32`.

Given next-round state and a **proposed** word `W[t]`, reverse one step exactly:
`(a,b,c,e,f,g)=(b',c',d',f',g',h')`; `T1=a' - (Σ0(a)+Maj(a,b,c))`, `d=e'-T1`, `h=T1-Σ1(e)-Ch(e,f,g)-K[t]-W[t]` (mod `2^32`).

**Crucial:** This algebra inverts a round *conditional on the proposed W[t]*; it does not determine the hidden W from the final hash. The chosen one-byte candidate determines all `W[0..63]` via the standard SHA message schedule, so the complete inverse from the target digest yields a candidate-dependent initial-state mismatch to the public IV. That mismatch is a *real public-digest-only score*, although it has not been shown to guide effective blind search.

## Runs and results (read from actual completed GitHub Actions logs and artifacts)

### 1. Native original Brain + round inverse constraints, 64 hidden targets

- Native file: `research/sha256-labyrinth-20261119/native_sha256_true_inverse_constraints.mjs`.
- [Successful GitHub Actions run 44644805640](https://github.com/dan3s2020/MagicPerspective/actions/runs/44644805640) (artifact ID `14588103146`, full JSON).
- Two **actual** original Brains (same original source, separate instances): one trained with **the hidden target's first internal round state** (local inverse-oracle diagnostic), one trained with **only the public final digest**. Each trained on eight *known* one-byte messages, with native `live` on physical candidate/inverse states and teacher-demonstrated single-bit correction actions.
- Native `Brain.predict` blind on final digest: **0/64** recoveries in 64 queries per target; candidate oscillates / repeats, visiting only 128 distinct bytes across 4,096 queries total. The model trained with privileged first-round state also got **0/64** in its native ungated search.
- Reference mathematical validation: **64/64** exact full-64 inverse round trips *with known true W schedule*. **64/64** direct one-round algebraic recovery of `W[0]` *when the hidden target's intermediate state after round 1 is supplied*. These two are NON-BRAIN ground-truth controls. They do **not** recover a preimage from just the final digest.
- Native inverse mismatch score directionality: for one candidate that differs by 3–5 input bits from its hidden target, a truly corrective bit-flip improved the inverse state0 mismatch **129/255 (50.59%)**; an actually incorrect bit-flip improved it **146/257 (56.81%)**. No useful blind gradient shown.
- Privileged one-round state diagnostic: corrective flip **171/255 (67.06%)** improved local inverse score, incorrect flip only **68/257 (26.46%)**. Different exposure: the true intermediate round state is being leaked by the experimental diagnostic.

### 2. Same native Brain + novelty gating, independent new blind evaluation

- File: `native_sha256_inverse_depth_ladder.mjs`, [SUCCESS run 44645171157](https://github.com/dan3s2020/MagicPerspective/actions/runs/44645171157), raw artifact `14588470865`.
- On **64 unseen one-byte digests**, at most **64 candidate SHA-world queries** per trial:
  - original `Brain.predict` raw: **0/64**
  - original `Brain.predict` plus a *visit-avoidance* filter (an external action-selection control, original Brain scores unchanged): **15/64** full64 and **13/64** privileged first-round condition
  - SAME novelty filter fed a **wrong target digest**: **15/64** full64, **13/64** first-round
  - uniform unique candidate enumeration: **15/64**
  - random bit-flip walk: **12/64**.
- Thus novelty helps avoid wasted queries but provides **zero observed advantage from the correct digest**. In the earlier greedy controls, searching eight neighbors burns eight candidate evaluations; greedy repeated a tiny number of states and yielded just 6/64 (inverse score) and 5/64 (digest Hamming), with no advantage.

### 3. SHA schedule causality: local depth 1..64, 128 held-out messages

- This **physics-only** ablation was intentionally isolated from native Brain's learning. Code: `sha256_schedule_frontier_ablation.mjs`; [SUCCESS run 44645625466](https://github.com/dan3s2020/MagicPerspective/actions/runs/44645625466); raw artifact `14588905478`.
- Independent 128 one-byte targets, each candidate 3–5 bits wrong; exact target internal state is **supplied at each depth only for this diagnostic**, never claimed to be available from a final hash. Compare rates at which a bitflip reduces backward-reconstructed initial state error for genuinely corrective vs genuinely wrong flips.

| Round depth | Actual public SHA schedule: correct bit improves | Wrong bit improves | Directional advantage (percentage points) |
| ---: | ---: | ---: | ---: |
| 1 | 311/524 = 59.35% | 143/500 = 28.60% | **+30.751** |
| 16 | 311/524 = 59.35% | 143/500 = 28.60% | **+30.751** |
| **17** | 271/524 = 51.72% | 255/500 = 51.00% | **+0.718** |
| 18 | 271/524 = 51.72% | 255/500 = 51.00% | **+0.718** |
| 20 | 274/524 = 52.29% | 271/500 = 54.20% | **−1.910** |
| 24 | 261/524 = 49.81% | 245/500 = 49.00% | **+0.809** |
| 32 | 265/524 = 50.57% | 227/500 = 45.40% | **+5.173** |
| 64 | 249/524 = 47.52% | 262/500 = 52.40% | **−4.881** |

The pattern is exactly constant for round depths 1–16 under identical candidate perturbations, then collapses already at **depth 17**. For a padded one-byte message, the *first schedule word* that is candidate-dependent after the original 16 is `W[16]` (followed by `W[18]`, `W[20]`, etc.); words `W[1..15]` are independent of the byte.

**Why is this not a vulnerability?** The diagnostic at depth 17 uses the TRUE state at depth 17, which a user holding only a final hash does not have. Furthermore, the causal ablation that artificially fixes `W[16]` to its true value restores the +30.751 pp signal at depths 17 and 18, but it **directly discloses the answer** for this one-byte message family:

`W[16] = W[0] + σ0(W[1]) + W[9] + σ1(W[14])`; here `W[1]=W[9]=W[14]=0`, so **`W[16]=W[0]`**, whose top octet is the unknown message. Hence supplying the TRUE `W[16]` is equivalent to supplying the hidden byte. This is a *leakage/oracle control*, not a discovered decoder.

In the second ablation, fixing ALL expanded `W[16..63]` to their true values artificially preserves **+30.751 pp at depth 64**. That also leaks the secret throughout the world and is not a deployable technique.

**Conclusion:** for these samples and this inverse Hamming metric, local directionality is canceled by candidate-dependent message expansion starting at the step that uses W16. It does not prove that all possible cryptanalytic signals disappear or that the full hash loses information; it identifies which part of this particular score is not useful in blind search.

## Source, immutability, and next falsifiable target

- [Actual native original-Brain inverse-round experiment](../research/sha256-labyrinth-20261119/native_sha256_true_inverse_constraints.mjs)
- [Native original-Brain 12-depth and blind-action controls](../research/sha256-labyrinth-20261119/native_sha256_inverse_depth_ladder.mjs)
- [Independent public-SHA schedule causal ablation](../research/sha256-labyrinth-20261119/sha256_schedule_frontier_ablation.mjs)
- Raw complete JSONs in the linked GitHub Actions artifacts; **do not substitute the log summary for the artifact** when recomputing statistics.
- Existing organism source, training processes and checkpoints were not modified.
- No identified SHA-256 vulnerability. This study concerns tiny one-byte preimages and privileged internal-state diagnostics.

**Next meaningful challenge, not yet accomplished:** give the same original organism an action space over internally consistent **unknown `W[t]` families**, where the forward-world SHA physics is real, the only blind target observation is the final digest, and the system must learn correlations in `W` *without seeing hidden target schedule words or internal target states*. Run 16-bit and larger held-out inputs, compare to strict equal-compute independent search and shuffled-target controls. A successful constraint-learning organism must outperform those controls on genuinely unseen SHA tasks before anyone can claim a preimage advance.
