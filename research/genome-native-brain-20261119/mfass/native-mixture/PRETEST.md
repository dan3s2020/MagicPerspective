# PREREGISTERED — original native C as a mixture of genuine genomic perspectives, MFASS gene-separated rare variant assay

Date 2026-11-23. This protocol is committed BEFORE any mixture-of-perspectives native evaluation.

## Existing measured evidence and the new precise question

Original source `KosuriLab/MFASS@9a8e4f27106be52aeb11acad27f95f5cded663a8`, 27,733 genuine 170nt single-base REF/ALT reporter constructs, 1,050 experimentally splice-disrupting mutations. The corrected independent `rewire-bio/rewire-benchmarks@68d1ee53a0fcd1104d9f427d68dedffdccf2c47f` canonically separates connected gene+exon groups. Original test: **8,324 variants/315 true disruptors across 463 gene groups**, STILL UNOPENED for all original native MFASS experiments.

Original native C8 with source-real mutation, four real REF nucleotides and physical region/distance metadata, learning C ONLY at genuine `strong_lof` experimental outcome moments, processed exactly **14,498 original TRAIN variants from 827 gene/exon-connected groups**. An earlier precommitted experiment used **2,421 variants (95 disruptors) from another 150 whole connected gene groups** to select among 120 pre-existing `LeanC` C8 masks based on original full `Brain.predict` Average Precision; selected `exact:175`. On independent original gene-group DEV, 2,490 variants / 92 authentic disruptors / 150 separate gene/exon groups, single calibrated `exact:175` achieved **AP 0.15227, true disruptors top100=22**, versus automatically chosen `class:1` AP0.09634, shuffled calibration mask `exact:115` AP0.10477, and simple training-only region+splice-distance+REF→ALT empirical control AP0.16561. This is a genuine but exploratory improvement, not AlphaGenome 2 equivalence.

Earlier two-location real 170nt DNA views **FAILED**: using authentic local ALT + real splice-junction 4nt achieved AP only 0.03955 (near prevalence 0.03695), and local authentic REF4+ALT4 achieved AP 0.08396. **Do not repeat these failed representations.**

Question: instead of forcing the original organism to use only ONE native C perspective, can its OWN **pre-existing multibelief mechanism** `LeanC.top` / `distC(c,ctx)` (see untouched `v17/transcend/torus-aether/lean-c.mjs` and `torus.mjs`) combine multiple independently learned original C8 DNA views into a more generalizable rare-variant ranking, while the exact original A/chain still decides outputs?

## Frozen source, training, and leak-free biological task

Source hashes locked: original original MFASS raw `a637ca0e307e66ff48811ec7efa22b9ce453bc7883b04f0cacb867f7283132d8`, corrected split `999ebcb7e63a5c5eaa8780fa468e59ac1f934260ad50102814174c396317f052`. Only `natural_seq` (actual reference) and `original_seq` (actual alternative) 170nt after 7,770 raw reverse-complement orientation corrections, exact one-base allele verification. No source labels embedded in any sensory observation.

Same deterministic internal source partition (all canonical `train`):
- Native training: 14,498 authentic variants, 548 real disruptors, **827 distinct connected gene+exon groups**.
- Read-only calibration: 2,421 genuine variants, 95 disruptions, **150 different whole connected groups**; labels used ONLY to CHOOSE original perspective mixture, not to train weights.
- Unseen internal DEV: 2,490 genuine variants, 92 disruptions, **150 more different connected groups**; never touched by training, calibration or candidate selection.
- Official corrected independent MFASS heldout **8,324 variants/463 groups** remains protected. No metric from official test is reported.

One original unchanged V42 `Brain` with original `LeanC`, `EmergentChain`, A and native R2/R3 disabled, seed20261122, C cap8, A depth2. Exact original outcome-moment learning: one original 8-byte physical sensory input `[actual exon/intron region, physical exon-boundary-distance bin, mutation offset0..3, source-real REF0,REF1,REF2,REF3, actual changed ALT nucleotide]` followed by experimentally measured 0/1 disruption and newline. Original `Brain.live` experiences ALL authentic 10 symbols and C.observe is called ONLY at real outcome byte. Exactly **144,980 original lived symbols and 14,498 original C outcome updates**, as prior actual comparison. No additional learner/head.

