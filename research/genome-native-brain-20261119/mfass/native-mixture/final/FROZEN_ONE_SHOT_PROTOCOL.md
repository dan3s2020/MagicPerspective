# FROZEN BEFORE FIRST OFFICIAL MFASS TEST — original native LeanC multi-perspective Brain

2026-11-23. **This commit freezes every scoring/model/selection decision before original native predictions are made on official MFASS-v2 TEST. This official test may be scored ONCE ONLY.**

## The source, the previously validated development advantage, and the reason for confirmation

Original human MFASS (Chong et al.), pinned `KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8` raw original `snv_data_clean.txt` SHA256 `a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8`. Independently corrected `rewire-bio/rewire-benchmarks@68d1ee53a0fcd1104d9f427d68dedffdccf2c47f` whole gene+exon connected split `split-v2.tsv` SHA256 `999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052`. Original published source: 27,733 human variants in170nt true REF/ALT reporter constructs (one genuine base change each), 1,050 laboratory confirmed major splice disruptions, including 7,770 source legacy `sequence` records wrongly oriented relative to assays. Always use verified source `natural_seq` and `original_seq`, strand-corrected.

Corrected official cohort: **19,409 source TRAIN (735 true strong disruptors across 1,127 connected gene/exon groups)** and **8,324 official TEST (315 authentic strong disruptions, 463 other whole connected gene/exon groups)**. No group overlaps, all 8,324 official native predictions presently UNOBSERVED.

The original research within corrected TRAIN used a deterministic independent three-way partition: 827 groups (14,498 real variants,548 positives) **native TRAIN**; 150 groups (2,421 variants,95 positives) **read-only native CALIBRATION**; 150 different groups (2,490 variants,92 positives) **method-development DEV**. No DEV or official TEST label was fed into original Brain or native calibration.

