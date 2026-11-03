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
