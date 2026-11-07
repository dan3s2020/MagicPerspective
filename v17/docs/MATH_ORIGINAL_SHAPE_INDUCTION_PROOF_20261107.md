# MagicPerspective — Original Discoverer.shape mathematics induction research
**Date:** 2026-11-07. **Scope:** isolated branch `experiment/V21-MATH-ORIGINAL-SHAPE-20261107`. **Status:** PASS for a restricted equation family; general mathematics NOT demonstrated.

## Authenticated source and non-regression
The original `v17/transcend/torus-aether/worlds/exercise.mjs`, including `Discoverer.shape(ret,n,me)`, has **not been edited** by this experiment. The original `Brain`, V17 UI, V21 launcher, checkpoints, CUDA machinery, text and maze sources remain intact. No copy of the user data or hypothetical unseen corpus is claimed. `main` is not modified.

Canonical user text: `verbatim/2026-11-07-MAGICPERSPECTIVE-MATHEMATICS-USER-TURNS-VERBATIM.md`.
Change contract: `user-intent/changes/V21-MATH-ORIGINAL-SHAPE-20261107.json`.
Original blocking regression #25 remains OPEN.

## Mathematical theorem: two equivalence-preserving paths
For any rational `a,b,c` with `a != 0`:

1. `a(x+b)=c -> x+b=c/a -> x=c/a-b`.
2. `a(x+b)=c -> ax+ab=c -> ax=c-ab -> x=(c-ab)/a`.

Identity:
`c/a-b = (c-ab)/a`.
Both give the unique exact solution, and every step is reversible when `a != 0`. This algebraic identity is a mathematical proof for the supported symbolic transformations, not a statistical claim about a neural network. The JavaScript exact-rational implementation is verified for safely representable integer numerators and denominators; this is not arbitrary precision for unlimited inputs.

## What is actually learned
1. The **teacher environment** `worlds/math.mjs` applies legal algebraic rewrites and emits five kinds of actual `before/action/after` transitions for 64 generated training equations; 320 events total.
2. The **separate experimental induction component** `worlds/math-observed.mjs` does NOT call the teacher to predict a heldout outcome. It fits expressions within a predeclared exact-rational grammar of variables `a,b,c`, constants `0,1`, and arithmetic `+,-,*,/` with expression depth <=2.
3. It independently infers:
   - `factored|divide: (1,b,c/a) -> divided`
   - `divided|subtract: (1,0,c-b) -> isolated`
   - `factored|distribute: (a,a*b,c) -> expanded`
   - `expanded|subtract: (a,0,c-b) -> offset`
   - `offset|divide: (1,0,c/a) -> isolated`
4. The learned action graph for each unseen equation is constructed by enumerating observed stage/action transitions **without choosing or sorting successful routes in advance**. A goal predicate marks `isolated` equations; it does not supply the numeric answer.
5. The exact original `Discoverer.shape()`, trained from 140 **native V17 maze episodes**, receives only a `KIND` grid with the goal tiles and decides the solution-shape path before any execution. Every predicted move is later checked against the independently specified teacher algebra and exact rational equality.

### Crucial scientific qualifications
- This is **program synthesis in a fixed hypothesis grammar**, NOT unrestricted discovery of mathematics. The grammar, five possible stage representations, training action labels, goal predicate, and action graph representation are engineered.
- The math induction state is currently **separate** from the original persistent V17 `Brain`; this does NOT demonstrate one fully shared learning organism across math/text/maze.
- Original `Discoverer.shape` receives a constructed 2D view whose cells encode observed mathematical transitions; it does NOT independently build the symbolic transition graph. The original shape process chooses a path in this view.
- A valid known-goal path is **not** proof of unassisted understanding, unknown-answer prediction, mathematical theorem discovery, or general language semantics.
- Tests run on GitHub Actions Linux/Node.js 22, **not** the user's NVIDIA GPU.
- Neither all mathematics nor a 70–100% accuracy rate on unrestricted problems has been demonstrated.

## Reproducible result, CI
**Run:** https://github.com/dan3s2020/MagicPerspective/actions/runs/42342782254
**Verified commit:** `6c1a3dab556f8e731abb65d5aad66e5e9f435f19` 
**Result:** SUCCESS; node test suites: 4 + 8 + 7 = **19/19 PASS**.

| Check | Observed result |
|---|---:|
| Original math topology, legal rules, frozen shape and leakage test | 4/4 |
| Context-sensitive expressions inferred from 320 actual events | 5/5 |
| Unseen equations in training numeric range, independently verified | 512/512 |
| Unseen equations with coefficients outside training range, complete frozen original-shape path | 1,024/1,024 |
| OOD exact symbolic transformation examples | 2,048/2,048 |
| OOD independently verified symbolic steps | 10,240/10,240 |
| No learned math rules | 0/64 solved |
| Both necessary terminal math rules removed | 0/64 solved |
| No native maze experience `Discoverer` | 0/64 solved |
| Contradictory training observations | 4/5 rules inferred, vs 5/5 control |
| Original V17 organism tests | 7/7 |

The 512 and 1,024 full-path tests are separate seeded held-out sets, excluding the 64 training equations. OOD means **numeric coefficient extrapolation within the same equation and action family**, not transfer to new mathematics topics. All results can be rechecked against the actual CI logs.

## Files and verification commands
From repository root with Node.js 22+:

```powershell
node --test v17/tests/math-original-shape.test.mjs
node --test v17/tests/math-observed-induction.test.mjs
node --test v17/tests/torus-organism.test.mjs
```

Code:
- `v17/transcend/torus-aether/worlds/math.mjs` — precise teacher math world, legal transformations and target state.
- `v17/transcend/torus-aether/worlds/math-observed.mjs` — observational inference and goal-agnostic graph construction, immutable original `Discoverer.shape()` call.
- `v17/tests/math-original-shape.test.mjs` — first mechanism test.
- `v17/tests/math-observed-induction.test.mjs` — heldout, OOD and ablation tests.
- `.github/workflows/math-original-shape-isolated.yml` — CI, including original V17 tests.

## Next research gates not yet passed
1. Experience with **unknown/unlabeled rules** in dynamically generated mathematical worlds, and correct rule induction without a given list of stage names.
2. A genuinely **single saved V17 Brain** that jointly learns and acts in maze/text/math, without a separate math hypothesis module controlling the solution policy.
3. Multi-stage problems with distractors, branching non-equivalent rewrites, constraints, multiple valid solutions and invalid transformations; compare against simple symbolic planner, BFS and a rule lookup baseline.
4. Independent formal proof checking for higher-order mathematics, theorem and symbol manipulation learning from large corpora.
5. Performance and accuracy on real heldout mathematical benchmarks; separate learned rule validity, predicted path validity, numerical answer correctness and semantic comprehension.
6. Real Windows CUDA evidence and original live V17 UI traces if integrated; protect every previous training checkpoint and control.

**Scientific verdict:** Restricted math induction demonstrated reproducibly. Universal mathematics learning, native one-brain integration, live training UI, or anything like full AGI: **NOT YET DEMONSTRATED**.
