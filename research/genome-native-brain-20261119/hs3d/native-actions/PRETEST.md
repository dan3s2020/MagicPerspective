# Original-organism native perspective-action experiment — pre-registered

**Date:** 2026-11-19. This is NOT the previous 4-base fixed-view scan repeated with new parameters.

## Why this is a genuinely new mechanism test

The earlier original V42 organism identified true vs false donor GT sites **79.18%** of the time on 1,100 *official* human HS3D test records using a manually chosen 4nt downstream view (selected on development before reading official Test). A simple 20nt position-wise PWM control scored **91.18%** on the same test, meaning the original organism still leaves local biological information unused.

**New causal hypothesis:** the same original Brain can use its **existing** `ConstructedPathLearner.learnTransferable()` /`transferableScore()` as an organ for selecting among physically experienced real DNA windows, guided only by historical feedback from its OWN native predictions. No separate trained classifier, new neural network, fake donor, precomputed label-path target, or replacement of `Brain.live()`/`Brain.predict()`.

## Exact native method

1. Real world: one unmodified **140nt HS3D donor sequence**; label true/false is unavailable at inference.
2. Original native C/A Brain lives *real window observations* consisting of a **single physical viewport identifier and the four genuine nucleotides seen there** (one 5-symbol observation), then sees P/N label only during supervised learning. The actual original `LeanC` cap is **5**, not exponential 16/32. Each original training row is experienced at twelve distinct viewport positions; this uses the original Brain, not twelve replacement models.
3. Candidate physical viewport positions, zero-based, **frozen**: `[54,58,62,66,68,70,72,74,78,82,90,100]`; the original body is allowed to observe all 12 candidates before final selection. The candidate set is **hand-authored**, not automatically invented, and scanning all of them is **not budget-limited exploration**.
4. Use original `Brain.predict([positionToken,base1,base2,base3,base4])` to predict each viewport's P or N. Any class confidence comes solely from the *same trained native Brain*.
5. Native view-selection organ: original `brain.constructedPaths` already has its own real `pathPolicy[6]` and `learnTransferable(feature,reward)`. During the calibration subset, each native view earns one *historical binary reward* if its native predicted class was correct; then the original policy itself updates. Feature vector (predefined): bias=1, position normalized relative to 70 (bounded [-1,1]), native margin `abs(P-N)/(P+N)`, negative uncertainty `-(1-margin)`, native P support `P/(P+N)`, observed 4-base diversity fraction `uniqueBases/4`. These features contain **NO ground-truth label**. The label enters only the outcome reward in calibration.
6. In development, freeze both original Brain and the original native `ConstructedPathLearner.pathPolicy`; select the view with highest *native policy score* and take that view's class prediction. No additional class mapping, learned external head, oracle view, or test label is passed to the system.
7. Report the chosen-view distribution, changes in stored native pathPolicy, native multi-view performance vs fixed72, fixed core70, fixed upstream66, confidence-only selection and naïve voting controls. We distinguish *policy-controlled retrospective view selection* from genuinely limited-observation active discovery.

## Frozen training and validation split

From original upstream **TRAIN ONLY**, pinned `OluwadareLab/EnsembleSplice@e04aa5aeb4035adac9ce6c65c2143c2ef7163332`:
- 600 unique true donor + 600 unique false donor sequences: 1,200 rows for native Brain supervised `live`; each row's 12 true windows/label seen during training.
- next 100 true + 100 false: 200 **calibration** rows: native Brain frozen; only the original `brain.constructedPaths.learnTransferable` earns feedback about native predictions.
- next 200 true + 200 false: **400 development rows**: both original Brain and policy frozen; no label in inference.
- Exact duplicate DNA across classes removed and data within each class sorted by salted SHA256. No original official `Test` file checked out in development.
- Training mode candidates only: original V42 built-in `off:["R3"]` and `off:["R2","R3"]`, both native C cap=5. The class encoding is always 'P'/'N'.
- Report metrics by class, confusion and per-example native paths; select on development macro-F1 only. **Do not use previously viewed donor official Test as an untouched confirmatory set** for any new method.
- A future genuinely new confirmation should use a new independent biological cohort or at least the still-unseen **HS3D acceptor** task, with a committed domain-adaptation protocol and no peek at its official Test.

## Stop/go

If the native perspective policy does not beat the same Brain's fixed view or produces a failure, record the negative outcome, preserve raw data and stop claiming autonomous genomic attention. If it does, freeze the original organism/policy and seek independent validation on different human splice-site data. A calibrated policy over **manually enumerated windows** is not automatic discovery of arbitrary genomic structures or parity with AlphaGenome 2.

No existing Brain/Trace/Draw code, main branch, donor GGUF, UI or checkpoints are modified. New adapter owns no independent trainable classifier: the ONLY trainable objects are the original Brain and its already-existing ConstructedPathLearner.
