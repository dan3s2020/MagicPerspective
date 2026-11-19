# AlphaGenome 2 challenge — real native V42 organism results

Date: **2026-11-19**. The original V42 `Brain.live()`/`Brain.predict()` are imported
directly from `v17/transcend/torus-aether/devour/brain.mjs` without alteration.
No pre-trained genomic model, separate supervised classifier, teacher-forced
test outputs, new neural head, rewritten old files or fake scores.

## Provenance
- Dataset: UCI Molecular Biology, Splice-junction Gene Sequences, 1991.
  3,190 authentic 60-nt sequences. Raw data SHA256:
  `ebbae10c85d3c285e2a2489a37e42bc2ee8d91d15005e391a9962fa3389a114f`.
- Original-code starting branch:
  `perf/V42-FAST-EXACT-CPU-RESUME-V41FAST-20261107`.
- 900 training sequences, 400 development sequences, 197 never-used
  confirmatory sequences. Source identifiers split by group and duplicated
  DNA crossing the split excluded.
- GitHub Actions runs completed successfully and original raw JSON is saved
  under `results/`.

## Actual measured outcomes

| Experiment | Split | Native Brain accuracy | Native macro-F1 | Shuffled junction accuracy | GT/AG rule accuracy |
|---|---|---:|---:|---:|---:|
| Original 60nt input + constant TYPE suffix | development 400 | 58.50% | 24.61% | 58.50% | 88.00% |
| Four central nucleotides visible to native C cap=4 | development 400 | 78.25% | 76.76% | 49.50% | 88.00% |
| Eight central nucleotides pair-folded to four native symbols | development 400 | 78.75% | 66.18% | 51.50% | 88.00% |
| **Frozen four-nt native perspective** | **untouched confirmation 197** | **77.66497%** | **76.96729%** | **42.13198%** | **88.83249%** |

Initial 400 examples are exploratory/development data because two
perspective refinements followed observations of their results. They must
NOT be presented as an untouched blind final evaluation.

### Confirmatory blind set
The configuration was frozen by
[`CONFIRMATORY_PROTOCOL.md`](./CONFIRMATORY_PROTOCOL.md) in commit
`9371970a9ee0d5905fdb3af2652bb1e1e1687194`, **before** running on
the final 197 rows. Specifically, the four-nucleotide native temporal
perspective was selected based on development **macro-F1**, not accuracy.

Original Brain (one learned organism, same seed):
- 197 predictions; 153 correct; accuracy **0.7766497461928934**.
- Macro-F1 **0.7696728558797524**; balanced accuracy **0.8323196918024504**.
- Per-class recall EI .97143, IE .86207, N .66346.
- Confusion by EI / IE / N:
  `[[34,0,1],[8,50,0],[27,8,69]]`.
- Perturbing central junction DNA yields **0.4213197969543147**
  accuracy and **0.29647313470842884** macro-F1.
- Majority baseline accuracy **0.5279187817258884**; macro-F1 **0.23034330011074197**.
- Simple canonical GT/AG sequence rule accuracy **0.8883248730964467**;
  macro-F1 **0.874412450132322**.
- Therefore genuine sequence dependence and improvement over the majority
  control are observed, but the native organism DOES NOT BEAT the simple
  canonical motif rule. No direct AlphaGenome 2 comparison was executed.

Confirmatory run (finished SUCCESS):
https://github.com/dan3s2020/MagicPerspective/actions/runs/44536477353

Raw original evidence: [confirmatory-untouched-real-uci.json](./results/confirmatory-untouched-real-uci.json).

## Major limitations
- This task is three-class 60nt splice junction *classification*.
  AlphaGenome 2 concerns many different 1Mb conditioned sequence-function
  outputs, variant-impact scoring, cell/tissue-specific regulatory predictions.
  Thus our percentage scores MUST NOT be compared head-to-head with AG2.
