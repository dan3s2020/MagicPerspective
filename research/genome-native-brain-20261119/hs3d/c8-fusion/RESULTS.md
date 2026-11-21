# Original MagicPerspective V42 learns to fuse two real human DNA perspectives in native C8 — measured findings

**Date:** 2026-11-21  
**Status:** four genuine original-native HS3D control runs, three frozen DRANet source-external verification runs, and TWO original SAME-Brain causal first-view interventions (dev400 and external n1600) all COMPLETED successfully, with full machine-readable summaries.  
**Do not call this AGI, new molecular gene law, a clinical predictor or a matched AlphaGenome 2 benchmark.**

## Starting point and genuine change in capability

Previous genuine original-V42 `Brain.live()` / `Brain.predict()` had learned two **physical primitive movements** under delayed reward, and generalized moderately to real human DRANet sequence records. But its P/N **classification** generally saw only the last 4nt viewport at the moment of the answer. Tests that added 32-symbol chronological history training to native C6 were unstable/regressive; tests that rewarded STOP produced either no saving or collapsed to trivial stopping.

This research changes neither the original Brain equations nor its original cognitive organisms. It changes which **two actually observed 4base physical DNA regions** enter the original native `LeanC` immediate context. Original `Brain` is instantiated with existing cap8 support. The same original native C/A learning and belief prediction uses eight actual real DNA bases, not an outside classifier or a hand-coded motif lookup. The first four bases are at real body position70, the last four at position64.

These positions are HUMAN-PROVIDED candidate observations. Thus this is a verified **two-view information-fusion sub-capability**, not a verified full active navigator autonomously choosing where to go.

All inputs: genuine 140nt human HS3D true vs false splice acceptor sequences with common real `AG` motif at bases68:70. Original source SHA e04aa5aeb4035adac9ce6c65c2143c2ef7163332. Same original source train 600 P+600 N canonical unique DNA, 12,000 original native `Brain.live` symbols (eight view symbols + real P/N during training + newline). Native C8, A depth2, built-in R2/R3 disabled, seed20261121. No P/N class is supplied to `Brain.predict` at evaluation. Before any source-external results, method and all four development arms frozen in [PRETEST.md](./PRETEST.md).

## 1. Source HS3D dev400, exploratory and previously examined

All four genuine original native Brain conditions trained with exact same labels, seed, cap8 and symbol count, changed only sensory view.

| Native C8 input, true human AG P/N | Correct/400 | Accuracy | Macro-F1 | Native C selected mask |
|---|---:|---:|---:|---|
| Genuine 70:74 + genuine 64:68 **(selected winner)** | **299/400** | **74.75%** | **74.1077%** | **exact:149** |
| Only genuine 64:68, preceding 4 sensory symbols blank | 287/400 | 71.75% | 71.6989% | exact:86 |
| Genuine 70:74 + genuine 66:70 | 286/400 | 71.50% | 70.5996% | exact:77 |
| Genuine 64:68, first 4 bases deliberately taken from a different original row | 281/400 | 70.25% | 69.1660% | exact:163 |

The first-view destroyed comparator is a **non-natural deliberately mismatched genome input**, not an experimental biological mutation. The result demonstrates relative utility of real paired observations on this pre-examined dev cohort; alone it could reflect prior design selection.

The original C8 `LeanC` elected **exact:149** (mask bit offsets 0,2,4,7). Original Brain `ctxOf` reverses input order so offsets0–3 are the last 64nt viewport and offsets4–7 are the preceding 70nt viewport. Its selected exact mask crosses **both** real source regions. Native original C8 learned and stored **765 native candidate models** and reached native maxLag8. A mask crossing two views alone is mechanism evidence but does not prove a causal input effect; that is addressed by the separately executed perturbation below.

**CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44919874765  
**Machine output:** [results/original-native-C8-four-controls-20261121.json](./results/original-native-C8-four-controls-20261121.json).

## 2. PRE-FROZEN human source-external DRANetSplicer n=1600 — no new learning

The real-pair winner and exactly two matched control original-Brain configurations were **frozen and committed before** the external action existed, in [FROZEN_EXTERNAL_VALIDATION.md](./FROZEN_EXTERNAL_VALIDATION.md), commit **6e4a0a6313509630676a4987b19aa5500031d952**.

