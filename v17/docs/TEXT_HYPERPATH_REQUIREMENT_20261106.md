# V17 — Text is a navigable transformation world, not a character stream

## User's decisive experimentally grounded observation (verbatim)
"AM DEMONSTRAT CA ORGANISMUL POATE ANTICIPA FORMA SOLUTIEI DACA LUMEA PE CARE O ABSOARBE CONTINE CAILE CATRE FORMA SOLUTIEI !"

## Do not repeat the previous conceptual error
The original maze engine exposes a real graph of states, passability, learned output effects, goal attractors and paths. The organism can build an initial candidate route before taking the first action.

**This is the mechanism to transfer into text.** A flat next-character accuracy metric or higher memory length is not an implementation of navigable text. The high-dimensional text world must have real discoverable states, causal transformations, reachable alternatives, and a goal estimated from the question before any held-out answer is read. Success requires the organism using a learned path to decide its actual next action, not merely drawing paths over text or reporting latent vector similarity.

In the original V17 Eval tab the 'shape' text score was from `AligningGraph.write(question)` alone, whereas the separately trained `TextActionPaths` and `CausalTextAgent` state/action models were stored in a `.causal.json` sidecar and never loaded by `eval-worker.mjs`. Consequently the 0%-character shape was not a measurement of the text-world path learner. Likewise plain `.txt` input did not populate `row.prompt`/`row.answer`, so `absorbText(row)` silently skipped the action-world training entirely.

## Actual isolated correction
- `worker.mjs` parses observed Q/A records or authentic consecutive text spans in plain TXT training, in addition to OpenThoughts Parquet. Held-out paragraphs remain excluded. This yields real state-transition observations; no invented target text.
- `eval-worker.mjs` loads the saved actual `.causal.json` sidecar when available.
- `text-hyperpaths-eval.mjs` asks the learned text-world models for complete routes **using only the unseen question**. Only after their prediction exists does it compare against the held-out answer. Frozen learning counters are checked. Models remain saved unchanged.
- The original Evaluare tab separately displays next-character alignment, question-to-solution text-state route, observed transition counts, action-based text edits, the 32D currently learned hashed goal-field and separate word-F1/character-position accuracy metrics. It does NOT present 84% alignment as pre-answer accuracy or pretend a missing route is 0% accuracy.
- CI runs the actual original evaluator and the complete original training binary on real TXT paragraphs (not a fake UI), plus prior organism regression and Windows parser checks.

## Still required before calling the user-requested mechanism complete
1. Replace bounded purely lexical word append/edit paths with a **learned relational and compositional state space**. A 32D hashed bag-of-words projection is a measurable representation but is NOT sufficient evidence that relational meaning, reasoning or an actual high-dimensional solution geometry has emerged.
2. Learn transformations from experienced text-world changes, not pre-program answer-specific templates: substitution, composition, conditional implication, reference resolution, reversal, abstraction, domain-specific operations and multi-step paths; discover equivalences where evidence allows.
3. Explicitly train an encoder and a goal-conditioned learned world model over those states. Search/expand in the internal geometry before outputting an answer; decode and execute the chosen transformation sequence; compare predicted vs actual outcomes. Allow the organism's own noise agency to choose where to branch.
4. Reuse the SAME learned path-selection mechanism across labyrinth and text; test whether it transfers, versus task-only and shuffled-action baselines and multiple seeds.
5. Run honest frozen, episode-disjoint OpenThoughts unseen Q/A tests for path validity, pre-answer correctness and evidence of causal planning. Retain exact held-out protection. 86% teacher-forced alignment and 0% string-exact pre-answer accuracy are not equivalent measurements.
6. Demonstrate actual CUDA on the user's RTX 3050 Ti and ongoing live original UI; do not claim 100% GPU unless profiling shows it. Do not overwrite other agents' branches, old checkpoints or UI.

**Release status: NOT COMPLETE.** A green CI here proves the observation path is connected to the original training/eval. It does not prove the full learned hyperdimensional, goal-conditioned text-world mechanism the user required. Do not offer the branch as the requested final installation.
