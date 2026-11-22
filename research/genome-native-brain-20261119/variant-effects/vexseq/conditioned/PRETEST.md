# Frozen actual-cell-conditioned REF/ALT splicing-effect experiment
**Date:** 2026-11-22. This protocol is committed BEFORE any new development *cell-conditioned* scoring. No original native code is changed.

## New biological causal question

The authentic Adamson Vex-seq table contains measured `delta_psi_K` (K562) and `delta_psi_H` (HepG2) for identical 140–166nt genomic reporter REF/ALT variants, plus aggregate `delta_PSI`. Original paper: https://pmc.ncbi.nlm.nih.gov/articles/PMC5984807/.

A TRAIN-ONLY audit on the preexisting 1,303 group-partition variants (77 constructs) revealed:
- 340/1303 variants assigned DIFFERENT signs/classes in K562 vs HepG2 at precommitted ±5 percentage-point threshold;
- 188 training variants whose aggregate is neutral at ±5pp but show ≥5pp in at least one cell setting;
- 10 variants with strong opposite-direction effects across these settings.

Hence training original Brain on only average ΔPSI may force it to ignore real effects. The biological condition belongs in original organism perception.

## A lossless compact perspective into original Brain C8, not an outside model

Real REF and ALT constructs in this assay are the SAME 140–166 nucleotide string except for ONE genuine measured substitution. For the four-base reference window containing that substitution, the full four-base ALT window is fully reconstructible from:
- the 4 original REF bases,
- which of the four positions was mutated (0,1,2,3),
- the 1 observed true ALT base.

This yields **6 original raw symbols encoding all eight allele-window nucleotides without loss**; it is not a learned surrogate or synthetic reconstructed biological label. Two additional symbols fit original `LeanC cap=8`:
- real cell identity K or H;
- manually defined original biological proximity bin `a` (≤3), `b` (4–10), `c` (11–25), `d` (26–50), `e` (>50) to nearest original annotated acceptor/donor splice site. This is input metadata, not the answer.

**Exact original-native observation:** `[cell, proximityBin, mutationOffset0to3, refBase0, refBase1, refBase2, refBase3, altBaseAtChange]`, 8 ASCII bytes. Original `Brain.live` learns genuine K or H measured class only during train, original `Brain.predict` receives just those 8 bytes at evaluation. SAME single original Brain processes K and H; do not instantiate one Brain per condition. No extra learned classifier, no detached output head, no hidden target/path.

## Frozen experiment arms (identical learning exposure)
1. `condition-true`: use the true cell identity token K or H, original V42 Brain C8, depth2, native `off:["R2","R3"]` with seed 20261122.
2. `condition-blind`: *same* original Brain architecture, same 1,303×2 authentic training events, same two genuine cell-specific labels and order, but use the constant identity token X, hiding cell identity. C8 context/candidate budget identical. This arm tests whether cell metadata has a measurable causal benefit over simply exposing both targets to a shared Brain.

A read-only within-`condition-true` **swapped-cell counterfactual** at evaluation swaps K↔H tokens without altering DNA, comparing to correct token and both real measured labels, to establish whether predictions are truly conditioned on the cell. These counterfactuals are intentionally not new natural cell measurements.

## Data splits, scoring and controls

- Original `scottiadamson/Vex-seq@36d9c4a6e5e74def46b3cada69d3166f08c54bd5` original `Sequence` design REF vs ALT, 1,960 genuine validated one-base variant constructs. Event-group splits **TRAIN1303/77, DEV390/16, FINAL267/17**, frozen in prior `PRETEST_NATIVE_VARIANT_EFFECT.md`; no overlaps. No official final condition-wise effects are inspected/printed before a frozen winner is justified.
- For each train variant: two original measured outcomes (K and H), producing **2,606 lived examples**, 10 bytes each (8 input + one measured class + newline) in deterministic original variant-id SHA order, with K then H per row. Exactly 26,060 original `Brain.live` symbols. No synthetic alleles or labels.
- Development: same 390 REF/ALT variants in 16 events, evaluated once in K and once in H = **780 condition-specific observations**, with true class hidden until external scoring.
- Fixed absolute ΔPSI sign categories: '+' if ≥5pp, '-' if ≤−5pp, '0' otherwise; no threshold optimization after seeing labels.
- **Primary outcome:** macro-F1 across three classes over all 780 conditional examples. Secondary accuracy, balanced accuracy and condition K/H-specific F1, per-class precision/recall, full confusion and tie-aware rank correlation between original Brain p(+)-p(-) vs actual measured ΔPSI for each condition.
- Additional important metric, pre-specified: among genuine 390 DEV variant pairs with different measured cell-specific categories, count how often original Brain correctly predicts **both** cell-specific labels and how often its predictions actually differ across K and H. A condition-insensitive learner cannot meet this for differing pairs.
- External statistics only (not Brain): always-neutral and per-cell majority class, empirical mutation-substitution and real position-bin × substitution × cell contingency lookup with Laplace pseudocounts; none participate in original Brain learning.
- Compare original `condition-true` against `condition-blind` on **same** dev cases; compare correctly-tagged vs swapped-tag on original same weights.
- Do not evaluate final267 before development score and method are frozen in a NEW prior commit. A result only on dev is exploratory. After results, if no substantial gain over baselines, disclose failure rather than manufacture success.

## Boundaries

This is a real published reporter assay cell-line-dependent functional-variant task, but still short local context, modest events and no homology/chromosome independence guarantee. It is NOT AlphaGenome 2 1Mb conditioned transcriptomics benchmark, no direct API calls, no clinical inference. Physical proxy features are handcrafted; automatically discovered perspective not yet demonstrated.

No previous MagicPerspective/Braivour user Brain, GGUF donor, UI or checkpoint is modified. Only additive experiment files in a new branch.
