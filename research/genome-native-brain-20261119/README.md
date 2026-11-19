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
