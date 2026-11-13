# Open-physics maze atlas — November 13, 2026
**Scope:** a practical, falsifiable research index of major unsolved or unsettled questions in physics, NOT a claim to enumerate every open question. This file adds *targets and acceptance gates*, not experimental results or a new physical law.

## Original-organism research contract
- Preserve original V17 `Brain`, `Discoverer`, `shape()`, `shapeGraph()`, original `playExercise()`, its learned physical action/repulsion/attraction, saved brain state, and original body. No conventional optimizer may be passed off as the agent.
- Use the original one organism to observe **real physical state transitions** (numerical world or measurement), form a pre-action solution shape, choose actions where possible, and learn from resulting resistance. Keep the actual world equations **outside** its observations and action selection.
- *Experiment design* may use known physics to generate controlled worlds and independently score results. However, do not confuse supplied physical constraints, oracle target nodes, simulator equations, or known-answer interpolation with discovery.
- Each claim needs independent test worlds, held-out conditions, quantitative observables, no hidden target leakage, comparisons with correct standard-physics predictions and simplified baselines, physical-invariant gates, noise and causal ablations.
- Physics unification must reproduce existing Newtonian mechanics (appropriate limit), special/general relativity, quantum mechanics/Born normalization, gauge/field constraints, measured constants as necessary, and experimentally established phenomenology. Any novel universal equation must make a **falsifiable, independent prediction**.

## Candidate physics-world families and acceptance criteria

The `input → maze action → observable → stringent test` entries describe suggested research extensions and may **not** be implemented yet. Ranking favors bridge phenomena with independent numerical verification and reuse of the original agent.

| Priority | Frontier | Physical world for the ORIGINAL organism | Blind metric / possible falsification |
|---|---|---|---|
| A1 | Classical ↔ quantum correspondence | Oscillator and anharmonic trajectories with observed positions, momenta, action effects | Future states vs direct Schrödinger and Newton solvers; correct semiclassical limit |
| A1 | Quantum interference / measurement | Phase-control knob, two paths, photon detector counts, genuine action history | Born frequencies over unseen phase increments; phase-shuffled and phase-blind controls |
| A1 | Quantum tunneling | Barrier width/height interventions and repeated transmission detections | Predict heldout transmission curves including rare events, not just a marked route |
| A1 | Classical and quantum chaotic dynamics | Pendulum/kicked rotor and quantum maps with observed energies and correlations | Heldout transition statistics, noise sensitivity, conservation/unitarity |
| A1 | Newtonian ↔ relativistic mechanics | Low-velocity and high-velocity trajectory worlds with known clock observations | Correct Lorentz kinematics, energy–momentum relation, c-limited signals |
| A1 | Newtonian ↔ curved spacetime | Weak gravity orbits, redshift, deflection in curved-metric environments | GR geodesic predictions and Newtonian weak-field limit, on unseen masses |
| A2 | Quantum fields ↔ curved spacetime | QFT modes with boundaries/cosmological expansion; horizon analog systems | State-dependent particle-count predictions vs QFT-in-curved-spacetime |
| A2 | Quantum gravity | Gravitationally interacting quantum test masses or semiclassical toy settings | New quantitative causal prediction distinguishable from both GR and QM baselines |
| A2 | Black-hole information | Reversible scrambling / horizon entropy analogs in observed unitary circuits | Heldout entanglement entropy, correlation recovery, no state leakage |
| A2 | Quantum measurement / Born rule | Repeated measurements with controllable preparation and detector setting | Calibrated outcome distribution, contextuality constraints, no path-only claims |
| A2 | Bell nonlocal correlations | Entangled-pair local settings and paired measured events | CHSH ranges, no-signalling, versus local hidden-variable baseline |
| A2 | QFT vacuum / Casimir | Change boundaries/materials, observe forces and correlations | Measured force scaling and known limits; no input of answer labels |
| A2 | Strong-interaction confinement | Small lattice gauge theory with observable loops and flux patterns | Area/perimeter behavior, gauge invariance, heldout coupling |
| A2 | Yang–Mills mass gap | Gauge-invariant correlation and spectral data on finite lattices | Quantitative finite-size extrapolation; finite-lattice gap ≠ rigorous 4D proof |
| A2 | High-T superconductivity | Different lattice/doping/temperature worlds with measured pair correlations | Heldout critical behavior and material-specific observables |
| A2 | Many-body emergence | Spin chains, critical transitions, topological materials | Unseen phase boundary/correlation exponents with ablations |
| A2 | Arrow of time / entropy | Reversible microscopic dynamics with coarse-grained observations | Entropy growth, detailed balance, distinguish hidden initial conditions |
| A2 | Turbulence / intermittency | Multi-scale fluid data with controlled Reynolds number, viscosity | Predict energy spectra, transfer, intermittency and out-of-distribution conditions |
| B | Navier–Stokes existence and smoothness | High-resolution vortex dynamics; audit any proposed singularity witnesses | Rigorous proof verification, **not** just numerical blow-up; 2026 apparent solution under review |
| B | Classical gravitational three-body chaos | Hidden initial-condition perturbations in bounded orbital worlds | Long/short horizon predictions, Lyapunov errors, conserved energy/angular momentum |
| B | Dark matter | Rotation, lensing, clustering, dwarf galaxies | Joint unseen predictions superior to alternative gravity and CDM reference baselines |
| B | Dark energy | Expansion distance-redshift data, CMB/BAO/SNe constraints | Heldout distances, growth, covariance-aware fit and model selection |
| B | Hubble tension | Low-z distance ladder + early-universe CMB calibration | Joint likelihood with nuisance parameters, no cross-dataset cherry picking |
| B | Matter–antimatter asymmetry | Symmetry-violating reaction networks, thermal history | Measured baryon asymmetry with measured reaction constraints |
| B | Neutrino mass/origin | Oscillations over different baselines/energies and flavor channels | Heldout energy-dependent rates, mass ordering and CP phase if identifiable |
| B | Hierarchy / vacuum-energy problem | Renormalization scale transformations and measured low-energy couplings | Predict dimensionless observables without hidden fine-tuned inputs |
| B | Inflation / initial conditions | Primordial fluctuation spectra and cosmic evolution | Independent CMB spectrum/polarization predictions, not post-fit reproduction |
| B | Strong CP problem | Symmetry-violating observables and low-energy effective interactions | Independent EDM bounds and testable new signal |
| B | Origin of fundamental constants | Mixed experimental datasets and running couplings | Actual unseen constants/relations with correct units and uncertainties |

