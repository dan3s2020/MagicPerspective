# AGENTS.md — binding instructions for ALL automation, coding assistants and contributors

**READ FIRST.** Repository: `dan3s2020/MagicPerspective`. This document is binding in this project and applies in the repository root and every nested directory, including V17 experiments and isolated agents.

## STOP: open BLOCKING regression

> [!CAUTION]
> **NEW OPEN V22 REGRESSION (2026-11-07):** [User's exact no-omission and same-original-maze-to-language directive](./REGRESSION_USER_DIRECTIVE_2026-11-07-V22-NO-SUBSTITUTION.md) is binding alongside issue #25. Keep all original V17/V19/V20/V21 bytes and features; use the actual `Discoverer.shape()` in learned text navigation, show actual pre-action answer and noise, and do NOT claim 100% unseen OpenThoughts accuracy before independent tests. Experimental branch [V22](https://github.com/dan3s2020/MagicPerspective/tree/experiment/V22-EXACT-DISCOVERER-TEXT-LABYRINTH-20261107) remains isolated and BLOCKED for completion.

[MP-REG-2026-11-06-001 — unauthorized redefinition of maze-to-language learning](./REGRESSION_USER_DIRECTIVE_2026-11-06.md)  
[Public issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25)  
[Exact user's corrective words](./verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md)

The user requires the **same original organism's solution-shape prediction and perspective transformation** in a new navigable language world. An agent **MUST NOT** substitute latent-32D models, encoders, decoders, token prediction, beam search, auxiliary geometric SGD or another conventional ML approach in place of the original maze mechanism and call that compliance. Such components are unrelated or auxiliary experiments unless the user **explicitly** requests them.

## Priority and immutable definitions

1. The user's **verbatim request, corrections, examples, terminology and specified implementation** define the goal. Preserve words literally. Do not silently translate a user-defined term into your own scientific/engineering definition.
2. Never change the requested architecture, research question, world topology, output format, acceptance criteria, dimensionality or baseline because an alternative seems easier or more established.
3. Reuse the **actual working implementation** and inspect linked source code line-by-line before editing. For the V17 language-world work, locate and preserve the original `Discoverer.shape()` and corresponding maze perception, action, physics and learning interfaces. A different predictor is NOT an implementation of the same mechanism.
4. If original source, Verbatim context or a dependent file is missing, report `BLOCKED / UNVERIFIED`, identify the missing source, and do not fill the gap with an invented method.
5. Extra mechanisms may exist **only** under a separately traceable, expressly user-authorized request, isolated by branch/path and off by default. Never overwrite or supplant the baseline.
6. Do not remove, rewrite or disable working user controls, live backend/graphs, training, replay, CUDA paths, source corpora, metrics, backups or checkpoints. Do not modify another agent's branch or a user working tree without explicit authorization.
7. Present real measured results honestly: a model that predicts next characters is NOT a demonstrated linguistic solution-shape navigator; an auxiliary latent is NOT proof of dimensional cognition; successful tests do NOT certify full Verbatim fulfillment.
8. Do not declare the blocking regression resolved without an actual matched-mechanism held-out comparison and **explicit user approval**.

## Mandatory change procedure

**Before implementing**, create a source-to-change contract under `user-intent/changes/` (example in `user-intent/CHANGE_CONTRACT_TEMPLATE.json`) with:
- exact quote from an authentic user source, source path and explicit priority;
- paths of the ORIGINAL baseline and affected code, changed files, and a stated minimum scope;
- affirmation that definitions and the requested algorithm are preserved;
- any proposed extra mechanism with **literal** user authorization (not agent inference);
- executable test files, observed results and **OPEN** limitations.

In PRs targeting `main`, automated [user-intent-guard.yml](./.github/workflows/user-intent-guard.yml) rejects coding changes without a matching contract. A machine can check structure and simple prohibited additions, not scientific fidelity, so a human must verify the exact user permission and evidence before merging.

## Canonical source and release status

1. [VERBATIM_ROOT.md](./VERBATIM_ROOT.md)
2. [verbatim/SOURCE_POLICY.md](./verbatim/SOURCE_POLICY.md)
3. [Exact 2026-11-06 corrective request](./verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md)
4. [Blocking regression with evidence and criteria](./REGRESSION_USER_DIRECTIVE_2026-11-06.md)
5. [Public issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25)

Full historic Verbatim remains **BLOCKED / incomplete**. Neither this file nor a CI success changes that fact.

## Scope

This is a contributor instruction, not a claim of power over independently configured bots or contributors. To prevent noncompliant GitHub merges, make the `user-intent-guard` status a **required** check in main branch rules, require human review, and restrict direct pushes/admin bypass. Never silently claim those repository settings were enabled if they have not been verified.

## Additional critical 2026-11-07 learning regressions (still BLOCKED)

**MANDATORY for every coding assistant:** [Permanent TinyStories/long-text/Unicode regression incident](./docs/INCIDENT_TINYSTORIES_UNAUTHORIZED_MOTOR_REPLACEMENT_20261107.md), [2026-11-07 exact user directive](./verbatim/2026-11-07-TINYSTORIES-CRITICAL-REGRESSION-USER-VERBATIM.txt), [isolated original-motor research PR #58](https://github.com/dan3s2020/MagicPerspective/pull/58).

Do NOT count 100% correctness on explicitly goal-constrained synthetic text templates as open-ended semantic correctness. Do NOT count 5D display coordinates as causal 5D inference. Do NOT call controlled CPU-only long-text throughput full CUDA training. **Do not discard old observed transitions:** the original token index used to forget any rare axis absent from its last 96 word-associated observations. **Do not discard Unicode:** the original worker's ASCII conversion replaced non-ASCII code points with `?`. All three regressions need actual end-to-end native worker tests, frozen heldout proof, and explicit human-approved release evidence. Main executable code remains preserved until separately accepted.
