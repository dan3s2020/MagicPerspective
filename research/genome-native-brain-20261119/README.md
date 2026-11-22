# AlphaGenome 2 challenge: actual native Brain / real DNA baseline

**Current stage:** independent and reproducible *preliminary* biological-data test,
NOT a head-to-head AlphaGenome 2 result and NOT a claim of defeating it.

## What is really running

The original V42 `Brain` from `v17/transcend/torus-aether/devour/brain.mjs`
learns a 60-nucleotide DNA observation and a known splice-junction class during
training. It predicts the first class character E/I/N from a held-out DNA prompt
without the class as input, via its own original `Brain.predict()`.
There is no external classifier, pretrained LLM, hidden correct answer, custom
neural head or overwrite of the native organism. A reversible input ordering
places a candidate splice junction inside V42's short native context window;
all 60 source nucleotides are preserved.

The entire input identifier is excluded from `Brain` perception. Dataset
source: UCI Machine Learning Repository, *Molecular Biology (Splice-junction
Gene Sequences)* (1991), 3,190 authentic primate examples, CC BY 4.0:
https://archive.ics.uci.edu/dataset/69/molecular+biology+splice+junction+gene+sequences

## Blind evidence protocol

- Deterministic split by source identifier prefix into disjoint biological
  groups, not random row split, with duplicate DNA crossing splits removed.
- Original Brain receives labels ONLY on train, never during validation/test.
- Report sample counts, confusion, macro-F1, balanced accuracy, and accuracy.
- Compare with native untrained Brain, majority class, and a fixed canonical
  GT/AG splice-motif rule, plus a central-DNA nucleotide-shuffle control.
- Do not select a checkpoint, threshold, representation or run from test
  performance. Report any failure even when the baseline wins.
- This first run is capped at 900 train and 400 test rows for bounded runtime;
  source row and group counts are reported. Set GENOME_MAX_TRAIN=3190 and
  GENOME_MAX_TEST=3190 to include all available group-disjoint rows.
- The native organism is preserved. This experiment does not modify its
  `Brain.live`, `Brain.predict`, original `Discoverer.shapeGraph`, GUI,
  training, checkpoint serialization, or CUDA paths.

## Run

```bash
curl -fL 'https://archive.ics.uci.edu/static/public/69/molecular+biology+splice+junction+gene+sequences.zip' -o splice.zip
unzip -p splice.zip splice.data > splice.data
node research/genome-native-brain-20261119/run.mjs splice.data
```

The stdout line `GENOME_NATIVE_BRAIN_RESULTS` is raw machine-readable JSON.
GitHub Actions uploads the execution log. No fabricated score is prefilled.

## Actual route to comparison with AlphaGenome 2

