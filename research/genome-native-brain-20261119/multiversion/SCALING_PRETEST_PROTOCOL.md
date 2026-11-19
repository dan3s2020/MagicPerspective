# Fixed native training-volume causal experiment — registered before runs

**Date:** 2026-11-19. This is a follow-up to the user request to continue testing *genuinely available Braivour / Magic Perspective native mechanisms*, not a claim of independent discovery.

## New question

The R3 no-trust ablation improved n=400 *development* macro-F1 from 76.76% to 83.62%, yet failed to beat a simple GT/AG motif rule on 702 new group-separated sequences, which were 96.72% N. Does adding **genuinely different labeled DNA sequences** improve the original Brain's minority-class discrimination and overcome native evidence failures? Or does learning plateau/regress, suggesting perception/generalization is limiting?

This is a learning-volume **dose-response**, not the same hypothesis repeated with merely different random seeds.

## Frozen design before viewing outcomes

- Authentic identical UCI splice-junction data hash as prior.
- Deterministic *nested* training sizes **300, 900, 1500, 2408** unique 60nt examples from the original **2,408** available train-partition records.
- Training order = identical source `hash("train:"+name)` ordering, first N records at each size. All rows train `Brain.live` and label truth only during training, then freeze.
- **Two** original native modes only: default `v42-c4` and native `v42-no-trust` (built-in R3-off), original Brain constructor, same seed 20261119. This distinguishes whether the R3 advantage is stable across training doses.
- Evaluation = the **same 400 development rows**, which are group-disjoint from the full 2,408 eligible train partition and were seen during model selection. They are explicitly **NOT** a new blind confirmatory or external benchmark.
- Report accuracy, macro-F1 (priority), balanced accuracy, per-class precision/recall, native confusion, majority and GT/AG controls, actual consumed symbol count, with all failures.
- Never repurpose results as AG2 model-comparison metrics. Do not choose a new final winning architecture based on the already-opened 702 final labels.
- No augmentation, noise tricks, manufactured examples, fake donor GGUF, new external learned classifier or original-source modification.

## Interpretation gates

- If increasing unique training examples consistently helps both architectures on EI/IE/N without collapsing minority precision, mark **MORE-DATA SIGNAL (EXPLORATORY)**. The numeric gain must be measured, not predicted.
- If one or both regress or saturate, mark **PERSPECTIVE/TRANSFER GENERALIZATION LIMIT** and prioritize real native perspective selection on truly external data.
- Report difference between original R3 and ablated R3 at each size; no significance claims from the 400 development samples alone.
- The 702 previously untouched samples are now *historically examined* after previous confirmation and must not be described as virgin if re-evaluated in any future diagnostic.

## Main project protection

This is an additive test in an isolated branch and uses the same MagicPerspective native Brain. All other MagicPerspective and Braivour branches, CUDA setup, active Qwen donor training, user checkpoints and original files remain unchanged.