Precommitted genuine original organism native multi-perspective experiment: [PRETEST](../PRETEST.md) and executed successful GitHub Actions [run](https://github.com/dan3s2020/MagicPerspective/actions/runs/45083610751), with [exact raw aggregate JSON](../results/real-native-leanC-top-gene-separated-calibrated.json):
- original C self-selected `class:1`: DEV AP **0.0963445584**; true rare disruptors top100 **17**.
- single genuinely calibrated original C `exact:175`: DEV AP **0.1522664853**; top100 **22**.
- original **native mixture `LeanC.top`** selected exclusively by genuine CALIBRATION 2,421 labels: DEV AP **0.2196986528**, AUROC **0.7308445444**, top100 **28** true disruptions; greater than same DEV simple original TRAIN-only region+boundary-distance+REF/ALT empirical control AP **0.1656100704**, top100 ≈19.44.
- deliberately label-permuted CALIBRATION native mixture: DEV AP **0.1208282760**, top100 **21**, under same source and model.
This is a genuine biological DEVELOPMENT result; the DEV had been inspected by previous experiments, and **the numbers do NOT establish independent generalization or superiority to specialist AlphaGenome 2**.

## EXACT frozen original Brain and C-multibelief architecture — NO RETUNING

Same **one original unmodified V42 Brain**: original `v17/transcend/torus-aether/devour/brain.mjs`, original `LeanC` and `distC` source, original A/chain, native C cap8, A depth2, R2/R3 disabled, deterministic seed20261122. Same actual original sensory 8 symbols = `[E/U/D physical exon/intron region, true nearest-exon-boundary distance bin, actual mutation offset within4 bases, four true human REF nucleotides, one actual ALT mutated nucleotide]`. Original live input actual 0/1 laboratory `strong_lof` outcome followed by newline. Original Brain lives ALL 10 true symbols; original C.observe is PER-INSTANCE gated ONLY at the genuine outcome symbol. Exactly **14,498 true training variants**, **144,980 lived symbols**, **14,498 original C outcome observations**. Only source TRAIN groups enter learning.

The existing original `LeanC.top` / `distC` multi-perspective weighting, **not another trained classifier**, combines original native C mask distributions before original A/chain final prediction. Each member is an original already-learned `exact/fold` native C8 mask.

**PRIMARY model MUST be this exact fixed five-entry native mixture**, with each `w=1`:
1. `exact:175`
2. `fold:175`
3. `exact:255`
4. `fold:255`
5. `exact:231`

No candidate ID, ranking order, count K, weight, source train order, genotype representation, threshold or calibration sample selection may change after official TEST data is examined. These five entries have **three distinct source-relevant information masks**; exact/fold pairs are functionally redundant on this fixed-case input alphabet and their presence provides weighting, NOT extra independent knowledge. [Source-level duplicate audit](../CASE_FOLD_EQUIVALENCE_AUDIT.md).

The genuine source-only CALIBRATION selector must deterministically reproduce these five entries and **K=5/equal**, calibration AP **0.18787854193**, and source-native single best `exact:175`; otherwise FAIL CLOSED and do not score official test. This is an integrity reproduction, not fresh method selection.

**Three frozen original-native controls from the same native Brain:**
- original `class:1` self-selected C without mixture;
- original `exact:175` single real-calibrated native perspective;
- shuffled-label-calibration original five-entry C mixture, all `w=1`: `exact:115`, `fold:115`, `exact:121`, `fold:121`, `exact:99`; this is an experimental null SELECTOR, NEVER a false training label.

External reference (NEVER inserted as original Brain or used to tune it): original TRAIN-only simple Laplace-smoothed `physicalRegion + exonBoundaryBin + REF>ALT` empirical frequency table, precisely prior source code. Also random prevalence AP315/8324. Published specialist model scores under independent official MFASS-v2 protocols may be contextualized with explicitly verified same-variant coverage, not falsely transferred as ours.

## EXACT one-time independent evaluation and uncertainty

**ONLY after training and source CALIBRATION integrity pass**: evaluate full original `Brain.predict` on the canonical official TEST **8,324 authentic human variants with 315 strong disruption labels, 463 completely different connected gene/exon groups**. Same actual DNA windows. No official TEST labels appear during original Brain training or calibration. No change in original native C model while evaluating: temporarily assign native `c.top`, obtain per-variant source-deidentified scores, restore native state.

**PRIMARY**: tie-correct Average Precision / AUPRC for actual rare positive laboratory disruption from the `brain.predict()` ratio p('1')/(p('0')+p('1')). On EXACT paired variants, compare original mixture to single-native, shuffled-label mixture and source TRAIN-only empirical baseline. Secondary: AUROC, expected true disruption count top100 under ties, precision at top100, original full score spectrum, biological source variant class counts, all original native masks, native memory audit and source SHA provenance.

**PREDECLARED independent gene-cluster uncertainty:** paired original-connected gene/exon-group bootstrap **1,000** deterministic iterations, each sampling 463 official TEST groups with replacement and carrying every original biological variant inside the group. Compute AP difference primary-native-mixture minus source-only empirical control, primary minus original single C175, and primary minus shuffled-label mixture, report 2.5/97.5 percentiles and fraction of samples with advantage ≤0. Do NOT bootstrap variants as if genetically independent. This diagnostic is limited by source group structure; it is not a clinical validation.

No posterior selection on official TEST. No rerun or new method justified by seeing this official heldout dataset, unless a purely technical infrastructure failure prevented ANY scored result (source SHA and precommitted behavior unchanged).

## Explicit success criteria and limits

1. Genuine primary native mixture official TEST AP exceeds simple source-only real training contingency and independently shuffled-label native mixture, preferably with source gene-cluster CI excluding 0.
2. Original native top100 identifies more true strong disruptions than simple empirical control on EXACT same official variants, and absolute precision materially exceeds true prevalence ~3.78%.
3. Under no circumstances claim to have beaten **AlphaGenome 2** from this alone. AlphaGenome 2 predictions on exact 8,324 MFASS variants and applicable cell settings are not available. Other published genome-model results may differ in source variant coverage and exact benchmark protocol.
4. The four REF/ALT bases and physical position metadata still do NOT represent the full 170nt human context, much less the 1Mb and molecular modalities used by AG2.
5. If the gain does not generalize, report a clean negative and do NOT use official MFASS TEST for iterative selection. If it does generalize, the specific valid conclusion is that multi-perspective original native Brain ranked rare splice-disrupting variants better than a simple source frequency baseline on an independent gene-group cohort. Broader genomics/clinical transfer requires independently sourced validation.

No original MagicPerspective or Braivour source modification, no user GGUF checkpoint overwrite, no unrelated file changes; only additive reproducible research on isolated branch.
