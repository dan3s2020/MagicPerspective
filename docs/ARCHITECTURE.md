# MagicPerspective V1 — implementation contract & evidence

## What is proven versus aspirational

| Requirement | Evidence | Current verdict |
|---|---|---|
| World has 2D hidden topology | Seeded DFS maze with optional loops | Implemented |
| Observer sees 3×3 only | `observe()` and `tests/core.test.js` | Tested |
| Predict BEFORE step 0 | `new Episode()` calls `refresh()` | Tested via API |
| Learn a spatial *form* not simply an action | All-cell binary cross-entropy path occupancy target | Implemented |
| Predict complete unseen route | Decode from learned shape distribution plus partial-belief graph planner | Implemented with explicit search |
| World responds physically | Wall collision vs successful move | Implemented |
| Perspective revised after new evidence | Map belief updates, re-forward after action | Implemented |
| Learn real neural weights, persist them | SGD/backprop and atomic `weights.json` save | Tested |
| Compare against held-out geometric control | Seeded disjoint eval, BCE and IoU | Tested |
| Transfer across maze sizes | Additional 7–15 size benchmark run | Observed experimentally, not universal |
| Invent new representations dynamically | No architectural search yet | **NOT IMPLEMENTED** |
| Transfer to SAT, text or arbitrary graphs | No cross-domain agent yet | **NOT IMPLEMENTED** |
| Prove P=NP / control physical reality | Not implied by these experiments | **NOT PROVEN** |

## Definitions

`world`: finite hidden grid with goal, actions, collision rule.
`observation`: values of at most 9 tiles around current position.
`belief`: accumulated partial map: `-1` unknown, `0` open, `1` wall.
`goal`: location provided as explicit directional hint, never hidden-wall topology.
`latent`: 24 nonlinearly activated neurons, learned end-to-end from supervised path-mask errors.
`shape`: probability for each candidate cell to belong to a valid *reference shortest path* from current position to goal.
`decoded trajectory`: least-cost connected route through all currently known/non-wall cells using negative log predicted shape probability; **this decoding is an algorithm, not the neural network itself**.
`resistance`: actual collision with a hidden/known wall; may update belief. This is not an exotic physical force.
`teacher`: shortest path computed on hidden full grid; accessible to supervised loss and human truth UI **only**.

## Leakage audit

Learner-visible feature builder signature:

```js
features(belief, n, start, goal, candidateCell, visits)
```

It does **not** accept `world.cells`, `teacher`, `shortestPath`, wall-bit mask, ground truth adjacency, or any global map. It uses only current belief and goal hint. The route decoder similarly receives `prob,belief,n,start,goal,visits` with no full world.

In the HTTP JSON, `teacherTruth` is exposed to the human *UI*, whose browser code does not train the model; do not use it as an input to the learner. This boundary is enforced by program structure and covered by input-contract tests, not a formal information-flow proof.

## How to falsify our proposal

- Train on old seeds, evaluate on disjoint seeds; if BCE does not improve over a nonlearned baseline, the predictor fails its first goal.
- Repeat with random labels or shuffled mazes; an improvement that survives label destruction suggests leakage or a faulty metric.
- Compare neural planner against a classical planner with equal belief, goal and compute budget; a stronger planner may win.
- Transfer to abstract graph tasks without changing the model and observe whether the advantage disappears; if it does, this is not yet a general solution-form predictor.
- Measure prediction calibration in observationally indistinguishable mazes; confidence without evidence is a failure.

## Source and run

Files: `src/maze.js` (truth), `src/model.js` (learner), `src/agent.js` (belief, action), `server.js` (API), `public/` (visualization), `tests/` (automated contract), `scripts/benchmark.js` (measured evidence).

Training starts at random weights, is completely local and does not use proprietary or pretrained models.
