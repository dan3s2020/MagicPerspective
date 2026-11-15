# 2026-11-15 — CatMeows: REAL WAV / original Braivour (MagicPerspective V42) experiment ledger

## Status and anti-fabrication

**EXECUTED**, real audio; **NOT a cat-language decoder**. This experiment uses 440 actual CatMeows version 1.0.2 PCM WAV files, checksum verified `md5:b5fa911bcd6514e39dfef6876f747df4`. The original `Brain.live` and `AligningGraph.write` act as the only learner and predictive mechanism; audio conversion is deterministic (FFT, energy, centroid, spectral bins). Experiment scripts and all native results are in an **isolated branch**, not `main`. No second ML classifier was used.

Authoritative organism root: `dan3s2020/MagicPerspective` original pinned commit `ac205b5bc561274b957584a7dee058a1110ab6f8`. Public isolated experimental branch: [experiment/CATMEOWS-NATIVE-BRAIN-20261115](https://github.com/dan3s2020/MagicPerspective/tree/experiment/CATMEOWS-NATIVE-BRAIN-20261115). The original `brain.mjs` is intact. One native `align.mjs` form operator is **opt-in modified on the isolated branch** to group neighboring acoustic values (explicitly not globally original or a proven semantic operator).

### Grounded dataset facts

- Source: [CatMeows Zenodo 4008297](https://zenodo.org/records/4008297); scientific research / noncommercial source restrictions apply; no WAV committed.
- 440 recordings; 21 cats; 12 owners; B brushing 127, F awaiting food 92, I unfamiliar-room isolation 221.
- File labels denote *eliciting recording context*, **not what a cat said, intended, felt, or requested**.
- Every training/evaluation split excludes all cats **and** all owners common to test. Initial round-robin owner split erroneously shared cats and was automatically rejected before training. Replaced with 11 connected components of cat+owner identity; sizes: 188,54,48,31,27,27,21,20,14,5,5 recordings. Three folds held out 188 / 127 / 125 recordings. The largest connected component alone includes 10 cats belonging across two owner IDs. No training recording was used to choose a test label.
- Evaluation is owner-disjoint exploratory threefold CV; **not** a nested model-selection assessment, not new external-individual validation after choosing a configuration. Class-wise recalls and raw sample predictions stored as run artifacts.

### Actual executed experiments, key measured outcomes

All numbers below are across 440 owner-disjoint test predictions. `BA` = balanced accuracy = arithmetic mean of B/F/I recall (33.33% for the fixed-label chance control). `shuffled BA` = same original organism with shuffled *training* contexts. It is not a calibrated confidence interval.

| Configuration, original native Brain only | Accuracy | BA | Shuffled BA | GitHub Actions |
|---|---:|---:|---:|---|
| 72-symbol absolute acoustic frames, natural class balance | 48.18% | 35.68% | 31.09% | [43729551347](https://github.com/dan3s2020/MagicPerspective/actions/runs/43729551347) |
| 72-symbol acoustic changes, natural class balance | 46.36% | 35.66% | 30.56% | same |
| Absolute acoustic frames; under-sampled equal B/F/I training | 44.32% | 38.04% | 31.50% | [43729876065](https://github.com/dan3s2020/MagicPerspective/actions/runs/43729876065) |
| High-byte non-text acoustic tokens, balanced | 44.32% | 38.04% | 31.50% | same |
| High-byte acoustic tokens, native **audio form bin 2**, balanced | **45.91%** | **39.73%** | **32.13%** | [43730130178](https://github.com/dan3s2020/MagicPerspective/actions/runs/43730130178) |
| Audio form bin 6, balanced | 44.55% | 39.36% | 34.77% | same |
| Global 9-symbol median spectrogram, form bin 2 | 31.14% | 30.40% | 37.02% | [43730385653](https://github.com/dan3s2020/MagicPerspective/actions/runs/43730385653) |
| Global variation + median, form bin 2 | 23.64% | 28.62% | 37.16% | same |
| Full absolute + global suffix, form bin 2 | 36.82% | 36.63% | 35.52% | same |
| Global duration + spectral median, form bin 2 | 46.82% | 39.21% | 32.42% | same |
| Original-Braivour distribution reweighted by train prior alpha=0/0.5/1 | Unchanged | **39.73%** (absolute frames) | 32.13% | [43730701317](https://github.com/dan3s2020/MagicPerspective/actions/runs/43730701317) |
| Original organism, 3 or 9 alternate perspectives / sound, global-only | 29.55% | 28.32% | 36.52% | [43730921321](https://github.com/dan3s2020/MagicPerspective/actions/runs/43730921321) |

**Failure diagnosis:** The native next-event alignment offers too few competing target alternatives at the end of many recordings, so post-hoc train-prior calibration did not change decisions. Multiple episode views led to a near-constant class prediction. Spectral global summaries often lost context information, and class imbalance encouraged isolation predictions. Do not promote those variants as successes.

**Best exploratory mechanism:** native `AligningGraph` acoustic *form* grouping by two adjacent intensity bins, with class-balanced original Brain training. Its BA gain over **a single** permuted-label run is 7.60 percentage points. Temporal reversal under that same setting reduced BA to 30.94%, a useful sensitivity observation, not a proof of comprehension. The mechanism was selected from multiple trials and does not establish statistically confirmed out-of-sample semantic understanding.

### What was *not* demonstrated

No distinct utterance meaning, intent, animal dialogue, request, emotional state, causal intervention, original-GGUF inference appropriation, or generalizable "cat language" was deciphered. CatMeows has context labels but **no ground-truth feline messages or recipient actions**. Higher classification accuracy alone would not fix that lack of semantic evidence. No objective of 100% semantic decoding was achieved, and no "groundbreaking" new globally original technique was proven.

### Causal next mechanism (PROPOSED, NOT EXECUTED)

Only a different source of information can distinguish signal shape from intention: matched recordings with **known recipient response / video and intervention timing**, plus real-time original-Brain perception, imitation and feedback. Blind evaluations require new owners/cats/environments, source leakage tests, and controls where audio and behavioral consequences are decoupled. CatMeows alone offers three elicitation contexts, not verified dialogue labels. If continuing this dataset specifically, focus on diagnosing *why* the native alignment lacks multiple plausible context candidates, rather than repeating frequency binning or permutations.

### Provenance and code

- Isolated public research code: `research/catmeows_native/prepare.py`, `research/catmeows_native/run.mjs`.
- Opt-in native alignment internal modification: `v17/transcend/torus-aether/align.mjs` (only acoustic high-byte form bins; original non-audio code paths preserved).
- Run logs and original heldout JSONL artifacts: links above. Experimental branch commits are provenance, not software release.
- Earlier private Braivour repository branch `experiment/CATMEOWS-NATIVE-BRAIN-20261115` stores the initial staged adapter and Windows launcher, and was initially unable to execute due to unavailable private-repository runners; the later **public MagicPerspective** runner executed every row above. It is incorrect to repeat the stale statement "no genuine audio was executed".
