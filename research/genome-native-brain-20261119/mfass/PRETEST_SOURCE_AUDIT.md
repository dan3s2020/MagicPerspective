# PRE-REGISTERED new real human MFASS functional splicing benchmark source audit
2026-11-22. Committed BEFORE any original-native MFASS predictions.

## Why this is a genuinely stronger genomic task
The previous actual one-shot on Vex-seq correctly failed to confirm a 35.73% exploratory 3-class F1: on pre-frozen final267 variants/17 source events, the original C175 Brain achieved only 29.83% macro-F1 versus simple 30.83% source-only baseline. The final was scored exactly ONCE and MUST NOT be retuned.

To escape replaying the same seen biological assay, this research moves to a DIFFERENT published functional assay, `MFASS` from Chong et al. (Molecular Cell 2018), original public `KosuriLab/MFASS`. It measured **27,733 real source human ExAC variants near 2,198 exons**, of which **1,050** disrupted splicing substantially by minigene reporter experimental measures. This creates a realistic rare-event prioritization benchmark (3.786% positives), far harder than simply predicting the majority class.

## Pinned raw source and independently published corrected benchmark
- Original published source `KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8`, original `processed_data/snv/snv_data_clean.txt`, expected SHA256 `a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8`.
- Canonical independent benchmark `rewire-bio/rewire-benchmarks@68d1ee53a0fcd1104d9f427d68dedffdccf2c47f`, `benchmarks/mfass/splits/split-v2.tsv`, expected SHA256 `999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052`. This is the **corrected** split, using connected original exon+gene grouping, not naïvely independent individual variants. The canonical source preprint warns 7,770 assay-variant rows have the old `sequence` field in reverse-complement orientation.
- Official native assay input must use raw **`natural_seq` as actual REF**, **`original_seq` as actual ALT**, both 170 actual genomic-reporter bases, with exactly ONE observed nucleotide change at `rel_position - 1`, and original strand-specific REF/ALT allele verification. Never use raw `sequence` directly for genotype windows; it is reverse complemented for 7,770 real records.
- Source `category == "mutant"` and `strong_lof != "NA"` is the only inclusion filter to reproduce exactly 27,733 variants and 1,050 positives. Controls/natural and variants with unusable lab outcome must be excluded, not silently relabeled.
- Exact canonical split should reproduce **19,409 TRAIN** (735 positives) and **8,324 TEST** (315 positives), TEST comprising **463 whole connected exon+gene groups**, original full cohort **1,590 connected groups**, with **2,185 original exons in the scored cohort**. Never mix same gene/exon across train/test.
- The current study is a **SOURCE/ORIENTATION/SPLIT AUDIT ONLY**. No native model scored, no claims against AlphaGenome 2 or SpliceAI. The existing independent public corrected same-split comparison reports e.g. simple trained k-mer/position baseline AP0.286, SpliceAI AP0.299 and Pangolin AP0.389, each with different coverage; these are EXTERNAL already published numbers, not our results and not matched AlphaGenome 2.

## Next frozen native biological task after passing audit
- Train *one original MagicPerspective/Braivour native Brain* on MFASS TRAIN only, with a further internal **whole connected-gene-group** training/calibration division; assess original-native REF→ALT site-proximal observation and genuine real splicing-disruption labels. No hand-made target/oracle at evaluation.
- PR metrics rather than misleading accuracy: **Average Precision / area under precision-recall curve (AP/AUPRC) PRIMARY**, precision@100 selected variants, AUROC and recall at fixed high precision. With 3.8% positives, always-neg accuracy ≈96.2% is worthless.
- Use native `Brain.predict()` positive-class *score* (not invented external learned head), original `LeanC` and original path learner for any observed perspectives. Strong controls against existing corrected k-mer baseline and specialist SpliceAI/Pangolin results on EXACT same scored sample set.
- **Never score the official 8,324 holdout** until a method/inputs are frozen in a separate earlier commit and checked on TRAIN-internal dev. Existing SpliceAI/Pangolin benchmark scores are context, never training targets. If positive validation fails, report failures without looking at the official holdout.
- Genuine family/homology separation beyond exon/gene connected components remains unverified. MFASS is an in-vitro minigene assay, not a patient clinical genomics predictor.

## Source protection
No changes to original V42 native Brain code, original user training/checkpoints, other research branches or current Vex-seq final; additive code/docs on isolated research branch only.
