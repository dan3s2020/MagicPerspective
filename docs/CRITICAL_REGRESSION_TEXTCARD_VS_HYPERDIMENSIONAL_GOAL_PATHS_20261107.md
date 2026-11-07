# CRITICAL REGRESSION — the project objective was replaced with next-character prediction

Date: 2026-11-07. Status: **UNRESOLVED IN PRODUCTION V17**. This notice is deliberately on `main` and must not be removed merely because a predictor, CI, visual display or CUDA self-test passes.

## Requirement that must not be substituted

MagicPerspective must use its ONE native organism to absorb a real problem/world, construct its learned contextual / hyperdimensional state and local axes, **predict the shape of an entire solution BEFORE taking the first answer-producing action**, navigate meaningful learned transformations toward the goal, execute those steps, compare physical/semantic outcomes against the anticipated path, and learn from the deviation. Show actual predicted paths, state/axes/edges, actual execution, errors, heldout results, and throughput live in the existing V17 UI without deleting any of its controls. Training must be real, persistent, unbounded by demo scenarios, include actual text/math datasets, and use GPU where demonstrated. The user never authorized replacing this with a character-prediction objective or a demo UI.

## What regressed

1. `v17/transcend/torus-aether/gpu/text_gpu.py` and `AligningGraph` predict the **next character at each teacher-forced position**, with actual preceding answer characters already supplied during a batch. Large GPU parallel batches are **not** a complete answer predicted before emitting the first character. This is not a goal-conditioned hyperdimensional route.
2. `START_NATIVE_V17_TRAINING_LIVE.ps1` invokes the existing original `Brain` and `TextCard` path; green CUDA self-tests and real corpus processing do not establish that a solution-shape motor was integrated.
3. The `feature/V17-REAL-CUDA-TEXT-CHAR-STREAM-20261107` branch's character viewer merely makes this inappropriate primary objective more observable. It correctly displays authentic predictions; it does **not** solve the requested learning architecture.
4. Local-frame, semantic-action, active-intervention and unknown-goal research passed tests in separate **structured synthetic worlds** (PRs #27–#34, #49 and others). Those results were incorrectly described as progress toward a fully integrated organism without a decisive native causal integration and heldout semantic validation.
5. The 780,000-exercise OpenThoughts run seen at 43,935 characters / one exercise with a stale worker is NOT a successful 100+-exercises/sec training solution; GPU utilization claims based on maze VRAM usage were unjustified.
6. Repeated PowerShell instructions assumed existing directories, reused occupied ports, and relied on shell variables defined in earlier sessions; users encountered missing paths, script guards and duplicated checks. Neither "install" nor "starts" may be claimed without a tested clean-state launcher.

## Immediate integrity and acceptance rules

- `next-character accuracy` is a diagnostic only. **It must never be the primary success metric** for a text-as-hyperdimensional-maze claim.
- A candidate must reveal its goal-conditioned, multi-step solution shape **before** the first output step; compare that planned path to every executed action. No reading the ground-truth heldout answer during planning.
- Native Brain training and generation **must causally depend** on the learned state/axes/edge action model. Causal ablation of those learned axes/transformations must harm heldout **goal success** over an unchanged baseline; otherwise the component is decorative.
- All preserved original V17 features must continue working: maze/text/transform worlds, saved checkpoints, GPU backend, existing buttons and live UI, unmodified corpus and file paths.
- Distinguish "tested in a separate toy", "native code integrated", "verified local runtime", and "verified real heldout". Publishing a command requires evidence of the exact launch path, tests, and clear caveats.
- No branch is to be merged into `main` automatically and no live checkpoint may be overwritten by speculative code. Keep full audit trail and failing tests.
- The old `TextCard` may remain as a perception or statistical baseline **only**; it must not stand in for the goal-directed solution-shape architecture.
- A failed experiment must be retained with exact reason and tests; do not declare "100% solved" based on known-rule mazes or constrained synthetic world routes.

## Known status

Original V17: **REGRESSED objective / genuine next-byte training only**.
Research PRs #27–34: **PARTIAL structured proofs**, not a production semantic motor.
PR #49: **REAL character visualization, not the requested motor**.
Full production text-as-hyperdimensional-maze: **NOT YET PROVEN**.

This document records the regression independently of implementation branches and is a permanent warning until verified source-level and real-task integration replaces the regressed objective.