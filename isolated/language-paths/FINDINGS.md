# MagicPerspective: language as a navigable causal state space

Isolated research record · 2026-11-06 · source branch `experiment/LANGUAGE-ACTION-HIGHWAYS-ISOLATED-20261106`

## Question

Can an agent discover what it can do **by acting**, then reach unseen linguistic/symbolic goals through a measured field of possible future states—without being given goal trajectories or a mapping from utterances to action effects?

## Prior research

- TextWorld (Côté et al., 2018): text is an interactive environment with state tracking and rewards. https://arxiv.org/abs/1806.11532
- ALFWorld (Shridhar et al., 2020): text-level actions can transfer to embodied tasks under shared dynamics/affordances. https://arxiv.org/abs/2010.03768
- PARL (Liu et al., ICLR 2024): learning abstract state/action concepts and transition feasibility from language. https://proceedings.iclr.cc/paper_files/paper/2024/hash/0f93c3e9b557980d93016671acd94bd2-Abstract-Conference.html
- Dyna / replay: learn an environment model from experience, then plan through simulated transitions. https://pmc.ncbi.nlm.nih.gov/articles/PMC9004662/
- Latent Goal Prediction from Language for Model-Based Planning (2026): language-conditioned subgoals in a predictive latent model, compared empirically to flatter planners. https://arxiv.org/abs/2606.20627

These motivate experiments; they do **not** validate arbitrary high-dimensional language paths in MagicPerspective.

## Controlled worlds and agent knowledge

**World A — symbolic utterances.** The environment holds seven distinct word tokens and six arbitrary utterances. Each utterance has a fixed hidden permutation effect; its label-to-effect mapping changes with seed. The agent can reset, say an utterance, and observe before/after. It does not read the hidden mapping or see correct goal paths. It *does* have a restricted nine-hypothesis structural permutation library. From 48 interventions per world (4 rounds × 2 training lengths × 6 utterances), it infers effects, extrapolates to seven-token sequences and fresh vocabulary, computes a reverse value field, and walks descending edges.

**World B — linked propositions.** Six observable facts (lantern, gate, bridge, message, signal, route) form a small causal world. Seven arbitrary utterances secretly toggle a fact unconditionally or only when a prerequisite holds. The learner observes each action on the **32 even-parity input configurations** (224 probes per world). It induces minimal deterministic Boolean dependencies from observed state changes, then solves challenges starting from **unseen odd-parity combinations**, with goals reachable under the hidden world dynamics. The learner does not receive the causal map or solution path. It *does* receive the fixed proposition slots, binary value encoding and a generic maximum-three-input-feature induction bias.

In both worlds, a newly generated goal is only used to specify success, never to give an action sequence. The model predicts next states, constructs a goal-conditioned distance field, and executes actions against the independent world simulator. The oracle shortest-distance routine is only called *after planning* for the benchmark.

## Reproduced benchmark

Command: `node benchmark.mjs --tasks 35 --oracle 10` (Node.js 22; three seeds: 11, 29, 53). The same seeds and tasks are used for the baseline comparisons. Each baseline has an action budget of 24 steps.

| Criterion | Symbolic utterance world | Causal-proposition world |
|---|---:|---:|
| Training interactions | 144 (48 × 3 seeds) | 672 (224 × 3 seeds) |
| Held-out goal tasks | 105 | 105 |
| Learned-model planner success | 105/105 (100%) | 105/105 (100%) |
| Greedy selection success | 31/105 (29.5%) | 101/105 (96.2%) |
| Random utterance success | 2/105 (1.9%) | 35/105 (33.3%) |
| Verified optimal paths | 30/30 | 105/105 |
| Exact action-effect prediction on executed paths | 100% of tasks | 100% of tasks |
| Distinct nodes in complete value field | 5,040 | 64 |

A benchmark at 105/105 within these tiny worlds is expected once the correct structural action effects are learned. This result is **not** evidence for natural-language fluency, open-ended reasoning, universal transfer, or an emergent 5D/12D geometry. Some semantic-world baselines are already strong (greedy 96.2%), so those results should not be overinterpreted.

## Replaying the real paths

Run `node server.mjs` from `isolated/language-paths`, open `http://127.0.0.1:8898`, select a challenge, and use `Next action`/`Play` or the replay slider. Each state records actual word or proposition values, the chosen utterance, the predicted successor, the observed successor, and the learned reverse-wave distance **V**. Other one-step alternatives can be shown/hidden. The 2D layout is intentionally a *view*, not a claim about the intrinsic dimension: horizontal position is the learned goal-distance field; vertical position is a fixed 12D feature sketch of token identities and positions (not learned).

## Falsifiability and negatives

- Changing the hidden mapping on test without retraining creates observable model mismatches; the negative control test detects this.
- Novel action physics outside the simple hypothesis family will generally not be learned by World A.
- If text observations have hidden state, variable referents, conditional meaning or unrestricted vocabulary, this small model is inadequate.
- A genuine test of a *learned* higher-dimensional geometry must compare a trainable latent encoder and dynamics model against the exact symbolic state baseline on data never used to select the geometry.
- Neither of these worlds is hooked into the original V17 brain or demonstrates transfer from V17 to text. Only isolated files were added.

## Next experiments required to test the full hypothesis

1. Let the agent invent/combine action abstractions rather than classify actions from a fixed catalog.
2. Use language utterances whose consequences depend on uncertain shared conversational or external-world state.
3. Make a differentiable or contrastively learned latent state embedding with action-conditioned dynamics, optimize it on held-out prediction error, and *verify* its geometry.
4. Add V17 adapters that allow the same agent to act in actual maze, transformation, and text environments; compare cross-world transfer to equal-compute separate learners.
5. Track path optimality, novelty, factual consistency, state uncertainty, cost, and failures in the shared UI. Never conflate a graph drawing with verified internal structure.
