# Graph Dance Experiment — experimental evidence

This file records measured results without assuming that synchronization improves intelligence.

## Hypotheses

**H1:** Local observations can train a reusable probabilistic association rule for previously unseen networks.

**H2:** Confirmed-neighbor phase coupling can create genuine distributed synchronization.

**H3:** Using synchronization within the solution-shape decoder improves success or penalized cost compared to the same trained rule with dance disabled.

These are distinct claims. H1/H2 do not establish H3.

## How to measure

Run `npm test` and `node scripts-benchmark.mjs 120 33 12`. The benchmark outputs `results/benchmark.json` (local, uncommitted); it uses separate validation and blind-test seeds. The benchmark reports association balanced BCE, initial shape F1, success, cost including failed episodes, synchronization, and number of updates. The evaluator's oracle path is used only for scoring.

## Scope and weaknesses

The association predictor is logistic regression with nine geometric/index features and local binary targets; it is not self-invented logic. Phase updates use a fixed Kuramoto-like local coupling rule, and the hypothetical solution uses Dijkstra on learned edge costs plus phase penalties. The first route can include false edges. This benchmark demonstrates a mechanism, not an entity from a higher physical dimension.

## First independent experiment — 2026-11-03

Command: `node scripts-benchmark.mjs 120 33 12` (one training initialization, 12 previously unseen evaluation worlds, three generator rules). The reproducible result is committed as `results/benchmark-120ep-33nodes-12worlds.json`.

| Variant | Success | Penalized cost ↓ | First route F1 ↑ | Local synchronization |
|---|---:|---:|---:|---:|
| Learned association + dance + online | 100% | 19.833 | 0.1369 | 0.9453 |
| Learned association + dance + frozen | 100% | 19.583 | 0.1369 | 0.9463 |
| Learned association, **without dance** | 100% | **19.250** | 0.1369 | 0.2648 |
| Untrained association + dance | 100% | 23.500 | 0.1293 | 0.9458 |

The learned association rule's balanced BCE on held-out links improved compared to its untrained initialization (exact before/after available in JSON). **The dance successfully synchronizes local phases but does not improve navigation in this trial; the no-dance control is faster.** Navigation claims require repeated seeds and larger, independent workloads. Phase agreement and problem-solving are different measurements.
