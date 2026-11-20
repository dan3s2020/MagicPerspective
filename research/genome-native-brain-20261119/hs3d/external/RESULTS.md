# Independent published-source human acceptor test: original native V42 Brain zero-shot generalizes

**Research date:** 2026-11-20  
**Status:** REAL original-Brain EXTERNAL genomic test **COMPLETED**; all source inputs, original frozen method and results committed; no training on any DRANetSplicer examples.  
**Executed CI:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44657306160  
**Pretest frozen before fetching full external data:** [EXTERNAL_HUMAN_TRANSFER_PRETEST.md](../composition/EXTERNAL_HUMAN_TRANSFER_PRETEST.md), commit `892e1a95200a9cf124273dcde9c22ddfd4dfda48`.

## Why this is important

Previously, the actual unchanged original `Brain.live()/Brain.predict()` learned from physical 2-step action feedback on human 140nt HS3D acceptors. Positive accuracy improvements on 1,600 unseen exact DNA sequences still came from the **same HS3D source**, not a different genomic collection.

**This study asks a different and stronger question:** will the exact same learned original-Brain native physical action choices retain a benefit when confronted with **genuine human AG splice sites and decoys from an independently published source**, completely absent from original supervised training, action rewards and viewpoint selection?

No online adaptation, no hidden true label at prediction, no re-picked organism version or manually selected best physical window is permitted.

## Fully specified original organism

- Original V42 `Brain` from `v17/transcend/torus-aether/devour/brain.mjs`, original `Brain.live` and `Brain.predict`, native C cap6, native A depth2, R2/R3 off, seed20261120.
- Original HS3D Train only: 600 genuine P + 600 genuine N supervised cases, each seven truly observed 4-base physical windows (58,800 lived symbols). Then 1,000 genuine original-native delayed two-primitive physical action reward episodes (16,000 additional lived symbols).
- Exactly the frozen `chain-delayed` 2-step primitive policy, same real 4nt observation budget 3, primitive meanings `again,undo,open,right,new,left`. It chooses each action via the actual native `Brain.predict` expected positive reward **before observing DNA at the destination**. The original Brain makes its own final P/N prediction from genuinely observed local DNA. True external P/N is provided to an **outside scorer only after original Brain's output**, never to Brain.learn.
- Original code and previous user active processes unchanged; isolated additive runner `run-homo-402-zero-shot.mjs` implements only new external biological source parsing, original coordinate frame crop and measurements, **not a different learning mechanism**.

## Actual independent biological source

Original external repo `XueyanLiu-creator/DRANetSplicer@fe300cd8e4a55471268e1271621df208430157a5`.

Original unmodified source file SHAs:
- `data/dna_sequences/homo_acceptor_positive.txt` SHA256 `7837826e5ab646a2f557247d45e06d86802070911dd9de32c4622c213347fb1a`;
- `data/dna_sequences/homo_acceptor_negative.txt` SHA256 `2f69dad0fb30fb64abe3feeaffda0bb86a4b0241aa9db557ac079dc582af84dd`.

True original raw source contains **137,455 P and 137,455 N** real 402nt human sequences. All are canonical DNA with length402 in these two files. For direct comparison to the original HS3D native body, motif AG at `original402[200:202]` must hold; **706 source-P records** fail this central AG criterion and are explicitly excluded; none of source N do. We do not silently relabel them.

The exact original native 140nt body frame is the deterministic `original402.slice(132,272)`: original AG at 200:202 becomes native body AG at 68:70. No new local DNA generated or filled in, and no outside features added. Exact duplicate 140nt DNA and P/N contradictions removed. **697** external windows exactly overlapped previous HS3D training/calibration/development DNA and were excluded; **851** external repeated DNA windows also excluded. Source after exclusion had **135,413 usable unique P** and **137,243 usable unique N**. Original external labels were never used to train the Brain.

Only **800 true and 800 false** exact-unique human DNA windows were deterministically selected by SHA256 `"external-homo-native-20261120:"+native140DNA`, before scores, for the frozen zero-shot test.

**Still missing:** chromosome or gene coordinates and a systematic homology/grouping audit; exact local DNA exclusion is NOT the same as gene-family independence.

