# GitHub Copilot — MagicPerspective binding project instructions

Read [AGENTS.md](../AGENTS.md), [VERBATIM_ROOT.md](../VERBATIM_ROOT.md), [user's exact correction](../verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md) and [BLOCKING regression #25](https://github.com/dan3s2020/MagicPerspective/issues/25) before implementing any task.

**User's exact requirements and definitions override agent-invented scientific/engineering interpretations. NO architecture substitution.** Do not replace the existing 2D maze's `Discoverer.shape()` solution-shape propagation mechanism with a 32D latent encoder, embedding, next-character predictor, SGD sidecar, beam search or any other mechanism when adapting the world to language. Preserve existing baseline, adapt the navigable WORLD, and test the same solution-shape mechanism before action.

Do not rewrite others' branches or working UI, graph, GPU, training, data or checkpoints. New optional approaches require distinct literal user authorization and separate opt-in branch/path. Do not claim that CI passing proves whole conversation compliance; Verbatim is incomplete and regression MP-REG-2026-11-06-001 is OPEN/BLOCKING.

All code PRs to `main` need a matching source-to-code JSON change contract under `user-intent/changes/` with actual user quote, baseline, affected paths and acceptance tests. See [template](../user-intent/CHANGE_CONTRACT_TEMPLATE.json) and [gate](../scripts/user-intent-gate.mjs).
