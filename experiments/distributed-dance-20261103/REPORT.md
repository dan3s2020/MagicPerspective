# Distributed Graph Dance — experiment log (2026-11-03)

## Claim under test

Can a global, goal-directed shape be reconstructed **by local message passing** when no individual node sees the entire graph? Does learning local sensor-to-cost relationships improve the resulting route, beyond merely having the communication channel?

This is a deliberately restricted demonstrator: it uses **known local adjacency**, a finite number of deterministic message-passing rounds, and an explicitly programmed Bellman-style update. It does **not** learn the messaging algorithm itself, does **not** establish that intelligence has emerged, and says nothing about P vs NP.

## Protocol

Each of three deterministic graph families (`local`, `hierarchical`, `mixed`) makes a connected network. Each node is handed only its local incident edges and sensor readings; the true cost of an edge is not known until traversal. Training changes a four-parameter cost regressor using supervised feedback **from actual traversals only**. The global oracle is held separately and used only for scoring.

The key negative controls disable message passing or shuffle the labels of message values while retaining physical links. A separate untrained cost model shows how much of the result is from **communication** and how much is from **learning**. Evaluation penalizes unsuccessful runs. There are no LLM parameters, no use of the true global shortest path in policy updates, and no pretrained models.

## Measured CPU benchmark

Commands (three separate initializations):

```
node scripts-benchmark.mjs 150 33 24 17
node scripts-benchmark.mjs 150 33 24 55
node scripts-benchmark.mjs 150 33 24 83
```

| Measurement | Seed 17 | Seed 55 | Seed 83 |
|---|---:|---:|---:|
| Cost prediction MAE before training ↓ | 4.176 | 4.068 | 4.135 |
| Cost prediction MAE after 150 episodes ↓ | **0.895** | **0.894** | **0.895** |
| Correct messages, penalized navigation cost ↓ | **26.375** | **26.375** | **26.375** |
| No messages, penalized cost ↓ | 76.625 | 76.625 | 76.625 |
| Shuffled messages, penalized cost ↓ | 217.667 | 217.417 | 217.667 |
| Correct messages, initial shape F1 ↑ | 0.751 | 0.751 | 0.751 |
| Untrained costs, penalized cost | 26.500 | 26.417 | 26.500 |

**Interpretation:** local message passing produces far better routes than the disabled/corrupted controls for these graph families. **Most of the routing advantage is from the explicit distributed algorithm, not training:** a fresh cost model can already find a similar route. The learned cost estimator improves substantially, but the navigation-cost advantage of learning is small on this test. Three learning seeds are not a comprehensive robustness study; test network seeds are held fixed to make comparisons paired.

The old Graph Dance used phase agreement without a useful goal signal; this experiment distributes goal-directed cost-to-go estimates. A high consistency score is a check of the local Bellman relation, not evidence of universal intelligence. The numeric phase coherence is tracked independently.

Saved JSON benchmarks: `results/benchmark-150ep-33nodes-24worlds-seed{17,55,83}.json`.

## Next unanswered questions

- Can each node **learn the message-update rule** or invent a better coordinate system rather than using fixed min-plus propagation?
- Does the learned cost model help in more challenging worlds with cost-regime shifts, restricted sensors and dynamic edges?
- Does useful information transfer across graph generators and, eventually, to other classes of problems?
- How stable is uninterrupted infinite training on a specific Android device under thermal and OS constraints?

Use the held-out test and repeat with multiple world families before claiming a universal solution-form predictor.
