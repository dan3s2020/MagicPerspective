# Frozen confirmatory evaluation — committed before opening the final test

2026-11-19. The first three measured experiments used the **same 400**
deterministically ordered gene-group-heldout rows. Their outcomes are
**exploratory** because the temporal view and the 8nt folding idea were
changed after inspecting previous results.

Development runs, same 900 train / first 400 test:
- Baseline full 60nt with an uninformative TYPE suffix: accuracy .585, F1 .2461
- Native C cap=4 with 4 junction bases visible: accuracy .7825, F1 .7676
- 8nt compressed into four pair-code symbols: accuracy .7875, F1 .6618
- Rule GT/AG: accuracy .88, F1 .8485

**Selection made now, once, before seeing final rows:** use the second
(native 4-nucleotide C window) configuration because it has the best
development **macro-F1**, not the highest raw accuracy.

**Final previously unexamined test rows:** exact indices 400 through
the end of the testRows array returned by the original deterministic
gene-group split in run-causal-window.mjs. The CI result above reported
597 available test sequences, so 197 are expected here. They have
not appeared in previous dev inference results.

Frozen:
- All 900 previously selected training sequences (same sort/order).
- Same original V42 Brain source and initialization seed, same sequence
  transformation, same native learning and native prediction method.
- Same evaluation, no access to answer class before native prediction.
- Primary confirmatory metric macro-F1; also report accuracy, balanced
  accuracy, mutation/shuffle control and GT/AG and majority baselines.
- This is still **not** AlphaGenome 2's 1Mb, cell-type or variant-impact
  benchmark and cannot support a claim of defeating it.
- No model hyperparameter or threshold changes in response to the final score.

This protocol's commit timestamp must precede the final CI run.
