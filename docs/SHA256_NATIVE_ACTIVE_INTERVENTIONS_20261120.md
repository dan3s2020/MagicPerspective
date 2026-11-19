# 2026-11-20 — Original V42 Brain, active real SHA-256 interventions

## Status / exact scope
Research-only branch, based on original pinned MagicPerspective V42 source. Neither `main` nor existing brain/worker/UI/checkpoints changed. **This experiment does NOT show a weakness in SHA-256.** It tests self-selected action effects on one-byte candidate messages, each evaluated through the full standard 64-round SHA-256 with bit-exact `node:crypto` verification. A one-byte message search is a deliberately small diagnostic universe.

The organism is the *original unmodified* `Brain` and `Discoverer`, with genuine `Brain.live`, `Discoverer.learnStep`, `Discoverer.choose`, `Brain.predict` and `Discoverer.shapeGraph`. No substitute neural policy or fabricated reward counters. The external world engine is a deterministic original-SHA simulator; it represents 256 possible **input messages** by the cells of a 16×16 physical board. A move changes the candidate message and recomputes the 64-round SHA-256. The target position is hidden, with no false target marker or pre-generated path; the evaluation agent sees the target digest only.

**Important caveat:** `Discoverer.choose` reads the retina and visits, not the digest. Its action choices are **not target-conditioned**; finding a matching byte by exploration does not mean learning SHA inverse structure. `Brain.predict` does see the experienced SHA states and the target digest but has very limited short-range context; on the old encoding, it does not use the target.

## Actual executable and CI evidence
- Source V1: `research/sha256-labyrinth-20261119/native_sha256_active_interventions.mjs`
- [GitHub Actions 44635321263](https://github.com/dan3s2020/MagicPerspective/actions/runs/44635321263), SUCCESS; 8 training examples, 8 heldout digest-only tasks, 32 real SHA-world queries per task.
  - Original `Discoverer.choose()`: **1/8** exact SHA preimages recovered
  - Original `Brain.predict()`: **0/8**
  - random physical actions: **0/8**
  - uniformly distinct 1-byte proposals: **0/8**
  - The initial training had learned only three physical motor directions; `D.choose` scanned 183 distinct bytes over 238 SHA evaluations vs 256 unique random proposals in 256 queries.
  - First 1/8 success is not significant, nor an advantage.

- Source V2: `research/sha256-labyrinth-20261119/native_sha256_active_calibrated.mjs`
- [GitHub Actions 44635648943](https://github.com/dan3s2020/MagicPerspective/actions/runs/44635648943), SUCCESS; 8 training messages, **64 heldout digests**, 64 maximum SHA-world queries per target.
  - **Corrected four-direction motor training:** on first two *known* worlds, the teacher demonstrated the return walk through already-observed SHA-round states, and `D.learnStep` inferred the missing up action. This is reverse traversal with the **known message and known states**, NOT inversion of unknown SHA256.
  - `Discoverer.choose`: **8/64** recovered, **3,796** SHA-world queries, **3,568** distinct candidate bytes, **228** repeated queries, **12** invalid/blocked motors.
  - `Brain.predict`: **0/64**, 4,096 queries, 544 distinct candidate bytes; **3,552** duplicate attempts and blocked actions.
  - random physical walk: **1/64**, 4,091 queries, 1,065 distinct candidate bytes.
  - uniform candidate search **without replacement**: **13/64**, 3,674 actual queries, 3,674 distinct candidates, zero repeats.
  - `Brain.predict` returned **only one distinct first action across all 64 target digests**, holding the current SHA candidate fixed; it did not show useful hash conditioning.
  - Blind original `Brain.predict` *text* preimage attempt remains **0/64**, and known-world geometry transfer remains **8/8**.
  - **Verdict:** the original motor learns and explores; without target-conditioned SHA structure it **underperforms a simple baseline**.

## No leakage / fairness
- `activeDigests=heldout.map(x=>x.digest)` is the only hidden-task information supplied to the policy. Preimage byte exists only in evaluator generation and never enters the blind policy.
- Each policy calls the exact same `world(candidate)` SHA-256 64-round simulator and checks complete 256-bit digest equality. Every candidate, even blocked/duplicate, consumes a SHA-world query.
- Baselines are evaluated with identical maximum 32 or 64 SHA queries per task; runs stop early upon exact success, so total calls can differ slightly.
- Strong random baseline samples unique candidate bytes; this is especially important because the native grid policy can waste calls revisiting previously evaluated byte values.
- `brain.frozen` prevents Brain weight changes during blind evaluation. `Discoverer.learnStep` may update action effects during its own exploration from observed position transitions, but never learns the hidden preimage; note D chooses with an already learned common physics.

## Open problem, not a claimed result
The SHA-256 endpoint digest does not disclose the location of its preimage in the 16×16 byte-input grid. Merely improving the travel policy will not give cryptographic advantage. To progress, **learn a causal policy whose choices change as a function of the requested digest and whose improvement generalizes to unseen preimages**. Keep the original Brain, evaluate against uniform-without-replacement, shuffle target digests, compare on a larger domain after any small-world advantage, and retain failures as evidence. Do not report SHA256 vulnerability without a reproduced full-SHA attack stronger than generic search.
