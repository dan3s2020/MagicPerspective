# MagicPerspective — Verified structural transport, not yet universal perspective learning

**Integration:** new files beside `isolated/language-paths/engine.mjs` in an isolated experiment branch. No edits to the original learner, V17 brain, checkpoints, or `/` UI. The existing local-only `server.mjs` receives just `/transfer` and `/api/transfer` GET routes. `node --test` tests the new routes.

## What is falsified or demonstrated

Take a spatial tile transformation game with unknown button effects. Learn which of nine *predefined generic index rules* each of six buttons implements from 48 observed (before, button, after) interventions, with lengths 4 and 5. Then take the **existing independently seeded** `SpeechWorld` language-like game, where the six speech actions implement the same *family* of underlying rules, but with a different hidden action-to-rule correspondence.

Observe exactly one target before/utterance/after transition per utterance (6 interventions per target world, no goal path). Find which previously learned source operation matches each. Use the **same learned source `DiscoveredEffects` atlas**, not a new target planner, as the transition and inverse-transition model feeding the original `plan()` / reverse `valueField()` functions. Predict a full path before executing it on held-out seven-word states. The independently seeded target world checks the actual actions. The source and held-out vocabulary are disjoint.

The spatial game is a **two-dimensional serpentine tile-layout transformation game, not a V17 labyrinth**. Both domains are **deliberately isomorphic**, with index permutations as their shared physics. This is a minimal positive control for transporting action transformations. It is not a claim about cross-domain natural-language semantics.

## Mathematical invariant

Let `h` be a bijective renaming of token identities, and `σ` the correspondence learned between target utterances and spatial source actions. For a source learned permutation `F_hat` and a target world's true rule `G`, the target prediction is:

```
       h(F_hat_{σ(u)}(x)) == G_u(h(x))
```

when action mappings are correct. Equivariance under renaming is checked for every target utterance, including held-out word identities, and inverse transformations are checked against the original states. This is the **commutation / intertwining** relationship described in the attached dimensional-lifting research notes, in a simple discrete instance. It is **not** a learned higher-dimensional `E`, `π`, or continuous 5D space. The renaming map is supplied by construction, rather than learned from raw natural language.

**Why path lengths are conserved in this controlled case:** if a bijection `h` maps all edges of a directed action graph to edges in another graph, each path of `k` steps maps to a path of `k` steps. Applying its inverse to any shorter path would contradict optimality in the source graph. Therefore shortest-path distance is preserved under graph isomorphism. This does not prove that arbitrary worlds are isomorphic or that an algorithm can discover such a mapping without anchor data.

## Reproducible benchmark (Node.js 20+; zero dependencies)

```bash
cd isolated/language-paths
node --test cross_world_transfer.test.mjs transfer_http.test.mjs
node cross_world_transfer.mjs
node server.mjs
```

Open `http://127.0.0.1:8898/transfer`. The original `http://127.0.0.1:8898/` is unchanged.

In the reproducible default seeds (`source=11`, target `29,53,97`, 10 goal tasks per seed, n=7):

| Measurement | Outcome |
| --- | ---: |
| Observed spatial source transitions | 48 |
| Target interventions used for correspondence | 6 per world |
| Target goal paths supplied during calibration | 0 |
| Held-out target paths executed successfully | 30 / 30 |
| Full executed-path transition predictions correct | 30 / 30 tasks |
| One-step held-out action predictions | 18 / 18 |
| Naive, unaligned action-label mapping (negative control) | 5 / 18 |
| **Direct target one-shot, SAME fixed nine-rule hypothesis prior (strong baseline)** | **18 / 18** |

**Crucial distinction:** the fair direct-prior baseline performs *equally well* from the same six full-state probes. The original `DiscoveredEffects` implementation has a >=2 records guard; for this controlled baseline the exact same single observed transition is inserted twice to satisfy that guard, **without providing new information**. The result proves that the source model's rules can be transported and independently verified, **but NOT that pretraining the source is better, faster or necessary under this predefined hypothesis family**. Total source+target training costs exceed those of the direct baseline.

## What remains unproven

- Real V17 maze-to-natural-language transfer: **not built**.
- Learning the *action rule grammar itself*, rather than selecting from a predefined nine-rule repertoire: **not built**.
- Learning an encoder/projection `E_world`, `π_world` or a shared trainable latent transition geometry: **not built**.
- Unknown action correspondences with no calibration and no shared observables: **not demonstrated**.
- Language meaning, reference, syntax, conditionals, arbitrary problem solving, nonlinear hyperdimensional transformations: **not demonstrated**.
- Relative improvement over a strong target-only baseline: **not demonstrated**.

## Exact next integration target

1. Preserve current V17 `Brain` and its checkpoints; attach a versioned, separate experimental shared latent transition component, rather than substituting its existing actor or `Discoverer.shape()`.
2. Construct real adapters that log **only observed** (state, action, next state, context, domain) from `worlds/exercise.mjs`, `worlds/transform.mjs`, and language tasks. Never supply V17 BFS oracle data to the model.
3. Learn `E_w(o)`, shared action-conditioned `T(z,a,c)`, and `π_w(z)` jointly from transitions. The loss needs next-state prediction, latent multi-step consistency, projection reconstruction, and cross-world structural agreement when a correspondence is **grounded**. No reason to force agreement between unrelated worlds.
4. Train on CUDA with measured throughput; compare to equal-compute separate-learner and direct target-only baselines. Include causal/referential language, disjoint generators and withheld transformation families.
5. Show the true learned latent activations, projected outcomes, before-action path-field prediction, alternative paths and errors in the existing viewer. Keep `train`, `pause`, `save`, `resume`, `replay`, and frozen evaluation independent, with no original-branch regressions.

This experiment verifies one necessary *interface invariant*. It is not a proof of the final MagicPerspective objective.