## Frozen native multibelief intervention

The existing original source `distC()` already supports `c.top` array of REAL ORIGINAL `LeanC` model objects `{id,kind,mask,w}`, mixing their **original learned output distributions** with positive weights. We only populate this existing state; no new weight update equations, no external classifier/regression model, no new candidate prediction algorithm, and original `Brain.predict` still fuses native C with original A.

1. Enumerate the EXACT same **120 original `candidates(8)`** as the earlier experiment: `exact/fold`, mask containing real ALT base (bit0), real mutation offset (bit5), ≥1 real REF base (bits1..4), with either/both/no exon-distance/region bits (6/7). All 120 candidate native C rows already trained in original Brain C.observe on source-real labels.
2. Score each native candidate on **CALIBRATION ONLY** via original full `Brain.predict()`. Rank the native candidates by calibration Average Precision (AP) then AUROC then native candidate ID, exactly the previously validated method.
3. Form PREDECLARED top-K native multibelief perspectives `K ∈ {1,2,3,5,8,12}`; assign existing native blend weights in TWO predetermined forms: `equal` (all w=1) and `calibrated-squared` (each w=(native candidate calibration AP)²; no learned external model). A single native mixture uses the original `distC` weighted mixture and **original full `Brain.predict`**; no other change.
4. Choose ONE K/weighting from these exactly 12 candidates **exclusively by full original Brain AP on the same independent CALIBRATION 2421**, with ties broken by calibrated AUROC, smaller K, then `equal` before `calibrated-squared`. This is an explicitly **human-authored outcome-based perspective selection** within the ORIGINAL organism, NOT evidence it developed an autonomous new reward objective.
5. Negative-control selector: use ONE deterministically permuted CALIBRATION class vector (same salt as earlier `mfass-shuffled-calibration-effect-v1:<index>`) preserving positive prevalence, rank the 120 original perspectives by shuffled-label AP, and choose top-K/weighting by FULL Brain AP on the SAME shuffled labels. This tests whether a meaningless label-dependent mixture-choice can produce a similarly good biological DEV score.
6. Compare on **DEV only**: frozen chosen source-real multibelief, matching shuffled-label chosen multibelief, native single-mask `exact:175`, original auto `class:1`, and source-only empirical region+splice-distance+allele table. Use the same native original Brain object; `brain.e.c.top` installed only temporarily for read-only predictions and fully restored afterward.
7. Validate `K=1` blend is numerically identical to original single-mask selected Brain predictions (otherwise STOP and document difference, not continue). Verify original Brain `lived`, original C `episodes` and model count unchanged by calibration or evaluation.

## Frozen metrics and interpretation

Primary **Average Precision / AUPRC** on exact 2,490 DEV authentic genomic variants with 92 genuine rare disruptive effects; avoid misleading >96% always-negative accuracy. Secondary AUROC, tie-correct expected genuine disruptors in top100, positive enrichment over 92/2490 (~3.695% baseline), distinct score counts, specific native source C masks and their relative weights. Include original authentic source SHA and every C mask selected.

A meaningful positive would be: mixture AP > single real-calibrated `exact:175` AND > independent shuffled mixture AND > source-only reference AP0.16561, with better top100 precision. If not, document failure. Even if positive, same DEV has been inspected historically, so **do not claim fresh/independent biological validation** or AG2 superiority without a newly frozen official test.

Strong biological limitation: 8-symbol source representation still only sees FOUR original physical bases near a 170nt genetic event, not true long-range context; mixtures over mask subsets of the same eight bytes do not add unobserved nucleotides. A mixture improvement would test information reuse, **not create information**.

No prior user code changed, no pretrained genome-specialist model substituted, no AlphaGenome 2 outputs available to compare; protect all prior evidence and native source.
