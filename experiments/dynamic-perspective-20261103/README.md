# MagicPerspective — Dynamic Perspective Laboratory

Independent, reproducible experiment in the MagicPerspective research series. It does **not** replace V1–V7, Graph Dance, Distributed Dance, Learned Messages, or their checkpoints.

## Termux (existing clone)

```bash
pkg update -y
pkg install -y git nodejs
cd ~/MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/dynamic-perspective-20261103/run-termux.sh
```

Open **http://127.0.0.1:3043** on the same phone.

First installation: run `git clone https://github.com/dan3s2020/MagicPerspective.git` from `$HOME` before the commands above. Only Node.js 18+ is required. No Python, pretrained model, LLM or GPU dependency.

## What it does

- **Local worlds:** 3 deterministic network families (`clusters`, `bridges`, `dense`). Nodes have access to only their own incident edges and imprecise edge-cost sensors. The simulator may change costs or close *non-tree* edges between navigation steps, while the graph remains connected.
- **Message organism:** each node stores a potential, confidence-related message gate, phase, parent candidate and local links. A shared **trainable message operator** adjusts attention weights, aggregation temperature, update gate, bias and estimated local transformation cost. Message rounds are scheduled synchronously for reproducibility; the nodes do not read the evaluator's complete graph.
- **Initial prediction:** message rounds produce a potentially connected hypothesized path **before** the first physical action. The human evaluator can see a separately computed shortest path, but that path is not used to train the node policy.
- **Physical feedback:** traversed edges reveal actual cost; successful realized journeys provide cost-to-go feedback for the visited nodes, updating the shared parameters. Changes in other parts of the world are detected by their endpoints and propagate by local messages.
- **Manual stress intervention:** click `Schimbă o legătură` to disable an open non-tree edge (preferably on the predicted route). Only endpoints get refreshed. The organism must reform the route from updated local messages.
- **Blind evaluation:** compares `learned`, `bellman`, `off`, `shuffled`, `untrained` on the *same held-out world seeds* with comparable message budget and failure-penalized effort. The evaluator computes route F1 and shortest path solely as scoring references.

> **Important distinction:** the shared update operator is an explicit parametric architecture. It learns parameters, not the space of all possible algorithms or arbitrary mathematical perspectives. No claim of emergent general intelligence, P=NP, universal reasoning or superiority to Bellman is implied.

## Infinite training, pause, autosave, resume

Training is executed **in the Node server**, independently from the browser. `START ∞` runs until paused, stopped, the process exits or Android kills Termux. The engine is not constrained to a fixed episode count.

- **Pauză** requests a stop after the current episode, saves, and leaves the model intact.
- **Continuă** resumes using the existing checkpoint and episode count.
- **Oprește** ends training without resetting the model.
- **Salvează** saves an atomic snapshot immediately. Autosave interval is configurable: 5/10/25/50 episodes through the UI, or custom 2–200 via API.
- **Export checkpoint** downloads JSON. The on-disk state is `data/latest.json`; a `.bak` is kept on each save; best validation model is saved in `data/best.json`.
- After an interrupted server restart, the checkpoint is restored **paused**. Press `Continuă` explicitly. At worst, episodes since the last completed checkpoint may be lost after an unclean OS kill.

**Caution:** Android may throttle or kill long-running Termux. Unlimited training is not unlimited power or guaranteed performance. Monitor temperature, power usage and held-out tests. Background running cannot survive a stopped Termux process.

## Buttons and panels

1. `Lume nouă`, `Un tur de mesaje`, `Un pas`, `Navighează`, `Schimbă o legătură` — active research world controls.
2. `Evaluator` versus `Perspectiva distribuită` — two different views; hidden truth is only available to the former and to scoring code.
3. Touch a node in the learner panel to inspect its local sensor links and current estimate.
4. Replay and time graph track route connectivity, real effort and changed edges.
5. Training ∞ panel shows model errors, parameter values, checkpoint status and the learning curve.
6. `RUN TEST` measures five modes on blind worlds; failure cost is included.

## Reproduce the measurements

```bash
cd ~/MagicPerspective/experiments/dynamic-perspective-20261103
npm test
node scripts-benchmark.mjs 200 33 24 17
node scripts-benchmark.mjs 200 33 24 55
node scripts-benchmark.mjs 200 33 24 83
```

The benchmark creates `results/latest-benchmark.json` locally, ignored by Git. The three recorded benchmark snapshots are under `results/benchmark-200ep-seed{17,55,83}.json`. The checkpoint and benchmark directories have no effect on previous versions.

For exact results and negative findings see [REPORT.md](./REPORT.md).

## Project structure

- `engine/world.mjs` — hidden mutable graph, restricted node observations, physical actions, oracle for scoring.
- `engine/brain.mjs` — trainable message transform / local node state / perspective reconstruction / intervention.
- `engine/experiment.mjs` — reproducible training, frozen controls, blind evaluation.
- `server.mjs` — Termux HTTP process, independent training loop, autosave/restore, API.
- `public/` — responsive dual-graph UI, replay, model diagnostics, pause/resume.
- `tests/` — engine invariants, local information isolation, training, blind tests, server crash-safe persistence.

## Test boundaries

1. Node message update functions have **no reference to** the environment's full graph or teacher route. They use only local edge views and received neighbour values.
2. The evaluator's full graph and oracle are added only when serializing the **user-facing visualization** or scoring a test. They are not arguments of the brain learning function.
3. A changing network remains connected due to a fixed underlying spanning tree; that makes the first dynamic tasks solvable but limits generality.
4. Neural updates do not automatically imply policy improvements. Bellman is a strong explicit benchmark and may tie or outperform the learned rule.
5. Validation/test worlds share broad generator families with training. This is **not** proof of transfer to text, SAT or other NP-complete problems.

## Training-first UI (3 November 2026)

The mobile UI has been replaced with a **training-first display**. Start, Pause, Resume, and Save are sticky at the top. The main full-width canvas plays back **actual completed training episodes** received from `/api/train/live`, continuously cycling through recently completed episodes. It is not a generated illustration or a simulation of nonexistent learning. The orange line is the organism's hypothesized solution, cyan is its executed walk, and green dotted is the evaluator's **initial** optimal route, which can become obsolete as graph connections change.

Each episode displays its actual initial F1, after-training F1 on the **same already-observed world**, weight change norm, number of parameter updates, realized cost, success/failure, and changes observed. This within-world before/after comparison is *not* generalization evidence.

A separate **held-out benchmark** measures cost MAE on the same fixed unseen edges (seed `880000`, 12 worlds, 33 nodes), compared to the untrained baseline. Evaluator-only access to actual edge costs is used only for scoring. Navigation is separately validated against a fixed Bellman baseline every 20 or more episodes. Improvements or regressions are shown without hiding negative results.

The original model architecture, prediction rule, checkpoint schema (`3`), endless-training controls and `data/` directory remain unchanged. The live episode ring buffer is volatile, so after server restart there are no traces until a new episode is trained. Last saved model weights and episode count are restored in paused mode. Browser closure stops only the visualization, not the server-side training process.

Run `npm test` and verify that `/api/train/live` includes frames from actual training when the trainer is active. The experimental UI cannot claim emergent general intelligence, universal form prediction, or superiority over Bellman from these observations.
