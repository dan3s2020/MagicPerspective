# MagicPerspective V3 — measured experimental evidence (2026-11-03)

## Scope and provenance

Fresh self-supervised **online neural correction** is added in the isolated `v3/` directory. All V1 and V2 paths remain unchanged; previous versions are still runnable. There is no claim of emergent intelligence, automatic invention of new representational dimensions, or P=NP.

V3 keeps the V2 28-dimensional locally derived features, 32-dimensional shared neural encoder, shape head, and explicit Dijkstra route decoder. V3 adds **trainable wall-forecast and effort-forecast heads** on the *same neural encoder* as shape prediction. The wall head predicts previously unobserved tiles BEFORE an action, and updates only when those tiles become visible in the organism's 3×3 sensor. The effort head learns from actually measured movement cost. These local updates change shared weights that are used by the shape head; they do not use the oracle solution. The wall forecast is used as a soft risk term by the hypothetical route decoder, never as a fabricated sensed wall.

During offline training, reference shortest-path masks remain permitted as supervised shape targets, as in V2. Thus it is **not** a fully unsupervised general-purpose model. Local online corrections do not use those labels.

## Reproduced local evidence

`npm test`: **20 / 20 PASS**, Node.js v22. Includes V2's original 11 tests, fresh self-supervised neural-updates test, equal-observation online-vs-frozen tests, no-evaluation-mutation test, checkpoint restoration, soft wall-risk effect, and deterministic replay.

HTTP smoke: `/api/health`, `/api/state`, `/api/step`, `/api/train` (35 fresh episodes), `/api/evaluate` succeeded. Actual persistent `best-checkpoint.json` and `live-checkpoint.json` were produced and restored successfully. Port: `3032` (V1 3030, V2 3031 are unaffected).

The 400-episode ablation uses fresh weights (seed 19) and held-out test world seeds 990031, with independent validation seeds 980001. 24 held-out worlds per size (7, 11, 15), same procedural world families and initial conditions. Full machine output in `results/v3-ablation-400.json`.

| World size | Initial-epoch neural BCE | Selected trained neural BCE | Geometric BCE | Online route cost | Frozen-neural route cost | Geometric cost |
| --- | --- | --- | --- | --- | --- | --- |
| 7×7 | — | 0.41243 | **0.40163** | 14.717 | 14.717 | 17.667 |
| 11×11 | 0.98364 (pooled pretraining baseline) | **0.39571** | 0.40446 | 35.567 | 35.567 | 35.650 |
| 15×15 | — | **0.38848** | 0.42291 | 68.958 | 68.992 | 72.442 |

The `0.98364` before-training figure is specific to an 11×11 mixed-family seeded baseline. It is not the initial BCE for 7×7 or 15×15. Best checkpoint selected after **200/400** episodes, based on independent multi-size validation BCE. Each route comparison uses 24 worlds and 100% reported success on these sets. Small differences and sample sizes are NOT proof of robust superiority.

**Key negative result:** online neural adaptation has **NOT** been shown to improve navigation reliably over a frozen-neural control: the 7×7 and 11×11 measured mean costs are identical; 15×15 differs only by 0.034 units. This is reported plainly. The present positive proof is that feedback genuinely updates the neural parameters and changes subsequent model outputs. Better decision quality remains unproven.

## Correct scoring semantics

- `initial.bce`: frozen step-zero error relative to the original path from the original starting position.
- `metrics.bce`: current-step error against a NEW path from the current position (not comparable with initial because the task gets easier as the goal approaches).
- `anchoredMetrics.bce`: score against the original reference path at every step. This holds the target fixed, but changing position and observation still change the prediction, so it is not a pure measurement of weight-update learning.
- `neuralCorrection`: before/after change in probabilities caused ONLY by online weight updates, holding belief, position and goal exactly fixed at the same post-observation state.
- `neuralOnlineUpdates`, `wallSamples`, `effortSamples`: counts of applied self-supervised neural updates; not correctness scores.
- The direct **online vs frozen** evaluation clones neural weights for each world and freezes the neural weights for the comparator. Both arms still update the separate causal-effort predictor equally. The persistent master weights are never mutated by evaluation.

## Architecture limitations

V3 is still a maze-family model and still uses Dijkstra decoding; it cannot be called a universal perspective builder or SAT solver. Wall physics and costs are programmatic, and local sensors expose the immediately adjacent walls; collisions can be zero for legitimate reasons. The structural cause of a world mismatch can be observed without a collision (e.g. newly visible unknown obstacles), and the current wall/effort heads capture only local uncertainty.

## Reproduction (Termux or Node.js 18+)

```bash
cd ~/MagicPerspective
bash v3/run-termux.sh
```

Open `http://127.0.0.1:3032`. Testing from another terminal:

```bash
cd ~/MagicPerspective/v3
npm test
node scripts-online-ablation.mjs 400
```

Increasing the episode count alone does not prove improvement. Add more world families, causal dynamics with changing rules, fair capacity/compute ablations, uncertainty calibration, and independent cross-domain transfer tests before making stronger claims.
