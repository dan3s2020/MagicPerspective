# MagicPerspective — Distributed Graph Dance (2026-11-03)

**Independent research experiment.** Existing versions and `experiments/graph-dance-20261103` are unchanged. This experiment runs on **port 3041**, uses its own `data/` directory, and requires only Node.js 18+ (no Python/LLM/packages).

## Termux: first install

```bash
pkg update -y
pkg install -y git nodejs
cd ~
git clone https://github.com/dan3s2020/MagicPerspective.git
cd MagicPerspective
bash experiments/distributed-dance-20261103/run-termux.sh
```

## Termux: update and run (existing clone)

```bash
cd ~/MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/distributed-dance-20261103/run-termux.sh
```

Open **http://127.0.0.1:3041** in the same phone browser.

To test the implementation:

```bash
cd ~/MagicPerspective/experiments/distributed-dance-20261103
npm test
node scripts-benchmark.mjs 150 33 24 55
```

## Training indefinitely, pause/resume/save

The training process runs inside the Termux Node server, not in the browser. **START ∞** means **no episode limit**: it continues until **Pauză**, **Oprește**, the process is killed, or the device stops it. You may close the browser, and training stays active as long as Termux and Node stay alive.

- **Pauză**: finishes the currently running episode, writes checkpoint, stops training. **Continuă** picks up the same model and episode count.
- **Oprește**: stops training but does **not** erase the model or counters. Press START to keep training from the checkpoint.
- **Salvează acum**: writes a persistent snapshot of the latest model, counters, history and latest blind test, even while training is active.
- **Autosave**: every 5/10/25/50 episodes (adjustable); additional checkpoints after validation, pause or stop. Writes atomically via `.tmp` + rename and keeps a `.bak` fallback. The best-validated snapshot is saved separately.
- **Server restart / Android kill**: restores the latest checkpoint, **paused**, so it cannot unexpectedly burn battery. Press Continue explicitly. Since the OS can kill a process without warning, at most the last unsaved episodes can be lost.
- **Export checkpoint**: downloads model parameters and training state as JSON. For backup outside Termux, copy `data/latest.json` and `data/best.json` to another device or cloud storage. `.json` checkpoint files are ignored by Git.

The training rate is limited by a configurable delay after each episode. **Infinite training cannot continue if Android terminates Termux**; disable battery optimization for Termux if you choose to run for long periods, provide power and watch device temperature. Do not assume that continuous training guarantees improved performance; use the blind test.

## What the nodes know

Every node is given its **own incident links** and a noisy local sensor value. No node gets the whole graph or the evaluator's optimal route. The server schedules synchronous local messages along these real links. The goal node is the boundary condition `v(goal)=0`. Nodes update estimates through weighted messages from neighbours. A directed field of parent pointers reconstructs a globally connected hypothesis. The user-only evaluator can display ground truth separately.

The `CostRule` is a small learned regression mapping sensor signals to edge costs. **Only traversed edges reveal true costs**, which produce training updates. The message-propagation rule itself is explicit distributed value iteration, not a learned invention and not proof of emergent intelligence. Phase rings visualize the changing potential, rather than pretending that phase agreement alone solves a problem.

## Controls that can falsify the hypothesis

The blind test compares **four variants on exactly the same held-out network seeds**: real messages, no messages, deliberately shuffled messages, and a fresh untrained cost rule. It reports success, failure-penalized cost, first connected route F1 and consistency. Trained and untrained modes may be close; that is a meaningful negative outcome, not a UI error. Training validation uses different seeds from the test. Unseen worlds share the same generator families as training, so this is not yet proof of transfer to SAT/text.

## Interface

- Side-by-side evaluator truth and distributed collective (stacked on mobile).
- Animated node phases, potential field, predicted route, completed route, touch-to-inspect node-local links.
- Single message round / 12 rounds / physical step / full navigation.
- Replay slider to inspect the collective field through time.
- Server-side training status, learning-curve plot, throttle settings, autosave, pause, resume, stop, export.
- Blind negative controls; no success inferred from synchronization alone.

## Safety/invariants

1. No `/api/train/reset` is accepted without the exact confirmation `RESET_TRAINING`.
2. The server listens to `127.0.0.1` by default, not the public internet.
3. The experiment's checkpoints stay under `experiments/distributed-dance-20261103/data/`.
4. Browser display receives evaluator-only truth separately; the policy and message update functions use only each node's local links. The full graph reference in `Collective` is used solely by the physical `traversal()` environment and the human evaluator.
5. Evaluation clones the model before comparing modes and never overwrites the training checkpoint.

Results and scientific limitations: [REPORT.md](./REPORT.md).
