# New causal hypothesis: reported mean ΔPSI may erase genuine cell-conditioned genetic effects
Date: 2026-11-22; pre-registered **before any cell-wise ΔPSI label-distribution audit**.

## Actual biological insight to test
The original Vex-seq lab measurement table contains distinct `delta_psi_K` and `delta_psi_H` for different experimental cell settings, alongside aggregate `delta_PSI`. The first source row visibly contains opposite signs in K and H while aggregate is close to zero. Hence it is plausible that calling all near-zero **average** effects 'no impact' hides variant×cell-context regulation.

This is NOT a claim that these columns correspond to AlphaGenome 2's particular cell types or its performance metric. Verify definitions from the original Vex-seq publication before naming tissues/cell lines. Never invent cell identity.

## Frozen audit protocol
- Original published source `scottiadamson/Vex-seq@36d9c4a6e5e74def46b3cada69d3166f08c54bd5`, measured table `processed_files/delta_PSI_values.tsv`, 2055 rows.
- Only inspect **the 1303 training-partition SNV IDs** from `vexseq-source.mjs`; do NOT inspect dev390 or final267 cell-wise effect labels at this stage, so they remain unused for new hypothesis validation.
- For each authentic train variant, parse original continuous `delta_psi_K`, `delta_psi_H`, `delta_PSI` with no normalization assumptions. Report marginal distributions at fixed ±5 percentage-point threshold, meaningful mixed-sign pairs (K≥+5/H≤−5 or vice versa), and near-zero combined ΔPSI but strong nonzero response in at least one condition.
- Distinguish strong **opposite directions** from any mild sign disagreement due to measurement noise.
- Keep actual source IDs and exact target values out of learner at inference.

## Go/no-go
If genuine cell-specific differences occur in a useful number of training events, a NEXT experiment may use the original V42 Brain C9 and a real "which cell setting" input token plus 4 true REF+4 ALT bases. The same original Brain must be trained across K and H conditions, predicting categories ±5 or measured ranking without a new learned classifier, and compare to an original shared Brain without cell tag (same capacity / negative shuffled-tag control).
No additional model-level result or claim of AG2 parity until actual runs, matched baselines and new heldout group tests.

Failure to find cell-dependent effects must be documented. Do not cherry-pick threshold after inspecting values. The existing four-mode original C8/C9 mean-effect run remains entirely unchanged and isolated.
