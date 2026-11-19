# Native Braivour / MagicPerspective genomic version comparison — measured research record

**Date:** 19 November 2026  
**User request (verbatim):** "IA CONTINUA SA TESTEZI CU TOATE METODELE DE PRIN BRAIVOUR SI MAGIC PERSPECTIVE,UNELE VERSIUNI POSIBIL SA FIE CHIAR MAI BUNE"  
**Status:** real GitHub Actions executions; early, domain-specific results; **AlphaGenome 2 NOT evaluated or beaten**.  
**Version coverage:** fifteen source/configuration attempts (fourteen completed; one original compatibility failure subsequently repaired), eight real-data scaling runs, twelve native R3/A-organ interaction runs, one motif-equivalence causal diagnostic, one previously unused 702-record confirmation, and two C-only compatibility/parity re-runs. Total **39 attempts**, including controls/repeated baseline checks, **NOT 39 independent discoveries**.

## 1. Provenance and immutable boundaries

- Original repository: `dan3s2020/MagicPerspective`.
- This work is isolated on branch `research/AG2-NATIVE-VERSION-COMPARISON-20261119`, branched from the earlier genomic research branch. No user Qwen GGUF checkpoints, active Braivour processes, CUDA programs or mainline files are touched.
- Real source file: `v17/transcend/torus-aether/devour/brain.mjs`, original **`Brain.live()` / `Brain.predict()`** and native `EmergentChain`, `LeanC`, `AligningGraph`; no newly trained classifier head or genomic LLM.
- MagicPerspective original V42 FAST Brain Git blob `0d39045c44736c1565bf4210ae793bad6bcafa33`; original V43 branch Brain Git blob `728797bceecae86b9e0aa88125593aba8b2529a2`; V42 3SAT branch Brain Git blob `b9ae5248d42ab7ff7d5ff2dbfe1c4d87f1266f34`. Actual different GitHub branch checkouts were imported, not emulated.
- Dataset: authentic UCI Molecular Biology (Splice-junction Gene Sequences), exactly 3,190 60-nt records, checksum `ebbae10c85d3c285e2a2489a37e42bc2ee8d91d15005e391a9962fa3389a114f`. Target labels: EI, IE, N.
- Identical manually oriented four-central-nucleotide V42 observation `DNA ` + 60 original nucleotides reordered; the native final `C` context cap is 4. All 60 raw nucleotides remain present in the stream, though this does **not** mean all 60 influence the output.
- Group split is based on historical record identifier prefixes; exact sequence duplicates crossing splits excluded. This is **not** proven gene-family/homology/chromosome independent.
- All `Brain.predict()` evaluations hide the label; all labels are supplied to the organism *only during training*.
- Main first matrix: identical first 900 genuine training examples and the same 400 development examples; the last 197 and 702 within this UCI dataset are not used as a fresh set for later hyperparameter experiments.

## 2. Real native version and A-organ results — 400 development examples, 900 training

| Actual version / native mode | Accuracy | Macro-F1 | Finding |
|---|---:|---:|---|
| **V42 native R3 readback disabled** | **86.75%** | **83.62%** | Significant experimental improvement over native default |
| V42 default C4 with A depth2 | 78.25% | 76.76% | Original comparable baseline |
| Actual V43 branch original Brain | 78.25% | 76.76% | Different native Brain file, same task result |
| Actual V42 3SAT branch original Brain | 78.25% | 76.76% | Same task result |
| V42 deeper A (four) | 78.25% | 76.76% | No observed aggregate difference under original R3 |
| V42 A log-time | 78.25% | 76.76% | No observed aggregate difference under original R3 |
| V42 A blend | 78.25% | 76.76% | No observed aggregate difference under original R3 |
| V42 A concept geometry | 78.25% | 76.76% | No observed aggregate difference under original R3 |
| V42 A no budding (R5 off) | 78.25% | 76.76% | No observed aggregate difference |
| V42 A learn-all instead of rejection (R2 off) | 78.25% | 76.76% | No observed aggregate difference under original R3 |
| V42 trust-readback variation R3 off | 86.75% | 83.62% | Native A signal behaves differently when trust reread replaced by built-in averaging |
| V42 C3 | 69.25% | 65.36% | Shorter native context reduces classification balance |
| V42 C2 | 69.00% | 49.49% | Even shorter memory |
| V42 C1 | 69.00% | 49.49% | Same aggregate metric as C2 |
| V42 original AligningGraph unrestricted one-byte `write` | 3.00% | 7.02% | 385/400 emitted nonclass bytes: **not a directly comparable class-restricted readout** |
| V42 native C-only | *initial failure* | *initial failure* | Original GraphTrace assumed `A[0]`, blocking depth0, **not** a biological failure |

The original C-only failure was resolved with a single required guard in **this isolated research branch only**: for the native `GraphTrace.record` visualization, `A = chain.A[0] || {wires: []}`. Native Brain/learning equations were not changed. Two real 900/400 tests then completed successfully:
- C-only **78.25% accuracy / 76.76% macro-F1**.
- C4 parity **78.25% / 76.76%**, exactly matching original measured baseline aggregate and confusion.

