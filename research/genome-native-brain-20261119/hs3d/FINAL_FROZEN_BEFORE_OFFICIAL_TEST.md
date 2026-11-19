# Frozen winning original-native HS3D donor organism — before opening official Test

Date: 2026-11-19. **THIS FILE IS COMMITTED BEFORE any original official `Test` HS3D donor files are checked out, inspected or scored.**

## Actual completed development screening evidence
Full 12-way authentic human HS3D positive-vs-negative donor-site development matrix (140nt real DNA, central GT fixed in all 400 development examples, 1,400 unique actual train examples) finished on GitHub:
https://github.com/dan3s2020/MagicPerspective/actions/runs/44612785045

Fixed and documented before results: choose maximum **macro-F1**, with accuracy then original predetermined mode order as tie breakers, on 400 from original official **Train**, independent of the 1,400 training examples. `R2R3-off-down72` won by that preregistered metric.

### FROZEN winner (no post-test selection)
- Mode: **`R2R3-off-down72`**
- Brain source: **unchanged actual original MagicPerspective V42** `v17/transcend/torus-aether/devour/brain.mjs` and its native `Brain.live()`/`Brain.predict()`.
- Original native `EmergentChain` constructor: `{depth:2,seeker:"C",budEvery:400,maxWires:16,off:["R2","R3"]}`; native C cap=4; seed=20261119.
- Observed DNA: all 140 original bases per record, rearranged losslessly so the original bases 72..75 become the four last original Brain input symbols. The known GT is at bases 70..71. No true/false class or result is fed to the organism at prediction time.
- Exactly 700 positive and 700 negative unique real HS3D original `Train` examples chosen by deterministic SHA-256 ordering. The next 200 each were used as exploratory development.
- Winner development: **334/400 correct, 83.50% accuracy, 83.2979% macro-F1**, confusion `P={P:189,N:11}; N={P:55,N:145}`.
- Original baseline `R3-default-core70`: **68.75%** development accuracy / 68.7169% macro-F1.
- Other native alternative `R3-off-down72`: **81.50%** / 81.3315% macro-F1.
- Negative view `R3-off-down78`: **51.00%**, and `R3-off-remote100`: **55.25%**. Not all flanking windows are predictive.
- All development examples carry central GT. Thus center-GT recognition alone cannot account for classification above chance on the balanced development split.

## Sole official Test protocol (locked now)

1. Checkout the same public EnsembleSplice repository SHA `e04aa5aeb4035adac9ce6c65c2143c2ef7163332`, including **previously untouched official Test** donor positive and negative 140nt sequence files.
2. Retrain **only** the exact frozen winner on the **same 1,400 original training records**. Do not change mode, hyperparameters, input rearrangement, seed, epochs, dataset selection or decision rule.
3. Evaluate on **all official Test** donor records, excluding only exact DNA overlap with the 1,400 train and 400 development records and duplicate DNA within Test. Report all exclusions and class distributions. The official dataset's gene/homology grouping is not demonstrated.
4. Report official Test **macro-F1 first**, accuracy, balanced accuracy, class-wise recall/precision, confusion, exact central GT coverage, test file SHA256, total raw counts and all original predictions (CI artifact).
5. Include constant-guess balanced and canonical-GT-only controls. No faked AG2 baseline.
6. No inspecting other modes on official Test or adjusting methods, weights/thresholds or selected window after seeing official Test outcome.

## What can and cannot be claimed

If above chance on official Test with GT shared by all sites, this will support a real native-organism prediction based on nontrivial **flanking nucleotide context** (though still limited to local four-base input and manually designed viewpoint). It will NOT prove autonomous perspective discovery, physiological splice strength, causal variants, independent test-by-gene, AlphaGenome 2 parity or novel human molecular science. That stronger outcome needs a different native causal capability and a separately measured biological assay.

Frozen record committed before final Action workflow creation. **Do not use this new Test for later adaptive model tuning**.
