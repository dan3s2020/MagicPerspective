# PRE-FROZEN original native V42 MFASS rare biological outcome perspective calibration
2026-11-22. Committed before the new calibration code or any new native-gene DEV prediction.

## Why this is a scientific test, not an arbitrary higher-score sweep
Original actual human MFASS genuine rare splicing-disrupting mutations (27,733, 1,050 positives, each real REF/ALT170nt) passed full reverse complement and canonical connected gene+exon split audit. A matched 3-mode original V42 experiment is executing on the canonical TRAIN-only *internal connected group split*: 827 training groups, 150 calibration groups and 150 development groups. Its `outcome-c` genuinely trained one original `Brain` with `LeanC.observe` gated only at real experimentally measured splicing-disruption outcome moments, preserving ALL other actual `Brain.live` symbols and native A updates. On DEV group split with n2490, 92 rare positives, original-native AP was **0.09634 versus real positive rate 0.03695 and a source-only empirical region/position/base control AP0.16561**. The matched source-real ALT-moment C control scored AP0.07952. These are actual CI measurements, not invented pretest numbers.

Our exact V42 `LeanC.reframe` objective selects masks for original next-byte validation, NOT the scientific goal of ranking actual rare variants. It selected `class:1` when exposed only to biological outcome moments. The existing original LeanC models include 765 native C8 candidates; current native self-selection may not promote the masks capable of distinguishing genuine molecular effect.

## Locked single mechanistic intervention: choose a preexisting ORIGINAL native C mask for rare-assay precision
Use exactly the SAME original V42 Brain, data, 170nt paired genome source and original `outcome-c` actual native C training process as first MFASS study. No original C or Brain code rewrite. Train with every original 14,498 canonical source TRAIN group variant exactly once (548 real strong splice disruptions; 827 connected original groups), original 8-byte physical mutation input + true original 0/1 effect byte + newline, same seed 20261122, C cap8, native A depth2, R2/R3 off and original 144,980 `Brain.live` symbols with 14,498 genuine C.observe outcome moments.

Holdouts fixed in original frozen pretest:
- **150 separate connected original gene+exon CALIBRATION groups** with 2,421 authentic variants/95 positive source assays. These 2,421 original outcome labels are never passed into Brain.live, never update native models.
- **150 different separate connected gene+exon DEV groups**, 2,490 variants with 92 actual positives; used only for read-only score after native mask chosen, never for training or mask selection in this protocol.
- Original independent corrected canonical MFASS **OFFICIAL TEST 8,324 variants, 315 positives, 463 connected gene groups remains COMPLETELY UNTOUCHED by native model**.

Original Brain input physically encodes: `[genuine exon/intron region E/U/D, distance-to-actual-exon-boundary bin, true mutation-offset0to3, REF0,REF1,REF2,REF3, original ALT mutated DNA base]` (8 bytes). The ~166 flanking source nucleotides are NOT observed in native C8; still a local but actual biological task.

### Frozen candidate universe and selection target
Original `candidates(8)` in native `epistemic-text/engine.mjs`, filter only native `exact` and `fold` masks that include:
- bit0 = real source ALT base;
- bit5 = mutation offset;
- any ONE or more of bits1..4 = actual source REF bases;
- either, both or neither of physical region bit7 or true exon-distance bit6.
This is **exactly 120 native candidates** (2 kinds × 15 nonempty REF-bit subsets × 4 region/distance choices). Do not create any new candidate predictor or external trainable head. `fold` is original native case folding, not a learned external model.

For EACH of the 120 native original C programs, temporarily set `brain.e.c.active` to that ORIGINAL native mask, call unchanged FULL original `brain.predict(stimulus)` on all **CALIBRATION-only** real variants. Freeze the resulting original-native numeric disruption scores `p("1") / (p("0")+p("1"))`, and score **true Average Precision (AP)** on the original CALIBRATION source assays. Choose mask with maximal CALIBRATION AP, secondary calibrated AUROC, tertiary ascending native candidate ID. Restore original active mask after every read-only test, ensure `brain.lived` and `brain.e.c.episodes` unchanged.

**Causal negative control**: predeclare one deterministic SHA256 permutation of CALIBRATION source true binary labels using `mfass-shuffled-calibration-effect-v1:<id>`, preserving total real positive count, then select a second native mask based on shuffled-label AP. Never give false labels to original native Brain learning. This is a deliberately false-label selection control only.
**Other controls:** original original-native self-selected `class:1`, original same frozen Brain original A chain, and same source TRAIN-only smoothed region+exon-distance+REF→ALT empirical baseline. No trained non-native classifier is inserted.

## Primary outcomes and gates
- Evaluate only **actual gene-group DEV2490** on the original same native Brain, three read-only mask states: auto-native C, true-calibration-selected C, shuffled-calibration-selected C. AP/AUPRC from original V42 `Brain.predict` PRIMARY, AUROC, expected P@100 under ties, gene-group breakdown and top100 actual strong splice-disruptors. Random-prevalence AP=92/2490 baseline.
- Report exact C mask selected, positions read, number of distinct original C models, positive support per train/calib/dev, actual full original Brain weights and lived symbols, source SHA hashes.
- An exploratory positive requires authentic-label selection exceeds both auto-native and shuffled-label C masks, and preferably the source-only statistical baseline, on the GENE-UNSEEN DEV set, while identifying more true rare disruptions in first100.
- If not, report failure and do not fake genomic discovery. A score improvement on internal DEV does not prove generalization to the untouched corrected official MFASS-v2 TEST8,324 nor AlphaGenome2. Repeated method changes after seeing DEV would require a genuinely new dataset.
- No retuning on official TEST, no clinical model, no claim of matching official AlphaGenome-v1 auPRC0.51 under a different split. Future true AG2 comparison requires its official outputs on exact same cohort/metrics, evaluation-only, never training.

All tests are additive code isolated in this research branch, no changes to native Brain source, Braivour, previous Vexseq final or user checkpoints.
