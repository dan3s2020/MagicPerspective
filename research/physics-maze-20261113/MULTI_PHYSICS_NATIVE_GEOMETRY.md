# Five physical regimes, ONE original organism — learned action geometry
**2026-11-13** | NO NEW LAW FOUND

## Architecture
An original native V17 `Discoverer` lives 160 real original maze exercises, then retains multiple physical action memories in the *same organism*. At test time `Discoverer.shapeGraph()` chooses **all** actions. This version adds `GeometryDiscoverer.livedIntervention` recording precisely **two distinct before/after physical experiences** for each environment, and `physicallyPredictedConsequence` recovering their local 2D oriented-area relation for future states; no physics-specific transition equation appears in the organism.

A globally linear 2D transformation is a **researcher-supplied assumption**: two vectors form a basis and their observed images determine the full linear operator. That's standard linear algebra, not new physics. The original learned direction/attractor movement and shape graph remain intact. World equations remain solely in external simulator and independent evaluator.

## Results — 128 heldout initial states × 12 unseen steps in each regime

| Physical regime | Measured physical pairs | Learned geometry class | Learned det | Mean vector error | Static baseline error |
|---|---:|---|---:|---:|---:|
| oscillator | 2 | elliptic | 1.00000000 | 1.389668e-15 | 4.284487 |
| quantum_interferometer | 2 | elliptic | 1.00000000 | 1.614996e-15 | 1.459028 |
| special_relativity | 2 | hyperbolic | 1.00000000 | 1.868071e-14 | 16.868665 |
| free_newtonian | 2 | parabolic | 1.00000000 | 6.430507e-16 | 1.553454 |
| nonlinear_quartic | 2 | elliptic | 1.14697560 | 2.028048e+0 | 2.546916 |

There are 1536 unseen forecasts **per regime** = 7680 heldout state forecasts. The original organism was never given their true outputs during action or training. Physical simulators respectively used an exact harmonic oscillator, independent 2-port quantum probability amplitudes, 1+1D Lorentz boosts, inertial free motion, and an RK4 quartic anharmonic oscillator.

### What worked
- One common physical action body, still part of original `Discoverer`, learned elliptic, hyperbolic and parabolic linear transformation signatures from consequences rather than being told which type each environment was.
- Selected *classical oscillator ↔ quantum optical contrast*: elliptic two-dimensional transport.
- *Special relativity*: hyperbolic metric-preserving boosts (not gravity).
- *Newtonian free particle*: parabolic shear.

### What failed, and why it matters
- The **nonlinear quartic oscillator** violates the preselected global-linear-action family. A model induced from two local interventions cannot infer different effects at unseen amplitudes; the quantitative heldout error is recorded. This failure is a compulsory no-false-unification control.
- An exact shared 2×2 matrix can represent these known simple systems, but cannot therefore solve curved-spacetime Einstein equations, full quantum measurements, nonlinear turbulence or Yang–Mills.
- The `context` is an observed environment identifier. The learner is **not yet** autonomously grouping different physical worlds by a common transformation and transferring the same learned law to an unknown world.

## Next concrete research gate
Keep the same agent and `shapeGraph`, but allow it to discover *locally changing* causal transformations from its actual observations instead of assuming a globally linear law. Demand blind nonharmonic forecasts, large-amplitude and long-horizon tests, noise, physical conservation and source-shuffled ablations. Then test whether local dynamics can reproduce Lorentz and quantum limits without labeled domains.

Run:
```sh
node research/physics-maze-20261113/run-multi-physics.mjs
```
