# V2 evidence — 2026-11-03

## Scope

A clean-room, dependency-free Node.js model, **not** inherited Octopus code. V1 is preserved under the repository root; V2 code and checkpoints live only under `v2/`. This is a *real trainable experimental baseline*, **not** proof of generally intelligent perspective invention, universal optimization, or P=NP.

## Verification

- `npm test`: **11/11 passing** (Node 22). Tests include seeded multi-family solvability, strict 3×3 sensing, initial prediction before action, current-position reference labels, no observed-wall traversal, independent causal model learning, restore, blind deterministic tests and trainability.
- HTTP smoke test: `/api/health`, `/api/state`, `/api/step`, and `/api/train` successfully served. A 120-episode training run produced a saved checkpoint, completed held-out evaluation, and did not report errors.
- Reproducible negative-control experiment: `node scripts-ablation.mjs 1200` uses three evaluation sizes and three world families on held-out seeds.
- The selected checkpoint uses validation seeds `980001+...`, not test seeds `990031+...`. See attached machine-readable `results/ablation-1200.json`.

| Unseen maze size | Trained model BCE | Geometric BCE | Shuffled-label BCE | Trained route avg effort | Geometric route avg effort | Exact oracle effort |
|---|---:|---:|---:|---:|---:|---:|
| 7 × 7 | 0.32187 | 0.33593 | 0.47273 | 16.217 | 17.667 | 13.583 |
| 11 × 11 | 0.36825 | 0.39783 | 0.42530 | 35.867 | **35.650** | 26.050 |
| 15 × 15 | 0.34321 | 0.37937 | 0.37791 | 71.575 | 72.442 | 49.392 |

*Each row: 72 unseen worlds for BCE, 24 for navigational effort; the model receives the same partial observation as the controls. Test seed `990031`, training 1200 episodes with fresh weights seed 19. Model performance is not uniformly better than geometric planning.*

## Important interpretation

- Lower BCE is genuine evidence of learning the reference route occupancy distribution in this benchmark, but **does not prove better navigation**. On 11 × 11 in this run the geometric planner had lower average effort. Avoid cherry-picking successful cases.
- The model uses a non-recurrent 32-unit learned latent embedding per candidate position, conditioned on a memory of local observations. This is **not** learned automatic discovery of new coordinate systems, nor does it infer arbitrary new problem dimensions.
- The route decoder explicitly runs graph search over the learner's believed map. The neural network does **not** output a self-connected trajectory independently of planning.
- The causal model learns predictable traversal costs from **observed** material and actual effort. A mismatch may exist even when there is no blocked wall. It is a local online predictor, not a full learned physics simulator.
- Checkpoints are selected using a validation metric averaged over 7,11,15 sizes, not by test-set success; the best tested model is retained even if a long training run overfits.
- The experiment is not yet multi-domain (SAT, text, arbitrary state graphs), does not prove an emergent general-purpose self-model, and is CPU-only in Termux.

## Reproduce

```sh
cd v2
npm test
node scripts-benchmark.mjs 1200 11
node scripts-ablation.mjs 1200
bash run-termux.sh
```
