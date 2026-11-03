# Learned Message Dance — research log, 2026-11-03

## Hypothesis

Can a shared, trainable local message transformation outperform fixed Bellman/min-plus aggregation, when both are allowed exactly the same node-local observations, edge sensors, and message rounds?

**Baseline:** the previous Distributed Graph Dance only trains a 4-parameter local sensor-cost model. Its message update rule is fixed. Here we additionally train **12 message/aggregation weights**, evaluated separately from the cost model.

## Method

- Three deterministic graph families: `local`, `hierarchical`, `mixed`, 33 nodes.
- The local node knows incident edges and sensor values, not the true global shortest path.
- Learned message candidate: `predicted_edge_cost + received_neighbor_value + 2.2*tanh(w·local_features)`.
- Learned attention is a softmin weighted by two further coefficients; the temperature and damping are learned as well. A fixed graph protocol and objective are retained.
- After a real traversed route reaches the goal, the experiment constructs **observed returns-to-go**, keeping the best actually observed suffix for repeated nodes. Only those returns supervise the message rule; the evaluator's oracle is never used as a learning target.
- Mirrored (antithetic) zeroth-order optimization estimates a gradient from two perturbations of the same 12-dimensional operator. These probes recompute messages on the *same node-local sensor graph*, with targets from actual experience.
- The 4-parameter sensor-cost model is simultaneously trained from realized edge costs.

Negative controls: learned, fixed Bellman (same trained cost model), no messages, shuffled messages, and untrained cost plus message model. Test seeds are held out from training and validation. Unsuccessful routes incur a fixed penalty independent of oracle shortest-path cost.

## Results — 200 episodes, 24 independent test worlds, three training seeds

| Training seed | Cost MAE before → after | Learned penalized cost ↓ | Fixed Bellman cost ↓ | Learned first-shape F1 ↑ | Bellman first-shape F1 ↑ |
|---|---|---:|---:|---:|---:|
| 17 | 4.176 → 0.912 | 26.458 | **26.375** | 0.726 | **0.751** |
| 55 | 4.068 → 0.912 | 26.458 | **26.375** | 0.726 | **0.751** |
| 83 | 4.135 → 0.912 | 26.458 | **26.375** | 0.726 | **0.751** |

All three runs had 100% navigation success in the learned and Bellman modes in this sample. Without messages, penalized cost ranged from about 77.7 to 78.9. Shuffled messages cost approximately 252.7 and included failures. The untrained learned-operator mode cost about 26.458.

**Result:** the message operator's parameters really changed and its local training objective could be optimized, but the trained operator **did not outperform fixed Bellman** on this benchmark. The learned initial shape was also less aligned with the optimal route than Bellman. This is a negative result for the superiority hypothesis and must not be hidden by highlighting improvement in sensor-cost MAE alone.

The three learned cost performances are nearly identical across seeds because all test networks and model architectures are deterministic; this is not equivalent to comprehensive statistical robustness. Different training graph families and larger distributions are necessary. Further tuning should use separate validation seeds and keep blind test seeds untouched.

## What remains missing

- A mechanism that **invents the communication protocol itself** rather than adjusting a predefined operator.
- Stronger world dynamics: edges appearing/disappearing, changing rules, sensor occlusion and communication limits.
- Learning spatial/causal representations without supplying all local adjacency and coordinates initially.
- Evidence of positive *cross-domain* transfer or superiority over efficient explicit algorithms.
- Broader repeats and confidence intervals for the learned-versus-Bellman comparison.

Checkpoint persistence, UI controls, runtime health checks and reproducible tests are engineering results, **not evidence of emergent intelligence**.