## Measured EXTERNAL zero-shot outcome — one frozen run, 1,600 authentic non-overlapping external sequences

| Method on identical original frozen Brain | Correct | Accuracy | Macro-F1 |
|---|---:|---:|---:|
| **Original Brain chooses TWO learned primitive actions** | **1,005/1,600** | **62.8125%** | **60.3201%** |
| Original SAME Brain, single fixed physical window64 | 925/1,600 | 57.8125% | 48.8743% |
| Original SAME Brain, single fixed physical window66 | 800/1,600 | 50.0000% | 33.3333% |
| Original SAME Brain, initial window70, no action | 827/1,600 | 51.6875% | 47.1884% |
| Original SAME Brain, two deterministic random primitives | 819/1,600 | 51.1875% | 50.7605% |

**Native versus matched fixed64:** +**80** correct cases out of 1,600; **+5.00 percentage points** binary accuracy; **+11.45 pp macro-F1** (the large F1 change reflects improved negative classification in a strongly P-biased Brain).

Actual frozen original-native confusion `P:{P:703,N:97}; N:{P:498,N:302}` — true-positive recall **87.875%**, true-negative recall **37.75%**. Fixed64 `P:{P:797,N:3}; N:{P:672,N:128}` — positive recall 99.625%, negative recall16.00%. The native organism traded reduced true-positive recall for substantially better recognition of negative decoy AG sites. It is NOT a clinically adequate false-positive rate.

Physical primitive composition transferred, without re-training:
- `left > left`: 586/1,600;
- `left > new`: 443/1,600;
- `undo > new`: 285/1,600;
- `new > new`: 192/1,600;
- `new > left`: 73/1,600;
- `undo > undo`: 21/1,600.

Actual original body final genomic position: **64 on 1,294**, **66 on 285**, **70 on 21**. Each was decided through the same native original Brain from currently observed real bases before the next unseen window was shown.

## Causal conclusion that is and isn't supported

**Supported:** The original computational organism's learned *sequence of observation actions* has a real zero-shot accuracy and macro-F1 advantage versus a fixed native viewport and deterministic random movements on a separately published large human acceptor source, with exact local DNA overlap excluded. The mechanism is more transferable than a merely HS3D-specific memorized output path; this is one meaningful step toward endogenous active observation.

**Not established:** a globally novel learning algorithm, independently invented primitive meanings, novel biological regulation, tissue- and variant-conditioned gene prediction, robustness across fully chromosome/homology-disjoint loci, Qwen/GGUF inference assimilation, or superiority/parity with AlphaGenome 2 or state-of-art splice predictors. The source is a different dataset repository but both derive from human genomic splice annotation; some gene regions may overlap despite exact DNA exclusion. The genome actor only consumes three 4nt windows, and its P/N score is not comparable with whole-genome neural model benchmarks.

**No post-hoc selection on external score:** This is a one-shot frozen policy. Scores from this external source must not be used again to claim new untouched confirmation for any revised policy.

## Complete executable records

- [Original external 402nt source reading and frozen same-Brain action runner](./run-homo-402-zero-shot.mjs)
- [Pre-frozen exact dataset and analysis protocol](../composition/EXTERNAL_HUMAN_TRANSFER_PRETEST.md)
- [Raw metric objects, source checksums, per-class counts, motion histograms](./results/frozen-1600-drANet-original-Brain-zero-shot.json)
- [GitHub CI execution and 1,600 per-sample action traces](https://github.com/dan3s2020/MagicPerspective/actions/runs/44657306160)
- [Previous 1,600 within-HS3D evidence](../composition/RESULTS.md)
- [Braivour V5 user's original designed-world primitive discovery](https://github.com/dan3s2020/Braivour/blob/experiment/ORIGINAL-BRAIN-LIVES-WHOLE-INFERENCE-LOOP-20261111/research/discovery_maze/README.md)

**Next scientific gate:** a chromosome/gene-family separated external test with exact locus provenance, independent probability calibration, explicit paired statistical uncertainty and a matched verified benchmark for the same AG/decoy task. This has NOT been executed by this report.
