# Research brief for scientific evaluation — native perspective-dependent learning on real DNA

**Date:** 19 November 2026  
**Project:** MagicPerspective / Braivour native-organism research  
**Level of evidence:** early reproducible experiment, single historical dataset, modest sample size  
**Status relative to Google DeepMind AlphaGenome 2:** **not benchmarked / not beaten**

## Research question

Can an existing general-purpose computational organism, whose native learning and inference mechanisms were not designed for genomics, gain functional predictive ability when it can access an appropriate perspective on a biological sequence? Could the same organism eventually learn to *discover* such perspectives and transfer them to new biological assay types?

This is an early result about **representation-dependent adaptation**, not a claim to have solved regulatory genomics.

## What was actually executed

- Original unchanged V42 `Brain.live()` / `Brain.predict()` from MagicPerspective; original native learning rules used, **no external classifier or genomics foundation-model inference**.
- Authentic UCI 60-nt splice-junction classification: EI / IE / neither.
- **900** labeled training observations; **400** development observations, and a subsequently frozen, **197-sequence** confirmatory set (no answer shown to Brain at prediction time).
- Four relevant splice-site nucleotides were made visible in the organism's short native temporal perception by a **human-designed input rearrangement**. The full 60 nucleotides remained present.
- Genome sample grouping used a source identifier prefix and excluded cross-split identical DNA; more rigorous homology-disjoint external replication is still needed.

## Numbers that can be checked

| Frozen confirmatory set (n=197) | Accuracy | Macro-F1 |
|---|---:|---:|
| Native V42 organism | **77.66%** | **76.97%** |
| Majority-class baseline | 52.79% | 23.03% |
| Simple GT/AG biological motif rule | **88.83%** | **87.44%** |
| Native V42, central DNA shuffled | 42.13% | 29.65% |

Initial poor perspective: 58.50% accuracy, 24.61% macro-F1 on 400 development examples, all assigned the same class. Corrected four-nt perspective: 78.25% accuracy, 76.76% macro-F1 on the same development examples. An 8nt pair-folded representation gave 78.75% accuracy but only 66.18% macro-F1; selection by the more balanced macro-F1 was committed before testing the 197 records.

**Evidence location:** https://github.com/dan3s2020/MagicPerspective/tree/research/AG2-REAL-GENOME-NATIVE-BRAIN-20261119/research/genome-native-brain-20261119  
**Completed independent CI execution:** https://github.com/dan3s2020/MagicPerspective/actions/runs/44536477353

## The interesting effect, and the caveat

Changing **what the native organism can perceive at the moment of decision**, without changing its learning algorithm or training count, yielded a large gain in out-of-sample 3-class performance. This points to a major representation bottleneck in this implementation. The sequence-perturbation intervention supports sensitivity to biological input, not just majority-class prediction.

However, the rearrangement was **supplied manually** and centers on a familiar splice motif. The native organism does **not** beat a simple consensus motif rule. The observed effects do not yet imply automated discovery of genomic structure, causal regulatory prediction, new scientific biology, or model competitiveness.

## Highest-value experiment for external validation

**Can the original organism learn to choose its own sensory perspective?**

Give it real unknown-position sequences and limited native actions to inspect regions. Before seeing biological output labels, it must select which windows or transformations to observe and then make a blind prediction. Its own persistent Brain/Discoverer mechanisms must own the selection and learning: no separate trained navigator or hidden inference system. Score on gene-family-disjoint independent data, against hand-selected windows, canonical motifs, random inspection and trained conventional baselines.

A positive, replicated result would make a more convincing research contribution than additional short-sequence accuracy tuning.

## What more training might accomplish

A data-scaling curve (from 75 to the **2,408** training-eligible observations already available) could tell whether performance is data-limited or perspective-limited, while more diverse genuinely independent datasets could test generalization. **No scaling experiment has yet been performed**, so the expected performance gain is unknown. More examples cannot by themselves solve the information lost outside a short temporal window.

## AlphaGenome 2 scientific boundary

AlphaGenome 2 is trained on more than 100 million cell profiles and predicts condition-specific genomic functions and variant effects; its reported TenK10K causal-variant comparison is a *different task and metric* from UCI splice classification. An honest direct comparison requires the same independently measured variants, biological conditions, official API predictions, held-out labels, scoring and uncertainty intervals.

Official AlphaGenome 2 overview: https://deepmind.google/blog/alphagenome-2-deciphering-how-cells-read-dna-to-better-understand-disease/

Google DeepMind currently invites interesting AlphaGenome 2 research-use-case submissions by **30 November 2026**:
https://forms.gle/ftBfHGH7NUrCZEjN6

**Suggested external description:** "We have an early, reproducible observation that the same native computational organism becomes significantly more useful for real short DNA classification when its limited sensory perspective is restructured. We seek to test whether perspective selection can become endogenous and transfer to sequence-variant functional assays."

We are not asserting priority, novelty beyond published methods, a scientific discovery, clinical utility, AlphaGenome 2 superiority, or particular interest from any named researcher.
