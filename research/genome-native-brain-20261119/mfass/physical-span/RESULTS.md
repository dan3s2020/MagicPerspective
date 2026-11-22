# COMPLETED REAL human MFASS 170nt physical source perspectives — negative two-location results
Date 2026-11-22. FOUR native original MagicPerspective V42 Brain experiments fully executed, all Github Actions jobs SUCCESS.

Source and pre-commit: [PRETEST.md](./PRETEST.md). Original real MFASS 170nt REF/ALT single source human mutations, canonical corrected gene+exon partition with no connected gene/exon leakage; TRAIN14498 variants/827 groups, INTERNAL DEV2490 variants/150 different groups, 92 actual experimental disruption cases. Official test8324 variants/463 groups not scored.

Full GitHub Actions log and complete raw per-variant artifact: https://github.com/dan3s2020/MagicPerspective/actions/runs/45058768658

| EXACT original native V42 Brain sensory world | Internal dev AP, primary | AUROC | Source-real splice disruptions in top100 (expectation if ties) |
|---|---:|---:|---:|
| Authentic REF4 + ALT4 at true mutation | **0.08396** | 0.65498 | **14.33** |
| Real ALT4 at mutation + REAL nearest splice junction ALT4 | 0.03955 | 0.51352 | 4 |
| Real ALT4 at mutation + remote 4 real source DNA bases away from mutation and exon junction | 0.03234 | 0.44450 | 2 |
| Real REF4 at mutation + REAL splice-junction ALT4 (mutation effect occluded unless windows overlap) | 0.03818 | 0.50743 | 4 |
| Prior original V42 native C8 with source region, distance and authentic REF/ALT 4nt view, outcome gated | **0.09634** | **0.67693** | **17** |
| Prior source-only real physical-region+distance+REF>ALT statistical baseline | **0.16561** | 0.75024 | **19.44** |

All original-native models learned authentic real rare functional assay labels, original unchanged `Brain.live` / `Brain.predict` and original `LeanC`, 144980 native lived symbols and 14498 authentic outcome C.observe moments. No custom trained prediction head and no fabricated sequences or labels. Original native C model selects `exact:1` (only most recent source base) in every one of these four independent real-DNA physical-world experiments, a strong warning that the selected C mask fails to preserve the joint physical geography. Other original A pathways may still contain additional signal; this is about selected native C.

**Conclusion:** The pre-committed hypothesis that giving real authentic DNA at the nearest splice junction together with true mutated local DNA enhances rare functional variant-effect prediction is **NOT supported by these original-native tests**. The splice-junction view beats the remote negative control AP0.03955 vs AP0.03234, but both are close to (or worse than) actual class prevalence **0.03695** and are dramatically worse than both previous local mutation+metadata C8 and actual source statistical controls. The physically real genome context itself was not enough. This does not mean long-range splicing biology is absent; it means the current original native training/perception/selection did not use these views productively.

Archived results:
- [Real two allele-local source windows](./results/paired-local-ref-alt.json)
- [Real mutation + actual nearest splice junction windows](./results/paired-alt-real-junction.json)
- [Real mutation + actual remote negative-control source window](./results/paired-alt-non-junction.json)
- [Real REF local + genuine splice-junction window](./results/paired-ref-real-junction.json)

**Scientific integrity:** These results are on internal gene-group development that has been inspected repeatedly. DO NOT tune claims against these known labels, and do not score the canonical MFASS official 8324 variant test on the basis of a failed view. The original preselected native mask `exact:175` from a distinct protocol demonstrated AP0.15227 on these same internally heldout groups, still below true source-only baseline AP0.16561, and not confirmed on official test. This work is nowhere near a demonstrated AlphaGenome2 head-to-head superiority.