Public DIFFERENT-source DRANetSplicer human acceptor records, pinned source commit `fe300cd8e4a55471268e1271621df208430157a5`, original 402nt, center crop [132:272] to 140nt, common conserved AG at crop [68:70]. Deterministically selected 800 P+800 N, no original-source training at all. More conservative source decontamination than earlier trials: exclude all exact DNA overlaps with **ENTIRE authentic HS3D source**, not just the 1200 examples that were learned. Counts: 804 exact original-source overlaps excluded, 850 duplicate external, 0 contradictory; 706 raw positive rows lacked correct AG and were excluded on the same source rule before 800-class sample selection. This does **not** guarantee gene-family or distant-sequence homology separation.

| Native original Brain, never trained on DRANet | Correct /1600 | Accuracy | Macro-F1 |
|---|---:|---:|---:|
| **Genuine paired 70+64 context C8** | **1,125** | **70.3125%** | **70.0996%** |
| Same original algorithm / budget, 64-only context C8 | 1,083 | 67.6875% | 67.6307% |
| Same original algorithm, deliberately cross-record-corrupted first 4 bases | 1,059 | 66.1875% | 65.5539% |

Real native paired viewpoint thus gains **+42 correctly classified real human sequences (+2.625 percentage points accuracy, +2.469pp F1)** vs the single view, and **+66 (+4.125pp accuracy, +4.546pp F1)** vs first-view destroyed. Both metrics were designated before scoring. This is a **measured positive transfer to a DIFFERENT public human source**, not evidence that sources are independent on biological family/chromosome level. In particular the DRANet source was used in a previous different original C6 study, so its source isn't virgin across the entire project. These 1600 rows also differ from earlier C6 selections because all-source overlap exclusion is stricter; **do not directly compare 70.31% to the earlier C6 62.81% as a controlled model-architecture improvement**.

Original native paired confusion `P:{P:630,N:170}, N:{P:305,N:495}`; true-positive P recall 78.75%, true-negative N recall 61.875%. Both classes are far from near-perfect; biological complexity and source shift remain.

**CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44920230491  
**Machine outputs:** [results/frozen-human-DRANet-external-three-original-C8-controls.json](./results/frozen-human-DRANet-external-three-original-C8-controls.json). Raw per-example original Brain predictions stored in CI artifacts for each arm.

## 3. DIRECT within-the-same-frozen-Brain first-viewport intervention — n400

A more stringent mechanistic question: do the original Brain's **same actual trained weights** and final class output depend on the preceding first observed four bases, or is mask149 incidental? Predeclared before execution in [CAUSAL_INPUT_ABLATION_PROTOCOL.md](./CAUSAL_INPUT_ABLATION_PROTOCOL.md).

- One original Brain is trained ONLY on genuine paired 70+64 HS3D examples, exact 1200 training rows and no extra head.
- For every frozen dev case, evaluate (a) genuine first four plus genuine final four; (b) deliberately replace **only the first four** with a real external record's same-coordinate bases from a different row (not a natural genome); (c) replay the actual unchanged input as a sham.
- Same Brain native weights; no learning during all three measurements. The last genuine four bases are byte-identical in all three.

| Actual same-trained original Brain on dev400 | Accuracy | Macro-F1 |
|---|---:|---:|
| Genuine original paired views | **74.75%** | **74.1077%** |
| Cross-row first four substituted only | **68.00%** | **67.2123%** |
| Sham original view repeated | **74.75%** | **74.1077%** |

**65/400 native P/N predictions FLIPPED** after changing first four true observations, 32 flips in true P and 33 in true N. No genuine original input sham flipped: **0/400 parity errors**.

This establishes that the first real physical viewport has a **measured causal effect on the same original trained Brain's answer** on historical dev400, and its original pairing provides additional predictive signal. It does not prove that the source change is a real biological mutation or that C8 spontaneously selected the anatomical coordinates.

**CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44920346507  
**Raw causal summary:** [results/native-C8-same-brain-first-four-causal-ablation-400.json](./results/native-C8-same-brain-first-four-causal-ablation-400.json).


## 4. Source-external causal first-view intervention on SAME original Brain (n=1600)

