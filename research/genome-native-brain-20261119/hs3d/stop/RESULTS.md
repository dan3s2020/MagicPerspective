# Native STOP vs CONTINUE — executed negative result, do not rerun as success

Date: 2026-11-20. **Actual CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44661324244

**Prior-art/anti-duplication note:** before this workflow finished, other branches were discovered that had already tested related STOP gates and information-value experiments:
- `research/HS3D-NATIVE-STOP-UNCERTAINTY-20261120` CI https://github.com/dan3s2020/MagicPerspective/actions/runs/44655782477
- `research/HS3D-NATIVE-COUNTERFACTUAL-VALUE-OF-INFORMATION-20261120` CI https://github.com/dan3s2020/MagicPerspective/actions/runs/44656926687

This experiment is a **different native reward formulation** (original V42 Brain `Brain.predict` decides stop directly by comparing candidate `g` reward probability to six continuation primitive reward probabilities, then `Brain.live` learns true vs destroyed stop outcomes), but it **does not establish a new STOP ability** and should not be repeated or presented as an advance.

## Exactly executed

Same real HS3D human 140nt AG acceptor Train collection as original two-step research, 1,200 supervised records, 1,000 original-native two-step action-reward calibration episodes and 1,000 original-native stop feedback episodes, 400 previously-opened exploratory development cases. Original V42 `Brain.live` and `Brain.predict` perform learning/choice; no separate controller. Action candidate `g` means stop after first real physical move, before the second. Each stop training experience has an authentic first-view class prediction; `stop-destroyed` receives unrelated deterministic feedback.

**STOP policy failure:** BOTH arms chose to CONTINUE on **all 400/400** cases, consuming **3 real DNA views on average**, exactly the full budget. Neither arm saved even one observation.

| Original native STOP policy arm | STOP count | Mean views | Accuracy | Macro-F1 | Same-Brain always-continue accuracy | Same-Brain fixed64 accuracy |
|---|---:|---:|---:|---:|---:|---:|
| stop-real | 0/400 | 3.00 | 58.50% | 52.32% | 58.50% | 58.25% |
| stop-destroyed | 0/400 | 3.00 | 52.75% | 52.59% | 52.75% | 64.75% |

STOP after first view, evaluated read-only: 50.00% / 33.33% macro-F1 in stop-real, 51.50% / 50.85% macro-F1 in stop-destroyed.

**Interpretation:** The original Brain can learn different action/class prediction states under genuine vs destroyed STOP reward, but here its STOP candidate never outranked the best of six continuation primitives. Therefore it **FAILED** the pre-registered primary goal (reduce observation cost with comparable accuracy), and any performance difference between arms is confounded by native class-predictor interference. Do NOT claim cost-aware STOP succeeded.

**Scope:** this is exploratory on previously opened same-source development. There is no fresh validation or independent biological confirmation of STOP. Existing original Brain and prior experiments untouched. This run should be entered in the no-repeat registry. Future attempts must solve the **native reward comparability / class interference** mechanism, not just rename STOP or change a threshold until the dev set improves.

## Separate completed findings already in repository (not reproduced here)

- Actual zero-shot human acceptor DRANet external source CI https://github.com/dan3s2020/MagicPerspective/actions/runs/44657306160: frozen original two-action Brain **1005/1600=62.8125% accuracy, 60.3201% macro-F1**, same original Brain fixed64 **925/1600=57.8125%, 48.8743% macro-F1**, random two actions **819/1600=51.1875%**. Different public data source, but no homology-disjoint guarantee.
- Original Brain chronological history fusion CI https://github.com/dan3s2020/MagicPerspective/actions/runs/44658730217: `history-true` **64.50% accuracy**, `history-broken` **65.75%**, `history-noextra` **72.00%** on earlier dev400. History extra training does not reliably help; the no-extra arm wins accuracy. This is a negative finding and must not be sold as successful multi-view fusion.

**Next rigorous target:** external biological assay with gene/family-disjoint holdout, plus a genuinely native policy that shows calibrated uncertainty / selective risk-coverage against comparable original Brain thresholds. Neither is completed by this branch.
