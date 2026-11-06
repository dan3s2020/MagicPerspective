# MagicPerspective V17 — live original UI integration, 2026-11-06

## Empirical user result which triggered this fix (not reinterpreted)

User's actual OpenThoughts run on D:\training\OpenThoughts3-1.2M:
- 10,000 rows in Parquet; 9,984 train and 16 held-out.
- The previous stand-alone trainer ingested **two** records because the 120,000-character cap was consumed by a 50,435-byte and a 63,096-byte example.
- Original solution shape, SR tie-break and lexical retrieval were all F1 **0.2704**, exact **0/8**; SR made **0** decision changes across 11 ties.
- The repetition guard reduced repeated-window rate **0.1061 -> 0.0189** but did not establish substantially improved correctness (F1 0.0674 -> 0.0685).
- Reported goal-reach rate 1.0 was graph reachability of a STORED training answer, not correctness or new semantic reasoning.

The exact user log and complaint are archived in:
verbatim/2026-11-06-USER-REJECTS-2-ROW-SR-NO-EFFECT-NO-LIVE-UI.md

## Changes made (isolated branch only; existing original UI is preserved)

1. Original V17 worker now supports --research on real Parquet world, and compares original Discoverer.shape(), SR tie-breaking, lexical retrieval, original character generation and repetition guard BEFORE this row's Q/A is learned.
2. Original Brain.live learns the full text; a bounded, sidecar, observed Q/A evidence graph receives real text observations in the same worker and uses the exact same original Brain.disc.shape() instance. This graph is not falsely described as a general learned semantic ontology.
3. Original http devour server publishes /research?w=N events per real worker. Every reported progress counter reflects actual bytes, queued CUDA batches or applied training, not a timer-based simulation.
4. Original v17/transcend/torus-aether/ui/index.html includes **Trasee / SR LIVE** alongside existing Antrenare and Evaluare tabs; the original 5D visualizer, all sliders and actions remain unchanged. Added JS charts draw REAL prequential F1 trends, actual number of planner calls, actual SR tie changes, real observed graph nodes/edges, frozen heldout F1 and GPU queue/ready/error state.
5. Original START_V17.ps1 adds optional -Research, -AutoStart, -GpuTextBatch and research snapshot settings. The old default launch still works without research.
6. New START_LIVE_MULTIPATH_V17.ps1 runs real V17 text+maze world, original NestView/UI, original saved Brain and CUDA launcher, with isolated output and port.
7. Optional non-destructive -ImportPrevious allows importing the user's existing 113,531-character V17 Brain, 160 learned maze episodes and the two already-observed real Q/A examples, then continuing after row #1. It preserves the old folder untouched and DOES NOT import prior reported scores as new live scores.
8. Source regression tests and CI startup integration test original V17 worker, Parquet decoding, prequential events, /research, and the original UI assets. CI fixtures are tests ONLY, not language benchmarks or user training data.

## Real run on user's D: volume

Clone isolated branch into a fresh folder:
- https://github.com/dan3s2020/MagicPerspective.git
- branch: experiment/V17-LIVE-MULTIPATH-OBSERVATORY-20261106
- folder: D:\MagicPerspective-Live-Multipath-20261106

Start (using prior V17 checkpoint):
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "D:\MagicPerspective-Live-Multipath-20261106\START_LIVE_MULTIPATH_V17.ps1" -ImportPrevious "D:\MagicPerspective-Multipath-Run" -Gpu "cuda:0"

Original UI with additional research tab: http://127.0.0.1:8874/transcend/torus-aether/ui/index.html?live=1

For a continuation after a graceful stop, run same script with -Resume and OMIT -ImportPrevious.

No fake weights, hidden oracle, dummy benchmarks or decorative graph activity is permitted. If CUDA fails, original START_V17.ps1 FAILS loudly (no secret CPU fallback). CPU can be selected explicitly via -Gpu off.

## Scientific integrity and remaining issues

- Live prequential and frozen held-out scores MUST be read from the user's actual runtime, not from a passing CI test.
- The most recent logged user result shows **no benefit** from SR (F1 same as lexical, 0 changed decisions), so no solution or breakthrough is claimed.
- The observed language-state topology is still made from lexical cues and stored answers. The SR field measures traversability over it, not open-ended compositional semantics. The native 2D maze procedure is still intact.
- This update makes experimental usage/quality visibly measurable and fixes the two-example limit by running the original never-ending V17 worker; it does NOT finish the research problem.
- The original V17 training includes CPU parts even when using CUDA; no unsupported claim of 100% GPU use.
- Existing blocking regression issue #25 remains OPEN.