**Important mechanism distinction:** `off:["R3"]` does not delete A organs. Original `EmergentChain.play()` uses the built-in alternate **equal-weight averaged readback** rather than learned `Trust.reread`. Under the default trust-readback, many original A changes yielded the same aggregate predictions. The result suggests a gating bottleneck **in this setup**, not a universal claim that trust learning is bad.

**Original 15-way GitHub Action:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44601837562 (overall failure because authentic C-only crashed before repair; the other fourteen jobs completed and logged real metrics).  
**Original C-only repair and parity:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44604312971.  
Raw results: [15 native variants](./results/dev-15-native-variants.json) and [repaired C-only](./results/native-C-only-900-repaired.json).

## 3. Pre-frozen extra within-dataset confirmation: 702 real sequence samples

Prior to seeing results of the 702 additional samples, native V42 R3-off was selected solely by **maximum 400-development macro-F1** in `FROZEN_WINNER_BEFORE_FINAL.md` (commit `25fd1e235b0b282e39e45913be128b52ec042e43`).

The 702 rows came from the **unused portion of the original train-eligible group partition**, excluding any groups that overlap the first 900 training records and duplicate DNA. This is independent of the 900 samples by the recorded group prefix, *not* a separate organism/species, not a rigorous homology heldout, and not an AG2 benchmark.

| Final comparison (n=702) | Accuracy | Macro-F1 |
|---|---:|---:|
| Selected original-native R3-off `Brain` | **85.19%** | **50.34%** |
| Always majority class N | **96.72%** | 32.78% |
| Fixed GT/AG biological motif rule | 87.61% | **52.84%** |

Crucial distribution shift: **679/702** examples are N, only **12 EI** and **11 IE**. Native EI recall was 11/12, native IE recall 10/11, but EI precision was **22%** and IE precision **13.7%**, producing many false positives on N sequences. Thus native R3-off did **NOT** beat a simple GT/AG rule on this confirmation, and was much worse than majority in raw accuracy. The extra group split is a useful stress-test, not proof of broad generalization.

**Run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44602385140  
**Raw group/confusion:** [frozen-R3-702-final.json](./results/frozen-R3-702-final.json).

These 702 samples have now been examined and cannot be called untouched for future method selection.

## 4. Measured MORE TRAINING: original V42 vs R3-off, same development set

New causal question: does additional **unique** real DNA resolve the limitation? Two original native configurations were tested with **300, 900, 1,500 and 2,408** nested unique train records (same seed, same four-base view, unchanged Brain). The following scores are **exploratory** because the 400 development examples were seen during prior selection.

| Unique training sequences | V42 original accuracy | V42 original macro-F1 | V42 R3-off accuracy | V42 R3-off macro-F1 |
|---|---:|---:|---:|---:|
| 300 | 71.00% | 64.84% | 84.25% | 81.35% |
| 900 | 78.25% | 76.76% | 86.75% | 83.62% |
| 1,500 | 68.50% | 62.98% | 81.75% | 73.90% |
| 2,408 | 85.75% | 82.80% | **88.00%** | **84.85%** |

Learning is clearly **nonmonotonic**. Both configurations regressed at 1,500 and recovered at 2,408. R3-off outperformed standard V42 at each of these four training doses. No inference about unseen biological data or guaranteed benefit from even more data follows automatically.

**Run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44603103247  
**All eight raw scores:** [native-training-scale-8-real-uci.json](./results/native-training-scale-8-real-uci.json).

## 5. Decisive new mechanistic control — after 2,408 real training sequences

The **88.00% native score equaled the simple GT/AG motif rule's score and confusion matrix** on 400 development sequences. A new, specifically registered experiment compared decisions **per row**, not just aggregate matrices:

- Native original Brain R3-off prediction and the fixed GT/AG rule were **identical on all 400/400 individual examples**.
- After shuffling the **other 56 nucleotides** but retaining the exact four junction nucleotides, native outputs were **unchanged on 400/400 examples**.
- Both interventions used the actual original Brain trained on 2,408 rows and its native `Brain.predict()`, with no label supplied at inference.

**Interpretation:** in this experiment the organism has learned to reproduce the **existing four-nucleotide canonical splice-motif decision rule**, not demonstrated any additional long-range genome understanding. This is a valuable negative discriminator: the observed 88% is NOT a novel genomic discovery, nor evidence that context beyond those four local nucleotides is used.

**Run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44603886645  
**Exact control results:** [native-motif-equivalence-2408.json](./results/native-motif-equivalence-2408.json).

Caution: 100% flanking invariance applies to these 400 specifically and this deterministic perturbation; it is not a universal theorem about all possible sequences.

## 6. Additional 12 actual A-organ interactions with R3 disabled

After learning that normal R3 appeared to mask the effect of modifying A organs, we preregistered a different causal test: **native original A perspectives with native `off:["R3"]` simultaneously** on the original 900/400 real dataset.

