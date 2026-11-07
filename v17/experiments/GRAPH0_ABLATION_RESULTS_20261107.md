# Graph #0 causal self-path ablation — verified results, 2026-11-07

## Exact tested branch
experiment/V17-GRAPH0-SELF-PATH-ABLATION-20261107
Forked from feature/V17-REAL-DATASET-PROGRESS-FULL-INSTALL-20261107.

Original native files NOT modified:
- v17/START_MAGIC_REAL.ps1
- v17/START_V17.ps1
- v17/transcend/torus-aether/devour/brain.mjs
- v17/transcend/torus-aether/align.mjs
- v17/transcend/torus-aether/ui/app.js

## Completed CI verification

1. Native AligningGraph ablation-source filter tests: 3/3 passed.
2. Native Brain.save/Brain.load end-to-end with synthetic corpus: 1/1 passed.
3. Windows Server runner invoking the exact PowerShell 5.1 launcher with a copied synthetic V17 checkpoint: passed.
4. Windows checkpoint source SHA256 equals copy SHA256; all three arms ran; comparison-T06.csv contains 12 expected rows.

Successful combined CI run:
https://github.com/dan3s2020/MagicPerspective/actions/runs/42337458040

## Actual synthetic data outcome

The tiny fixture produced 0 repeated-eight-gram fraction for each arm; this is a validation of the pipeline, **NOT** evidence that filtering self/fself reduces looping in graph #0. The measured original OpenThoughts3 checkpoint has not been accessed by CI.

## Exact local production-checkpoint experiment

A single read-only Windows command runs v17/experiments/RUN_GRAPH0_ABLATION.ps1 against a COPY of D:\MagicPerspective-Full-Training\brains\brain-0-stable+many.v8. The original checkpoint, training thread, output directory, and original repository are never modified.

Do not merge the experiment into main before real checkpoint evaluation and inspection of comparison-T06.csv. A repeated context is a 12-character suffix collision; a single next-symbol candidate is NOT a contradiction or an empty successor set.

## Falsifiability

Compare all 12 rows in comparison-T06.csv with the same T, question, seed, checkpoint SHA256.

- If both filters lower repetition while preserving useful answers, within-generation self/fself contribute to trapping.
- If only removing both changes behavior, fself contributes.
- If neither changes looping, inspect memorized corpus distributions, suffix-index behavior, and special-case fallbacks.
- If answer relevance degrades, loop reduction alone is not a successful fix.
- No outcome establishes intentional self-report or consciousness from the quoted E[v]/S_v text.
