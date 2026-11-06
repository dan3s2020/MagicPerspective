# BLOCKING REGRESSION — MP-REG-2026-11-06-001

> **DO NOT REPLACE THE USER'S MAZE-TO-LANGUAGE TRANSFORMATION REQUIREMENT WITH AN ASSISTANT-INVENTED ALGORITHM.**  
> **State: OPEN / BLOCKING.** A passing test suite, CUDA benchmark, or an attractive graph DOES NOT close this issue.

Public tracking: [GitHub issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25).  
Canonical exact user words: [2026-11-06 USER source](./verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md).  
Chronological authority: [VERBATIM_ROOT.md](./VERBATIM_ROOT.md) and [SOURCE_POLICY.md](./verbatim/SOURCE_POLICY.md).

## What the user actually asked for

The existing original maze organism can perceive the 2D world, learn traversability and the effects of moving, propagate the goal's influence to find the **shape of a solution before acting**, then translate the global path into a local body action sequence. For language, the user asked to supply a world with the **corresponding traversable paths and transformations** and reuse **the same mechanism of anticipating the solution shape**, not to replace it with next-character prediction or a conventional language model. Reproducing the global-to-local perspective transformation is part of the requested mechanism.

This paragraph is an **implementation interpretation**, NOT verbatim. Where interpretation conflicts with a literal user correction, the original user correction wins.

## Observed regression

**Regression:** assistant-introduced additional machinery was substituted for or advertised as implementation of the user's central requirement, without explicit permission or an equivalence proof.

Observed in the experimental V17/NoiseSpace work (paths belong to their respective branches and **are not all present on `main`**):
- `isolated/noise-space/learning_geometry.mjs`: auxiliary learned 5D→8D→5D prediction did not control original maze `Discoverer.shape()` policy or create navigable linguistic topology.
- `v17/transcend/torus-aether/gpu/shared_perspective.py`: learned 32D shared next-state model; **does not** itself provide the original maze goal-propagation path-finding algorithm for language.
- `isolated/noise-space/text_action_paths.mjs`: statistical text navigation; **does not** thereby prove that language was solved through the maze algorithm.
- `isolated/noise-space/causal_text_world.mjs`: a world of text-edit actions, not a verified full causal language solution-path topology.
- `v17/transcend/torus-aether/worlds/exercise.mjs`: original V17 `Discoverer.shape()` reference, available on relevant V17 branches. **Do not alter or silently replace** it.

These components may be independently useful experiments. **Their existence must never be used as a claim that the user-requested same maze mechanism has been implemented in language.**

## Mandatory rule for every agent and contributor

1. **USER FIRST / NO REDEFINITION:** Do not impose an assistant's scientific definitions, topology, task, evaluation proxy, preferred model, architecture, or dimension counts on the user's requirements. Preserve literal wording, constraints, examples, corrections and terminology.
2. **NO UNAUTHORIZED SUBSTITUTION:** Where the user says **the same mechanism**, reuse and verify the original implementation. Do not substitute a 32D latent head, generic encoder, next-token model, SGD predictor, beam search, or different planner in its place.
3. **NO UNAUTHORIZED ADDITIONS:** A new feature outside the literal request cannot be smuggled in as a prerequisite. Optional alternatives require a separate explicitly authorized request. Keep them isolated and disabled by default; preserve the exact requested path.
4. **KEEP WORKING CODE:** Do not overwrite other agents' branches, source, working UI controls, real graphs, training, GPU setup, text corpora, checkpoints or working versions. Use isolated branches and paths until the user explicitly authorizes integration.
5. **NO FAKE COMPLETION:** Mark as `NOT_IMPLEMENTED`, `PARTIAL`, `UNVERIFIED` or `BLOCKED` if the exact mechanism has not been built and experimentally verified. Never equate passing CI with compliance.
6. **REQUIRE VERBATIM TRACEABILITY:** Before implementing, link an exact user quote, affected existing source, the proposed minimum changes, a regression test and its actual result. Missing native history remains visibly incomplete.
7. **UNAUTHORIZED LANGUAGE SUBSTITUTIONS ARE BLOCKING REGRESSIONS:** Do not close this regression or declare success until a frozen test demonstrates actual *pre-action solution-shape propagation through a learned language-world topology* using the same maze algorithm, with no answer oracle leak, against proper original-maze and independent baselines. A positive benchmark without matching mechanism is insufficient.

### Narrowly scoped authorized exceptions

An **additional** 32D latent or other learned component may coexist **only if** a later genuine user message **explicitly authorizes that component**. It still may not silently replace `Discoverer.shape()` when the user requires the original mechanism. Authorization to experiment is not authorization to redefine the objective. Preserve exact source quote and isolated opt-in path.

## Required acceptance before merging or closing

- [ ] Exact requirement quoted and linked to a real user source (or clearly `MISSING`).
- [ ] Original maze method and its action/physics interface inspected; no invented code paths or renamed interfaces.
- [ ] Language-world equivalent exposes real states, transitions, valid/blocked paths, goal and feedback from observations; not merely token sequences.
- [ ] **Original** algorithm propagates a solution shape through that learned topology **before** the first action.
- [ ] Same behavior re-tested in the original 2D maze, with a frozen baseline, no hidden target leakage and per-step perspectives.
- [ ] Independent held-out language problems and negative controls confirm performance **and** mechanism.
- [ ] Working training, graph UI, controls, data, CUDA and checkpoints verified unchanged outside an isolated branch.
- [ ] User reviews any proposed interpretation/extension before it becomes a new binding requirement.
- [ ] Regression #25 closed only upon explicit user approval and recorded evidence.

## Enforcement and limitations

Read [AGENTS.md](./AGENTS.md) **before any coding**. Every code PR must carry an explicit source-to-change contract and passes the [user-intent contract CI gate](./.github/workflows/user-intent-guard.yml) where applicable. The gate checks documented source quotes and declared scope; it cannot prove scientific semantics or authenticate a forged quote on its own. Human review and GitHub branch protection are still necessary to make checks unavoidable for every actor, including administrators and direct pushes.

This is a **regression record**, not a claim that the current language implementation has been fixed. Full original Verbatim remains incomplete and the existing release gate stays **BLOCKED**.
