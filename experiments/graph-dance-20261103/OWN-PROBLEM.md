# Magic Perspective — Your Own Problem Mode (original Graph Dance UI)

**Purpose:** test problems that do not come from the built-in generators. Import user-authored weighted state-transition graphs and evaluate actual navigation on them.

This is not a universal solver. The graph interface and explicit path decoder remain programmed. The experiment measures transfer to arbitrary external network topologies without modifying the engine for each topology.

## Android / Termux

```sh
cd ~/MagicPerspective
git switch main
git pull --ff-only origin main
bash experiments/graph-dance-20261103/run-termux.sh
```

Open http://127.0.0.1:3040. Expand **Problemă reală / rețea proprie (JSON)**, choose a JSON file or paste it, and press **Importă problema mea**. The ORIGINAL two canvases and existing steps/replay controls now operate on the imported graph. **Compară organismul cu controlul** evaluates frozen trained, no-dance and untrained policies on the same graph. **Lume nouă** switches back to the original generator.

Import/compare do not modify checkpoints. Imported data is held only for the current server session and is rejected during training.

Headless operation: put the file in your home directory:

```sh
node ~/MagicPerspective/experiments/graph-dance-20261103/scripts-run-task.mjs ~/problem.json
```

The output is a machine-readable JSON report containing optimum (evaluator only), actual action trace, success/failure, cost, excess cost, and matched controls.

## Problem JSON example

```json
{
  "schema": 1,
  "name": "My workflow",
  "nodes": [
    {"id": "Start", "x": 0.10, "y": 0.20},
    {"id": "Review", "x": 0.38, "y": 0.30},
    {"id": "Finish", "x": 0.84, "y": 0.75}
  ],
  "edges": [
    {"from": "Start", "to": "Review", "cost": 2},
    {"from": "Review", "to": "Finish", "cost": 4},
    {"from": "Start", "to": "Finish", "cost": 10, "open": false}
  ],
  "start": "Start",
  "goal": "Finish"
}
```

## Semantics / limits

- schema must be 1; nodes must be 3–65 unique IDs (nonempty string up to 64 chars or nonnegative integer). Optional x/y positions range 0..1; otherwise a deterministic circle is used.
- Edges must be 1–1500 unique undirected pairs. Optional cost defaults to 1, must be finite and positive; optional open defaults to true.
- Start and goal are distinct known IDs. Invalid links, duplicates, negative or infinite costs, and malformed inputs are rejected.
- The weights represent your own comparable costs. The current implementation supports **undirected/bidirectional** links only; it cannot faithfully represent one-way dependencies or arbitrary irreversible workflows. It does not understand real-world actions beyond that representation.
- An unreachable goal is explicitly reported; no fabricated route or score.
- The evaluator sees the complete supplied graph to compute a true optimum; an organism receives node-local feedback. There is no access to the evaluator route in training.
- The imported graph does not itself train a new universal policy. Continuous training still uses generated worlds. External problem mode is an honest transfer/utility test, not evidence of emergent intelligence.
- The application does not perform actions on external websites or machines.

## The next scientific decision gate

Freeze the model; collect at least 30 diverse user-authored tasks independently of its generators. Compare success, penalized cost and action count to frozen and untrained controls on exactly the same tasks. Do not count imported tasks used for debugging as blind evidence. The next real research milestone is learning from verified effects of external actions and demonstrating generalization to new task families.