| Original-native V42 configuration | Accuracy | Macro-F1 |
|---|---:|---:|
| **R3 off + R2 off (learn A on all lived symbols)** | **87.25%** | **84.11%** |
| R3 off + four A organs | 87.00% | 83.86% |
| R3 off + original A depth2 | 86.75% | 83.62% |
| R3 off + deep weighting | 86.75% | 83.62% |
| R3 off + native concept | 86.00% | 82.26% |
| R3 off + native event clock | 86.00% | 82.26% |
| R3 off + precedent weighting | 86.00% | 82.26% |
| R3 off + blend | 85.75% | 82.02% |
| R3 off + log | 85.75% | 82.02% |
| R3 off + one A | 85.50% | 82.44% |
| R3 off + no budding R5 | 83.50% | 80.50% |
| R3 off + native C cap3 | 73.00% | 63.78% |

The best interaction improves development by **0.50 percentage points accuracy** and **0.49 points macro-F1** over R3-off alone. It still loses to the **88.00% / 84.85%** simple motif rule (900-train condition). These improvements are **exploratory** and do not have an untouched independent confirmation.

**Run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44604897189  
**Raw evidence:** [native-r3-12-organ-interactions.json](./results/native-r3-12-organ-interactions.json).

## 7. What was not executable or not applicable

This is an inventory of relevant original-native configurations/branches, **not all historical Braivour and MagicPerspective code versions**.

- Braivour V43 `native-v43/fused-one-universe.mjs` requires a genuine donor GGUF coordinate atlas, original Qwen donor controls and corresponding native movement trace. No genuine donor weights were loaded in CI; synthetic vector substitution was deliberately rejected. We tested the **actual V43 branch's native Brain code** on UCI DNA, but **not** the donor-dependent V43 fusion itself.
- The original MagicPerspective V1 `ShapeNet` is a 2D maze-cell predictor whose input features are not genomic sequences. It was not relabeled as a DNA classifier through an unrelated auxiliary mapper.
- V17 original `Discoverer.shapeGraph` propagates attraction to *known target-kind nodes*. Passing the held-out splice class as a target node would leak the answer; no honest target-hidden genomic navigation interface exists yet. Not run as a fake answer predictor.
- Existing Braivour GGUF numerical trance, embedding swarm, rejected surrogate FFN/lexical/chat experiments remain explicitly prohibited by project contracts; do not call them native genomic experiments.
- V42 C16/C32 were preflight-rejected due to `LeanC.candidates(maxLag)` using `3*(2^lag-1)` candidate masks; it is unsafe to call this a feasible native long-range extension without a new algorithm and memory contract.
- No GPU speed/energy or low-resource superiority benchmark was completed.

## 8. What is the strongest real conclusion, and what comes next?

**Strongest positive:** native `Brain` classification performance can depend sharply on both (1) which sequence coordinates enter its own immediate perception and (2) how its existing C and A beliefs are combined. The latter was found by controlled native R3/R2 ablations. The original computational organism was used, and the results come from authentic independent-of-training UCI sequence labels.

**Strongest negative (more scientifically useful than a cosmetic accuracy win):** after full 2,408-example training, the original native system implements the **same known local GT/AG rule on all 400 probed development records** and does not respond to perturbation of any of the other 56 bases in those records. The current mechanism is NOT a competitive AlphaGenome 2 regulatory sequence-to-function predictor.

**Next research step must change the actual mechanistic capability**, not just rerun the same local 4nt task with a seed or 10,000 epochs. Build a true *original-Brain-owned* active observation/perspective navigation over longer DNA, with **target completely hidden until after movement and prediction**, and test on a genuinely separate measured variant-effect/splicing assay with homology-disjoint validation. Compare to strong motif and trained baselines and official AG2 on matched assay targets and cell conditions.

To call the system competitive with AG2, we need biologically real reference/variant pairs, measured effect direction/magnitude, relevant cell/tissue metadata, identical official API evaluation and strict heldout metrics. None exist in these experiments.

## 9. Exact code, protocols and reproducibility

- [Native version comparison script](./compare-native-versions.mjs) and [pretest](./PRETEST_CONTRACT.md)
- [Native data scaling script](./compare-training-scale.mjs) and [pretest](./SCALING_PRETEST_PROTOCOL.md)
- [Motif equivalence/56-flank intervention script](./explain-motif-equivalence.mjs) and [pretest](./MOTIF_EQUIVALENCE_PROTOCOL.md)
- [R3×A interaction script](./compare-r3-organ-interactions.mjs) and [pretest](./R3_MASKED_ORGANS_PRETEST.md)
- [C-only compatibility preflight](./C_ONLY_NATIVE_COMPATIBILITY.md)
- [Frozen winner and 702 group-separated confirmation](./FROZEN_WINNER_BEFORE_FINAL.md)
- [Previous V42 genomic baseline](../RESULTS.md), [scientific context](../SCIENTIFIC_SIGNIFICANCE_AND_HYPOTHESES.md).

All raw machine-readable outcomes are in [results/](./results/) with provenance. **No source weights, fonts, secrets, local Windows process or prior checkpoint has been modified.**