This UCI experiment is a necessary native-learning check, not an equivalent
benchmark. The full challenge needs a *shared* independent human assay dataset,
reference/alternative alleles, genomic context, cell conditions, and the
AlphaGenome 2 API predictions for the very same records. The public AG2
paper reports 30% causal eQTL recall at 90% precision on TenK10K, compared
with 16% for AlphaGenome 1 (https://deepmind.google/blog/alphagenome-2-deciphering-how-cells-read-dna-to-better-understand-disease/).
Our pass/fail comparison must hold precision at >=90% on the same frozen
independent evaluation and exceed AG2 recall with paired confidence intervals.
The official score is **NOT YET MEASURED**.

The user's main Braivour Qwen-intelligence assimilation mission and all prior
bans remain unaffected; this is isolated, real-DNA MagicPerspective research,
not another GGUF chat or synthetic Qwen surrogate.

## Executed results and significance (19 Nov 2026)

The controlled native four-nt perspective achieved **77.66% accuracy and 76.97% macro-F1** on a frozen 197-record confirmatory subset, versus 52.79% for the majority rule and **88.83%** for the simple canonical GT/AG motif rule. Perturbing central DNA reduced native accuracy to 42.13%. This is a real, limited short-sequence result, **not** AlphaGenome 2 superiority.

The initial 400-record development set was used to explore perspective representations, so the best observed development score is *not* an untouched final result. No additional training, autonomous perspective search, or functional-variant prediction has been run yet.

- [Full measured results, raw provenance and known limitations](./RESULTS.md)
- [Scientific meaning: what is interesting and what is still hypothesis](./SCIENTIFIC_SIGNIFICANCE_AND_HYPOTHESES.md)
- [More-training/scaling and new-task experimental roadmap](./TRAINING_SCALE_AND_GENERALIZATION_PLAN.md)
- [Concise external research brief (English)](./DEEPMIND_RESEARCH_BRIEF.md)
- [Rezumat științific în română](./REZUMAT_RO_IMPORTANTA_SI_ANTRENARE.md)

## Multiversion native-organism results — 19 November 2026

Additional research tested original native V42/V43 branch Brain implementations, original `EmergentChain`/A-organ mechanisms, eight unique-data scaling runs, a native R3/R2 interaction factorial, and a real 702-sequence group-disjoint stress-test. The strongest development improvement involved disabling the built-in R3 trust readback, but a decisive 2,408-training-example diagnostic found **400/400 exact equivalence to the simple GT/AG motif rule and 400/400 flanking-sequence perturbation invariance**. AlphaGenome 2 has **NOT** been beaten or directly tested; increased local motif accuracy must not be presented as regulatory-genome discovery.

- [Full measured native-version research report](./multiversion/RESULTS.md)
- [All original pretests and scripts](./multiversion/PRETEST_CONTRACT.md)
- [Frozen 702-record UCI group-separated evaluation](./multiversion/results/frozen-R3-702-final.json)
- [Original Brain versus GT/AG exact equivalence](./multiversion/results/native-motif-equivalence-2408.json)
- [Native R3/A organ interactions](./multiversion/results/native-r3-12-organ-interactions.json)

## Human HS3D 140-nt donor results and learned native viewpoint policy (19 Nov 2026)

**New real biological task:** classify authentic human **true vs false donor sites, all with central GT** (unlike earlier UCI EI/IE/N motif recognition), using the original native V42 Brain only. Frozen original V42 `off:[R2,R3]` with 4nt downstream view achieved **79.18% accuracy / 78.76% macro-F1 on official 1,100 human HS3D Test records** after 1,400 training examples, versus 50% central-GT-only and **91.18% for a simple external 20nt PWM control**. The traditional PWM is *not* installed in the organism.

A genuine original Brain-owned `ConstructedPathLearner.pathPolicy` was trained to select among twelve real four-base observations from historical outcome feedback. On a **different, exploratory 400 development subset**, its learned geometrical viewpoint policy achieved **80% accuracy (1,000 calibration rows)** or **81% (200 calibration rows)** versus 77% from the same Brain's fixed70 observation. The positions and distance-to-known-site feature were **provided**, not independently discovered. It is not an AlphaGenome 2 variant-impact prediction.

- [Complete measured science report and limitations](./hs3d/RESULTS_20261119.md)
- [Genuine native official HS3D 1,100 Test JSON](./hs3d/results/frozen-human-donor-1100-official-test.json)
- [Native 12-position original Brain comparison](./hs3d/results/native-12-human-donor-dev.json)
- [Original native learned perspective policy / negative initial result](./hs3d/native-actions/results/learned-native-perspective-2-modes.json)
- [Original Brain policy bandit vs all-window feedback](./hs3d/native-actions/results/bandit-versus-allviews-topology-real.json)
- [Native geometric topology vs data-amount causal ablation](./hs3d/native-actions/results/topology-vs-amount-factorial-real.json)

## 2026-11-21 — Original native C8 two-real-DNA-view causal fusion

A NEW genuine native original V42 Brain capability is now measured, distinct from the previous C6 32-slot history experiment and from Python V5: original native `LeanC cap8` learned a context across **two actual four-nucleotide human AG acceptor views** in one P/N decision, with no changed original learning equations.

- Pre-studied HS3D dev400: real pair70+64 **74.75% accuracy / 74.11% macro-F1**, single64 **71.75% / 71.70%**, destroyed cross-record first view **70.25% / 69.17%**.
- Frozen DIFFERENT human DRANet source n1600, no external training and full-source exact DNA overlap excluded: real **1125/1600 = 70.3125% accuracy / 70.10% F1**, single-view **1083/1600 = 67.6875% / 67.63%**, crossed-source **1059/1600 = 66.1875% / 65.55%**.
- A SAME trained original Brain causal intervention changed **65/400** dev predictions and **330/1600** external predictions when ONLY the first real viewport was swapped, with no changes under sham. External accuracy real **70.31%** versus first-view replaced **66.56%**, paired discordance 195 vs135; p≈0.00113 conditional on independent records (unproven homology independence). Original C selected mask `exact:149` spanning both viewed regions.
- No tissue/variant-effect benchmark, no AlphaGenome 2 comparable score, no self-invented coordinates, and no combined original active movement + C8 sensory fusion in one trained native model yet.

[**Complete original native C8 reports, all programs and actual CI evidence**](./hs3d/c8-fusion/RESULTS.md). All code changes remain additive in a separate research branch, original Brain unchanged.

## Measured human functional genetic variant effects — Vex-seq, 22 Nov 2026

The earlier UCI/HS3D splice motif tasks are useful controls, but the research target is now **authentic measured functional consequences of REF→ALT human variants**. Original published Adamson Vex-seq reporter assay `delta_PSI` contains 2,055 measured effects, of which **1,960** are exact source-verified single-base ref/alt pairs. Source original controls group the dataset into 77 independent-from-train 1,303-SNV training, 16-event 390-SNV development and **17-event 267-SNV final yet-unscored** partitions.

On true experimentally measured variant-effect categories, FOUR unchanged original native V42 Brain configurations C8/C9 failed to surpass a simple mutation+splice-distance statistical baseline: native macro-F1 **26.83%–28.56%** versus external baseline **34.07%**, with continuous ΔPSI rank Spearman only **0.036–0.061**. This is an actual negative functional-genomic benchmark, not a win.

A pre-registered TRAIN-only analysis of original experimentally measured **K562** and **HepG2** `delta_psi_K/H` outcomes showed **340/1303** authentic SNVs with different effect categories by cell, including **188** apparently neutral average responses that are substantial in at least one condition and **10** strongly opposite-condition effects. The original publication already discusses this biological dependence; the project-specific result is a precisely verified missing dimension in our target labels.

Six additional native C8 experiments used one unchanged original Brain with losslessly encoded actual ref/alt pairs + true cell symbol versus constant X, at both input token positions, plus authentic repeated class-balanced exposure. True-cell FIRST improved macro-F1 from constant-cell **25.72% to 32.41%**, but predicted different responses for only **1/390** dev variants. True-cell LAST changed predictions for **14/390** DNA pairs but reduced macro-F1 to **29.62%**. Authentic class balancing unlocked **29/100** large positive effects, but hurt global accuracy to **34.36%**; constant-cell balanced scored **35.49%** macro-F1 and could not differentiate K/H.

**Crucial exact source-level diagnosis:** the actually selected original `LeanC` mask in each of these real runs omits either **cell identity, ALT mutated nucleotide, or mutation offset**, so the native C perspective cannot jointly use the biological causal variables. This is supported by inspecting untouched `Brain.ctxOf()` / `LeanC.keyN()`, not inferred from a decorative visualizer. The original A path may contribute other information; the observation is about selected native C specifically.

The true next target is to make the SAME original organism select **outcome-specific joint genomic perspectives** and actually preserve real 20+ nucleotide biological context, then show correct K/H differences on new assay events. **No AlphaGenome 2 predictions were obtained, no tissue-conditioned genomic superiority established, and the 267-event-separated final variants remain unscored.**

- [Original lab REF/ALT source, all four genuine C8/C9 native negative results](./variant-effects/vexseq/RESULTS.md)
- [Original-native cell condition actual experiments, exact C bit-mask diagnosis, all controls and failures](./variant-effects/vexseq/conditioned/RESULTS.md)
- [Human measured K/H discordance, training groups only](./variant-effects/vexseq/results/train-only-cell-dependent-effect-audit.json)
- [Actual 1960 paired-variant validated source](./variant-effects/vexseq/vexseq-source.mjs)
- [Source context: published Vex-seq](https://pmc.ncbi.nlm.nih.gov/articles/PMC5984807/)

**These are measured results, not a simulation or claim of AlphaGenome 2 parity.**

## 2026-11-23 — MFASS-v2 official gene-group one-shot native multi-perspective result

**Important NEW source-verified result (not AlphaGenome 2 parity):** Original unchanged V42 MagicPerspective Brain, original `LeanC.top` multi-perspective mixture calibrated using 2,421 real human MFASS variants from 150 independently heldout connected gene/exon groups, selected pre-frozen five native C beliefs (three genuinely different informational masks) with equal weights. Authentic source TRAIN14,498 variants/827 connected groups. The method was committed BEFORE the one-and-only official MFASS-v2 TEST on **8,324 real genetically modified human reporter constructs, including 315 experimentally strong splice disruptions across 463 separate gene/exon-connected groups**.

**Real official score:** native original five-belief mixture **Average Precision 0.15488**, **32 authentic disruptions in top100** (precision@1000.320); original native single mask AP0.11821/top10026; same source TRAIN-only simple region/distance/REF>ALT frequency control AP0.10650/top100≈24.05; deliberately source-calibration-label-shuffled native mixture AP0.11598/top10022. All are EXACT same genuine official 8,324 cohort. 1,000 pre-frozen connected-gene/exon-group paired bootstrap resamples: true native-minus-simple-control AP **+0.04838 [95% percentile +0.01806,+0.08331]**. Genuine independent test improvement, not just repeated DEV scores. **Native AUROC remains slightly worse than simple control:0.69160 versus0.70308**.

**Do not overclaim:** stronger independently published corrected MFASS-v2 `k-mer/position` baseline scores **AP0.286 and P@1000.610 on the SAME 8,324**, which our original native organism has NOT reached. SpliceAI/Pangolin specialists score higher with incomplete source coverage; AlphaGenome 2 was NOT evaluated directly. 170nt original assay DNA was used to verify real mutations, but the model currently observes only four REF nucleotides plus actual ALT and physical metadata. The selection objective is experimenter-designed calibration of ORIGINAL learned native perspectives, not fully autonomous skill invention.

- [Full scientific report, every control, precision and limitations](./mfass/native-mixture/final/FINAL_RESULTS.md)
- [Original pre-frozen protocol commit](./mfass/native-mixture/final/FROZEN_ONE_SHOT_PROTOCOL.md)
- [Actual official one-shot GitHub Actions](https://github.com/dan3s2020/MagicPerspective/actions/runs/45084113611)
- [Machine-readable raw original-native official results and gene-cluster uncertainty](./mfass/native-mixture/final/results/FROZEN-ORIGINAL-V42-MFASS-8324-OFFICIAL.json)
- [Native code using existing `LeanC.top` and original Brain](./mfass/native-mixture/final/run-original-native-mfass-frozen-final.mjs)
- [Original independent development evidence](./mfass/native-mixture/RESULTS_DEVELOPMENT.md)

**Next real capability gate:** learn complementary native perspective selection *within the same organism* instead of human-selected calibration, and extend the observed biological context while finding a genuinely new independent variant-effect assay. **Never re-use the already-scored MFASS-v2 official 8,324 to tune further**.
