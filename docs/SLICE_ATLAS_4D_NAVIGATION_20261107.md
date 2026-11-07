# MagicPerspective: Slice Atlas 4D navigation (2026-11-07)

**Status: isolated geometric research / native V22 Discoverer.shape tested in GitHub Actions / NOT TEXT-SEMANTIC PROOF / V17 baseline untouched.**

## Exact user question and test boundary
[Literal 2026-11-07 question](../verbatim/2026-11-07-USER-SLICE-ATLAS-REQUEST.md).

Can different theoretical/coordinate "slices" of one transition world help navigation? **Testable:** complementary verified transition views may enable a path that individual views lack. **Not established:** all sciences are physical projections of one hyperdimensional place. String-theory duality is a useful conceptual parallel, not an implemented physical model and not a source of route actions.

## Actual code, execution and evidence
- Branch: experiment/SLICE-ATLAS-NAVIGATION-ABLATION-20261107, based on experiment/V22-EXACT-DISCOVERER-TEXT-LABYRINTH-20261107.
- ORIGINAL V22 method imported *directly*, not substituted: [worlds/exercise.mjs](../v17/transcend/torus-aether/worlds/exercise.mjs) exports Discoverer.shape(ret,n,me,topology).
- [Native method test](../v17/transcend/torus-aether/worlds/slice-atlas-ablations.test.mjs), isolated and without any modification to the original implementation.
- [GitHub Actions run **success** #42345006012](https://github.com/dan3s2020/MagicPerspective/actions/runs/42345006012); job 128320746960, Node.js 22. Logs independently confirm all counts below.
- No training here; neither learned world-model edges nor solved natural-language questions nor GPU CUDA can be inferred from this test.

## Protocol
512 seeded independently generated 4D periodic graphs: each state in Z4 × Z4 × Z4 × Z4 (256 nodes), about 17% blocked; each node has up to eight ± coordinate actions. Each world has one distinct start/goal, and the full world includes the marked goal. The original shape() law performs 0.97-damped attraction propagation over supplied edges then extracts a pre-action uphill action path. Test executes that predicted route on the real graph, and independently checks path length against BFS shortest distance. Seed = 20261107, xorshift32.

Two lenses expose disjoint sets of *verified edges*: XY (axes 0,1) and ZW (axes 2,3); their union exposes all. A full random relabeling of state IDs tests invariance to arbitrary representation labels. Goal-hidden test removes the only goal attractor. 1%, 3%, and 10% spurious unverified-edge tests check causal-grounding sensitivity, with a 10% filtered candidate control.

| Observation | Actual executable valid paths |
| --- | ---: |
| XY slice | **31 / 512 (6.05%)** |
| ZW slice | **32 / 512 (6.25%)** |
| XY + ZW combined | **512 / 512 (100%)** |
| Random state-label permutation | **512 / 512 (100%)** |
| Goal marker hidden | **0 / 512 (0%)** |
| Plus 1% spurious unverified edges | **498 / 512 (97.27%)** |
| Plus 3% spurious unverified edges | **477 / 512 (93.16%)** |
| Plus 10% spurious unverified edges | **411 / 512 (80.27%)** |
| 10% spurious candidates filtered | **512 / 512 (100%)** |

All 512 combined paths have **optimal length** according to independent BFS, and all 512 relabeled paths yield the **exact same physical path** when labels are mapped back.

## What was actually learned or demonstrated?
The tested *algorithm*, not a trained organism, can navigate a known 4D graph when the needed transition axes and marked target are supplied. Combining **complementary action sets** helps only because the benchmark is deliberately constructed to require actions from both sets; this is not evidence of automatic perspective discovery. Exact relabel equivalence means the topological algorithm is insensitive to arbitrary coordinate naming. The higher-dimensional torus is an artificial combinatorial world; this does not prove anything about physical string-theory extra dimensions.

The key negative finding: without a visible target, the pre-action field cannot infer the goal. Spurious action hypotheses break physically executable paths. The next step for text cannot be more decorative dimensions: it must learn or infer *correct operators, their effects, pre-action target conditions, and cross-perspective transition maps from observations* and prove this on frozen text where the answer is **not** supplied as a graph goal.

## Candidate Atlas extension, NOT IMPLEMENTED by this test
Define world state S, views P_i(S), verified inter-view transitions T_ij and grounded actions A. An inter-view mapping is usable only if it preserves the outcome-relevant invariants and can reconstruct the executable action in the original world. Discoverer.shape should receive verified observed topology plus the *goal predicate derived from the actual question*, not supplied hindsight. The learning task is to discover those views and operators from text, not to relabel a known grid.

Testable scientific lenses may include: graph connectivity, algebraic invariants, causal action effects, probabilistic uncertainty, and information gain when switching perspectives. String theory is not itself an executable search method for language. Complicated loops do not prove higher physical dimensions; they can express reversible or recurrent state transitions, or mistaken beliefs, depending on the actual graph.

## Unchanged acceptance gate
- Native organism's text-world actions, perception and memory: **NOT TESTED**.
- Semantic comprehension and correct first answer on unseen unrestricted text: **NOT TESTED**.
- Discovering a missing target or rules from natural language: **NOT TESTED**.
- User's original trained checkpoints, GPU and UI: **NOT TOUCHED**.
- Blocking regression #25: **STILL OPEN**.

This report describes *completed bounded experimental evidence*, not a replacement of the original requested architecture.