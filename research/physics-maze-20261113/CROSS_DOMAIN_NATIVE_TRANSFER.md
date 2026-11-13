# Classically experienced action → quantum measurements: native original-organism transfer
## Status: executed 2026-11-13; NO NEW PHYSICS LAW

This investigation extends the **original V17 Discoverer** by a small within-organism continuous-action body. The original `shapeGraph()` selects every action of each imagined future route. The extension `PhysicsDiscoverer` stores observed state changes in the same agent instance; it is NOT a substitute predictor attached to a UI. The original physics and maze source is untouched.

Source: original `ac205b5bc561274b957584a7dee058a1110ab6f8` in experiment's isolated branch.
Rerun:
```sh
node research/physics-maze-20261113/run-cross-domain.mjs
```

### Data separation
Training source: 3 *classical oscillators*, 512 physically measured (x,p) action transitions each, with different unknown m, omega and amplitudes. Unlabeled observation clouds allow the native organ to infer center and relative scale. No quantum data enters this causal motor learning.

Target: a separate simulated quantum interferometer with two complementary detectors, where observable channels are the photon contrasts at two analyzer settings. The agent gets 256 unlabeled detector snapshots to infer the target sensor scale, and **one paired quantum motor probe** to determine the sign of the local coordinate orientation. It does not see target detector probabilities for any of the 1536 heldout forecasting cases. The previously learned classical action motor stays frozen.

`Discoverer.shapeGraph()` navigates each future action chain, and the organism's new causal-action organ propagates the physical observation according to its learned motor.

### Results, measured on 128 distinct test initializations and 12 action steps each
- Trained native maze episodes solved: **149/160**.
- Learned classical action body motor (real and imaginary): `0.973648, -0.228054`.
- Causal classical→quantum transfer MAE: **0.026393** in D0 photon probability.
- Static/phase-blind baseline MAE on identical test: **0.386451**.
- Orientation uncalibrated MAE: **0.480246**.
- Classical causal pairs shuffled, full source-organ trained on scrambled data, then quantum forecast MAE: **0.406503**.
- Random unseen action strength mismatch MAE: **0.065526** (expect failure).
- Quantum orientation setting learned from one physical before/after observation: `-1`. The recorded raw `result` contains calibration errors and example exact comparisons.

### Interpretation
Positive: causal learning from an oscillator's observed changes in a learned 2D normalized physical observation space can transfer to predicting interferometer detector probability evolution on unseen phases without being fit on those quantum target outcomes. Corrected phase orientation is required. Native graph shape controls the rollout; a new body organ carries metric action effects.

Limitations: this is **NOT** discovery of a new law. Cyclic rotations are already known common mathematics; they were built into the classical and quantum simulators via the chosen shared physical actuator. The observables were explicitly chosen to expose two quadratures. A one-step quantum probe supplies handedness; quantum sensor scale requires unlabeled quantum calibration. The new motor uses existing dot/cross correlation and norm-preserving complex multiplication; it is **not** an undiscovered physical operator. This is a demonstration of cross-domain **project-level mechanism transfer** conditional on a shared cyclic physical structure, not a unification of quantum and Newtonian gravity. An action-rate mismatch and irregular phase-world failures are recorded intentionally.

A strong next gate: extend the *same* organism to discover which physical transformations preserve a common invariant under changing actuator durations, nonharmonic potentials, energy-changing systems and weak-field relativity without hardcoded operator families. For a new law, predictions must beat known-physics baselines (not only a static one).
