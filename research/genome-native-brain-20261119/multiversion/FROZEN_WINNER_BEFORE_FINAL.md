# Winner frozen BEFORE the new independent-from-training final evaluation

Date: 2026-11-19. This selection is made solely from the **400 development examples**, from the completed 15-job real-UCI native-version matrix:
https://github.com/dan3s2020/MagicPerspective/actions/runs/44601837562

**LOCKED WINNER:** `v42-no-trust` — original V42 `EmergentChain` with native R3 trust readback disabled via the constructor's built-in `off: ["R3"]` option; original `Brain.live()`, `Brain.predict()`, all other equations, 60nt presentation, 900 ordered training examples and seed `20261119` preserved.

**Selection rule:** maximum development **macro-F1** (not maximum accuracy). Observed on development n=400:
- `v42-no-trust`: **86.75% accuracy**, **83.6204% macro-F1**, **87.0908% balanced accuracy**. Confusion EI/IE/N: `[[97,1,1],[14,53,0],[8,29,197]]`.
- Original V42 `v42-c4`: **78.25% accuracy**, **76.7639% macro-F1**.
- V43 real-branch native Brain: same as original `78.25% / 76.7639%`.
- Original V42 in 3SAT branch: same `78.25% / 76.7639%`.
- C1/C2: `69.00% / 49.4885%`; C3: `69.25% / 65.3639%`.
- Other successfully executed V42 built-in A variants: no change from default, except native R3 readback ablation.
- Original `AligningGraph.write` unrestricted native char readout: `3.00% accuracy / 7.0175% macro-F1` with 385 invalid nonclass emissions (not directly comparable to constrained class-specific Brain readout).
- `v42-c-only` did **not execute**: original `GraphTrace.record` assumes at least one A; explicitly report native compatibility failure, no substituted bypass.

**Locked confirmatory set:** all **702** train-partition DNA rows beyond the first 900, excluding groups overlapping the 900 training examples and duplicate DNA. The filter was defined in `PRETEST_CONTRACT.md` before matrix results. This set has never been used to train an organism or report model predictions. It is group-disjoint from training *by the historical source identifier prefix*; its homology-family independence remains unverified.

**Locked evaluation:** one single V42 `v42-no-trust` training/inference run (same seed), one blind native prediction per final row, plus majority and canonical GT/AG control, same macro-F1/accuracy/balanced metrics, complete confusion and original per-example predictions. No later optimization of thresholds, feature positions or mode selection on these 702 records.

**Important:** a good result is no claim of AlphaGenome 2 parity; AG2 is a different functional assay/variant-impact benchmark. Neither clinical utility nor discovery of novel regulatory biology is demonstrated. The variant is still on familiar splice-motif classification.

**Frozen selection commit provenance:** this file precedes creation and execution of the confirmatory workflow below. Any final comparison reported must point to the original action run and raw metric artifact.
