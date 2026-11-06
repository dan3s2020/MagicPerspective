# MagicPerspective PR — exact user intent / no unauthorized substitutions

> [!CAUTION]
> **OPEN / BLOCKING:** [Regression MP-REG-2026-11-06-001](../REGRESSION_USER_DIRECTIVE_2026-11-06.md) / [Issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25).
> Do not replace the original maze organism's solution-shape method with an agent-chosen latent predictor, token prediction, auxiliary learner, or an invented definition.

## Literal USER request (not an agent paraphrase)

**Source file:** `verbatim/...`  
**Exact original quote:** `...`

## Preserved baseline

Original source file and function: `...`  
What is kept byte-for-byte / behaviorally equivalent: `...`

## Minimal requested change

Code files changed and why: `...`

## Additional mechanisms

- [ ] **None** — direct implementation of the user's existing mechanism.
- [ ] User separately authorized an optional addition (quote exact user statement below, preserve original unchanged).

Exact additional approval, if any: `...`

## Behavioral acceptance

- [ ] The exact original solution-shape algorithm is still executed.
- [ ] Pre-action form of solution is measured, not substituted with next-character prediction.
- [ ] Same held-out maze and language-world task/state/action comparison with no teacher leakage.
- [ ] All working graph, UI, training, CUDA, data and checkpoints remain intact.
- [ ] Code tests and measured real results provided; unresolved limitations marked OPEN.
- [ ] Source-to-change manifest added under `user-intent/changes/<unique>.json`.
- [ ] User's definitions were **not** changed.
- [ ] Full Verbatim release gate remains BLOCKED.

**Never check a box falsely.** CI cannot authenticate human approval or demonstrate algorithmic equivalence by itself.
