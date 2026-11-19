# Distinguish native mechanism from known splice-site motif — pretest

**Date:** 2026-11-19. This is a genuinely distinct question, not an attempt to reuse the same training benchmark with additional random seeds.

Observation from authentic 8-way scaling run: **the original native Brain with R3 readback disabled, trained on 2,408 UCI sequences, has the same aggregate confusion matrix as the simple GT/AG rule on 400 development sequences**. That alone does NOT prove per-example decisions agree, nor that it uses only the GT/AG motif.

## Predetermined diagnostic, no unseen-label experiment
1. Re-execute *only this winning 2,408-example native Brain* with unchanged original source and seed.
2. Compare every one of the 400 **previously examined development** predictions to the GT/AG rule on the same records, reporting **exact agreement**, pairwise confusion and all mismatches.
3. Perturb **only the 56 flanking nucleotides**, keeping the original four central motif nucleotides and their position fixed; shuffle flanking positions deterministically. Compare output class with the native unperturbed output. This measures **functional reliance** on flanking information. Do not score shuffled flanks against original biological labels as though they were assayed mutations.
4. Keep a second 4-nt motif ablation as a positive sensitivity check if applicable; real class truth is never supplied during prediction.
5. If 100% equivalence and 100% flanking invariance, state candidly that the current task has only evidenced a local consensus-motif rule, not new long-range regulatory prediction.
6. If differences exist, record exact inputs/predictions and rule out simple class prior before claiming any richer biology.
7. This does not use the 702 already examined held-out records for selecting anything and cannot establish AG2 superiority.

The original organism, native learning rule and checkpoints remain unchanged. Only a read-only external diagnostic is new.
