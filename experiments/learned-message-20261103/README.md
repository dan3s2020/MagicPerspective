# MagicPerspective — Learned Message Dance (2026-11-03)

A self-contained research experiment in which graph nodes **learn parameters of their local message transformation and aggregation** through real navigation experience. This is a new experiment under `experiments/learned-message-20261103`; the prior Distributed Graph Dance and all older versions remain unchanged.

## Run on Android / Termux

```bash
pkg update -y
pkg install -y git nodejs
cd ~/MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/learned-message-20261103/run-termux.sh
```

Open **http://127.0.0.1:3042** on the same phone. This does not require Python, a pretrained LLM or npm packages. The Node server binds to `127.0.0.1` by default.

First install, when there is no clone yet:

```bash
cd ~
git clone https://github.com/dan3s2020/MagicPerspective.git
cd MagicPerspective
bash experiments/learned-message-20261103/run-termux.sh
```

## What the network really learns

Every graph node has **only its incident links**, a noisy sensor for each link, a state estimate, and messages from adjacent nodes. The goal node emits the zero boundary condition; no node receives the evaluator's shortest path.

Two separate parameter sets are trained:

- **Cost estimator:** four coefficients map edge sensor readings into predicted traversal cost. It learns from the true cost **only after an actual traversal**.
- **Message operator:** twelve coefficients control message correction (8), attention (2), soft-min temperature (1), and damping (1). It learns using a mirrored, zeroth-order gradient estimate from **observed returns-to-go along actually traversed trajectories**. These are *not* oracle-optimal routes.

Message transmission is still scheduled by a fixed synchronous local-neighbor protocol. A learned soft-min is applied to candidate neighbors. This is a trained message operator, **not a self-invented universal communication language**. Public node coordinates, adjacency and the destination ID are known; true edge costs are unknown until traversal. No claims of universal intelligence or P=NP are made.

## Training forever, pause, save, recover

- **START ∞**: continuous server-side training until stopped or Termux is terminated; no episode cap in the UI.
- **Pause**: finish the current episode and atomically save the entire model and counters.
- **Continue**: continue from the last saved episode without resetting the two models.
- **Stop**: stop future episodes and retain the checkpoint.
- **Save now**: write `data/latest.json`; a `.bak` copy is kept. The loader attempts the backup when `latest.json` is unusable.
- **Autosave**: configurable frequency. `data/best.json` separately stores the best checkpoint according to **held-out learned-mode penalized cost**.
- **Export**: download all model coefficients, counters, history and the last independent blind test.
- **Ctrl+C / SIGTERM**: request a checkpoint before server exit. Android can still kill the process without a signal; only previously written checkpoints survive.

The training loop runs in Termux independently of the browser session. Closing the browser does not stop it as long as the Node server is running. On restart the server restores the last checkpoint **paused**, not silently running. Files in `data/` are gitignored, so a `git pull` does not overwrite them. Back up `data/latest.json` externally if the experiments matter.

## Blind test and negative controls

The exact same independent test networks, sensor readings and message-round budget are used for:

1. **Learned**: trained local message correction, attention, temperature and damping.
2. **Bellman**: fixed min-plus message update, with the **same trained sensor-to-cost estimator**.
3. **Off**: no neighbor messages; geometric local fallback only.
4. **Shuffled**: neighbor messages routed to the wrong labels, to test causal use of transmitted information.
5. **Untrained**: fresh sensor and message weights, but the same local propagation architecture.

We report initial route edge-F1, connection completion rate, navigation success and average cost **with explicit failure penalty**, not only successfully completed episodes. The evaluator oracle is used to score F1 and optimality, never to update policy weights. Validation and blind test use different seeds. The benchmark only covers graph families similar to training; it is not a demonstrated transfer to SAT, text, or arbitrary problems.

## Visual interface

Two independent graph canvases: evaluator truth and the organism's distributed view. Each node has animated phase rings and a clickable local-information panel. New worlds allow choosing `Learned`, `Bellman`, `Off` or `Shuffled`. A replay slider shows how the route and potential estimates evolve through message rounds. The training panel includes live indicators for actual message updates, cost MAE, learned soft-min temperature and parameter counts, plus saved progress and blind comparisons.

## Reproduce

```bash
cd ~/MagicPerspective/experiments/learned-message-20261103
npm test
node scripts-benchmark.mjs 200 33 24 17
node scripts-benchmark.mjs 200 33 24 55
node scripts-benchmark.mjs 200 33 24 83
```

The benchmark writes `results/latest-benchmark.json` locally. Committed reference results are in `results/benchmark-200ep-33nodes-24worlds-seed{17,55,83}.json`.

**Important experimental limitation:** the first benchmark shows learning of message parameters and of edge costs, but no consistent superiority over fixed Bellman at equal information and communication budget. The experiment is a falsifiable next step, not a finished general solution engine.
