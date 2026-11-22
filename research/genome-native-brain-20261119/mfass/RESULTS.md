# MFASS — authentic 27,733 human genetic functional-effect benchmark, unchanged original native V42 Brain
Date: 2026-11-22. This report is strictly about **genuine rare splice-disruption measurements** from Chong et al. 2018 MFASS, not AlphaGenome 2 parity. Original MFASS official 8,324 corrected gene-heldout variants are protected and NOT used in any original native prediction.

## Original published source and validity
Original `KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8` raw `snv_data_clean.txt`, SHA256 `a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8`; corrected independent `rewire-bio/rewire-benchmarks@68d1ee53a0fcd1104d9f427d68dedffdccf2c47f` canonical connected whole exon+gene `split-v2.tsv`, SHA256 `999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052`.
Actual full GitHub Actions source audit succeeded: https://github.com/dan3s2020/MagicPerspective/actions/runs/45057428579.

Every one of **27,733** original source MFASS 170nt real REF/ALT source pairs differs by exactly ONE source-confirmed nucleotide at `rel_position-1` with strand-oriented allele verification. **7,770** of the original `sequence` records are reverse-complemented relative to assay; the original `natural_seq` REF and `original_seq` ALT are used instead. **1,050** actual experimental splice-disrupting variants => **3.786%** rare target prevalence. The official corrected source split is **19,409 TRAIN (735 positives,1,127 gene/exon-connected groups)** vs **8,324 OFFICIAL TEST (315 positives,463 independent groups)**. No original gene/exon group crosses the split.

## Actual native experimental protocol before model scoring
Precommitted: [native MFASS internal group split and all controls](./PRETEST_NATIVE_INTERNAL_DEVELOPMENT.md). Original TRAIN is further separated by whole corrected connected group IDs into:
- **Native TRAIN: 14,498 real source genetic variants, 548 genuinely disruptive variants, 827 gene/exon-connected groups**.
- **Reserved internal CALIBRATION: 2,421 variants, 95 genuine positives, 150 separate original gene/exon groups**.
- **Native internal DEVELOPMENT: 2,490 variants, 92 genuine positives, 150 independent original groups**.
These groups are mutually disjoint, and NONE is an OFFICIAL TEST group.

Same original untouched V42 `Brain.live()`/`Brain.predict()` and native original `LeanC`/A organs, C8, A2, original R2/R3 disabled, seed20261122; per real source variant exactly 8 authentic ASCII biological observations `[exon-or-intron region, distance-to-exon-boundary, mutation-within-4-base offset, four actual source REF bases, actual single ALT mutated base]` + authentic human functional disruption class 0/1 + newline. **144,980 original lived symbols** in each actual run. This is local four-base REF/ALT effect context from the original 170nt minigene, not a representation of all 170 bases.

One native causal change:
- `global-c`: original C updates all ten observed moments per real variant;
- `outcome-c`: original native C updates ONLY at authentic biological disruption label moment, but original Brain.live and A learn ALL ten source symbols;
- `alt-c`: C gets same total number of updates as outcome mode, at authentic ALT changed-base moment, never directly at label; same original Brain.learn true outcomes via A.

Scientific metrics precommitted: **Average Precision/AP** primary, **AUROC** and **true large-effect variants in top100** secondary; raw majority accuracy is meaningless with 3.7% true positives. Real source TRAIN-only empirical region+distance+REF→ALT beta-smoothed reference, no external trained model substituted for original Brain.

## Measured real original Brain results (original source gene-disjoint internal development)

Actual GitHub Actions run: https://github.com/dan3s2020/MagicPerspective/actions/runs/45057845700.

| Original training mechanism | Native AP, DEV 2,490 | Native AUROC | True splice disruptions among native top100 | Genuine original C.observe updates | Status |
|---|---:|---:|---:|---:|---|
| `outcome-c`: real laboratory outcome moment only | **0.09634** | **0.67693** | **17 / 100** | 14,498 | **COMPLETED SUCCESS** |
| `alt-c`: real mutated ALT nucleotide moment only | **0.07952** | 0.67114 | 9 / 100 | 14,498 | **COMPLETED SUCCESS** |
| `global-c`: native C learns all ten moments | pending original CI job; no result copied until completed | — | — | 144,980 if completed | **NO RESULT REPORTED YET** |
| Same source TRAIN-only simple mutation+distance+region statistical baseline (not a Brain) | **0.16561** | **0.75024** | expected **≈19.44 / 100** (fractional tie boundary) | N/A | **COMPLETED** |
| Random ranking / constant prevalence | 0.03695 (positive prevalence) | 0.5 | expected ≈3.69 /100 | N/A | Definition |

**Important causal comparison:** original C trained at real effect moments scores AP9.63% vs AP7.95% when it trains instead at mutated ALT nucleotide moments, and finds 17 true disruptors in top100 versus 9, with identical source data/native Brain and C update count. It improves performance **without replacing original predictor**, but original C changes also influence A learning. It does NOT beat the simple statistical baseline (AP16.56% or expected19.44 top100 true disruptors). Internal gain is mechanistic evidence, not evidence of AlphaGenome2 parity.

With actual positive prevalence3.695%, original outcome-native 17/100 top candidate list is approximately **4.6× above random positive fraction**, a genuine gene-group-heldout effect-ranking signal. However the external statistical control does better. No claim of a clinically safe diagnostic score.

Original raw first two JSON reports and source:
- [original outcome-target native result](./results/original-V42-native-outcome-c-source-train-internal-dev.json)
- [equal-count original ALT-target negative control](./results/original-V42-native-alt-c-source-train-internal-dev.json)
- [actual native source and one-Brain code](./run-original-native-mfass.mjs)
- [original source and gene-group validator](./mfass-source.mjs)

## Meaning and what it DOES NOT establish
These are authentic assayed human genetic mutations, unlike toy mazes or automatically generated labels. The stronger target-gated result suggests that original Brain's update timing matters biologically, but still ranks behind a straightforward hand-authored conditional propensity table. The selected native C 'class:1' in outcome mode omits other biological variables; joint outcome-aware native perspective selection from the pre-existing candidate pool on the 150 reserved independent CALIBRATION groups is an important next experiment. **That new research must not use this DEV to select masks or tune original weights; only source calibration group true labels are allowed.**

For strict comparison to external published corrected benchmark AP values — trained simple HGB AP0.286, SpliceAI AP0.299, Pangolin AP0.389 — these are on the completely different official 8,324 TEST dataset and not directly interchangeable with the above internal DEV AP values. Original AlphaGenome reported MFASS AP≈0.51 under another protocol. **No AlphaGenome2 scores were obtained and nothing here establishes beating AlphaGenome2 or even a specialist.** API predictions must not train other models under its terms.

A robust next result would generalize source-event family-separate rankings and real REF+ALT 170nt context within one original Brain, pass independent official test only after full frozen prereg and reach or exceed strong same-split controls.
