# Native original Brain external first-viewport intervention — preregistered diagnostic

**Date:** 2026-11-21. This is a NEW *mechanistic* follow-up, declared **after** first external 1600 scores were viewed. It is NOT another virgin performance benchmark or a method-selection event; no code, hyperparameters or model choice will be retuned from this result.

### Previous frozen evidence
- Real pair [70:74]+[64:68] original V42 Brain C8 learned 1200 HS3D examples, selected mask exact:149.
- Source-external DRANet human 402nt -> 140nt crop: frozen real pair **1125/1600 (70.3125%) / 70.0996% F1**; matched original-native single-view **1083/1600 (67.6875%) / 67.6307% F1**; scrambled-training pair **1059/1600 (66.1875%) / 65.5539% F1**. Training exclusively HS3D, no DRANet labels in learning.
- Same trained original Brain HS3D dev400 when swapping only its first four bases: **65/400 class predictions changed**, acurracy 74.75% -> 68.00%, no changes in identical sham (0/400). Pretest and CI committed.

### New question
Does the SAME frozen original Brain causally depend on first four real genome bases on DIFFERENT-PUBLIC-SOURCE DRANet human sequences, not just within HS3D? This is a discrimination/robustness test against a deliberately artificial cross-record input.

### Fixed design
Use exact original C8 Brain, A2, R2/R3 off, seed20261121, training on same 1200 authentic original HS3D source examples and exact 12,000 lived symbols, same two actual views. Evaluation on exact prior 1600 source-external DRANetSplicer human AG acceptor records after all-source HS3D exact-DNA exclusion, fixed source SHA order. Original Brain frozen.

For each external row: (a) genuine original 70+64 observation; (b) replace ONLY first 4 bases with a different external row's real 70nt four bases, chosen by predeclared hash, hold genuine last4 and all weights fixed; (c) sham repeat original 8base observation. No external truth enters `Brain.predict`. No learning during evaluation. Count changed labels, per-class changes, real vs crossed confusion/F1/accuracy and sham agreement (must be 1600/1600).

Primary causal success: nonzero original-vs-swapped answer changes and true view positive accuracy/macro-F1 versus crossed within same original model. If none, report that first-view contribution was limited to historical dev and reject stronger generalization. This trial uses source whose labels had been viewed in other research; it is not a new heldout methodological comparison, only frozen model mechanism confirmation.

**No original source code changes, no new external classifier, no autonomous coordinate discovery, no full AlphaGenome2 benchmark or homology-independent validation.**
