# MagicPerspective V42 — Seven Read-Only Scientific Observatories (2026-11-08)

Isolated branch: experiment/V42-SEVEN-SCIENCE-OBSERVATORIES-20261108
Unmodified baseline: perf/V42-FAST-EXACT-CPU-RESUME-V41FAST-20261107

## Non-negotiable scientific boundaries

The original native Brain, training, CUDA kernel, solver, checkpoint, resume mechanism and all non-graph UI controls are unchanged. Only the left graph's display and read-only browser measurement hooks are added. Never confuse a pretty shape with proof of an emergent physical mechanism.

### Seven panels and exact provenance

1. Graph eigenmodes — 28-node sampled undirected/unweighted graph Laplacian of ORIGINAL /graph edges or actual native xD finite-world links. NOT physical quantum energy eigenstates.
2. Phase geometry — ORIGINAL five-periodic-coordinate Geometry.U per symbol. Numeric byte keys in the backend are correctly joined to visible s:byte graph node IDs. Coordinates within [0,1) do NOT establish S3 or Hopf fibration.
3. Loops — undirected cycle rank E - V + C and real fundamental graph cycles on the sampled graph. A cycle is not proof of a three-dimensional Hopf link. Linking number NOT verified.
4. Dynamical activity — L2 displacement and recurrence of sampled ORIGINAL node-activity vectors. Duplicate polling snapshots are not treated as oscillations. The graph snapshot is downsampled and may be stale during GPU work.
5. xD -> 2D observation — when available, read /graph.xdAtlas.last.atlas.fullWorld. Project the actual binary seven-axis finite-world states into a two-dimensional view. This is an OBSERVER projection, not a proven internal dimensional-unfolding operation.
6. Actual transformations — compare native shared.training.trace predicted versus observed values; in original xD worlds show every predicted-after-state versus real observed-after-state from actual execution.frames, including failures.
7. First solution shape — original xD plan initialPredictedSolution before any execution compared with actual execution.frames; otherwise the pre-action frozen maze plan versus real executed path from /eval.

Missing data is explicitly marked unavailable. No placeholder mathematical particles, hidden solver, random datasets, synthetic training streams or invented results are inserted.

### What the xD organism genuinely does

Original source: v17/transcend/torus-aether/worlds/full-xd-maze-atlas.mjs.
The original controlled world has 128 finite states (2^7) and seven active axes located inside a nominal 16–2048+ dimensional ambient coordinate index. The complete finite topology and walls are initially visible; unknown action-to-axis mappings are learned by observing actual simulator interventions. LearnedXDActionAtlas then uses a graph search over the supplied finite map and experimentally learned action mapping to predict a complete route before execution. Actual actions verify or falsify that prediction. This does not imply enumeration of the entire 2^2048 hypercube or arbitrary natural-language competence.

### Acceptance tests

- New unit tests: v17/apps/hypermaze-studio-v26/tests/science-core.test.mjs. Numeric graph/geometry ID mapping, exact path-3 Laplacian spectrum [0,1,3], actual cycle rank, coordinate dimensions, predicted/observed error, no false oscillations on identical polls, pre-action versus executed route separation, actual xD result schema adapter, and missing-data honesty.
- Original source-level integration: v17/tests/complete-xd-maze-atlas.test.mjs. This executes the ORIGINAL xD learner on unseen controlled worlds with negative/mismatch controls. Not a mock produced by the UI.
- Chromium browser integration: v17/apps/hypermaze-studio-v26/tests/native-browser.test.mjs. Loads actual HTTP bridge, displays seven canvases and real native metrics from a fixed API fixture, checks original controls.
- Baseline diff gate: verifies native solver, launcher, training and CUDA code remain unchanged.

Successful initial run: https://github.com/dan3s2020/MagicPerspective/actions/runs/42501312933

### Isolated Windows start

From PowerShell (Git and Node installed), in a new directory:

    git clone --branch experiment/V42-SEVEN-SCIENCE-OBSERVATORIES-20261108 --single-branch https://github.com/dan3s2020/MagicPerspective.git D:\MagicPerspective-V42-SCIENCE
    & D:\MagicPerspective-V42-SCIENCE\v17\START_V42_RESUME_V41_FAST.ps1 -NativePort 8971 -UIPort 8972

Then open http://127.0.0.1:8972/ . The V42 launcher imports a validated saved V41-Fast checkpoint into a separate runtime and refuses ambiguous multiple checkpoint candidates instead of silently choosing the wrong one; specify -SourceCheckpoint only when necessary.

### Further proof requirements

True full-hidden-state time series from the user's Windows checkpoint; eigendecomposition of the actual transition Jacobian rather than only graph Laplacian; perturbation/ablation of identified modes; numerical linking invariants on real 3D embeddings with appropriate null models; endogenous learner-produced unfolding coordinates; held-out domain-general tests and competitive baselines. No claims of a perfect solver or physical quantum/Hopf computation are currently justified by these tests.
