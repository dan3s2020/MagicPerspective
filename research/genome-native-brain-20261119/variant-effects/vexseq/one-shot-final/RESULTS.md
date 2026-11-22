# Frozen original native Brain biologically independent-event Vex-seq confirmation — NEGATIVE

**Date:** 2026-11-22. **Status:** actual ONE SHOT confirmation COMPLETED SUCCESSFULLY, with all real measurements, full source SHA hashes, actual original native source counts, exact native perspectives, baseline and confidence interval archived. **The proposed gain DID NOT GENERALIZE.**

CI: https://github.com/dan3s2020/MagicPerspective/actions/runs/45056899944  
Frozen protocol precommitted BEFORE result: [FROZEN_BEFORE_ANY_FINAL_LABEL.md](./FROZEN_BEFORE_ANY_FINAL_LABEL.md), commit `101cbe78a18d5f4b756fa9402d925d3cf9942d46`.  
[Authentic machine-readable full summary](./results/frozen-original-C175-final-267-snvs.json) and per-example original predictions in the CI job artifact.

## What was actually compared

Unmodified V42 original `Brain.live/predict`, with per-instance original native `LeanC.observe` scheduled only on observed effect label moments. No new classifier, no model API. Actual Adamson Vex-seq REF/ALT mutation source pinned `scottiadamson/Vex-seq@36d9c4a6e5e74def46b3cada69d3166f08c54bd5`. Authentic K562/HepG2 in-vitro measured ΔPSI, sign classes at ±5pp.

One original persistent Brain trained on **1117 genuine variants/67 original event groups** with both true K/H cell outcomes, and was read-only calibrated on **186 variants/10 disjoint original source events**. The original DEV (390 variants,16 events) was used earlier for exploratory method selection but NOT to train this final model. New truly heldout FINAL (267 variants,17 original source events) was scored for the first and ONLY time in this one-shot frozen method.

Locked native `LeanC` masks reproduced byte-exactly:
- real full-original-Brain calibrated **`exact:175`** (ALT, 3 actual REF bases, mutation offset, authentic K/H cell);
- unforced original native C **`exact:72`**;
- outcome-shuffled calibration control **`exact:235`**.

All three readouts are from the SAME genuinely trained original Brain object; only `brain.e.c.active` was switched read-only. Same 267 genuine variants × real K/H measured effects = **534 condition-specific lab observations**. Real target never enters prediction.

## The decisive frozen comparison (not the earlier DEV scores)

| Method frozen before final outcome | FINAL534 macro-F1 | FINAL accuracy | Correctly predicts BOTH K/H effects when actual K/H labels differ |
|---|---:|---:|---:|
| Native full-original-Brain selected `exact:175` (**primary**) | **29.8294%** | 49.25% | **1/80** discordant variants |
| Original native auto C `exact:72` | 28.9722% | 56.93% | 0/80 |
| Original calibration with deliberately shuffled true labels `exact:235` | **33.8572%** | 53.00% | 2/80 |
| Simple source TRAIN-only substitution+splice-distance+cell contingency control | **30.8295%** | **54.12%** | not reported as pair classifier |
| Always-neutral baseline | see raw machine JSON | lower class sensitivity | 0/80 |

**Original `exact:175` confusion**, rows experimentally true (0/−/+), predicted (0/−/+):
- Actual neutral: `243/23/29` of 295;
- Actual negative: `128/13/4` of 145;
- Actual positive: `76/11/7` of 94.

Thus it correctly identified only **13 of 145** important measured negative effects and **7 of 94** important positive effects. Its score correlation with real numeric ΔPSI was only **Spearman 0.0358** (no meaningful ranking). The actual 80 cell-discordant original mutations yielded just one pair correctly resolved under both experimental K and H states.

**Difference native primary vs simple baseline** = **−0.01000 macro-F1**, i.e. **−1.00 percentage point**, on exact paired final examples. Prespecified deterministic 2000 original-event-cluster bootstrap across 17 source events produced a **95% percentile CI [−5.97pp, +2.82pp]** and **68.95%** re-samplings with native-minus-baseline ≤0. This is not a significant independent advantage; the interval also reflects limited number of source event clusters. The primary model does **not** beat even a simple baseline.

## Why earlier exploratory positive was misleading

On DEV390×K/H=780 we saw original `exact:175` **35.73% macro-F1** and **6/91** correctly predicted both cell outcomes on strongly discordant mutations, versus the DEV simple baseline 34.32%. This gave a **+1.41pp exploratory improvement**, a legitimate reason to do the pre-frozen final. The actual one-shot final dropped to **29.83% F1**, and 1/80 discordant pairs, below a 30.83% simple baseline.

The shuffled-calibration mask did BETTER than the real-calibration mask on final (33.86% versus 29.83%), even though real-calibration was favored on DEV (35.73% versus 33.39%). That directly contradicts a hypothesis of stable outcome-aware transfer. **We must not tune on these 267 final samples now.**

The experiment is NOT AlphaGenome 2: no matched official genome model predictions, no 1Mb genomic context, no endogenous cell-state full expression and no gene-family homology-disjoint guarantee. These are genuine biological reporter effects, but the scientific comparison scope is far narrower.

## Critical architectural conclusion

Gating the original native C updates to the biologically meaningful moments and selecting its C candidates via **actual original full-Brain K/H outcomes** is a technically functioning readout mechanism. It also makes the native predictions shift across actual cell inputs and sometimes predicts both outcomes correctly. **But its context and learning criterion remain insufficient for reliable unseen biological-event transfer.**

Current Brain only receives a manually engineered 8-symbol 4nt REF/ALT local mutation view plus cell identity. The real splicing change depends on extended cis-regulatory architecture and cell-specific trans factors. The original global A memory can still overwhelm native targeted C, as confirmed by source-level checks. The present experiment cannot establish a general solution.

**Forward:**
- Do NOT repeat or tune on the 267 final cases. Search a genuinely new published independent functional-variant assay, or create a new frozen gene/family-separated benchmark.
- Preserve native `Brain` but investigate outcome-gated **joint long-range observed genome perspectives**, not just one local 4nt view.
- Re-run meaningful strong controls (including full-context sequence PWM/known splicing predictors). Do not compare percentages to AlphaGenome 2 from unrelated tasks.
- Any AlphaGenome 2 API predictions must be used for **evaluation only**, never training, according to their terms.
