# Freeze BEFORE the 1,600 previously unused HS3D human acceptor confirmation rows

**Date:** 2026-11-20. This document is committed **before generating/running a new heldout confirmation workflow**. The five exploratory native runs had already completed on 400 earlier-seen development examples.

## What exactly was observed on dev400 (source CI immutable)

GitHub run: https://github.com/dan3s2020/MagicPerspective/actions/runs/44652215730  
Source and raw metrics: `run.mjs`, `results/five-arm-original-Brain-real-DNA-exploratory.json`.

| Mechanism | Accuracy | Macro-F1 | Final viewport |
|---|---:|---:|---|
| No rewards, primitive composition | 51.75% | 51.50% | 70 all400 |
| Last action only reward, 1k actual actions | 59.00% | 51.42% | 64 on316/400 |
| Last action repeated with equal exposure | 50.00% | 33.33% | collapsed N |
| **Delayed success/failure credit to BOTH original Brain-owned actions** | **63.75%** | **60.84%** | 64 on342/400, 66 on55, 70 on3 |
| Destroyed outcome / unrelated feedback | 48.00% | 45.94% | 70 all400 |

Matched **delayed-trained original Brain** counterfactual controls: fixed64 **61.00% accuracy, 54.42% macro-F1**, fixed66 **50.00%, 33.33%**, initial70 **48.75%, 43.59%**, two random physical primitives **50.75%, 50.59%**.

Positive *on exploratory development only*: delayed credit improves native action choices and its own classification relative to zero, last-only, equal-exposure and destroyed rewards. This is NOT yet independent data validation or evidence of general RL novelty. In particular the original Brain's class predictions also change as it lives reward symbols, so the improvement cannot be uniquely attributed to the selection policy without same-Brain controls.

## New frozen biological data that has NOT been scored by these original native policies

Authentic HS3D acceptor original upstream **Train** contains **2,197 unique P**, **2,190 unique N** actual 140-base sequences, all AG at positions68..69. Rows are sorted by SHA256 `"hs3d-acceptor-transfer-v1:"+DNA`, with exact duplicates and contradictory labels excluded.

Used before: indices0..599/class for supervised training, 600..1099/class for action calibration, 1100..1299/class for already-open development. The new confirmation subset is **indices1300..2099/class** (800 P + 800 N = **1,600 genuinely distinct and not previously evaluated by these methods**). No overlap with training, calibration or old development DNA. Source remains the **same historical HS3D human collection**, NOT an independent lab, chromosome/homology-disjoint or new species.

## Immutable one-shot validation design

The full native action algorithm, original Brain source and seed stay identical to the exploratory experiment. No modifications to original Brain, no new primitives, no altered class thresholds, no altered reward schedule, no class-specific retuning.

Recreate three **predeclared original native arms**, on EXACT same training and calibration indices:
- `chain-delayed`: the exploratory winner and primary method.
- `chain-last-repeat`: same number of lived reward symbols, but only terminal feedback (exposure-count control).
- `chain-shuffled`: both steps lived but positive/negative outcome pairing deliberately destroyed.

The other two arms' development results stay recorded; no test-based selection is performed. Every arm sees the same 1,600 new cases once. **Macro-F1** remains the primary metric, then accuracy, balanced accuracy, class-wise recall and precision. Report exact per-example original primitive path, action histogram, native vs read-only fixed64 under SAME original Brain state, fixed left-left (same three-view budget), deterministic random two actions, and whether delayed reward genuinely adds predictive information.

**No reruns/architectural repairs after evaluating this 1,600 record dataset** may be presented as a new independent confirmation on the same rows.

## Interpretation rule set before any result

- `chain-delayed` macro-F1 above `chain-last-repeat`, `chain-shuffled` and matched fixed64 would support **within-dataset generalization** of delayed native primitive composition.
- If native delayed still below fixed64, report a learned physical-action phenomenon but no utility advantage.
- If effect disappears on new 1,600, classify as development-specific/unstable and do not claim a robust capability.
- Apparent performance gains from label-class distribution, extra views, exposure volume, source grouping or reward-to-class leakage must be distinguished from actual native primitive learning.
- Dataset source does not establish independent biological reproducibility, variant effect prediction, AlphaGenome 2 parity, or GGUF internal inference assimilation.

**Permanently recorded as an exploratory proof-of-mechanism test, not an unrestricted discovery agent or competitor to AG2.**
