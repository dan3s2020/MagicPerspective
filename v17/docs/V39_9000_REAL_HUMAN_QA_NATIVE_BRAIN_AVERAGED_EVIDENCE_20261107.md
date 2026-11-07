# MagicPerspective V39 — 9000 real human QA tasks, averaged native Brain, frozen external evaluation

Date: 2026-11-07
Branch: experiment/V39-9000-HUMAN-QA-AVERAGED-20261107
Parent: V38 commit ea0ef98d1b60e615a5514b312f88616d47f9b0d9.
Status: GREEN experimental, not production general language understanding. No main merge. Original Brain, Discoverer.shape/shapeGraph, CUDA, UI, original checkpoints unchanged.

## Exact results

Verified GitHub Actions run: https://github.com/dan3s2020/MagicPerspective/actions/runs/42363363468
Two jobs passed: 9000 real Q/A evaluation and unchanged original V38/native-maze regressions.

Official Stanford SQuAD v1.1, source SHA256 validated by the test. TRAIN 442 source articles; DEV 48 separate articles. Of TRAIN, 380 articles assigned to training and 62 to independent internal calibration; external DEV contains entirely separate articles.

9,000 genuine human training question/answer records; 2 epochs, 18,000 supervised exposures, including 14,366 accepted representable spans, 3,634 out-of-model span examples. Time-averaged 89 weight snapshots after 400 burn-in and then every 200 exposures.

Original Brain learned maze attraction/conductance through 26 genuine maze episodes, then was used with the exact original shapeGraph and original Brain checkpoint. The candidate graph consists of actual source text sentence nodes and all available contiguous source answer span terminals. Supervised answer-span preferences learned on TRAIN guide original path to a candidate. DEV answer strings never enter frozen plan or training.

Internal 500 TRAIN-calibration questions (policy chosen BEFORE DEV):
  Last online exact 51/500; averaged exact 92/500.
  Last online normalized 60/500; averaged normalized 102/500.
  Therefore average selected.

External frozen 650 human DEV questions:
  Same native graph, no learned preference: 6/650 exact.
  LAST online weights: 91/650 exact (14.00%); normalized 94/650.
  AVERAGED weights: 153/650 exact (23.5385%); normalized 157/650 (24.1538%).
  Previous verified V38 averaged baseline: 121/650 exact on same deterministic 650 sampled DEV questions. Gain +32 complete correct raw answers.
  Original Discoverer.shapeGraph and direct argmax from identical averaged scores agreed 649/650 times. The one divergence is explicitly recorded, so the original shape cannot be credited as an independent semantic inference mechanism for this short 2-step extractive task.

Original Brain save/load preserved 53,392 averaged feature weights, checkpoint 3,592,149 bytes, exact frozen original path. No source substring fabrication; all answers came from original supplied human text.

## Scientific implications and limits

V36 without averaging degraded on the same 600 frozen DEV questions as training volume increased from 600 to 9000, from 79/600 to 57/600 correct; V39 demonstrates that weight trajectory averaging addresses part of this regression on a separate, stable protocol.
V37 post-frozen atlas of 450 genuine human questions found 329 with correct canonical answer available in graph but ranked below wrong answer, and 56 lacking correct candidate. That prioritizes learned question-conditioned goal selection over adding raw dimensions.
V39 remains 497/650 wrong exact answers and does not address unrestricted OpenThoughts3 long-form free answer evaluation, previously 0/24.
Human question extraction and answer-span preference are supervised, not physically verified semantic state/action successor laws. The original shape routes to chosen source terminals, while direct ranker often selects the same terminal.
No GPU RTX 3050 Ti acceptance, no Windows UI/continuous-training integration, no proof of universal hyperdimensional language navigation.

Repro:
    node --test v17/tests/v39-9000-human-qa-averaged.test.mjs
    node --test v17/tests/v38-real-averaged-evidence-validation.test.mjs
    node --test v17/tests/native-hypermaze-shape-parity.test.mjs

Next strict gate: learn and verify independently executable semantic transitions across genuinely unseen long documents; infer answer goal from question without gold or oracle pathways; compare original shape against direct scoring baselines; retain and report every first-answer error.
