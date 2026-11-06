# MAGIC PERSPECTIVE — Verbatim is the binding source, not an optional specification

**Canonical branch: `main`.** The chronological original conversation — every USER and ASSISTANT message, correction, attachment, limitation, and later requirement — is the authoritative source for the desired motor. A developer's summary, README, generated plan, design metaphor, and implementation are subordinate to that source. Do not replace original text by an interpretation.

## Read in this order
1. `verbatim/SOURCE_POLICY.md` — preservation contract, known missing material, release restrictions.
2. `CONVERSATIE_COMPLETA_DIN_CONTEXT.md` — 56 historically indexed messages (archive **not byte-exact certified**).
3. `verbatim/recent-user-messages.json` — recoverable later USER messages ordered as visible in this chat, each exact text preserved; does **not** contain all assistant turns.
4. `verbatim/continuation-index.json` — chronology and transparent gaps for the later segment.
5. `verbatim/implementation-mirror.json` — every proposed architecture requirement and every version must map to a source message, precise code paths, acceptance tests, measured evidence, and status.
6. `scripts/verbatim-gate.mjs` and `scripts/verbatim-mirror-gate.mjs` — verify archival integrity and stop unsupported completeness claims.

## Binding rules
- Do not omit a message, its exact spelling, examples, or revisions. Preserve chronology; never silently overwrite an earlier message with a later interpretation.
- If an original message or image/audio payload is not available, declare **MISSING / UNVERIFIED**, do not invent it, and keep the full release gate **BLOCKED**.
- A new version must point to precise **original** source spans before implementation. Every requirement must carry: source ID and exact quote, code location, test command, observed result, regression check, state.
- Distinguish **ARCHIVED**, **IMPLEMENTED**, **TESTED**, **PROVEN**, and **BLOCKED**. These are not synonyms.
- Prior working versions, model files, checkpoints, and intended run environments must survive every update. Historical `CANON.md` is the **V1** contract, not a replacement for the full Verbatim.
- The user's metaphors (e.g., Portal, Temple, As Above So Below, fourth-dimensional fabric) are preserved literally. Any technical interpretation must be documented separately and must not be substituted for original wording.
- A visually similar graph is not proof of learned structure, causal action, cross-domain transfer, dimensional physics, or 14 million unique exercises. Require actual metrics, provenance, and independent tests.

## What is actually verified today
The original 56-message historical segment is indexed, but not certified complete. The later recoverable USER sequence is being archived; assistant turns and some original media remain missing. The full Verbatim `--gate` **must fail** until an actual complete source export and atomic requirement-by-requirement validation are available.

**This document sets the audit procedure. It does NOT claim that every requirement is already implemented.**

## 2026-11-06: USER-only exact maze→language world / recursive character submaze continuation

[Exact visible USER messages about the global-local 2D maze mechanism, no-substitution regression, hierarchical hyperdimensional character mazes and implementation request](./verbatim/2026-11-06-MAZE-LANGUAGE-MYSTIC-PERSPECTIVE-USER-TURNS-VERBATIM-PARTIAL.md) are preserved **literally** as a partial USER-only ordered sequence. This is not the full native conversation; intermediate assistant/tool turns and source media are not present. The full Verbatim completion release gate remains **BLOCKED**. For implementation scope and limitations, see [blocking regression #25](https://github.com/dan3s2020/MagicPerspective/issues/25) and the independent V18 experimental branch, not an implied approval to add substitute architectures.
