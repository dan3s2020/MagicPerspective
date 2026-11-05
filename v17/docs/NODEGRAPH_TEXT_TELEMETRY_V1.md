# NodeGraph Text Telemetry Contract V1

Branch: OCTOPUS-NODEGRAPH-COMFY-CARDS-V1-20261005

The text adapter is independent from the text learner. A trainer emits telemetry; NodeGraph projects that telemetry into the same typed graph and 2D representation used by physical Same-Dish telemetry.

## Event fields

- sampleId: stable training sample identifier
- step: current training/inference step
- text: current source sequence
- cursor: current position in the sequence
- target: correct next token, character, or concept
- targetKind: token or concept
- candidates: candidate outputs with probability and correct flag
- loss: current prediction loss
- reward: current training reward if one exists
- conceptId / conceptScore: optional active concept telemetry

## Spatial mapping

- correct token or concept -> target at the end of the projected 2D world
- wrong candidate -> resistance branch; sufficiently strong resistance may render as wall
- training cursor -> organism progress through the projected world
- active concept -> checkpoint
- candidate probabilities -> branch resistance
- lower prediction error can be represented as a lower-resistance route

This is a representation/visualization layer. It does not grant the underlying learner privileged target information unless a trainer explicitly chooses to consume the projection.

## Node.js trainer integration

Import createTextTelemetryClient from map-cells/nodegraph/text-telemetry-client.mjs, create a client with the NodeGraph server base URL, then call client.emit(event) at the telemetry cadence you want.

Default endpoint:

POST /api/nodegraph/text/event

Projection-only endpoint:

POST /api/nodegraph/text/project

Current event:

GET /api/nodegraph/text/latest

## Independent visualizer modules

Visualizer cards register through map-cells/nodegraph/nodegraph-module-registry.js.

A module provides an id, one or more nodeTypes, mount(element, context), and update(element, context).

Current modules:

- modules/replay2d-module.js
- modules/metrics-module.js

New visualizers can be attached without editing Same-Dish physics, the text learner, or the text-to-spatial adapter.
