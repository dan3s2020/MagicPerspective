# MagicPerspective — isolated language-as-action path experiment

## What this proves and what it does not

This is an **isolated research experiment**, not a replacement for MagicPerspective V17. It has two worlds: token permutations and causal propositions with conditionally effective speech actions.
The organism learns the effects of six initially unknown **utterance actions** by trying
those utterances in a controlled symbolic world. Each utterance transforms an ordered
sequence of words. The learner is not told which utterance maps to which transformation,
nor is it shown solution trajectories. It learns action effects from (before, utterance,
after) and constructs a reverse-wave value field from an unseen goal to its start.
Executing the resulting path is checked against the actual world, not the model.

The causal-proposition world is more demanding: it models six Boolean facts, with speech interventions that only work when prerequisites hold. An agnostic Boolean dependency learner is trained on even-parity states and tested on odd-parity state combinations. The symbol world **does** have an explicit inductive bias: a nine-rule family of basic
index-permutation operations, including rotations and transpositions. Learning selects
which rule an utterance instantiates. This is NOT discovery of arbitrary natural-language
semantics, an unsupervised invented action algebra, or a validated learned high-dimensional
geometry. The interactive SVG draws real predicted paths and alternative transitions,
with horizontal coordinate determined by learned distance-to-goal, and a vertical
coordinate determined by a **fixed 12D token sketch**. The sketch is not learned.

## Run (Node.js 20+, zero dependencies)

```
cd isolated/language-paths
node --test engine.test.mjs relational.test.mjs
node benchmark.mjs --tasks 35 --oracle 10
node server.mjs
```

Open **http://127.0.0.1:8898/**.

`run-result.json` contains full deterministic measurements and sampled paths. All
trained/test words are different, and training sequence lengths are 4 and 5, while
held-out test sequences have length 7. Three separately seeded worlds randomize
which utterance applies which hidden transformation.

## Trust boundary

- `SpeechWorld` owns the hidden action physics. The learner never reads the mapping.
- `explore()` only records observed (before, action, after) transitions.
- `DiscoveredEffects` identifies an action template via observed input/output pairs;
  it has no goal solutions or access to `SpeechWorld.#physics`.
- `valueField()` propagates reverse distances via the learned transition model.
- `plan()` follows the descending value field on held-out starts/goals.
- `execute()` runs planned utterances in the *actual* world and compares predictions.
- `oracleDistance()` is called only by the external benchmark to independently
  check path lengths. It is never passed into the planner.
- `randomBaseline()` and `greedyBaseline()` use the same 24-action cap.
- The negative control changes the hidden world mapping after learning and
  confirms the trained model's predictions no longer match.

## Why this experiment

Works on one essential missing component: a language-like state **that an organism can
act on**, rather than merely predict its next character. Related research: TextWorld
(Côté et al., 2018), ALFWorld (Shridhar et al., 2020), planning abstraction from
language (Liu et al., ICLR 2024), Dyna and model-based replay. This prototype is a
*controlled positive control* for goal-conditioned speech-intervention planning.

## Next falsifiable experiments

1. Learn the operation vocabulary itself (rather than selecting from nine templates).
2. Let utterances alter relational facts and constraints, not only rearrange tokens.
3. Learn a genuinely trainable latent geometry, then compare it against the exact graph.
4. Introduce uncertainty and partially observable language states, and re-plan after
   incorrect action-effect predictions.
5. Test structural transfer from original V17 maze/causal worlds to the language world
   under matching compute budgets and rigorously held-out task families.

**No existing files under `v17/`, original `isolated/noise-space/`, or any checkpoint are modified.**
