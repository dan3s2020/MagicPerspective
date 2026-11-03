# Experimental report — Dynamic Perspective (2026-11-03)

## Question

Can a trainable local message-update rule learn to maintain a connected prediction of a global route when its graph changes and no single node is given the full topology? Can it outperform an explicitly programmed fixed Bellman update with the same local connectivity and rounds?

**Current answer:** yes for updating message parameters, recovering a connected route, and adapting after an explicit edge intervention; **not yet** for beating Bellman in navigation cost.

## Architecture

A shared local message brain has learned (i) sensor-to-cost coefficients, (ii) neighbour message attention weights, (iii) an update gate, (iv) aggregation temperature, and (v) proposal bias. Nodes hold distinct potential/phase/parent/link states. These parameters are trained from **costs of actual executed transitions** and cost-to-go from successful completed journeys, not from the optimal path oracle. The update family (weighted neighbour proposals, soft attention, gated aggregation) is still designed by programmers.

## Protocol

- Deterministic graph families: `clusters`, `bridges`, `dense`, 33 nodes.
- Dynamic change: after the first step, optional links or sensor costs evolve at every subsequent step. Local endpoints observe their changed links; new information propagates over messages.
- Seeds for training initialization: 17, 55, 83; 200 episodes each; distinct train worlds.
- Fixed independent **held-out** test worlds: 24 worlds, `seed=920000`. A separate held-out link set tests sensor cost MAE.
- All controllers share the same test worlds and initial position, goal and physical transition rules: trainable messages, fixed Bellman messages, messages disabled, messages with intentionally permuted recipient identities, and a fresh untrained message brain.
- Penalized navigation cost includes unsuccessful episodes; path F1 is measured **before** movement and against the initial oracle, not against a changing end-state path.

## Results

| Metric | Seed 17 | Seed 55 | Seed 83 |
|---|---:|---:|---:|
| Cost MAE before learning ↓ | 1.77760 | 1.84069 | 1.78738 |
| Cost MAE after 200 episodes ↓ | **0.67111** | **0.59212** | **0.67126** |
| Trained route cost ↓ | 13.651 | 13.651 | 13.651 |
| Bellman route cost ↓ | **13.651** | **13.651** | **13.651** |
| No-message route cost ↓ | 67.535 | 67.012 | 67.535 |
| Shuffled-message route cost ↓ | 41.773 | 44.743 | 44.585 |
| Untrained route cost ↓ | 13.651 | 13.651 | 13.651 |
| Trained first route F1 ↑ | 0.8958 | 0.8958 | 0.8958 |
| Untrained first route F1 ↑ | 0.8542 | 0.8542 | 0.8542 |

All variants reached the goal on these 24 held-out graphs, but some controls took many more steps/cost. The cost estimator's error declined. Learned attention and gate coefficients also changed, but **trained route cost was identical to the untrained controller and Bellman on these worlds**. This does not establish a learning-driven navigation advantage.

The evaluated routes are short (trained mean 2.125 physical steps), so this initial benchmark is relatively easy. Interventions and additional worlds with longer horizons are required before claims about complex dynamic planning.

The `npm test` suite includes a targeted **physical edge closure** experiment: an actual edge on a predicted route is closed, only its endpoints update their local observations, and the collective reconstructs a *different connected route* after message propagation. This proves reactivity of the local algorithm, not a universal ability to invent perspectives.

## Limitations

- Although the neighbour attention and gate are trained, the architecture retains a fixed iterative neighbourhood-update template and a hardcoded linked-path decoder. It does not invent arbitrary new message algorithms, representations, or a general latent world model.
- Each node knows its own incident physical edges at the beginning of an episode; there are no unseen edge endpoints that need to be discovered. The unknowns are costs and future structural changes.
- An unmodified spanning tree ensures eventual connectivity, making navigation simpler than unrestricted changing graphs.
- The local sensor is intentionally informative about true cost. This helps learn cost but reduces causal uncertainty.
- The simulator still explicitly schedules synchronized message rounds. The central program is not an emergent supervisor or independent 4D entity.
- Three training seeds with a fixed blind set are not a comprehensive statistical study; held-out families resemble training generators. More distribution shifts and multi-size transfer tests are required.
- Benchmarks measure a prediction before action, and compare actual performance. They do not prove P=NP, superintelligence, or a general engine that changes physical reality.

## Next falsifiable experiment

Remove preknown adjacency from the initial local views, add edge discovery under exploration budget, and test dynamic worlds with goal changes and longer shortest paths. Use an ablation removing message attention or trainable gates. Compare to Bellman and equally capable untrained/frozen models under the same information budget, not just higher synchronization.
