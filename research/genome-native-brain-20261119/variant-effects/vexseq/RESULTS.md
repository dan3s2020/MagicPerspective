# Native V42 on measured splicing variant effects: real negative benchmark and new biological hypothesis

Date 2026-11-22. **This is a source-verified scientific report, not a claim to have beaten AlphaGenome 2.**

## 1. Actual task: genuine functional consequences of variants

Unlike previously used UCI/HS3D short local motif classification, this real Adamson et al. Vex-seq assay reports quantitative **ΔPSI** (change in percent-spliced-in) for an original/reference reporter versus an alternate/mutated reporter. Source: `scottiadamson/Vex-seq@36d9c4a6e5e74def46b3cada69d3166f08c54bd5`, original biological paper https://pmc.ncbi.nlm.nih.gov/articles/PMC5984807/.

- Published `delta_PSI_values.tsv`: **2055** experimentally measured outcomes.
- Published design `68_97_final_sequences_fixed.tsv`: **7490** barcoded construct sequence rows.
- `control_variant_pairs.csv`: **110** original reference/event controls, with measured variants associated to source exon.
- **1960 genuine one-base SNV REF/ALT pairs** were verified: each original `Sequence` REF and ALT differs by exactly one actual nucleotide, and every observed change matches either the declared allele directly or its exact reverse complement, consistent with the published strand.
- Other **95 non-SNV/indel variants** excluded (not relabeled as SNPs).
- `Final Sequence` adds extra reporter/barcode differences and is explicitly NOT silently used to define genomic mutation pairs.
- Frozen group split using SHA on original control event index: 77 events/1303 variants TRAIN; 16 events/390 DEV; 17 events/267 FINAL. No original event crosses groups; external gene-family/chromosome homology independence is **unverified**.
- The **FINAL 267 experimental labels have NOT been evaluated by any native predictor**. Development shows failure; no winner is promoted to official final.

## 2. Pre-frozen real native original Brain experimental target

Original unchanged MagicPerspective V42 `Brain.live` and `Brain.predict`, native `LeanC`, `EmergentChain`; no new learned model or substitute genome classifier. Same seed 20261122, same 1303 actual training variants, each supervised once with 3-class effect `'-'` if ΔPSI≤−5pp, `'+'` if ΔPSI≥+5pp, `'0'` otherwise; 390 group-heldout DEV classes: 257 neutral, 90 negative, 43 positive. The threshold is coarse; this is *classification of measured effect direction/size*, not full continuous ΔPSI prediction.

Four original-native interventions were precommitted in [PRETEST_NATIVE_VARIANT_EFFECT.md](./PRETEST_NATIVE_VARIANT_EFFECT.md):
- `native-C8-pair`: original C8 sees actual REF4+ALT4 DNA at known mutation coordinate, R2/R3 off.
- `native-C9-position`: original C9 sees a manually specified, authentic nearest-splice-site distance-bin token plus the same eight real DNA bases, R2/R3 off.
- `native-C9-corrupted-position`: same C9 budget, distance-bin replaced by deterministic source-ID SHA tag independent of biology.
- `native-C9-position-R3`: same genuine position info, original learned R3 trust readback enabled.

All four **COMPLETED SUCCESSFULLY** after a separately documented relative-import correction that did not change Brain, training, labels or input geometry. GitHub Actions run:
https://github.com/dan3s2020/MagicPerspective/actions/runs/45052650881

## 3. Real native results: baseline failed, no model victory

| Original Brain / external control | Accuracy, dev390 | Macro-F1, primary | Spearman native effect score vs actual numeric ΔPSI |
|---|---:|---:|---:|
| Original native C8 actual REF4+ALT4 | 65.64% | 28.50% | +0.036 |
| Native C9 real splice-distance category + real REF/ALT | 64.62% | 26.83% | +0.061 |
| Native C9 **corrupted** distance token + same genuine alleles | 65.90% | 28.56% | +0.037 |
| Original C9 real position with R3 trust enabled | 63.33% | 27.88% | +0.046 |
| **Always-neutral statistical control** | **65.90%** | 26.48% | not comparable |
| Substitution-only training-label contingency lookup (external) | 64.36% | 28.09% | not compared |
| **Substitution + real splice-distance statistical control** (external) | 64.36% | **34.07%** | not compared |

**Native original-class confusions (rows true 0/-/+, columns predicted 0/-/+):**
- C8: neutral `253/2/2`; negative `87/3/0`; positive `41/2/0`.
- C9 real position: neutral `251/6/0`; negative `89/1/0`; positive `43/0/0`.
- C9 corrupted position: neutral `254/2/1`; negative `87/3/0`; positive `41/2/0`.
- C9 position R3: neutral `244/4/9`; negative `86/3/1`; positive `43/0/0`.

**None of the four original Brains correctly classified a single one of the 43 positive measured effects**. Strong negative recognition ranged 1–3 correct of 90. The original C8 was effectively an always-neutral predictor, despite receiving authentic REF/ALT DNA, and the real physical position tag produced no validated improvement over the corrupted tag. Rank correlations with continuous assay effects are close to zero.

