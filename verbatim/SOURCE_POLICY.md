# MagicPerspective — Verbatim implementation contract

**Source of truth:** the entire original conversation from its first to its last word. No assistant-authored paraphrase, selected feature list, or simplified "motor" can replace that source.

## Literal requirements
- Preserve every original user and assistant message in order, including corrections, questions, examples, images, audio and explicit limitations. Never silently omit text.
- Keep later user corrections and earlier original wording together. Establish explicit precedence where instructions differ; do not overwrite the historical source.
- Index **every message**; then separately index **every atomic requirement** using the original exact text span. Message-level indexing alone does not prove coverage.
- Every requirement needs a code location, acceptance test, observed result, and regression check. Unimplemented, uncertain, contradictory, inaccessible, or unverifiable items must remain visibly open, never be called implemented.
- Existing implementation tests do NOT prove source compliance. Do not mark a project complete until all exact-text requirements are proven satisfied.
- Preserve working versions, data, checkpoints and intended environments (Termux, GPU/CUDA, cross-domain worlds) while changes are audited.
- No one may flip completeness flags merely to greenlight a release. A true complete native transcript/export, explicit clause-level reconciliation and independent test evidence are prerequisites.

## Current facts, not completion claims

`CONVERSATIE_COMPLETA_DIN_CONTEXT.md` currently indexes 56 original context messages, 29 USER and 27 ASSISTANT. It stops at a request to complete the remaining conversation. `VERIFICARE_TRANSCRIPT.md` explicitly admits truncated earlier text and incomplete UI artifacts. Therefore this is NOT the complete Verbatim source. `CANON.md` is a historical V1-only contract, NOT the complete motor specification. `verbatim/recent-user-messages.json` contains only a recoverable, incomplete subset of recent visible user messages.

This release gate is deliberately **BLOCKED** until the missing original transcript and every atomic requirement are recoverable and verified. No historical program is deleted.

## Commands

```bash
node scripts/verbatim-gate.mjs --report
node scripts/verbatim-gate.mjs --gate
node --test tests/verbatim-gate.test.mjs
```

`--report` is diagnostic; `--gate` must return nonzero until all conditions truly pass.

## Binding main-branch mirror — 2026-11-03

The original chronological conversation, **not this written policy or any assistant summary**, is the authoritative specification for MagicPerspective. `VERBATIM_ROOT.md` is the main-branch entry point. Preserve every original word, every user correction, every ASSISTANT reply, and original media. Keep gaps visibly missing.

For each new version or change, publish a source-to-implementation mirror in `verbatim/implementation-mirror.json`: source message ID and **literal** span, affected code paths, acceptance tests, actual measured evidence, regression guard, compliance status. Versions without all required verified source clauses are **NOT_VERIFIED**; do not infer implementation from file names, UI labels, benchmarks, or conceptual descriptions. Earlier versions and checkpoint directories must not be destroyed.

Run `node scripts/verbatim-mirror-gate.mjs` for chronological source integrity; it must return `gate: BLOCKED` while the full historical conversation and assistant/media originals are missing. Run `node scripts/verbatim-mirror-gate.mjs --gate` for a deliberately failing full-coverage release gate, in addition to the existing historic `node scripts/verbatim-gate.mjs --gate`. Never turn either gate green by editing flags without genuine recovered source and independent implementation evidence.

The newly archived later USER messages are **not** proof that all ASSISTANT replies were recovered. `verbatim/continuation-index.json` declares these gaps and the unarchived input image explicitly.

## Binding USER correction — 2026-11-06: NO unauthorized definitions or mechanisms

[Original exact USER correction](./2026-11-06-USER-REGRESSION-NO-REDEFINITION.md) is an additive literal source (not a complete conversation export). [MP-REG-2026-11-06-001](../REGRESSION_USER_DIRECTIVE_2026-11-06.md) and [public Issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25) are **OPEN/BLOCKING**. Every agent must read [AGENTS.md](../AGENTS.md) and preserve the original maze solution-shape mechanism when implementing the language world. A substitute 32D latent/encoder/token predictor or auxiliary learner is not compliance without direct user authorization and an equivalence demonstration. Do not rewrite the user's definitions as an engineering preference. The existing incomplete-Verbatim release gates remain BLOCKED, irrespective of new CI results. New code PRs to main require a literal source-to-change contract and the user-intent-guard workflow; human review and branch protection remain mandatory.
