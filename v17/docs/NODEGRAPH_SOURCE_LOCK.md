# OCTOPUS NODEGRAPH V1 — SOURCE LOCK

Date: 2026-10-05

Frozen donor branch: SAME-DISH-FROZEN-PRE-NODEGRAPH-20261005
Frozen donor SHA: 79aa54ffd1fdd603f934a74c6c37d4cf0bada099

Implementation branch: OCTOPUS-NODEGRAPH-COMFY-CARDS-V1-20261005

The donor branch is immutable reference state for this experiment.

NodeGraph V1 is an additive representation/visualization layer. It does not redefine the Same-Dish physics or learner.

Core rule:

runtime telemetry -> typed node ports -> adapters -> independent visualizer modules

The same visualizer may consume a physical Same-Dish frame or a spatial projection produced from text telemetry.

Text mapping is a representation adapter. Rendering the correct token/concept as a 2D target does not by itself change what information the underlying learner receives.