After scoring the frozen external comparison, this separate mechanistic experiment was declared in [EXTERNAL_CAUSAL_SWAP_PROTOCOL.md](./EXTERNAL_CAUSAL_SWAP_PROTOCOL.md). One original V42 C8 Brain trained only on genuine HS3D human P/N was frozen; its P/N output on the external DRANet real two-view input was compared to (i) changing ONLY the first four viewed genomic bases to a different human record while keeping the final four real bases and weights fixed, and (ii) a sham repeating the unchanged original input. No external labels supplied during native prediction.

| Original C8 Brain, external human n=1600 | Correct | Accuracy | Macro-F1 |
|---|---:|---:|---:|
| Genuine two real biological views | **1125** | **70.3125%** | **70.0996%** |
| Only first 4 bases swapped across different human rows | 1065 | 66.5625% | 66.2779% |
| Identical same-input sham | 1125 | 70.3125% | 70.0996% |

**330/1600 (20.625%) real same-model predictions changed**, versus **zero sham prediction changes**. Among the discordant cases, the genuine original real viewpoint was correct **195** times and the mismatched first viewpoint was correct **135** times. Two-sided exact paired McNemar/conditional binomial p = **0.001130871916** assuming independent records. This is strong conditional evidence of the first input view's causal contribution to THIS trained Brain; biological homology can violate independent-sample assumptions, and the DRANet public source was used in other earlier experiments. Do not interpret the p-value as independent gene-family clinical evidence.

The original C selected exact:149 remains a native attention mask spanning both real four-base sensory regions. This external causal diagnostic uses the original algorithm, not a new predictor.

**Executed CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44920632334  
**Full native metrics:** [results/native-C8-external-1600-same-Brain-first4-causal-ablation.json](./results/native-C8-external-1600-same-Brain-first4-causal-ablation.json).

## 5. Strict limits and the next falsifiable capability

- No AlphaGenome 2 same-target head-to-head; no 1Mb, cell-conditioned tissue regulation, causal variant effect, measured splice strength or clinical validation. **Do not say AlphaGenome2 was outperformed.**
- No generative text/GGUF Qwen donor inference assimilation.
- Sensor coordinates70/64 and eight-symbol ordering were explicitly authored; native C mask was endogenously selected within that human-chosen sensory space.
- These experiments test **fusion with fixed actual physical views**, not the joint operation of earlier original learned two-step primitive movement AND C8 fused classification simultaneously. That is the logical next actual engineering objective: unify both abilities in the SAME organism rather than using separate outside trained modules.
- The external study has the same kind of binary true/false historical source as training, although from an independently published dataset; no family/homology-disjoint guarantee. Need an additional genuinely novel measured biological assay and per-sample paired CI/statistical uncertainty for stronger claims.
- Accuracy alone hides P/N differences; preserve confusion and macro-F1.
- An additional SAME original Brain, external source causal intervention was executed after the external comparison and is documented below; it is a mechanistic diagnostic rather than a virgin evaluation.

## Provenance and reproducibility

- [Original V42 Brain full source, unchanged](../../../../v17/transcend/torus-aether/devour/brain.mjs)
- [Original human 1200-train 400-dev four-arm code](./run-native-paired-evidence.mjs)
- [Frozen source-external 1600 code](./run-frozen-homo402-native-c8.mjs)
- [Same native frozen-Brain 400 input intervention](./run-causal-first-view-swap.mjs)
- [Source-external native first-view input intervention](./run-external-same-brain-causal-view-swap.mjs)
- Source tree, data hashes, original native selected masks, all four confusion matrices and detailed metrics are saved in the JSON links above and full CI per-example artifacts.
- Branch is isolated: **research/HS3D-NATIVE-C8-EVIDENCE-FUSION-20261121**. No original V42, Braivour, Qwen donor or existing user checkpoint has been changed.

**Summary:** A small but credible ORIGINAL-ORGANISM improvement: it can combine information from two geographically distinct real DNA views in its existing native C8 perspective. This improves both pre-examined HS3D and a zero-shot different-source human test, and a same-Brain causal intervention confirms the first view can matter. This is an active research advance with clear boundaries, **not the completed broader research goal**.