- This UCI dataset is old, small, and has limited metadata. Gene-ID-prefix
  grouping is a conservative attempt to reduce leakage, not proven
  independence at homology-family or chromosome level.
- The fixed motif rule remains substantially more accurate.
- The change in perspective uses a deterministic hand-specified 60nt reorder
  to expose the junction in the original Brain's short native temporal window;
  this is not automatic discovery of all genomic structure. The central
  shuffle also changes canonical motif, so the control establishes dependence
  on central nucleotides but not discovery of new higher-order biology.
- No donor GGUF is used, and no demonstration of general Braivour GGUF
  intelligence assimilation is claimed. No user checkpoint or currently
  running V42 trainer was altered.

## Necessary next direct AlphaGenome 2 challenge
1. Select one official *shared* frozen task/dataset (e.g. the published
   TenK10K causal-eQTL variant-impact benchmark) and document licensing,
   label ascertainment, patient/sample-level splits and permitted API access.
2. Expose true reference and alternate genomic sequences and tissue context
   to the same *original* Brain as a navigable transformation world, without
   revealing target effect at inference. No separate learned classifier.
3. Query official AG2 on precisely the **same** examples, calibrate both
   models on an independent dev set and report recall at fixed 90% precision
   with paired uncertainty intervals.
4. Until that completed evaluation exists: **AG2 NOT BEATEN / NOT EVALUATED**.

## Artifacts
- [run.mjs](./run.mjs)
- [run-causal-window.mjs](./run-causal-window.mjs)
- [run-8nt-folded.mjs](./run-8nt-folded.mjs)
- [run-confirmatory.mjs](./run-confirmatory.mjs)
- [baseline raw JSON](./results/first-real-uci-run.json)
- [native 4nt raw JSON](./results/causal-window-real-uci.json)
- [native 8nt raw JSON](./results/8nt-fold-real-uci.json)
- [confirmatory raw JSON](./results/confirmatory-untouched-real-uci.json)

## Scientific interpretation, significance and scaling hypotheses (documentation only)

This experiment's real sequence dependence and native perspective gain are documented in greater depth, with strict separation between **MEASURED**, **INTERPRETATION**, **HYPOTHESIS** and **NOT EVALUATED**:

- [Scientific significance and falsifiable research hypotheses](./SCIENTIFIC_SIGNIFICANCE_AND_HYPOTHESES.md)
- [Training scale, autonomous perspective discovery, validation gates and path to AG2](./TRAINING_SCALE_AND_GENERALIZATION_PLAN.md)
- [One-page scientific evaluation brief](./DEEPMIND_RESEARCH_BRIEF.md)
- [Rezumat complet în limba română: rezultate, importanță, mai mult antrenament](./REZUMAT_RO_IMPORTANTA_SI_ANTRENARE.md)

**Training scale status:** only the 900-example run was actually executed. Additional amounts (up to 2,408 train-eligible records in this split), larger contexts and endogenous perspective selection are proposals without measured outcomes. More training is not predicted to beat a motif baseline or AlphaGenome 2.

## Addendum — real original-native comparison across versions and A organs (2026-11-19)

The original 900/197 experiment above remains historically correct. A separate, isolated [expanded research comparison](./multiversion/RESULTS.md) now records 39 real native runs/attempts (including baseline repetitions and one repaired compatibility failure), including actual V43 branch Brain code, R3/R2 ablations, 300→2,408 unique-example learning-volume curves, and a new 702-record severe-class-shift stress test.

**Critical new limit:** after 2,408 training records, V42 R3-off produced **identical predictions to the simple GT/AG motif rule on all 400 development records**, and its classification remained unchanged on **all 400** after shuffling only the other 56 nucleotides while fixing the central 4. More training reproduced an already-known local biological rule; neither long-range DNA interpretation nor AlphaGenome 2 competitiveness was established. See [complete negative and positive evidence](./multiversion/RESULTS.md).
