# Octopus NodeGraph V2 — Universal Runtime Input Contract

Branch: OCTOPUS-NODEGRAPH-LIVE-SIGNALS-COLOR-CONTRACT-V2-20261005

The graph uses one semantic color per runtime channel. A different task can replace the physical 2D source by supplying the same channels. The downstream cards and visualizers do not need to know whether the source was CUDA Same-Dish, text, audio, another simulator, or another environment.

| Channel | Color | Minimum 2D | Full replacement | Required payload |
|---|---|---:|---:|---|
| WORLD | #32C7FF | yes | yes | mapKind, episode, phase, source |
| GRID | #4C8DFF | yes | yes | w, h, free[] |
| WALLS | #7F8CA8 | derivable | yes | blocked cells or wall bitmap |
| CELLS | #00D9B8 | yes | yes | x, y, group, organismId, localCell |
| ORGANISMS | #9A6CFF | yes | yes | id, species/group, cell indices |
| TOPOLOGY | #F4B942 | derivable | yes | cells/body, organism counts, physical cell count |
| ACTIONS | #FF7A45 | no | yes | chosen/requested action per organism/cell, optional confidence |
| MOVEMENT | #9BE15D | no | yes | actual dx/dy, accepted, effect |
| COLLISIONS | #FF4D6D | no | yes | rejected/contact event and reason |
| TARGET | #32E67B | yes | yes | x/y or edge+plane, optional band/label |
| RESISTANCE | #D46BFF | no | yes | discoveries, coverage, boundary/frontier, redundancy, optional field |
| REWARD | #FFD166 | no | yes | species or per-organism reward and optional components |
| CONCEPTS | #FF79C6 | no | yes | active concept ids, scores, affordance, optional atlas coordinates |
| SENSORS | #21D4D4 | no | yes | raw learner-visible channels |
| OUTCOME | #F3F4F6 | no | yes | success, failure, terminal, reason |
| FRAME | #65E4FF | yes | yes | synchronized snapshot clock / jointStep / timestamp |

Minimum spatial replacement is WORLD + GRID + CELLS + ORGANISMS + TARGET + FRAME. WALLS and TOPOLOGY can be derived when GRID/CELLS/ORGANISMS are complete.

Full replacement means supplying the complete 16-channel surface so every existing card can be driven without depending on the original 2D environment.

Live signal behavior:
- every new runtime snapshot emits a signal cascade from the source;
- socket and edge color always follows the semantic channel above;
- animated packets travel along the actual graph edge;
- destination cards pulse when the packet arrives;
- path heat accumulates from real activations;
- PAUSE queues snapshots;
- STEP EVENT consumes one queued snapshot cascade;
- LIVE resumes and consumes the latest queued state.

Native CUDA V4 currently does not expose raw learner sensor channels, so SENSORS is marked unavailable rather than synthesized.