This is a **negative biological finding for the current native encoding/learning arrangement**, not evidence that genomics is impossible, that our earlier HS3D real GT/AG results were fabricated, or that AlphaGenome 2 was surpassed.

A mechanistic caveat: original C9 selected native model `exact:89` for real position and `exact:170` for corrupted tag. In the original reversed C-history, these masks do not directly select the earliest position character (offset8). This is suggestive of an *attention/selection bottleneck for the explicitly supplied biological coordinate*, not definitive proof that all original A paths ignored the coordinate. We must intervene on temporal placement and evaluate native output directly to isolate causation.

All measured native and baseline scores, exact original source hashes, label distribution, full confusions and CI provenance are retained in [results/all-4-original-native-variant-effect-dev.json](./results/all-4-original-native-variant-effect-dev.json). Full per-example native prediction audits are in CI artifacts from the linked run.

## 4. A meaningful biological hypothesis: cell type may be hidden by the aggregate label

The original Vex-seq measurements contain **`delta_psi_K` (K562) and `delta_psi_H` (HepG2)**, not just an averaged `delta_PSI`. Source Adamson et al. confirms these cell lines. Published reporter assays can produce distinct splicing changes for the same allele depending on cell condition.

Before reading any DEV/FINAL cell-conditioned labels, we preregistered and executed a **TRAIN-only** audit (1303 real SNVs from 77 original events), threshold fixed at ±5pp:
- **340/1303** have different K562 vs HepG2 effect categories.
- **188/1303** are classified neutral by averaged ΔPSI but have at least one strong ≥5pp K- or H-specific effect.
- **10/1303** have strong opposite-direction effects in K562 vs HepG2.
- Training marginal class counts: K `650 neutral / 304 positive / 349 negative`; H `762 neutral / 249 positive / 292 negative`; aggregate `729 neutral / 269 positive / 305 negative`.

Example original real measured mutation `chr10_33134133_C_G`: K562 ΔPSI **−8.1823** pp, HepG2 **+6.8364** pp, average **−0.6729** pp. The biologically significant opposing responses become invisible if the single averaged label is treated as 'no effect'.

**This observation is about authentic published data, not a claim that we have discovered an unknown biological law.** It gives a precise reason that a single-condition-agnostic prediction problem may teach contradictory target behaviour for the same DNA.

Original measured audit:
https://github.com/dan3s2020/MagicPerspective/actions/runs/45053038114
and [results/train-only-cell-dependent-effect-audit.json](./results/train-only-cell-dependent-effect-audit.json).

## 5. Mechanistically new next test: ONE original Brain, two real cellular worlds

Separate branch:
`research/VEXSEQ-NATIVE-CELL-CONDITIONED-20261122`, with preregistered test and unchanged original native V42 `Brain.live()/predict()`.

A **lossless** compact eight-symbol DNA mutation perspective reconstructs all eight REF+ALT bases from the four REF bases, observed ALT base, and mutated-base offset: since authentic REF/ALT windows differ at exactly one position, this is a **reversible encoding**, not omission or pseudo-DNA. Two remaining input symbols encode:
- true experimental K/H condition token;
- true variant distance-to-splice-site bin (hand-authored).

The SAME native C8 Brain learns **two real experimental effects per variant** (1303 variants × K,H = 2606 authentic supervised observations) and must classify 780 condition-specific DEV observations. Against it, an identical original Brain learns all the same DNA and K/H effect classes but receives constant X instead of true cell identity. The true-tag Brain is also evaluated under an explicitly swapped tag to test causal dependence on the cell. Strong baseline statistics and true pair-level disagreement metrics are required. **Do not claim superiority until executed results return.**

This is the first honest path here toward cell-condition-specific genomic effects comparable in *kind* (though not scale or exact metrics) to AlphaGenome 2. The official program predicts many modalities and conditions beyond the original Vex-seq splice reporter experiment. We have no matching AlphaGenome 2 API evaluation.

## 6. Explicit scientific outcome gates

1. A genuine cell-conditioned improvement must beat neutral and substitution/distance/cell statistical controls in **macro-F1**, with nonzero sensitivity to experimentally large + and - effects.
2. Swapping only the real K/H tag of the SAME Brain must causally change some original native predictions in the correct biological direction; otherwise the cell token may have been ignored.
3. A heldout 267-SNV/17-event one-shot final is allowed only after code/protocol/selected method are frozen, and cannot serve as infinite hyperparameter tuning.
4. To claim impact beyond the reporter assay, validate on another biological experimental source, with gene- or family-disjoint partition and biologically matching cell metadata.
5. To compare with AlphaGenome 2, obtain its official predictions on the exact same genuine variants/conditions and evaluate identical metrics with matched uncertainty estimates. **No such comparison has been made.**

**Most important takeaway:** native V42 genuinely learnt local splice patterns in HS3D and could combine multiple real human DNA observations, but its current original C8/C9 variant-effect formulation fails to learn assay-measured genetic consequences. The next requirement is conditional biological-world perception, not higher scores on old toy or GT/AG recognition tasks.
