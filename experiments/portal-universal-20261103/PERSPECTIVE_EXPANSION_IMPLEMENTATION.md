# MagicPerspective — Perspective Expansion / As Above, So Below
**Status: experimental, partial implementation — NOT full Verbatim compliance.**

This file is an implementation/audit map, **not** a substitute for the original
chronological conversation. The authoritative source is `VERBATIM_ROOT.md`,
including original words, screenshots, corrections and earlier implementations.
Never mark the full Verbatim gates as passed based on this file.

## Principle
The user's central idea is **learning the transformation itself**, not merely
drawing point -> line -> plane. In a learned controller, adding channels alone
does not prove an increase in independent information; the new channels must
couple to additional evidence such as per-world history, stochastic exploration,
or new observations, and causally improve predictions under held-out controls.

The new module `perspective_expansion.py` is a bounded experimental first stage:

1. A 24D GNN representation is augmented by 4 trainable channels per active
   scale using local node states, a pooled collective state, and per-world
   **pre-action temporal memory from the previous actual step**.
2. A learned global-to-local feedback pathway modifies those features.
3. A scale-consistency loss compares coarse transformed states with pooled fine
   transformed states; it does not assert exact scale invariance or fractality.
4. The module predicts its own upcoming action error from the pre-action
   representation. Actual error targets are supplied **after** `World.step`.
5. Optional independent and shared seeded noise perturb only the expansion
   module during training, not simulator truth.
6. The expanded representation influences actual action scores and is trained
   by actual outcome gradients. The added action readout starts at zero so
   initial opt-in prediction scores remain unchanged.
7. Actual per-node latent values enter the existing SQLite event trace when
   Capture is enabled. The read-only 5D viewer can project the first four
   measured channels instead of the original hash-based layout. Missing evidence
   remains missing.
8. Legacy defaults, model state dictionaries when expansion is disabled,
   original checkpoint paths, original UI modes and original Verbatim source
   files remain intact. The expansion optimizer group and configuration
   checkpoint together and resume together.

## Source-to-implementation audit

| Literal user requirement / provenance | Implementation location | Test or evidence | Current status |
|---|---|---|---|
| `Nu tr uita la linie punct plan! Uita te la transformare ! Ce fel de transformare e?` (current conversation, original source still needs full native archival) | `perspective_expansion.py:ExpansionScale` | Learned gradient + history changes latent test | PARTIAL_TESTED |
| `As above so below` (latest conversation and older canonical Verbatim) | `ExpansionScale.forward` global/local/coarse relation | finite scale-consistency test | PARTIAL_TESTED, NOT fractality |
| `introduce random noise` (Q5D conversation and current discussion) | `PerspectiveExpansion._noise`, optional UI + ablation | repeated seeds, local/shared test, ablation script | PARTIAL_TESTED |
| `God is this universe that devours other worlds` (Q5D conversation) | Original `Graph` and `PortalEngine` shared domains remain used; no separate world-specific neural models | existing Portal graph tests | PARTIAL; no complete semantic world assimilation |
| `it also learns how he works` (Q5D conversation) | `self_error_head` learns pre-action error expectation; matched interventions in existing `perspective.py` | error-head gradients after true outcomes | PARTIAL; NOT consciousness |
| `learn recursive to improve itself` (Q5D conversation) | Rank activation is bounded and explicit; no autonomous promotion | checkpoint tests, manual rank test | NOT IMPLEMENTED as autonomous validated self-improvement |
| `shape of solution` transfer across maze/text/networks | existing shared graph and new expandable action features | `ablate_expansion.py` matched seeds, held-out rewards | NOT PROVEN; require positive cross-domain transfer ablations |
| zoom that reveals real geometry, not decorative fractal | new `learnedGeometry` view using stored activation coordinates | `test_spacetime.py` exact replay + JS syntax | PARTIAL_TESTED |
| infinite recursion / learned fractal growth | current graph capacity is finite; current recursion is a fixed number of levels | no fractal-dimension or unbounded topology generator | NOT IMPLEMENTED |
| actual RTX/CUDA training | PyTorch `cuda` is used if available and enabled; never simulated | requires real machine, checkpoints and hardware | NOT VERIFIED locally |

**No requirement is marked full VERIFIED from these tests alone.**
The chronological source up to and after Q5D-18 is incomplete without a native
conversation/media export. Do not silently replace missing turns by this audit.

## Deterministic comparisons, preserved on disk

From `experiments/portal-universal-20261103/`:

```powershell
python ablate_expansion.py --device cpu --rounds 20 --batch-size 5 --eval-worlds 24 --data-dir D:\MagicPerspective-ExpansionRuns\cpu-test-001
```

On a verified CUDA installation:

```powershell
python ablate_expansion.py --device cuda --rounds 20 --batch-size 5 --eval-worlds 24 --data-dir D:\MagicPerspective-ExpansionRuns\cuda-test-001
```

Use distinct *new* directories. The runner refuses to overwrite results and
saves separate checkpoints, SQLite traces and comparison JSON for five
conditions: original baseline, expanded without noise, independent noise,
shared noise, and combined noise. All use the same deterministic task sequence
and held-out seeds. **Improvement is a measured question, not a promised result.**
For text training, add `--domains maze3d,network,symbols,yesno,car,text --corpus C:\path\source.txt`.

Start the existing Portal server normally and activate **Expansiune perspectivă**
in its dashboard before training. Once enabled, its configuration is checkpointed
and the UI freezes its initial parameters to prevent silent mid-training
checkpoint incompatibility. Recorded latent geometry is an optional checkbox
in the existing 5D explorer. The 3D/4D cameras are not replaced.

## Remaining acceptance gates before merging or declaring compliance

1. Run all baseline Portal and 5D regression suites, plus the new real-world
   CPU tests, on the pull request.
2. Test on the actual NVIDIA CUDA installation and resume the user's *real*
   checkpoints without overwriting them.
3. Run matched-seed, held-out multi-domain ablations including text; show
   success/reward/error and negative results transparently.
4. Add validated automatic *propose -> isolated train -> evaluate -> adopt or
   rollback* of rank/topology modifications; no false self-awareness claims.
5. Add genuinely recursive learned **topology generation**, durable
   multiresolution structural snapshots and geometric/fractal diagnostics.
6. Recover the missing original Verbatim messages and binary assets; preserve
   both legacy release gates until all clauses and implementations are verified.

This experimental branch changes the running learner only when explicitly
enabled. It does NOT replace the project with a simplified simulation.
