# ONE original V42 Brain on real K562/HepG2 cell-conditioned splicing variant effects

2026-11-22. **All figures below originate in actual pinned-source Vex-seq and completed original native V42 Brain GitHub Actions**, not a synthetic genome or AlphaGenome 2. Two additional class-exposure intervention arms have a separate frozen protocol; their outcomes are reported only when complete.

## 1. Why this experiment is biologically meaningful

Published Adamson Vex-seq reporter assays (https://pmc.ncbi.nlm.nih.gov/articles/PMC5984807/) measured the true REF→ALT ΔPSI effect of the same human variant in **K562 and HepG2**. Original source `scottiadamson/Vex-seq@36d9c4a6e5e74def46b3cada69d3166f08c54bd5` has authentic variant/ref constructs and `delta_psi_K`/`delta_psi_H`.

Source audit before looking at any new DEV cell labels:
- 1960 genuine orientation-verified exact SNV REF-ALT pairs, 110 original biological reporter events.
- 1303 authentic TRAIN variants from 77 original event groups, 390 DEV from16, 267 FINAL from17 different source events **NOT SCORED**.
- **340/1303** original TRAIN variants change effect category between K562 and HepG2 at predetermined ±5 ΔPSI percentage-point threshold.
- **188/1303** have an apparently neutral averaged ΔPSI while at least one cell-specific experimentally measured effect is strong.
- **10/1303** have strong measured K and H changes in opposite directions.
- One actual example: `chr10_33134133_C_G` K562 −8.18pp, HepG2 +6.84pp, aggregate −0.67pp.

These findings **reinforce a phenomenon already discussed by original investigators**, not a newly discovered cellular biological law. Conditions differ in Vex-seq reporter assays; some differences may be measurement noise, and the study does not establish endogenous regulation. It demonstrates that our earlier **single average-effect label cannot represent all original assay observations**.

### Lossless original Brain observation

A verified SNV REF and ALT four-base view differs at exactly **one position**. Encoding `[four actual REF bases, authentic ALT mutated base, within-4-base offset]` therefore preserves the full REF+ALT four-base DNA information without loss. Add one true original splice-distance bin and one K/H condition token: **exactly 8 ASCII bytes**, fed directly into the **unchanged original V42 `Brain.live()` and `Brain.predict()` with C cap8**. Same single native Brain learns both real cell contexts; no cell-specific submodels, numeric regression head or pretrained genomics substitute.

- **2606 original experimental cell-condition observations** = 1303 real variants × two real cell measurements, **26060 native lived symbols**, no fabricated effect labels.
- Original R2/R3 off, A depth2, seed20261122, original genome-source group split.
- Evaluation = 390 original group-heldout DNA pairs ×K/H = **780** real measured cell-condition examples. Labels hidden during prediction.
- Macro-F1 primary on three classes: `0` weak/neutral |ΔPSI|<5pp, `-` ≤−5pp and `+` ≥+5pp. This is a coarse classification, NOT accurate numeric ΔPSI regression.
- Two controls of each temporal cell-tag layout receive identical genuine DNA/effect examples and original algorithm, but a constant X token instead of cell identity. Extra read-only negative control swaps K/H tokens at prediction time. Original full per-example predictions retained in CI artifacts.

## 2. Actual completed native first-token and last-token causal evidence

| Original native C8 memory mode, same 2606 real label exposures | Accuracy, DEV780 | Macro-F1, priority | Number of DEV variants where original native predictions differ between K and H |
|---|---:|---:|---:|
| Real cell K/H as **first** of 8 native symbols | **64.74% (505/780)** | **32.41%** | 1 / 390 |
| Constant X identity as **first** symbol | 62.82% (490/780) | 25.72% | 0 / 390 |
| Real K/H as **last** symbol, other 7 unchanged | 62.56% (488/780) | 29.62% | **14 / 390** |
| Constant X identity as **last** symbol | 60.64% (473/780) | 29.42% | 0 / 390 |
| External always-neutral control, identical measured DEV780 | 62.82% | 25.72% | never different |
| External non-neural genuine variant substitution × distance × cell training-count control | 61.79% | **34.19%** | not counted |

**First-token native actual results:** https://github.com/dan3s2020/MagicPerspective/actions/runs/45053279996  
**Last-token native actual results:** https://github.com/dan3s2020/MagicPerspective/actions/runs/45053656147

Raw repository evidence:
- [real-cell-first](./results/first-token-condition-true-real.json)
- [constant-cell-first](./results/first-token-condition-blind-real.json)
- [real-cell-last](./results/last-token-condition-true-last.json)
- [constant-cell-last](./results/last-token-condition-blind-last.json)
- [frozen last-token causal hypothesis](./C8_TEMPORAL_CELL_TAG_PRETEST.md)

### Crucial negative interpretation

Across these original development samples, **91/390** real DNA variants have genuinely DIFFERENT K562 vs HepG2 measured effect categories.

- First-token learned original Brain changes its predicted class between K and H for **1** of the 390 DNA variants.
- Last-token input intervention changes the number of cell-dependent decisions from 1 to **14**, without changing information content, native learning algorithms, training sample count or biological targets.
- **No tested native model predicted both true K562 and true HepG2 effect categories correctly for ANY of those 91 discordant variants.**
- First-token 'real cell' native mode recognized **21/190** substantial negative effects and **0/100** substantial positive effects in 780 cell-condition examples. Last-token real cell mode recognized **11/190** negatives and **1/100** positives (while producing more false positives and lower overall F1).
- Correctly tagged vs swapped-tag readout does not yield robust accurate conditional predictions in the available evaluated examples.

**Interpretation:**
The physical position of actual cell identity in the same original `LeanC` context changes how much predictions respond to cellular perspective. This is a measured **sensory causal effect**, not proof the model learned the biological dependency. The original native Brain is still well below a simple count-based context baseline on macro-F1, and cannot yet predict meaningful strong positive genetic splicing consequences.

The lack of native cell-specific distinction despite genuine experimental differences is more informative than the small increase from 25.72% to 32.41% macro-F1. A correct architecture must learn **when the SAME real genetic intervention causes DIFFERENT measured results in DIFFERENT cellular worlds**, not merely react differently to the word K versus H.

## 3. New pre-committed training-exposure diagnostic (not a new source)

Original real cell measurements are not class-balanced: many native predictions collapse into weak/neutral. A further test, frozen in [CLASS_EXPOSURE_PRETEST.md](./CLASS_EXPOSURE_PRETEST.md), uses **exactly the same 2606 symbol presentations/26060 original native learned bytes** but a class-balanced schedule drawn only from genuine repeated training cases. This does **NOT** increase unique biology, and any score must be compared to the original unbalanced last-token control under the same development split. We do not label this a performance success until actual GitHub Actions finish.

This isolates native class-prior exposure from the true inability to learn multi-cell variant consequences. Even if macro-F1 improves, the gate requires correct predictions for both cells on real experimentally differing variants, not only sensitivity to the tag.

## 4. What would be a meaningful next architectural result?

**Not another GT/AG motif benchmark, not another cosmetic 3D visualizer and not another fake Qwen surrogate.** Original user requirement is to achieve real biological capabilities through native Braivour/MagicPerspective, preserving original mechanisms.

The present evidence suggests three distinct limitations needing causal solutions:
1. **Long-range causal context:** original direct class `LeanC` only sees eight symbols, although authentic Vex-seq allelic effects depend on wider splice regulatory context. Previous C8 paired *two* real genomic views showed limited but measurable contribution across separate human data sources. A next test should permit the same original Brain's native `ConstructedPathLearner` to accumulate actual multi-position observations across a larger real 140–166nt REF/ALT world, instead of compressing the entire biological context into one local 8-symbol tag.
2. **Typed biological memory/transfer without interference:** measured 2026-11-22 actual GT-donor→AG-acceptor transfer on same original Brain with 12-view policy showed donor pretraining **hurt** acceptor learning versus a fresh original Brain, up to 17pp at600 acceptor adaptation labels. We cannot build a mixture of reusable skills if the original global C store confuses worlds. Use native-typed compartments and show matched-shot retention *in the same original organism*, not separated new classifiers.
3. **Real quantitative functional targets:** current discrete effect categories lose ΔPSI magnitude and assay uncertainty; future labels should include actual numeric ΔPSI/replicate quality, and the original organism should be tested for measured ranking/MAE, not only 3-class accuracy.

A research-worthy result would demonstrate the original native organism choosing **which physically observed DNA regions to inspect** before seeing labels and using the real cell state to predict measured reference→alternate ΔPSI on an *unseen original-event/biological-family holdout*, outperforming a substantial conventional baseline. That has NOT yet happened.

## 5. Scientific integrity
- The two earlier source-import-failed workflows produced no biological score, were fixed with only the original Brain import path.
- All current four condition/temporal studies completed in real GitHub Actions with original Brain unchanged.
- Final 267 variants/17 source events are intentionally **not scored**; development outcomes do not justify an AlphaGenome 2 superiority claim.
- This is a within published in-vitro reporter experiment, not validated human clinical inference or matching AlphaGenome 2 outputs.
- No original Braivour weights/active user processes were modified.
