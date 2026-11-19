# Frozen original-native Brain action->reward mechanism, BEFORE the official HS3D acceptor Test

**Date:** 2026-11-19. **Freeze commit precedes any execution/fetch of original upstream official acceptor Test on this branch.**

## Exact completed evidence that determines selection

All three genuine original-Brain reward transition policies were executed only on original human HS3D acceptor TRAIN data with a precommitted method and stable original source:
https://github.com/dan3s2020/MagicPerspective/actions/runs/44623769632

- All arms used exact original V42 Brain `Brain.live()/Brain.predict()`, R2/R3 off, native C5, 1,200 source-true/false supervised training cases (600 of each) over seven real physical genome views.
- All arms used the **same** 400 development records from original Train (indices 1100..1299/class). The original official acceptor `Test` was **not downloaded**.
- Each agent physically observed the same initial real 4nt window [70:74], chose one actual additional view from human-declared positions **[58,62,64,66,74,78]**, and predicted P/N with its **same original Brain**. Reward was revealed only after movement and prediction, in calibration only.
- The learned **action -> positive/negative reward expectation** is the original Brain's own native `Brain.predict([initial4, actionDigit])`, trained only by its original `Brain.live([initial4, actionDigit, actualReward, newline])`. There is no separate action model or `ConstructedPathLearner` selector.

### Original preselected primary metric: macro-F1, actual development n=400

| Original native training feedback | Dev accuracy | Dev macro-F1 | Selected next views |
|---|---:|---:|---|
| No reward learning | 64.75% | 64.51% | 58 on 400/400 |
| 200 reward experiences | 62.75% | 62.03% | 58 on 400/400 |
| **1,000 reward experiences — FROZEN WINNER** | **69.25%** | **68.13%** | **64 on 305/400; 58 on 95/400** |

Identical native Brain after 1,000 action-reward episodes:
- fixed initial 70: 49.25% accuracy;
- fixed upstream64: **71.00% accuracy, 69.30% macro-F1** (still above native learned policy);
- deterministic random second view: 62.75% accuracy;
- same original BRAIN native policy: **69.25% accuracy, 68.13% macro-F1**.
The selector **actually changes its physical action after native reward training** and improves over its original zero-feedback version and random comparator, but remains inferior to the best fixed local view. Candidate physical locations were human-defined; no automatic arbitrary coordinate discovery is claimed.

## FROZEN ONE-SHOT ACCEPTOR OFFICIAL Test

1. Download only the same source `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332` genuine human `ENSdatasets/hs3d_bal/Train` **and, now, previously uninspected `Test`** acceptor files.
2. Build exact original training set (600 P+600 N), calibration set (500 P+500 N), and original Train-derived development records (200 P+200 N) using the same `hs3d-acceptor-transfer-v1:` SHA ordering as above.
3. Recreate same original Brain seed, equations, original architecture, source and training order; run exactly 1,000 real calibration action-reward episodes with same exploration rule and positive/negative feedback. **Do not select a new mode, reward rate, action encoding, viewpoint or threshold after seeing official Test.**
4. At evaluation, accept **all original HS3D acceptor Test entries** of 140 canonical bases, explicitly count and exclude DNA duplicates overlapping any prior Train (including train/calibration/dev) and any conflicting/exact duplicated Test entries. Assert real central AG [68:70] in every retained sample.
5. Freeze all original Brain learning after calibration. For each official Test sample, original native actor sees only initial4, predicts rewards for candidate actions using its unchanged own Brain, chooses its next physical view before reading target DNA, then classifies using original Brain, **exactly two real view observations**. No true P/N or success/failure reward enters Brain at test time.
6. Score **macro-F1 FIRST**, accuracy, balanced accuracy, per-class confusion, precision, recall, actual action counts, selected genomic position histogram, all per-example original native action traces.
7. Compare to original same-Brain fixed70, fixed64, fixed66 and deterministic random under their stated, separate observation budgets. The earlier donor official Test and existing AG2 genomic sources are irrelevant.
8. Source/test SHA256, exact exclusions and original commit SHA must be recorded; full raw per-example output in CI artifact.
9. If independent official acceptor Test performance regresses or remains below fixed64, **disclose negative generalization** and do not call the action learning discovery a new superior genomics method.

## Scientific limitations

A *positive* official Test result would demonstrate a modest, real, reproducible **original-computational-organism action-choice adaptation** within this historical dataset; still not AlphaGenome 2 parity, tissue-conditioned variant functional effect, clinical predictivity, homology-independent validation, autonomous discovery of coordinates or an external laboratory replication.

Selection commit must exist in GitHub history before the official workflow exists.
