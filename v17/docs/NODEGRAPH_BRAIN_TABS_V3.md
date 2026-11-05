# NodeGraph V3 — Workflow + Brain Tabs

Branch: OCTOPUS-NODEGRAPH-BRAIN-TABS-V3-20261005

Two persistent graph screens share the same live runtime but keep independent graph state, pan/zoom, selection, heat and local save slots.

## Tab 1 — WORKFLOW / SIGNAL FLOW

The existing V2 workflow remains the environment/input graph: world, grid, walls, cells, organisms, topology, actions, movement, collisions, target, resistance, reward, concepts, sensors, outcome and replay.

## Tab 2 — BRAIN / ORGANISM INTERNALS

The second graph exposes:
- shared runtime/GPU/training counters
- shared environment, target, resistance and movement
- A↔B observable coupling / OTHER channel
- separate A and B Local Brain nodes
- separate A and B Policy / Decision nodes
- separate A and B R / Reward nodes
- separate A and B Concept Flow nodes
- separate A and B Atlas / Memory nodes
- separate A and B Perspective / Sensors nodes
- separate A and B Outcome nodes
- ALL VARIABLES / RAW TELEMETRY board

The workflow graph is not destroyed when switching tabs. Its object graph, view transform, selection and heat are stored separately in memory.

## Honesty rule

CUDA V4 currently does not expose persistent Local Brain, real learned R, Concept Flow, Atlas or raw sensor channels. Those nodes are present because they are part of the architecture, but they display MISSING until the runtime supplies those values. Derived policy/movement data remains explicitly marked DERIVED.
