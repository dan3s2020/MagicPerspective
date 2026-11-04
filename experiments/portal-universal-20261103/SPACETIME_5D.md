# MagicPerspective — Explorator 5D spațiu–timp (2026-11-05)

**Scope:** additive, read-only viewer for the **existing** Portal Universal engine in `experiments/portal-universal-20261103/`. The original 4D viewer, 3D mode, training controls, CUDA, checkpoint format, and SQLite trace schema remain unchanged. No physical 5D entity is claimed.

## Run

Start the original Portal Universal server using its existing launcher (`START_PORTAL_UNIVERSAL_CUDA.ps1` in this experiment), then open `http://127.0.0.1:3050/spacetime.html`. The 5D viewer opens from a new link in the original dashboard, and can stay open during training.

Enable **Capture** before starting training: 5D event occurrences come only from genuine SQLite `trace` rows. Without recorded traces, the canvas explicitly reports that there is no evidence. This viewer does **not** create data, train the model or alter existing saved weights.

## Semantics

- 4 spatial display coordinates `p4=[x,y,z,w]` come from the original Portal graph, unchanged. Its `solid_torus4_position` currently hashes many labels, so this spatial embedding is deterministic visualization geometry, **not a measured/learned physical or latent 4D manifold**.
- `T` is the *recorded SQLite trace ID*. It is a monotonic event-order coordinate; it is **not seconds or absolute clock time**. Some episodes have unrecorded intervals (Capture off), and there can be gaps after checkpoint recovery. The viewer never fills these with imagined data.
- The mathematical display space is `(S¹×B³)×T`, a 4D solid torus with an event-order axis. All ten plane rotations for five coordinates are present: XY XZ XW XT YZ YW YT ZW ZT WT. Rotation is an observer operation, not physical Lorentz geometry.
- 5D → 4D → 3D → 2D projection is an explicit, reproducible camera transform; W remains independent of T. Camera centering uses five axes and all ten rotation sliders.
- Time-window histogram counts exactly observed entries in indexed SQLite ranges; a small window returns complete frames, a large one returns actual sparse samples with a visible *sampled* warning. There is no synthetic interpolation in the historical data.
- Active nodes and measured GNN messages appear as event-specific occurrences of the **same persistent graph node IDs**. A dotted identity guide may connect consecutive recorded observations; it is **not a new learned edge**.
- Zoomed-out structural grouping uses heavy-edge matching on existing recorded current graph edges, clearly distinguished as **visual aggregation**, not new neural cells, new synapses or proof of fractality. The grouping uses the current graph for navigation and does not claim to reconstruct historical graph topology at every prior event.
- Zoom is limited by the six-decimal source embedding and JavaScript numeric precision. No mathematically infinite amount of recorded information can be inferred from finite traces. The temporal span reaches one actual event.

## Files

- `spacetime_api.py`: exact, read-only SQLite histograms and sparse genuine event selection.
- `web/spacetime-core.mjs`: pure 5D rotations, projections, time windows and evidence-only graph coarsening.
- `web/spacetime.js`, `.html`, `.css`: 5D viewer and controls.
- `server.py`: two additive `GET` endpoints and static routes; existing routes untouched.
- `tests/test_spacetime.py`, `tests/spacetime.test.mjs`: Python/Node regression tests, no CUDA dependency.

## Validation

Run from `experiments/portal-universal-20261103/`:

```sh
python -m unittest discover -s tests -p 'test_spacetime.py' -v
node --test tests/spacetime.test.mjs
python -m py_compile server.py spacetime_api.py
node --check web/spacetime-core.mjs
node --check web/spacetime.js
```

The existing Portal regression suites must still run on the user's device after installing its PyTorch dependencies. Live RTX/CUDA rendering, load of the user's existing checkpoint, and end-to-end browser acceptance require local validation on that device. Do not conflate pure mathematical tests with successful CUDA runtime acceptance.

## Future work, not silently claimed completed

Learn an embedding from causal graph dynamics instead of hash positions, independently evaluate transfer between mazes/text/networks, implement durable multiresolution topology/history snapshots for ultra-long training runs, study empirical scaling/fractal diagnostics, and preserve the original recorded event ordering when merging multi-run logs.
