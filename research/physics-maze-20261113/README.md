# Physics-maze research — 2026-11-13

**Status: executed exploratory benchmark, not a new law.**

**Original source:** MagicPerspective original V17 native `Discoverer` and `playExercise` from `v17/transcend/torus-aether/worlds/exercise.mjs`, with `makeMaze` from the original labyrinth module. Branch deliberately forked from original V17 snapshot `ac205b5bc561274b957584a7dee058a1110ab6f8` because the later rewritten `main` tree no longer has the original V17 tree. **Original source is not modified.**

To rerun from repository root:

```sh
node research/physics-maze-20261113/run.mjs
```

No additional dependencies; Node 18+ required. The script produces the full JSON ledger. `results.json` is the executed snapshot. A V8 tool isolate loaded the unchanged exact native V17 source bodies by stripping module import/export syntax solely for execution; the version committed here uses normal Node imports.

## Explicit physics research targets

- Quantum/classical correspondence: independent coherent-state Fock-basis Schrödinger evolution versus Newtonian harmonic motion (a **known** exact special case of Ehrenfest's theorem).
- Interferometry: phase-sensitive quantum outcomes compared with phase-blind original shape navigation.
- Sub-barrier tunneling: exact textbook rectangular-barrier transmission probabilities, simulated 512-shot interventions and physically observed transition edges.
- Phase-lifted state navigation: same original `Discoverer.shapeGraph`, supplied periodic phase adjacency, observed endpoints at phases 0 and pi; frozen outcomes at 12 other phase values.
- Controls: phase-blind graph, 200 shuffled maps of observed physical phase to ring coordinates, no directly supplied test outcomes.

### Observed results

| Test | Result | Interpretation |
|---|---:|---|
| Original native labyrinth experience | 149/160 solved | Genuine original organism action/learning |
| Learned attraction to goal | 0.993289 | Learned label-based attraction |
| Learned wall conductance | 0.142857 | Learned repulsion |
| Phase-blind interferometer | Same path under 0 and pi | Original observer cannot distinguish quantum phases |
| Phase-lifted heldout most-likely detector | 12/12 | **Conditional interpolation** on supplied phase circle; not a physical law |
| 200 shuffled phase topology controls | Mean 6.080/12 | Removing phase correspondence degrades accuracy |
| Probability calibration MAE | 0.164388 | Hard route decisions do not learn Born probabilities |
| Quantum tunneling | Nonzero direct route only after an observed success | Inadequate native model for rare quantum amplitude |
| Quantum/Newton oscillator | max |Δx| 4.108e-15, max |Δp| 4.274e-15 | Independent **known-physics** cross-check; no new law |

## Mechanistic finding (scope limited)

The unchanged native organism navigates the *supplied* graph, but physical phase is essential for interference; removing it makes classically identical maps quantum-mechanically distinguishable. Its current four-kind attraction field uses nonnegative scalar scores and cannot by itself sum complex path amplitudes and generate destructive interference. The phase ring result demonstrates *conditionally useful geometry encoding* with 12 unseen angular values; **we prescribed the phase circle** and marked targets using observed calibration outcomes. The organism neither discovered the physical phase equation nor predicted photon probabilities.

This is a useful falsification of equating graph reachability with a unification of quantum and Newtonian laws.

## A stringent actual-discovery gate for future experiments

A candidate new law must be expressed without supplying the true test answer or a target path; fit *only* genuinely observed interventions; predict quantitatively independent heldout observables, not just graph reachability; beat exact existing baselines and phase-shuffled controls; respect unitarity, normalization, conservation laws and correct low-energy Newtonian/QFT limits; and yield a new testable prediction rather than merely redescribing known relationships. These experiments do not pass that gate.

Relevant background: CERN Standard Model overview; Perimeter quantum gravity program; Ehrenfest theorem; rectangular-barrier tunneling. Current uncertainty: no donor GGUF absorption or full original Braivour run was performed for this physics task.
