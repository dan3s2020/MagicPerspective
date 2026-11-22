# Pre-registered original native Brain transfer test: human donor GT -> human acceptor AG
Date: 2026-11-22. Protocol is committed **before any acceptor-development predictions**.

## Motivation and experimentally falsifiable claim
Prior native HS3D donor work showed genuine classification on an official held-out set, but strong traditional positional PWM baselines beat it. Further original-Brain-owned `ConstructedPathLearner` perspective-selection policies improved TRAIN-derived development scores without genuine transfer to a different biology task.

This study tests a much harder capability: **Does existing donor-learned original Brain state help on real human acceptor splice sites where the central consensus is AG rather than GT?** Distinguish zero-shot donor->acceptor generalization, low-shot transfer, and negative transfer. The target is still genuine human 140nt HS3D labeled data, not a clinical variant-effect or AlphaGenome 2 benchmark.

## Source/data and leakage guards
- Upstream `OluwadareLab/EnsembleSplice` commit `e04aa5aeb4035adac9ce6c65c2143c2ef7163332`.
- Only `ENSdatasets/hs3d_bal/Train` donor/acceptor true/false FASTAs are checked out during exploratory development. **DO NOT inspect or load upstream `Test` in this phase**.
- Strip unusable FASTA rows, record rejected counts. Require canonical `GT` donor at [70:72], `AG` acceptor at [68:70] in all selected rows; any deviation fails rather than silently alters the task.
- Deduplicate exact DNA per task/class, remove sequences with conflicting truth labels, deduplicate across donor training/calibration and acceptor development to prevent same-input reuse.
- Deterministic SHA256 order with original `hs3d-donor-blind-v1:` for donor and an independent predeclared `hs3d-acceptor-transfer-v1:` for acceptor. No different salt selection after seeing results.
- Donor training: 600 P+600 N (n=1200), donor policy calibration 100 P+100 N (n=200); exclude cross-task exact DNA overlap with acceptor development.
- Acceptor adaptation: nested sizes **0 / 40 / 200 / 600 / 1200 total**, with P=N: first 0/20/100/300/600 rows of each acceptor class in the sorted `Train` data.
- **Frozen acceptor development**: 200 P+200 N from source sorted indices [1300:1500] per class; never used for either task's learning or policy rewards; common across all variants. This is a within-source exploratory development partition, **not a biological homology-disjoint cohort or independent official Test**.

## Original-organism causal setup
- The only class predictor is original `Brain.predict()` from unchanged V42 source. True class arrives via `Brain.live()` **only during donor/acceptor training**; at evaluation label stays outside Brain.
- Original `ConstructedPathLearner.pathPolicy[6]` is the only learned perspective selector: original `learnTransferable()` with historical correct/incorrect feedback after original prediction. No new classifier, externally trained head, generated target coordinates, fabricated donor GGUF.
- Twelve real 4-base sequence windows are physically observed with a 1-byte position identifier; cap5, depth2, `off:["R2","R3"]`, seeded 20261122 for all arms. Positions `[54,58,62,66,68,70,72,74,78,82,90,100]` are predefined (not autonomously invented) and identical for donor/acceptor.
- 6D features for original policy: bias, normalized relative position, original P/N probability margin, negative uncertainty, original probability of P, and a generic topology proximity term `1-min(1,abs(pos-70)/30)`. **This hard-codes reference coordinate 70**, so successful transfer cannot be presented as autonomous coordinate invention.
- Donor-pretrained arm: original Brain lives all authentic donor training observations, calibrates its original native policy on 200 separate donor rows, then optionally receives acceptor adaptation rows and their feedback. **The very same in-memory Brain instance** makes the final acceptor predictions.
- Fresh-arm: identical original native V42 Brain from seed 20261122, **no donor examples**. Receives exactly the same acceptor adaptation data and feedback as donor-pretrained arm (or none in zero-shot case).
- Report two predeclared readouts for each original Brain: (a) *primary* learned native `ConstructedPathLearner` policy-chosen view; (b) fixed70 (same native Brain), fixed72, and original confidence-based selection. All 12 views are scanned before policy selection: NOT limited-budget active exploration.
- Dataset/seed/batch order, policies, and readout rules frozen before execution. No post-hoc mode tuning on acceptor development.

## Primary comparison and results requirements
- For each adaptation size, paired same-sequence native vs fresh prediction. Primary difference in **macro-F1 for learned native policy** (not raw accuracy; balanced classes but possible model collapse). Also balanced accuracy, per-class precision/recall, confusion and paired disagreement. No score projection in advance.
- Zero-shot original donor-pretrained Brain vs fresh untrained and class-prior baseline (50% on balanced dev). Repeated donor pretraining does not count as zero-shot.
- Adaptation efficiency and negative transfer: compare pretrained vs fresh for matched **0, 40, 200, 600, 1200** acceptor labels (same inputs); show results even if donor pretraining hurts.
- All original Brain states freshly instantiated per run and never altered after dev predictions. Preserve trained symbol counts, policy weights and updates, selected view distributions, source checksums, original job logs.
- A scientifically meaningful **positive** is a stable donor advantage at matched acceptor data volume, on an independent acceptor split, across seeds, and ideally surpassing a strong conventional acceptor-site PWM. We have **not** established any of that.
- Further external confirmation would require a new homology/family-separated assay and a newly frozen protocol. Do not cherry-pick official `Test` after inspecting dev.
- This is NOT alphaGenome 2's 1M-base conditioned variant prediction task; no AlphaGenome 2 superiority claim can be based on these metrics.

## Source protection
No edits to original Brain classes, preexisting V42/V43/Braivour branches, donor files, prior checkpoint or UI. New experiment files isolated in this research branch. Record failures and regressions.