## FIRST completed tranche: what the tests genuinely establish
- `research/physics-maze-20261113/results.json`: native 160-episode maze experience (149 solved, seed17), phase-blind fail, evenly spaced phase graph interpolation (12/12 majority classifications), rectangular-barrier simulated transmissions, independent known-law oscillator correspondence.
- `research/physics-maze-20261113/phase-control-results.json`: native organism initialized at 8 seeds; 10 scrambled sensory-code phase worlds; 32 physical action observations per world; 120/120 heldout detector majorities; 40 nonuniform-phase worlds only 9.775/12 mean, 7/40 perfect.
- Nothing here demonstrates an undiscovered law, physical experiment, universal physical solver, quantum amplitudes or GR unification.
- **Precise discovered implementation limitation:** the original four-kind positive-attraction topological shape does not encode physical phase increments or complex interfering amplitudes. A phase circle and two calibration outcomes enable categorical interpolation only.
- A credible next organism-specific extension would make the *intervention consequences on phase and measured detector outcomes* part of its OWN learned causal state. No hardcoded phase function should be inserted into the chooser. Test phase increments unseen, unequal and noisy, then the same action-change mechanism on clocks, oscillators and gravitational orbits. Keep original `shapeGraph()` operator and native checkpoint.
- A second required experiment must distinguish topological knowledge from metric learning using unequal phase steps, noisy phase drift, hidden device recalibration and shot-limited observations. Any claimed rule needs quantitative probabilities not just classification.

## Review note on Navier–Stokes (2026)
On September 8, 2026 OpenAI published a claimed solution/formalization of Navier–Stokes existence/smoothness. On September 11, 2026 the Clay Mathematics Institute said it *apparently* had been settled and would use an unhurried evaluation process. Therefore treat the longstanding mathematical problem as **a live verification/acceptance question**, not a simply unattempted problem; fluid turbulence phenomenology remains a distinct research frontier.

## Public sources (research status, NOT model results)
- https://home.cern/science/physics/standard-model
- https://home.cern/science/accelerators/future-circular-collider/science-goals/
- https://www.fnal.gov/pub/science/questions/
- https://www.claymath.org/news/navier-stokes-announcement/
- https://openai.com/index/navier-stokes-solution/
- https://www.claymath.org/millennium-problems/yang-mills-and-mass-gap
- https://science.nasa.gov/mission/hubble/science/science-highlights/hubble-tension/
