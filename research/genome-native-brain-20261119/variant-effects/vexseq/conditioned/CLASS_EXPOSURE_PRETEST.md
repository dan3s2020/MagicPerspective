# Frozen causal class-exposure study on true cell-dependent REF/ALT effects
Date 2026-11-22. Precommitted BEFORE observing original native class-balanced DEV outcomes.

## Why this is not an arbitrary parameter sweep
The first authentic measured human Vex-seq original Brain C8/C9 studies (1303 training variants, 390 distinct-event dev variants) missed essentially ALL minority negative/positive large-effect variants. Original native C8 with K562/HepG2 cell identity FIRST and 2606 authentic cell-condition labels had ~32.41% macro-F1 and still detected zero positive large effects. A constant-cell control was neutral-only.

This experiment tests whether the original Brain has a **supervision-prior exposure problem** (train neutral responses dominate) rather than a fundamental inability to represent biological differences. It uses exactly the same original V42 Brain and lossless real REF+ALT+cell context, and fixes the number of original `Brain.live` symbols; no synthetic or false labels.

## Frozen intervention
- Original authentic Vex-seq 1303 TRAIN SNVs across77 original events (all source and group hashes unchanged), each with measured cell-specific K562 and HepG2 ΔPSI from experimental Vex-seq, ±5pp categories; no DEV/FINAL labels used in balancing.
- Original C8, native R2/R3 disabled, depth2, seed20261122.
- **Lossless 8-symbol observation exactly as the previously preregistered condition-tag-LAST C8**: [true splice-distance bin, true within-4base mutation offset, 4 true REF bases, true ALT mutated base, true cell K or H]. This preserves both allele windows and original cell identity. No output head or additional ML model.
- Instead of exposing every training variant exactly once under K and H, deterministically class-balance **within each cell**, using only source-real labeled observations: for each of K,H, repeat rare authentic measured variants cyclically and under-sample abundant neutral observations to construct 1303 cell-condition experiences with approximately equal counts per `0/-/+` class (434/434/435). Exposure order alternates K and H by class, and use fixed original-variant SHA sorts within each authentic training-cell-class pool.
- Exactly **2606** native examples **×10 bytes =26060 original native learned symbols**, matching the unbalanced true-cell-last benchmark, but unique biological source variants are NOT increased. Report all repeated/excluded counts (do not misrepresent this as collecting additional data).
- Two original-C8 arms: real K/H tag and constant X tag, identical actual sampled observations and category labels. The sole new causal change vs old workflow is label-balanced exposure, not new input symbols.
- The outcome is unchanged human DEV390 genuine variant pairs ×K/H=780 measured cell-conditional examples, never used in original Brain training. Macro-F1 primary, per-cell and per-class precision/recall, true K/H-discordant pair BOTH-correct count, predicted K/H differences, swapped-tags counterfactual, Spearman native rank score vs actual ΔPSI.
- External statistical controls always use **original unresampled 1303×2 training observations**, not the balanced duplicate/under-sampled sequence, so baselines remain scientifically comparable.
- Compare to original true-last and blind-last unbalanced modes, and to direct real-cell true-first/constant-first controls already registered. Avoid choosing an official FINAL 267 variant model until a separate frozen result/selection commit.

## Success/failure criterion
Meaningful improvement requires **not only** an increase in macro-F1 but actual correct detection of measured positive **and** negative important effects in both cellular conditions, and at least some true cell-discordant pairs predicted correctly in BOTH conditions. Higher overall accuracy from a common-class shortcut is not a breakthrough. The true-cell input must beat constant-cell and the same normal native training-budget controls, and ideally a simple cell+mutation-distance statistical baseline.

This is still not a direct AlphaGenome 2 benchmark and cannot confirm tissue-specific endogenous regulation because Vex-seq is a reporter assay. We do not modify old native source, active user checkpoints, original V42, V43, Braivour GGUF or any prior projects.
