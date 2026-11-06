# MagicPerspective — Shape Prediction Laboratory

> [!CAUTION]
> **BLOCKING REGRESSION — USER REQUIREMENTS HAVE PRIORITY.** All coding agents MUST read
> [AGENTS.md](./AGENTS.md), [the exact user correction](./verbatim/2026-11-06-USER-REGRESSION-NO-REDEFINITION.md)
> and [regression MP-REG-2026-11-06-001](./REGRESSION_USER_DIRECTIVE_2026-11-06.md)
> ([public Issue #25](https://github.com/dan3s2020/MagicPerspective/issues/25)).
> **PROHIBITED:** imposing model/agent definitions and substitute methods (32D latent, encoders,
> token predictors, auxiliary SGD, etc.) as replacements for the user's specified
> ORIGINAL 2D maze solution-shape propagation mechanism in the language world.
> Do exactly what was requested; no unapproved architectural substitutions.
> This regression is **OPEN / BLOCKING**. A passing CI suite does not resolve it.


> **Canonical project requirements:** [VERBATIM_ROOT.md](./VERBATIM_ROOT.md) and the original ordered conversation. This README documents V1 only; it does not replace Verbatim or certify compliance of V1–V9. See [the version mirror](./verbatim/implementation-mirror.json) and [archival gaps](./verbatim/continuation-index.json).

**Version 1.0.0 — independent, fully runnable prototype.** This is not a complete general intelligence system and does not prove P=NP. It is an experimental implementation of a neural **solution-shape predictor** trained from partial observations and evaluated on unseen mazes.

## Quick start in Termux (Android)

```sh
pkg update -y
pkg install -y git nodejs
cd ~
git clone https://github.com/dan3s2020/MagicPerspective.git
cd MagicPerspective
bash run-termux.sh
```

Then open **http://127.0.0.1:3030** in the phone browser. For existing installations:

```sh
cd ~/MagicPerspective
git pull --ff-only origin main
bash run-termux.sh
```

No npm dependencies, Python, native addon, internet connection during training, or GPU required. **Neural training is CPU-backed in Node.js.** GPU/CUDA and cross-domain transfer are future experiments, not falsely advertised as working. Tested with Node.js 22; Node.js >=18 required.

## Actual function

- Procedural seeded 7×7 to 21×21 maze, with arbitrary start and goal and multiple maze branches.
- The teacher sees the full map and computes shortest paths by BFS. **The organism sees only a 3×3 window, its visited map, its own location and the goal direction.** It has no access to the full wall grid in inference.
- A trainable 20-feature, 24-hidden-unit MLP outputs a *probability of each cell belonging to the solution path*, at initialization **before any action**. All weights start random, no pretrained model.
- The learned distribution is used to decode a hypothetical full trajectory through the currently known map. Unknown tiles can be hypothesized passable; observed walls cannot.
- During training, the oracle target is used **only for supervised loss** (binary cross entropy). Neither oracle path nor global hidden maze is passed into input features. Training examples include initial observations and snapshots of non-oracle exploration.
- On action, world physics confirms movement or reports a blocked action. Observed resistance updates the local belief map and prompts re-prediction.
- Held-out evaluation uses deterministic disjoint maze seeds and compares cross-entropy of the neural model against a fixed geometric line-prior baseline. The UI states failure if neural results are worse.
- Serializable neural weights persist in `data/weights.json`, safely gitignored. The browser displays the full teacher map **only to the human**.

## Scientific limitations (important)

- Predicting a low-error spatial *field* does not guarantee a physically valid decoded route or universal understanding. The route decoder explicitly uses weighted graph search over the believed map. This must not be confused with learning the full solution *without calculation*.
- The agent receives the goal coordinates as a navigation hint; no hidden wall data. The beginning of two perceptually indistinguishable maps cannot be perfectly disambiguated without observation.
- The trained latent is specialized to mazes. **Transfer to graphs, logic/SAT and automatic perspective discovery is not implemented.** These are research stages, not completed claims.
- The neural network is a simple CPU-first baseline, intentionally dependency-free for Termux. It is not Octopus A/B/C, an LLM, active inference, a verified multi-world learner, or a self-organizing physical cell organism.
- The held-out BCE baseline is not a comparison with a competitive planner; a stronger evaluation requires better controls and cross-domain tests.

## Commands

```sh
npm test             # 8 deterministic core tests
npm run bench        # measure actual train and held-out effects (240 episodes)
node scripts/benchmark.js 600
PORT=3031 node server.js
```

The REST API is local by default at `127.0.0.1:3030`:

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Live readiness |
| `GET /api/state` | Current model and world | 
| `POST /api/train` | Start real training with `{ "episodes": 240 }` |
| `POST /api/evaluate` | Held-out comparison |
| `POST /api/new` | New world `{ "n": 11, "seed": 123 }` |
| `POST /api/step` | Execute predicted next action, or `{ "next": index }` |
| `POST /api/reset-model` | Deliberately erase trained weights |

## Architecture / trust boundary

```text
seeded world W, true walls C --------------------------> evaluator/teacher BFS
       │                                                         │
       └-- local observation (3x3) --> belief B_t                 │
                                    + goal-relative hint         │
                                      │                          │
                                learned ShapeNet weights        │
                                      │                          │
                       full heatmap p(cell ∈ path | B_t)        │
                                      │                          │
                        decode estimated route on B_t            │
                                      │                          │
                               next action / wall                 │
                                      │                          │
                                 physical outcome                 │
                                      └-- memory update ----------┘

   During training only: oracle path labels ---------> gradient loss (no inference leak)
```

Original scientific goal: learn the **process of perspective construction** rather than just maze trajectories. This prototype establishes the required reproducible first stage, not a claim that cross-domain generalization has occurred.

## Archival provenance

The canonical main-branch conversation archive is [`CONVERSATIE_COMPLETA_DIN_CONTEXT.md`](./CONVERSATIE_COMPLETA_DIN_CONTEXT.md). It explicitly records what can and cannot be guaranteed as verbatim. We do not silently invent missing messages or original image binaries.
