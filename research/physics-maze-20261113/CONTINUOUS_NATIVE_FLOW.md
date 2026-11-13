# Same original V17 organism learns a continuous nonlinear physical field
**13 November 2026 — executed physics-world numerical research, not a discovery of a new physics law**

Physical experience: 1024 actual intervention pairs from unknown nonlinear phase-space states, all with action duration 0.035. Original `Discoverer` lives 160 original maze exercises, owns its own local action body, and uses its **unchanged** `shapeGraph` to choose every future macro-action.

The physical simulator's force law is never passed into the agent. The organism learns local normalized action effects from observed before/after differences, then actively composes them in its body to forecast *unseen action durations*. Implementation uses known local triangle interpolation and midpoint integration. This new project capability is **not new fundamental mathematics or quantum gravity**.

128? This evaluation uses **48 heldout physical start states, 8 successive macro-steps each (384 outcomes per condition)** with independent seeds and true RK4 physical reference.

| Unseen macro-action duration | Internal learned-flow MAE | Single physical-step extrapolation MAE | Stationary baseline MAE | Energy drift |
|---:|---:|---:|---:|---:|
| 0.23 | 0.078831 | 0.583034 | 2.002447 | 0.186559 |
| 0.31 | 0.117130 | 1.215912 | 2.300856 | 0.257780 |
| 0.52 | 0.213398 | 5.027343 | 2.163283 | 0.402743 |
| -0.23 | 0.126227 | 0.967235 | 2.084402 | 0.274363 |

**Causal controls**
- Unseen quartic strength (λ=1.15 rather than trained λ=0.6), fixed learned motor: MAE 0.762889; expected degradation.
- Same physical start set but shuffled observed action consequences: MAE 2.615329.
- Full real original organism maze experience replayed in both source and shuffled controls; no fabricated checkpoint.

**Assessment:** A local physical law of motion can be *approximated from the organism's own observations* and propagated across different unknown durations; this operationally fixes the fixed-step geometry's failure without replacing original shape navigation. However, the general family (local interpolation + midpoint composition) is an existing technique, supplied as a structural inductive bias, so any success is an engineering finding about Braivour/MagicPerspective, not an independent new universal physical law.

Run: `node research/physics-maze-20261113/run-continuous.mjs`
