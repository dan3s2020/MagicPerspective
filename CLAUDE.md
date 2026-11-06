# CLAUDE.md — MagicPerspective user-first contribution rules

This repository follows [AGENTS.md](./AGENTS.md), [VERBATIM_ROOT.md](./VERBATIM_ROOT.md), and the blocking [MP-REG-2026-11-06-001](./REGRESSION_USER_DIRECTIVE_2026-11-06.md) ([issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25)). Read them BEFORE changing code.

**NEVER impose assistant-selected definitions, architectural substitutes, latent models, dimension counts, encoders/decoders, token predictors or auxiliary SGD in place of the user's actual requested original maze-to-language mechanism.**

The user specifically requires preserving the original 2D maze organism's solution-shape anticipation (global path, goal propagation, learned action effects, global→local perspective) and adapting its WORLD to language. Reuse the actual original algorithm and provide a navigable language topology. Never claim character/word prediction is the same mechanism.

Preserve original V17 functionality, graph, UI controls, CUDA, checkpoints, other agents' branches and verified tests. Additional experiments require a distinct exact user authorization and must be isolated, opt-in, never replacements. Each PR changing code needs `user-intent/changes/<unique>.json` citing exact user source, original baseline, changed files and tests. See [template](./user-intent/CHANGE_CONTRACT_TEMPLATE.json). Never mark incomplete Verbatim complete. If historical source is missing, declare BLOCKED/UNVERIFIED.

Only close regression #25 with real matching-mechanism held-out results and explicit user approval. Read user's source [verbatim](./verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md); do NOT replace it with this summary.
