# Native C-only comparator — narrow compatibility repair, before code change

Previously attempted `v42-c-only` with original V42 `EmergentChain({depth:0})`. The *original Brain learning works in principle*, but `GraphTrace.record()` assumes `chain.A[0]` always exists and fails when trying to iterate `A.wires`. This is a visualization/observability dependency, not proof that native C cannot learn.

User requested genuine testing of methods and versions, so we will make **ONE necessary compatibility change on the isolated AG2 research branch only**:
`const A = chain.A[0];` becomes `const A = chain.A[0] || {wires: []};`
inside `v17/transcend/torus-aether/devour/trace.mjs`.

What this preserves:
- For all existing normal depth >=1 paths, the original `A` object is used identically; no functional/graph learning equations change.
- For depth 0 only, there are no A wires to draw. The graph visualizer no longer crashes; the original native C is still the only learning organ.
- No user checkpoint/branch is touched. This patch is isolated and reversible.

Acceptance before claims:
1. Re-run `v42-c-only` original Brain on the frozen 900 train/400 dev real UCI data.
2. Re-run exact `v42-c4` as a parity control; must equal previously observed accuracy 0.7825 and macro-F1 0.7676393824797235.
3. Record original failed CI run and repaired code provenance. If output differs under default depth 2, mark regression and reject patch.
4. Scores remain exploratory development results and not an AlphaGenome 2 benchmark.

No substitute predictor, synthetic world, copied training weights or new algorithm is introduced.
