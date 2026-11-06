# MagicPerspective V17 — language transformations as paths (isolated research experiment)

This experiment leaves all preexisting V17 files unchanged. It adds a micro-world of textual states and reusable transformations inferred from before/after demonstrations.

## Why
In `worlds/exercise.mjs`, the maze organism discovers which symbol is itself, how its output moves it, which symbols repel movement, and which marks the end. It then uses a programmer-supplied value propagation rule to predict the full trajectory. This is an effective change of *representation*, but not yet invention of the propagation algorithm.

The existing `align.mjs` already learns from text and aligns multiple depths of context, including a simplified digit-pattern form. It does not yet expose editable text as an environment with a graph of learned rewrite actions.

## Experiment
- The whole sentence is a state.
- A paired demonstration is an observed transition. Five examples each teach two distinct transformations.
- The system detects invariant token positions and variable slots. It learns that some words should be copied into different positions and others remain fixed.
- Each induced transformation becomes an edge between language states.
- A generic path search composes transformations until a goal condition is satisfied.
- The benchmark uses **25 held-out combinations of words** that were absent from the demonstrations.
- An unrelated verb should produce no applicable transition.

Run from the `v17/` directory:

```bash
node --test tests/language-paths.test.mjs
node transcend/torus-aether/language-paths/benchmark.mjs
```

Local development results, before committing: **4/4 tests passed, 25/25 held-out word combinations transformed correctly**. These are narrow procedural checks, not a measure of general language intelligence. The branch files must be rerun after checkout to verify this commit.

## Limits
The environment still provides whitespace tokenization, grouping of demonstration pairs by transformation family, and generic search. The learner does **not** discover all syntax and semantics, infer causal truth from reading, solve arbitrary text, train a higher-dimensional manifold, or learn its own planning algorithm.

## Next research stage
Give the learner the complete token/phrase/clause structure of unseen text as a language retina and expose **editable actions** (insert, delete, swap, replace, move, bind) without pre-labeled grammatical meaning. From attempted edits and consequences, learn a transition model, attractor/value field, and multi-scale perspectives. Compare flat token prediction, context alignment, learned rewrites, value-field planning, and learned lifted geometry under equal training information. Evaluate unseen grammar, longer chains, entity substitution, paraphrases, contradictions, and transfer to causal world tasks. Record prediction-before-action, actual transitions, and failures in one persistent observable graph.
