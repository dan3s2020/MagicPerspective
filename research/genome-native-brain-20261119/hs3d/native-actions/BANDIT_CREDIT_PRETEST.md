# Original Brain causal action-credit experiment — frozen before execution

Date 2026-11-19. This is a **new causal question** derived from a real negative experiment, NOT a repeated attempt to optimize the same result.

## Confirmed failure being investigated
The first original Brain view policy `ConstructedPathLearner.learnTransferable` processed 2,400 per-window success labels for 200 calibration examples. The native R2/R3-off variant scored **67.50% development accuracy** vs **76.75% for the same Brain's fixed view70**, and preferred many early/low-quality windows. The original pathPolicy updated, but the learned action selection was poor.

Hypothesis: full-information, simultaneously attributed reward for **every window** may not train the same physical one-action-per-decision objective; the original policy also lacked an explicit generic topological distance feature.

## Strict new intervention

Keep exact original native `Brain.live()`, `Brain.predict()` and `ConstructedPathLearner.learnTransferable()`, no separate classifier and the real HS3D 140nt donor true/false labels.

1. **Same native organism**, original V42 Brain C cap5, depth2, native `off:["R2","R3"]`. Twelve original manually prechosen physical window actions remain `[54,58,62,66,68,70,72,74,78,82,90,100]`; candidate set is NOT endogenously discovered.
2. Same 600 true +600 false unique HS3D TRAIN rows for original Brain training.
3. Expanded *distinct* training-only calibration: next **500 true +500 false** original Train rows. Each interaction obtains native predictions before receiving target feedback.
4. New never-used-for-this-mechanism development subset: next **200 true +200 false** Train rows (indices 1100..1299 per class). This is not the official Test and remains **exploratory**, because the method evolved after earlier donor HS3D evidence.
5. Single changed sensory feature: sixth native `ConstructedPathLearner.pathPolicy[6]` feature is now **body/viewport topological proximity to the starting location at position70**: `1 - clamp(abs(start-70)/30,0,1)`, replacing the original candidate-window nucleotide-diversity feature. The feature depends on physical distance only, **not class truth**, and does not tell the policy which window is biologically predictive.
6. **Causal arm A (bandit):** on each calibration sequence, the same native policy chooses **one** window based on its learned scores; on 20% of cases a deterministic exploratory action samples a different viewport. Only the **actually chosen** action gets the post-prediction true/false feedback and a native `learnTransferable(...)` weight update.
7. **Causal arm B (full feedback):** same 1000 calibration examples, same native feature, but update the original policy on **all twelve** already observed windows once their outcomes are known, matching the earlier full-information credit-assignment protocol.
8. Frozen dev evaluation: neither the original Brain nor its original native pathPolicy may learn. Report original policy feature weights before/after, chosen-view histograms, macro-F1, accuracy, per-class confusion, and contrasts with same Brain's fixed70/fixed72/confidence-only/random controls.
9. A result that still loses to fixed70 is a **negative endogenous navigation result**; do not rebrand as autonomous choice or AlphaGenome 2 competitiveness.

This is only a research adapter to an already-existing native Brain/ConstructedPathLearner mechanism. No user running processes, checkpoints, mainline code, Braivour donor or original code are modified.
